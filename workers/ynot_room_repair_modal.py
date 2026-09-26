import json
from pathlib import Path

import modal
from fastapi import HTTPException

APP_NAME = "ynot-room-repair"
VOLUME_PATH = Path("/ynot-room")
MAX_POINTS = 45000
MAX_ATTEMPTS = 2
QA_URL = "https://tonykone555--ynot-room-qa-room-qa.modal.run"
HIGH_DETAIL_URL = "https://tonykone555--ynot-room-high-detail-high-detail-reconstruct.modal.run"

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libgl1", "libglib2.0-0")
    .uv_pip_install("fastapi[standard]", "numpy", "pillow", "opencv-python-headless", "trimesh", "requests")
)
app = modal.App(APP_NAME, image=image)
volume = modal.Volume.from_name("ynot-room-jobs", create_if_missing=True)


def _safe_id(value: str) -> str:
    return "".join(ch for ch in str(value) if ch.isalnum() or ch in "-_")[:80]


def _job_dir(job_id: str) -> Path:
    return VOLUME_PATH / "jobs" / job_id


def _read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _write(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _load_points(scene_path: Path):
    import numpy as np
    import trimesh

    loaded = trimesh.load(scene_path, force="scene", process=False)
    chunks = []
    if isinstance(loaded, trimesh.Scene):
        for node in loaded.graph.nodes_geometry:
            transform, name = loaded.graph[node]
            geometry = loaded.geometry.get(name)
            if geometry is not None and len(geometry.vertices):
                chunks.append(trimesh.transform_points(geometry.vertices, transform))
    if not chunks:
        raise RuntimeError("No scene geometry available for repair")
    points = np.concatenate(chunks, axis=0).astype(np.float64)
    points = points[np.isfinite(points).all(axis=1)]
    if len(points) > MAX_POINTS:
        rng = np.random.default_rng(77)
        points = points[rng.choice(len(points), MAX_POINTS, replace=False)]
    return points


def _project_mask(points, center, rotation, translation, intrinsics, width, height):
    import numpy as np

    flip = np.array([1.0, -1.0, -1.0])
    seed = (points + np.asarray(center).reshape(1, 3)) * flip.reshape(1, 3)
    r = np.asarray(rotation, dtype=np.float64).reshape(3, 3)
    t = np.asarray(translation, dtype=np.float64).reshape(1, 3)
    cam = seed @ r.T + t
    z = cam[:, 2]
    valid = np.isfinite(cam).all(axis=1) & (z > 0.08)
    cam, z = cam[valid], z[valid]
    if not len(cam):
        return None
    k = np.asarray(intrinsics, dtype=np.float64)
    u = float(k[0, 0]) * width * cam[:, 0] / z + float(k[0, 2]) * width
    v = float(k[1, 1]) * height * cam[:, 1] / z + float(k[1, 2]) * height
    inside = (u >= 0) & (u < width) & (v >= 0) & (v < height)
    if inside.sum() < 50:
        return None
    x = np.clip(np.rint(u[inside]).astype(int), 0, width - 1)
    y = np.clip(np.rint(v[inside]).astype(int), 0, height - 1)
    mask = np.zeros((height, width), dtype=np.uint8)
    mask[y, x] = 255
    return mask


def _camera_score(source_rgb, mask):
    import cv2
    import numpy as np

    if mask is None:
        return 0.0
    mask = cv2.dilate(mask, np.ones((5, 5), dtype=np.uint8), iterations=2)
    coverage = float((mask > 0).mean())
    if coverage < 0.08:
        return coverage
    edges = cv2.Canny(cv2.cvtColor(source_rgb, cv2.COLOR_RGB2GRAY), 55, 145) > 0
    edge_coverage = float((edges & (mask > 0)).sum() / max(1, edges.sum())) if edges.any() else coverage
    return 0.55 * min(1.0, coverage / 0.55) + 0.45 * edge_coverage


def _refine_translation(points, source_rgb, center, camera, intrinsics):
    import numpy as np

    height, width = source_rgb.shape[:2]
    rotation = camera.get("rotation") or [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    base = np.asarray(camera.get("translation") or [0, 0, 0], dtype=np.float64)
    baseline = float(np.linalg.norm(base))
    step = max(0.06, min(0.28, baseline * 0.06 if baseline > 0 else 0.14))
    original = _camera_score(source_rgb, _project_mask(points, center, rotation, base, intrinsics, width, height))
    best = (original, base)
    for dx in (-step, 0.0, step):
        for dy in (-step, 0.0, step):
            for dz in (-step, 0.0, step):
                t = base + np.array([dx, dy, dz])
                score = _camera_score(source_rgb, _project_mask(points, center, rotation, t, intrinsics, width, height))
                if score > best[0]:
                    best = (score, t)
    improved = best[0] > original + 0.015
    return {
        "improved": bool(improved),
        "beforeScore": round(float(original), 4),
        "afterScore": round(float(best[0]), 4),
        "translation": best[1].round(6).tolist() if improved else base.round(6).tolist(),
    }


def _rerun_qa(job_id: str):
    import requests

    response = requests.get(QA_URL, params={"id": job_id, "refresh": "true"}, timeout=180)
    response.raise_for_status()
    return response.json()


def _schedule_high_detail(job_id: str, reason: list[str]):
    state_path = _job_dir(job_id) / "qa" / "high-detail-state.json"
    existing = _read(state_path) if state_path.exists() else {}
    if existing.get("status") in {"queued", "processing", "complete"}:
        return existing
    call = high_detail_bridge.spawn(job_id)
    state = {"status": "queued", "reason": reason, "callId": getattr(call, "object_id", None)}
    _write(state_path, state)
    volume.commit()
    return state


def _repair(job_id: str):
    import numpy as np
    from PIL import Image, ImageOps

    job_dir = _job_dir(job_id)
    qa_path = job_dir / "qa" / "qa.json"
    manifest_path = job_dir / "manifest.json"
    scene_path = job_dir / "scene.glb"
    if not qa_path.exists() or not manifest_path.exists() or not scene_path.exists():
        raise FileNotFoundError("Room QA and reconstruction must exist before repair")
    qa = _read(qa_path)
    if qa.get("canPublish"):
        return {"id": job_id, "status": "no_repair_needed", "canPublish": True, "releaseStatus": "publishable", "qa": qa}

    state_path = job_dir / "qa" / "repair-state.json"
    state = _read(state_path) if state_path.exists() else {"attempts": 0, "history": []}
    if int(state.get("attempts", 0)) >= MAX_ATTEMPTS:
        return {"id": job_id, "status": "repair_limit_reached", "attempts": state.get("attempts", 0), "nextAction": "manual_review", "releaseStatus": "review_required", "qa": qa}

    blockers = qa.get("blockers") or []
    codes = {str(item.get("code")) for item in blockers if isinstance(item, dict)}
    geometry_codes = {"large_uncovered_region", "reference_missing", "camera_not_aligned"}
    camera_codes = {"weak_structure_match", "low_view_similarity"}
    attempt = int(state.get("attempts", 0)) + 1

    if codes & geometry_codes:
        reason = sorted(codes & geometry_codes)
        record = {"attempt": attempt, "action": "high_detail_scheduled", "reason": reason}
        state["attempts"] = attempt
        state.setdefault("history", []).append(record)
        _write(state_path, state)
        volume.commit()
        scheduled = _schedule_high_detail(job_id, reason)
        return {"id": job_id, "status": "reprocessing", "repair": record, "highDetail": scheduled, "nextAction": "high_detail_in_progress", "releaseStatus": "review_required", "qa": qa}

    manifest = _read(manifest_path)
    reconstruction = manifest.get("reconstruction") or {}
    alignments = reconstruction.get("alignment") or []
    by_view = {item.get("view"): item for item in alignments if item.get("view")}
    seed_name = reconstruction.get("sourceView")
    seed_intrinsics = reconstruction.get("seedIntrinsics")
    center = np.asarray((qa.get("cameraOrigin") or {}).get("centerOffset"), dtype=np.float64)
    if seed_intrinsics is None or center.size != 3:
        raise RuntimeError("QA repair is missing camera origin metadata")
    points = _load_points(scene_path)
    photo_dir = job_dir / "photos"
    improvements = []

    for report in qa.get("viewReports") or []:
        if not isinstance(report, dict) or not report.get("matched") or not (set(report.get("blockers") or []) & camera_codes):
            continue
        view = str(report.get("view") or "")
        source_path = photo_dir / view
        if not source_path.exists():
            continue
        camera = by_view.get(view, {})
        if view == seed_name:
            camera = {**camera, "rotation": [[1, 0, 0], [0, 1, 0], [0, 0, 1]], "translation": [0, 0, 0], "used": True}
        with Image.open(source_path) as image_obj:
            image_obj = ImageOps.exif_transpose(image_obj).convert("RGB")
            scale = min(1.0, 260 / max(image_obj.size))
            image_obj = image_obj.resize((max(96, round(image_obj.width * scale)), max(72, round(image_obj.height * scale))), Image.Resampling.LANCZOS)
            source = np.asarray(image_obj)
        result = _refine_translation(points, source, center, camera, camera.get("intrinsics") or seed_intrinsics)
        if not result["improved"]:
            continue
        if view == seed_name:
            flip = np.array([1.0, -1.0, -1.0])
            center = center + np.asarray(result["translation"]) * flip
            reconstruction.setdefault("mesh", {})["centerOffset"] = center.round(6).tolist()
            improvements.append({"view": view, "kind": "global_camera_origin", **result, "centerOffset": center.round(6).tolist()})
        else:
            target = by_view.get(view)
            if target is not None:
                target["translation"] = result["translation"]
                improvements.append({"view": view, "kind": "camera_translation", **result})

    if not improvements:
        reason = ["camera_refinement_no_gain"]
        record = {"attempt": attempt, "action": "high_detail_scheduled", "reason": reason}
        state["attempts"] = attempt
        state.setdefault("history", []).append(record)
        _write(state_path, state)
        volume.commit()
        scheduled = _schedule_high_detail(job_id, reason)
        return {"id": job_id, "status": "reprocessing", "repair": record, "highDetail": scheduled, "nextAction": "high_detail_in_progress", "releaseStatus": "review_required", "qa": qa}

    backup = job_dir / "qa" / "manifest-before-camera-repair.json"
    if not backup.exists():
        _write(backup, manifest)
    manifest["reconstruction"] = reconstruction
    _write(manifest_path, manifest)
    record = {"attempt": attempt, "action": "camera_refinement", "improvements": improvements}
    state["attempts"] = attempt
    state.setdefault("history", []).append(record)
    _write(state_path, state)
    volume.commit()
    refreshed = _rerun_qa(job_id)
    if refreshed.get("canPublish"):
        return {"id": job_id, "status": "repaired", "repair": record, "nextAction": "publish", "releaseStatus": "publishable", "qa": refreshed}

    remaining_codes = {str(item.get("code")) for item in (refreshed.get("blockers") or []) if isinstance(item, dict)}
    scheduled = _schedule_high_detail(job_id, sorted(remaining_codes) or ["qa_still_blocked_after_camera_refinement"])
    return {"id": job_id, "status": "reprocessing", "repair": record, "highDetail": scheduled, "nextAction": "high_detail_in_progress", "releaseStatus": "review_required", "qa": refreshed}


@app.function(memory=4096, timeout=300, volumes={str(VOLUME_PATH): volume})
def repair_job(job_id: str):
    safe = _safe_id(job_id)
    if not safe:
        raise ValueError("Missing room id")
    volume.reload()
    return _repair(safe)


@app.function(memory=1024, timeout=1900, volumes={str(VOLUME_PATH): volume})
def high_detail_bridge(job_id: str):
    import requests

    safe = _safe_id(job_id)
    if not safe:
        raise ValueError("Missing room id")
    volume.reload()
    state_path = _job_dir(safe) / "qa" / "high-detail-state.json"
    state = _read(state_path) if state_path.exists() else {}
    state["status"] = "processing"
    _write(state_path, state)
    volume.commit()
    try:
        response = requests.post(HIGH_DETAIL_URL, params={"id": safe}, timeout=1850)
        response.raise_for_status()
        result = response.json()
        state.update({"status": "complete", "releaseStatus": result.get("releaseStatus"), "result": {"reconstruction": result.get("reconstruction"), "fusedViewCount": result.get("fusedViewCount"), "mesh": result.get("mesh")}})
        _write(state_path, state)
        volume.commit()
        return result
    except Exception as exc:
        state.update({"status": "failed", "error": str(exc)[:700]})
        _write(state_path, state)
        volume.commit()
        raise


@app.function(memory=1024, timeout=30, volumes={str(VOLUME_PATH): volume})
@modal.fastapi_endpoint(method="POST")
def room_repair(id: str):
    safe = _safe_id(id)
    if not safe:
        raise HTTPException(status_code=400, detail="Missing room id")
    volume.reload()
    try:
        call = repair_job.spawn(safe)
        return {"id": safe, "status": "repair_queued", "callId": getattr(call, "object_id", None), "releaseStatus": "review_required"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not queue room repair: {str(exc)[:700]}") from exc
