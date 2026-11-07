# Implementation Plan: smallest useful onboarding and file import

Status: Approved by “pls implement the simplest version then”, extending the
previously presented Welcome / drag-and-drop / local video mock proposal.
The user additionally requested tags, GitHub Actions binary build instructions,
and installation of the latest verified app in Applications.

## Goal and existing behavior
Ship a usable native baseline with guided first tests. The welcome screen currently
shows storage setup; the timeline accepts library JSON drops only. Flat database
keyframe responses can replace the nested frontend shape and crash rendering.

## Approach and files
1. Add `src/lib/workflows/examples.ts` and a small Welcome component, linked from
   `StudioShell.tsx`: downloadable model-free image/video manifests, import actions,
   local CPU instructions, scale-to-zero Runpod guidance, official real-video link.
2. Update `StudioSelect.tsx`, `globals.css`, add `src/lib/fileSelection.ts`: shared
   file drop, accept/multiple/disabled validation, clear feedback. Set HTML5 drag
   handling in `src-tauri/tauri.conf.json`.
3. Add `src/lib/videoKeyframes.ts`, normalize load/save responses in StudioContext;
   share persisted media imports between VideoEditorHeader and VideoTimeline via
   `src/components/video-editor/useMediaImport.ts`. Keep library item drops working.
4. Update `workflow.rs`: recognize video history outputs; test real MP4 fixture
   download, hashing and saved completion using a local mock. Add frontend regression
   tests for keyframe conversion, file acceptance and example manifests.
5. Add `.github/workflows/desktop.yml`, release packaging script and
   `docs/RELEASING.md`: main/PR checks, manual build, v* tag release with zipped
   Apple silicon app and checksums. Bump to 0.2.1, commit on main and add v0.2.1.
6. Update compact docs, setup guide and requirements status. Install verified app
   into /Applications, preserving any prior installed app before replacement.

## Verification
Typecheck, lint, frontend tests, Rust tests, local Python mocks, native build,
bundle audit, native smoke, targeted visual check and installed app launch.
No paid endpoints, live R2/inference calls or bundled Node/FFmpeg. FLUX.3 remains
the separately documented full integration plan; no placeholder submission UI.
Ad-hoc builds are not notarized. CI execution requires pushing the workflow.

## Implementation evidence
All six local implementation steps completed for 0.2.1. Typecheck/lint, 7 frontend
tests, 9 Rust tests, 10 Python mocks, native release/audit/restart smoke and ZIP
packaging passed. Installed app launched from /Applications; a picker-imported MP4
rendered after restart. Browser workflow JSON drop passed; native Finder gesture
was not directly verified. Three native window sizes showed dark corners/preview.
Remote push/tag/CI verification is the final publication step. See TASK_LOG.md and
REQUIREMENTS_STATUS.md for remaining cloud/provider/editor limits.
