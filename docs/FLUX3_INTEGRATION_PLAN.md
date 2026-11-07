# Implementation Plan: FLUX.3 Video API integration

Status: proposed, not implemented. User requested a full integration plan on 2026-11-07.
This extends the current native migration and requires approval before adapter implementation.

## Goal

Add BFL FLUX.3 Video to the native desktop as a separate provider, including all
video modes, secure credentials, durable submissions, resume/polling, saved MP4s,
optional R2 copies, and a direct path into the existing timeline. No paid calls
are part of local implementation or automated tests.

## Existing behavior

- `api` Tauri command fronts Rust services and SQLite; credentials use Keychain.
- Immutable workflow graphs and endpoint snapshots currently support ComfyUI/Runpod.
- Job intent is persisted before one POST; uncertain submissions are never retried automatically.
- Artifacts are downloaded atomically, bounded and hashed; timeline uses managed media.
- A ComfyUI graph is not a BFL request. Keep separate validation and provider routing.

## Proposed approach

Use Rust reqwest and the existing Keychain storage. Add `bfl` as an explicit
provider and `bfl-video` as a definition kind, preserving existing graph definitions
and historical jobs. Ship versioned schema validators rather than arbitrary JSON
fields in the default UI. Full scope here means FLUX.3 **Video**, not every image,
action or separate editing product in the FLUX.3 family.

The [video API reference](https://docs.bfl.ai/api-reference/utility/generate-a-video-with-flux-3)
defines POST `https://api.bfl.ai/v1/flux-3-video`, `x-key` authentication, and modes
`t2v`, `i2v`, `v2v`, `draft_enhance`. Persist response ID, polling URL and reported
credit cost when present. Validate requests against the documented mode-specific
schema; image keyframes, continuation video and draft-cache inputs are distinct.

Use the returned polling URL, as required by the
[integration guide](https://docs.bfl.ai/api_integration/integration_guidelines).
Only send credentials to validated BFL HTTPS hosts, with redirects disabled;
never send the key to artifact hosts. Poll with backoff, handle throttling and
network loss without repeating the generation POST. Preserve unknown statuses
for diagnosis rather than inventing success. Moderation, errors and expired IDs
must be terminal/actionable. A local polling stop is not provider cancellation.

Download `result.sample` promptly to managed storage. BFL's
[quickstart](https://docs.bfl.ai/cookbook/video_quickstart) describes expiring result
URLs, so save bytes rather than treating that URL as a permanent library item.
Use the existing artifact limit/hash/atomic-write policy. Retry safe downloads only;
expired output requires explicit provider recovery, not a new generation.

For reference files, accept managed images/videos, validate type/size, and encode
only within the documented request bounds. Prefer short-lived private R2 GET grants
for larger inputs when the user configured R2. Keep local selections separate from
uploaded inputs. Draft enhancement requires a preserved provider draft-cache bundle,
not an inferred setting from the preview MP4.

Pricing comes from a versioned, sourced quote or user-entered current rate with
an “as of” date. Review duration/resolution/draft estimate before an explicit Generate
click; never present a local estimate as a billing cap. Capture provider credit cost
separately from estimates. The [BFL pricing page](https://docs.bfl.ai/quick_start/pricing)
currently links a calculator and has incomplete video rate cells; do not invent rates.

## File changes

- `src-tauri/src/bfl.rs` — create: typed request validation, submit/poll, URL policy,
  input preparation, result parsing, local artifact save and draft-cache handling.
- `src-tauri/src/main.rs` — modify: register the BFL module; retain one narrow IPC command.
- `src-tauri/src/workflow.rs` — modify: route BFL definitions/jobs to the adapter;
  reuse immutable snapshots and persistence, preserve ComfyUI/Runpod behavior.
- `src-tauri/src/service.rs` — modify: Keychain BFL credential reference, additive
  schema migration for provider metadata and masked settings, managed input access.
- `src-tauri/src/storage.rs` — modify: reuse private upload/presign operations for
  BFL inputs and optional explicit result copies; no AWS CLI or public bucket requirement.
- `src/lib/workflows/bfl.ts` — create: versioned frontend request types, mode-specific
  validation and display metadata; no credentials or HTTP client.
- `src/components/layout/StudioShell.tsx` — modify: BFL connection, guided controls,
  file inputs, estimates, draft/enhance actions, job states and result-to-timeline action.
- `src/app/globals.css` — modify: reuse the existing brand/control system for new states.
- `src/lib/context/StudioContext.tsx` — modify: add downloaded managed media to a
  selected project without duplicating the file or overwriting a project.
- `tests/bfl.test.ts`, `tests/fixtures/bfl/` — create: validation cases and sanitized
  provider-contract fixtures; no keys, signed URLs or real personal media.
- `docs/API_CONTRACTS.md`, `docs/SETUP.md`, `docs/PROJECT_CONTEXT.md`, `docs/TASK_LOG.md`
  — modify: actual contracts, setup steps and verified versus unverified status.

## Implementation steps

1. Capture the current official video schema and sanitized response fixtures; pin
   the schema date. Specify mode validators, output statuses, credit metadata,
   allowed BFL polling hosts, file limits, and migration compatibility tests.
2. Add native Keychain configuration and distinct definition DTOs. Ensure masked
   updates preserve saved keys, removal clears them, and snapshots contain references only.
3. Implement all video modes and reference/draft inputs; persist intent before one
   POST. Test validation, lost acknowledgements, HTTP errors, moderation and restart.
4. Add polling and atomic artifact handling. Test nonterminal→ready, unknown status,
   expired ID, throttling, malicious URL/redirect, interrupted download and resume.
5. Add guided UI with reusable controls, explicit spending review, local file/drop
   states and optional R2 delivery. Add “Open in timeline” for saved managed output.
6. Run local checks/build/audit. Update docs to reflect actual limits. Only after
   endpoint/key and a bounded live allowance are supplied, run a separate live smoke
   with the smallest documented duration/settings and record evidence.

## Verification

- `npm run typecheck`, `npm run lint`, `npm test`.
- `cargo test --offline --manifest-path src-tauri/Cargo.toml` including a local mock
  HTTP integration test with an injectable test-only origin; production remains HTTPS-only.
- `npm run desktop:build`, `npm run desktop:audit`, `node scripts/smoke-desktop.mjs`.
- Native manual check: save/reopen connection, each mode's required fields, failed
  input, uncertain submission, resumed job, saved MP4 preview and timeline import.
- No paid request, automatic retry of generation, or live credential fixture.

## Risks / edge cases

- Provider schema/version aliases may change; store submitted version and schema date.
- A lost submit response cannot be recovered safely without provider identity lookup;
  show uncertainty and do not claim exactly-once execution.
- An expired result URL may prevent recovery even when the task was billed.
- Reference uploads can contain private media; retain only managed paths and redacted diagnostics.
- Cancellation/refunds are not assumed without an explicit supported provider contract.

## Out of scope

FLUX.3 Image/Action adapters, unrelated video-edit/upscale APIs, training, automatic
model downloads, a new cloud backend, CapCut effects/captions, and paid deployments.

Plan ready. Approve it and I will implement it.
