import json
from collections import defaultdict
from pathlib import Path

import modal
from fastapi import HTTPException

APP_NAME = "ynot-room-objects"
VOLUME_PATH = Path("/ynot-room")
MODEL_PATH = Path("/object-models")
MOGE_PATH = Path("/models")
DETECTOR_ID = "IDEA-Research/grounding-dino-tiny"
MOGE_ID = "Ruicheng/moge-2-vits-normal"

CATEGORIES = {
    "sofa": ["sofa", "couch", "sectional sofa", "loveseat"],
    "armchair": ["armchair", "lounge chair", "accent chair"],
    "chair": ["chair", "dining chair", "office chair"],
    "coffee-table": ["coffee table"],
    "dining-table": ["dining table", "table"],
    "bed": ["bed", "bed frame"],
    "cabinet": ["cabinet", "dresser", "wardrobe"],
    "sideboard": ["sideboard", "console table"],
    "rug": ["rug", "carpet"],
    "lamp": ["floor lamp", "table lamp", "lamp"],
    "chandelier": ["chandelier", "pendant light"],
    "mirror": ["mirror"],
    "television": ["television", "tv"],
    "ottoman": ["ottoman", "footstool"],
    "bench": ["bench"],
    "bookshelf": ["bookshelf", "bookcase", "shelving unit"],
}

FLOOR_SUPPORTED = {"sofa", "armchair", "chair", "coffee-table", "dining-table", "bed", "cabinet", "sideboard", "rug", "lamp", "ottoman", "bench", "bookshelf"}
MIN_SIZE = {
    "sofa": (1.2, 0.65, 0.55), "armchair": (0.55, 0.65, 0.5), "chair": (0.4, 0.55, 0.4),
    "coffee-table": (0.5, 0.25, 0.35), "dining-table": (0.8, 0.55, 0.55), "bed": (1.2, 0.45, 1.7),
    "cabinet": (0.5, 0.6, 0.3), "sideboard": (0.7, 0.55, 0.3), "rug": (0.8, 0.03, 0.8),
    "lamp": (0.2, 0.5, 0.2), "chandelier": (0.25, 0.25, 0.25), "mirror": (0.25, 0.35, 0.03),
    "television": (0.45, 0.3, 0.04), "ottoman": (0.35, 0.25, 0.35), "bench": (0.65, 0.35, 0.3),
    "bookshelf": (0.5, 0.8, 0.25),
}

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .uv_pip_install(
        "fastapi[standard]", "pillow", "numpy", "torch", "torchvision", "transformers", "accelerate",
        "huggingface_hub", "git+https://github.com/microsoft/MoGe.git"
    )
    .env({"HF_HOME": str(MODEL_PATH)})
)
app = modal.App(APP_NAME, image=image)
volume = modal.Volume.from_name("ynot-room-jobs", create_if_missing=True)
object_models = modal.Volume.from_name("ynot-room-object-model-cache", create_if_missing=True)
moge_models = modal.Volume.from_name("ynot-room-model-cache", create_if_missing=True)


def _safe_id(value: str) -> str:
    return "".join(ch for ch in str(value) if ch.isalnum() or ch in "-_")[:80]


def _job_dir(job_id: str) -> Path:
    return VOLUME_PATH / "jobs" / job_id


def _read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _canonical_label(raw: str):
    text = str(raw or "").lower().strip().replace(".", "")
    best = None
    for category, aliases in CATEGORIES.items():
        for alias in aliases:
            if alias in text or text in alias:
                if best is None or len(alias) > best[0]:
                    best = (len(alias), category)
    return best[1] if best else None


def _load_image(path: Path, max_edge=960):
    from PIL import Image, ImageOps
    image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if max(image.size) > max_edge:
        ratio = max_edge / max(image.size)
        image = image.resize((max(1, round(image.width * ratio)), max(1, round(image.height * ratio))), Image.Resampling.LANCZOS)
    return image


