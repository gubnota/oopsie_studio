# Historical assessment — see current validation reports

This document records the initial pre-import audit. Statements below about an
empty repository or absent implementation describe that historical point only.
The current validation-first strategy is in [PROTOTYPE_PLAN.md](PROTOTYPE_PLAN.md),
with evidence in [ENGUI_FEASIBILITY.md](ENGUI_FEASIBILITY.md) and alternatives in
[ARCHITECTURE_OPTIONS.md](ARCHITECTURE_OPTIONS.md). EnguiStudio is a candidate;
the former desktop runtime design is not an adopted foundation.

---

# Oopsie Studio architecture assessment

Date: 2026-11-07. Status: audited baseline and proposed design; no application implementation yet.

## Evidence and license boundary

The local repository has no commits or application code; its only initial file was an untracked `.gitignore` for `.DS_Store`. Upstream sources were inspected in a temporary directory, not imported or executed.

- EnguiStudio audited reference: `4cb2750c8b2855e60ff28efa8ab60dbff5a419fc` (main; 180 files).
- InfiniteTalk worker audited reference: `16892b4fb204cbc9a2defc22dcabeb01ff336631` (main; 17 files).
- Record and verify the exact imported tree against these references before implementation. `docs/UPSTREAM_IMPORT_MANIFEST.md` lists import destinations.
- [EnguiStudio license](LICENSE.md) restricts commercial use and derivatives. User explicitly chose to preserve it. Do not describe this derivative as MIT/Apache-2.0 or OSI open source. Permissive distribution requires upstream permission and dependency review.
- No license file was present in the audited InfiniteTalk worker. Using an existing deployed endpoint does not authorize copying or distributing its source/image. Its rebuild/redistribution is blocked until permission; new compatible worker code must be independently authored.
- Generated-media rights remain subject to model, provider, and media rights. Review pinned Remotion and FFmpeg terms independently.

## Existing functionality and gaps

Source presence is verified; successful build, rendering, and paid inference are not verified.

| Area | Audited implementation | Planned change |
| --- | --- | --- |
| UI | Next 15.4.4, React 19.1.0, three-panel studio, workspace/history, image/video/audio inputs, specialist editors | Retain root layout and components; add section navigation and schema-driven generation |
| Workflow catalogue | `src/lib/models/modelConfig.ts`, existing parameter metadata and LoRA selector | Seed versioned registry and extend existing form concepts |
| Active catalogue | WAN22, WAN Animate, InfiniteTalk, OneToAll, LTX2, FLUX Krea, Qwen Image Edit, Z-Image, image upscale, video upscale, ElevenLabs TTS/music | Capture payload fixtures for all 12 active IDs; retain legacy switch cases separately |
| Providers | `runpodService.ts`, `/api/generate`, client-driven `/api/generate/status` | Adapter boundary, endpoint snapshots, background recovery and cancellation |
| Database | Prisma 6.12.0, SQLite hardcoded under `prisma/db`; jobs/settings/workspaces/media/video tracks/LoRAs | Application Support database, migration baseline and additive records |
| Credentials | Settings store plaintext; encryption helper is a pass-through | Native Keychain with opaque references, transactional import/migration |
| Storage | `s3Service.ts` launches `aws`; upload results assume `/runpod-volume` | Direct SDK, R2 default, private object references and portable media transport |
| Media | FFmpeg service and many routes invoke PATH binaries or shell commands | Bundled arm64 FFmpeg/ffprobe; argument arrays and managed cancellation |
| Remotion | Player/editor and runtime bundler/renderer; export expects source files and browser runtime | Prebuilt composition bundle plus compatible bundled rendering browser |
| LoRAs | Database and UI exist; validation mainly extension/size | Architecture/base/workflow/stage/node compatibility before paid jobs |
| Safety | Mutable job configuration, retrying inference submission, unsafe file/URL boundaries | Immutable job snapshots, uncertain-submit handling, private route and path/URL guards |
| Tests/releases | Vitest dependencies/scripts but no test files; no release workflow | Focused tests, arm64 packaging smoke, tag-only release builds |

Active model IDs: `wan22`, `wan-animate`, `infinite-talk`, `onetoall`, `ltx2`, `flux-krea`, `qwen-image-edit`, `z-image`, `upscale`, `video-upscale`, `elevenlabs-tts`, `elevenlabs-music`. Google Veo and Kling are commented entries, not active support claims. Deployment compatibility must be demonstrated individually.

## Proposed module structure

Keep upstream root paths to reduce future merge costs. Add boundaries around existing services instead of rewriting the UI or replacing the framework.

