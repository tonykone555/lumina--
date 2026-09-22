from __future__ import annotations

import base64
import os
import tempfile
import time
from pathlib import Path

import modal

# Modal-deployed YNOT product video worker
# Credentials-ready deployment trigger
APP_NAME = "ynot-video-worker"
MODEL_ID = os.environ.get("YNOT_MODAL_MODEL", "Lightricks/LTX-Video")
STUDIO_MODEL_ID = os.environ.get("YNOT_STUDIO_MODAL_MODEL", "Wan-AI/Wan2.2-TI2V-5B-Diffusers")

app = modal.App(APP_NAME)

model_cache = modal.Volume.from_name("ynot-ltx-model-cache", create_if_missing=True)
studio_model_cache = modal.Volume.from_name("ynot-wan22-studio-cache", create_if_missing=True)
MODEL_PATH = Path("/models")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .uv_pip_install(
        "accelerate==1.6.0",
        "diffusers==0.33.1",
        "huggingface-hub==0.36.0",
        "imageio==2.37.0",
        "imageio-ffmpeg==0.5.1",
        "sentencepiece==0.2.0",
        "torch==2.7.0",
        "transformers==4.51.3",
        "pillow==11.3.0",
    )
    .env({"HF_HOME": str(MODEL_PATH), "HF_XET_HIGH_PERFORMANCE": "1"})
)


@app.cls(
    image=image,
    gpu="L4",
    volumes={MODEL_PATH: model_cache},
    timeout=10 * 60,
    scaledown_window=5 * 60,
)
class LTXProductVideo:
    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import DiffusionPipeline

        self.pipe = DiffusionPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.bfloat16,
        )
        self.pipe.to("cuda")
        if hasattr(self.pipe, "vae") and hasattr(self.pipe.vae, "enable_tiling"):
            self.pipe.vae.enable_tiling()

    @modal.method()
    def generate(
        self,
        image_url: str,
        prompt: str,
        product_id: str,
        width: int = 512,
        height: int = 320,
        num_frames: int = 25,
        fps: int = 12,
        num_inference_steps: int = 12,
        guidance_scale: float = 2.5,
    ):
        from diffusers.utils import export_to_video, load_image

        started = time.time()
        source = load_image(image_url)
        negative = (
            "worst quality, blurry, jittery, warped product, changed logo, changed text, "
            "duplicate product, deformed object, unstable geometry, camera cuts"
        )

        frames = self.pipe(
            image=source,
            prompt=prompt,
            negative_prompt=negative,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            num_frames=num_frames,
            width=width,
            height=height,
        ).frames[0]

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ynot-product.mp4"
            export_to_video(frames, path, fps=fps)
            payload = base64.b64encode(path.read_bytes()).decode("ascii")

        return {
            "ok": True,
            "product_id": product_id,
            "video_base64": payload,
            "content_type": "video/mp4",
            "model": MODEL_ID,
            "gpu": "L4",
            "width": width,
            "height": height,
            "num_frames": num_frames,
            "fps": fps,
            "generation_seconds": round(time.time() - started, 3),
        }


@app.function(image=modal.Image.debian_slim(python_version="3.12"))
def generate_video(
    image_url: str,
    prompt: str,
    product_id: str,
    width: int = 512,
    height: int = 320,
    num_frames: int = 25,
):
    """Async-friendly entrypoint used by the YNOT Vercel backend."""
    return LTXProductVideo().generate.remote(
        image_url=image_url,
        prompt=prompt,
        product_id=product_id,
        width=width,
        height=height,
        num_frames=num_frames,
    )


studio_image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .uv_pip_install(
        "accelerate>=1.6,<2",
        "diffusers>=0.35,<0.38",
        "huggingface-hub>=0.36,<1",
        "imageio>=2.37,<3",
        "imageio-ffmpeg>=0.5,<1",
        "sentencepiece>=0.2,<1",
        "torch>=2.7,<3",
        "transformers>=4.51,<5",
        "pillow>=11,<12",
    )
    .env({"HF_HOME": str(MODEL_PATH), "HF_XET_HIGH_PERFORMANCE": "1"})
)


@app.cls(
    image=studio_image,
    gpu="A100-80GB",
    volumes={MODEL_PATH: studio_model_cache},
    timeout=15 * 60,
    scaledown_window=5 * 60,
)
class WanStudioVideo:
    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import WanImageToVideoPipeline

        self.pipe = WanImageToVideoPipeline.from_pretrained(
            STUDIO_MODEL_ID,
            torch_dtype=torch.bfloat16,
        )
        if hasattr(self.pipe, "vae"):
            self.pipe.vae.to(dtype=torch.float32)
            if hasattr(self.pipe.vae, "enable_tiling"):
                self.pipe.vae.enable_tiling()
        self.pipe.to("cuda")

    @modal.method()
    def generate(
        self,
        image_url: str,
        prompt: str,
        width: int = 480,
        height: int = 832,
        num_frames: int = 49,
        fps: int = 16,
        num_inference_steps: int = 28,
        guidance_scale: float = 5.0,
    ):
        from diffusers.utils import export_to_video, load_image

        started = time.time()
        source = load_image(image_url).convert("RGB").resize((width, height))
        negative = (
            "low quality, blurry, jitter, flicker, warped face, deformed hands, "
            "changed product, changed logo, changed text, duplicate objects, unstable geometry"
        )
        frames = self.pipe(
            image=source,
            prompt=prompt,
            negative_prompt=negative,
            width=width,
            height=height,
            num_frames=num_frames,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
        ).frames[0]

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ynot-studio.mp4"
            export_to_video(frames, path, fps=fps)
            payload = base64.b64encode(path.read_bytes()).decode("ascii")

        return {
            "ok": True,
            "video_base64": payload,
            "content_type": "video/mp4",
            "model": STUDIO_MODEL_ID,
            "gpu": "A100-80GB",
            "width": width,
            "height": height,
            "num_frames": num_frames,
            "fps": fps,
            "generation_seconds": round(time.time() - started, 3),
        }


@app.function(image=modal.Image.debian_slim(python_version="3.12"))
def generate_studio_video(
    image_url: str,
    prompt: str,
    width: int = 480,
    height: int = 832,
    num_frames: int = 49,
):
    """High-quality Creator Studio image-to-video entrypoint. Wan I2V deployment revision 2."""
    return WanStudioVideo().generate.remote(
        image_url=image_url,
        prompt=prompt,
        width=width,
        height=height,
        num_frames=num_frames,
    )
