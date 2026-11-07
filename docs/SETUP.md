# Official Oopsie Studio setup guide

Status: native 0.2.0 local build. Local/mock transport and native media checks have passed;
real Runpod generation and real R2 round trips have not been run. The expanded welcome
walkthrough is being designed; use the steps below with the current sidebar.

## Build and open the native app

On Apple silicon macOS, install development prerequisites Node/npm, Rust and Xcode
Command Line Tools. From the repository root:

```sh
npm ci
npm run desktop:build
npm run desktop:audit
node scripts/smoke-desktop.mjs
open "src-tauri/target/release/bundle/macos/Oopsie Studio.app"
```

This is an ad-hoc signed local build, not a notarized release. The installed app
uses WKWebView and Rust; development node_modules stay outside the app. Install
your own FFmpeg/ffprobe for media processing and MP4 export. The app searches
standard system/Homebrew locations; FFmpeg is not bundled.

## Start with a free local transport test

No cloud account or GPU is required:

```sh
python3 -m unittest discover -s RUNPOD_SMOKE_TESTS -p 'test_*.py' -v
cargo test --offline --manifest-path src-tauri/Cargo.toml
```

The Python harness uses loopback mocks; its image and video aliases both return
a synthetic PNG. That harness is not evidence of real AI video generation.
See [manual mock CLI steps](../RUNPOD_SMOKE_TESTS/README.md#start-free).
Native media tests exercise a small local MP4 export using installed FFmpeg.

## Connect actual local ComfyUI

1. Follow the [official manual installation guide](https://docs.comfy.org/installation/manual_install)
   in a separate virtual environment. For a model-free CPU test, launch the installed
   ComfyUI with `python main.py --cpu --listen 127.0.0.1 --port 8188`.
2. In Oopsie **Endpoints**, select ComfyUI, enter a name/version and
   `http://127.0.0.1:8188`, save, then test connection and available nodes.
3. In ComfyUI, make a small `EmptyImage → SaveImage` graph (32×32, batch 1).
   Export **API format**, rather than the visual canvas format.
4. In Oopsie **Workflows**, choose that JSON file or paste its API graph. Give it
   a name/version and save it. An imported plain graph is wrapped automatically.
5. In **Generate**, select the saved workflow and endpoint, review inputs, and submit once.
6. Inspect **Jobs**. Completed files appear in **Library**. “Download original”
   reveals the managed file in Finder in the native app.

Connection/node checks do not verify model files, custom-node behavior or codecs.
A missing node/model must be resolved in the ComfyUI installation before generation.
No actual ComfyUI model inference has been validated in this repository session.

## Real video workflow example

Use ComfyUI's [official Wan 2.2 guide and templates](https://docs.comfy.org/tutorials/video/wan/wan2_2).
Begin with the 5B example, install its specified files and nodes, and first run
it directly in ComfyUI. Export that working graph in API format, then follow the
same Oopsie Workflows → Generate → Jobs sequence.

Example brief: “A paper boat drifts across a quiet puddle; soft morning light,
slow camera movement, one continuous shot.” Keep the template's supported frame
counts and dimensions. Smaller dimensions do not remove model memory requirements.
The guide describes native offloading for the 5B model; actual worker capacity and
latency must be measured. CPU-only real video generation is not the recommended cheap test.
Remote reference-image uploads are not yet implemented by Oopsie's provider adapter.

## Runpod: cheapest serverless test first

Use a queue endpoint, not a permanently running Pod, for scale-to-zero tests.
The independent [CPU smoke worker instructions](../RUNPOD_SMOKE_TESTS/README.md#what-to-deploy-first)
include the smallest listed CPU class and a deployment sketch. That sketch has
not been deployed or verified; it is not a ready-made ComfyUI video worker.

| Setting | Synthetic test choice |
| --- | --- |
| Active/minimum workers | 0 |
| Maximum workers | 1 |
| Idle timeout | Shortest supported value; select explicitly |
| Execution timeout | 60 seconds for the synthetic handler |
| Network volume | None, unless your worker requires one |
| Hardware | CPU for transport; GPU sized to the real model |

Review the [current endpoint settings](https://docs.runpod.io/serverless/endpoints/endpoint-configurations)
and [billing rules](https://docs.runpod.io/serverless/pricing). Scale-to-zero stops
continuing compute charges after shutdown; startup and shutdown idle time can
still be billed. Storage can have separate charges. Estimate compute as your
quoted rate per second × total billed seconds, not only generation time. No paid
endpoint, live budget or API key was supplied for this session.

In Oopsie **Endpoints**, select Runpod, enter the endpoint ID and API key, then
save and test. Keys are stored in macOS Keychain. A direct ComfyUI HTTPS origin
belongs under ComfyUI, not in the Runpod endpoint-ID field.

**Worker compatibility is required:** Oopsie's native Runpod adapter submits
`{"input":{"workflow":{...}}}`. Its completion adapter requires durable HTTPS
artifact URLs. Inline/base64-only results and model-specific handlers need an
adapter; registering an endpoint does not make them compatible. R2 configuration
in Oopsie does not automatically configure uploads inside a Runpod worker.
Never automatically repeat a submission whose acknowledgement was lost: inspect
provider records and the saved job first.

## Cloudflare R2 without AWS CLI

Create a private bucket and a token scoped to that bucket in Cloudflare. In Oopsie
**Settings**, enter the account S3 endpoint, bucket, access key ID and secret.
Use region `auto`; save and test the saved connection. Credentials live in Keychain.
**Library** supports listing, folder creation, upload, download and deletion.
Current native uploads are limited to 32 MiB per file; multipart upload is not implemented.
See Cloudflare's [R2 S3 API documentation](https://developers.cloudflare.com/r2/api/s3/api/).

## Edit the result

Open the downloaded result in Finder, then use **Timeline → Add media** to import
it into an editor project. Position/trim clips, arrange tracks, adjust audio and
export MP4 with installed FFmpeg. The current editor has no CapCut-style effects,
transitions, auto-captions or animation keyframes. Job results are not automatically
inserted into a timeline.

## FLUX.3

A dedicated FLUX.3 adapter is not implemented. FLUX.3 Video uses the
[BFL hosted API](https://docs.bfl.ai/flux_3/flux3_video); ComfyUI and Runpod credentials
are not substitutes for a BFL API key. See the [proposed integration plan](FLUX3_INTEGRATION_PLAN.md).
No FLUX.3 request has been sent. Hosted video service pricing is separate from
Runpod GPU pricing. Other FLUX.3 family products require their own contracts.