def _detect(image, processor, detector):
    import torch
    prompt = ". ".join(alias for aliases in CATEGORIES.values() for alias in aliases) + "."
    inputs = processor(images=image, text=prompt, return_tensors="pt").to("cuda")
    with torch.inference_mode():
        outputs = detector(**inputs)
    result = processor.post_process_grounded_object_detection(
        outputs,
        inputs.input_ids,
        threshold=0.30,
        text_threshold=0.24,
        target_sizes=[(image.height, image.width)],
    )[0]
    text_labels = result.get("text_labels") or result.get("labels") or []
    detections = []
    for score, label, box in zip(result["scores"], text_labels, result["boxes"]):
        category = _canonical_label(label)
        if not category:
            continue
        x1, y1, x2, y2 = [float(v) for v in box.tolist()]
        if x2 - x1 < 20 or y2 - y1 < 20:
            continue
        detections.append({"category": category, "label": str(label), "confidence": float(score), "box": [x1, y1, x2, y2]})
    detections.sort(key=lambda item: item["confidence"], reverse=True)
    kept = []
    for candidate in detections:
        x1, y1, x2, y2 = candidate["box"]
        area = max(1.0, (x2 - x1) * (y2 - y1))
        duplicate = False
        for existing in kept:
            if existing["category"] != candidate["category"]:
                continue
            a1, b1, a2, b2 = existing["box"]
            inter = max(0.0, min(x2, a2) - max(x1, a1)) * max(0.0, min(y2, b2) - max(y1, b1))
            union = area + max(1.0, (a2 - a1) * (b2 - b1)) - inter
            if inter / max(1.0, union) > 0.55:
                duplicate = True
                break
        if not duplicate:
            kept.append(candidate)
        if len(kept) >= 18:
            break
    return kept


def _lift(detections, points, mask, center_offset, floor_height=None):
    import numpy as np
    h, w = mask.shape
    axis = np.array([1.0, -1.0, -1.0], dtype=np.float64)
    center_offset = np.asarray(center_offset, dtype=np.float64).reshape(1, 3)
    lifted = []
    for detection in detections:
        x1, y1, x2, y2 = detection["box"]
        ix1 = max(0, min(w - 1, int(x1)))
        iy1 = max(0, min(h - 1, int(y1)))
        ix2 = max(ix1 + 1, min(w, int(x2)))
        iy2 = max(iy1 + 1, min(h, int(y2)))
        crop_points = points[iy1:iy2, ix1:ix2]
        crop_mask = mask[iy1:iy2, ix1:ix2]
        valid = crop_mask & np.isfinite(crop_points).all(axis=-1) & (crop_points[..., 2] > 0.05)
        cloud = crop_points[valid]
        if len(cloud) < 50:
            continue
        depth = cloud[:, 2]
        median_depth = float(np.median(depth))
        near = cloud[(depth >= np.percentile(depth, 8)) & (depth <= min(np.percentile(depth, 72), median_depth * 1.22))]
        if len(near) < 35:
            near = cloud
        glb = near * axis.reshape(1, 3) - center_offset
        low = np.percentile(glb, 8, axis=0)
        high = np.percentile(glb, 92, axis=0)
        raw_size = np.maximum(high - low, 0.02)
        minimum = np.asarray(MIN_SIZE.get(detection["category"], (0.2, 0.2, 0.2)))
        size = np.maximum(raw_size, minimum)
        position = (low + high) / 2
        if floor_height is not None and detection["category"] in FLOOR_SUPPORTED:
            position[1] = float(floor_height) + size[1] / 2
        lifted.append({
            **detection,
            "position": [round(float(v), 4) for v in position],
            "size": [round(float(v), 4) for v in size],
            "rotationY": 0.0,
            "support": "floor" if detection["category"] in FLOOR_SUPPORTED else "wall_or_ceiling",
            "pointCount": int(len(near)),
        })
    return lifted


def _stable_ids(objects):
    counters = defaultdict(int)
    objects = sorted(objects, key=lambda item: (item["category"], round(item["position"][0], 2), round(item["position"][2], 2)))
    for item in objects:
        counters[item["category"]] += 1
        item["id"] = f'{item["category"]}-{counters[item["category"]]:02d}'
    return objects


