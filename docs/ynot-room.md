# YNOT Room

YNOT Room turns 3–8 photographs of a room into an interactive browser-loadable 3D scene, validates that scene against the source photos, and automatically retries weak reconstructions before they are considered publishable.

The implementation is isolated from the existing YNOT Shop, Discover and Earn flows. It borrows the strongest reconstruction-discipline ideas from Unreal Home Wizard — reference evidence, recovered cameras, compare/repair/review gates — while keeping YNOT's production architecture on Modal + GLB + React Three Fiber rather than requiring a user's machine to run Unreal Engine.

## Current production flow

1. `/room` accepts 3–8 JPEG/PNG/WebP room photos.
2. The browser downsizes uploads before sending them to reduce latency and GPU cost.
3. `/api/room/jobs` validates the request, obtains a short-lived Vercel project OIDC identity, and sends the upload server-to-server to the lightweight `ynot-room-submit` Modal app.
4. The submit app verifies the server identity, persists the photos and job metadata to the shared `ynot-room-jobs` Modal Volume, then asynchronously spawns the GPU reconstruction function.
5. The fast A10G reconstruction uses MoGe-2 metric point maps, SIFT correspondences and PnP camera recovery to align multiple viewpoints and export a fused GLB.
6. The matched-camera QA worker renders the reconstructed geometry from each recovered reference camera and compares it with the corresponding source photo.
7. QA records reference coverage, camera matches, structure similarity, photometric similarity, blockers and per-view evidence assets.
8. If the fast scene is blocked, the autopilot schedules a bounded repair pass. Camera-related issues are refined cheaply first; unresolved geometry/visual issues escalate to the high-detail reconstruction profile.
9. The high-detail profile uses the larger MoGe-2 ViT-L normal model, higher inference resolution and denser mesh sampling, then reruns the same QA contract.
10. The job finishes as `publishable`, `review_required`, or failed. A generated GLB alone is not treated as proof that the scene is good enough.

## Main components

### Web / Next.js

- `app/room/page.tsx` — Room page entry point.
- `app/room/RoomExperience.tsx` — upload controls, progress/release state and React Three Fiber viewer.
- `app/api/room/jobs/route.ts` — same-origin job submission/status API, QA join and automatic repair scheduling.
- Same-origin routes proxy the generated GLB and QA evidence assets so Modal implementation URLs do not need to be exposed as the browser contract.

### Modal workers

- `workers/ynot_room_submit_modal.py` — lightweight authenticated upload/enqueue service that scales down when idle.
- `workers/ynot_room_modal.py` — fast MoGe-2 A10G reconstruction and GLB export.
- `workers/ynot_room_structure_modal.py` — room bounds, dominant planes, wall candidates and recovered camera structure model.
- `workers/ynot_room_qa_modal.py` — matched-camera render comparison, scoring, blockers and evidence images.
- `workers/ynot_room_repair_modal.py` — bounded automatic camera repair and high-detail escalation.
- `workers/ynot_room_high_detail_modal.py` — higher-detail MoGe-2 ViT-L fallback.
- `workers/ynot_room_autopilot_modal.py` — idempotent scheduling gate that prevents duplicate repair jobs.

All Room workers share the persistent Modal Volume `ynot-room-jobs`.

## Reconstruction profiles

### Fast pass

- Model: `Ruicheng/moge-2-vits-normal`
- GPU: Modal A10G
- Metric depth/point reconstruction
- Per-view normalized camera intrinsics
- SIFT feature matching
- RANSAC PnP pose recovery
- Per-view metric scale correction
- Fused GLB export

### High-detail fallback

- Model: `Ruicheng/moge-2-vitl-normal`
- GPU: Modal A10G
- Higher MoGe inference resolution
- Denser mesh sampling
- Seed camera chosen for cross-view feature connectivity
- Reuses the same QA gate instead of automatically promoting the fallback result

The verified three-view fallback test produced approximately 1.17M vertices / 2.33M faces and improved matched-camera QA from about 63% on the fast pass to about 84%, clearing the synthetic test's visual blockers.

## Home Wizard quality contract

The API exposes the `ynot-home-wizard-v1` quality contract.

Important fields include:

