# Task Log

## 2026-11-07 — current: 0.2.1 minimal native release
- Approved scope: docs/SIMPLE_IMPLEMENTATION_PLAN.md; main commit, annotated v0.2.1, push, GitHub binary builds and Applications installation authorized.
- Implemented welcome with downloadable 32×32 synthetic CPU image/video manifests, import actions, local ComfyUI and scale-to-zero Runpod guidance. These examples do not run AI inference.
- Shared upload controls now validate file drops and picker selections. Header/timeline imports persist media before adding clips. Flat saved/load keyframe DTOs are normalized to fix the imported-video preview crash.
- Added a real MP4 fixture and ComfyUI history-output download/hash/persistence mock covering videos and gifs keys.
- Added macOS arm64 Actions checks/build/artifacts and matching-tag GitHub Releases, ZIP/checksum packaging, docs/RELEASING.md and release notes. Publication/CI results must be confirmed from the remote, not inferred from local checks.
- Local checks passed: typecheck, lint, 7 frontend tests, 9 Rust tests, 10 Python mocks, release build, bundle audit, native SQLite/CRUD/restart smoke and ZIP packaging. Loopback mocks and native runtime required sandbox permission; no paid calls.
- Final bundle: 10,446,736 bytes (9.96 MiB), five files, valid ad-hoc signature; no Node/Next server, node_modules, Chromium or bundled FFmpeg. Version 0.2.1 installed at /Applications/Oopsie Studio.app and launched successfully.
- UI checks: welcome example downloaded; browser JSON file drop imported; native picker MP4 import rendered and survived app restart. Native Finder drag gesture was not directly verified. Shared import logic is covered by tests.
- Populated preview and native window sizes 2880×1800, 3384×2168 and 2404×1604 checked: dark surfaces/corners, no white edge strips in those views. Error fallback centering was verified previously collapsed/expanded and in a short scrolling viewport. Full per-control/codec audit remains incomplete.
- Main root snapshot 5e64415 preserved; old history remains locally on legacy-before-native. Existing copyright/noncommercial license retained.
- Outstanding: live ComfyUI/Runpod inference, R2 round trip, remote input upload, full FLUX.3 adapter and advanced CapCut features. Hosted Base44 poster strips require the supplied prompt in the user-owned project.

## Historical: 2026-11-07 — validation-first correction
- User superseded Engui-first order with audit → independent API → original comparison → decision → prototype → Tauri.
- Paused existing UI/native/packaging/release changes without discarding them; no push/tag in this phase.
- Read six compact context files, latest attachment and plan skill; immediate harness work explicitly authorized by the attachment.
- Audited pinned original `4cb2750` separately from modified Oopsie: fixed model mapping, paid POST retries, 404-as-queue, missing cancel/timeout handling, mutable endpoint lookup, plaintext original secrets, CLI/volume assumptions.
- Verified current primary model sources: FLUX.3 is video/audio, not FLUX Krea; MiniMax H3 open release exists; InfiniteSpeech exact identity remains unresolved.
- Wrote ENGUI_FEASIBILITY.md, ENDPOINT_COMPATIBILITY.md, ARCHITECTURE_OPTIONS.md, PROTOTYPE_PLAN.md and independent RUNPOD_SMOKE_TESTS/.
- Harness supports env credentials, endpoint aliases, submit/poll/cancel, private raw requests, sanitized diagnostics, uncertain POST state, local cost reservations, bounded artifact downloads and presigned S3 round-trip; no AWS CLI or app imports.
- Verification: `python3 -m unittest discover -s RUNPOD_SMOKE_TESTS -p 'test_*.py' -v` → 10 passed. Loopback mock binding required sandbox escalation; no cloud requests involved.
- All results are mock/local. Real Runpod/R2 and unchanged original runtime comparison: NOT RUN. No paid endpoints deployed and no real model generations.
- Recommendation: PARTIALLY REUSE, provisional until original/live comparison; final architecture gate pending.
- Next: configure explicitly authorized endpoint IDs/key/budget/rates; CPU synthetic queue first, real image/video workers later; record versioned live evidence before original comparison.
- System FFmpeg/non-free installed codecs are allowed; redistribution rights remain separate.

## Historical: 2026-11-07 — initial audit and approval plan
- Status: planning complete; explicit implementation approval pending.
- Read user brief, repository workflow and plan-before-implementation skill.
- Initialized missing six compact docs before source inspection as instructed.
- Local repository: main, no commits/source; initial `.gitignore` only; remote gubnota/oopsie_studio.
- Read-only audit extracted EnguiStudio (180 files) and InfiniteTalk (17 files) to temporary storage. Imported neither into workspace; executed no upstream code.
- References: EnguiStudio `4cb2750c8b2855e60ff28efa8ab60dbff5a419fc`; worker `16892b4fb204cbc9a2defc22dcabeb01ff336631`.
- Inspected UI/model metadata, routes, Prisma schema, settings/credentials, Runpod/S3, FFmpeg/Remotion, worker payload/output and license.
- User accepted preserving EnguiStudio noncommercial license; permissive distribution conditional on upstream permission.
- User requires no AWS CLI; Cloudflare R2 is the preferred/default storage profile.
- Found material gaps: plaintext secrets, CLI/mounted-storage assumptions, paid POST retry ambiguity, bundle-relative writes, legacy worker lacking durable external output, rendering/browser packaging.
- Created ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, implementation tasks, import manifest and Base44 UX brief. Updated all compact memory with verified/planned distinction.
- Local diagnostic tools: arm64, Node 26.8.2, Rust/Cargo 1.96, Xcode 27.1, FFmpeg 7.1.1. Installed FFmpeg is GPL/version3-enabled; not approved for redistribution as-is.
- Consulted official Tauri/Next/Runpod/R2/Remotion documentation; R2 direct SDK/presign/conditional publication informs plan.
- Confirmed additional secret exposure in StudioContext localStorage and browser ElevenLabs voice client; planned backend-only replacement with preserved UI behavior.
- Verification: documentation paths/import manifest checked; no builds/tests/installations/inference/cloud writes/commits/tags performed.
- Next: present concrete plan, await approval, then start attributable baseline and native security proof.

## Historical: 2026-11-07 — approved implementation (now paused)
- User approved implementation, build, push and tagged release.
- Imported pinned EnguiStudio Git history onto main; origin is empty.
- Explored all Base44 design reference pages; apply palette/icons to retained editors too.
- Test pod has not been provisioned. User requested setup/cost advice; no paid GPU started.
- Recommended official ComfyUI template with RTX 4090 for SDXL-Turbo smoke test.
- Subagent daemon unavailable; implementation proceeds in this session.

### Baseline validation
- Updated Next 15.5.29 / React 19.1.7; local bundled fonts avoid Google build requests.
- Applied Base44 palette and exact loop/spark brand, including retained EnguiStudio panels.
- Replaced S3 facade and connection test with direct SDK; no AWS CLI subprocess remains there.
- Fixed upstream hook/type errors without disabling checks.
- Replaced plaintext credential pass-through with AES-256-GCM; native key injection is next.
- Settings responses mask keys, masked edits preserve stored values, voice lookup uses server proxy.
- Removed credential localStorage persistence. Existing saved credentials require re-entry if only in localStorage.
- Verified: `npm run typecheck`, `npm run lint`, `DATABASE_URL=file:./db/database.db npm run build`.
- No R2 access or live GPU test performed; pending user-provisioned test pod.
