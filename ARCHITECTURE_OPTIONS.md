# Architecture options

Date: 2026-11-07. Current recommendation: **PARTIALLY REUSE**, provisional.
The audit is complete; independent local mocks pass; independent live tests and
the original EnguiStudio comparison are pending. No final adoption gate is passed.

| Option | Benefit | Main cost / risk | Selection evidence needed |
| --- | --- | --- | --- |
| KEEP ENGUISTUDIO | Most existing editor/media UI retained | Repair credentials, paid POST retries, 404 handling, cancellation, recovery, storage and fixed model coupling; Next server increases desktop scope | Core original workflows must pass live comparison and changes prove localized |
| PARTIALLY REUSE | Retain useful media/editor controls and tested payload mappings; independent service core | Component extraction and temporary compatibility facades; copied code retains noncommercial license | At least one original image and one video/audio workflow compared; extraction spike measures actual coupling |
| REPLACE | Small UI built directly around tested adapters and manifests | Rebuild controls/previews/history; advanced timeline/export features add substantial scope | Choose if extraction costs exceed a small new UI, original behavior is unreliable, or license permission is unavailable for intended distribution |

## Why partial reuse currently leads

Source inspection shows useful forms, editor controls and media operations, but
fixed serializers, plaintext credentials in the original, ambiguous paid retry
behavior and weak job recovery require independent foundations. Ten harness
tests establish only local protocol behavior; they cannot measure how many real
EnguiStudio workflows work. Wholesale adoption is therefore unsupported, while
discarding every component before comparison would also be premature.

For commercial permissive distribution, copying EnguiStudio components is not a
license workaround. Preserve its noncommercial license as agreed; get upstream
permission before MIT/Apache distribution. An independently written UI would
still require its own model/dependency/media rights review.

## Common boundaries after the decision gate

```text
React UI → application use cases → durable job manager
                          ↘ workflow manifests + model/endpoint registries
job manager → inference adapters → Runpod queue / Comfy worker / future provider
job manager → storage interface → local files / R2 / other compatible S3
media service → chosen system FFmpeg/ffprobe or an approved bundled binary
later: Tauri → lifecycle, Keychain, filesystem, narrow native commands
```

- Provider adapters own exact input/output/status/cancel contracts; no model
  switches in UI or orchestration. A new compatible endpoint is configuration;
  a genuinely new wire protocol requires an adapter.
- Versioned manifests own bounded JSON Schema, declarative controls and explicit
  Comfy node/input bindings. Media arrays, several audio/image/video roles and
  model-specific controls are supported only by declared capabilities.
- Model registry records architecture, variant/quantization, dependencies,
  source, license, hashes and worker residency. File extension is not compatibility.
- Durable jobs own pre-submit intent, immutable endpoint/graph/model snapshots,
  remote IDs, cancellation, artifact persistence and cost observations. An
  ambiguous POST is uncertain; retries require reconciliation or proven provider
  idempotency. A client token alone cannot guarantee exactly-once inference.
- Storage owns private object references and expiring grants. R2 is the default;
  no AWS CLI, mandatory Runpod volume or per-model frontend rebuild.
- Media execution accepts a user-selected installed FFmpeg, including codecs
  available in that binary. Detect capabilities; use argument arrays and bounded
  subprocesses. Local use permission is distinct from redistribution permission.
- Tauri packaging and full branding expansion follow a working browser prototype.
  Base44 colors and the supplied icon set remain the design requirement for all
  reused panels; no further redesign is authorized in the current validation phase.

## Engineering estimates

Planning ranges, not measured velocity or a delivery quote: one experienced
engineer, an existing working image worker and video worker, no new model backend,
core generation/history/storage only, no advanced timeline parity or desktop build.

| Path after validation gate | Approximate effort to core browser prototype |
| --- | --- |
| Adopt and repair existing core | 18–30 engineer-days |
| Independent core + selected components | 15–25 engineer-days |
| New lightweight UI + independent core | 18–30 engineer-days |

The 2–4 day original-compatibility/extraction investigation is separate; missing
workers, H3 deployment, broad model coverage and new quantization kernels are
unestimated backend projects. A large existing editor can make replacement much
more expensive if full feature parity becomes required. Re-estimate after the
comparison rather than treating these overlapping ranges as proof of savings.

## Gate record

- Source audit: complete; see [ENGUI_FEASIBILITY.md](ENGUI_FEASIBILITY.md).
- Independent local API/storage mocks: 10 tests passed.
- Independent real endpoint + real R2: pending configuration/authorization/budget.
- Original unmodified Engui comparison: pending preceding live evidence.
- Final choice: **not made**; provisional PARTIALLY REUSE.
- Next authorized work: validation and documentation, not native packaging,
  tagged release, major UI refactor or deployment automation.
