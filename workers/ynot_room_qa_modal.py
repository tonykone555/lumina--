import json
from pathlib import Path

import modal
from fastapi import HTTPException
from fastapi.responses import FileResponse

APP_NAME = "ynot-room-qa"
VOLUME_PATH = Path("/ynot-room")
MAX_RENDER_POINTS = 90000
RENDER_MAX_EDGE = 420
ASSET_KINDS = {"render", "heatmap", "edges"}

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("libgl1", "libglib2.0-0")
    .uv_pip_install("fastapi[standard]", "numpy", "pillow", "opencv-python-headless", "trimesh")
)
app = modal.App(APP_NAME, image=image)
volume = modal.Volume.from_name("ynot-room-jobs", create_if_missing=True)


def _safe_id(value: str) -> str:
    return "".join(ch for ch in str(value) if ch.isalnum() or ch in "-_")[:80]


def _safe_view(value: str) -> str:
    return "".join(ch for ch in Path(str(value)).stem if ch.isalnum() or ch in "-_")[:80]


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
    vertices, colors = [], []
    if isinstance(loaded, trimesh.Scene):
        for node_name in loaded.graph.nodes_geometry:
            transform, geometry_name = loaded.graph[node_name]
            geometry = loaded.geometry.get(geometry_name)
            if geometry is None or len(geometry.vertices) == 0:
                continue
            pts = trimesh.transform_points(geometry.vertices, transform)
            color = getattr(getattr(geometry, "visual", None), "vertex_colors", None)
            rgb = np.full((len(pts), 3), 180, dtype=np.uint8) if color is None or len(color) != len(pts) else np.asarray(color, dtype=np.uint8)[:, :3]
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


def _normalized_intrinsics(manifest, alignment=None):
    if alignment and alignment.get("intrinsics") is not None:
        return alignment["intrinsics"], "per_view"
    seed = (manifest.get("reconstruction") or {}).get("seedIntrinsics")
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
    camera_points, depth, colors = camera_points[valid], depth[valid], colors[valid]
    if len(camera_points) == 0:
        return None
    k = np.asarray(intrinsics, dtype=np.float64)
    u = float(k[0, 0]) * width * camera_points[:, 0] / depth + float(k[0, 2]) * width
    v = float(k[1, 1]) * height * camera_points[:, 1] / depth + float(k[1, 2]) * height
    inside = (u >= 0) & (u < width) & (v >= 0) & (v < height)
    if not inside.any():
        return None
    return u[inside], v[inside], depth[inside], colors[inside]


def _occupancy_score(points, center_offset, intrinsics, width, height):
    import numpy as np

    colors = np.zeros((len(points), 3), dtype=np.uint8)
    projected = _project(points, colors, center_offset, np.eye(3), np.zeros(3), intrinsics, width, height)
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
    qx, qy = np.percentile(u, [5, 95]), np.percentile(v, [5, 95])
    bbox_x = max(0.0, min(1.0, (qx[1] - qx[0]) / max(1.0, width)))
    bbox_y = max(0.0, min(1.0, (qy[1] - qy[0]) / max(1.0, height)))
    return float(0.55 * occupied + 0.25 * inside_ratio + 0.20 * bbox_x * bbox_y)


def _estimate_center(points, intrinsics, width, height):
    import numpy as np

    low, high = np.percentile(points, 2.0, axis=0), np.percentile(points, 98.0, axis=0)
    size = np.maximum(high - low, 0.2)
    xs = np.linspace(low[0] + 0.15 * size[0], high[0] - 0.15 * size[0], 4)
    ys = np.linspace(low[1] + 0.15 * size[1], high[1] - 0.15 * size[1], 4)
    zs = np.linspace(high[2] + max(0.1, 0.04 * size[2]), high[2] + max(1.2, 0.65 * size[2]), 7)
    best_score, best_camera = -1.0, np.array([0.0, 0.0, zs[0]])
    for px in xs:
        for py in ys:
            for pz in zs:
                camera = np.array([px, py, pz], dtype=np.float64)
                score = _occupancy_score(points, -camera, intrinsics, width, height)
                if score > best_score:
                    best_score, best_camera = score, camera
    steps = np.maximum(size * np.array([0.10, 0.10, 0.08]), np.array([0.15, 0.15, 0.15]))
    for _ in range(2):
        origin = best_camera.copy()
        for dx in (-steps[0], 0.0, steps[0]):
            for dy in (-steps[1], 0.0, steps[1]):
                for dz in (-steps[2], 0.0, steps[2]):
                    candidate = origin + np.array([dx, dy, dz])
                    score = _occupancy_score(points, -candidate, intrinsics, width, height)
                    if score > best_score:
                        best_score, best_camera = score, candidate
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
    render[y[chosen], x[chosen]] = rgb[chosen]
    mask[y[chosen], x[chosen]] = 255
    kernel = np.ones((3, 3), dtype=np.uint8)
    for _ in range(2):
        render = cv2.dilate(render, kernel, iterations=1)
        mask = cv2.dilate(mask, kernel, iterations=1)
    return cv2.GaussianBlur(render, (3, 3), 0), mask


