# YNOT Room — proof of concept

YNOT Room is an isolated extension of YNOT that turns several room photos into a reconstruction job and prepares the result for an interactive GLB/GLTF scene inside the existing React Three Fiber frontend.

## Current flow

1. `/room` accepts 3–8 room photos.
2. The browser downsizes them before upload to reduce bandwidth and cost.
3. `/api/room/jobs` validates the upload and forwards it server-to-server to Modal.
4. `workers/ynot_room_modal.py` persists the job to the `ynot-room-jobs` Modal Volume.
5. An A10G-backed Modal function validates the staged images and produces a reconstruction manifest.
6. The existing room viewer can load a future `sceneUrl` as a GLB/GLTF model without changing the main YNOT Shop/Discover/Earn flows.

The current worker stops intentionally after GPU preflight. It does **not** claim to reconstruct a room or run Unreal yet. The next implementation stage is the reconstruction engine followed by scene assembly/export.

## YNOT / Vercel environment

Set these only after the Modal app is deployed:

- `MODAL_ROOM_ENDPOINT` — deployed URL for the `submit_room` Modal Web Function.
- `MODAL_ROOM_TOKEN` — optional shared bearer token. Use the same value for `YNOT_ROOM_TOKEN` in the Modal worker environment if enabled.

The browser never receives either value.

## Modal deployment

Use a machine with the Modal CLI authenticated for the YNOT Modal workspace:

```bash
python -m pip install -U modal fastapi
modal deploy workers/ynot_room_modal.py
```

Modal will print the deployed Web Function URLs. Put the `submit_room` URL into `MODAL_ROOM_ENDPOINT` on Vercel.

For an authenticated endpoint, supply `YNOT_ROOM_TOKEN` to the deployed worker environment and the matching `MODAL_ROOM_TOKEN` to Vercel. Do not commit the token.

## Worker contract

### Submit

`POST MODAL_ROOM_ENDPOINT`

Multipart fields:

- `photos` — 3–8 JPEG/PNG/WebP images
- `requestId`
- `style`
- `roomType`
- `budget`
- `source`

Response:

```json
{
  "id": "job-id",
  "status": "queued",
  "stage": "accepted",
  "message": "Your room was accepted by the YNOT Modal worker."
}
```

### GPU preflight

The A10G worker validates each image, records dimensions/formats, and creates:

- `request.json`
- `call.json`
- `status.json`
- `manifest.json`

The manifest reserves the following pipeline stages:

- preflight
- reconstruction
- Unreal assembly
- GLB export

## Why Unreal is not bundled yet

Unreal Engine is not a normal Python dependency. Its Linux binaries, project assets and licensing/deployment setup need to be handled separately. The correct first proof is to establish that YNOT can submit jobs to a GPU worker reliably, persist state, and return a result contract. Once that is verified, the reconstruction + Unreal/GLB stage can be added behind `process_room()` without changing the frontend API.

## Next implementation stage

1. Choose and containerize the room reconstruction/depth/camera pipeline.
2. Produce normalized room geometry plus camera transforms.
3. Feed that output to an Unreal Linux worker or a lighter direct GLB generation stage.
4. Upload the finished GLB and preview image to YNOT storage.
5. Return `sceneUrl` and `previewUrl` through the existing job response.
6. Map detected/replaced furniture objects to YNOT catalogue product IDs so clicking a 3D object opens the standard YNOT product card.
