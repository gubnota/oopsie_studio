# Base44 follow-up — remove white preview strips

Paste into the existing Base44 project. The published site is a design reference;
these changes have not been published from this repository.

## Verified finding, 2026-11-07

- The new Welcome hero, four workflow cards, optional R2 section and step-based
  workflow sheet are present at https://oopsie-studio-flow.base44.app/.
- “Generate a short video” has pale vertical strips at both edges when idle.
- The strips are baked into `ff736ff3d_generated_image.png`, including its
  888×498 delivery variant. The preview wrapper is already dark and the image
  already uses `object-cover`. Changing the wrapper color alone cannot fix it.
- Hover scaling hides the strips, so checking only the hovered card misses them.
- The separate `/screens` Welcome mock still describes storage-first onboarding;
  bring it into agreement with the new workflow-first Welcome.

---

Fix the white vertical strips in all illustrative previews while preserving the
existing Oopsie palette, loop-and-spark mark, icon set and new Welcome layout.

The clay-ridge poster `ff736ff3d_generated_image.png` contains white pixels along
both vertical edges. Replace it and any affected alternate frames with clean,
edge-to-edge artwork. Inspect both idle and alternate images independently.
Do not rely on hover zoom to conceal the defect.

If replacing the decorative poster is impractical, apply a persistent 1.025
scale to its image layer inside the clipped preview viewport, increasing from
that baseline on hover. Apply that baseline to both crossfade layers, including
when reduced motion is enabled. Keep labels and controls outside the scaled
layer. This crop is only for the illustrative poster; never crop a user's real
generated output to hide an aspect-ratio mismatch.

Every preview viewport should use an opaque #0B0B13 background, overflow hidden,
block-level media and a muted #2D2D41 border. Decorative cards may use cover;
real output viewers must use contain, with dark letterboxing. Loading, missing
media, errors, crossfades and resizing must preserve the same dark background.
Use subdued purple-gray scrollbars and dark tracks/corners throughout.

Check at 1000×700, 1120×800, 1440×900 and 1920×1080, including fractional card
widths. Verify idle, hover, mouse leave, reduced motion, slow image loading and
drawer open/close. Inspect every thumbnail and alternate image, not only the
first visible card. No pale vertical strips, exposed white canvas or white
scrollbar tracks should appear.

Also update the older Welcome wireframe on `/screens` to match the new
workflow-first home. Keep R2 optional. Do not create backend success states or
submit paid generation requests as part of this visual correction.
