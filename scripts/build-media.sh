#!/bin/bash
set -euo pipefail
# LGPL-only FFmpeg. Do not substitute Homebrew or Remotion's nonfree build.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/.oopsie/ffmpeg-7.1.1"
PREFIX="$ROOT/.oopsie/media"
mkdir -p "$ROOT/.oopsie/downloads" "$PREFIX"
if [ ! -f "$ROOT/.oopsie/downloads/ffmpeg-7.1.1.tar.xz" ]; then
  curl -fSL https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz -o "$ROOT/.oopsie/downloads/ffmpeg-7.1.1.tar.xz"
fi
echo '733984395e0dbbe5c046abda2dc49a5544e7e0e1e2366bba849222ae9e3a03b1  '"$ROOT/.oopsie/downloads/ffmpeg-7.1.1.tar.xz" | shasum -a 256 -c -
if [ ! -d "$BUILD" ]; then tar -xf "$ROOT/.oopsie/downloads/ffmpeg-7.1.1.tar.xz" -C "$ROOT/.oopsie"; fi
cd "$BUILD"
export MACOSX_DEPLOYMENT_TARGET=12.0
./configure --prefix="$PREFIX" --enable-shared --disable-static --disable-gpl --disable-nonfree --disable-version3 --disable-autodetect --enable-videotoolbox --enable-audiotoolbox --disable-doc --disable-ffplay --disable-debug > "$ROOT/.oopsie/media-configure.log" 2>&1
make -j8 > "$ROOT/.oopsie/media-build.log" 2>&1
make install > "$ROOT/.oopsie/media-install.log" 2>&1
