import json
import os
import uuid
from pathlib import Path

import modal

APP_NAME = "ynot-room"
VOLUME_PATH = Path("/ynot-room")
MAX_PHOTOS = 8
MAX_TOTAL_BYTES = 14 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

image = (
    modal.Image.debian_slim(python_version="3.11")
    .uv_pip_install("fastapi[standard]", "pillow")
)

app = modal.App(APP_NAME, image=image)
volume = modal.Volume.from_name("ynot-room-jobs", create_if_missing=True)


def _job_dir(job_id: str) -> Path:
    return VOLUME_PATH / "jobs" / job_id


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


@app.function(
    gpu="A10G",
    memory=16384,
    timeout=1800,
    volumes={str(VOLUME_PATH): volume},
)
def process_room(job_id: str, metadata: dict) -> dict:
    """GPU-backed first stage for YNOT Room.

    Today this validates the staged images, records the GPU allocation and writes a
    reconstruction manifest. The next stage plugs the chosen reconstruction model
    and Unreal/GLB exporter into this same function without changing the web API.
    """
    from PIL import Image, ImageOps

    volume.reload()
    job_dir = _job_dir(job_id)
    status_path = job_dir / "status.json"
    _write_json(
        status_path,
        {
            "id": job_id,
            "status": "processing",
            "stage": "gpu_preflight",
            "message": "YNOT Room is validating the uploaded viewpoints on a GPU worker.",
        },
    )
    volume.commit()

    photo_dir = job_dir / "photos"
    photos = sorted(path for path in photo_dir.iterdir() if path.is_file())
    inspection = []

    try:
        for path in photos:
            with Image.open(path) as source:
                image_obj = ImageOps.exif_transpose(source)
                inspection.append(
                    {
                        "name": path.name,
                        "width": image_obj.width,
                        "height": image_obj.height,
                        "mode": image_obj.mode,
                        "format": source.format,
                    }
                )

        gpu_name = os.environ.get("MODAL_GPU_TYPE", "A10G")
        manifest = {
            "version": 1,
            "id": job_id,
            "input": metadata,
            "photos": inspection,
            "compute": {"provider": "modal", "gpu": gpu_name},
            "pipeline": {
                "preflight": "complete",
                "reconstruction": "pending",
                "unrealAssembly": "pending",
                "glbExport": "pending",
            },
        }
        _write_json(job_dir / "manifest.json", manifest)
        result = {
            "id": job_id,
            "status": "ready_for_reconstruction",
            "stage": "preflight_complete",
            "message": "GPU preflight passed. This job is ready for the reconstruction stage.",
            "photoCount": len(inspection),
        }
        _write_json(status_path, result)
        volume.commit()
        return result
    except Exception as exc:
        failure = {
            "id": job_id,
            "status": "failed",
            "stage": "gpu_preflight",
            "message": "Room image validation failed.",
            "detail": str(exc)[:500],
        }
        _write_json(status_path, failure)
        volume.commit()
        raise


@app.function(
    memory=2048,
    timeout=60,
    volumes={str(VOLUME_PATH): volume},
)
@modal.fastapi_endpoint(method="POST")
async def submit_room(request):
    from fastapi import HTTPException, Request

    if not isinstance(request, Request):
        raise HTTPException(status_code=400, detail="Invalid request")

    expected_token = os.environ.get("YNOT_ROOM_TOKEN", "").strip()
    if expected_token:
        authorization = request.headers.get("authorization", "")
        if authorization != f"Bearer {expected_token}":
            raise HTTPException(status_code=401, detail="Unauthorized")

    form = await request.form()
    photos = form.getlist("photos")
    if len(photos) < 3:
        raise HTTPException(status_code=400, detail="At least 3 room photos are required")
    if len(photos) > MAX_PHOTOS:
        raise HTTPException(status_code=400, detail=f"At most {MAX_PHOTOS} room photos are supported")

    request_id = str(form.get("requestId") or uuid.uuid4())
    safe_id = "".join(ch for ch in request_id if ch.isalnum() or ch in "-_")[:80]
    if not safe_id:
        safe_id = str(uuid.uuid4())

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
    _write_json(
        job_dir / "status.json",
        {
            "id": safe_id,
            "status": "queued",
            "stage": "accepted",
            "message": "Room job accepted by Modal.",
        },
    )
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
    memory=1024,
    timeout=30,
    volumes={str(VOLUME_PATH): volume},
)
@modal.fastapi_endpoint(method="GET")
def room_status(id: str):
    from fastapi import HTTPException

    safe_id = "".join(ch for ch in id if ch.isalnum() or ch in "-_")[:80]
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing job id")

    volume.reload()
    status_path = _job_dir(safe_id) / "status.json"
    if not status_path.exists():
        raise HTTPException(status_code=404, detail="Room job not found")
    return json.loads(status_path.read_text(encoding="utf-8"))
