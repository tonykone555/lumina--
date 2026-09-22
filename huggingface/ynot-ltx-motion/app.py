import inspect
import os
import tempfile

import gradio as gr
import spaces
import torch
from diffusers import DiffusionPipeline
from diffusers.utils import export_to_video, load_image

MODEL_ID = os.getenv("LTX_MODEL_ID", "Lightricks/LTX-Video-0.9.7-distilled")

# ZeroGPU emulates CUDA during Space startup; keeping model initialization at module
# scope avoids paying the model-load cost for every product generation.
pipe = DiffusionPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16)
try:
    pipe.to("cuda")
except Exception:
    # Some Diffusers LTX variants prefer CPU offload helpers.
    if hasattr(pipe, "enable_model_cpu_offload"):
        pipe.enable_model_cpu_offload()


def _multiple_of_32(value: int, minimum: int = 256, maximum: int = 768) -> int:
    value = max(minimum, min(maximum, int(value)))
    return max(32, (value // 32) * 32)


def _frame_count(seconds: int) -> int:
    # LTX video lengths use 8k + 1 frames. For shopping tiles we intentionally
    # keep clips short to minimize ZeroGPU time.
    requested = max(2, min(4, int(seconds))) * 24
    return max(33, (requested // 8) * 8 + 1)


@spaces.GPU(duration=90)
def generate(image_url: str, prompt: str, duration: int = 3, width: int = 512, height: int = 640):
    if not image_url:
        raise gr.Error("Product image is required")

    image = load_image(image_url).convert("RGB")
    width = _multiple_of_32(width)
    height = _multiple_of_32(height)
    num_frames = _frame_count(duration)

    supported = inspect.signature(pipe.__call__).parameters
    kwargs = {
        "image": image,
        "prompt": prompt,
        "width": width,
        "height": height,
        "num_frames": num_frames,
    }
    # Distilled LTX checkpoints are designed for a very small denoising budget.
    if "num_inference_steps" in supported:
        kwargs["num_inference_steps"] = 8
    if "guidance_scale" in supported:
        kwargs["guidance_scale"] = 1.0
    if "decode_timestep" in supported:
        kwargs["decode_timestep"] = 0.05
    if "image_cond_noise_scale" in supported:
        kwargs["image_cond_noise_scale"] = 0.025

    output = pipe(**kwargs)
    frames = output.frames[0]

    target = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    target.close()
    export_to_video(frames, target.name, fps=24)
    return target.name


demo = gr.Interface(
    fn=generate,
    inputs=[
        gr.Textbox(label="Product image URL"),
        gr.Textbox(label="Motion prompt", lines=4),
        gr.Slider(2, 4, value=3, step=1, label="Seconds"),
        gr.Number(value=512, label="Width"),
        gr.Number(value=640, label="Height"),
    ],
    outputs=gr.Video(label="Generated product motion"),
    api_name="generate",
    title="YNOT Fast Product Motion",
    description="Short image-to-video product motion clips for the YNOT Deals feed.",
)

if __name__ == "__main__":
    demo.launch()
