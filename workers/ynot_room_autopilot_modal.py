import json
from pathlib import Path

import modal
from fastapi import HTTPException

APP_NAME = "ynot-room-autopilot"
VOLUME_PATH = Path("/ynot-room")
REPAIR_URL = "https://tonykone555--ynot-room-repair-room-repair.modal.run"
MAX_ATTEMPTS = 2

image = modal.Image.debian_slim(python_version="3.12").uv_pip_install("fastapi[standard]", "requests")
app = modal.App(APP_NAME, image=image)
volume = modal.Volume.from_name("ynot-room-jobs", create_if_missing=True)


def _safe_id(value: str) -> str:
    return "".join(ch for ch in str(value) if ch.isalnum() or ch in "-_")[:80]


def _job_dir(job_id: str) -> Path:
    return VOLUME_PATH / "jobs" / job_id


def _read(path: Path, default=None):
    if not path.exists():
        return {} if default is None else default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {} if default is None else default


def _write(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _schedule(job_id: str):
    import requests

    volume.reload()
    job = _job_dir(job_id)
    qa_path = job / "qa" / "qa.json"
    if not qa_path.exists():
        return {"id": job_id, "status": "qa_pending", "scheduled": False}

    qa = _read(qa_path)
    if qa.get("canPublish") is True:
        return {"id": job_id, "status": "publishable", "scheduled": False, "releaseStatus": "publishable"}

    repair_state = _read(job / "qa" / "repair-state.json", {"attempts": 0, "history": []})
    attempts = int(repair_state.get("attempts", 0) or 0)
    if attempts >= MAX_ATTEMPTS:
        return {
            "id": job_id,
            "status": "repair_limit_reached",
            "scheduled": False,
            "attempts": attempts,
            "releaseStatus": "review_required",
        }

    high_detail = _read(job / "qa" / "high-detail-state.json", {})
    if high_detail.get("status") in {"queued", "processing"}:
        return {
            "id": job_id,
            "status": "high_detail_in_progress",
            "scheduled": False,
            "attempts": attempts,
            "releaseStatus": "review_required",
        }

    gate_path = job / "qa" / "autopilot.json"
    gate = _read(gate_path, {})
    queued_for_attempt = gate.get("queuedForAttempt")
    if gate.get("status") in {"queued", "processing"} and queued_for_attempt == attempts:
        return {
            "id": job_id,
            "status": "repair_already_queued",
            "scheduled": False,
            "attempts": attempts,
            "releaseStatus": "review_required",
        }

    gate = {
        "status": "queued",
        "queuedForAttempt": attempts,
        "qaScore": qa.get("averageScore"),
        "blockerCount": len(qa.get("blockers") or []),
    }
    _write(gate_path, gate)
    volume.commit()

    try:
        response = requests.post(REPAIR_URL, params={"id": job_id}, timeout=30)
        response.raise_for_status()
        repair = response.json()
        gate.update({"status": "processing", "repair": repair})
        _write(gate_path, gate)
        volume.commit()
        return {
            "id": job_id,
            "status": "repair_queued",
            "scheduled": True,
            "attempts": attempts,
            "repair": repair,
            "releaseStatus": "review_required",
        }
    except Exception as exc:
        gate.update({"status": "failed", "error": str(exc)[:700]})
        _write(gate_path, gate)
        volume.commit()
        raise


@app.function(memory=1024, timeout=60, volumes={str(VOLUME_PATH): volume})
@modal.fastapi_endpoint(method="POST")
def schedule_repair(id: str):
    safe = _safe_id(id)
    if not safe:
        raise HTTPException(status_code=400, detail="Missing room id")
    try:
        return _schedule(safe)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Room autopilot failed: {str(exc)[:700]}") from exc
