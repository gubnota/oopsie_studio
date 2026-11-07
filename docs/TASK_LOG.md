# Task Log

## 2026-11-07 — current: native migration and welcome design
- Fresh initial main snapshot created for the authorized initial commit; old main renamed legacy-before-native. Account links removed from the snapshot; copyright/license and source reference retained. No remote push/tag. Root-snapshot whitespace check exposes inherited baseline whitespace; changes relative to legacy-before-native pass.
- Added docs/REQUIREMENTS_STATUS.md and README link: practical welcome, shared DnD, FLUX.3 adapter, video-drop crash diagnosis, live cloud validation and publication remain incomplete.
- Rechecked 4 frontend/session tests, 8 Rust tests, 10 Python mocks, native persistence/restart smoke and bundle audit (9.96 MiB). npm test CLI pipe was sandbox-blocked; the same tests passed via node --import tsx. Python mocks passed with loopback permission. No paid calls.

- Editor error fallback centering: fill the remaining flex pane, center the complete card and disclosure, wrap long diagnostics, and allow scrolling in short windows. Typecheck, lint and native release build passed (9.96 MiB). Actual component verified in a temporary browser fixture: collapsed at 1280×720, expanded at 1000×700 (both card center offsets 0), and scrollable at 1000×400 with no horizontal overflow. Evidence: /tmp/oopsie-centered-error.jpg. Fixture removed; video-drop crash cause remains undiagnosed.
- Inspected the published Base44 welcome, workflow guide and screen mockups. Confirmed the short-video poster itself contains white edge strips; idle shows them while hover zoom conceals them.
- Added docs/BASE44_PREVIEW_FIX_PROMPT.md with the exact asset finding, persistent decorative crop/replacement guidance and viewport/state checks. Hosted Base44 project has not been edited.
- Added opaque dark generated-media/player surfaces and global dark scrollbar tracks/corners; actual outputs retain contain/full-frame display.
- Validation: typecheck, lint and native release build passed (9.96 MiB, ad-hoc signed). Reopened the rebuilt app and visually checked the empty timeline preview: dark surfaces, no white side strips in the checked view. Evidence: /tmp/oopsie-dark-preview-check.png. Multiple viewport sizes and populated-media states were not visually verified.
- User resumed local desktop migration with “pls do it”; native React/Vite + Rust/Tauri implementation replaces the bundled Node server.
- Local native bundle built successfully at approximately 9.96 MiB; no Node/node_modules/Chromium/FFmpeg bundled. Ad-hoc signed, not notarized.
- Prior checks passed: frontend typecheck/lint, 4 frontend/session tests, 8 Rust tests, 10 independent Python tests, bundle audit and native CRUD/restart/media smoke.
- Applied shared Oopsie palette/controls, centered content, muted dividers, static-text selection policy and visible branding cleanup. Legal attribution preserved.
- Native/webview dark background and scrollbar-corner styling included in the rebuilt app. Resize gesture did not change the captured window size; multi-size resize verification remains outstanding.
- User requested a welcome screen with real ComfyUI examples and prepared Runpod instructions, then specifically requested a Base44 prompt.
- Created docs/BASE44_WELCOME_PROMPT.md: existing brand/icon reuse, four example cards, guided local/serverless setup, optional R2, honest prototype states and planned FLUX.3 card. Prompt only; not sent to Base44.
- Created docs/SETUP.md and linked it from README. Guide distinguishes local mock tests, real ComfyUI templates, unverified cloud deployment and actual editor limits.
- User requested “Also plan full FLUX.3 API integration”; created docs/FLUX3_INTEGRATION_PLAN.md for full Video modes. Proposed adapter is not implemented; approval remains required for that separate scope.
- Expanded welcome implementation, shared drag-and-drop and local video-output tests remain outstanding; the current app still shows its earlier storage-focused welcome.
- No live Runpod/R2/FLUX.3 inference, paid deployment, or remote publication performed in this segment. Initial snapshot is committed in this step; remote push remains outstanding.

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