def _compare(source_rgb, render_rgb, render_mask):
    import cv2
    import numpy as np

    mask = render_mask > 0
    coverage_raw = float(mask.mean())
    coverage = min(1.0, coverage_raw / 0.58)
    if mask.sum() < 80:
        return {"coverageScore": round(coverage, 4), "coverageRaw": round(coverage_raw, 4), "structureScore": 0.0, "photometricScore": 0.0, "score": round(0.45 * coverage, 4)}
    source_gray = cv2.cvtColor(source_rgb, cv2.COLOR_RGB2GRAY)
    render_gray = cv2.cvtColor(render_rgb, cv2.COLOR_RGB2GRAY)
    source_edges, render_edges = cv2.Canny(source_gray, 55, 145), cv2.Canny(render_gray, 55, 145)
    src_dt = cv2.distanceTransform((source_edges == 0).astype(np.uint8), cv2.DIST_L2, 3)
    rnd_dt = cv2.distanceTransform((render_edges == 0).astype(np.uint8), cv2.DIST_L2, 3)
    re, se = (render_edges > 0) & mask, (source_edges > 0) & mask
    a = float(np.mean(np.clip(src_dt[re] / 8.0, 0, 1))) if re.any() else 1.0
    b = float(np.mean(np.clip(rnd_dt[se] / 8.0, 0, 1))) if se.any() else 1.0
    structure = max(0.0, 1.0 - (a + b) / 2.0)
    source_f, render_f = source_rgb.astype(np.float32) / 255.0, render_rgb.astype(np.float32) / 255.0
    mae = float(np.mean(np.abs(source_f[mask] - render_f[mask])))
    photometric = max(0.0, 1.0 - mae / 0.48)
    score = 0.45 * coverage + 0.35 * structure + 0.20 * photometric
    return {"coverageScore": round(float(coverage), 4), "coverageRaw": round(float(coverage_raw), 4), "structureScore": round(float(structure), 4), "photometricScore": round(float(photometric), 4), "score": round(float(score), 4)}


def _evidence_images(source_rgb, render_rgb, render_mask):
    import cv2
    import numpy as np

    mask = render_mask > 0
    diff = np.mean(np.abs(source_rgb.astype(np.float32) - render_rgb.astype(np.float32)), axis=2)
    diff[~mask] = 255.0
    heat = cv2.cvtColor(cv2.applyColorMap(np.clip(diff, 0, 255).astype(np.uint8), cv2.COLORMAP_TURBO), cv2.COLOR_BGR2RGB)
    heat = cv2.addWeighted(source_rgb, 0.42, heat, 0.58, 0)
    src_edges = cv2.Canny(cv2.cvtColor(source_rgb, cv2.COLOR_RGB2GRAY), 55, 145)
    rnd_edges = cv2.Canny(cv2.cvtColor(render_rgb, cv2.COLOR_RGB2GRAY), 55, 145)
    overlay = (source_rgb.astype(np.float32) * 0.32).astype(np.uint8)
    overlay[src_edges > 0] = [70, 230, 120]
    overlay[rnd_edges > 0] = [255, 85, 85]
    overlay[(src_edges > 0) & (rnd_edges > 0)] = [245, 225, 80]
    return heat, overlay


