import json
import os
import uuid
from pathlib import Path

import modal
from fastapi import HTTPException, Request
from fastapi.responses import FileResponse

APP_NAME = "ynot-room"
VOLUME_PATH = Path("/ynot-room")
MODEL_PATH = Path("/models")
MODEL_ID = "Ruicheng/moge-2-vits-normal"
PUBLIC_SCENE_ENDPOINT = "https://tonykone555--ynot-room-room-scene.modal.run"
MAX_PHOTOS = 8
MAX_TOTAL_BYTES = 14 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

web_image = modal.Image.debian_slim(python_version="3.12").uv_pip_install("fastapi[standard]")
reconstruction_image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .uv_pip_install(
        "pillow",
        "numpy",
        "trimesh",
        "opencv-python-headless",
        "torch",
        "torchvision",
        "huggingface_hub",
        "git+https://github.com/microsoft/MoGe.git",
    )
    .env({"HF_HOME": str(MODEL_PATH)})
)

app = modal.App(APP_NAME)
volume = modal.Volume.from_name("ynot-room-jobs", create_if_missing=True)
model_cache = modal.Volume.from_name("ynot-room-model-cache", create_if_missing=True)


def _job_dir(job_id: str) -> Path:
    return VOLUME_PATH / "jobs" / job_id


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _authorize(request: Request) -> None:
    expected_token = os.environ.get("YNOT_ROOM_TOKEN", "").strip()
    if expected_token:
        authorization = request.headers.get("authorization", "")
        if authorization != f"Bearer {expected_token}":
            raise HTTPException(status_code=401, detail="Unauthorized")


def _safe_id(value: str) -> str:
    return "".join(ch for ch in value if ch.isalnum() or ch in "-_")[:80]


def _build_colored_glb(points, mask, image_rgb, output_path: Path) -> dict:
    import numpy as np
    import trimesh

    height, width = mask.shape
    stride = max(1, int(max(height, width) / 360))
    points_small = points[::stride, ::stride].astype(np.float32)
    mask_small = mask[::stride, ::stride].astype(bool)
    image_small = image_rgb[::stride, ::stride]

    valid = mask_small & np.isfinite(points_small).all(axis=-1) & (points_small[..., 2] > 0)
    h, w = valid.shape
    index = np.full((h, w), -1, dtype=np.int32)
    index[valid] = np.arange(int(valid.sum()), dtype=np.int32)

    vertices = points_small[valid].copy()
    vertices *= np.array([1.0, -1.0, -1.0], dtype=np.float32)
    colors = image_small[valid].astype(np.uint8)
    alpha = np.full((len(colors), 1), 255, dtype=np.uint8)
    vertex_colors = np.concatenate([colors, alpha], axis=1)

    faces = []
    source_depth = points_small[..., 2]
    for y in range(h - 1):
        for x in range(w - 1):
            cell = [(y, x), (y, x + 1), (y + 1, x), (y + 1, x + 1)]
            if not all(valid[yy, xx] for yy, xx in cell):
                continue
            depths = np.array([source_depth[yy, xx] for yy, xx in cell], dtype=np.float32)
            mean_depth = float(np.mean(depths))
            if mean_depth <= 0 or float(np.max(depths) - np.min(depths)) / mean_depth > 0.12:
                continue
            a = int(index[y, x])
            b = int(index[y, x + 1])
            c = int(index[y + 1, x])
            d = int(index[y + 1, x + 1])
            faces.append((a, c, b))
            faces.append((b, c, d))

    if len(vertices) < 250 or len(faces) < 250:
        raise RuntimeError("Reconstruction did not produce enough valid room geometry")

    mesh = trimesh.Trimesh(
        vertices=vertices,
        faces=np.asarray(faces, dtype=np.int32),
        vertex_colors=vertex_colors,
        process=False,
    )
    center = mesh.bounds.mean(axis=0)
    mesh.apply_translation(-center)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(output_path, file_type="glb")
    return {
        "vertices": int(len(vertices)),
        "faces": int(len(faces)),
        "stride": int(stride),
        "bytes": int(output_path.stat().st_size),
    }


