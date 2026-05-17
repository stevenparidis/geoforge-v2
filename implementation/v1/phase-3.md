# Phase 3 — Listric fault correctness

**Parent plan:** `implementation-plan.md`
**Phase:** 3 of 8
**Pre-requisite:** Phase 0 complete.
**Closes:** README deviation #4 ("Listric fault dip-at-depth overlay approximates the curved profile with a quadratic interpolation").
**Concurrent with:** phases 1 and 2.

---

## Goal

Replace the listric fault's quadratic approximation with a geodetically reasonable circular-arc geometry, and annotate **both** the surface dip and the dip-at-depth with their own measurement-origin overlays. After this phase, a student looking at a listric fault sees a visibly curved surface with two clear answers to "where is that angle measured from?"

This is the smallest of the three parallel phases — one geometry rebuild, two overlays, no architectural changes.

## Pre-conditions

- Phase 0 complete.

## Files this phase touches

| File                          | Change type | Notes                                                                       |
|-------------------------------|-------------|-----------------------------------------------------------------------------|
| `src/three-helpers.jsx`       | Modify      | Replace the listric fault builder; add the second annotation arc.           |
| `src/geo-data.jsx`            | Modify      | Update the `listric-fault` entry in `REFERENCE_FORMATIONS` with detachment depth. |
| `src/workspace.jsx`           | Modify      | Inspector reads `dip_at_depth` and `detachment_depth` for listric faults.   |

This phase does not touch `scene.jsx`, `handle-layer.jsx`, `description-diff.js`, or `workspace.jsx`'s interpret flow. Zero overlap with phases 1 and 2.

---

## Parallelism map

```
3.1 (geometry rebuild) ──> 3.2 (overlay system) ──> 3.3 (reference card + smoke)
```

All sub-phases are sequential within this phase — but the whole phase runs in parallel with phases 1 and 2.

---

## Sub-phase 3.1 — Listric geometry rebuild

**Goal:** Replace the quadratic profile with a circular-arc geometry that respects the surface dip and the dip-at-depth as tangent constraints at the two endpoints.

### The geometry

A listric fault profile, viewed in cross-section perpendicular to its strike, is a curve that:

- Starts at the surface with a steep dip (`surface_dip`, default 70°).
- Curves to a shallow dip (`dip_at_depth`, default 10°) at the detachment depth.
- The detachment depth is the vertical distance from the surface to the detachment surface (default = half the model height).

The simplest geodetically reasonable curve satisfying both tangent constraints is a **circular arc**. To find it:

1. Surface point: `P_s = (0, 0)` (origin at the fault outcrop in cross-section).
2. Surface tangent direction: rotate `(0, -1)` (straight down) by `(90° - surface_dip)` toward the dip direction, giving the initial tangent vector.
3. The arc's centre lies along the normal to the surface tangent, at distance `R` (to be determined).
4. The arc's centre also lies along the normal to the detachment tangent.
5. Solve for `R` and the centre coordinates given the constraint that the arc reaches depth `detachment_depth` along its curve.

Practical computation: use a numeric solver (binary search on `R`) since closed-form requires solving a transcendental. Discretise the arc into ~32 segments and emit as a `THREE.CatmullRomCurve3`.

### Rendering

Replace the existing builder in `three-helpers.jsx` (find by searching for `listric`):

- **Fault surface:** extrude the cross-section curve along the strike direction using `THREE.ExtrudeGeometry` or build a `BufferGeometry` from the strike-by-curve grid. Material: translucent fault-plane material (matches the planar fault style; currently a grey-orange shaded surface).
- **Fault trace:** a `TubeGeometry` along the curve (radius 0.02) so the curve is visible against the layers.
- **Hanging-wall geometry:** the listric fault's hanging wall typically rolls over (the rollover anticline). For v1, render the hanging wall as offset along the curve by the fault's `throw` (which for a listric is measured at the surface). A perfect rollover is out of scope; an obvious offset is sufficient.

### Definition of done

- The listric fault renders as a visibly curved surface. Hovering it shows the geometry is continuous, not stepped.
- Changing the `surface_dip` value from the inspector changes the steepness of the top of the curve.
- Changing the `dip_at_depth` value from the inspector changes the steepness of the bottom of the curve.
- Changing the `detachment_depth` value moves the bottom of the curve up or down.

---

## Sub-phase 3.2 — Overlay system

**Goal:** Two dip-angle overlays — one at the surface, one at the detachment — each rendered against its own horizontal reference plane.

### The two overlays

**Surface dip overlay** (already exists for planar faults; reuse):

- Translucent horizontal reference plane at depth = 0.
- Vertex at the fault outcrop point.
- Arc sweeping from the horizontal to the tangent of the curve at the surface.
- Value rendered inside the arc with the standard label style (stated white / inferred amber dashed).
- Leader line to the label.

**Dip-at-depth overlay** (new):

- Translucent horizontal reference plane at depth = `detachment_depth`.
- Vertex at the point where the curve meets the detachment surface.
- Arc sweeping from the horizontal at that depth to the tangent of the curve at the detachment.
- Value rendered inside the arc.
- Leader line to the label.

