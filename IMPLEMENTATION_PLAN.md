# Historical plan — implementation order superseded

The user's 2026-11-07 validation-first correction is now authoritative. Follow
[PROTOTYPE_PLAN.md](PROTOTYPE_PLAN.md). Existing implementation is preserved;
major frontend, Tauri, packaging, push/tag and release automation are paused until
independent live tests, original Engui comparison and the prototype gates pass.
The plan below records the earlier approved design, not current execution status.

---

# Implementation Plan: Oopsie Studio macOS arm64

## Goal

Adapt the pinned EnguiStudio application into a self-contained Tauri 2 macOS arm64 app while preserving browser development, specialist media editors and all 12 active built-in integrations. Add extensible endpoints/workflows/models, private R2-first storage without AWS CLI, durable jobs, safe native credentials and reproducible tagged packaging. Preserve upstream's current noncommercial license as the user selected; MIT/Apache-2.0 distribution is conditional on permission.

## Existing behavior

The local repository is effectively empty, with no commits or application code. Phase 0 inspected upstream source without importing/executing it. EnguiStudio already supplies Next/React UI, Prisma SQLite, Runpod and ElevenLabs integrations, model parameter metadata, LoRA controls, media helpers and a Remotion editor. Its cloud execution has not been tested. Important gaps include plaintext secrets, AWS CLI storage, writable bundle-relative paths, PATH media binaries, hardcoded payload dispatch, mutable endpoint selection for old jobs, unsafe retry of paid POSTs and no native runtime/release/tests. See `ARCHITECTURE.md` for source evidence and licensing limitations.

## Proposed approach

- Keep upstream root source/layout and import its pinned tree with history/provenance. Wrap current services behind registries and preserve compatibility routes.
- Bundle Node and a managed custom HTTP Next server, FFmpeg/ffprobe, Prisma engines and a compatible Remotion browser. Retain SSR/API routes; use normal Next build plus explicit production dependencies, not static export or standalone/custom-server mixing.
- Put writable data in Application Support/cache/temp and secrets in Keychain. Enforce authenticated loopback sessions and narrowly scoped native commands from the first desktop increment.
- Introduce versioned schema/adapter/artifact contracts before forms, storage and job extensions. Seed every active built-in rather than equating the new generic adapter with existing deployment compatibility.
- Default onboarding to Cloudflare R2, accessing S3 APIs through SDK calls. No AWS CLI dependency anywhere. Keep other S3-compatible profiles and optional explicit legacy mount semantics separate.
- Store immutable job/config snapshots; reconcile provider IDs after interruption. Treat ambiguous submission separately from safe polling retries. Share selected project revisions/media through R2 with conflict detection, never the live SQLite file.
- Build only arm64 release artifacts on version tags. Each implementation commit updates the changelog and synchronized version. No code, dependencies or configuration are changed before approval.

## File changes

Every upstream import destination is enumerated in `docs/UPSTREAM_IMPORT_MANIFEST.md` (180 files, one `.gitignore` merge). The table below lists deliberate subsequent changes. Files not listed for modification remain unchanged from the pinned baseline. The worker repository is not copied. Generated runtime resources and icons are listed separately. No source-file deletions are planned.

### Modify after upstream import

