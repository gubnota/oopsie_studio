# Validation and prototype plan

Date: 2026-11-07. This supersedes the implementation order in the older
`IMPLEMENTATION_PLAN.md`. User explicitly requested immediate audit, standalone
harness and mock tests. Existing application/native edits are preserved and paused.

## Goal and current behavior

Prove the backend contracts and compare the original EnguiStudio before choosing
the UI foundation. The current checkout contains both imported Engui code and
unfinished Oopsie enhancements; neither proves original compatibility or a working
serverless desktop app. The independent standard-library harness now supplies
configurable JSON transport and local protocol tests without app dependencies.

## Mandatory sequence and acceptance

| Stage | Work / files | Acceptance | State |
| --- | --- | --- | --- |
| 0 Audit | `ENGUI_FEASIBILITY.md`, `ENDPOINT_COMPATIBILITY.md`, source at `4cb2750` | Exact source/license findings, distinct compatibility levels and unresolved model identities | Completed; live findings explicitly absent |
| 1 Independent API | `RUNPOD_SMOKE_TESTS/` | Local submit/poll/cancel/error/restart/download/storage tests; then bounded real endpoint and R2 evidence | 10 local tests pass; live pending |
| 2 Original compatibility | Separate unchanged original checkout; comparison table in compatibility report | Same independently successful inputs compared for registration, credentials, validation, media, parameters, LoRAs, job lifecycle, cancellation and restart | Pending stage 1 live |
| 3 Architecture gate | `ARCHITECTURE_OPTIONS.md` + comparison evidence | Explicit KEEP / PARTIALLY REUSE / REPLACE, integration estimate and license fit | Provisional PARTIALLY REUSE only |
| 4 Browser prototype | Independent services with selected/new UI after gate | All prototype criteria below pass | Not started under corrected sequence |
| 5 Desktop | Tauri, lifecycle, credential broker and native media/filesystem | Install/launch/restart, authenticated backend, verified artifact, signed distribution plan | Paused |
| 6 Expansion | Broader models, sharing, editor parity, release automation | Separate scoped plans and worker-specific live evidence | Deferred |

## Harness implementation and verification

- `client.py`: queue HTTP, endpoint aliases, private intent and local reservation
  ledger, bounded polling/cancel, output adapters and scoped presigned storage.
- `cli.py`: config/env boundary; submit/status/poll/cancel/download/storage commands.
- `worker_cpu.py`: tiny deterministic 1–64px PNG handler; no diffusion dependencies.
- `mock_server.py`, `test_client.py`: local queue/S3 fixture and 10 behavioral tests.
- `fixtures/`: CPU request and model-free API-format Comfy graph.
- `config.example.json`, `README.md`: disabled live defaults and reproducible setup.

Verification command:

```sh
python3 -m unittest discover -s RUNPOD_SMOKE_TESTS -p 'test_*.py' -v
git diff --check
```

Do not substitute a modified Oopsie build for an original Engui compatibility run.
Do not count two mock aliases returning PNGs as an image/video prototype.

## Cheapest initialization and cost policy

1. Start with the local mock: **$0 cloud cost**. It covers UI-independent protocol,
   error, cancel, signed URL and storage semantics.
2. For a real CPU smoke endpoint, request the smallest documented CPU class,
   `cpu3c-1-2` (1 vCPU / 2 GB), through Runpod's CPU-capable SDK queue path.
   Use zero minimum workers, maximum one, a short idle timeout and no volume.
   Exact CPU price/account availability was not verified; obtain the console quote
   and configure that rate before submitting. Smaller class is not proof of lowest
   regional price. See the [harness guide](RUNPOD_SMOKE_TESTS/README.md).
3. For a first real model image, choose a pinned lightweight image worker whose
   documented weights fit. The listed 16 GB Flex tier (A4000/A4500/RTX 4000) is
   `$0.00016/s`: 60 total billable seconds ≈ `$0.0096`, 300 ≈ `$0.048`.
   This is a price example, not a latency or model-fit promise. Larger video
   models require their own memory/runtime estimate; don't deploy H3/WAN/InfiniteTalk
   merely to test app plumbing.

Runpod's [CPU types](https://docs.runpod.io/sdk/configuration/cpu-types) and
[endpoint configuration/prices](https://docs.runpod.io/serverless/endpoints/endpoint-configurations)
are the sources for resource choices. The [pricing rules](https://docs.runpod.io/serverless/pricing)
bill startup, execution and the shutdown idle period. Scale-to-zero stops ongoing
compute after shutdown; it does not mean literal zero billed idle/cold-start time.
Optional storage and container-disk charges are separate. SDK defaults can use
60 seconds idle; set it explicitly rather than relying on defaults.

Live prerequisites: scoped API key in env, explicitly selected endpoint IDs,
`authorizedLive=true`, `--live`, positive finite rate and budget, active/minimum
workers 0, maximum 1, job timeout and TTL, no persistent network volume by default.
No paid resource was deployed and no paid request was made in this validation.

The harness reserves `rate × (job timeout + configured overhead)` cumulatively
and refuses extra submissions. This is a conservative local estimate, **not a
provider-enforced spending cap**: startup, idle, disk and other consumers can exceed
it. No reservation is automatically refunded for uncertain submissions. Verify
terminal job/worker state and actual billing in Console, then delete test endpoints
when finished. An actual budget amount must be explicitly selected before live work.

## Browser prototype acceptance after gate

1. Two separately configured real Runpod queue endpoints: one image and one video
   or audio-driven task, each passing independently first.
2. Dynamic controls generated from versioned workflow schemas, including supported
   media roles and explicit parameter-to-node mapping; invalid bindings fail before billing.
3. Asynchronous submission, six provider states, structured errors, explicit
   cancellation races, bounded polling and persisted history after restart.
4. Ambiguous submit remains uncertain without automatic resubmission; immutable
   endpoint/graph/model snapshots survive configuration edits.
5. Completed image/video/audio downloads are durable and playable; fresh media
   URLs can be resolved after restart. Mounted worker paths are not portable outputs.
6. Real R2 input upload/read and worker durable output retrieval verified with
   scoped grants, hashes, private buckets and no AWS CLI.
7. At least one endpoint's documented LoRA configuration works with a compatible
   model; unsupported checkpoint/LoRA selections fail validation.
8. Credentials remain outside renderer/localStorage/plaintext DB; logs and shared
   diagnostics are redacted. User-selected system FFmpeg/ffprobe capability checks
   work, including any selected installed non-free codec; redistribution is separate.
9. All UI, including reused Engui panels, follows the Base44 palette/icon set.

## Effort and remaining unknowns

One engineer, after workers are usable: original comparison/extraction 2–4 days;
independent adapters 3–5; durable jobs 4–6; manifests/registry/controls 3–5;
R2/media 2–4; integrated prototype verification 3–5. Some tasks overlap; the partial
reuse path is approximately 15–25 days after the gate. Native packaging, advanced
editor parity and new inference workers are separate estimates.

Resolve exact FLUX image identity and InfiniteSpeech repository before deployment.
Pin H3 task/checkpoint/quantization and hardware before estimating its cost.
Worker R2 support, API limits and output formats must be established per version.
These gaps block claims of end-to-end completion, not the completed mock harness.
