import json
import math
import random
from pathlib import Path

import modal
from fastapi import HTTPException

APP_NAME = "ynot-room-structure"
VOLUME_PATH = Path("/ynot-room")
MAX_SAMPLE_POINTS = 30000

image = (
    modal.Image.debian_slim(python_version="3.12")
    .uv_pip_install("fastapi[standard]", "numpy", "trimesh")
)
app = modal.App(APP_NAME, image=image)
volume = modal.Volume.from_name("ynot-room-jobs", create_if_missing=True)


def _safe_id(value: str) -> str:
    return "".join(ch for ch in str(value) if ch.isalnum() or ch in "-_")[:80]


def _job_dir(job_id: str) -> Path:
    return VOLUME_PATH / "jobs" / job_id


def _round_vec(values, digits=4):
    return [round(float(v), digits) for v in values]


def _load_vertices(scene_path: Path):
    import numpy as np
    import trimesh

    loaded = trimesh.load(scene_path, force="scene", process=False)
    meshes = []
    if isinstance(loaded, trimesh.Scene):
        for node_name in loaded.graph.nodes_geometry:
            transform, geometry_name = loaded.graph[node_name]
            geometry = loaded.geometry.get(geometry_name)
            if geometry is None or len(geometry.vertices) == 0:
                continue
            vertices = trimesh.transform_points(geometry.vertices, transform)
            meshes.append(np.asarray(vertices, dtype=np.float64))
    elif hasattr(loaded, "vertices") and len(loaded.vertices):
        meshes.append(np.asarray(loaded.vertices, dtype=np.float64))

    if not meshes:
        raise RuntimeError("Generated scene contains no mesh vertices")
    vertices = np.concatenate(meshes, axis=0)
    vertices = vertices[np.isfinite(vertices).all(axis=1)]
    if len(vertices) < 100:
        raise RuntimeError("Generated scene does not contain enough valid geometry")
    return vertices


def _sample_points(vertices):
    import numpy as np

    if len(vertices) <= MAX_SAMPLE_POINTS:
        return vertices.copy()
    rng = np.random.default_rng(42)
    indices = rng.choice(len(vertices), size=MAX_SAMPLE_POINTS, replace=False)
    return vertices[indices]


def _robust_bounds(vertices):
    import numpy as np

    low = np.percentile(vertices, 1.0, axis=0)
    high = np.percentile(vertices, 99.0, axis=0)
    size = np.maximum(high - low, 0)
    center = (low + high) / 2
    return {
        "min": _round_vec(low),
        "max": _round_vec(high),
        "size": _round_vec(size),
        "center": _round_vec(center),
        "units": "meters_estimated",
        "confidence": "approximate",
    }


def _fit_plane(points):
    import numpy as np

    centroid = points.mean(axis=0)
    _, _, vh = np.linalg.svd(points - centroid, full_matrices=False)
    normal = vh[-1]
    norm = np.linalg.norm(normal)
    if norm <= 1e-8:
        return None
    normal = normal / norm
    offset = -float(np.dot(normal, centroid))
    return normal, offset


