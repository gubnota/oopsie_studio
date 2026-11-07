"""Independent, standard-library-only Runpod queue client. No application imports."""
import base64
import contextlib
import fcntl
import hashlib
import http.client
import json
import math
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

LIMIT = 32 * 1024 * 1024
TERMINAL = {"COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"}
STATES = TERMINAL | {"IN_QUEUE", "IN_PROGRESS"}


class SmokeError(Exception):
    pass


def private_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temp = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as stream:
        json.dump(value, stream, indent=2)
    os.replace(temp, path)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Client:
    def __init__(self, config, state_dir, *, live=False):
        self.config = config
        self.state = Path(state_dir)
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.live = live
        self.opener = urllib.request.build_opener(NoRedirect(), urllib.request.ProxyHandler({}))
        self.secrets = [os.environ.get(config.get("apiKeyEnv", "RUNPOD_API_KEY"), "")]
        self.secrets += [os.environ.get(v, "") for v in config.get("storage", {}).values() if isinstance(v, str)]

    def clean(self, value):
        if isinstance(value, dict):
            return {k: "[REDACTED]" if re.search(r"secret|token|password|authorization|api.?key", k, re.I)
                    else self.clean(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self.clean(v) for v in value]
        if isinstance(value, str):
            for secret in self.secrets:
                if secret:
                    value = value.replace(secret, "[REDACTED]")
            # Scrub URL queries even inside an exception or worker diagnostic string.
            value = re.sub(r"https?://[^\s\"'<>]+", lambda m: m[0].split("?")[0].split("#")[0]
                           if "?" not in m[0] else m[0].split("?")[0] + "?[REDACTED]", value)
            value = re.sub(r"(?i)Bearer\s+[^\s\"']+", "Bearer [REDACTED]", value)
        return value

    def event(self, kind, **data):
        record = self.clean({"time": time.time(), "kind": kind, **data})
        fd = os.open(self.state / "events.jsonl", os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
        with os.fdopen(fd, "a") as stream:
            stream.write(json.dumps(record) + "\n")

    def endpoint(self, name):
        try:
            ep = self.config["endpoints"][name]
        except KeyError:
            raise SmokeError("Unknown endpoint alias") from None
        if not isinstance(ep.get("id"), str) or not re.fullmatch(r"[A-Za-z0-9_-]+", ep["id"]):
            raise SmokeError("Invalid endpoint ID")
        base = self.config.get("baseUrl", "https://api.runpod.ai/v2").rstrip("/")
        parsed = urllib.parse.urlsplit(base)
        mock = (self.config.get("mock") is True and parsed.scheme == "http"
                and parsed.hostname in {"127.0.0.1", "localhost", "::1"})
        if not mock:
            if base != "https://api.runpod.ai/v2":
                raise SmokeError("Live API base must be https://api.runpod.ai/v2")
            if not self.live or ep.get("authorizedLive") is not True:
                raise SmokeError("Live access requires --live and endpoint authorizedLive=true")
            if not self.secrets[0]:
                raise SmokeError("API key environment variable is missing")
        return ep, base + "/" + ep["id"], mock

    def http(self, url, method="GET", body=None, headers=None, *, binary=False):
        data = json.dumps(body).encode() if isinstance(body, dict) else body
        self.event("request", method=method, url=url, body=body if isinstance(body, dict) else None)
        try:
            req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
            with self.opener.open(req, timeout=self.config.get("httpTimeoutSeconds", 30)) as response:
                content = response.read(LIMIT + 1)
                if len(content) > LIMIT:
                    raise SmokeError("Response exceeds 32 MiB limit")
                result = content if binary else json.loads(content)
                self.event("response", code=response.status, body=None if binary else result,
                           bytes=len(content))
                return result
        except urllib.error.HTTPError as error:
            try:
                detail = error.read(4096).decode(errors="replace")
                self.event("http_error", code=error.code, detail=detail)
                raise SmokeError(self.clean(f"HTTP {error.code}: {detail}")) from None
            finally:
                error.close()
        except (urllib.error.URLError, http.client.HTTPException, TimeoutError, OSError, ValueError) as error:
            self.event("transport_error", detail=str(error))
            raise SmokeError(self.clean(str(error))) from None

    def api(self, name, action, body=None):
        _, base, mock = self.endpoint(name)
        headers = {"Content-Type": "application/json"}
        if not mock:
            headers["Authorization"] = "Bearer " + self.secrets[0]
        return self.http(base + "/" + action, "POST" if body is not None else "GET", body, headers)

    @contextlib.contextmanager
    def ledger(self):
        fd = os.open(self.state / "ledger.lock", os.O_RDWR | os.O_CREAT, 0o600)
        with os.fdopen(fd, "w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            path = self.state / "ledger.json"
            data = json.loads(path.read_text()) if path.exists() else {"reservedUsd": 0, "attempts": []}
            yield data
            private_json(path, data)

    def submit(self, name, payload):
        ep, _, mock = self.endpoint(name)
        if not isinstance(payload, dict) or not isinstance(payload.get("input"), dict):
            raise SmokeError("Request must contain an input object")
        # Reject callbacks, alternate transports and caller-controlled timeout policy.
        if set(payload) - {"input"}:
            raise SmokeError("Only input is accepted; harness owns execution policy")
        seconds = ep.get("jobTimeoutSeconds", 60)
        if type(seconds) is not int or not 10 <= seconds <= 600:
            raise SmokeError("jobTimeoutSeconds must be an integer in 10..600")
        overhead = ep.get("billableOverheadSeconds", 30)
        if type(overhead) is not int or not 0 <= overhead <= 3600:
            raise SmokeError("billableOverheadSeconds must be an integer in 0..3600")
        rate, budget = ep.get("rateUsdPerSecond", 0), self.config.get("budgetUsd", 0)
        if not mock and (not isinstance(rate, (float, int)) or not math.isfinite(rate) or rate <= 0
                         or not isinstance(budget, (float, int)) or not math.isfinite(budget) or budget <= 0):
            raise SmokeError("Live submission requires positive finite rateUsdPerSecond and budgetUsd")
        # Estimate only: the API job timeout cannot cap provider startup/idle billing.
        reservation = rate * (seconds + overhead) if not mock else 0
        attempt = uuid.uuid4().hex
        request = {"input": payload["input"], "policy": {
            "executionTimeout": seconds * 1000, "ttl": seconds * 1000}}
        with self.ledger() as ledger:
            if ledger["reservedUsd"] + reservation > budget + 1e-12:
                raise SmokeError("Local reservation budget exhausted; submission refused")
            ledger["reservedUsd"] += reservation
            ledger["attempts"].append({"attempt": attempt, "endpoint": name, "reservedUsd": reservation})
        record = {"attempt": attempt, "endpoint": name, "state": "SUBMITTING", "request": self.clean(request)}
        private_json(self.state / (attempt + ".request.json"), request)
        private_json(self.state / (attempt + ".json"), record)
        try:
            result = self.api(name, "run", request)
            if (not isinstance(result, dict) or not isinstance(result.get("id"), str)
                    or not re.fullmatch(r"[A-Za-z0-9_-]+", result["id"])):
                raise SmokeError("Submission did not return a valid job ID")
            record.update(state="SUBMITTED", jobId=result["id"], response=self.clean(result))
        except SmokeError:
            # Do not retry: the provider may already have accepted and billed this job.
            record["state"] = "UNKNOWN"
            private_json(self.state / (attempt + ".json"), record)
            raise
        private_json(self.state / (attempt + ".json"), record)
        return result

    @staticmethod
    def job_id(job):
        if not isinstance(job, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", job):
            raise SmokeError("Invalid job ID")
        return job

    def status(self, name, job):
        result = self.api(name, "status/" + self.job_id(job))
        if not isinstance(result, dict) or result.get("status") not in STATES:
            raise SmokeError("Unrecognized provider status")
        self.event("job_status", endpoint=name, jobId=job, response=result)
        return result

    def cancel(self, name, job):
        result = self.api(name, "cancel/" + self.job_id(job), {})
        self.event("cancel_requested", endpoint=name, jobId=job, response=result)
        return result

    def poll(self, name, job, *, seconds=60, interval=2):
        if not math.isfinite(seconds) or not math.isfinite(interval) or seconds <= 0 or interval <= 0:
            raise SmokeError("Polling timeout and interval must be positive and finite")
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            result = self.status(name, job)
            if result["status"] in TERMINAL:
                if result["status"] != "COMPLETED":
                    raise SmokeError(self.clean(json.dumps(result)))
                return result
            time.sleep(min(interval, max(0, deadline - time.monotonic())))
        try:
            self.cancel(name, job)
        finally:
            raise SmokeError("Polling deadline reached; cancellation attempted. Confirm terminal state in console.")

    def artifact_url(self, url):
        parsed = urllib.parse.urlsplit(url)
        mock = self.config.get("mock") is True and parsed.hostname in {"127.0.0.1", "localhost", "::1"}
        if parsed.username or parsed.password or parsed.fragment:
            raise SmokeError("Artifact URL contains credentials or a fragment")
        if parsed.scheme != "https" and not (mock and parsed.scheme == "http"):
            raise SmokeError("Artifact URL requires HTTPS")
        if not mock and parsed.hostname not in self.config.get("downloadHosts", []):
            raise SmokeError("Artifact host is not explicitly allowed")
        return url

    def download(self, name, job, directory):
        result = self.status(name, job)
        if result["status"] != "COMPLETED":
            raise SmokeError("Job has not completed")
        output = result.get("output", {})
        if not isinstance(output, dict):
            raise SmokeError("Worker output needs a format-specific adapter")
        images, artifacts = output.get("images", []), output.get("artifacts", [])
        if not isinstance(images, list) or not isinstance(artifacts, list):
            raise SmokeError("Artifact collections must be arrays")
        items = images + artifacts
        for key in ("video_url", "videoUrl", "audioUrl"):
            if output.get(key):
                items.append({"type": "url", "data": output[key]})
        if not items:
            raise SmokeError("No supported artifacts; inspect output and add a worker-specific adapter")
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        saved = []
        for item in items:
            if not isinstance(item, dict) or not isinstance(item.get("data"), str):
                raise SmokeError("Artifact must contain string data and a supported type")
            kind, data = item.get("type"), item.get("data", "")
            if kind == "base64":
                if len(data) > LIMIT * 4 // 3 + 16:
                    raise SmokeError("Artifact exceeds limit")
                try:
                    content = base64.b64decode(data.split(",", 1)[-1], validate=True)
                except ValueError:
                    raise SmokeError("Invalid Base64 artifact") from None
            elif kind in {"s3_url", "url"}:
                content = self.http(self.artifact_url(data), binary=True)
            else:
                raise SmokeError("Unsupported artifact type (mounted paths are not portable)")
            if len(content) > LIMIT:
                raise SmokeError("Artifact exceeds limit")
            filename = item.get("filename", "artifact.bin")
            suffix = Path(filename).suffix if isinstance(filename, str) else ".bin"
            suffix = suffix if re.fullmatch(r"\.[A-Za-z0-9]{1,8}", suffix) else ".bin"
            path = directory / (uuid.uuid4().hex + suffix)
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "wb") as stream:
                stream.write(content)
            saved.append({"path": str(path), "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
        self.event("artifacts_saved", artifacts=saved)
        return saved

    def storage_roundtrip(self, file):
        settings = self.config.get("storage", {})
        put = os.environ.get(settings.get("putUrlEnv", "SMOKE_S3_PUT_URL"), "")
        get = os.environ.get(settings.get("getUrlEnv", "SMOKE_S3_GET_URL"), "")
        if not put or not get:
            raise SmokeError("Set presigned PUT and GET URL environment variables")
        if self.config.get("mock") is not True and not self.live:
            raise SmokeError("Live storage access requires --live")
        content = Path(file).read_bytes()
        if len(content) > LIMIT:
            raise SmokeError("Storage fixture exceeds limit")
        self.http(self.artifact_url(put), "PUT", content, binary=True)
        restored = self.http(self.artifact_url(get), binary=True)
        if restored != content:
            raise SmokeError("S3 round-trip content mismatch")
        return {"bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}
