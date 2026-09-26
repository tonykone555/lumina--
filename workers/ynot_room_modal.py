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


def _load_rgb(path: Path, max_edge: int = 960):
    import numpy as np
    from PIL import Image, ImageOps

    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        longest = max(image.size)
        if longest > max_edge:
            ratio = max_edge / longest
            image = image.resize((max(1, round(image.width * ratio)), max(1, round(image.height * ratio))), Image.Resampling.LANCZOS)
        return np.asarray(image)


def _pixel_intrinsics(normalized_intrinsics, width, height):
    import numpy as np

    k = np.asarray(normalized_intrinsics, dtype=np.float64).copy()
    k[0, 0] *= width
    k[1, 1] *= height
    k[0, 2] *= width
    k[1, 2] *= height
    return k


def _extract_features(image):
    import cv2

    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    detector = cv2.SIFT_create(nfeatures=6000, contrastThreshold=0.02)
    return detector.detectAndCompute(gray, None)


def _good_matches(seed_features, target_features):
    import cv2

    seed_keypoints, seed_desc = seed_features
    target_keypoints, target_desc = target_features
    if seed_desc is None or target_desc is None:
        return seed_keypoints, target_keypoints, []
    matcher = cv2.BFMatcher(cv2.NORM_L2)
    pairs = matcher.knnMatch(seed_desc, target_desc, k=2)
    good = [m for pair in pairs if len(pair) == 2 for m, n in [pair] if m.distance < 0.75 * n.distance]
    return seed_keypoints, target_keypoints, good


def _mesh_arrays(points, mask, image, rotation=None, translation=None, scale=1.0):
    import numpy as np

    height, width = mask.shape
    stride = max(1, int(max(height, width) / 360))
    pts = points[::stride, ::stride].astype(np.float32)
    valid = mask[::stride, ::stride].astype(bool)
    valid &= np.isfinite(pts).all(axis=-1)
    valid &= pts[..., 2] > 0
    sampled_image = image[::stride, ::stride]
    h, w = valid.shape
    index = np.full((h, w), -1, dtype=np.int32)
    index[valid] = np.arange(int(valid.sum()))
    vertices = pts[valid].astype(np.float64) * float(scale)
    if rotation is not None and translation is not None:
        # solvePnP yields X_target = R * X_seed + t. Invert into seed coordinates.
        vertices = (vertices - np.asarray(translation).reshape(1, 3)) @ np.asarray(rotation)
    vertices = vertices.astype(np.float32)
    colors = np.concatenate([
        sampled_image[valid].astype(np.uint8),
        np.full((int(valid.sum()), 1), 255, dtype=np.uint8),
    ], axis=1)
    faces = []
    depth = pts[..., 2]
    for y in range(h - 1):
        for x in range(w - 1):
            cell = [(y, x), (y, x + 1), (y + 1, x), (y + 1, x + 1)]
            if not all(valid[yy, xx] for yy, xx in cell):
                continue
            ds = np.array([depth[yy, xx] for yy, xx in cell])
            mean = float(ds.mean())
            if mean <= 0 or float(ds.max() - ds.min()) / mean > 0.075:
                continue
            a = int(index[y, x])
            b = int(index[y, x + 1])
            c = int(index[y + 1, x])
            d = int(index[y + 1, x + 1])
            faces.extend([(a, c, b), (b, c, d)])
    return vertices, np.asarray(faces, dtype=np.int32), colors, stride


