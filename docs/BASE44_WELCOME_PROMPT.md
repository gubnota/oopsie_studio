# Base44 prompt — Welcome and workflow examples

Paste the following into the existing Oopsie Studio Base44 project.
This requests an interactive design prototype; it does not deploy Runpod workers or add a production model adapter.

After generation, apply [the preview correction](BASE44_PREVIEW_FIX_PROMPT.md).
The first published clay-ridge poster contains white edge pixels; a dark wrapper alone does not remove them.

---

Update the existing Oopsie Studio project with a polished **Welcome / Start creating** screen. Make this the default screen on first launch and keep it reachable through Welcome in the sidebar. Reuse the current project's visual language, logo and icon set exactly. This is a native macOS creative app, not a marketing landing page.

## Preserve the brand

- App background #0A0A14; card/sidebar surface #14141E; raised surface #1E1E2D.
- Primary indigo #4F46E5; lavender accents #7C74FF and #A8A2FF; warm spark #F0A868.
- Main text #F4F4FA; secondary text #C3C3D6; muted text #9C9CB4; dividers #2D2D41.
- Use the existing Oopsie loop-and-spark logo and existing line icons. Do not generate another logo, substitute emoji, or introduce another icon family.
- Inter for body text, Inter Tight for headings, JetBrains Mono only inside technical instructions.
- Rounded cards, quiet depth, restrained animation, lavender focus rings. No white borders or white canvas exposed while resizing.
- No EnguiStudio names, branding, or references in the interface.

## Main layout

Preserve the existing sidebar and navigation. Center the welcome composition horizontally and vertically within the area to the right of the sidebar when it fits. On smaller windows, allow natural vertical scrolling with comfortable padding. Never overlap or clip content to force centering. Design for 1440×900 and 1000×700, with a compact sidebar at narrower widths.

Lead with a small Oopsie mark, the headline **“Your first workflow starts here.”**, and the subtitle **“Try a local example, connect ComfyUI, or set up a Runpod worker.”**

Primary action: **Try a free local test**. Secondary action: **Connect ComfyUI**. Add a subtle **Runpod setup guide** link. Storage configuration belongs under an optional collapsed section, not at the center of onboarding.

## Workflow example gallery

Show four purposeful cards with a preview, title, one-sentence result, provider/hardware badges, prerequisites, and a clear action. Use tasteful storyboard/contact-sheet or output-preview compositions instead of generic decorative gradients. Preview content must be labeled illustrative until actual output exists.

1. **Local connection check** — a 32×32 color image using model-free ComfyUI nodes. Badges: Local, CPU, No model download, No cloud charges. Action: **Set up local test**. Explain that this tests connection, submission and saved output, not AI inference.
2. **Micro video test** — a tiny synthetic clip assembled from color frames. Badges: CPU, No model weights, Test fixture. Show its planned frame count, resolution and duration. Action: **View video test steps**. Distinguish this from generated AI video; show “Template pending verification” until a runnable template is supplied.
3. **Generate a short video** — a real ComfyUI video workflow such as Wan 2.2 5B. Badges: ComfyUI, GPU required, Model download required. Action: **View workflow guide**. Include a sample creative brief, model/node checklist, compatible workflow source link and API-format export instructions. GPU and cloud costs depend on the selected worker; do not promise CPU inference or arbitrary micro-resolutions.
4. **Animate an image** — image-to-video example with a reference-image drop zone and an illustrative before/after preview. Badges: ComfyUI, GPU required, Reference image. Action: **View prerequisites**. Explain that remote input-file upload still needs integration; selecting a file in the prototype must not imply a remote worker received it.

Below the gallery, add a smaller **FLUX.3 Video** card labeled **Planned integration**. Offer **Preview planned setup**, not Generate. Explain that it needs its own BFL API connection; a Runpod key or ComfyUI endpoint does not enable it. Keep this separate from runnable examples.

## Guided setup interactions

Use one consistent, accessible modal or side sheet with progress steps, Back/Next, copy buttons, and persistent navigation state.

**Local ComfyUI:** install/open ComfyUI → start in CPU mode for the model-free test → enter localhost URL (example http://127.0.0.1:8188) → test connection → import API-format workflow → run explicitly → inspect saved output. Link https://docs.comfy.org/installation/manual_install. Explain the difference between the ComfyUI canvas JSON and API-format JSON.

**Runpod serverless:** choose a queue worker compatible with the workflow → review hardware and pricing → set active/min workers 0 and maximum workers 1 → choose a short supported idle timeout → avoid a network volume for the synthetic test unless required → enter endpoint ID and masked API key → test connection → submit one job deliberately → view status and download output. Explain that cold start and shutdown idle seconds can still be billed. Link https://docs.runpod.io/serverless/endpoints/endpoint-configurations and https://docs.runpod.io/serverless/pricing. Do not hardcode prices or claim zero-cost cloud inference. Distinguish a direct ComfyUI URL from a Runpod queue endpoint ID.

Show planned checklist states: Not configured, Ready to test, Checking, Connected, Missing node/model, Incompatible worker, Failed, Submission uncertain, Completed. Never fabricate connection success or completed jobs. If a submit acknowledgement is lost, guide users to inspect/reconcile the existing job before submitting again.

**Optional Cloudflare R2:** collapsed “Save to your own bucket” section, explaining local results work first. Use account endpoint, bucket, masked access key and secret fields, Save, and Test connection. No AWS CLI instructions. Keys are never included in shareable workflow JSON or URLs.

## Shared controls and prototype behavior

Use styled dropdown menus, text fields, password fields, tabs, buttons, upload zones and tooltips throughout. No unstyled HTML file inputs or native select popups. File zones support click, keyboard selection and drag-and-drop, with accepted-format hints, hover, selected file, remove and invalid-file states. Static interface text must not show selection highlighting; editable fields remain selectable and accessible.

Make the prototype useful: cards open the matching instructions; copy buttons copy actual displayed text; navigation and Back work; file selection updates local state; optional sections expand. Label service calls as “Requires desktop connection” where no backend exists. Do not create fake success toasts, dead primary buttons, unsupported model selectors, or automatic paid requests.

Deliver the complete welcome screen plus local setup, Runpod setup, workflow detail, file-drop and connection error states using reusable components. Preserve the current app's existing screens and brand assets. Keep the visible copy concise and creator-focused; put detailed technical instructions inside the setup sheets.
