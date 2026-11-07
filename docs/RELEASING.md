# macOS binaries and tags

The [macOS desktop workflow](../.github/workflows/desktop.yml) builds an Apple silicon application on pushes to `main`, pull requests, manual runs, and version tags. Open GitHub → Actions → macOS desktop → a successful run → Artifacts to download `Oopsie-Studio-macOS-arm64`. Extract the artifact, then the application ZIP inside it.

Tags such as `v0.2.1` also publish the ZIP and SHA256SUMS.txt to [GitHub Releases](https://github.com/gubnota/oopsie_studio/releases). The tag must match package.json and tauri.conf.json. Keep Cargo.toml, Cargo.lock, and package-lock.json versions aligned. The workflow installs development tools, runs TypeScript/lint/frontend/Rust/Python checks, builds Tauri, verifies the bundle and native restart smoke test, then packages the signed app with `ditto`.

## Prepare a release locally

On macOS Apple silicon with Node 24+, Rust stable, Xcode Command Line Tools, and FFmpeg/ffprobe installed:

```sh
npm ci
npm run typecheck
npm run lint
npm test
cargo test --locked --manifest-path src-tauri/Cargo.toml
python3 -m unittest discover -s RUNPOD_SMOKE_TESTS -p 'test_*.py'
npm run desktop:build
npm run desktop:audit
node scripts/smoke-desktop.mjs
npm run desktop:package
```

Review the changes and release notes before committing. For version 0.2.1:

```sh
git switch main
git add <reviewed-files>
git commit -m "Add welcome workflows and native file imports"
git tag -a v0.2.1 -m "Oopsie Studio 0.2.1"
git push origin main
git push origin v0.2.1
```

The remote workflow requires Actions enabled and permission for GITHUB_TOKEN to create releases. No cloud endpoint keys, AWS CLI, Apple certificate, or paid generation is used. See GitHub's [runner architecture documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job) for the `macos-15` arm64 runner.

## Install and verify

```sh
cd release
shasum -a 256 -c SHA256SUMS.txt
ditto -x -k Oopsie-Studio-0.2.1-macOS-arm64.zip /tmp/oopsie-install
ditto "/tmp/oopsie-install/Oopsie Studio.app" "/Applications/Oopsie Studio.app"
codesign --verify --deep --strict "/Applications/Oopsie Studio.app"
open "/Applications/Oopsie Studio.app"
```

Quit an existing instance before replacing the app. Project data lives in the user's Application Support directory, outside the application bundle. The app is ad-hoc signed and not notarized. For a downloaded build, attempt opening it, then use System Settings → Privacy & Security → Open Anyway if macOS blocks the trusted download. Developer ID signing/notarization is a future release requirement. Build tools and installed FFmpeg are not shipped in the ZIP.
