# EnguiStudio feasibility

Date: 2026-11-07. Recommendation: **PARTIALLY REUSE**, provisional until live comparison.

## Evidence boundary

The audited original is commit `4cb2750c8b2855e60ff28efa8ab60dbff5a419fc` of
EnguiStudio.
The original Git history is retained locally on `legacy-before-native`; the new main branch is a standalone snapshot. The current checkout
contains subsequent Oopsie changes and unfinished desktop work; these are separate
from original EnguiStudio evidence and are preserved, with packaging paused.

| Evidence | Result |
| --- | --- |
| Original source inspection | Completed for architecture, generation routes, settings, storage, media, schema and model mapping |
| Tests shipped in audited original | No test sources found in the imported baseline; test dependencies alone are not coverage |
| Independent harness | 10 local tests passed; no app imports or third-party Python packages |
| Previously modified Oopsie checkout | Typecheck, lint and Next production build passed earlier; these do not validate the original |
| Original unmodified app runtime | Not launched in this validation phase |
| Real Runpod / R2 / ComfyUI executions | **0**; credentials, explicitly authorized endpoint IDs and a positive live budget are not configured |
| Original-versus-harness comparison | Pending independent live success; no compatibility percentage can yet be measured |

## Existing functionality verified in code

| Area | Original implementation | Reuse assessment |
| --- | --- | --- |
| UI/runtime | Next.js 15.4.4, React 19.1.0; server routes, client state, media panels and video editor | Useful components; adopting the full server carries packaging and lifecycle work |
| Persistence | Prisma 6.12 / SQLite; projects, media, jobs, workspaces and editor state | Useful domain concepts; do not couple a new provider-independent job manager to legacy options JSON |
| Model forms | 12 active built-ins in `src/lib/models/modelConfig.ts`, including ElevenLabs TTS/music | Preserve useful controls selectively; fixed catalogue is not a universal manifest engine |
| Runpod transport | Model switch in `src/lib/runpodService.ts`; `/run`, `/status`, polling | Reference payload adapters only after contract fixtures and live verification |
| WAN LoRAs | High/low slots and stripping `/runpod-volume/loras/` from paths | Specific worker convention; no proof that arbitrary architecture/checkpoint/LoRA combinations work |
| InfiniteTalk | Image/video plus audio parameters; optional volume flag | Candidate adapter; mounted paths and actual worker output require validation |
| Jobs | Generate route creates a local record before submission and later saves the Runpod ID in options | An intent record exists, but uncertain submission and immutable endpoint recovery are incomplete |
| Media/export | FFmpeg operations, timeline/editor and Remotion compositions | Valuable reuse candidates; binary/path safety and independent playback tests remain necessary |
| Storage | Original S3 service shells out to AWS CLI and assumes Runpod-mounted paths | Replace with R2-compatible SDK/presigned operations; existing Oopsie SDK changes are not live-tested |

## Specific limitations and failures in the original

1. `runpodService.ts:241` submits through a retry helper. Network retries of a
   paid POST can duplicate inference when acceptance succeeded but the response was lost.
2. `runpodService.ts:333` maps HTTP 404 to `IN_QUEUE`. Expired, missing or wrong-endpoint
   IDs can masquerade as queued work. A bounded reconciliation state is needed.
3. The original service's status type covers only four states, and its completion
   loop handles neither cancellation nor provider timeouts explicitly. No cancel
   operation was found in that service.
4. `src/app/api/generate/status/route.ts` resolves the model/endpoint from current
   settings. Editing configuration can change how a historical job is polled.
5. A lost submission response is treated as failure rather than an uncertain
   acceptance requiring reconciliation. Restart recovery is not established.
6. Original `encryptionService.ts` returns plaintext from encrypt/decrypt/mask;
   original UI state also persists credentials in localStorage. This is a blocking
   security issue for adoption, independently of successful generation.
7. Model-specific serializers and form metadata do not support arbitrary ComfyUI
   API graphs, repeatable media roles or general model dependency validation.
8. The audited InfiniteTalk worker can return Base64 video or a mounted output path.
   Durable external R2 output is not established. A successful HTTP job is not
   evidence that its video survives worker shutdown.

These are source findings, not reproduced live failures. The independent harness
tests 404 handling, uncertain POSTs and cancellation against local fixtures; it
does not test the original implementation by substitution.

## Maintenance and reported defects

Read-only GitHub metadata on 2026-11-07 reported EnguiStudio last pushed
2026-02-03 and not archived; the InfiniteTalk wrapper last pushed 2026-03-10.
Age and popularity do not establish compatibility or security.
EnguiStudio reports include missing mounted media (original issue #22)
and settings remaining in Saving (original issue #23).
The wrapper's historical open issue list
includes startup, output-duration and hardware reports. These are investigation
leads with unknown image versions, not verified failures of a chosen deployment.
Dependency versions were inspected; a comprehensive advisory/license audit has
not been completed, so this document makes no vulnerability-free claim.

## License and integration cost

The [preserved license](LICENSE.md)
restricts commercial use, including derivatives. Preserve it and attribution as
the user requested. Selected copied components retain those obligations.
MIT/Apache-2.0 distribution requires upstream permission; partial reuse does not
remove this constraint. The audited InfiniteTalk wrapper had no license file;
do not copy or redistribute it without permission.

Integration is substantial: independent endpoint/workflow/model registries,
durable jobs, credential protection and R2 output contracts are necessary under
any UI choice. Retaining selected media/editor controls may save work; retaining
the original orchestration does not remove those tasks. Preliminary effort and
decision criteria are in [ARCHITECTURE_OPTIONS.md](ARCHITECTURE_OPTIONS.md).

## Next decision evidence

First validate a configured endpoint using the standalone harness. Then run a
separate original checkout, one endpoint at a time, and record the comparison
table in [ENDPOINT_COMPATIBILITY.md](ENDPOINT_COMPATIBILITY.md). Keep original
credentials disposable and scoped: the original stores them in plaintext.
Only that comparison can finalize KEEP / PARTIALLY REUSE / REPLACE. Current code
evidence favors **PARTIALLY REUSE**, with independent integration services and
optional retained editor components; wholesale adoption is not justified yet.
