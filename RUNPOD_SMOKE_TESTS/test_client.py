import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from client import Client, SmokeError
from mock_server import start
from worker_cpu import handler


class HarnessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name)
        self.config = {"mock": True, "baseUrl": self.server.origin + "/v2", "budgetUsd": 0,
                       "endpoints": {"image": {"id": "image"}, "video": {"id": "video"}}}
        self.client = Client(self.config, self.path / "state")

    def tearDown(self):
        self.tmp.cleanup()

    def submit(self, **values):
        return self.client.submit("image", {"input": values})["id"]

    def test_async_two_endpoints_and_private_artifact(self):
        a = self.submit(width=32)
        b = self.client.submit("video", {"input": {}})["id"]
        self.assertNotEqual(a, b)
        with self.assertRaisesRegex(SmokeError, "HTTP 404"):
            self.client.status("video", a)
        self.assertEqual(self.client.poll("image", a, interval=0.001)["status"], "COMPLETED")
        self.assertEqual(self.client.poll("video", b, interval=0.001)["status"], "COMPLETED")
        files = self.client.download("image", a, self.path / "out")
        artifact = Path(files[0]["path"])
        self.assertEqual(artifact.parent, self.path / "out")
        self.assertEqual(artifact.read_bytes()[:8], b"\x89PNG\r\n\x1a\n")
        self.assertEqual(struct.unpack(">II", artifact.read_bytes()[16:24]), (32, 32))
        self.assertEqual(artifact.stat().st_mode & 0o777, 0o600)
        self.assertTrue(any("/video/run" in path for path, _, _ in self.server.calls))
        self.assertTrue(all(auth is None for _, _, auth in self.server.calls))

    def test_failure_timeout_and_cancellation(self):
        for values, message in [({"fail": True}, "FAILED"), ({"timeout": True}, "TIMED_OUT")]:
            with self.assertRaisesRegex(SmokeError, message):
                self.client.poll("image", self.submit(**values), interval=0.001)
        job = self.submit(pending=True)
        self.client.cancel("image", job)
        self.assertEqual(self.client.status("image", job)["status"], "CANCELLED")

    def test_poll_deadline_attempts_cancel(self):
        job = self.submit(pending=True)
        with self.assertRaisesRegex(SmokeError, "finite"):
            self.client.poll("image", job, seconds=float("inf"))
        with self.assertRaisesRegex(SmokeError, "cancellation attempted"):
            self.client.poll("image", job, seconds=0.01, interval=0.002)
        self.assertEqual(self.client.status("image", job)["status"], "CANCELLED")

    def test_404_is_not_in_queue(self):
        with self.assertRaisesRegex(SmokeError, "HTTP 404"):
            self.client.status("image", "expired-job")

    def test_uncertain_submission_is_not_retried_and_intent_survives_restart(self):
        before = len(self.server.calls)
        jobs_before = len(self.server.jobs)
        with self.assertRaises(SmokeError):
            self.submit(drop=True)
        self.assertEqual(len(self.server.calls), before + 1)
        self.assertEqual(len(self.server.jobs), jobs_before + 1)
        records = [json.loads(p.read_text()) for p in (self.path / "state").glob("*.json")
                   if p.name != "ledger.json" and not p.name.endswith(".request.json")]
        self.assertEqual(records[0]["state"], "UNKNOWN")
        self.assertEqual(len(json.loads((self.path / "state/ledger.json").read_text())["attempts"]), 1)
        restarted = Client(self.config, self.path / "state")
        job = restarted.submit("image", {"input": {}})["id"]
        self.assertEqual(restarted.poll("image", job, interval=0.001)["status"], "COMPLETED")

    def test_live_opt_in_and_budget_gate_without_network(self):
        cfg = {"budgetUsd": 0.02, "endpoints": {"gpu": {"id": "gpu", "authorizedLive": True,
               "rateUsdPerSecond": 0.00016, "jobTimeoutSeconds": 60}}}
        with patch.dict(os.environ, {"RUNPOD_API_KEY": "test-secret"}):
            with self.assertRaisesRegex(SmokeError, "--live"):
                Client(cfg, self.path / "live").submit("gpu", {"input": {}})
            client = Client(cfg, self.path / "live", live=True)
            cfg["endpoints"]["gpu"]["jobTimeoutSeconds"] = 9
            with self.assertRaisesRegex(SmokeError, "10..600"):
                client.submit("gpu", {"input": {}})
            cfg["endpoints"]["gpu"]["jobTimeoutSeconds"] = 60
            with patch.object(client, "api", return_value={"id": "job-1", "status": "IN_QUEUE"}) as api:
                client.submit("gpu", {"input": {}})
                with self.assertRaisesRegex(SmokeError, "budget exhausted"):
                    Client(cfg, self.path / "live", live=True).submit("gpu", {"input": {}})
                self.assertEqual(api.call_count, 1)
                request = api.call_args.args[2]
                self.assertEqual(request["policy"], {"executionTimeout": 60000, "ttl": 60000})
            cfg["endpoints"]["gpu"]["rateUsdPerSecond"] = 0
            with self.assertRaisesRegex(SmokeError, "positive finite"):
                client.submit("gpu", {"input": {}})

    def test_signed_storage_roundtrip_and_worker_output_download(self):
        url = self.server.origin + "/object?X-Amz-Signature=private-signature"
        with patch.dict(os.environ, {"SMOKE_S3_PUT_URL": url, "SMOKE_S3_GET_URL": url,
                                     "RUNPOD_API_KEY": "test-secret"}):
            client = Client(self.config, self.path / "state")
            fixture = self.path / "input.png"
            fixture.write_bytes(b"private-input")
            self.assertEqual(client.storage_roundtrip(fixture)["bytes"], 13)
            job = client.submit("image", {"input": {"url": True, "token": "test-secret", "urlValue": url}})["id"]
            client.poll("image", job, interval=0.001)
            self.assertEqual(Path(client.download("image", job, self.path / "out")[0]["path"]).read_bytes(), b"private-input")
            for file in (self.path / "state").iterdir():
                self.assertEqual(file.stat().st_mode & 0o777, 0o600)
                if file.name.endswith(".request.json"):
                    self.assertNotIn("Authorization", file.read_text())
                    continue  # Raw input may contain private media grants; never share it.
                text = file.read_text()
                self.assertNotIn("test-secret", text)
                self.assertNotIn("private-signature", text)

    def test_artifact_host_redirect_and_bad_input_rejected(self):
        for url in ["http://example.com/file", "https://user:pass@example.com/file", "file:///etc/passwd"]:
            with self.assertRaises(SmokeError):
                self.client.artifact_url(url)
        with self.assertRaisesRegex(SmokeError, "host"):
            self.client.artifact_url("https://unapproved.example/file")
        with self.assertRaisesRegex(SmokeError, "HTTP 302"):
            self.client.http(self.server.origin + "/redirect", binary=True)
        for body in [{}, {"input": {}, "webhook": "https://example.com"}]:
            with self.assertRaises(SmokeError):
                self.client.submit("image", body)
        with self.assertRaises(SmokeError):
            self.client.status("image", "../../escape")

    def test_cli_submission_status_and_download(self):
        root = Path(__file__).parent
        config = self.path / "config.json"
        config.write_text(json.dumps(self.config))
        prefix = [sys.executable, str(root / "cli.py"), "--config", str(config), "--state", str(self.path / "cli-state")]
        def cli(*args):
            return subprocess.run(prefix + list(args), text=True, capture_output=True, check=True)
        job = json.loads(cli("submit", "image", str(root / "fixtures/cpu.json")).stdout)["id"]
        cli("poll", "image", job, "--interval", "0.001")
        artifacts = json.loads(cli("download", "image", job, "--out", str(self.path / "cli-out")).stdout)
        self.assertTrue(Path(artifacts[0]["path"]).exists())

    def test_cpu_worker_needs_no_models(self):
        self.assertEqual(handler({"input": {}})["images"][0]["type"], "base64")
        with self.assertRaises(ValueError):
            handler({"input": {"width": 1024}})
        with self.assertRaisesRegex(ValueError, "Deliberate"):
            handler({"input": {"fail": True}})


if __name__ == "__main__":
    unittest.main(verbosity=2)
