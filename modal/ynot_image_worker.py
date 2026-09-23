from __future__ import annotations

import base64
import io
import os
import time
from pathlib import Path
from typing import Any

import modal

APP_NAME = "ynot-image-worker"
MODEL_ID = os.environ.get("YNOT_IMAGE_MODEL", "black-forest-labs/FLUX.2-klein-4B")
MODEL_PATH = Path("/models")

app = modal.App(APP_NAME)
model_cache = modal.Volume.from_name("ynot-image-model-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .uv_pip_install(
        "accelerate>=1.10,<2",
        "huggingface-hub>=0.36,<2",
        "safetensors>=0.5,<1",
        "torch>=2.7,<3",
        "transformers>=4.55,<5",
        "pillow>=11,<12",
        "requests>=2.32,<3",
        "sentencepiece>=0.2,<1",
    )
    .run_commands("pip install -U git+https://github.com/huggingface/diffusers.git")
    .env({"HF_HOME": str(MODEL_PATH), "HF_XET_HIGH_PERFORMANCE": "1"})
)

VARIANT_LENSES = [
    "Create a clean hero composition with deliberate negative space and a premium commercial-photography camera angle.",
    "Create a candid lifestyle composition in a believable real-world setting, changing camera distance, crop, lighting and staging from the other variants.",
    "Create a direct-response social ad composition with a strong visual hook, a different environment, and clear product interaction or benefit demonstration.",
    "Create an editorial product-story composition with a distinctly different scene, perspective, lighting direction, props and subject placement.",
]


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
        from diffusers import Flux2KleinPipeline

        self.pipe = Flux2KleinPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.bfloat16,
        )
        self.pipe.enable_model_cpu_offload()
        if hasattr(self.pipe, "vae") and hasattr(self.pipe.vae, "enable_tiling"):
            self.pipe.vae.enable_tiling()

    def _reference_image(self, url: str):
        import requests
        from PIL import Image

        response = requests.get(url, timeout=25)
        response.raise_for_status()
        return Image.open(io.BytesIO(response.content)).convert("RGB")

    @modal.method()
    def generate_batch(
        self,
        product_image_url: str,
        directions: list[dict[str, Any]],
        variants_per_direction: int = 4,
        width: int = 1024,
        height: int = 1280,
        steps: int = 8,
        guidance_scale: float = 1.0,
    ):
        import torch

        started = time.time()
        reference = self._reference_image(product_image_url)
        outputs: list[dict[str, Any]] = []
        variants_per_direction = max(1, min(int(variants_per_direction), 4))
        directions = list(directions or [])[:5]

        for d_index, direction in enumerate(directions):
            direction_id = str(direction.get("direction_id") or f"dir_{d_index + 1:02d}")
            base_prompt = str(direction.get("prompt") or "Premium paid-social product advertisement")
            human_use = bool(direction.get("human_use")) or str(direction.get("scene_type") or "").lower() in {"human", "lifestyle", "ugc", "demonstration"}
            for v_index in range(variants_per_direction):
                seed = (int(time.time() * 1000) + d_index * 10007 + v_index * 997) % 2_000_000_000
                generator = torch.Generator(device="cpu").manual_seed(seed)
                diversity = VARIANT_LENSES[v_index % len(VARIANT_LENSES)]
                human_instruction = (
                    " Include a photorealistic adult person naturally USING, WEARING, HOLDING or INTERACTING with the referenced product in the physically correct way for that product category; the product must be clearly visible."
                    if human_use else
                    " Do not add a person unless the concept explicitly calls for one."
                )
                prompt = (
                    f"{base_prompt}\n\n{diversity}{human_instruction}\n"
                    "REFERENCE RULE: the supplied reference image is the exact YNOT product. Preserve its real product identity, silhouette, proportions, materials, colors, packaging, logo and label details as faithfully as possible. Use it as a reference object, not as the canvas to repaint. Do not redesign, morph, recolor, relabel or blur the product. Build a NEW scene around the product. No competitor branding. Avoid near-duplicate compositions from other variants."
                )
                result = self.pipe(
                    prompt=prompt,
                    image=reference,
                    num_inference_steps=max(4, min(int(steps), 16)),
                    guidance_scale=float(guidance_scale),
                    generator=generator,
                    width=width,
                    height=height,
                ).images[0]
                buf = io.BytesIO()
                result.save(buf, format="PNG", optimize=True)
                outputs.append({
                    "direction_id": direction_id,
                    "variant_index": v_index + 1,
                    "seed": seed,
                    "image_base64": base64.b64encode(buf.getvalue()).decode("ascii"),
                    "content_type": "image/png",
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
