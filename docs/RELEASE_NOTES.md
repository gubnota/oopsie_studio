Welcome walkthrough with downloadable 32×32 CPU image/video workflows, shared file drop controls, and Finder imports into the timeline. Fixes the saved video clip data conversion that could crash the preview. ComfyUI video artifact downloads are covered by a local MP4 mock test.

Download the macOS arm64 ZIP, extract it, and move Oopsie Studio.app to Applications. The app is ad-hoc signed, not notarized; macOS may require approval in System Settings → Privacy & Security after the first attempted launch. Do not disable Gatekeeper globally.

Requires macOS 12+ on Apple silicon. Uses the system webview; no Node/Next.js server is included. Video editing/export requires separately installed FFmpeg/ffprobe. The synthetic CPU video example requires ComfyUI's SaveWEBM node and its encoder; it does not perform AI inference.

Real ComfyUI/Runpod inference and R2 round trips remain unverified. FLUX.3 integration is planned, not implemented. Original noncommercial license applies; see the bundled LICENSE.md and setup guide in the repository.
