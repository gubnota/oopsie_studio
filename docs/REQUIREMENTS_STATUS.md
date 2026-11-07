# Requirements status — 2026-11-07

This initial snapshot is a working native baseline, not completion of every request.

| Request | Current result |
| --- | --- |
| Small native macOS application | Implemented: Tauri/WKWebView, static React and Rust; 9.96 MiB ad-hoc signed bundle. No Node/Next server, node_modules or Chromium in the app. Not notarized. |
| Base44 palette and supplied icons | Applied to shell and shared controls; app icons included. |
| Center main pane and error state | Implemented. Error component verified collapsed/expanded; short-window scrolling and diagnostic wrapping checked in a temporary fixture. |
| Styled uploads, inputs and dropdowns; muted dividers; static text selection | Shared components and theme applied. Full per-screen visual audit remains incomplete. |
| No white preview/resize corners | Dark native and media surfaces implemented. Empty timeline checked; every populated-media and native resize state remains unverified. Hosted Base44 poster edge strips require the supplied correction prompt. |
| Remove former product branding | Product UI/server labels renamed. Original license and attribution retained. Legacy storage keys remain solely for migration/cleanup. |
| Cloudflare R2 without AWS CLI | Direct native signed HTTP and browser SDK paths implemented; live bucket round trip not verified. |
| CPU/serverless tests without idle spending | Local CPU mocks pass and scale-to-zero guidance documented. No cloud endpoint deployed. Provider cold-start/idle charges cannot be eliminated by app settings. |
| Video workflow generation | Generic ComfyUI/Runpod graph submission, status, recovery and artifact downloads implemented. Real video inference and worker compatibility not verified. Remote ComfyUI input upload absent. |
| Shared drag-and-drop | Incomplete. Some retained forms/timeline have drop handlers; shared upload control only opens a file chooser. Video-drop exception remains undiagnosed. |
| FLUX.3 | Full integration plan exists; dedicated adapter not implemented or tested. |
| CapCut-like editor | Basic timeline and installed-FFmpeg MP4 export implemented. Captions, transitions, effects and animation keyframes absent. |
| Welcome with real examples and prepared instructions | Base44 prompt and setup guide exist. Practical walkthrough and downloadable micro-video examples not implemented; current welcome is storage-focused. |
| Official setup guide on GitHub | docs/SETUP.md linked from README and included in this commit. Remote publication not performed. |
| Fresh initial commit | New main root snapshot requested; old history retained locally as legacy-before-native. No remote push, force-push or release tag in this step. |

## Verification of this snapshot

- Typecheck, lint and native release build passed during the immediately preceding layout change.
- Rechecked 4 frontend/session tests with Node's tsx loader; npm test's tsx CLI pipe was sandbox-blocked.
- Rechecked 8 Rust tests offline and 10 independent Python mock tests (loopback enabled).
- Bundle size/signature/content audit and native SQLite/restart/runtime smoke passed.
- Secret-pattern check found no private-key/token matches in candidate source files; it is not a comprehensive security audit.
- No paid generation, real R2 transfer, cloud deployment or live ComfyUI pod verification performed.