```text
src/app/                  Next UI and compatibility API routes
src/components/           retained editor/layout; new sections and controls
src/lib/contracts/        versioned JSON Schemas and TypeScript data contracts
src/lib/platform/         resources/data/cache paths and platform bridges
src/lib/security/         credential broker, origin/path/URL guards, redaction
src/lib/endpoints/        registry and provider adapters
src/lib/workflows/        registry, schema validation, graph mapping
src/lib/models/           existing catalogue plus artifact compatibility service
src/lib/storage/          SDK object store, transfers and project synchronization
src/lib/jobs/             persistence, submission outbox, polling/cancel/recovery
src/lib/media/            processing presets; reuse existing FFmpeg/editor code
prisma/                   preserved schema, explicit migration history
src-tauri/                native lifecycle, secure credential/dialog integrations
desktop/                  managed Node HTTP launcher and IPC
workflows/                versioned built-in workflow manifests
workers/comfyui/          independently authored compatible worker and Docker assets
scripts/                  packaging, version consistency, smoke verification
tests/                    fixtures and cross-boundary tests
docs/                     compact memory, audit, upstream and UX guidance
```


## Native runtime and packaging

Rust owns a single managed backend instance, its process tree, readiness, shutdown and UI error recovery. The bundled Node runtime starts a small HTTP wrapper using Next's supported custom-server API. It listens on `127.0.0.1:0`, retaining the OS-assigned socket and reporting its actual port over private IPC. This avoids probing/releasing a free port. Next server routes, streaming responses and existing APIs remain available.

