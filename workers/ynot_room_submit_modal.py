import json
import os
import uuid
from pathlib import Path

import modal
from fastapi import HTTPException, Request

APP_NAME = "ynot-room-submit"
VOLUME_PATH = Path("/ynot-room")
MAX_PHOTOS = 8
MAX_TOTAL_BYTES = 14 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
VERCEL_PROJECT_ID = "prj_xDNNAY7MBUIbDHLaJkOdPsUz2C7X"
VERCEL_OWNER_ID = "team_9yqHjLzE6wUmudwIHFS4EutR"
VERCEL_OWNER = "tonykone555s-projects"
GITHUB_REPOSITORY = "tonykone555/lumina--"
GITHUB_AUDIENCE = "ynot-room-modal"

image = modal.Image.debian_slim(python_version="3.12").uv_pip_install(
    "fastapi[standard]", "PyJWT[crypto]"
)
app = modal.App(APP_NAME, image=image)
volume = modal.Volume.from_name("ynot-room-jobs", create_if_missing=True)


def _safe_id(value: str) -> str:
    return "".join(ch for ch in value if ch.isalnum() or ch in "-_")[:80]


def _job_dir(job_id: str) -> Path:
    return VOLUME_PATH / "jobs" / job_id


def _write_json(path: Path, payload: dict) -> None:
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
    """Accept only this Vercel project or this repository's GitHub Actions identity.

    A legacy shared bearer token remains supported as an explicit server-side fallback,
    but unauthenticated callers can never create reconstruction jobs.
    """
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
            allowed_issuers = {
                "https://oidc.vercel.com",
                f"https://oidc.vercel.com/{VERCEL_OWNER}",
            }
            if issuer not in allowed_issuers:
                raise ValueError("unexpected Vercel issuer")
            claims = _verify_jwt(vercel_token, issuer, f"https://vercel.com/{VERCEL_OWNER}")
            if claims.get("project_id") != VERCEL_PROJECT_ID:
                raise ValueError("unexpected Vercel project")
            if claims.get("owner_id") != VERCEL_OWNER_ID:
                raise ValueError("unexpected Vercel owner")
            if claims.get("project") != "lumina--":
                raise ValueError("unexpected Vercel project name")
            if claims.get("environment") not in {"production", "preview", "development"}:
                raise ValueError("unexpected Vercel environment")
            return "vercel-oidc"
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid Vercel identity") from exc

    github_token = request.headers.get("x-github-oidc-token", "").strip()
    if github_token:
        try:
            claims = _verify_jwt(
                github_token,
                "https://token.actions.githubusercontent.com",
                GITHUB_AUDIENCE,
            )
            if claims.get("repository") != GITHUB_REPOSITORY:
                raise ValueError("unexpected GitHub repository")
            if claims.get("ref") not in {
                "refs/heads/feat/ynot-room-poc",
                "refs/heads/main",
            }:
                raise ValueError("unexpected GitHub ref")
            return "github-oidc"
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid GitHub Actions identity") from exc

    raise HTTPException(status_code=401, detail="Authenticated server identity required")


@app.function(
    memory=1024,
    timeout=45,
    scaledown_window=60,
    volumes={str(VOLUME_PATH): volume},
)
@modal.fastapi_endpoint(method="POST")
async def submit_room(request: Request):
    """Persist uploads quickly and enqueue the already-deployed GPU worker."""
    auth_source = _authorize(request)
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
        "auth": auth_source,
    }
    _write_json(job_dir / "request.json", metadata)
    _write_json(job_dir / "status.json", {
        "id": safe_id,
        "status": "queued",
        "stage": "accepted",
        "message": "Room job accepted by Modal.",
        "photoCount": len(saved),
    })
    volume.commit()

    process_room = modal.Function.from_name("ynot-room", "process_room")
    call = process_room.spawn(safe_id, metadata)
    _write_json(job_dir / "call.json", {"functionCallId": call.object_id})

    return {
        "id": safe_id,
        "status": "queued",
        "stage": "accepted",
        "message": "Your room was accepted and queued for GPU reconstruction.",
        "photoCount": len(saved),
    }
