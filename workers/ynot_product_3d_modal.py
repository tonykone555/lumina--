import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlparse

import modal
from fastapi import HTTPException, Request
from fastapi.responses import Response

APP_NAME = "ynot-product-3d"
MODEL_ID = "stabilityai/stable-point-aware-3d"
CACHE_PATH = Path("/product3d")
HF_PATH = Path("/hf")
ROOM_PATH = Path("/ynot-room")
VERCEL_PROJECT_ID = "prj_xDNNAY7MBUIbDHLaJkOdPsUz2C7X"
VERCEL_OWNER_ID = "team_9yqHjLzE6wUmudwIHFS4EutR"
VERCEL_OWNER = "tonykone555s-projects"
GITHUB_REPOSITORY = "tonykone555/lumina--"
GITHUB_AUDIENCE = "ynot-room-modal"
ALLOWED_IMAGE_HOSTS = {"cdn.shopify.com"}

spar3d_image = (
    modal.Image.from_registry("nvidia/cuda:12.4.1-devel-ubuntu22.04", add_python="3.11")
    .apt_install("git", "build-essential", "libgl1", "libglib2.0-0", "libegl1", "libx11-6")
    .run_commands(
        "python -m pip install -U pip setuptools==69.5.1 wheel",
        "python -m pip install --extra-index-url https://download.pytorch.org/whl/cu124 torch==2.5.1 torchvision==0.20.1",
        "git clone --depth 1 https://github.com/Stability-AI/stable-point-aware-3d.git /opt/spar3d",
        "cd /opt/spar3d && python -m pip install -r requirements.txt",
        "python -m pip install fastapi[standard] requests PyJWT[crypto]",
    )
    .env({"PYTHONPATH": "/opt/spar3d", "HF_HOME": str(HF_PATH), "SPAR3D_LOW_VRAM": "0"})
)

light_image = modal.Image.debian_slim(python_version="3.12").uv_pip_install(
    "fastapi[standard]", "PyJWT[crypto]"
)

app = modal.App(APP_NAME)
cache = modal.Volume.from_name("ynot-product-3d-cache", create_if_missing=True)
hf_cache = modal.Volume.from_name("ynot-spar3d-model-cache", create_if_missing=True)
room_volume = modal.Volume.from_name("ynot-room-jobs", create_if_missing=True)
hf_secret = modal.Secret.from_name("ynot-huggingface")


def _safe_key(product_id: str) -> str:
    return hashlib.sha256(str(product_id).encode("utf-8")).hexdigest()[:32]


def _asset_dir(key: str) -> Path:
    return CACHE_PATH / "assets" / key


def _read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _verify_jwt(token: str, issuer: str, audience: str) -> dict:
    import jwt
    from jwt import PyJWKClient

    jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks"
    signing_key = PyJWKClient(jwks_url).get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=audience,
        issuer=issuer,
        options={"require": ["exp", "iat", "iss", "aud"]},
    )


def _authorize(request: Request) -> str:
    expected_token = os.environ.get("YNOT_ROOM_TOKEN", "").strip()
    authorization = request.headers.get("authorization", "")
    if expected_token and authorization == f"Bearer {expected_token}":
        return "shared-secret"

    vercel_token = request.headers.get("x-vercel-oidc-token", "").strip()
    if vercel_token:
        try:
            import jwt

            unverified = jwt.decode(vercel_token, options={"verify_signature": False})
            issuer = str(unverified.get("iss") or "").rstrip("/")
            allowed_issuers = {"https://oidc.vercel.com", f"https://oidc.vercel.com/{VERCEL_OWNER}"}
            if issuer not in allowed_issuers:
                raise ValueError("unexpected Vercel issuer")
            claims = _verify_jwt(vercel_token, issuer, f"https://vercel.com/{VERCEL_OWNER}")
            if claims.get("project_id") != VERCEL_PROJECT_ID or claims.get("owner_id") != VERCEL_OWNER_ID:
                raise ValueError("unexpected Vercel identity")
            if claims.get("project") != "lumina--":
                raise ValueError("unexpected Vercel project")
            return "vercel-oidc"
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid Vercel identity") from exc

    github_token = request.headers.get("x-github-oidc-token", "").strip()
    if github_token:
        try:
            claims = _verify_jwt(github_token, "https://token.actions.githubusercontent.com", GITHUB_AUDIENCE)
            if claims.get("repository") != GITHUB_REPOSITORY:
                raise ValueError("unexpected GitHub repository")
            if claims.get("ref") not in {"refs/heads/feat/ynot-room-poc", "refs/heads/main"}:
                raise ValueError("unexpected GitHub ref")
            return "github-oidc"
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid GitHub Actions identity") from exc

    raise HTTPException(status_code=401, detail="Authenticated server identity required")


