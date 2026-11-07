# Independent Runpod smoke tests

Python 3.9+ on macOS/Linux. Standard library only; no EnguiStudio imports, pip
packages, AWS CLI, model weights, Docker or cloud account needed for local tests.
The optional cloud SDK deployment described below has separate requirements.

## Start free

From the repository root:

```sh
python3 -m unittest discover -s RUNPOD_SMOKE_TESTS -p 'test_*.py' -v
```

Observed: **10 tests passed** on 2026-11-07. Tests create temporary loopback HTTP
servers and private temporary state; no Runpod or R2 calls occur.

For manual CLI exploration, terminal 1:

```sh
python3 RUNPOD_SMOKE_TESTS/mock_server.py > /tmp/oopsie-mock.json
```

Leave it running. In terminal 2, submit:

```sh
python3 RUNPOD_SMOKE_TESTS/cli.py --config /tmp/oopsie-mock.json --state /tmp/oopsie-smoke submit image RUNPOD_SMOKE_TESTS/fixtures/cpu.json
```

Copy the returned job ID, replacing `JOB_ID` below:

```sh
python3 RUNPOD_SMOKE_TESTS/cli.py --config /tmp/oopsie-mock.json --state /tmp/oopsie-smoke poll image JOB_ID --seconds 30 --interval 1
python3 RUNPOD_SMOKE_TESTS/cli.py --config /tmp/oopsie-mock.json --state /tmp/oopsie-smoke status image JOB_ID
python3 RUNPOD_SMOKE_TESTS/cli.py --config /tmp/oopsie-mock.json --state /tmp/oopsie-smoke download image JOB_ID --out /tmp/oopsie-output
python3 RUNPOD_SMOKE_TESTS/cli.py --config /tmp/oopsie-mock.json --state /tmp/oopsie-smoke cancel image JOB_ID
```

The second alias is `video`, but both aliases deliberately return a 32×32 PNG.
The mock does not emulate real inference or video. Stop terminal 1 with Ctrl-C.
The mock loses its jobs on restart; client intent/history survives separately.

## What to deploy first

