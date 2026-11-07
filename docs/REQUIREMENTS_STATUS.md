# Requirements status — 2026-11-07

Version 0.2.1 is a working native baseline; remaining limits are explicit below.

| Request | Current result |
| --- | --- |
| Small native macOS application | Implemented: Tauri/WKWebView, static React and Rust; 9.96 MiB ad-hoc signed bundle. No Node/Next server, node_modules or Chromium in the app. Not notarized. |
| Base44 palette and supplied icons | Applied to shell and shared controls; app icons included. |
| Center main pane and error state | Implemented. Error component verified collapsed/expanded; short-window scrolling and diagnostic wrapping checked in a temporary fixture. |
| Styled uploads, inputs and dropdowns; muted dividers; static text selection | Shared components and theme applied. Full per-screen visual audit remains incomplete. |
| No white preview/resize corners | Dark native and media surfaces implemented. Populated MP4 preview and three native window sizes checked; no white edges in those views. Full state/codec audit remains incomplete. Hosted Base44 poster edge strips require the supplied correction prompt. |
| Remove former product branding | Product UI/server labels renamed. Original license and attribution retained. Legacy storage keys remain solely for migration/cleanup. |
| Cloudflare R2 without AWS CLI | Direct native signed HTTP and browser SDK paths implemented; live bucket round trip not verified. |
| CPU/serverless tests without idle spending | Local CPU mocks pass and scale-to-zero guidance documented. No cloud endpoint deployed. Provider cold-start/idle charges cannot be eliminated by app settings. |
| Video workflow generation | Generic ComfyUI/Runpod graph submission, status, recovery and artifact downloads implemented. Real video inference and worker compatibility not verified. Remote ComfyUI input upload absent. |
| Shared drag-and-drop | Implemented in shared controls and timeline file import with validation and persistence. Flat saved clip DTO crash fixed. Browser JSON drop and native MP4 picker/restart verified; actual Finder gesture remains unverified. |
| FLUX.3 | Full integration plan exists; dedicated adapter not implemented or tested. |
| CapCut-like editor | Basic timeline and installed-FFmpeg MP4 export implemented. Captions, transitions, effects and animation keyframes absent. |
| Welcome with real examples and prepared instructions | Implemented walkthrough with downloadable/importable 32×32 CPU image/video manifests, local ComfyUI commands and Runpod scale-to-zero guidance. Synthetic examples test transport, not AI inference. |
| Official setup guide on GitHub | docs/SETUP.md and docs/RELEASING.md linked from README and published on GitHub main. |
| Fresh initial commit | Main root snapshot 5e64415 created; old history retained locally as legacy-before-native. Implementation 310bfc7 and annotated v0.2.1 pushed to origin. |
| Tagged binary builds and Applications installation | Main/tag Actions builds passed; v0.2.1 ZIP/checksum published. Exact downloaded release verified, installed in Applications and running; installed-binary smoke passed. Matching v* tags publish future binaries. |

## Verification of 0.2.1

- Typecheck, lint, native release build and ZIP/checksum packaging passed.
- 7 frontend/session/import tests passed with npm test (Node tsx loader).
- 9 Rust tests and 10 independent Python mock tests passed (loopback enabled).
- Published GitHub bundle: 9.96 MiB, valid ad-hoc signature, five files. Download checksum and installed binary hash matched; installed-binary SQLite/restart/runtime smoke passed. Imported MP4 persistence checked on the same source build.
- Secret-pattern check found no private-key/token matches in candidate source files; it is not a comprehensive security audit.
- No paid generation, real R2 transfer, cloud deployment or live ComfyUI pod verification performed.
