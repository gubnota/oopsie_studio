# Architecture Index

## Active native desktop
- `desktop/frontend/index.html`, `main.tsx`: static Vite/React entry and local fonts.
- `desktop/frontend/transport.ts`: same-origin API fetch to Tauri IPC; bounded file conversion.
- `desktop/vite.config.ts`: frontend build to ignored `desktop-dist/`.
- `src/components/layout/MainLayout.tsx`, `StudioShell.tsx`: workspace provider and section navigation.
- `src/components/ui/brand.tsx`, `StudioSelect.tsx`: supplied icon system and shared controls.
- `src/app/globals.css`, `tailwind.config.ts`: Oopsie palette, layout, control styles.
- `src/components/layout/StorageBrowser.tsx`: private bucket browser and transfers.
- `src/components/video-editor/`: retained timeline, preview, export dialog and clip interactions.
- `src/lib/context/StudioContext.tsx`: React project/media/timeline state.
- `src/components/layout/WelcomeGuide.tsx`, `src/lib/workflows/examples.ts`: CPU walkthrough and downloadable manifests.
- `src/components/video-editor/useMediaImport.ts`, `src/lib/videoKeyframes.ts`: shared persisted imports and flat DTO conversion.
- `src/lib/fileSelection.ts`: picker/drop filter validation.
- `src/lib/workflows/manifest.ts`: workflow types and browser-side validation.
- `src-tauri/src/main.rs`: Tauri entry, narrow `api` command, native smoke CLI.
- `src-tauri/src/service.rs`: SQLite, Keychain settings, route dispatch, project CRUD.
- `src-tauri/src/workflow.rs`: immutable registries, jobs, ComfyUI/Runpod transport and recovery.
- `src-tauri/src/storage.rs`: direct R2 SigV4, XML listing, signed operations.
- `src-tauri/src/media.rs`: managed files, installed FFmpeg/ffprobe, MP4 composition.
- `desktop/schema.sql`, `002-registries.sql`: native schema/migrations.
- `src-tauri/tauri.conf.json`: static bundle, CSP, managed asset scope, window/icon settings.
- `src-tauri/icons/`: macOS application icon set.

## Build and tests
- `package.json`: separate desktop and browser scripts.
- `.github/workflows/desktop.yml`, `scripts/package-desktop.mjs`: arm64 binary builds, tagged releases and checksums.
- `tests/import.test.ts`, `tests/fixtures/micro-video.mp4`: drop/clip contract tests and synthetic MP4 fixture.
- `scripts/audit-desktop.mjs`: size/content/codesign audit.
- `scripts/smoke-desktop.mjs`: native SQLite/restart/runtime smoke.
- Rust inline unit/integration tests in `src-tauri/src/`.
- `tests/workflow.test.ts`: graph mapping and validation tests.
- `tests/session.test.mjs`, `desktop/auth.mjs`: legacy loopback boundary test, not native runtime.
- `RUNPOD_SMOKE_TESTS/`: independent Python queue/storage harness, CPU worker and mock tests.

## Retained browser target
- `src/app/page.tsx`, `layout.tsx`: Next entry.
- `src/app/api/`: browser HTTP routes; native does not launch these.
- `prisma/schema.prisma`: browser persistence only.
- `src/lib/runpodService.ts`, `s3Service.ts`, `ffmpegService.ts`: browser services.
- `desktop/server.mjs`, `scripts/prepare-desktop.mjs`, `desktop/loading/`: superseded Node bundle tooling; not called by native build.

## Guides and decisions
- `docs/RELEASING.md`, `docs/RELEASE_NOTES.md`: binary downloads, tags, CI and installation.
- `README.md`, `README.ru.md`, `docs/SETUP.md`: product/build/setup instructions.
- `docs/NATIVE_MIGRATION_PLAN.md`: approved current local implementation scope.
- Six compact memory files in `docs/`: current architecture and task state.
- Root feasibility/compatibility/options/prototype reports: historical validation evidence.
- `LICENSE.md`: original noncommercial terms, bundled with native app.
- `docs/UPSTREAM_IMPORT_MANIFEST.md`: attribution/source map.

## Current design and setup documents
- `docs/REQUIREMENTS_STATUS.md`: request-by-request implementation and verification gaps.
- `docs/SETUP.md`: official project setup instructions and verification limits.
- `docs/BASE44_WELCOME_PROMPT.md`: ready-to-paste welcome/gallery design request.
- `docs/BASE44_PREVIEW_FIX_PROMPT.md`: verified hosted preview asset issue and Base44 correction prompt.
- `docs/FLUX3_INTEGRATION_PLAN.md`: proposed hosted FLUX.3 Video adapter; not implemented.
