# Oopsie Studio — Project Context

## Identity
- Project: Oopsie Studio; repository: gubnota/oopsie_studio.
- Purpose: native macOS workspace for AI media workflows, private storage, and editing.
- Users: individual creators using their own ComfyUI/Runpod endpoints and R2 buckets.
- Current local version: 0.2.1, macOS arm64, ad-hoc signed; not notarized.

## Current milestone
- User approved the compiled React + Rust migration with “pls do it”.
- Native migration implemented; build approximately 10 MiB.
- Installed app opens offline through WKWebView with no Node server.
- Native SQLite, Keychain, HTTP adapters, private R2 and installed-FFmpeg operations implemented.
- Native local/mock tests and bundle smoke pass; latest checks recorded in TASK_LOG.md.
- Real inference, real R2 and unchanged upstream runtime comparison remain unverified.
- No paid deployment or inference performed; no endpoint credentials or budget supplied.
- Fresh main root snapshot 5e64415 created; previous history retained locally as legacy-before-native.
- Implementation 310bfc7 and annotated v0.2.1 published; main/tag Actions checks and builds passed.
- Published GitHub ZIP/checksum verified; that release is installed and running in /Applications. Evidence: TASK_LOG.md.
- Minimal walkthrough/drag-drop/video-test extension approved and implemented; see SIMPLE_IMPLEMENTATION_PLAN.md.
- Dedicated FLUX.3 provider adapter not implemented.

## Stack and boundaries
- Desktop UI: React 19, Vite, Tailwind, shared Radix menus and Oopsie icons.
- Desktop backend: Tauri 2, Rust, reqwest/rustls, rusqlite, macOS Keychain.
- Media: user-installed FFmpeg/ffprobe, safely spawned without a shell.
- Browser development target: Next 15, Prisma/SQLite, React; retained separately.
- Independent validation harness: Python standard library, no app imports.
- Source dependencies and build caches are not installed app contents.
- Base44 design reference: https://oopsie-studio-flow.base44.app.

## Hard constraints
- No AWS CLI; Cloudflare R2 preferred, direct SigV4 HTTP in desktop.
- No bundled Node, node_modules, Next server, Chromium, FFmpeg or ffprobe.
- No required Homebrew at runtime; installed media tools are optional until needed.
- Preserve noncommercial upstream license and attribution; no MIT/Apache claim.
- Commercial redistribution requires upstream permission.
- Keep credentials in Keychain, not plaintext SQLite or localStorage.
- Legacy encrypted credentials require re-entry; do not silently expose them.
- No paid endpoint deployment or generation without endpoint authorization and budget.
- Cheapest test: local CPU mock; cloud min workers 0/max 1, short idle, no volume.
- Scale-to-zero is not a guarantee of zero billable startup/idle seconds.
- Tiny output resolution does not eliminate model memory requirements.
- Workflow JSON is data, not executable host commands.
- Persist submission intent before one provider POST; never blindly repeat uncertain submissions.
- Never label scaffolds, mocks, or unverified model support as completed features.

## Implemented workflows
- Import API-format ComfyUI graphs and explicit parameter bindings.
- Register immutable workflow/endpoint versions and Keychain credentials.
- Validate node availability; submit, poll, cancel supported queue jobs.
- Recover uncertain submission by explicit graph/client ID verification.
- Download artifacts atomically with size bounds and SHA-256.
- Browse/upload/create folders/delete objects in configured private R2 bucket.
- Save workspaces/projects/timeline tracks and clips in local SQLite.
- Basic timeline editing and MP4 export using installed FFmpeg.

## Current limitations
- No CapCut parity: captions, transitions, effects, and animation keyframes absent.
- No arbitrary model/LoRA compatibility inference or model installer.
- Runpod worker must accept the expected workflow input and durable HTTPS outputs.
- Inline Runpod base64 outputs unsupported by native adapter.
- ComfyUI reference input uploads to remote workers are not implemented.
- Shared upload controls accept validated file drops; Finder timeline drops and the picker share persisted imports.
- Native upload limit 32 MiB/file; workflow import 2 MiB; artifact download 1 GiB.
- Shared project revisions/multipart transfers and advanced media presets remain proposed.
- Historical audit/compatibility reports are evidence, not implemented feature lists.

## Agent workflow
- Read six compact docs before targeted source inspection; never scan whole repo by default.
- Approved native plan: docs/NATIVE_MIGRATION_PLAN.md.
- New substantial scope requires plan approval per user-selected skill.
- Keep docs current and commits small; preserve existing user work and Git history.
- Record exact verification and live-cloud boundaries in TASK_LOG.md.
- Keep UI centered outside sidebar; shared fancy controls and muted purple-gray dividers.
- Remove upstream branding from product UI while retaining legal attribution.
- Initial root commit on main is authorized; old main is renamed legacy-before-native. Version tags, GitHub binary builds, remote push and Applications installation are authorized.
