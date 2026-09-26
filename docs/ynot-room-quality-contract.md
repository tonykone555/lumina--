# YNOT Room quality contract

YNOT Room uses the strongest reconstruction and QA principles from `amirmushichge/unreal-home-wizard`, adapted to YNOT's Modal + GLB + React Three Fiber architecture.

This contract intentionally does **not** copy the upstream project's local Windows/macOS Unreal launcher workflow. YNOT already has a cloud-native reconstruction path and a browser viewer. We reuse the upstream ideas that improve fidelity, evidence tracking, physical plausibility and release discipline.

## Core rule

A generated GLB is a technical reconstruction result, not automatically a finished room.

The room remains `review_required` until reference-matched QA and physical-logic QA have run and no critical or major defects remain.

## Evidence ledger

Every uploaded reference image must remain represented in the job evidence. Record:

- file/view identifier;
- original image dimensions;
- camera intrinsics;
- whether the view aligned into the fused scene;
- alignment quality/inlier ratio where available;
- camera transform when aligned;
- visible architectural evidence discovered later;
- detected dominant objects discovered later;
- unknown/occluded regions that must not be invented without evidence.

The existing Modal manifest already records the first half of this ledger through photo inspection, seed intrinsics and per-view alignment records. Future object/architecture stages should extend the same manifest rather than create a disconnected state model.

## Reconstruction stages

1. **Reference intake** — preserve 3–8 uploaded views and their metadata.
2. **Metric reconstruction** — MoGe-2 reconstructs metric geometry and intrinsics for every usable view.
3. **Multi-view alignment** — align additional views into the seed camera frame; reject weak poses instead of corrupting the scene.
4. **Fused GLB** — export the accepted geometry into the browser-loadable room scene.
5. **Architecture pass** — identify floor, walls, ceiling, openings and dominant fixed structure before decorative work.
6. **Matched-camera QA** — render the generated room from the reconstructed key camera viewpoints and compare against their source photographs.
7. **Physical-logic QA** — detect floating/support errors, impossible intersections, holes, broken wall/floor relationships and other geometry defects.
8. **Defect audit** — classify discrepancies as critical, major or minor.
9. **Correction loop** — capture → compare → defect list → repair → recapture.
10. **Release gate** — only a scene with zero critical and zero major defects may be marked final/publishable.

## Severity

### Critical

Examples:

- wrong room or major opening relationship;
- severe camera mismatch;
- missing dominant structure/object;
- physically impossible/floating dominant object;
- reconstruction geometry that materially contradicts a key reference.

### Major

Examples:

- incorrect scale or placement of large furniture;
- large silhouette mismatch;
- obvious intersections, gaps or holes in a key view;
- major wall/floor/ceiling mismatch;
- obvious material/lighting mismatch once appearance reconstruction is enabled.

### Minor

Small differences that do not materially change layout, silhouette, physical logic or room identity.

## API release gate

`GET /api/room/jobs?id=...` adds a `qualityGate` block to the Modal status response.

Current automated checks include:

- reconstruction output present;
- reference coverage (`fusedViewCount / photoCount`);
- matched-camera QA state;
- physical-logic QA state;
- defect-audit state.

The last three are currently marked `pending`, therefore `canPublish` remains `false` even when the GLB itself is technically ready. This prevents the product from overstating reconstruction quality while the next QA stages are being implemented.

## Upstream ideas deliberately not copied

YNOT does not need the Home Wizard's local-engine setup, OS-specific preflight scripts, packaged WASD launcher or user-facing Unreal editor workflow for the browser experience. Those remain useful references if we later add an Unreal QA/export worker, but they should not become a dependency for the normal YNOT Room path.

## Next engineering target

Implement reference-matched QA by rendering the GLB from each reconstructed camera and producing a machine-readable discrepancy report. That report should populate the evidence ledger and defect audit, then drive targeted repair passes before catalogue furniture replacement starts.
