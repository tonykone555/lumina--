"""YNOT product image-to-video: Modal worker using the official LTX-2.5 distilled pipeline.

Deploy explicitly with: modal deploy services/video/modal_ltx25.py
Warm models with:    modal run services/video/modal_ltx25.py::install_models
The storefront only calls this app after MODAL_VIDEO_MODEL=ltx25 is configured.
No Kie/Higgsfield/Wan credits or APIs are used.
"""
from __future__ import annotations
import base64
import io
import ipaddress
import os
import socket
import subprocess
import tempfile
import time
from pathlib import Path
from urllib.parse import urlparse

import modal

app = modal.App("ynot-video-worker")
models = modal.Volume.from_name("ynot-ltx25-models", create_if_missing=True)
model_repo = "Lightricks/LTX-2.5"
files = [
    "diffusion_models/ltx-2.5-22b-distilled-transformer-bf16.safetensors",
    "text_encoders/gemma4-12b-with-proj-ltx-2.5-bf16.safetensors",
    "vae/ltx-2.5-video-vae-bf16.safetensors",
    "vae/ltx-2.5-audio-vae-bf16.safetensors",
    "latent_upscale_models/ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors",
]
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "ffmpeg")
    .pip_install("uv", "huggingface_hub", "pillow", "httpx")
    .run_commands(
        "git clone --depth 1 https://github.com/Lightricks/LTX-2.git /opt/LTX-2",
        "cd /opt/LTX-2 && uv sync --frozen",
    )
)

def _download_models():
    from huggingface_hub import hf_hub_download
    for name in files:
        target = Path("/models") / name
        if not target.is_file() or target.stat().st_size == 0:
            hf_hub_download(repo_id=model_repo, filename=name, local_dir="/models")
    models.commit()

@app.function(image=image, volumes={"/models": models}, timeout=60*60)
def install_models():
    """Downloads ~66 GiB once to persistent volume. May require HF model access."""
    _download_models()
    return {"ready": True, "model": "LTX-2.5", "files": len(files)}

@app.function(image=image, volumes={"/models": models}, timeout=60)
def model_probe():
    return {"model": "LTX-2.5", "ready": all((Path("/models")/name).is_file() for name in files)}

def _safe_image(image_url: str) -> bytes:
    import httpx
    parsed = urlparse(image_url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("IMAGE_REQUIRES_HTTPS")
    # Prevent server-side requests into internal networks and cloud metadata.
    addresses = socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(x[4][0]).is_global for x in addresses):
        raise ValueError("IMAGE_HOST_NOT_PUBLIC")
    with httpx.Client(timeout=30, follow_redirects=False) as client:
        r = client.get(image_url)
        r.raise_for_status()
        if r.status_code in (301,302,303,307,308):
            raise ValueError("IMAGE_REDIRECT_REJECTED")
        if not r.headers.get("content-type","").lower().startswith("image/"):
            raise ValueError("IMAGE_TYPE_INVALID")
        if len(r.content) > 12*1024*1024:
            raise ValueError("IMAGE_TOO_LARGE")
        return r.content

@app.function(
    image=image,
    gpu="H100",
    volumes={"/models": models},
    timeout=60*35,
    scaledown_window=30,
    max_containers=1,
)
def generate_video(
    image_url: str,
    prompt: str,
    product_id: str,
    width: int=640,
    height: int=384,
    num_frames: int=49,
):
    """Returns the exact shape used by YNOT's Modal TS client."""
    started = time.monotonic()
    try:
        models.reload()
        missing = [p for p in files if not (Path("/models")/p).is_file()]
        if missing:
            return {"ok": False, "error": "LTX25_MODELS_NOT_INSTALLED: "+", ".join(missing)}
        if not (isinstance(width,int) and isinstance(height,int) and
                384 <= width <= 768 and 384 <= height <= 768 and
                width % 32 == 0 and height % 32 == 0 and
                isinstance(num_frames,int) and 17 <= num_frames <= 97 and
                (num_frames-1) % 8 == 0):
            return {"ok": False, "error": "LTX25_INVALID_DIMENSIONS"}
        from PIL import Image, ImageOps
        source = Image.open(io.BytesIO(_safe_image(image_url))).convert("RGB")
        with tempfile.TemporaryDirectory() as temp:
            reference = Path(temp)/"reference.png"
            # Letterbox, never crop the merchandise or change its proportions.
            ImageOps.pad(source, (width,height), color=(245,245,245)).save(reference)
            destination = Path(temp)/"result.mp4"
            command = [
                "/opt/LTX-2/.venv/bin/python", "-m", "ltx_pipelines.distilled",
                "--transformer-path", "/models/"+files[0],
                "--text-encoder-path", "/models/"+files[1],
                "--video-vae-path", "/models/"+files[2],
                "--audio-vae-path", "/models/"+files[3],
                "--spatial-upsampler-path", "/models/"+files[4],
                "--prompt", str(prompt)[:1500],
                "--image", str(reference), "0", "1.0",
                "--width", str(width), "--height", str(height),
                "--num-frames", str(num_frames),
                "--seed", "42",
                "--quantization", "fp8-cast",
                "--output-path", str(destination),
            ]
            result = subprocess.run(command,cwd="/opt/LTX-2",capture_output=True,text=True,timeout=60*30)
            if result.returncode != 0:
                return {"ok":False,"error":"LTX25_RENDER_FAILED: "+result.stderr[-1800:]}
            if not destination.exists() or destination.stat().st_size < 1000:
                return {"ok":False,"error":"LTX25_OUTPUT_MISSING"}
            if destination.stat().st_size > 48*1024*1024:
                return {"ok":False,"error":"LTX25_OUTPUT_TOO_LARGE"}
            return {
                "ok":True,
                "video_base64":base64.b64encode(destination.read_bytes()).decode("ascii"),
                "content_type":"video/mp4",
                "model":"ltx-2.5-22b-distilled",
                "gpu":"H100",
                "generation_seconds":round(time.monotonic()-started,2),
            }
    except Exception as exc:
        return {"ok":False,"error":f"LTX25_WORKER_ERROR: {type(exc).__name__}: {exc}"}
