# Base44 design request — Oopsie Studio

Status: prepared prompt only; not sent to Base44. UI design proposal, implementation pending.

Design the missing UX for a macOS AI media studio derived from the existing EnguiStudio three-panel dark interface. Preserve its image/video/audio generation and specialist video/voice editors. Produce screen designs and component/interaction specifications suitable for Next/React and a native Tauri window; do not replace its implementation or introduce a different backend.

## Brand and visual language
- Name: Oopsie Studio. Tone: capable, calm, playful in small details, clear about costs/errors.
- Retain indigo `#4F46E5` primary, dark navy surfaces near `#14141E` / `#0A0A14`, raised `#1E1E2D`, restrained borders near `#2D2D41`.
- Optional warm accent for creativity; reserve semantic colors for queued/running/completed/failed states. Meet readable contrast and reduced-motion preferences.
- Propose an original macOS rounded-square icon: a simple loop/frame with a small spark or intentional offset. Distinct silhouette at Dock and 16px sizes; no upstream logo reuse or tiny letters.
- Include light/dark icon treatments, wordmark, focus/hover/disabled states and typography using packaged local fonts.

## Screens and interactions
1. Welcome: default Cloudflare R2 profile with account/endpoint/bucket/project prefix, native credential entry and connection test. Import local env/JSON or scan/paste nonsecret QR/link configuration, preview fields, then restore selected projects. Explain missing credentials with a clear next step; never show secrets in links.
2. Generate: workflow selector above automatic controls; prompts, seed/randomize, collapsible advanced options, model/VAE choices, independent LoRA strengths and WAN high/low stages. Media cards handle multiple image/audio references with roles/reorder/remove. Keep specialist editors reachable.
3. Workflows: built-in/imported versions, required capabilities, compatible endpoints, manifest validation and advanced API JSON/mapping editor. Raw JSON is an advanced view, not the default unrestricted node canvas.
4. Models & LoRAs: artifacts with architecture/base/license/hash/residency/verification state, source registration and compatibility explanations before generation.
5. Endpoints: multiple Runpod endpoints sharing credentials, declared workflow/model/media capabilities, timeout/concurrency/cold-start estimates and test status. Do not imply every endpoint accepts arbitrary graphs.
6. Jobs: persistent queue, stage progress, cancel/retry-download/reconcile, timestamps, cost estimate versus actual, snapshot regeneration and restart recovery. Ambiguous submission must offer reconciliation without a duplicate paid rerun button as default.
7. Media Library: private local/R2 media, audio/video preview, processing presets, selected project sharing, restore revision picker and explicit conflicting-revision/fork UX.
8. Settings: R2 and optional other S3 profiles, secure credential replacement, cache/disk limits, cost thresholds, media defaults, diagnostics redaction, version/license/about and native notification options.

## Required states and deliverables
- Desktop startup/health error and bounded restart, empty/loading/offline/permission/validation/expired-upload states.
- Job states Draft, Uploading, Queued, Initializing, Running, Downloading, Completed, Failed, Cancelled; separate uncertain submission/cancellation intent indicators.
- Clear spend confirmation above a configurable threshold. No imaginary actual-cost certainty when provider exposes only estimates.
- Worker-output incompatibility warning for the current InfiniteTalk deployment; distinguish “can configure inputs” from “durable R2 outputs supported”.
- Team revision conflict comparison and explicit fork; no silent overwrite.
- Responsive desktop wireframes, accessible component states, keyboard/drag-drop flows, token palette and original icon concepts.
- All explanatory copy is product-facing. Keep SDK/CLI/process/SQLite details out of normal generation flows.