**Vertical depth annotation:**

- A vertical dashed line connecting the surface vertex to the detachment vertex.
- A double-arrow along that line.
- Value rendered as "Detachment depth: N m" next to the line.

### Implementation

In `three-helpers.jsx`, add a function `buildListricOverlays(faultEvent)`:

```javascript
function buildListricOverlays(E) {
  const group = new THREE.Group();
  // Surface dip arc
  group.add(arcWedge({ vertex: surfacePt, ... }).root);
  // Deep dip arc
  group.add(arcWedge({ vertex: depthPt, ... }).root);
  // Vertical depth line
  group.add(doubleArrow({ from: surfacePt, to: depthPt, label: `Detachment depth: ${detachment_depth} m` }).root);
  return group;
}
```

Wire `buildSceneContents` (also in `three-helpers.jsx`) to call `buildListricOverlays` when the event subtype is `listric`, instead of the standard fault overlay.

### Definition of done

- Both arcs render at their correct vertices, against their correct horizontal reference planes.
- The vertical detachment-depth annotation renders between them with its value labelled.
- Inferred values render in amber with the dashed underline; stated values in white. (For the reference card, both dips should be marked stated; the detachment depth marked inferred so the contrast is visible.)
- Toggling the global Overlays toggle hides both arcs and the depth line.

---

## Sub-phase 3.3 — Reference card update and smoke test

**Goal:** Update the listric fault entry in the formation reference page and extend the smoke test.

### Update `REFERENCE_FORMATIONS` in `geo-data.jsx`

Find the `listric-fault` entry. Update its `model` to include:

```javascript
{
  id: 'listric-fault',
  section: 'faults',
  title: 'Listric fault',
  tag: 'Fault',
  caption: 'A curved normal fault that flattens with depth. The dip at the surface and the dip at depth are each measured against their own horizontal reference, with the detachment depth labelled vertically between them.',
  overlays: ['surface dip', 'dip at depth', 'detachment depth'],
  cameraHint: { phi: 1.05, theta: 0.0, dist: 10 },
  model: {
    layers: [ /* a few horizontal beds */ ],
    events: [{
      id: 'E1',
      type: 'fault',
      subtype: 'listric',
      strike: 0,
      dip: 70,
      dip_direction: 90,
      dip_at_depth: 10,
      detachment_depth: 3.0,
      throw: 1.0,
      order: 0,
      description_source: 'A listric normal fault dips 70° east at surface, flattens to 10° at a detachment 3 m down, with 1 m of throw.',
      field_origin: {
        dip: 'stated',
        dip_direction: 'stated',
        dip_at_depth: 'stated',
        detachment_depth: 'inferred',
        throw: 'stated'
      },
    }],
  },
}
```

### Extend the smoke test

In `tests/smoke.js`, add:

1. Navigate to the Formation reference tab.
2. Find the listric fault card.
3. Take a screenshot to `tests/screenshots/listric-fault.png`.
4. Inspect the rendered scene's `overlayRoot` (via a test hook on `window.__lastGeoScene`). Verify there are at least two arc primitives and one double-arrow primitive.

### Definition of done

- The reference page shows the listric fault with both dip arcs and the depth annotation visible.
- The screenshot is captured for visual review.
- The smoke test passes.

---

## Acceptance criteria for phase 3

1. The listric fault renders as a visibly curved surface, not a stepped or polyline approximation.
2. The surface dip is annotated with an arc and value at the surface vertex against a horizontal reference plane at depth 0.
3. The dip-at-depth is annotated with its own arc and value at the detachment vertex against a horizontal reference plane at the detachment depth.
4. The vertical distance between the two depths is annotated with a double-arrow labelled with the detachment depth.
5. Editing any of `dip`, `dip_at_depth`, or `detachment_depth` in the inspector updates the curve geometry and the relevant overlays.
6. The formation reference card for the listric fault shows the new overlays cleanly.
7. The smoke test passes.
8. The README "Deviations from the spec" section no longer lists deviation #4.

When all eight are true, update `STATUS.md` to `"Phase 3 complete"`.

---

## Notes for the orchestrator

- This is the smallest phase in the v1 push. Estimate: a focused session for 3.1, a similar one for 3.2, plus 3.3.
- The geometric subtlety is in the circular-arc solver in 3.1. If the curve looks wrong (e.g. flips inside-out at extreme dip ratios), the bug is almost certainly in the tangent-constraint setup. Cross-check by drawing the construction lines for the centre and radius on paper for a known case (e.g. `surface_dip=60, dip_at_depth=20, detachment_depth=2`).
- The handle-layer work in phase 1 needs to know how to drive a listric fault's `dip_at_depth` and `detachment_depth`. When phases 1 and 3 both land and converge in phase 4, add handles for these two fields. They don't need to be designed during phase 3 — but a note about them belongs in the phase-1 deferred list.
- This phase does not touch the interpreter prompt. The prompt already accepts `dip_at_depth` for listric faults (see `INTERPRETER_SYSTEM_PROMPT` in `workspace.jsx`). If `detachment_depth` is not in the schema, add it in 3.1 to both the prompt and `applyDefaults`.
