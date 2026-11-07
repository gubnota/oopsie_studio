"""Synthetic PNG worker: no torch, CUDA, weights, ComfyUI, or FFmpeg required.

Deployment requires the separately installed Runpod SDK; local tests do not.
This validates transport only. It does not establish diffusion compatibility.
"""
import base64
import struct
import time
import zlib


def png(width, height):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    pixels = (b"\x00" + b"\x8b\x5c\xf6" * width) * height
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b""))


def handler(job):
    values = job["input"]
    width, height = int(values.get("width", 32)), int(values.get("height", 32))
    delay = float(values.get("delaySeconds", 0))
    if not 1 <= width <= 64 or not 1 <= height <= 64 or not 0 <= delay <= 30:
        raise ValueError("Smoke worker supports dimensions 1..64 and delay 0..30 seconds")
    time.sleep(delay)
    if values.get("fail"):
        raise ValueError("Deliberate smoke-test failure")
    return {"images": [{"filename": "smoke.png", "type": "base64",
                        "data": base64.b64encode(png(width, height)).decode()}]}


if __name__ == "__main__":
    import runpod
    runpod.serverless.start({"handler": handler})