def _align_view(seed, target):
    import cv2
    import numpy as np

    seed_features = _extract_features(seed["image"])
    target_features = _extract_features(target["image"])
    seed_kp, target_kp, good = _good_matches(seed_features, target_features)
    if len(good) < 16:
        return None, {"reason": "not_enough_feature_matches", "matches": len(good)}

    sh, sw = seed["mask"].shape
    th, tw = target["mask"].shape
    object_points = []
    image_points = []
    target_metric_points = []
    for match in good:
        sx, sy = seed_kp[match.queryIdx].pt
        tx, ty = target_kp[match.trainIdx].pt
        sxi, syi = int(round(sx)), int(round(sy))
        txi, tyi = int(round(tx)), int(round(ty))
        if not (0 <= sxi < sw and 0 <= syi < sh and 0 <= txi < tw and 0 <= tyi < th):
            continue
        if not seed["mask"][syi, sxi]:
            continue
        point = seed["points"][syi, sxi]
        if not np.isfinite(point).all() or point[2] <= 0:
            continue
        object_points.append(point)
        image_points.append((tx, ty))
        target_point = target["points"][tyi, txi] if target["mask"][tyi, txi] else np.array([np.nan, np.nan, np.nan])
        target_metric_points.append(target_point)

    if len(object_points) < 12:
        return None, {"reason": "not_enough_metric_matches", "matches": len(object_points)}

    object_points = np.asarray(object_points, dtype=np.float64)
    image_points = np.asarray(image_points, dtype=np.float64)
    target_metric_points = np.asarray(target_metric_points, dtype=np.float64)
    k = _pixel_intrinsics(target["intrinsics"], tw, th)

    ok, rvec, tvec, inliers = cv2.solvePnPRansac(
        object_points,
        image_points,
        k,
        None,
        iterationsCount=500,
        reprojectionError=5.0,
        confidence=0.999,
        flags=cv2.SOLVEPNP_EPNP,
    )
    if not ok or inliers is None or len(inliers) < 10:
        return None, {"reason": "pnp_failed", "matches": len(object_points), "inliers": 0 if inliers is None else len(inliers)}

    inlier_idx = inliers.reshape(-1)
    cv2.solvePnP(object_points[inlier_idx], image_points[inlier_idx], k, None, rvec, tvec, True, flags=cv2.SOLVEPNP_ITERATIVE)
    rotation, _ = cv2.Rodrigues(rvec)
    translation = tvec.reshape(3)
    inlier_ratio = len(inlier_idx) / max(1, len(object_points))
    baseline = float(np.linalg.norm(translation))
    if inlier_ratio < 0.22 or baseline > 15.0:
        return None, {"reason": "pose_quality_rejected", "matches": len(object_points), "inliers": len(inlier_idx), "inlierRatio": round(inlier_ratio, 4), "baseline": round(baseline, 4)}

    predicted_target = (rotation @ object_points[inlier_idx].T).T + translation.reshape(1, 3)
    observed_target = target_metric_points[inlier_idx]
    scale_valid = np.isfinite(observed_target).all(axis=1) & (observed_target[:, 2] > 0.05) & (predicted_target[:, 2] > 0.05)
    ratios = predicted_target[scale_valid, 2] / observed_target[scale_valid, 2]
    ratios = ratios[np.isfinite(ratios) & (ratios > 0.35) & (ratios < 2.8)]
    scale = float(np.median(ratios)) if len(ratios) >= 6 else 1.0
    scale = float(np.clip(scale, 0.55, 1.8))

    return {"rotation": rotation, "translation": translation, "scale": scale}, {
        "matches": len(object_points), "inliers": len(inlier_idx), "inlierRatio": round(inlier_ratio, 4),
        "baseline": round(baseline, 4), "scale": round(scale, 5),
        "rotation": rotation.round(6).tolist(), "translation": translation.round(6).tolist(),
        "intrinsics": target["intrinsics"].tolist(),
    }