def _build_qa(job_id: str):
    import cv2
    import numpy as np
    from PIL import Image, ImageOps

    job_dir = _job_dir(job_id)
    manifest_path, scene_path, photo_dir = job_dir / "manifest.json", job_dir / "scene.glb", job_dir / "photos"
    if not manifest_path.exists() or not scene_path.exists():
        raise FileNotFoundError("Room reconstruction is not ready for QA")
    manifest = _load_json(manifest_path)
    reconstruction = manifest.get("reconstruction") or {}
    alignments = reconstruction.get("alignment") or []
    alignment_by_view = {item.get("view"): item for item in alignments if item.get("view")}
    photos, seed_name = manifest.get("photos") or [], reconstruction.get("sourceView")
    points, colors = _load_scene_points(scene_path)
    seed_record = alignment_by_view.get(seed_name, {"view": seed_name, "seed": True, "used": True})
    seed_intrinsics, seed_intrinsics_source = _normalized_intrinsics(manifest, seed_record)
    seed_meta = next((p for p in photos if p.get("name") == seed_name), photos[0] if photos else None)
    if not seed_meta:
        raise RuntimeError("No reference photos were recorded")
    stored_center = (reconstruction.get("mesh") or {}).get("centerOffset")
    if stored_center is not None:
        center_offset, center_source, center_score = stored_center, "manifest", None
    else:
        center_offset, center_score = _estimate_center(points, seed_intrinsics, int(seed_meta.get("width") or 768), int(seed_meta.get("height") or 576))
        center_source = "qa_recovered"

    qa_dir = job_dir / "qa"
    asset_dirs = {kind: qa_dir / kind for kind in ASSET_KINDS}
    for directory in asset_dirs.values():
        directory.mkdir(parents=True, exist_ok=True)
    reports, matched_views, blockers = [], [], []

    for photo_meta in photos:
        name = str(photo_meta.get("name") or "")
        view_key = _safe_view(name)
        camera = alignment_by_view.get(name, {})
        used = bool(camera.get("used", name == seed_name))
        if not used:
            reports.append({"view": name, "viewKey": view_key, "matched": False, "status": "blocked", "score": 0.0, "blockers": ["camera_not_aligned"]})
            blockers.append({"view": name, "code": "camera_not_aligned", "severity": "major"})
            continue
        source_path = photo_dir / name
        if not source_path.exists():
            reports.append({"view": name, "viewKey": view_key, "matched": False, "status": "blocked", "score": 0.0, "blockers": ["reference_missing"]})
            blockers.append({"view": name, "code": "reference_missing", "severity": "critical"})
            continue
        intrinsics, intrinsics_source = _normalized_intrinsics(manifest, camera)
        with Image.open(source_path) as source:
            source_img = ImageOps.exif_transpose(source).convert("RGB")
            scale = min(1.0, RENDER_MAX_EDGE / max(source_img.size))
            width, height = max(96, round(source_img.width * scale)), max(72, round(source_img.height * scale))
            source_rgb = np.asarray(source_img.resize((width, height), Image.Resampling.LANCZOS))
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
        heat_rgb, edges_rgb = _evidence_images(source_rgb, render_rgb, render_mask)
        assets = {"render": asset_dirs["render"] / f"{view_key}.jpg", "heatmap": asset_dirs["heatmap"] / f"{view_key}.jpg", "edges": asset_dirs["edges"] / f"{view_key}.jpg"}
        cv2.imwrite(str(assets["render"]), cv2.cvtColor(render_rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
        cv2.imwrite(str(assets["heatmap"]), cv2.cvtColor(heat_rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
        cv2.imwrite(str(assets["edges"]), cv2.cvtColor(edges_rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
        matched_views.append(name)
        reports.append({"view": name, "viewKey": view_key, "matched": True, "status": "pass" if not codes else "review_required", "intrinsicsSource": intrinsics_source, **metrics, "blockers": codes, "assets": {kind: kind for kind in ASSET_KINDS}})

    photo_count = max(1, len(photos))
    reference_coverage = len(matched_views) / photo_count
    scored = [r["score"] for r in reports if r.get("matched")]
    average_score = float(np.mean(scored)) if scored else 0.0
    critical = [b for b in blockers if b["severity"] == "critical"]
    major = [b for b in blockers if b["severity"] == "major"]
    can_publish = len(matched_views) >= min(3, photo_count) and reference_coverage >= 0.67 and average_score >= 0.52 and not critical and not major
    payload = {
        "version": 2,
        "id": job_id,
        "status": "complete",
        "referenceCoverage": round(float(reference_coverage), 4),
        "matchedCameraCount": len(matched_views),
        "matchedViews": matched_views,
        "averageScore": round(float(average_score), 4),
        "viewReports": reports,
        "blockers": blockers,
        "canPublish": bool(can_publish),
        "releaseStatus": "publishable" if can_publish else "review_required",
        "cameraOrigin": {"centerOffset": [round(float(v), 6) for v in center_offset], "source": center_source, "recoveryScore": center_score, "seedIntrinsicsSource": seed_intrinsics_source},
        "policy": {"minimumMatchedCameras": min(3, photo_count), "minimumReferenceCoverage": 0.67, "minimumAverageScore": 0.52, "criticalBlockersAllowed": 0, "majorBlockersAllowed": 0},
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


@app.function(memory=1024, timeout=30, volumes={str(VOLUME_PATH): volume})
@modal.fastapi_endpoint(method="GET")
def room_qa_asset(id: str, view: str, kind: str):
    safe_id, safe_view, safe_kind = _safe_id(id), _safe_view(view), str(kind or "").strip().lower()
    if not safe_id or not safe_view or safe_kind not in ASSET_KINDS:
        raise HTTPException(status_code=400, detail="Invalid QA asset request")
    volume.reload()
    path = _job_dir(safe_id) / "qa" / safe_kind / f"{safe_view}.jpg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="QA evidence image not found")
    return FileResponse(path, media_type="image/jpeg", filename=f"ynot-room-{safe_id}-{safe_view}-{safe_kind}.jpg", headers={"Cache-Control": "private, max-age=3600"})