| File | Concrete responsibility/change |
| --- | --- |
| `package.json` | Add desktop/build/test/version scripts; pin reviewed dependencies and replace obsolete lint command. |
| `package-lock.json` | Regenerate only through approved dependency resolution; preserve reproducibility. |
| `next.config.ts` | Retain server mode; resource-safe desktop build and explicit external dependencies; no static export/standalone. |
| `eslint.config.mjs` | Enable compatible ESLint CLI validation and new module boundaries. |
| `.gitignore` | Merge upstream rules with build/resource/cache/database/secrets exclusions. |
| `prisma/schema.prisma` | Use DATABASE_URL; additive registries, job snapshots/events, transfers, sync records; preserve original tables. |
| `src/lib/prisma.ts` | One shared client with configured writable database URL. |
| `src/lib/settingsService.ts` | Persist credential references; migrate legacy settings and browser preference data. |
| `src/lib/encryptionService.ts` | Remove misleading pass-through encryption behavior; delegate credential storage and redact masked values. |
| `src/lib/s3Service.ts` | Compatibility facade to direct SDK storage; remove all AWS CLI subprocesses and implicit mount-path results. |
| `src/lib/runpodService.ts` | Compatibility facade over adapters; remove automatic retries of ambiguous /run submissions. |
| `src/lib/models/modelConfig.ts` | Export legacy catalogue seed; consume registry-backed definitions without breaking existing IDs. |
| `src/lib/loraValidation.ts` | Delegate semantic compatibility checks while preserving import size/type validation. |
| `src/lib/ffmpegService.ts` | Absolute binaries, execFile argument arrays, controlled paths/cancellation and existing operation compatibility. |
| `src/lib/serverFileUtils.ts` | Central private media writes and filename/realpath containment. |
| `src/lib/migrationService.ts` | Explicit source/data paths and safe migration/import rollback. |
| `src/lib/logger.ts` | Redact secrets, signed URLs and sensitive media paths. |
| `src/lib/context/StudioContext.tsx` | Replace client-held API keys with configured/profile status; migrate legacy settings/localStorage, consume backend-owned job states and retain workspace/editor operations. |
| `src/hooks/useElevenLabsVoices.ts` | Fetch voice list/detail/samples through authenticated backend; never instantiate a secret-bearing provider client in the browser. |
| `src/lib/elevenlabsService.ts` | Keep provider credentials and API execution server-only; preserve voice/music/generation behavior. |
| `src/components/forms/ImageGenerationForm.tsx` | Bridge existing form/media reuse to registry controls and profile readiness without exposing API keys. |
| `src/components/forms/VideoGenerationForm.tsx` | Bridge media/seed/LoRA reuse and advanced controls to validated workflow form, retaining editor behavior. |
| `src/components/forms/AudioGenerationForm.tsx` | Preserve TTS/voice choices through backend profile status and validated generation. |
| `src/components/forms/MusicGenerationForm.tsx` | Preserve ElevenLabs music controls through backend profile status and normalized jobs. |
| `src/lib/voiceSamplesStorage.ts` | Persist voice preferences through backend settings; import old localStorage explicitly. |
| `src/app/layout.tsx` | Oopsie metadata and local bundled fonts; preserve providers. |
| `src/app/globals.css` | Retain theme and add accessible section/control styles. |
| `src/app/page.tsx` | Initialize platform/onboarding state then preserve existing studio entry. |
| `src/components/layout/MainLayout.tsx` | Add section navigation, startup/onboarding state and retain studio/editor views. |
| `src/components/layout/LeftPanel.tsx` | Workflow-driven generation controls and retained built-in affordances. |
| `src/components/layout/CenterPanel.tsx` | Use normalized job/artifact previews while retaining specialist editors. |
| `src/components/layout/RightPanel.tsx` | Use persistent job history/events and regeneration snapshots. |
| `src/components/settings/SettingsDialog.tsx` | Connection/Keychain references, R2 profiles, imports and cost thresholds. |
| `src/app/api/generate/route.ts` | Validate workflow/endpoint/models; create immutable snapshot and durable submission intent. |
| `src/app/api/generate/status/route.ts` | Read/reconcile persisted job via original endpoint snapshot, never current model settings. |
| `src/app/api/settings/route.ts` | Nonsecret settings responses and allowlisted credential writes. |
| `src/app/api/settings/test/route.ts` | Credential/profile validation without secret echoes. |
| `src/app/api/settings/clear/route.ts` | Delete selected credentials through broker with explicit scope. |
| `src/app/api/jobs/route.ts` | Return normalized durable state while keeping legacy list compatibility. |
| `src/app/api/jobs/[id]/route.ts` | Read/update legacy flags through job ownership and safe deletion rules. |
| `src/app/api/webhook/complete/route.ts` | Reject unauthenticated mutation; polling is default and verified callbacks are opt-in. |
| `README.md` | Desktop/browser setup, license limits, R2 SDK, migration, packaging and troubleshooting. |
| `src/app/api/download/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/elevenlabs/generate/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/results/[...path]/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/results/[jobId]/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/save-audio/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/save-project-audio/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/thumbnail/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/upload/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/upscale/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/video-export/download/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/video-export/route.ts` | Use prebuilt Remotion composition/browser and managed FFmpeg with writable output paths; preserve editor exports. |
| `src/app/api/video-tracks/detect-audio/route.ts` | Move writes/reads to appPaths; private streaming and safe arguments/URLs; preserve route payloads. |
| `src/app/api/s3-storage/create-folder/route.ts` | Use profile-aware SDK facade, opaque object refs and ownership checks; distinguish optional legacy mounted storage. |
| `src/app/api/s3-storage/delete/route.ts` | Use profile-aware SDK facade, opaque object refs and ownership checks; distinguish optional legacy mounted storage. |
| `src/app/api/s3-storage/download/route.ts` | Use profile-aware SDK facade, opaque object refs and ownership checks; distinguish optional legacy mounted storage. |
| `src/app/api/s3-storage/files/route.ts` | Use profile-aware SDK facade, opaque object refs and ownership checks; distinguish optional legacy mounted storage. |
| `src/app/api/s3-storage/loras/route.ts` | Use profile-aware SDK facade, opaque object refs and ownership checks; distinguish optional legacy mounted storage. |
| `src/app/api/s3-storage/upload/route.ts` | Use profile-aware SDK facade, opaque object refs and ownership checks; distinguish optional legacy mounted storage. |
| `src/app/api/s3-storage/volumes/route.ts` | Use profile-aware SDK facade, opaque object refs and ownership checks; distinguish optional legacy mounted storage. |
| `src/app/api/lora/route.ts` | Bridge existing LoRA UI records into artifact registry with architecture/license/hash validation. |
| `src/app/api/lora/[id]/route.ts` | Bridge existing LoRA UI records into artifact registry with architecture/license/hash validation. |
| `src/app/api/lora/sync/route.ts` | Bridge existing LoRA UI records into artifact registry with architecture/license/hash validation. |
| `src/app/api/lora/upload/route.ts` | Bridge existing LoRA UI records into artifact registry with architecture/license/hash validation. |

