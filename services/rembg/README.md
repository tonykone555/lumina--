# YNOT rembg service

Free/open-source background removal for the Saved notebook product bubbles.

## Run locally

```bash
docker build -t ynot-rembg .
docker run --rm -p 7000:80 ynot-rembg
```

Health check:

```bash
curl http://localhost:7000/health
```

The Next.js app calls `POST /remove` with a multipart image file and receives a transparent PNG.

## Connect Lumina / YNOT

When deploying the repository with **Vercel Services**, the `app` service receives `REMBG_INTERNAL_URL` automatically through its service binding. **Do not create or override this variable manually.** The `rembg` service remains internal, with no public rewrite.\n\nFor a separate Docker deployment outside Vercel Services, set this environment variable on the web app deployment:

```text
REMBG_SERVICE_URL=https://your-rembg-service.example.com
```

No remove.bg key is required. If neither `REMBG_INTERNAL_URL` nor `REMBG_SERVICE_URL` is available, or the cutout service is temporarily unavailable, `/api/cutout` falls back to the original product image so Saved never breaks.

## Hosting

Deploy this folder as a small Docker service on any host that supports containers. The service runs CPU-only with `onnxruntime`; one worker is intentional to avoid multiple model copies consuming memory.

The first request may be slower while the rembg model is initialized/downloaded. Keep the model/cache volume persistent where your host supports it for faster cold starts.