@app.function(
    image=reconstruction_image,
    gpu="A10G",
    memory=16384,
    timeout=1800,
    scaledown_window=600,
    volumes={str(VOLUME_PATH): volume, str(MODEL_PATH): model_cache},
)
def process_room(job_id: str, metadata: dict) -> dict:
    """Create a browser-loadable GLB seed from the strongest uploaded room view."""
    import numpy as np
    import torch
    from PIL import Image, ImageOps
    from moge.model import import_model_class_by_version

    volume.reload()
    job_dir = _job_dir(job_id)
    status_path = job_dir / "status.json"
    _write_json(status_path, {
        "id": job_id,
        "status": "processing",
        "stage": "reconstructing",
        "message": "YNOT Room is reconstructing the first 3D room surface on the GPU.",
    })
    volume.commit()

    photo_dir = job_dir / "photos"
    photos = sorted(path for path in photo_dir.iterdir() if path.is_file())
    inspection = []

    try:
        for path in photos:
            with Image.open(path) as source:
                image_obj = ImageOps.exif_transpose(source)
                inspection.append({
                    "name": path.name,
                    "width": image_obj.width,
                    "height": image_obj.height,
                    "mode": image_obj.mode,
                    "format": source.format,
                })

        seed_path = max(photos, key=lambda p: p.stat().st_size)
        with Image.open(seed_path) as source:
            pil_image = ImageOps.exif_transpose(source).convert("RGB")
            max_edge = max(pil_image.size)
            if max_edge > 960:
                scale = 960 / max_edge
                pil_image = pil_image.resize(
                    (max(1, round(pil_image.width * scale)), max(1, round(pil_image.height * scale))),
                    Image.Resampling.LANCZOS,
                )
            image_np = np.asarray(pil_image)

        model_class = import_model_class_by_version("v2")
        model = model_class.from_pretrained(MODEL_ID).cuda().eval()
        image_tensor = torch.tensor(image_np, dtype=torch.float16, device="cuda").permute(2, 0, 1) / 255
        with torch.inference_mode():
            output = model.infer(image_tensor, resolution_level=5, use_fp16=True, apply_mask=True)

        points = output["points"].float().cpu().numpy()
        mask = output["mask"].cpu().numpy().astype(bool)
        intrinsics = output["intrinsics"].float().cpu().numpy()
        scene_path = job_dir / "scene.glb"
        mesh_info = _build_colored_glb(points, mask, image_np, scene_path)

        scene_url = f"{PUBLIC_SCENE_ENDPOINT}?id={job_id}"
        manifest = {
            "version": 2,
            "id": job_id,
            "input": metadata,
            "photos": inspection,
            "compute": {"provider": "modal", "gpu": "A10G"},
            "reconstruction": {
                "model": MODEL_ID,
                "method": "moge2_monocular_seed",
                "sourceView": seed_path.name,
                "intrinsics": intrinsics.tolist(),
                "mesh": mesh_info,
            },
            "pipeline": {
                "preflight": "complete",
                "monocularReconstruction": "complete",
                "glbExport": "complete",
                "multiViewAlignment": "pending",
                "catalogueObjectMapping": "pending",
            },
        }
        _write_json(job_dir / "manifest.json", manifest)
        result = {
            "id": job_id,
            "status": "ready",
            "stage": "scene_ready",
            "message": "Your first 3D room reconstruction is ready to explore.",
            "photoCount": len(inspection),
            "sceneUrl": scene_url,
            "reconstruction": "moge2_monocular_seed",
            "mesh": mesh_info,
        }
        _write_json(status_path, result)
        volume.commit()
        return result
    except Exception as exc:
        failure = {
            "id": job_id,
            "status": "failed",
            "stage": "reconstructing",
            "message": "Room reconstruction failed.",
            "detail": str(exc)[:800],
        }
        _write_json(status_path, failure)
        volume.commit()
        raise


@app.function(
    image=web_image,
    memory=2048,
    timeout=60,
    volumes={str(VOLUME_PATH): volume},
)
@modal.fastapi_endpoint(method="POST")
async def submit_room(request: Request):
    _authorize(request)
    form = await request.form()
    photos = form.getlist("photos")
    if len(photos) < 3:
        raise HTTPException(status_code=400, detail="At least 3 room photos are required")
    if len(photos) > MAX_PHOTOS:
        raise HTTPException(status_code=400, detail=f"At most {MAX_PHOTOS} room photos are supported")

    request_id = str(form.get("requestId") or uuid.uuid4())
    safe_id = _safe_id(request_id) or str(uuid.uuid4())
    job_dir = _job_dir(safe_id)
    photo_dir = job_dir / "photos"
    photo_dir.mkdir(parents=True, exist_ok=True)

    total_bytes = 0
    saved = []
    for index, upload in enumerate(photos, start=1):
        content_type = str(getattr(upload, "content_type", "") or "")
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=415, detail=f"Unsupported image type: {content_type or 'unknown'}")
        raw = await upload.read()
        total_bytes += len(raw)
        if total_bytes > MAX_TOTAL_BYTES:
            raise HTTPException(status_code=413, detail="Room upload is too large")
        suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[content_type]
        filename = f"view-{index:02d}{suffix}"
        (photo_dir / filename).write_bytes(raw)
        saved.append(filename)

    metadata = {
        "requestId": safe_id,
        "source": str(form.get("source") or "ynot-room-web")[:80],
        "style": str(form.get("style") or "modern")[:40],
        "roomType": str(form.get("roomType") or "living_room")[:40],
        "budget": str(form.get("budget") or "")[:12],
        "photos": saved,
    }
    _write_json(job_dir / "request.json", metadata)
    _write_json(job_dir / "status.json", {
        "id": safe_id,
        "status": "queued",
        "stage": "accepted",
        "message": "Room job accepted by Modal.",
    })
    volume.commit()

    call = process_room.spawn(safe_id, metadata)
    _write_json(job_dir / "call.json", {"functionCallId": call.object_id})
    volume.commit()

    return {
        "id": safe_id,
        "status": "queued",
        "stage": "accepted",
        "message": "Your room was accepted by the YNOT Modal worker.",
    }


@app.function(
    image=web_image,
    memory=1024,
    timeout=30,
    volumes={str(VOLUME_PATH): volume},
)
@modal.fastapi_endpoint(method="GET")
def room_status(request: Request, id: str):
    _authorize(request)
    safe_id = _safe_id(id)
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing job id")
    volume.reload()
    status_path = _job_dir(safe_id) / "status.json"
    if not status_path.exists():
        raise HTTPException(status_code=404, detail="Room job not found")
    return json.loads(status_path.read_text(encoding="utf-8"))


@app.function(
    image=web_image,
    memory=1024,
    timeout=30,
    volumes={str(VOLUME_PATH): volume},
)
@modal.fastapi_endpoint(method="GET")
def room_scene(id: str):
    safe_id = _safe_id(id)
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing job id")
    volume.reload()
    scene_path = _job_dir(safe_id) / "scene.glb"
    if not scene_path.exists():
        raise HTTPException(status_code=404, detail="Room scene not found")
    return FileResponse(
        scene_path,
        media_type="model/gltf-binary",
        filename=f"ynot-room-{safe_id}.glb",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
