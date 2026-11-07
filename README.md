# Oopsie Studio

A native macOS workspace for ComfyUI workflows, generated media, and timeline editing.
The interface uses the Oopsie purple palette and supplied loop/spark icons.

**[Official Oopsie setup guide](docs/SETUP.md)** · [Binary downloads and releases](docs/RELEASING.md) · [Implementation status](docs/REQUIREMENTS_STATUS.md) · [Русский](README.ru.md)

## Current desktop

- Tauri 2, React, and Rust; uses the macOS system webview.
- Local SQLite projects and job history; credentials in macOS Keychain.
- Import versioned ComfyUI API graphs, configure explicit input bindings, submit,
  inspect status, recover ambiguous submissions, and save artifacts locally.
- Direct ComfyUI and Runpod queue endpoints; each worker must match the documented contract.
- Private Cloudflare R2 browser and uploads through native signed HTTP. No AWS CLI.
- Basic multitrack timeline, clip positioning/duration, audio controls, and MP4 export
  through user-installed FFmpeg/ffprobe.
- Approximately 10 MiB arm64 application, without Node, node_modules, Chromium,
  a Next.js server, or bundled FFmpeg.

The timeline is an early editor, not CapCut feature parity. Transitions, effects,
automatic captions, and keyframe animation are not implemented. FLUX.3 does not
have a dedicated adapter yet. A registered endpoint does not imply model support.
Real Runpod inference and R2 round trips have not been validated in this build.

## Build on macOS Apple silicon

Install Node/npm, Rust, and Xcode Command Line Tools for development, then:

```sh
npm ci
npm run desktop:build
npm run desktop:audit
node scripts/smoke-desktop.mjs
```

The app is produced at `src-tauri/target/release/bundle/macos/Oopsie Studio.app`.
Build tools are not runtime requirements. This local build is ad-hoc signed and
not notarized. Media editing/export requires your own installed FFmpeg/ffprobe;
opening the app and configuring workflows does not.

```sh
npm run desktop:dev
npm run typecheck
npm run lint
npm test
cargo test --offline --manifest-path src-tauri/Cargo.toml
python3 -m unittest discover -s RUNPOD_SMOKE_TESTS -p 'test_*.py' -v
```

`npm run dev` retains the separate Next.js browser development target. Its Node
and Prisma dependencies remain in the source checkout, outside the installed app.

## Start without cloud spending

Follow the [setup guide](docs/SETUP.md) for local tests, the native workflow
contract, and Runpod scale-to-zero configuration. The independent
[smoke harness](RUNPOD_SMOKE_TESTS/README.md) requires only Python for local mocks.
No GPU endpoint or paid account is necessary for those tests.

## License and attribution

This project includes code derived from EnguiStudio and retains its
[existing noncommercial license](LICENSE.md). It is not MIT or Apache-2.0.
Commercial use or permissive redistribution requires upstream permission.
Original attribution is preserved in the license and [source manifest](docs/UPSTREAM_IMPORT_MANIFEST.md); the license
is also included in the desktop bundle. Third-party components retain their own terms.
