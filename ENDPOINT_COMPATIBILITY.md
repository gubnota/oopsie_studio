# Endpoint compatibility

Date: 2026-11-07. **No named model has passed a live test in this session.**
“Code” means an implementation exists; “conditional” means a particular pinned
worker must provide the nodes, weights, input mapping and output contract.
None of these labels means a paid generation succeeded.

## Four distinct compatibility levels

| Exact family/task | ComfyUI implementation | Runpod worker implementation | Original EnguiStudio | Actual live result |
| --- | --- | --- | --- | --- |
| WAN 2.2 T2V-A14B / I2V-A14B; TI2V-5B is a separate variant | Official model implementations and Comfy integration exist; pin graph/nodes/weights | Conditional custom Comfy worker or model handler; not every base image bundles WAN | `wan22` serializer and high/low LoRA slots exist; task coverage not proven | Not run |
| FLUX.3 | BFL documents video with synchronized audio; self-hosted Comfy/weights not verified here | No suitable Runpod worker verified | No FLUX.3 adapter; `flux-krea` is a different image model | Not run; requested image-generation identity needs clarification before deployment |
| FLUX image checkpoint/LoRA use case | Select an exact FLUX.1/FLUX.2 artifact and compatible node graph first | Conditional; arbitrary checkpoint/LoRA upload is not implied | FLUX Krea form exists; generic checkpoint support absent | Not run |
| InfiniteTalk, MeiGen-AI | Audio-driven video implementation exists; exact Comfy wrapper/version must be pinned | An audited InfiniteTalk Hub worker exists; deployment/image behavior unverified | `infinite-talk` serializer exists | Not run |
| InfiniteSpeech | Exact project/model identity unresolved; not assumed to be InfiniteTalk | Not verified | No verified adapter | Blocked on identity |
| MiniMax H3, MiniMaxAI/MiniMax-H3 | Official open release and Comfy instructions exist; pin FL2VA or Ref2VA task | No queue worker contract verified in this audit | No H3 adapter | Not run; quantized configurations/hardware not verified |
| LTX / LTX-2 | Official Lightricks Comfy integration exists; pin exact version and weights | Conditional custom worker | `ltx2` built-in metadata exists; installed backend version unknown | Not run |
| Qwen Image / Image Edit | Official model and Comfy examples exist; generation and editing differ | Conditional custom worker | `qwen-image-edit` form exists; not proof of all Qwen Image tasks | Not run |
| Custom API-format Comfy graph | Valid only with installed node classes and compatible resources | `runpod-workers/worker-comfyui` accepts `input.workflow`; installed image defines actual capabilities | No general import/parameter engine verified in original | Not run |
| Synthetic CPU PNG | No Comfy required; local stdlib implementation | Independent `worker_cpu.py`; cloud deployment pending | No synthetic model adapter expected | Local handler/mock passed; real endpoint not run |

