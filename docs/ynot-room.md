# YNOT Room

YNOT Room turns 3–8 photographs of a room into an interactive browser-loadable 3D scene, validates that scene against the source photos, automatically retries weak reconstructions, identifies high-confidence furniture and connects those objects to YNOT's live catalogue.

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
10. Once QA completes, the furniture worker detects supported object categories in the reconstruction reference, lifts their evidence into the same metric 3D coordinate system as the GLB, and assigns stable object IDs.
11. The browser draws clickable object bounds and searches the existing YNOT live Shopify catalogue for relevant alternatives.
12. Product selections use the existing YNOT `/p/{productId}?ref=...` deep-link contract, which forwards into the normal Shop product popup. Raw Global Catalog Shopify IDs are resolved with Shopify UCP `get_product`, and customer-facing prices use the YNOT retail engine.

## Main components

### Web / Next.js

- `app/room/page.tsx` — Room page entry point.
- `app/room/RoomExperience.tsx` — upload controls, progress/release state, React Three Fiber viewer, clickable detected objects and live catalogue suggestions.
- `app/api/room/jobs/route.ts` — same-origin job submission/status API, QA join and automatic repair scheduling.
- `app/api/room/jobs/[id]/objects/route.ts` — same-origin furniture/object results with conservative confidence and duplicate filtering.
- `app/p/[...id]/page.tsx` — compatibility deep link that preserves creator `ref` attribution and forwards into the existing Shop product popup contract.
- `app/api/commerce/product/[id]/route.ts` — resolves both persisted YNOT IDs and raw Shopify Global Catalog IDs into the existing product-detail shape.
- Same-origin routes proxy the generated GLB and QA evidence assets so Modal implementation URLs do not need to be exposed as the browser contract.

### Modal workers

- `workers/ynot_room_submit_modal.py` — lightweight authenticated upload/enqueue service that scales down when idle.
- `workers/ynot_room_modal.py` — fast MoGe-2 A10G reconstruction and GLB export; persists the scene-centering transform used by the object layer.
- `workers/ynot_room_structure_modal.py` — room bounds, dominant planes, wall candidates and recovered camera structure model.
- `workers/ynot_room_qa_modal.py` — matched-camera render comparison, scoring, blockers and evidence images.
- `workers/ynot_room_repair_modal.py` — bounded automatic camera repair and high-detail escalation.
- `workers/ynot_room_high_detail_modal.py` — higher-detail MoGe-2 ViT-L fallback.
- `workers/ynot_room_autopilot_modal.py` — idempotent scheduling gate that prevents duplicate repair jobs.
- `workers/ynot_room_objects_modal.py` — Grounding DINO furniture detection plus MoGe-2 metric point lifting into approximate GLB-space object bounds.

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

## Shoppable object layer

The first object layer intentionally favors precision over recall. Supported categories currently include sofas, armchairs, chairs, coffee/dining tables, beds, cabinets, sideboards, rugs, lamps, chandeliers, mirrors, televisions, ottomans, benches and bookshelves.

For each accepted detection YNOT records:

- stable scene-local object ID such as `sofa-01`;
- semantic category and detector confidence;
- reference-image evidence box;
- approximate metric 3D position and size in the reconstructed GLB coordinate system;
- support class (`floor` or `wall_or_ceiling`);
- geometry confidence marked explicitly as approximate.

The same-origin API removes low-confidence detections and suppresses heavily overlapping ambiguous labels. The synthetic regression case originally produced four raw candidates; conservative filtering leaves the single credible television instead of inventing overlapping lamp/chandelier objects.

Object dimensions are reconstruction-derived visual estimates, not survey-grade architectural measurements.

### Catalogue and product-detail integration

Clicking an outlined object triggers a category-specific search through the existing `/api/catalog` Shopify feed. Suggestions keep the catalogue's existing IDs, imagery, YNOT retail price and merchant information.

The commerce resolver also accepts Shopify Global Catalog IDs (`gid://shopify/...`) directly. It calls Shopify's UCP `get_product` tool for the full selected product/variant data, then applies YNOT retail pricing before returning the customer-facing popup payload. Raw supplier price is not returned by this live fallback, including in variant prices.

This preserves the existing creator/referral URL structure:

`/p/{productId}?ref={creatorCode}`

The compatibility route forwards the product ID and referral code into the existing YNOT Shop product-detail flow rather than introducing a separate Room product card system.

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
- Tokens, deployment credentials and supplier pricing must never be written into browser responses or committed to the repository.
- Job IDs are sanitized before they are used as Volume paths.

## CI verification

The feature branch contains separate deployment/smoke workflows for reconstruction, structure extraction, matched-camera QA, visual QA assets, repair, high-detail fallback, the lightweight submit worker, autopilot and furniture object detection.

The final reconstruction workflow verifies:

`authenticated submit → fast reconstruction → QA → autopilot → repair/escalation → final QA release gate`

The authenticated recovery test is green. Its known synthetic recovery path completes the fast pass around 63.2% QA, escalates automatically, and completes the high-detail pass around 84.05% with zero blockers and `releaseStatus=publishable`.

The object-worker smoke test also verifies that a known reconstructed room returns non-empty, unique stable object IDs with finite positive 3D bounds.

## Known next product layers

These are the remaining extensions; they are not being claimed as complete:

1. stronger physical-logic checks for support, mounting, intersections and structural holes;
2. multi-view furniture segmentation/association so one object can accumulate evidence across several source photos;
3. rank catalogue alternatives by detected proportions/style/material in addition to category;
4. actual replacement geometry: isolate/remove or visually suppress the reconstructed object's mesh region and insert a product-derived 3D asset;
5. redesign prompts constrained by room geometry, style and budget;
6. optional architecture refinement for floors, ceilings and openings when confidence is high.

The current viewer can identify, select and shop a reconstructed object, but it does **not** yet replace the baked reconstructed furniture with a true catalogue 3D mesh. Until product-specific 3D assets and mesh surgery are implemented, the selected alternative remains a shopping suggestion rather than a physically inserted object.

The system should continue to prefer `unknown` / `review_required` or fewer detections over inventing geometry, furniture or quality that is not supported by the reference evidence.
