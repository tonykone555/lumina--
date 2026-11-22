# YNOT product videos — LTX-2.5 deployment and acceptance

## Verified repository wiring
- Opening `ProductDetailModalV2` mounts `ProductAiMotion`, and requests `/api/catalog/video/generate` with `source: "product"`.
- The Next.js API selects the product and de-duplicates jobs by product ID, source-image hash, provider, and model.
- The status endpoint polls Modal and persists the generated MP4 in the Supabase `product-media` bucket plus `ynot_product_media`.
- Existing photos remain displayed when the generator is unavailable or fails. The UI does not wait on inference.

## Worker upgrade
New worker: `services/video/modal_ltx25.py`.
Uses the **official LTX-2.5 22B distilled** image-to-video pipeline and H100 GPU. Does not invoke Wan, Kie, Higgsfield or a paid video-generation API.
Its app/function names match the existing YNOT TypeScript integration: `ynot-video-worker/generate_video`.
Default generation: source-image-conditioned 640×384, 49 frames, seed 42; product-category prompts are in `lib/catalog/hf-video.ts`.

## Modal steps (requires Modal credentials and model access)
1. From the YNOT repository, install the Modal CLI and authenticate via `modal setup`.
2. Accept any LTX-2.5 model access terms on Hugging Face; configure `HF_TOKEN` as needed for gated model files.
3. Run `modal run services/video/modal_ltx25.py::install_models` to populate the persistent `ynot-ltx25-models` volume (~66 GiB of files).
4. Run `modal run services/video/modal_ltx25.py::model_probe` and require `ready: true`.
5. Run `modal deploy services/video/modal_ltx25.py`.
6. Test `generate_video` against an actual product-image URL. A successful response must include `ok: true`, nonempty `video_base64`, `model: ltx-2.5-22b-distilled`. Inspect the resulting MP4 for product fidelity.

## Storefront environment
Only after the worker works, set production environment variables on the Vercel project that serves `ynotworld.app`:
- `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET` (server-only secrets)
- `MODAL_VIDEO_MODEL=ltx25` (explicit opt-in)
- Existing Supabase URL and server-side key, with `ynot_video_jobs` and `ynot_product_media` tables and writable `product-media` storage bucket

Redeploy the storefront after changing environment variables. When unconfigured, YNOT correctly remains photo-only; no legacy worker fallback is triggered.

## End-to-end acceptance (must pass before calling production-ready)
1. Open a lamp product: existing image loads immediately. One LTX-2.5 job is queued.
2. Confirm Modal job finishes and job row is `ready`; MP4 is saved with product and image hash.
3. Confirm video loops muted in the product gallery, and the same product reopened does not regenerate.
4. Open a product with a different image and verify distinct cache key/prompt.
5. Simulate a worker error and confirm product photo, checkout and navigation remain operational.
6. Check Modal GPU runtime/billing and enforce a spending cap before scaling.

**Current status:** repository code is prepared. A live Modal render has not been verified; do not enable the flag until worker deployment and model checks pass.