### Create

| File | Concrete responsibility/change |
| --- | --- |
| `README.ru.md` | Russian setup, operation, migration, license and troubleshooting matching README. |
| `CHANGELOG.md` | Human-readable entry for every implementation commit. |
| `THIRD_PARTY_NOTICES.md` | Upstream, Node, media/rendering/dependency notices and distribution constraints. |
| `docs/UPSTREAM_BASELINE.md` | Verified commit/tree provenance, import method, patch map and update workflow. |
| `docs/ACCEPTANCE.md` | Trace all 13 user acceptance cases to test evidence and known blockers. |
| `docs/WORKER_CONFORMANCE.md` | Payload/output/capability/cache/upload requirements and InfiniteTalk limitations. |
| `prisma/migrations/0001_upstream_baseline/migration.sql` | Exact legacy schema baseline for fresh installs; existing DB is marked applied only after validation. |
| `prisma/migrations/0002_desktop_registries/migration.sql` | Additive registry, snapshots/events/transfers/project sync migration. |
| `prisma/migrations/migration_lock.toml` | SQLite migration provider lock. |
| `src-tauri/Cargo.toml` | Tauri2, native Keychain/dialog/notification/single-instance dependencies and synchronized version. |
| `src-tauri/Cargo.lock` | Pinned Rust dependency tree. |
| `src-tauri/build.rs` | Tauri build integration. |
| `src-tauri/tauri.conf.json` | arm64 resources, minimal native policy, identity/icons and no frontend shell permission. |
| `src-tauri/capabilities/main.json` | Narrow app window capability set; runtime origin scoped by native supervisor. |
| `src-tauri/src/main.rs` | Native entry point. |
| `src-tauri/src/lib.rs` | App setup, native command registration and lifecycle hooks. |
| `src-tauri/src/backend.rs` | Owned process group, IPC, dynamic port readiness, health/restart/shutdown and supervisor tests. |
| `src-tauri/src/credentials.rs` | Keychain provisioning/lookup/delete by allowlisted profile reference. |
| `src-tauri/src/integrations.rs` | File dialogs, drag/drop, notifications and Dock progress. |
| `desktop/server.mjs` | Loopback HTTP Next wrapper, session/Host/Origin gate, readiness and shutdown IPC. |
| `desktop/ipc.mjs` | Versioned framed bootstrap/credential/shutdown messages with size limits. |
| `desktop/runtime-manifest.json` | Pinned runtime URLs/checksums/architectures and license metadata; no secret values. |
| `src/lib/platform/appPaths.ts` | Read-only resources and writable data/cache/temp paths. |
| `src/lib/platform/nativeBridge.ts` | Allowlisted native interactions with browser-safe fallback. |
| `src/lib/security/credentials.ts` | Profile reference credential broker and legacy secret migration. |
| `src/lib/security/guards.ts` | URL/DNS/redirect SSRF, path/symlink containment and import bounds. |
| `src/lib/contracts/types.ts` | Versioned endpoint/workflow/artifact/job/transfer/project contracts and errors. |
| `src/lib/contracts/workflow.schema.json` | Manifest/control/binding schema; no executable extensions. |
| `src/lib/contracts/artifact.schema.json` | Artifact types, hashes, architecture, license/residency and compatibility. |
| `src/lib/contracts/endpoint.schema.json` | Endpoint/profile/capability/limits contract without secrets. |
| `src/lib/contracts/project.schema.json` | Portable project snapshot and nonsecret onboarding/import contract. |
| `src/lib/endpoints/registry.ts` | Persist versioned profiles/endpoints and declared capabilities. |
| `src/lib/endpoints/adapter.ts` | Provider-neutral adapter interface and normalized output/status types. |
| `src/lib/endpoints/runpod.ts` | Queue transport, safe retry/rate limits and status/cancel mapping. |
| `src/lib/endpoints/infinitetalk.ts` | Verified handler input contract and bounded legacy output compatibility. |
| `src/lib/endpoints/comfyui.ts` | Only declared compatible worker graph envelope and object-output protocol. |
| `src/lib/endpoints/legacy.ts` | Preserved built-in Runpod payloads plus ElevenLabs adapter bridge. |
| `src/lib/workflows/registry.ts` | Immutable workflow versions, built-in seed and imported API graph records. |
| `src/lib/workflows/validation.ts` | AJV validation, defaults/conditions and endpoint/artifact preflight. |
| `src/lib/workflows/graphMapping.ts` | Clone full graph and apply only declared node input mappings. |
| `src/lib/models/artifactRegistry.ts` | Artifact registration, source/hash status, versioning and download/cache metadata. |
| `src/lib/models/compatibility.ts` | Architecture/base/node/stage/strength/endpoint compatibility rules. |
| `src/lib/storage/objectStore.ts` | R2-default direct S3 SDK implementation and private signed access. |
| `src/lib/storage/transfers.ts` | Durable multipart IDs/parts, retry/resume/abort/progress and SHA-256 validation. |
| `src/lib/storage/projectSync.ts` | Immutable revisions and conditional head publication with explicit conflicts. |
| `src/lib/jobs/repository.ts` | Atomic local persistence, immutable snapshots, leases, events and migration reads. |
| `src/lib/jobs/supervisor.ts` | Submit intent, polling/recovery/cancel, bounded retries and cost reservations. |
| `src/lib/jobs/stateMachine.ts` | Legal monotonic/idempotent transitions and uncertain-submission reconciliation. |
| `src/lib/media/presets.ts` | Reusable media transforms over retained FFmpeg service. |
| `src/components/navigation/Sections.tsx` | Seven-section navigation retaining existing studio/editor entry points. |
| `src/components/onboarding/Welcome.tsx` | R2-first connection/import/restore, credential provisioning and safe QR/link flow. |
| `src/components/workflows/WorkflowForm.tsx` | Schema-driven scalar/media/array/model/LoRA/raw-JSON controls and conditions. |
| `src/components/workflows/WorkflowManager.tsx` | Workflow import/version/capability/mapping editor with explicit validation. |
| `src/components/models/ModelManager.tsx` | Artifact/source/license/hash/compatibility registration and multiple LoRA stages. |
| `src/components/endpoints/EndpointManager.tsx` | Shared credential profiles, endpoint capabilities and independent selection. |
| `src/components/jobs/JobsView.tsx` | Durable progress/retry/cancel/uncertainty/cost history and snapshot regeneration. |
| `src/components/media/LibraryView.tsx` | Private local/R2 artifacts, reusable presets and selected project publication. |
| `src/app/api/elevenlabs/voices/route.ts` | Allowlisted voice list/detail/sample operations with server-side credentials and private caching; no arbitrary provider URL proxy. |
| `src/app/api/endpoints/route.ts` | Validated registry CRUD and profile references. |
| `src/app/api/workflows/route.ts` | Validated registry/import/version CRUD; no execution. |
| `src/app/api/artifacts/route.ts` | Model/artifact registration and compatibility queries. |
| `src/app/api/jobs/[id]/cancel/route.ts` | Explicit idempotent cancellation intent. |
| `src/app/api/transfers/route.ts` | Create/read/abort local storage transfers. |
| `src/app/api/projects/sync/route.ts` | Publish/fetch revisions, report conflicts without overwrite. |
| `workers/comfyui/handler.py` | Original compatible ComfyUI worker: validate capabilities, execute graph, publish all outputs before success. |
| `workers/comfyui/storage.py` | SDK-based private object upload with scoped grants; never AWS CLI. |
| `workers/comfyui/requirements.lock` | Pinned independently authored worker runtime dependencies. |
| `workers/comfyui/Dockerfile` | Pinned base/nodes and separate model-family build argument, no unverified upstream worker copy. |
| `workers/comfyui/model-cache.json` | SHA-256-verified Docker/predefined/S3-ephemeral-cache strategy and licensing metadata. |
| `workers/comfyui/test_handler.py` | Mocked graph execution/output-upload failure/capability contract tests. |
| `workflows/builtins.json` | All 12 active legacy catalogue definitions and adapter metadata; API graphs only when actually supplied. |
| `workflows/comfyui-example.json` | Minimal schema-conformant compatible-worker example with explicit node mappings. |
| `scripts/package-desktop.mjs` | Reproducible production dependency/resources, Node/Prisma/media/browser assembly. |
| `scripts/build-remotion.mjs` | Prebuild retained Remotion composition entry and local assets. |
| `scripts/check-version.mjs` | Assert package/Cargo/Tauri/tag version consistency. |
| `scripts/bump-version.mjs` | Synchronize versions and require changelog entry per implementation commit. |
| `scripts/smoke-desktop.mjs` | Restricted-PATH startup/health/shutdown and packaged runtime/render checks. |
| `.github/workflows/checks.yml` | Mock-first lint/type/unit/integration validation on changes; no release binaries. |
| `.github/workflows/release-macos.yml` | Version-tag-only aarch64-apple-darwin app build, artifacts and optional signed/notarized release. |
| `vitest.config.ts` | Node/browser test environments, fixtures and deterministic provider mocks. |
| `playwright.config.ts` | Browser regression and local API integration entry points. |
| `tests/desktop.test.ts` | Bootstrap/session/Host/Origin, readiness/shutdown and forbidden external-native access. |
| `tests/migrations.test.ts` | Legacy DB baseline/copy/additive migration/rollback and credential reference fixtures. |
| `tests/adapters.test.ts` | All active payload fixtures, InfiniteTalk field variants, Runpod status/cancel/uncertain POST. |
| `tests/workflows.test.ts` | Manifest types/conditions/defaults, immutable graph mapping and import rejection. |
| `tests/models.test.ts` | Cross-architecture rejection, independent LoRA strengths and WAN stages. |
| `tests/storage.test.ts` | R2-compatible requests, multipart resume/cancel/integrity, expired grants and project CAS conflicts. |
| `tests/jobs.test.ts` | Recovery/no duplicate submission, cancellation races, cost reservation and download retry. |
| `tests/security.test.ts` | Traversal/symlink/SSRF/redirect/redaction and nonsecret config import. |
| `tests/media.test.ts` | FFmpeg argument/preset behavior and offline Remotion render integration. |
| `tests/studio.spec.ts` | Navigation, retained editors, dynamic controls and restart-visible history browser flow. |
| `tests/fixtures/legacy-payloads.json` | Audited active/legacy payload snapshots with no credentials. |
| `tests/fixtures/legacy-schema.sql` | Synthetic upstream-compatible SQLite fixture without user data. |

