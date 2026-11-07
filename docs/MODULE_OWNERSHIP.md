# Module Ownership

| Owner | Responsibility | Allowed dependencies |
| --- | --- | --- |
| React shell/controls | Navigation, forms, previews, UI state | DTOs and fetch/IPC facade |
| StudioContext/editor | Project/timeline UI and interactions | UI types, API facade; no database or shell |
| native service | SQLite, Keychain, settings, CRUD, dispatch | Native workflow/storage/media modules |
| native workflow | Definitions, durable job intent, provider state, artifact recovery | NativeState, bounded HTTP and managed media |
| native storage | R2 signing, listing and explicit object operations | Keychain-backed settings, reqwest |
| native media | Managed media paths, bounded upload/download, FFmpeg | NativeState and controlled process arguments |
| Tauri entry/config | App lifecycle, IPC allowlist, CSP and bundle | Native services |
| Browser API/Prisma | Separate development runtime | Browser services and browser schema |
| Independent smoke harness | Queue contracts, mocks, local budget reservations | Python standard library only |
| Build scripts | Compiled frontend, native bundle audits | Build artifacts; no runtime secrets |

## Dependency rules
- Native UI never imports Node filesystem, Prisma, provider keys, or shell APIs.
- Tauri `api` is the sole application command; no general filesystem or shell capability.
- Local SQLite belongs to Rust; frontend uses stable resource DTOs.
- Secrets remain Keychain values; database and API responses carry references/masks.
- Workflow JSON cannot execute local code or bypass endpoint/path validation.
- Jobs use immutable snapshots; uncertain paid POSTs require explicit reconciliation.
- Native app never depends on Next server, Node supervisor, Chromium or bundled FFmpeg.
- Browser code remains separate and does not define native runtime requirements.
- R2 operations require explicit configuration; no AWS CLI or automatic public bucket changes.
- Do not assume endpoint presence proves graph/model/LoRA compatibility.
- Tests belong to the implementing module; integration tests verify service boundaries.
- Real worker/model and paid-cloud validation are recorded separately from mocks.
- Preserve legal attribution while using Oopsie branding in the product.

## Welcome and media imports
- Welcome examples are inert API manifests owned by the React shell; they never auto-submit.
- Shared controls own file filtering and drop feedback; the editor import hook owns upload/metadata and clip creation.
- StudioContext converts flat persistence DTOs to nested clip data on load and save acknowledgement.
- Release workflow owns macOS builds, checksums and tag publication; credentials are not application assets.