def _validate_image_url(value: str) -> str:
    try:
        parsed = urlparse(value)
    except Exception as exc:
        raise ValueError("Invalid product image URL") from exc
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_IMAGE_HOSTS:
        raise ValueError("Only Shopify CDN product images are accepted")
    return value


def _status(key: str):
    cache.reload()
    status_path = _asset_dir(key) / "status.json"
    return _read_json(status_path) if status_path.exists() else None


@app.function(
    image=spar3d_image,
    gpu="A10G",
    memory=24576,
    timeout=1200,
    scaledown_window=300,
    volumes={str(CACHE_PATH): cache, str(HF_PATH): hf_cache},
    secrets=[hf_secret],
)
def generate_product(product_id: str, image_url: str, title: str = "", category: str = "sofa"):
    import numpy as np
    import requests
    import torch
    import trimesh
    from PIL import Image
    from transparent_background import Remover
    from spar3d.system import SPAR3D
    from spar3d.utils import foreground_crop, remove_background

    key = _safe_key(product_id)
    directory = _asset_dir(key)
    directory.mkdir(parents=True, exist_ok=True)
    asset_path = directory / "asset.glb"
    status_path = directory / "status.json"

    cache.reload()
    if asset_path.exists() and status_path.exists():
        existing = _read_json(status_path)
        if existing.get("status") == "ready":
            return existing

    _write_json(status_path, {"productId": product_id, "key": key, "status": "generating", "stage": "download"})
    cache.commit()

    try:
        image_url = _validate_image_url(image_url)
        response = requests.get(image_url, timeout=30, headers={"User-Agent": "YNOT-Room/1.0"})
        response.raise_for_status()
        if len(response.content) > 15 * 1024 * 1024:
            raise RuntimeError("Product image is too large")
        source_path = directory / "source.jpg"
        source_path.write_bytes(response.content)

        _write_json(status_path, {"productId": product_id, "key": key, "status": "generating", "stage": "spar3d"})
        cache.commit()

        model = SPAR3D.from_pretrained(
            MODEL_ID,
            config_name="config.yaml",
            weight_name="model.safetensors",
            low_vram_mode=False,
        ).to("cuda").eval()
        remover = Remover(device="cuda")
        image = remove_background(Image.open(source_path).convert("RGBA"), remover)
        image = foreground_crop(image, 1.3)

        with torch.inference_mode(), torch.autocast(device_type="cuda", dtype=torch.bfloat16):
            mesh, _ = model.run_image(
                [image],
                bake_resolution=1024,
                remesh="none",
                vertex_count=-1,
                return_points=False,
            )

        if isinstance(mesh, (list, tuple)):
            mesh = mesh[0]
        if getattr(mesh, "vertices", np.empty((0, 3))).shape[0] == 0:
            raise RuntimeError("SPAR3D returned an empty mesh")

        bounds = np.asarray(mesh.bounds, dtype=np.float64)
        center_x = float((bounds[0, 0] + bounds[1, 0]) / 2)
        center_z = float((bounds[0, 2] + bounds[1, 2]) / 2)
        floor_y = float(bounds[0, 1])
        mesh.apply_translation([-center_x, -floor_y, -center_z])
        extents = np.asarray(mesh.extents, dtype=np.float64)
        if not np.isfinite(extents).all() or np.any(extents <= 0):
            raise RuntimeError("SPAR3D produced invalid mesh bounds")

        scene = trimesh.Scene(mesh)
        scene.export(asset_path, file_type="glb")
        size_bytes = asset_path.stat().st_size
        result = {
            "productId": product_id,
            "key": key,
            "status": "ready",
            "stage": "complete",
            "generator": "spar3d",
            "model": MODEL_ID,
            "title": str(title)[:240],
            "category": str(category)[:60],
            "dimensions": [round(float(v), 5) for v in extents],
            "bytes": int(size_bytes),
            "assetPath": f"/assets/{key}/asset.glb",
        }
        _write_json(status_path, result)
        cache.commit()
        return result
    except Exception as exc:
        error = {
            "productId": product_id,
            "key": key,
            "status": "failed",
            "stage": "failed",
            "error": str(exc)[:900],
        }
        _write_json(status_path, error)
        cache.commit()
        raise


