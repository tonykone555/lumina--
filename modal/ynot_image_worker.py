from __future__ import annotations

import base64
import io
import os
import time
from pathlib import Path
from typing import Any

import modal

APP_NAME = "ynot-image-worker"
MODEL_ID = os.environ.get("YNOT_IMAGE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
MODEL_PATH = Path("/models")

app = modal.App(APP_NAME)
model_cache = modal.Volume.from_name("ynot-image-model-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .uv_pip_install(
        "accelerate>=1.6,<2",
        "diffusers>=0.35,<0.38",
        "huggingface-hub>=0.36,<1",
        "safetensors>=0.5,<1",
        "torch>=2.7,<3",
        "transformers>=4.51,<5",
        "pillow>=11,<12",
        "requests>=2.32,<3",
    )
    .env({"HF_HOME": str(MODEL_PATH), "HF_XET_HIGH_PERFORMANCE": "1"})
)


@app.cls(
    image=image,
    gpu="A10G",
    volumes={MODEL_PATH: model_cache},
    timeout=15 * 60,
    scaledown_window=10 * 60,
)
class YnotAdImageGenerator:
    @modal.enter()
    def load_model(self):
        import torch
        from diffusers import AutoPipelineForImage2Image, DPMSolverMultistepScheduler

        self.pipe = AutoPipelineForImage2Image.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16,
            variant="fp16",
            use_safetensors=True,
        )
        self.pipe.scheduler = DPMSolverMultistepScheduler.from_config(self.pipe.scheduler.config)
        self.pipe.enable_model_cpu_offload()
        if hasattr(self.pipe, "vae") and hasattr(self.pipe.vae, "enable_tiling"):
            self.pipe.vae.enable_tiling()

    def _source_image(self, url: str, width: int, height: int):
        import requests
        from PIL import Image, ImageOps

        response = requests.get(url, timeout=20)
        response.raise_for_status()
        source = Image.open(io.BytesIO(response.content)).convert("RGB")
        return ImageOps.pad(source, (width, height), method=Image.Resampling.LANCZOS, color=(245, 245, 245))

    @modal.method()
    def generate_batch(
        self,
        product_image_url: str,
        directions: list[dict[str, Any]],
        variants_per_direction: int = 4,
        width: int = 1024,
        height: int = 1280,
        strength: float = 0.72,
        steps: int = 22,
        guidance_scale: float = 6.5,
    ):
        import torch

        started = time.time()
        source = self._source_image(product_image_url, width, height)
        outputs: list[dict[str, Any]] = []
        variants_per_direction = max(1, min(int(variants_per_direction), 4))
        directions = list(directions or [])[:5]
        negative_common = (
            "competitor logo, copied advertisement, watermark, UI chrome, unreadable text, misspelled label, "
            "distorted product, changed bottle shape, altered product colors, duplicate product, floating object, "
            "deformed hands, extra fingers, low resolution, blurry, oversaturated, clutter"
        )

        for d_index, direction in enumerate(directions):
            direction_id = str(direction.get("direction_id") or f"dir_{d_index + 1:02d}")
            prompt = str(direction.get("prompt") or "Premium paid-social product advertisement")
            custom_negative = ", ".join(str(x) for x in (direction.get("negative_prompt") or []))
            negative = negative_common + (", " + custom_negative if custom_negative else "")
            for v_index in range(variants_per_direction):
                seed = int(time.time() * 1000) % 2_000_000_000 + d_index * 101 + v_index
                generator = torch.Generator(device="cpu").manual_seed(seed)
                result = self.pipe(
                    prompt=prompt,
                    negative_prompt=negative,
                    image=source,
                    strength=strength,
                    num_inference_steps=steps,
                    guidance_scale=guidance_scale,
                    generator=generator,
                    width=width,
                    height=height,
                ).images[0]
                buf = io.BytesIO()
                result.save(buf, format="JPEG", quality=90, optimize=True)
                outputs.append({
                    "direction_id": direction_id,
                    "variant_index": v_index + 1,
                    "seed": seed,
                    "image_base64": base64.b64encode(buf.getvalue()).decode("ascii"),
                    "content_type": "image/jpeg",
                    "prompt": prompt,
                })

        return {
            "ok": True,
            "model": MODEL_ID,
            "gpu": "A10G",
            "width": width,
            "height": height,
            "variants": outputs,
            "generation_seconds": round(time.time() - started, 3),
        }


@app.function(image=modal.Image.debian_slim(python_version="3.12"))
def generate_ad_variants(
    product_image_url: str,
    directions: list[dict[str, Any]],
    variants_per_direction: int = 4,
    width: int = 1024,
    height: int = 1280,
):
    """YNOT Growth entrypoint: generate original product-led ad stills from Gemini creative directions."""
    return YnotAdImageGenerator().generate_batch.remote(
        product_image_url=product_image_url,
        directions=directions,
        variants_per_direction=variants_per_direction,
        width=width,
        height=height,
    )