def _plane_candidates(vertices, max_planes=6):
    """Estimate dominant planar surfaces with conservative RANSAC.

    The GLB is already in browser/glTF coordinates where Y is intended as up.
    We return candidates rather than claiming architectural-survey accuracy.
    """
    import numpy as np

    remaining = _sample_points(vertices)
    if len(remaining) < 500:
        return []

    extent = np.ptp(remaining, axis=0)
    diagonal = float(np.linalg.norm(extent))
    threshold = max(0.025, min(0.10, diagonal * 0.012))
    rng = np.random.default_rng(1234)
    original_count = len(remaining)
    candidates = []

    for _ in range(max_planes):
        if len(remaining) < max(350, original_count * 0.04):
            break
        best_mask = None
        best_count = 0
        iterations = min(420, max(160, len(remaining) // 60))
        for _iteration in range(iterations):
            chosen = remaining[rng.choice(len(remaining), size=3, replace=False)]
            v1 = chosen[1] - chosen[0]
            v2 = chosen[2] - chosen[0]
            normal = np.cross(v1, v2)
            norm = np.linalg.norm(normal)
            if norm < 1e-7:
                continue
            normal = normal / norm
            offset = -float(np.dot(normal, chosen[0]))
            distances = np.abs(remaining @ normal + offset)
            mask = distances < threshold
            count = int(mask.sum())
            if count > best_count:
                best_count = count
                best_mask = mask

        if best_mask is None or best_count < max(250, int(original_count * 0.018)):
            break

        inliers = remaining[best_mask]
        fitted = _fit_plane(inliers)
        if fitted is None:
            remaining = remaining[~best_mask]
            continue
        normal, offset = fitted
        distances = np.abs(remaining @ normal + offset)
        refined = distances < threshold
        inliers = remaining[refined]
        ratio = len(inliers) / original_count

        # Make normals deterministic: floor normals point upward; otherwise choose a stable sign.
        if abs(normal[1]) > 0.72:
            if normal[1] < 0:
                normal = -normal
                offset = -offset
            kind = "horizontal"
        else:
            first_major = int(np.argmax(np.abs(normal)))
            if normal[first_major] < 0:
                normal = -normal
                offset = -offset
            kind = "vertical" if abs(normal[1]) < 0.35 else "oblique"

        spread = np.ptp(inliers, axis=0)
        candidates.append({
            "normal": _round_vec(normal, 5),
            "offset": round(float(offset), 5),
            "inlierRatio": round(float(ratio), 4),
            "pointCount": int(len(inliers)),
            "spread": _round_vec(spread),
            "orientation": kind,
            "distanceThresholdMeters": round(float(threshold), 4),
        })
        remaining = remaining[~refined]

    candidates.sort(key=lambda item: item["inlierRatio"], reverse=True)
    return candidates


def _classify_structure(planes, bounds):
    horizontal = [p for p in planes if p["orientation"] == "horizontal"]
    vertical = [p for p in planes if p["orientation"] == "vertical"]

    floor = None
    ceiling = None
    if horizontal:
        # Plane equation n.x + d = 0. With upward normal, y ~= -d / ny.
        by_height = []
        for plane in horizontal:
            ny = plane["normal"][1]
            if abs(ny) < 1e-5:
                continue
            height = -plane["offset"] / ny
            by_height.append((height, plane))
        by_height.sort(key=lambda item: item[0])
        if by_height:
            floor = {**by_height[0][1], "estimatedHeight": round(float(by_height[0][0]), 4), "role": "floor_candidate"}
            if len(by_height) > 1:
                ceiling = {**by_height[-1][1], "estimatedHeight": round(float(by_height[-1][0]), 4), "role": "ceiling_candidate"}

    walls = []
    for plane in vertical[:4]:
        walls.append({**plane, "role": "wall_candidate"})

    return {
        "floor": floor,
        "ceiling": ceiling,
        "walls": walls,
        "planeCandidates": planes,
        "confidence": "experimental",
        "note": "Structure is estimated from reconstructed visual geometry and is not survey-grade measurement.",
    }


def _camera_records(manifest):
    reconstruction = manifest.get("reconstruction") or {}
    alignment = reconstruction.get("alignment") or []
    photos = manifest.get("photos") or []
    seed_name = reconstruction.get("sourceView")
    seed_intrinsics = reconstruction.get("seedIntrinsics")
    records = []

    alignment_by_view = {item.get("view"): item for item in alignment if item.get("view")}
    for photo in photos:
        name = photo.get("name")
        record = alignment_by_view.get(name, {})
        camera = {
            "view": name,
            "width": photo.get("width"),
            "height": photo.get("height"),
            "seed": bool(name == seed_name or record.get("seed")),
            "used": bool(record.get("used", name == seed_name)),
        }
        if camera["seed"] and seed_intrinsics is not None:
            camera["intrinsicsNormalized"] = seed_intrinsics
            camera["rotation"] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
            camera["translation"] = [0, 0, 0]
            camera["scale"] = 1.0
        else:
            if "rotation" in record:
                camera["rotation"] = record["rotation"]
            if "translation" in record:
                camera["translation"] = record["translation"]
            if "scale" in record:
                camera["scale"] = record["scale"]
            if not camera["used"] and record.get("reason"):
                camera["skipReason"] = record.get("reason")
        records.append(camera)
    return records


def _build_room_model(job_id: str):
    job_dir = _job_dir(job_id)
    scene_path = job_dir / "scene.glb"
    manifest_path = job_dir / "manifest.json"
    if not scene_path.exists():
        raise FileNotFoundError("Room scene not found")
    if not manifest_path.exists():
        raise FileNotFoundError("Room reconstruction manifest not found")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    vertices = _load_vertices(scene_path)
    bounds = _robust_bounds(vertices)
    planes = _plane_candidates(vertices)
    structure = _classify_structure(planes, bounds)
    reconstruction = manifest.get("reconstruction") or {}

    model = {
        "version": 1,
        "id": job_id,
        "coordinateSystem": {
            "format": "glTF",
            "handedness": "right",
            "upAxis": "+Y",
            "units": "meters_estimated",
        },
        "bounds": bounds,
        "structure": structure,
        "cameras": _camera_records(manifest),
        "objects": [],
        "reconstruction": {
            "model": reconstruction.get("model"),
            "method": reconstruction.get("method"),
            "sourceView": reconstruction.get("sourceView"),
            "fusedViewCount": reconstruction.get("fusedViewCount", (reconstruction.get("mesh") or {}).get("views")),
            "mesh": reconstruction.get("mesh"),
        },
        "objectMapping": {
            "status": "pending",
            "nextStage": "detect_furniture_and_lift_to_3d",
        },
        "measurementDisclaimer": "Dimensions and structural planes are visual estimates from reconstructed imagery, not architectural measurements.",
    }
    (job_dir / "room.json").write_text(json.dumps(model, indent=2), encoding="utf-8")
    volume.commit()
    return model


@app.function(
    memory=4096,
    timeout=180,
    volumes={str(VOLUME_PATH): volume},
)
@modal.fastapi_endpoint(method="GET")
def room_model(id: str, refresh: bool = False):
    safe_id = _safe_id(id)
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing room id")
    volume.reload()
    job_dir = _job_dir(safe_id)
    cached_path = job_dir / "room.json"
    if cached_path.exists() and not refresh:
        return json.loads(cached_path.read_text(encoding="utf-8"))
    try:
        return _build_room_model(safe_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Room structure analysis failed: {str(exc)[:500]}") from exc