@app.function(image=light_image, memory=1024, timeout=45, scaledown_window=60, volumes={str(CACHE_PATH): cache})
@modal.fastapi_endpoint(method="POST")
async def submit_product(request: Request):
    auth_source = _authorize(request)
    body = await request.json()
    product_id = str(body.get("productId") or "").strip()[:300]
    image_url = str(body.get("imageUrl") or "").strip()
    title = str(body.get("title") or "")[:240]
    category = str(body.get("category") or "sofa")[:60]
    if not product_id:
        raise HTTPException(status_code=400, detail="productId is required")
    try:
        image_url = _validate_image_url(image_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    key = _safe_key(product_id)
    existing = _status(key)
    if existing and existing.get("status") == "ready":
        return {**existing, "cached": True, "auth": auth_source}
    if existing and existing.get("status") == "generating":
        return {**existing, "cached": False, "auth": auth_source}

    directory = _asset_dir(key)
    directory.mkdir(parents=True, exist_ok=True)
    queued = {
        "productId": product_id,
        "key": key,
        "status": "queued",
        "stage": "queued",
        "generator": "spar3d",
        "cached": False,
    }
    _write_json(directory / "status.json", queued)
    cache.commit()
    call = generate_product.spawn(product_id, image_url, title, category)
    _write_json(directory / "call.json", {"functionCallId": call.object_id})
    cache.commit()
    return {**queued, "auth": auth_source}


@app.function(image=light_image, memory=512, timeout=30, scaledown_window=60, volumes={str(CACHE_PATH): cache})
@modal.fastapi_endpoint(method="GET")
def product_status(id: str = ""):
    if not id:
        return {"ok": True, "worker": APP_NAME, "generator": "spar3d", "model": MODEL_ID}
    key = _safe_key(id)
    existing = _status(key)
    if not existing:
        raise HTTPException(status_code=404, detail="Product 3D asset not found")
    return existing


@app.function(image=light_image, memory=512, timeout=30, scaledown_window=60, volumes={str(CACHE_PATH): cache})
@modal.fastapi_endpoint(method="GET")
def product_asset(id: str):
    key = _safe_key(id)
    cache.reload()
    path = _asset_dir(key) / "asset.glb"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Product 3D asset is not ready")
    return Response(
        content=path.read_bytes(),
        media_type="model/gltf-binary",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@app.function(image=light_image, memory=1024, timeout=45, scaledown_window=60, volumes={str(CACHE_PATH): cache, str(ROOM_PATH): room_volume})
@modal.fastapi_endpoint(method="POST")
async def set_replacement(request: Request):
    _authorize(request)
    body = await request.json()
    room_id = "".join(ch for ch in str(body.get("roomId") or "") if ch.isalnum() or ch in "-_")[:80]
    object_id = str(body.get("objectId") or "")[:100]
    product_id = str(body.get("productId") or "")[:300]
    if not room_id or not object_id or not product_id:
        raise HTTPException(status_code=400, detail="roomId, objectId and productId are required")

    key = _safe_key(product_id)
    asset = _status(key)
    if not asset or asset.get("status") != "ready":
        raise HTTPException(status_code=409, detail="Product 3D asset is not ready")

    room_volume.reload()
    room_dir = ROOM_PATH / "jobs" / room_id
    objects_path = room_dir / "objects.json"
    if not objects_path.exists():
        raise HTTPException(status_code=404, detail="Room furniture objects are not ready")
    objects_payload = _read_json(objects_path)
    objects = objects_payload.get("objects") or []
    target = next((item for item in objects if str(item.get("id")) == object_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Room object not found")

    native = [max(float(v), 1e-4) for v in (asset.get("dimensions") or [1, 1, 1])]
    target_size = [max(float(v), 1e-4) for v in (target.get("size") or [1, 1, 1])]
    scale = [round(max(0.12, min(8.0, target_size[i] / native[i])), 5) for i in range(3)]
    position = [float(v) for v in (target.get("position") or [0, 0, 0])]
    position[1] = position[1] - target_size[1] / 2
    replacement = {
        "objectId": object_id,
        "productId": product_id,
        "assetKey": key,
        "assetUrl": f"/api/room/products/{product_id}/asset/file",
        "position": [round(v, 5) for v in position],
        "rotationY": round(float(target.get("rotationY") or 0), 5),
        "scale": scale,
        "targetSize": target_size,
        "nativeDimensions": native,
        "generator": "spar3d",
    }
    replacements_path = room_dir / "replacements.json"
    current = _read_json(replacements_path) if replacements_path.exists() else {"roomId": room_id, "replacements": []}
    replacements = [item for item in (current.get("replacements") or []) if str(item.get("objectId")) != object_id]
    replacements.append(replacement)
    _write_json(replacements_path, {"roomId": room_id, "replacements": replacements})
    room_volume.commit()
    return {"ok": True, "roomId": room_id, "replacement": replacement, "replacements": replacements}