def _export_fused_glb(views, output_path: Path):
    import numpy as np
    import trimesh

    all_vertices = []
    all_faces = []
    all_colors = []
    offset = 0
    strides = []
    for view in views:
        vertices, faces, colors, stride = _mesh_arrays(view["points"], view["mask"], view["image"], rotation=view.get("rotation"), translation=view.get("translation"), scale=view.get("scale", 1.0))
        if len(vertices) < 250 or len(faces) < 250:
            continue
        all_vertices.append(vertices)
        all_faces.append(faces + offset)
        all_colors.append(colors)
        offset += len(vertices)
        strides.append(stride)
    if not all_vertices:
        raise RuntimeError("Reconstruction did not produce enough valid room geometry")

    vertices = np.concatenate(all_vertices, axis=0)
    faces = np.concatenate(all_faces, axis=0)
    colors = np.concatenate(all_colors, axis=0)
    vertices *= np.array([1.0, -1.0, -1.0], dtype=np.float32)
    finite = np.isfinite(vertices).all(axis=1)
    if not finite.all():
        raise RuntimeError("Fused room mesh contains invalid coordinates")

    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, vertex_colors=colors, process=False)
    center = mesh.bounds.mean(axis=0)
    mesh.apply_translation(-center)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(output_path, file_type="glb")
    return {"vertices": int(len(vertices)), "faces": int(len(faces)), "views": int(len(all_vertices)), "strides": strides, "bytes": int(output_path.stat().st_size), "centerOffset": center.round(6).tolist()}


@app.function(image=reconstruction_image, gpu="A10G", memory=16384, timeout=1800, scaledown_window=600, volumes={str(VOLUME_PATH): volume, str(MODEL_PATH): model_cache})
def process_room(job_id: str, metadata: dict) -> dict:
    """Reconstruct and fuse aligned room viewpoints into one browser-loadable GLB."""
    import numpy as np
    import torch
    from PIL import Image, ImageOps
    from moge.model import import_model_class_by_version

    volume.reload()
    job_dir = _job_dir(job_id)
    status_path = job_dir / "status.json"
    _write_json(status_path, {"id": job_id, "status": "processing", "stage": "reconstructing", "message": "YNOT Room is reconstructing and aligning your room viewpoints on the GPU."})
    volume.commit()
    photo_dir = job_dir / "photos"
    photos = sorted(path for path in photo_dir.iterdir() if path.is_file())
    inspection = []

    try:
        for path in photos:
            with Image.open(path) as source:
                image_obj = ImageOps.exif_transpose(source)
                inspection.append({"name": path.name, "width": image_obj.width, "height": image_obj.height, "mode": image_obj.mode, "format": source.format})

        model_class = import_model_class_by_version("v2")
        model = model_class.from_pretrained(MODEL_ID).cuda().eval()
        inferred = []
        for index, path in enumerate(photos):
            _write_json(status_path, {"id": job_id, "status": "processing", "stage": "reconstructing", "message": f"Reading room viewpoint {index + 1} of {len(photos)}.", "progress": round((index + 0.25) / max(1, len(photos) + 1), 3)})
            volume.commit()
            image_np = _load_rgb(path)
            image_tensor = torch.tensor(image_np, dtype=torch.float16, device="cuda").permute(2, 0, 1) / 255
            with torch.inference_mode():
                output = model.infer(image_tensor, resolution_level=5, use_fp16=True, apply_mask=True)
            inferred.append({"path": path, "name": path.name, "image": image_np, "points": output["points"].float().cpu().numpy(), "mask": output["mask"].cpu().numpy().astype(bool), "intrinsics": output["intrinsics"].float().cpu().numpy()})

        seed_index = max(range(len(inferred)), key=lambda i: photos[i].stat().st_size)
        seed = inferred[seed_index]
        seed["rotation"] = None
        seed["translation"] = None
        seed["scale"] = 1.0
        fused_views = [seed]
        alignments = []
        _write_json(status_path, {"id": job_id, "status": "processing", "stage": "aligning_views", "message": "YNOT Room is aligning the extra camera angles.", "progress": 0.78})
        volume.commit()

        for index, target in enumerate(inferred):
            if index == seed_index:
                alignments.append({"view": target["name"], "seed": True, "used": True, "intrinsics": target["intrinsics"].tolist()})
                continue
            pose, quality = _align_view(seed, target)
            record = {"view": target["name"], "seed": False, **quality}
            if pose is None:
                record["used"] = False
                alignments.append(record)
                continue
            target["rotation"] = pose["rotation"]
            target["translation"] = pose["translation"]
            target["scale"] = pose["scale"]
            fused_views.append(target)
            record["used"] = True
            alignments.append(record)

        scene_path = job_dir / "scene.glb"
        mesh_info = _export_fused_glb(fused_views, scene_path)
        scene_url = f"{PUBLIC_SCENE_ENDPOINT}?id={job_id}"
        method = "moge2_multiview_fused" if len(fused_views) > 1 else "moge2_monocular_seed"
        manifest = {
            "version": 4,
            "id": job_id,
            "input": metadata,
            "photos": inspection,
            "compute": {"provider": "modal", "gpu": "A10G"},
            "reconstruction": {"model": MODEL_ID, "method": method, "sourceView": seed["name"], "seedIntrinsics": seed["intrinsics"].tolist(), "fusedViewCount": len(fused_views), "alignment": alignments, "mesh": mesh_info},
            "pipeline": {"preflight": "complete", "metricReconstruction": "complete", "multiViewAlignment": "complete" if len(fused_views) > 1 else "fallback_monocular", "glbExport": "complete", "catalogueObjectMapping": "pending"},
        }
        _write_json(job_dir / "manifest.json", manifest)
        result = {"id": job_id, "status": "ready", "stage": "scene_ready", "message": f"Your 3D room is ready with {len(fused_views)} aligned viewpoint{'s' if len(fused_views) != 1 else ''}." if len(fused_views) > 1 else "Your 3D room is ready. Extra angles were kept for a later refinement pass.", "photoCount": len(inspection), "fusedViewCount": len(fused_views), "sceneUrl": scene_url, "reconstruction": method, "mesh": mesh_info}
        _write_json(status_path, result)
        volume.commit()
        return result
    except Exception as exc:
        failure = {"id": job_id, "status": "failed", "stage": "reconstructing", "message": "Room reconstruction failed.", "detail": str(exc)[:800]}
        _write_json(status_path, failure)
        volume.commit()
        raise