def _run(job_id: str):
    import numpy as np
    import torch
    from moge.model import import_model_class_by_version
    from transformers import AutoModelForZeroShotObjectDetection, AutoProcessor

    volume.reload()
    job = _job_dir(job_id)
    manifest_path = job / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError("Room reconstruction manifest not found")
    manifest = _read_json(manifest_path)
    reconstruction = manifest.get("reconstruction") or {}
    seed_name = reconstruction.get("sourceView")
    center_offset = ((reconstruction.get("mesh") or {}).get("centerOffset"))
    if not seed_name:
        raise RuntimeError("Room reconstruction does not identify a seed view")
    if not center_offset:
        raise RuntimeError("Room scene transform is missing; rerun reconstruction with the current worker")
    seed_path = job / "photos" / seed_name
    if not seed_path.exists():
        raise FileNotFoundError("Room source view is unavailable")

    source = _load_image(seed_path)
    detector_processor = AutoProcessor.from_pretrained(DETECTOR_ID)
    detector = AutoModelForZeroShotObjectDetection.from_pretrained(DETECTOR_ID).cuda().eval()
    detections = _detect(source, detector_processor, detector)

    image_np = np.asarray(source)
    moge = import_model_class_by_version("v2").from_pretrained(MOGE_ID).cuda().eval()
    tensor = torch.tensor(image_np, dtype=torch.float16, device="cuda").permute(2, 0, 1) / 255
    with torch.inference_mode():
        output = moge.infer(tensor, resolution_level=5, use_fp16=True, apply_mask=True)
    points = output["points"].float().cpu().numpy()
    mask = output["mask"].cpu().numpy().astype(bool)

    floor_height = None
    room_path = job / "room.json"
    if room_path.exists():
        try:
            room = _read_json(room_path)
            floor_height = (((room.get("structure") or {}).get("floor") or {}).get("estimatedHeight"))
        except Exception:
            floor_height = None

    objects = _stable_ids(_lift(detections, points, mask, center_offset, floor_height))
    payload = {
        "version": 1,
        "id": job_id,
        "status": "complete",
        "sourceView": seed_name,
        "detector": DETECTOR_ID,
        "objectCount": len(objects),
        "objects": [
            {
                "id": item["id"], "category": item["category"], "label": item["label"],
                "confidence": round(item["confidence"], 4), "position": item["position"], "size": item["size"],
                "rotationY": item["rotationY"], "support": item["support"],
                "evidence": [{"view": seed_name, "box": [round(v, 1) for v in item["box"]], "score": round(item["confidence"], 4)}],
                "geometryConfidence": "approximate", "catalogueMatches": [],
            }
            for item in objects
        ],
        "measurementDisclaimer": "Furniture positions and dimensions are reconstruction-derived visual estimates, not architectural measurements.",
    }
    _write_json(job / "objects.json", payload)
    if room_path.exists():
        try:
            room = _read_json(room_path)
            room["objects"] = payload["objects"]
            room["objectMapping"] = {"status": "detected", "objectCount": len(objects), "nextStage": "catalogue_matching"}
            _write_json(room_path, room)
        except Exception:
            pass
    volume.commit()
    return payload


@app.function(
    image=image,
    gpu="A10G",
    memory=16384,
    timeout=900,
    scaledown_window=300,
    volumes={str(VOLUME_PATH): volume, str(MODEL_PATH): object_models, str(MOGE_PATH): moge_models},
)
@modal.fastapi_endpoint(method="GET")
def room_objects(id: str, refresh: bool = False):
    safe = _safe_id(id)
    if not safe:
        raise HTTPException(status_code=400, detail="Missing room id")
    volume.reload()
    cached = _job_dir(safe) / "objects.json"
    if cached.exists() and not refresh:
        return _read_json(cached)
    try:
        return _run(safe)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Room object detection failed: {str(exc)[:700]}") from exc
