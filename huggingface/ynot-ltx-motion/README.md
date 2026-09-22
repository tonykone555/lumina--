---
title: YNOT Fast Product Motion
emoji: 🎬
colorFrom: gray
colorTo: black
sdk: gradio
sdk_version: 5.49.1
app_file: app.py
pinned: false
---

# YNOT Fast Product Motion

Gradio/ZeroGPU worker for short product image-to-video clips.

## Setup

1. Create a Hugging Face **Gradio** Space.
2. Copy `app.py` and `requirements.txt` from this folder into the Space repository.
3. In Space Settings, select **ZeroGPU** hardware.
4. Optionally set `LTX_MODEL_ID` if you want to test a different compatible distilled LTX checkpoint.
5. In YNOT's Vercel project, add:
   - `HUGGINGFACE_TOKEN`
   - `HUGGINGFACE_SPACE_URL` (the `https://...hf.space` URL)
   - `HUGGINGFACE_SPACE_API_NAME=generate`

YNOT submits jobs through Gradio's queue API. Finished videos are copied to the YNOT Supabase `product-media` bucket and then reused permanently for that product/source-image hash.

The feed keeps its instant lightweight motion fallback while ZeroGPU is queued or quota-limited.