@app.function(image=web_image, memory=2048, timeout=60, volumes={str(VOLUME_PATH): volume})
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
    metadata = {"requestId": safe_id, "source": str(form.get("source") or "ynot-room-web")[:80], "style": str(form.get("style") or "modern")[:40], "roomType": str(form.get("roomType") or "living_room")[:40], "budget": str(form.get("budget") or "")[:12], "photos": saved}
    _write_json(job_dir / "request.json", metadata)
    _write_json(job_dir / "status.json", {"id": safe_id, "status": "queued", "stage": "accepted", "message": "Room job accepted by Modal.", "photoCount": len(saved)})
    volume.commit()
    call = process_room.spawn(safe_id, metadata)
    _write_json(job_dir / "call.json", {"functionCallId": call.object_id})
    volume.commit()
    return {"id": safe_id, "status": "queued", "stage": "accepted", "message": "Your room was accepted and queued for GPU reconstruction.", "photoCount": len(saved)}


@app.function(image=web_image, memory=1024, timeout=30, volumes={str(VOLUME_PATH): volume})
@modal.fastapi_endpoint(method="GET")
def room_status(id: str):
    safe_id = _safe_id(id)
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing room id")
    volume.reload()
    path = _job_dir(safe_id) / "status.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Room job not found")
    return json.loads(path.read_text(encoding="utf-8"))


@app.function(image=web_image, memory=1024, timeout=30, volumes={str(VOLUME_PATH): volume})
@modal.fastapi_endpoint(method="GET")
def room_scene(id: str):
    safe_id = _safe_id(id)
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing room id")
    volume.reload()
    path = _job_dir(safe_id) / "scene.glb"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Room scene not ready")
    return FileResponse(path, media_type="model/gltf-binary", filename=f"ynot-room-{safe_id}.glb")