For the cheapest transport test, use a synthetic CPU endpoint, not InfiniteTalk
or a diffusion model. [Runpod's CPU SDK](https://docs.runpod.io/sdk/configuration/cpu-types)
lists `cpu3c-1-2`: 1 vCPU / 2 GB, with availability by region. This is the smallest
listed class; obtain the actual CPU quote from your account before enabling live.
The supplied ComfyUI workflow wizard was not verified as a CPU deployment path.

`worker_cpu.py` exposes `handler(job)` and creates a tiny PNG with no dependencies.
Its `__main__` uses the traditional `runpod.serverless.start` worker contract;
that entry point alone does **not** configure CPU resources or deploy an endpoint.
For the newer CPU-capable SDK, adapt it as a queue function, for example:

```python
import runpod

app = runpod.App("oopsie-cpu-smoke")

@app.queue(cpu="cpu3c-1-2", workers=(0, 1), idle_timeout=5,
           execution_timeout_ms=60000)
def smoke(data: dict):
    from worker_cpu import handler
    return handler({"input": data})
```

Prepare this in a separate scratch deployment directory with `worker_cpu.py`.
Follow the [SDK quickstart](https://docs.runpod.io/sdk/quickstart): Python 3.10–3.14,
isolated venv, current documented Runpod SDK (the docs currently specify
`runpod==2.0.0rc1` before 2.0 stable), browser-based `rp login`, and
`rp flash deploy`. Avoid the quickstart GPU matrix example and automatic live
development invocation. Review the deployment's min/max workers, idle timeout,
no volume and CPU quote first. Deployment commands are instructions only; none
were executed in this task.

The SDK wrapper is a **deployment sketch**, not a tested worker package. Confirm
that local module bundling includes `worker_cpu.py`, and inspect the generated
queue request schema: an SDK function taking `data` may need argument wrapping
rather than the traditional handler's flat `input`. Save the generated request
as a private fixture and test it independently; do not guess the wire contract.
The harness accepts arbitrary JSON under `input`, so either contract can be tested.

Set active/minimum workers **0**, maximum workers **1**, no network volume, a
60-second execution limit and the shortest supported idle timeout. New SDK idle
defaults differ from Console defaults; explicitly select a short accepted value.
No permanent Pod is needed. Scale-to-zero removes continuing compute cost once
stopped; startup and shutdown idle seconds can still be billed.

For real model generation, choose weights/hardware that fit first. Reducing
resolution to 32px does not unload model weights or bypass frame/size constraints.
The documented 16 GB Flex GPU tier is `$0.00016/s`: **60 total billed seconds
≈ $0.0096**, **300 ≈ $0.048**. This is a basic image-test candidate, not a
hardware recommendation for H3/WAN/InfiniteTalk. Check the current
[pricing/configuration](https://docs.runpod.io/serverless/endpoints/endpoint-configurations)
and [billing rules](https://docs.runpod.io/serverless/pricing).

## Enable an already authorized live endpoint

```sh
cp RUNPOD_SMOKE_TESTS/config.example.json RUNPOD_SMOKE_TESTS/config.local.json
```

Edit the ignored local config: actual endpoint IDs, console-quoted
`rateUsdPerSecond`, a positive total `budgetUsd`, and `authorizedLive: true` only
for endpoints explicitly chosen for the test. Populate `RUNPOD_API_KEY` in the
environment using your local secret manager. Do not put the key in JSON, shell
history, this chat, a workflow or a committed file.

```sh
python3 RUNPOD_SMOKE_TESTS/cli.py --config RUNPOD_SMOKE_TESTS/config.local.json --state RUNPOD_SMOKE_TESTS/state --live submit cpu-smoke RUNPOD_SMOKE_TESTS/fixtures/cpu.json
```

Use the same alias and `--live` for status/poll/cancel/download. Replace the
fixture if the deployed handler's schema differs. Global flags precede the command.
`fixtures/comfy-empty-api.json` is a model-free `EmptyImage → SaveImage` API graph;
it requires a compatible Comfy worker and has not been executed in ComfyUI here.
Never send that graph to a model-specific handler without matching its contract.

The harness owns `policy.executionTimeout` and `policy.ttl`, in milliseconds,
using `jobTimeoutSeconds` (10–600). TTL includes queue time; long cold starts can
expire a job. [Runpod requests](https://docs.runpod.io/serverless/endpoints/send-requests)
have short-lived result retention: download completed artifacts promptly.

`budgetUsd` is a **local reservation limit, not a Runpod billing cap**. Each
attempt reserves `rateUsdPerSecond × (jobTimeoutSeconds + billableOverheadSeconds)`;
default overhead is 30 seconds, independently configurable per alias. Increase
it for known cold starts. Startup/idle/disk/storage/other clients may exceed the
estimate. No automatic refunds or submission retries occur, including when a
response is lost. Use one state directory across invocations to retain the ledger.
Changing/deleting it starts a new local allowance; it never resets provider billing.
Confirm cancellation and stopped workers in Console. Remove test deployments
after collecting evidence. No live budget value has been authorized in this task.

## R2/S3 without AWS CLI

Create short-lived presigned PUT and GET URLs for one private test object using
your R2 application/SDK signer. Set `SMOKE_S3_PUT_URL` and `SMOKE_S3_GET_URL` in
the environment, and allow the exact account/bucket hostname in `downloadHosts`.
The harness does not generate signatures or store R2 access keys.

```sh
python3 RUNPOD_SMOKE_TESTS/cli.py --config RUNPOD_SMOKE_TESTS/config.local.json --state RUNPOD_SMOKE_TESTS/state --live storage /absolute/path/to/small-fixture.png
```

It PUTs the bytes, GETs them, compares them and reports SHA-256. Presigned requests
must permit those exact bytes without additional required signed headers. A
round-trip proves storage IO, not worker upload support or media consumption.
For worker input, use only its documented URL/Base64/upload fields. For worker
outputs, require durable private objects and fresh grants; never treat an expiring
URL or `/runpod-volume/...` as permanent artifact identity. The audited InfiniteTalk
output needs a separate adapter/backend change before claiming durable R2 support.
Delete the test object through your storage application after testing.

## Diagnostics, recovery and limits

- Private state: atomic JSON files, mode 0600, newly created directories 0700.
  Use a private local directory; existing directory permissions are not changed.
- `<attempt>.request.json` contains the raw request body as sent, without HTTP
  authorization. It can contain private prompts/media and expiring input grants:
  **do not publish or share it**. Other attempt records/responses and `events.jsonl`
  are redacted; URL queries, credential keys, known env secrets and Bearer values
  are scrubbed. Redaction is not a guarantee for arbitrary undocumented worker secrets.
- Intent is saved before POST. Lost/invalid responses become `UNKNOWN`; inspect
  Console before any new submission. No automatic retry/idempotency claim.
- After restart use the captured job ID and original endpoint configuration for
  status/poll/download. Preserve config snapshots yourself; this small harness
  does not implement the future application's full job reconciliation database.
- HTTP 404 is an error, never fabricated queue status. Poll timeout attempts
  cancellation and reports that terminal state still needs confirmation.
- Supported states: IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, TIMED_OUT.
  Output support: `images[]` / `artifacts[]` with Base64 or `s3_url`/`url`, plus
  `video_url`, `videoUrl`, `audioUrl`. Other formats require an explicit adapter.
- Responses/artifacts are limited to 32 MiB. Filename traversal is discarded;
  downloads receive UUID names. Remote downloads require HTTPS and an exact
  hostname allowlist; redirects are refused. Local mock HTTP is allowed explicitly.
- This is a small transport test tool, not the full app, a universal model worker,
  a deployment manager or a security/billing certification.