- `referenceCoverage`
- `matchedCameraCount`
- `matchedViews`
- `qa.averageScore`
- `qa.viewReports`
- `qa.blockers`
- `qa.canPublish`
- `releaseStatus`

Release states shown to the frontend are:

- `Draft` / processing — reconstruction or QA/recovery is still running.
- `Review required` — a scene exists but the release gate still has blockers or the repair limit was reached.
- `Publishable` — matched-camera QA has cleared its current blocking criteria.

### Per-view QA evidence

Each matched reference can produce:

- reconstructed camera render
- mismatch heatmap
- source/render edge overlay
- coverage score
- structural-edge score
- photometric score
- blocker codes

This implements the Home Wizard-style `capture → compare → defect → repair → recapture` discipline around YNOT's GLB pipeline.

## Automatic repair

Automatic recovery is deliberately bounded.

1. QA identifies blocker codes.
2. Camera/structure-match issues get a cheap camera-refinement attempt.
3. If camera refinement makes no genuine gain, or geometry coverage is the problem, the job is escalated to high-detail reconstruction.
4. High-detail reconstruction reruns QA.
5. The repair/autopilot state is persisted in the shared Volume to prevent duplicate jobs.
6. The browser keeps polling while repair/high-detail processing is active.
7. Retry limits prevent an endless reconstruction loop; unresolved jobs remain `review_required`.

## Submission architecture

Room uploads use a separate lightweight Modal app rather than the heavy GPU reconstruction app. This prevents a GPU/model cold start from blocking the HTTP upload response while allowing the submit container to scale back down when it is idle.

Default submit endpoint:

`https://tonykone555--ynot-room-submit-submit-room.modal.run`

The browser never calls that endpoint directly. The Next.js server route obtains a short-lived Vercel OIDC token at runtime and forwards it to Modal with the upload. CI uses a short-lived GitHub Actions OIDC token for the same purpose.

## Security

- The browser talks only to YNOT same-origin APIs for Room job creation/status/assets.
- Direct unauthenticated calls to the Modal submit endpoint are rejected with HTTP 401 before photos are accepted or GPU work can be queued.
- Production/preview submissions use Vercel OIDC and are constrained to the exact YNOT Vercel project/team identity.
- GitHub Actions smoke/E2E submissions use GitHub OIDC and are constrained to the exact `tonykone555/lumina--` repository and approved refs.
- These identities are short-lived; no permanent public GPU-spawn credential is embedded in browser code.
- `MODAL_ROOM_TOKEN` / `YNOT_ROOM_TOKEN` remains an optional server-side shared-secret fallback, but it is not required for the normal Vercel/CI path.
- CI verifies both sides of the boundary: unauthenticated submission is rejected and a signed GitHub identity is accepted.
- The Vercel preview was also verified end-to-end: the runtime obtained its project OIDC identity, Modal accepted the signature/claims, and the request reached ordinary form validation.
- Tokens and API secrets must never be written into client responses or committed to the repository.
- Job IDs are sanitized before they are used as Volume paths.

## CI verification

The feature branch contains separate deployment/smoke workflows for reconstruction, structure extraction, matched-camera QA, visual evidence assets, repair, high-detail fallback, the lightweight submit worker and autopilot.

The final end-to-end workflow creates a fresh synthetic three-view room and verifies:

`authenticated submit → fast reconstruction → QA → autopilot → repair/escalation → final QA release gate`

The authenticated recovery test is green. Its known synthetic recovery path completes the fast pass around 63.2% QA, escalates automatically, and completes the high-detail pass around 84.05% with zero blockers and `releaseStatus=publishable`.

## Known next product layers

These are feature extensions, not prerequisites for proving the current reconstruction/QA pipeline:

1. stronger physical-logic checks for support, mounting, intersections and structural holes;
2. furniture/object segmentation and stable object IDs;
3. YNOT catalogue matching and replacement suggestions;
4. click a 3D object to open the existing YNOT product card;
5. redesign prompts constrained by room geometry, style and budget;
6. optional architecture refinement for floors, ceilings and openings when confidence is high.

The system should continue to prefer `unknown` / `review_required` over inventing geometry or claiming quality that is not supported by the reference evidence.
