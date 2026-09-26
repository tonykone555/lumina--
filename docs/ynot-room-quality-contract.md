# YNOT Room quality contract

YNOT Room adapts the strongest reconstruction and QA principles from `amirmushichge/unreal-home-wizard` to YNOT's Modal + GLB + React Three Fiber architecture.

The cloud pipeline does not copy Home Wizard's local Windows/macOS Unreal launcher workflow. It reuses the ideas that matter for YNOT: reference evidence, recovered cameras, compare-before-release, explicit blockers, bounded repair and conservative handling of unknown geometry.

## Core rule

A generated GLB is a technical reconstruction result, not automatically a publishable room.

The current `ynot-home-wizard-v1` release gate requires matched-camera evidence to complete and all automated **critical/major visual reconstruction blockers** to clear. If that gate fails, the job remains `review_required` and the autopilot may attempt camera repair or high-detail reconstruction.

`publishable` in v1 means **the reconstruction passed the implemented reference-matched visual QA contract**. It does not yet mean that every future object-level support/mounting rule has been evaluated. Object-aware physical-logic validation is intentionally tracked as the next contract extension rather than being silently claimed as complete.

## Evidence ledger

Every uploaded reference remains represented in the reconstruction evidence. The manifest/QA records include:

- file/view identifier;
- original image dimensions;
- camera intrinsics;
- whether the view aligned into the fused scene;
- alignment quality/inlier ratio where available;
- camera rotation/translation when aligned;
- fused-view count;
- matched-camera QA status;
- per-view coverage, structural and photometric scores;
- visual blocker codes;
- render, mismatch-heatmap and edge-overlay evidence assets.

Future architecture/object stages should extend this same job evidence instead of creating an unrelated state model.

## Implemented reconstruction stages

1. **Reference intake** — preserve 3–8 uploaded views and metadata.
2. **Metric reconstruction** — MoGe-2 reconstructs metric point geometry and intrinsics.
3. **Multi-view alignment** — SIFT + RANSAC PnP aligns usable additional views; weak poses are rejected rather than fused blindly.
4. **Fused GLB** — accepted geometry is exported to a browser-loadable scene.
5. **Structure model** — extract room bounds, dominant plane candidates, wall candidates and camera records without fabricating uncertain floor/ceiling classifications.
6. **Matched-camera QA** — render reconstructed geometry from recovered camera viewpoints and compare each result with its reference image.
7. **Visual defect audit** — classify reference/alignment/coverage/structure/similarity blockers.
8. **Correction loop** — QA → cheap camera repair where appropriate → QA again → high-detail reconstruction if necessary → QA again.
9. **Release gate** — mark the current reconstruction `publishable` only when matched-camera QA has no blocking critical/major visual defects.

## Current severity model

### Critical

Reserved for failures where the reconstruction/evidence cannot safely be treated as the requested room, such as unavailable/corrupt scene output or other unrecoverable reconstruction failures.

### Major

Current automated examples include:

- reference image unavailable;
- recovered camera not aligned;
- large uncovered reference region;
- weak structural match;
- low overall view similarity where the configured threshold is breached.

A major blocker keeps `canPublish=false`.

### Minor

Non-blocking differences may be surfaced later for review without preventing release when layout/coverage/reference identity are still supported by the evidence.

## API release gate

`GET /api/room/jobs?id=...` joins Modal reconstruction status, matched-camera QA and automatic-repair state.

Important fields include:

- `referenceCoverage`
- `matchedCameraCount`
- `matchedViews`
- `qa.averageScore`
- `qa.viewReports`
- `qa.blockers`
- `qa.canPublish`
- `releaseStatus`
- `qualityGate`
- `repair`

Current release states:

- `processing` / Draft — reconstruction, QA or automatic recovery is still running;
- `review_required` — a scene exists but blocking evidence remains or the bounded repair policy stopped;
- `publishable` — the implemented matched-camera visual release gate passed.

The Next.js status proxy deliberately continues to return `processing` while repair/high-detail recovery is active, even when an earlier fast-pass GLB already exists. This prevents the browser from stopping its polling on a scene that is still being automatically corrected.

## Automatic recovery policy

- The autopilot is idempotent and stores scheduling state in the shared Modal Volume.
- Repair is bounded to prevent infinite loops.
- Camera-related blockers get a low-cost camera refinement attempt first.
- Geometry/coverage failures, or camera refinement with no genuine gain, escalate to the high-detail MoGe-2 ViT-L profile.
- High-detail output is not trusted automatically; it must rerun the same QA contract.
- If blockers remain after the policy limit, the job stays `review_required` rather than being forced to pass.

## Physical-logic contract extension

Object-aware physical plausibility remains the next QA extension. It should add checks such as:

- floating furniture / unsupported dominant objects;
- impossible wall mounting;
- large object-object or object-wall penetrations;
- broken floor/wall/ceiling relationships;
- major structural holes once architectural surfaces have reliable semantic identities.

These checks require stable architecture/object segmentation and IDs. Until those exist, YNOT must not fabricate support relationships from an unsegmented fused mesh. The current API therefore exposes physical-logic as a future/separate gate rather than pretending those checks have run.

## Verified behavior

The end-to-end CI test creates a fresh synthetic three-view room and verifies:

`submit → fast reconstruction → matched-camera QA → autopilot → repair/high-detail escalation → final QA`

The known recovery case intentionally fails fast-pass QA around 63%, escalates, and reaches about 84% on the high-detail pass with zero visual blockers and `releaseStatus=publishable`.

## Upstream ideas deliberately not copied

YNOT does not depend on Home Wizard's local-engine installation, OS-specific launcher scripts, packaged WASD build or user-facing Unreal editor. Those remain useful references if an Unreal-only QA/export capability becomes necessary later, but they are not dependencies of the normal YNOT Room browser workflow.
