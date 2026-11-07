# API Contracts

## Native transport (implemented)
- Tauri command `api({path, method, body})` returns JSON or a rejected error string.
- Frontend same-origin `/api/` fetches are converted by `desktop/frontend/transport.ts`.
- Failures become JSON `{success:false,error,message}` with HTTP-like status 400 in facade.
- No loopback HTTP server or global native filesystem/shell API is exposed.
- Multipart file: `{name,type,bytes:number[]}`; max 32 MiB per file.
- Managed media URLs use `asset://localhost/…`; only app-data media is asset-scoped.

## Settings and media (implemented)
- `/api/settings` GET/POST: `{settings:{s3,…}}`; secrets masked `********`.
- Mask preserves existing credential; empty value clears it; actual value saved in Keychain.
- SQLite uses credential markers/references; native responses do not reveal saved secrets.
- `/api/settings/test` POST `{service:'s3'}` tests saved R2 configuration.
- `/api/native/info` reports native runtime/media tool availability.
- `/api/native/reveal` POST `{url}` reveals a managed file in Finder.
- `/api/upload`, `/api/download`, audio save routes: managed media only.
- Audio detect/extract/create-muted routes require installed FFmpeg/ffprobe.
- `/api/video-export` composes image/video/audio clips, track volume/mute, to MP4.
- Export bounds: dimensions <=4096, <=128 clips/32 tracks, <=1 hour; process timeout 300s.
- Native R2 browser routes `/api/s3-storage/*`: list/upload/download/delete/create-folder/volumes.
- Direct SigV4; region `auto`, presign 15min; no AWS CLI. No multipart transfer contract yet.

## Workflow registry (implemented)
- `/api/studio` GET returns `{definitions,runs}`; POST dispatches explicit actions.
- Manifest `{schemaVersion:1,graph:ComfyAPI,bindings:Binding[]}`.
- Graph uses numeric-string node IDs, `class_type`, `inputs`; UI-format `nodes[]` rejected.
- Binding `{key,label,node,input,type,default?,min?,max?,options?}`.
- Types: string, number, boolean, enum, json. Bindings cannot map missing inputs.
- Limits: 2 MiB workflow, 2000 nodes, 100 unique bindings; unknown values rejected.
- Definitions immutable by name/version; endpoint type `comfyui` or `runpod`.
- ComfyUI origin HTTPS, or loopback HTTP; no credentials/path/query in origin.
- Preflight checks `/object_info` classes; it does not prove model weights exist.
- Runpod queue input is `{input:{workflow:resolvedGraph}}`; worker must explicitly accept it.
- Native Runpod completion requires durable HTTPS artifact URLs; inline/base64 unsupported.
- Jobs persist immutable workflow/endpoint snapshot and intent before one POST.
- Lost acknowledgement stays uncertain; no automatic resubmit. Explicit attach verifies graph/client ID.
- Refresh uses ComfyUI history/queue or Runpod status; 404 is an error.
- Artifacts download atomically, bounded 1 GiB each, record SHA-256 before completion.
- No global ComfyUI interrupt that might cancel unrelated work.

## Project persistence (implemented)
- Workspace/media/project/track/keyframe CRUD routes preserve existing editor DTOs.
- Loading project returns nested tracks with keyframes.
- SQLite remains local; no automatic database/team sync.

## Independent smoke harness
- Standalone Python async `/run`, `/status/{id}`, `/cancel/{id}`; no automatic POST retry.
- Private config uses environment credentials; local ledger is not a provider billing cap.
- Live tests require explicit live flag, endpoint authorization, positive quote and budget.
- Mock output is synthetic; real model compatibility remains unverified.

## Not implemented
- Dedicated BFL FLUX.3 adapter, remote ComfyUI input-file upload, automatic model/LoRA installer.
- Team project revision protocol, multipart transfers, schema-driven conditional UI.
- CapCut effects/captions/transitions/animation contracts.
- Historical proposed interfaces are not current API guarantees.
