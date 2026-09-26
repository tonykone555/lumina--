import json
from pathlib import Path

import modal
from fastapi import HTTPException

APP_NAME = "ynot-room-qa"
VOLUME_PATH = Path("/ynot-room")
MAX_RENDER_POINTS = 90000
RENDER_MAX_EDGE = 420

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libgl1", "libglib2.0-0")
    .uv_pip_install(
        "fastapi[standard]",
        "numpy",
        "pillow",
        "opencv-python-headless",
        "trimesh",
    )
)
app = modal.App(APP_NAME, image=image)
volume = modal.Volume.from_name("ynot-room-jobs", create_if_missing=True)


def _safe_id(value: str) -> str:
    return "".join(ch for ch in str(value) if ch.isalnum() or ch in "-_")[:80]


def _job_dir(job_id: str) -> Path:
    return VOLUME_PATH / "jobs" / job_id


def _load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _load_scene_points(scene_path: Path):
    import numpy as np
    import trimesh

    loaded = trimesh.load(scene_path, force="scene", process=False)
    vertices = []
    colors = []
    if isinstance(loaded, trimesh.Scene):
        for node_name in loaded.graph.nodes_geometry:
            transform, geometry_name = loaded.graph[node_name]
            geometry = loaded.geometry.get(geometry_name)
            if geometry is None or len(geometry.vertices) == 0:
                continue
            pts = trimesh.transform_points(geometry.vertices, transform)
            color = getattr(getattr(geometry, "visual", None), "vertex_colors", None)
            if color is None or len(color) != len(pts):
                rgb = np.full((len(pts), 3), 180, dtype=np.uint8)
            else:
                rgb = np.asarray(color, dtype=np.uint8)[:, :3]
            vertices.append(np.asarray(pts, dtype=np.float64))
            colors.append(rgb)
    if not vertices:
        raise RuntimeError("The reconstructed GLB contains no usable geometry")
    pts = np.concatenate(vertices, axis=0)
    rgb = np.concatenate(colors, axis=0)
    valid = np.isfinite(pts).all(axis=1)
    pts, rgb = pts[valid], rgb[valid]
    if len(pts) > MAX_RENDER_POINTS:
        rng = np.random.default_rng(2026)
        chosen = rng.choice(len(pts), size=MAX_RENDER_POINTS, replace=False)
        pts, rgb = pts[chosen], rgb[chosen]
    return pts, rgb


def _normalized_intrinsics(manifest, alignment_record=None):
    if alignment_record and alignment_record.get("intrinsics") is not None:
        return alignment_record["intrinsics"], "per_view"
    reconstruction = manifest.get("reconstruction") or {}
    seed = reconstruction.get("seedIntrinsics")
    if seed is None:
        raise RuntimeError("Reconstruction manifest does not contain camera intrinsics")
    return seed, "seed_fallback"


def _project(points, colors, center_offset, rotation, translation, intrinsics, width, height):
    import numpy as np

    flip = np.array([1.0, -1.0, -1.0], dtype=np.float64)
    seed_points = (points + np.asarray(center_offset, dtype=np.float64).reshape(1, 3)) * flip.reshape(1, 3)
    rotation = np.asarray(rotation, dtype=np.float64).reshape(3, 3)
    translation = np.asarray(translation, dtype=np.float64).reshape(1, 3)
    camera_points = seed_points @ rotation.T + translation
    depth = camera_points[:, 2]
    valid = np.isfinite(camera_points).all(axis=1) & (depth > 0.08)
    camera_points = camera_points[valid]
    depth = depth[valid]
    colors = colors[valid]
    if len(camera_points) == 0:
        return None

    k = np.asarray(intrinsics, dtype=np.float64)
    fx, fy = float(k[0, 0]) * width, float(k[1, 1]) * height
    cx, cy = float(k[0, 2]) * width, float(k[1, 2]) * height
    u = fx * camera_points[:, 0] / depth + cx
    v = fy * camera_points[:, 1] / depth + cy
    inside = (u >= 0) & (u < width) & (v >= 0) & (v < height)
    if not inside.any():
        return None
    return u[inside], v[inside], depth[inside], colors[inside]