Identity sources: [WAN 2.2](https://github.com/Wan-Video/Wan2.2),
[BFL FLUX.3](https://help.bfl.ai/articles/7342522296-what-is-flux-3),
[InfiniteTalk](https://github.com/MeiGen-AI/InfiniteTalk),
[MiniMax H3](https://github.com/MiniMax-AI/MiniMax-H3),
[LTX Comfy nodes](https://github.com/Lightricks/ComfyUI-LTXVideo),
[Qwen Image](https://github.com/QwenLM/Qwen-Image),
[Comfy Qwen examples](https://github.com/comfyanonymous/ComfyUI_examples/tree/master/qwen_image).
H3's open FL2VA/Ref2VA checkpoints do not establish availability of all hosted
features or a cheap CPU configuration. Micro-resolution reduces some activation
work; it does not remove large model weights or model-specific size/frame rules.

## Wire contracts to validate

| Worker | Request | Result retrieval | Storage/LoRA constraints |
| --- | --- | --- | --- |
| Harness CPU handler | `{"input":{"width":32,"height":32,"delaySeconds":0}}` | `output.images[]` with Base64 PNG | No models, LoRAs or worker S3 uploads |
| worker-comfyui | `{"input":{"workflow":{"nodeId":{"class_type":"...","inputs":{}}}}}`; optional named image uploads per pinned worker | Newer workers use `output.images[]` with `type=base64|s3_url`; older versions differ | Graph filenames must exist on worker; S3 configured on worker, not enabled by frontend alone |
| Original InfiniteTalk wrapper | Model-specific `input_type`, image/video and audio paths/URLs/Base64 variants, person count and generation controls | Audited version: `output.video` Base64 or `video_path` mounted path | Harness needs a version-specific output adapter before testing this result; R2 persistence not proven |
| WAN/other model handlers | Record actual deployed handler JSON; do not assume `input.workflow` | Record actual output fields, errors and MIME types | Validate architecture/stage/strength and checkpoint residency before any LoRA request |

The [worker-comfyui README](https://github.com/runpod-workers/worker-comfyui)
requires Comfy's **Export (API)** format, not the editor's UI graph.
Its [configuration](https://github.com/runpod-workers/worker-comfyui/blob/main/docs/configuration.md)
documents `BUCKET_ENDPOINT_URL`, `BUCKET_ACCESS_KEY_ID` and
`BUCKET_SECRET_ACCESS_KEY` with an AWS-oriented upload helper. Custom R2 endpoint,
bucket addressing, region and private URL expiry must be tested with the pinned
helper; those variables alone do not prove R2 compatibility.

R2 can be tested independently with scoped presigned PUT/GET URLs using the
harness. That proves object IO only, not worker-side model input fetching or
upload-before-completion. No AWS CLI is used.

## What “drag workflow” establishes

The supplied [Runpod workflow deployment link](https://console.runpod.io/serverless/new-endpoint?source=workflow)
opens a deployment path; its authenticated wizard was not inspected in this audit.
A compatible exported API workflow still requires the correct worker, custom
nodes, assets, model files, hardware and output handling. ComfyUI Cloud is a
separate managed service/credential contract; choosing a similarly named wizard
does not establish Runpod queue compatibility. Use the generated endpoint's API
example as the contract and verify it directly.

The supplied InfiniteTalk Hub listing (historical audit)
is a specialized audio-driven video worker, not a cheapest CPU protocol fixture.
Do not deploy it to test the app's navigation, polling or basic media downloads.

## Test results and gaps

`python3 -m unittest discover -s RUNPOD_SMOKE_TESTS -p 'test_*.py' -v`:
**10 passed**, local mock and unit tests. Includes two endpoint aliases, actual
CLI subprocesses, submit/poll/cancel, failure/timeout/404, lost POST response,
restart-readable intent/ledger, Base64 and signed-URL downloads, storage
round-trip, redaction, private files and local live-budget gates.

Both aliases return synthetic PNGs: this is **not** an image-plus-video prototype
or real model validation. The model-free `EmptyImage → SaveImage` Comfy fixture
matches [Comfy node definitions](https://github.com/Comfy-Org/ComfyUI/blob/master/nodes.py),
but has not run in ComfyUI. Provider billing, cancellation races, cold starts,
GPU memory, LoRAs, real R2 and worker media fetching remain untested.

## Original Engui comparison protocol — pending

After one independent live pass, prepare a separate checkout of `4cb2750` with
its own SQLite/media directories and disposable scoped credentials. Do not reset
the working tree. Run the original unchanged in browser development mode;
record any dependency/runtime problem separately before interpreting UI results.

For each operation record: endpoint ID alias, immutable worker digest/version,
exact model/graph hashes, local/remote job IDs, input hash, state sequence,
elapsed/provider timing, output hash and sanitized error. Keep secret-bearing
requests only in private local state; publish sanitized evidence.

| Operation | Independent harness | Original unchanged Engui | Discrepancy / interpretation |
| --- | --- | --- | --- |
| Endpoint registration, credentials and validation | Config/local tests passed | Pending | Original secrets are plaintext; use disposable credentials |
| Workflow/media/LoRA mapping | Generic JSON transport; live mapping pending | Pending | Different worker schemas need different adapters |
| Submit, status and completed output | Mock passed; live pending | Pending | Success directly but failure through UI indicates integration defect |
| Failure, timeout, 404 and cancellation | Mock passed; live pending | Pending | Original source limitations listed in feasibility report |
| Restart and late artifact recovery | Intent/ID persistence tested locally; live pending | Pending | Original endpoint snapshot/reconciliation remains unproven |
| R2 inputs and durable outputs | Mock round-trip passed; real pending | Pending | Worker, storage and frontend outcomes recorded independently |

Failure both ways points first to worker/model/input/infrastructure. No available
worker is a missing backend, not evidence that the frontend is broken. Final
architecture selection remains gated on this comparison.