### Generated resources and maintained documentation

- Create generated `src-tauri/binaries/node-aarch64-apple-darwin` and `src-tauri/resources/runtime/ffmpeg`, `ffprobe`, packaged Next production tree, Prisma engine, Remotion bundle and rendering browser through `scripts/package-desktop.mjs`. The packaging manifest records exact generated file inventory/checksums; do not commit vendor binaries accidentally.
- Create independently designed `src-tauri/icons/icon.png` and `src-tauri/icons/icon.icns`; retain upstream media attribution and do not reuse its identity as Oopsie branding.
- Maintain these already-created planning documents as implementation evidence changes: `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `docs/IMPLEMENTATION_TASKS.md`, `docs/UPSTREAM_IMPORT_MANIFEST.md`, `docs/BASE44_DESIGN_BRIEF.md`, and all six compact context files. They describe planned behavior until verified.

## Implementation steps

1. **P0 — establish attributable baseline and dependency evidence.** Import verified upstream tree/history through an integration branch into the current repository, preserving planning docs and existing ignore rules. Record provenance in `docs/UPSTREAM_BASELINE.md`; retain `LICENSE.md`. Run the unmodified browser baseline first, capture dependency/build failures and active model fixtures, then make minimal reviewed compatibility/security updates. Do not assume the installed Node 26 is the packaged runtime; pin a supported LTS compatible with audited packages. Add notices, changelog, version synchronization and README.ru.md. Verify all 12 catalogue IDs and legacy payload cases before refactoring. Commit title: “Import the EnguiStudio baseline with attribution”.

2. **P1 — native runtime and security proof.** Implement `src-tauri/src/{backend,credentials,integrations}.rs`, `desktop/{server,ipc}.mjs`, appPaths/nativeBridge, guards and existing settings adapters. Launch one backend on an OS-assigned loopback port, publish authenticated readiness, bootstrap the webview session, scope native capabilities to its exact origin, and supervise all children. Move database and media writes out of the signed bundle; consolidate Prisma client and migrate plaintext credential references. Move ElevenLabs voice/sample calls behind an allowlisted backend route; remove secret-bearing `engui_settings` cache and use nonsecret configured status in every form/hook. Test bad Origin/Host, remote navigation, second instance, failed startup, app paths with spaces, child crash, close/reopen and no leaked bootstrap secrets. Browser dev remains usable. Gate: native loopback auth/capability spike passes before further rollout. Commit title: “Launch the studio in a supervised macOS window”.

3. **P2 — standalone packaging and media parity.** Add `package-desktop.mjs`, runtime manifest, Remotion prebuild, native resources/icons and release workflow. Package compatible Node, Next dependencies, SQLite migrations/Prisma engine, redistributable FFmpeg/ffprobe and browser with notices/checksums. Remove runtime network font loads. Convert FFmpeg/export subprocesses to argument arrays; preserve all existing media operations and editor exports. On a clean arm64 environment with restricted PATH, launch, import sample media, extract audio, remux, encode with VideoToolbox fallback and render a Remotion composition offline. Verify app closes its process tree and requires neither Homebrew nor global Node/Chromium/AWS CLI. Signing/notarization is conditional on actual Apple credentials. Commit title: “Package the complete arm64 desktop runtime”.

4. **P3 — endpoint and workflow contracts.** Add schema/type files, registry services, adapters, `workflows/builtins.json`, endpoints/workflows APIs and EndpointManager. Introduce a shared Runpod queue transport, actual InfiniteTalk input variants, compatible ComfyUI envelope and retained built-in/ElevenLabs bridges. Multiple endpoints share profiles but preserve independent remote IDs/capabilities. Capture endpoint/workflow versions for jobs. Mock submit/status/cancel/output normalization and ensure all active payload fixtures remain equivalent. No endpoint is labelled graph-capable solely because it uses Runpod. Commit title: “Register endpoints and preserve the built-in integrations”.

5. **P4 — dynamic forms and graph import.** Implement WorkflowForm/WorkflowManager, validation and graph mapping; wire LeftPanel and navigation. Cover prompt/negative prompt, integer/float/boolean/select/multiselect/slider/seed, image/video/audio and multiple references, model/VAE/LoRA selectors, repeatable arrays, conditions and advanced raw JSON. Validate at import/edit and again before paid submission. Store an immutable original API graph and apply only declared existing node inputs; unknown bindings fail. Tests assert unbound graph content is byte-equivalent after canonical JSON comparison, independent LoRA strengths and conditions retain valid state. Existing specialist editors stay reachable. Commit title: “Generate workflow controls from validated manifests”.

6. **P5 — artifact registry and model compatibility.** Add ModelManager, artifact schema/service/compatibility rules and legacy LoRA bridge. Register all required artifact types with version/source/size/SHA-256/license/restrictions/base/architecture/custom nodes/dependencies/cache strategy. Support multiple LoRAs and WAN high/low slots; reject unknown/incompatible required architecture or missing nodes before spending. Add explicit configuration for custom variants and policy/consent checks without constraining generic parameter types. Validate hashes on downloaded artifacts, prevent traversal, and surface unverified legacy metadata for correction. Tests cover SDXL/FLUX/WAN mismatches and model/clip strengths. Commit title: “Validate model artifacts and architecture-specific LoRAs”.

7. **P6 — R2 pipeline and team restore.** Implement objectStore/transfers/projectSync, migrate S3 facade/routes and add R2-first Welcome and LibraryView. SDK multipart transfers persist upload IDs/parts, retry only safe operations, resume/cancel/abort and verify integrity; presigned grants remain private and bounded. Accept local env/JSON secrets only into Keychain; QR/link config has no long-lived secrets. Publish selected immutable project snapshots and test conditional-head conflicts across two clients. Provision teammate credentials separately. Add independently authored compatible worker, pinned Docker/model-cache examples for Docker weights/predefined cache/R2 ephemeral cache with separate heavy families; no paid Network Volume default. Worker success requires every output uploaded and verified. Existing InfiniteTalk can configure image/audio signed URLs but durable output remains blocked until its handler is replaced/rights-cleared. Never claim the legacy Base64 path passes production output acceptance. Commit title: “Move private media and shared projects through R2”.

8. **P7 — durable orchestration and hardening.** Add repository/state machine/supervisor and JobsView; bridge existing generation/status/history endpoints. Persist Draft/Uploading/Queued/Initializing/Running/Downloading/Completed/Failed/Cancelled plus uncertainty/cancel-intent substatus, immutable configuration snapshots, timestamps/artifacts/errors/retries/costs. Reserve configured spend/concurrency limits before submit; optional threshold confirmation is server-validated. An ambiguous POST is never blindly retried; GET retry cannot create jobs. Resume polling/transfers after crash/sleep, handle expiry/rate limits, cancel races and late output, distinguish measured costs from estimates. Lock down inherited webhook/file/URL routes, complete migration/security/editor regression tests and acceptance record. Commit title: “Recover jobs safely and enforce generation limits”.

9. **Release readiness — evidence and upstream updates.** Run the complete verification below; update README/README.ru, notices, changelog, upstream patch map and compact memory. Validate tag-to-version match and `aarch64-apple-darwin` packaging; tag builds produce the app artifact only after CI passes. Document signed versus unsigned status accurately. Rehearse importing a later upstream commit on a temporary integration branch and rerun active-catalogue/editor fixtures; resolve changes without overwriting native boundaries. Commit title: “Document and verify the first desktop release”. No push, public release, cloud deployment or paid GPU action is performed merely by approving local implementation.

Each numbered milestone may use smaller focused commits if needed. Every implementation commit must update CHANGELOG and synchronized package/Cargo/Tauri version; begin at `0.1.1-dev.1` after the upstream `0.1.0` baseline and increment prerelease revision per step. Release promotion uses an explicit `vX.Y.Z` tag matching all manifests. Do not tag every development commit. Keep schema migrations forward-only after release and preserve an import backup.

## Verification

These are commands to add/run after approval; none is reported as passed now. Establish package scripts exactly as listed so verification is reproducible.

```sh
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm test -- --run
npm run test:integration
npm run test:e2e
npm run build
npm run build:remotion
cargo test --manifest-path src-tauri/Cargo.toml
npm run desktop:package
npm run desktop:build -- --target aarch64-apple-darwin
npm run desktop:smoke
npm run version:check
git diff --check
```

- `test:integration`: disposable legacy SQLite migrations, credential broker fake, S3/Runpod/ComfyUI HTTP mocks, multipart recovery and concurrent project head updates. No GPU/account needed.
- `test:e2e`: browser development regression for retained UI/editor, dynamic controls and durable history. Native webview/capability checks additionally require the packaged macOS smoke/manual run; browser automation alone cannot prove Tauri behavior.
- Worker tests: `python3 -m unittest discover -s workers/comfyui -p 'test_*.py'` after its pinned test environment is installed. Verify partial output upload fails the job instead of returning success.
- R2 conformance: with a separately configured disposable bucket/prefix, test multipart, presign expiry, checksum behavior, range reads, two-client conditional updates and cleanup using SDK calls. Never operate on user media prefixes. Mock tests are mandatory; real service evidence is recorded separately.
- Live inference: after explicit endpoint setup and spend authorization, test each declared built-in deployment and InfiniteTalk image/audio. Record which are verified, unavailable, incompatible or blocked. No claim that all 12 cloud workflows work from fixture tests alone.
- Manual clean Mac/VM: app launch/readiness, automatic shutdown, dialogs/drag-drop/notifications/Dock, sleep/restart recovery, offline Remotion and absence of global Node/Homebrew/AWS CLI dependencies.
- Acceptance matrix in `docs/ACCEPTANCE.md` covers all 13 supplied criteria; production S3-output acceptance needs a conformant worker, not the current unchanged InfiniteTalk handler.
- CI checks run on changes. Release binary workflow triggers only on `v*` tags, validates semver and synchronized versions, selects an arm64 runner/build environment and asserts architecture. No Intel/universal app deliverable.

## Risks / edge cases

1. Upstream derivative license restricts commercial distribution. User accepted preserving it; whole-app permissive licensing still needs permission. Worker source/image redistribution and Remotion/FFmpeg dependencies require independent clearance.
2. Audited dependencies are old and the repo has no prior build evidence. Pin updates only after baseline/security review; compatibility changes are separate from feature refactoring.
3. Tauri dynamic-loopback origin capabilities and authenticated bootstrap are a Phase 1 proof gate. Full Next SSR must work in WKWebView without granting remote sites native commands.
4. Normal production dependency packaging is larger than standalone; Remotion browser/native dependencies and FFmpeg dynamic libraries increase size/signing complexity.
5. Existing InfiniteTalk output cannot satisfy durable external R2 output unchanged. No unlicensed worker copying and no invented support flags.
6. POST uncertainty prevents exactly-once promises without provider support. User-visible reconciliation is safer than automatic paid resubmission.
7. Presigned grants may expire during cold starts; local app sleep must not be required for worker output publication. Bound runtime/grant lifetimes or require an explicit broker.
8. Model hashes, node versions, architecture and licenses may be absent from legacy records. Show unverified status and require completion where needed.
9. SQLite/Keychain migration and random loopback origins can lose legacy localStorage preferences unless explicitly migrated. Preserve backups and document retained plaintext copies.
10. R2 behavior differs from full AWS S3. Test checksums, multipart and conditional publication rather than assuming parity. Never use ETag as SHA-256.
11. Apple signing credentials, real R2/Runpod access and existing endpoint readiness are external prerequisites for corresponding verification, not inferred from local tooling.

## Out of scope

Intel/Windows/Linux installers, permanent GPU provisioning, an unrestricted ComfyUI node canvas, simultaneous shared SQLite, automatic paid deployments/model downloads, copying the unlicensed InfiniteTalk worker, automatic permissive relicensing, sending the Base44 brief externally, and publishing/pushing releases without a separate instruction. No arbitrary handler compatibility or guaranteed exactly-once provider submission.
