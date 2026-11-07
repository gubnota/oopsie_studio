# Native desktop migration — approved 2026-11-07

Authorization: the user accepted the proposed compiled React + Rust migration with
“pls do it”, after requesting removal of bundled Node and node_modules.

1. Compile the existing React/Base44 interface with Vite. Keep Next browser mode
   as a separate development target. Retain the supplied branding and icon set.
2. Replace the Node supervisor and loopback server with local Tauri IPC, native
   SQLite persistence, Keychain credentials and native HTTP provider adapters.
   Preserve durable submission intent and never automatically repeat paid POSTs.
3. Port workflow registration, direct ComfyUI testing/submission/recovery and
   artifact downloads; retain editor data contracts and private R2 configuration.
   Implement native media operations using installed FFmpeg/ffprobe. Do not bundle
   Chromium or silently claim Remotion rendering parity: report any unsupported
   export features explicitly, retaining the browser implementation separately.
4. Restrict native operations to the local webview, validate imported documents,
   keep credentials out of frontend responses, restrict media reads to app data.
5. Build and launch the app, test native persistence/provider recovery against a
   local mock, check the static frontend and browser types, and enforce a bundle
   size/content budget. Record real results and outstanding live-cloud gates.

Acceptance: no Node executable, node_modules, .next server/cache, Chromium or
redistributed FFmpeg in the installed app; opens offline using WKWebView; core
workflow/job/storage paths are native. No paid endpoint is provisioned or called.

The earlier live Runpod/R2 validation and license gates remain outstanding.
This authorization resumes local desktop work; publishing remains deferred.

UI refinement authorized during implementation: center the main content on both axes
outside the sidebar, use shared styled inputs/dropdowns/upload controls, disable text
selection highlighting on static UI, use muted purple-gray dividers, and remove
upstream branding from visible UI/server labels. Keep required legal attribution.
User subsequently requested a fresh main root commit and renaming the old branch to legacy-before-native. Preserve that local branch; do not force-push.
