from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image
from rembg import remove

app = FastAPI(title="YNOT Cutout Service", version="1.0.0")

MAX_INPUT_BYTES = 12 * 1024 * 1024


@app.get("/health")
def health():
    return {"ok": True, "service": "ynot-rembg"}


@app.post("/remove")
async def remove_background(file: UploadFile = File(...)):
    content_type = (file.content_type or "").lower()
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Image file required")

    payload = await file.read(MAX_INPUT_BYTES + 1)
    if not payload or len(payload) > MAX_INPUT_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large")

    try:
        # Decode first so malformed/non-image payloads never reach the model.
        image = Image.open(BytesIO(payload)).convert("RGBA")
        output = remove(image)
        buffer = BytesIO()
        output.save(buffer, format="PNG", optimize=True)
        return Response(
            content=buffer.getvalue(),
            media_type="image/png",
            headers={"Cache-Control": "public, max-age=31536000, immutable"},
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Unable to process image") from exc