Package a normal `next build`, static/public assets and an explicit production dependency tree, including native Prisma engines. Do not static-export this app. Do not combine a custom server with Next standalone output: [Next documents that incompatibility](https://nextjs.org/docs/app/guides/custom-server). Size optimization through tracing is a later measured task, not a packaging assumption.

Rust passes a random bootstrap secret through a pipe, never a URL or command argument. A native-injected bootstrap request establishes an HttpOnly, SameSite=Strict loopback session; all UI/assets/API reads then require that session. Restrict Host, mutating Origin/CSRF and WebSocket upgrade traffic. External navigation opens in the system browser; remote content gets no native capabilities. Dynamically scope native access to the exact runtime origin. The chosen Tauri/WKWebView cookie/bootstrap/capability behavior must pass the Phase 1 security spike; if it cannot, pause with a revised transport plan before expanding implementation.

Use private framed IPC for credential lookup and shutdown. Frontend native commands expose allowlisted operations, never arbitrary shell execution. The backend can obtain credentials only through profile references. Browser development uses local server-side secret configuration and validated HTTP routes; stored secrets never return to UI GET settings responses.

Paths:

- Resources: immutable signed app bundle; Next build, Remotion bundle, binaries and schema assets.
- Data: `~/Library/Application Support/Oopsie Studio/` for SQLite, durable local media, registry/import metadata.
- Cache: `~/Library/Caches/Oopsie Studio/` for reproducible thumbnails/download caches.
- Temporary: isolated per-task directories with cleanup and bounded disk usage.
- Credentials: macOS Keychain; no plaintext settings, portable project manifests or logs.

Shutdown stops new local transfers, flushes state, asks children to exit and then kills the owned process group after a deadline. Remote paid jobs continue unless the user requests cancellation. On restart/resume, reconcile outstanding provider IDs. A second app instance focuses the existing window. Backend restart attempts are bounded and visible.

Production resources include Node, FFmpeg, ffprobe, Prisma native engine and Remotion-compatible headless browser. Retain Node licenses/notices; independently review FFmpeg build flags and dynamic dependencies. The host Homebrew FFmpeg is GPL/version3-enabled and is not an approved distributable binary. No runtime downloads of Node, browser, fonts or media binaries; inference/model artifacts remain explicit remote resources. Package and sign nested binaries before signing/notarizing the app. Apple signing credentials are a release prerequisite, not assumed available.

## Data and migration

Preserve Job, Preset, CreditActivity, UserSetting, ApiLog, UsageStats, Workspace, WorkspaceMedia, VideoProject, VideoTrack, VideoKeyFrame and LoRA tables. Baseline existing schema without destructive reset; add ConnectionProfile, Endpoint, ModelArtifact, WorkflowDefinition, JobSnapshot, JobEvent, Transfer and ProjectSync records. Keep legacy Job fields readable during transition.

Move database selection to `DATABASE_URL` and one shared Prisma client. Detect legacy data only at explicit locations or via import, never sweep the home directory. Close/checkpoint SQLite before copy; backup and run migrations transactionally where supported. Failed migration leaves the source usable. Write Keychain secrets, confirm retrieval, replace settings with references, then remove plaintext from active database; explain retained old copies and let the user remove them. Never silently destroy the only backup.

StudioContext also caches settings/API keys in localStorage, and useElevenLabsVoices constructs a browser-side provider client. Move voice/list/sample operations behind an authenticated allowlisted backend route, replace UI keys with configured/profile status, and remove legacy secret caches after migration. Browser localStorage voice preferences/favorites must be moved to persisted settings because a changing loopback port changes origin. Import old origin data through an explicit export/import path. Team sharing uses selected immutable JSON/project snapshots and media, not a SQLite database uploaded to R2.

## Versioned contracts (proposed v1)

`docs/API_CONTRACTS.md` defines stable invariants. Future schema files implement these contracts; these examples are design, not executable schemas.

```json
{
  "schemaVersion": 1,
  "id": "wan-i2v",
  "version": "1.0.0",
  "engine": "comfyui-api",
  "requiredCapabilities": ["video.i2v", "lora.wan.high-low"],
  "inputSchema": {"type": "object", "properties": {"seed": {"type": "integer", "minimum": 0}}, "additionalProperties": false},
  "ui": [{"path": "/seed", "control": "seed", "group": "Sampling"}],
  "bindings": [{"parameter": "/seed", "nodeId": "42", "input": "noise_seed"}],
  "loraSlots": [{"id": "high", "architecture": "wan", "stage": "high-noise"}],
  "outputRoles": ["video"],
  "graphRef": {"artifactId": "graph-wan-i2v", "sha256": "<64-hex-sha256>"}
}
```

A workflow declares immutable identity/version, display/category/description, adapter or graph, accepted model architectures, capability requirements, JSON Schema inputs, UI metadata/groups/defaults/conditions, media roles, mappings, output format, and LoRA slots. No executable expressions or shell snippets. Validate the manifest, resolved inputs and endpoint/model compatibility again on the backend. Bound nesting/arrays/graph sizes and reject network schema references. Preserve the complete imported API graph; only declared node input bindings change. ComfyUI UI-format graphs require explicit conversion and are not silently accepted as API graphs.

ModelArtifact records ID/version/type/family/architecture/base compatibility/variant/quantization/source URI/size/SHA-256/license and usage restrictions/required nodes/dependencies/residency/cache/endpoints/workflows. Types include checkpoint, diffusion transformer, UNet, text encoder, VAE, LoRA, ControlNet, motion module, upscaler, audio, video and workflow-specific artifacts. Unknown architecture or checksum is an explicit unverified state, not automatic compatibility. Reject incompatible LoRAs before submission; support independent model/clip strengths and WAN high/low stages. Custom/adult-oriented variants remain configuration-driven with license/provider/consent checks at submission.

Endpoint records ID/version/display name/profile reference/provider adapter/handler contract/remote ID/capabilities/model families/workflows/media types/GPU and VRAM requirements/timeout/concurrency/cold-start estimate/status. Multiple endpoints may share a credential profile. Capabilities are deployment declarations verified by a test/probe when supported; an endpoint ID alone implies nothing about arbitrary graphs or weights.

## Adapters and InfiniteTalk compatibility

One Runpod queue transport handles authentication, bounded GET/status retry, throttling and `/run`, `/status`, `/cancel`. Payload adapters implement validateConfiguration, getCapabilities, prepareInput, submitJob, getJobStatus, cancelJob and normalizeOutput. Preserve ElevenLabs separately and seed all active built-ins from audited metadata/payload fixtures.

InfiniteTalk accepts `input_type`, `person_count`, image/video path OR URL OR Base64, `wav_path`/`wav_url`/`wav_base64`, optional second audio equivalents, prompt, width, height, max_frame, force_offload and network_volume. The current desktop payload omits some worker-supported fields; make the adapter expose them through the verified contract. Do not invent output-upload fields for the existing handler.

The audited worker returns Base64 video when `network_volume=false`, or a mounted `/runpod-volume` path otherwise. It does not upload output to private external S3. Initial compatibility can use signed input URLs and explicitly bounded legacy output handling, with a visible warning; it cannot satisfy the durable R2-output production acceptance test unchanged. Full production output requires a rights-cleared worker update or an independently authored compatible handler. Worker conformance requires all outputs committed before success, with object key, size, hash, MIME and role returned.

## R2-first storage, without AWS CLI

Use AWS SDK v3 directly in Node (`client-s3`, multipart upload helper, request presigner); the AWS name is the SDK, not an AWS account or CLI requirement. R2 is the onboarding default with account endpoint and region `auto`; AWS/B2/MinIO remain profile options. Neither app nor worker examples may launch `aws` or depend on its installation. Python workers use SDK calls.

Private object keys are scoped by project/job/artifact UUIDs. Persist bucket/key/profile/version metadata, not expiring URLs. Mint short-lived signed GET/PUT access as needed; redact signed query strings. Transfer state supports retry, multipart resume/abort, progress, cancellation, disk limits and independent SHA-256 verification; multipart ETag is not treated as a content hash. Negotiate checksum headers against provider support. Avoid ACL/tagging/KMS assumptions in the portable interface. [R2 compatibility](https://developers.cloudflare.com/r2/api/s3/api/) and [signed URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) inform the provider profile.

Worker outputs use job-scoped preauthorized upload targets or scoped short-lived credentials. Expiry budgets include queue/cold-start/inference/upload time; refresh requires a configured broker, so without one fail validation when the job may exceed the grant duration. Never send the desktop's long-lived R2 secret to arbitrary workflows. Existing worker contracts receive only fields they support.

Team project publication uses immutable revision objects plus a small head pointer updated with conditional PUT/ETag. Test R2 conflict detection; an incompatible provider falls back to explicit forks/read-only rather than silent last-write-wins. Teammates provision their own bucket-scoped credentials; QR/link carries nonsecret config or an expiring invitation reference. Model blobs can be shared subject to rights. Store container recipe/digest/registry URI in R2 project metadata; Runpod pulls container images from a compatible OCI registry, not an arbitrary R2 file URL.

## Jobs and cost controls

States: Draft → Uploading → Queued → Initializing/Running → Downloading → Completed, with Failed/Cancelled terminal branches. Provider progress may skip states. Persist workflow/model/endpoint/profile versions, resolved graph/input snapshots, local/provider IDs, object refs, events, timestamps, retry counters and measured/estimated costs before showing success.

A durable submission outbox/lease serializes sends per local job. A timeout after POST may mean the provider accepted it: record submission uncertainty as a reconciliation substatus, do not retry automatically. Exactly-once submission cannot be promised without provider idempotency/reconciliation support. Poll/network failures keep the last known execution state. Cancel races and late output reconcile idempotently. Download failures retain durable object references and can resume.

Use exponential backoff/jitter and rate limits for safe operations; error types distinguish configuration, validation, authorization, quota, provider, transfer, migration and uncertain submission. Concurrency/cost reservations apply before submission. Provider actual cost/metrics may be unavailable; show estimates as estimates. [Runpod retains async results for a limited interval](https://docs.runpod.io/serverless/endpoints/send-requests), so worker-side durable publication is required for recovery after the desktop sleeps or exits.

## Media and security boundaries

Reuse extraction/remux/trim/FPS/resize/thumbnail/editor functionality. Centralize absolute FFmpeg/ffprobe paths and argument-based execution. Prefer stream copy; VideoToolbox only for compatible encoding and with documented quality/fallback behavior. Prebundle existing `src/lib/remotion/index.tsx`, select a matching rendering browser, retain export composition semantics and test offline image/audio/video exports.

Replace writable `process.cwd()`/public paths in upload, download, generation, ElevenLabs, audio saving, thumbnails, upscale, export, audio detection, FFmpeg and migration routes/services. Stream private results through authenticated routes with Range support and private caching. Resolve and validate real filesystem containment, including symlinks. Validate remote URL schemes/hosts/redirects/DNS and reject private-network SSRF by default; a user-configured local MinIO profile has a narrow explicit exception. Disable or authenticate the inherited webhook; no unauthenticated cloud callback may mutate local jobs. Logs redact tokens, signed URLs, user media and sensitive paths.

## Upstream migration and UX

After approval, fetch EnguiStudio as a read-only upstream, preserve its commit history and import the pinned tree in an attributable integration commit. Maintain an upstream baseline ledger and patch map, then merge/test future versions on a temporary integration branch. Isolate runtime, provider, storage and registry changes; keep fixture coverage of all 12 active built-ins and specialist editors as the migration gate.

Preserve the dark navy/indigo visual language (primary `#4F46E5`). Add Generate, Workflows, Models & LoRAs, Endpoints, Jobs, Media Library and Settings while retaining editor routes. `docs/BASE44_DESIGN_BRIEF.md` is a ready-to-use design request for missing UX; it is not an external submission. Oopsie icon/wordmark should be independently designed; production icon generation is implementation work.