def _occupancy_score(points, center_offset, intrinsics, width, height):
    import numpy as np

    colors = np.zeros((len(points), 3), dtype=np.uint8)
    projected = _project(
        points,
        colors,
        center_offset,
        np.eye(3),
        np.zeros(3),
        intrinsics,
        width,
        height,
    )
    if projected is None:
        return 0.0
    u, v, _depth, _colors = projected
    if len(u) < 80:
        return 0.0
    grid_w, grid_h = 28, 20
    gx = np.clip((u / width * grid_w).astype(int), 0, grid_w - 1)
    gy = np.clip((v / height * grid_h).astype(int), 0, grid_h - 1)
    occupied = len(np.unique(gy * grid_w + gx)) / float(grid_w * grid_h)
    inside_ratio = min(1.0, len(u) / max(1.0, len(points) * 0.55))
    qx = np.percentile(u, [5, 95])
    qy = np.percentile(v, [5, 95])
    bbox = max(0.0, min(1.0, (qx[1] - qx[0]) / max(1.0, width))) * max(
        0.0, min(1.0, (qy[1] - qy[0]) / max(1.0, height))
    )
    return float(0.55 * occupied + 0.25 * inside_ratio + 0.20 * bbox)


def _estimate_center(points, intrinsics, width, height):
    """Recover the GLB centering translation from the seed camera when old manifests lack it."""
    import numpy as np

    low = np.percentile(points, 2.0, axis=0)
    high = np.percentile(points, 98.0, axis=0)
    size = np.maximum(high - low, 0.2)
    xs = np.linspace(low[0] + 0.15 * size[0], high[0] - 0.15 * size[0], 4)
    ys = np.linspace(low[1] + 0.15 * size[1], high[1] - 0.15 * size[1], 4)
    z_near = high[2] + max(0.1, 0.04 * size[2])
    z_far = high[2] + max(1.2, 0.65 * size[2])
    zs = np.linspace(z_near, z_far, 7)

    best_score = -1.0
    best_camera = np.array([0.0, 0.0, z_near])
    for px in xs:
        for py in ys:
            for pz in zs:
                camera_position = np.array([px, py, pz], dtype=np.float64)
                center = -camera_position
                score = _occupancy_score(points, center, intrinsics, width, height)
                if score > best_score:
                    best_score = score
                    best_camera = camera_position

    # Small local refinement around the coarse solution.
    steps = np.maximum(size * np.array([0.10, 0.10, 0.08]), np.array([0.15, 0.15, 0.15]))
    for _ in range(2):
        current = best_camera.copy()
        for dx in (-steps[0], 0.0, steps[0]):
            for dy in (-steps[1], 0.0, steps[1]):
                for dz in (-steps[2], 0.0, steps[2]):
                    candidate = current + np.array([dx, dy, dz])
                    center = -candidate
                    score = _occupancy_score(points, center, intrinsics, width, height)
                    if score > best_score:
                        best_score = score
                        best_camera = candidate
        steps *= 0.45
    return (-best_camera).round(6).tolist(), round(float(best_score), 4)


def _render_points(points, colors, center_offset, camera, intrinsics, width, height):
    import cv2
    import numpy as np

    rotation = camera.get("rotation") or [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    translation = camera.get("translation") or [0, 0, 0]
    projected = _project(points, colors, center_offset, rotation, translation, intrinsics, width, height)
    render = np.zeros((height, width, 3), dtype=np.uint8)
    mask = np.zeros((height, width), dtype=np.uint8)
    if projected is None:
        return render, mask
    u, v, depth, rgb = projected
    x = np.clip(np.rint(u).astype(np.int32), 0, width - 1)
    y = np.clip(np.rint(v).astype(np.int32), 0, height - 1)
    flat = y * width + x
    order = np.argsort(depth)
    flat_sorted = flat[order]
    _, first = np.unique(flat_sorted, return_index=True)
    chosen = order[first]
    x, y, rgb = x[chosen], y[chosen], rgb[chosen]
    render[y, x] = rgb
    mask[y, x] = 255

    kernel = np.ones((3, 3), dtype=np.uint8)
    for _ in range(2):
        render = cv2.dilate(render, kernel, iterations=1)
        mask = cv2.dilate(mask, kernel, iterations=1)
    render = cv2.GaussianBlur(render, (3, 3), 0)
    return render, mask


def _compare(source_rgb, render_rgb, render_mask):
    import cv2
    import numpy as np

    mask = render_mask > 0
    coverage_raw = float(mask.mean())
    coverage = min(1.0, coverage_raw / 0.58)
    if mask.sum() < 80:
        return {
            "coverageScore": round(coverage, 4),
            "structureScore": 0.0,
            "photometricScore": 0.0,
            "score": round(0.45 * coverage, 4),
        }

    source_gray = cv2.cvtColor(source_rgb, cv2.COLOR_RGB2GRAY)
    render_gray = cv2.cvtColor(render_rgb, cv2.COLOR_RGB2GRAY)
    source_edges = cv2.Canny(source_gray, 55, 145)
    render_edges = cv2.Canny(render_gray, 55, 145)
    src_dt = cv2.distanceTransform((source_edges == 0).astype(np.uint8), cv2.DIST_L2, 3)
    rnd_dt = cv2.distanceTransform((render_edges == 0).astype(np.uint8), cv2.DIST_L2, 3)
    re = (render_edges > 0) & mask
    se = (source_edges > 0) & mask
    a = float(np.mean(np.clip(src_dt[re] / 8.0, 0, 1))) if re.any() else 1.0
    b = float(np.mean(np.clip(rnd_dt[se] / 8.0, 0, 1))) if se.any() else 1.0
    structure = max(0.0, 1.0 - (a + b) / 2.0)

    source_f = source_rgb.astype(np.float32) / 255.0
    render_f = render_rgb.astype(np.float32) / 255.0
    mae = float(np.mean(np.abs(source_f[mask] - render_f[mask])))
    photometric = max(0.0, 1.0 - mae / 0.48)
    score = 0.45 * coverage + 0.35 * structure + 0.20 * photometric
    return {
        "coverageScore": round(float(coverage), 4),
        "coverageRaw": round(float(coverage_raw), 4),
        "structureScore": round(float(structure), 4),
        "photometricScore": round(float(photometric), 4),
        "score": round(float(score), 4),
    }


def _build_qa(job_id: str):
    import cv2
    import numpy as np
    from PIL import Image, ImageOps

    job_dir = _job_dir(job_id)
    manifest_path = job_dir / "manifest.json"
    scene_path = job_dir / "scene.glb"
    photo_dir = job_dir / "photos"
    if not manifest_path.exists() or not scene_path.exists():
        raise FileNotFoundError("Room reconstruction is not ready for QA")

    manifest = _load_json(manifest_path)
    reconstruction = manifest.get("reconstruction") or {}
    alignments = reconstruction.get("alignment") or []
    alignment_by_view = {item.get("view"): item for item in alignments if item.get("view")}
    photos = manifest.get("photos") or []
    seed_name = reconstruction.get("sourceView")
    points, colors = _load_scene_points(scene_path)

    seed_record = alignment_by_view.get(seed_name, {"view": seed_name, "seed": True, "used": True})
    seed_intrinsics, seed_intrinsics_source = _normalized_intrinsics(manifest, seed_record)
    seed_photo_meta = next((p for p in photos if p.get("name") == seed_name), photos[0] if photos else None)
    if not seed_photo_meta:
        raise RuntimeError("No reference photos were recorded")
    seed_w = int(seed_photo_meta.get("width") or 768)
    seed_h = int(seed_photo_meta.get("height") or 576)

    stored_center = (reconstruction.get("mesh") or {}).get("centerOffset")
    if stored_center is not None:
        center_offset = stored_center
        center_source = "manifest"
        center_score = None
    else:
        center_offset, center_score = _estimate_center(points, seed_intrinsics, seed_w, seed_h)
        center_source = "qa_recovered"

    qa_dir = job_dir / "qa"
    render_dir = qa_dir / "renders"
    render_dir.mkdir(parents=True, exist_ok=True)
    view_reports = []
    matched_views = []
    blockers = []

    for photo_meta in photos:
        name = str(photo_meta.get("name") or "")
        camera = alignment_by_view.get(name, {})
        used = bool(camera.get("used", name == seed_name))
        if not used:
            report = {
                "view": name,
                "matched": False,
                "status": "blocked",
                "score": 0.0,
                "blockers": ["camera_not_aligned"],
            }
            view_reports.append(report)
            blockers.append({"view": name, "code": "camera_not_aligned", "severity": "major"})
            continue

        source_path = photo_dir / name
        if not source_path.exists():
            view_reports.append({"view": name, "matched": False, "status": "blocked", "score": 0.0, "blockers": ["reference_missing"]})
            blockers.append({"view": name, "code": "reference_missing", "severity": "critical"})
            continue

        intrinsics, intrinsics_source = _normalized_intrinsics(manifest, camera)
        with Image.open(source_path) as source:
            source_img = ImageOps.exif_transpose(source).convert("RGB")
            scale = min(1.0, RENDER_MAX_EDGE / max(source_img.size))
            width = max(96, int(round(source_img.width * scale)))
            height = max(72, int(round(source_img.height * scale)))
            source_img = source_img.resize((width, height), Image.Resampling.LANCZOS)
            source_rgb = np.asarray(source_img)

        render_rgb, render_mask = _render_points(points, colors, center_offset, camera, intrinsics, width, height)
        metrics = _compare(source_rgb, render_rgb, render_mask)
        codes = []
        if metrics.get("coverageRaw", 0.0) < 0.16:
            codes.append("large_uncovered_region")
            blockers.append({"view": name, "code": "large_uncovered_region", "severity": "critical"})
        if metrics["structureScore"] < 0.20:
            codes.append("weak_structure_match")
            blockers.append({"view": name, "code": "weak_structure_match", "severity": "major"})
        if metrics["score"] < 0.36:
            codes.append("low_view_similarity")
            blockers.append({"view": name, "code": "low_view_similarity", "severity": "major"})

        render_bgr = cv2.cvtColor(render_rgb, cv2.COLOR_RGB2BGR)
        cv2.imwrite(str(render_dir / f"{Path(name).stem}.jpg"), render_bgr, [cv2.IMWRITE_JPEG_QUALITY, 88])
        matched_views.append(name)
        view_reports.append({
            "view": name,
            "matched": True,
            "status": "pass" if not codes else "review_required",
            "intrinsicsSource": intrinsics_source,
            **metrics,
            "blockers": codes,
        })

    photo_count = max(1, len(photos))
    matched_camera_count = len(matched_views)
    reference_coverage = matched_camera_count / photo_count
    scored = [r["score"] for r in view_reports if r.get("matched")]
    average_score = float(np.mean(scored)) if scored else 0.0
    critical = [b for b in blockers if b["severity"] == "critical"]
    major = [b for b in blockers if b["severity"] == "major"]
    can_publish = (
        matched_camera_count >= min(3, photo_count)
        and reference_coverage >= 0.67
        and average_score >= 0.52
        and not critical
        and not major
    )
    release_status = "publishable" if can_publish else "review_required"

    payload = {
        "version": 1,
        "id": job_id,
        "status": "complete",
        "referenceCoverage": round(float(reference_coverage), 4),
        "matchedCameraCount": matched_camera_count,
        "matchedViews": matched_views,
        "averageScore": round(float(average_score), 4),
        "viewReports": view_reports,
        "blockers": blockers,
        "canPublish": bool(can_publish),
        "releaseStatus": release_status,
        "cameraOrigin": {
            "centerOffset": [round(float(v), 6) for v in center_offset],
            "source": center_source,
            "recoveryScore": center_score,
            "seedIntrinsicsSource": seed_intrinsics_source,
        },
        "policy": {
            "minimumMatchedCameras": min(3, photo_count),
            "minimumReferenceCoverage": 0.67,
            "minimumAverageScore": 0.52,
            "criticalBlockersAllowed": 0,
            "majorBlockersAllowed": 0,
        },
    }
    _write_json(qa_dir / "qa.json", payload)
    volume.commit()
    return payload


@app.function(memory=4096, timeout=180, volumes={str(VOLUME_PATH): volume})
@modal.fastapi_endpoint(method="GET")
def room_qa(id: str, refresh: bool = False):
    safe_id = _safe_id(id)
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing room id")
    volume.reload()
    qa_path = _job_dir(safe_id) / "qa" / "qa.json"
    if qa_path.exists() and not refresh:
        return _load_json(qa_path)
    try:
        return _build_qa(safe_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Matched-camera QA failed: {str(exc)[:700]}") from exc
