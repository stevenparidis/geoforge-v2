# Phase 1 — Direct 3D manipulation (edit path C)

**Parent plan:** `implementation-plan.md`
**Phase:** 1 of 8
**Pre-requisite:** Phase 0 complete.
**Closes:** README deviation #3 ("Direct 3D manipulation (path C) is partial").
**Concurrent with:** phases 2 and 3.

---

## Goal

Add live drag handles to faults, layers, and folds so users can edit the model directly in 3D. Every drag must update the underlying JSON via the same `updateField` path the inspector uses, and every measurement overlay must update in lockstep so the user sees the geometric meaning of the change as it happens.

This is the spec's core principle in motion: change a number, watch the geometry change, watch the overlay re-explain why.

## Pre-conditions

- Phase 0 complete; repo layout in place; `STATUS.md` and smoke test ready.
- The current inspector (`workspace.jsx`) and `updateField` function are unchanged from the prototype baseline.

## Files this phase touches

| File                          | Change type | Notes                                                                  |
|-------------------------------|-------------|------------------------------------------------------------------------|
| `src/handle-layer.jsx`        | New         | All handle code lives here; exports `window.GeoHandles`.               |
| `src/scene.jsx`               | Modify      | Add `handleRoot` group; wire handle visibility to selection.           |
| `src/three-helpers.jsx`       | Modify      | Add an `update(newParams)` method to overlay primitives used during drag. |
| `src/workspace.jsx`           | Modify      | Pass `selected` into `<GeoScene>`; route handle drags into `updateField`. |
| `index.html`                  | Modify      | Add `<script src="src/handle-layer.jsx">` after `scene.jsx`.           |

No other files are touched. Phase 2 and phase 3 own different files; this phase will not block them.

---

## Parallelism map

```
1.1 (handle layer foundation) ──> 1.2 (drag projection per type) ──> 1.3 (overlay co-update) ──> 1.4 (acceptance + smoke test)
```

All four sub-phases are sequential within this phase. 1.1 produces the visible-but-inert handles; 1.2 makes them actually drag and update the JSON; 1.3 makes the overlays follow the drag continuously; 1.4 verifies and tests.

There is no parallelism *within* phase 1 — but the whole of phase 1 runs in parallel with phases 2 and 3.

---

## Sub-phase 1.1 — Handle layer foundation

**Goal:** A reusable system that spawns appropriate handles when a feature is selected. No drag behaviour yet — handles are visible but inert.

### Architecture

Add a new file `src/handle-layer.jsx` that exports `window.GeoHandles` with:

```javascript
window.GeoHandles = {
  createHandlesForFeature(featureKind, featureData, model) {
    // Returns a THREE.Group containing the right handles for the feature.
  },
  attachToScene(scene, selected, model, onDragChange) {
    // Clears existing handles from scene.handleRoot, builds new ones
    // for `selected`, attaches them. Returns a cleanup function.
  },
};
```

### Modifications to `scene.jsx`

Add a `handleRoot` group alongside `modelRoot` and `overlayRoot`:

```javascript
const handleRoot = new T.Group();
scene.add(handleRoot);
// expose on the entry so handle-layer can reach it
const entry = { ..., handleRoot };
```

Pass `handleRoot` out via `stateRef.current` so the workspace can call `attachToScene`.

### Handle inventory by feature type

| Feature   | Handle name             | Position                                                              | What it controls          |
|-----------|-------------------------|-----------------------------------------------------------------------|---------------------------|
| Fault     | `fault-dip`             | Centre of the fault plane, slightly offset along the fault normal     | `dip`                     |
| Fault     | `fault-strike`          | Top of the fault plane                                                | `strike`                  |
| Fault     | `fault-throw`           | On the hanging-wall block, offset from the fault plane                | `throw` / `heave`         |
| Layer     | `layer-thickness-top`   | Centre of the layer's upper contact                                   | `thickness`               |
| Layer     | `layer-thickness-bot`   | Centre of the layer's lower contact (mirrors `-top`)                  | `thickness`               |
| Fold      | `fold-limb-left`        | Centre of the left-hand limb plane                                    | `interlimb_angle`         |
| Fold      | `fold-limb-right`       | Centre of the right-hand limb plane                                   | `interlimb_angle`         |
| Fold      | `fold-hinge`            | One end of the hinge line                                             | `plunge`                  |

Each handle is a `THREE.Mesh` using a small ring or sphere geometry (radius 0.15 world units), with a translucent cyan material (`#22d3ee`, opacity 0.7). Cyan is chosen because the overlay colours are already cyan and the amber inferred-value colour is reserved for values, not controls — handles must be visually distinct from both.

### Camera-scale invariance

Handles must remain grabbable at any zoom level. In the render loop in `scene.jsx`'s `Surface.tick()`, after rendering, walk `handleRoot` and update each handle's scale based on its distance from the camera:

```javascript
const d = handle.position.distanceTo(camera.position);
const targetScale = d * 0.04; // tune this constant by feel
handle.scale.setScalar(targetScale);
```

### Tooltip-on-hover

When the cursor is over a handle, show a small floating label saying what it controls (e.g. "Drag to change dip"). Use a `CSS2DObject` parented to the handle, hidden by default, shown on `pointerover`.

### Selection wiring

In `workspace.jsx`'s `Workspace` component, when `selected` changes, call `window.GeoHandles.attachToScene(...)`. When `selected` is `null`, the function clears `handleRoot`. When `selected.kind === 'event'` for a fault or fold, or `selected.kind === 'layer'`, it builds the appropriate handle group.

### Definition of done

1. Selecting a fault via the inspector causes three cyan handles to appear: dip, strike, throw.
2. Selecting a layer causes thickness handles on top and bottom contacts.
3. Selecting a fold causes limb handles and a hinge handle.
4. Handles scale appropriately as the camera zooms in and out.
5. Hovering a handle shows a tooltip; moving away hides it.
6. Deselecting (clicking empty space, or opening a different feature) removes the handles cleanly.

---

## Sub-phase 1.2 — Drag projection per handle type

**Goal:** Make the handles actually drag, and translate drag motion into JSON field updates.

### Drag system

In `handle-layer.jsx`, add a drag controller that:

1. On `pointerdown` over a handle, captures the pointer, disables OrbitControls (`scene.controls.enabled = false`), and remembers the starting JSON value of the field.
2. On `pointermove`, raycasts the cursor onto a per-handle *projection geometry* (invisible — only used for the raycast), computes a new value for the controlled field, and calls `onDragChange(field, value)`.
3. On `pointerup`, re-enables OrbitControls and commits the final value (a second `onDragChange` call with `{ final: true }` so the workspace can do its end-of-drag bookkeeping).

### Projection geometry per handle

| Handle              | Projection geometry                                                | Mapping from intersection point to field value           |
|---------------------|--------------------------------------------------------------------|----------------------------------------------------------|
| `fault-dip`         | Invisible sphere centred on the fault's pivot axis                 | Angle subtended by drag → new dip (clamped 0–90°)        |
| `fault-strike`      | Invisible horizontal disc at fault's vertical centre               | Bearing from origin → new strike (mod 360°)              |
| `fault-throw`       | Invisible plane parallel to the fault, offset by handle position   | Signed distance along the fault's dip vector → new throw |
| `layer-thickness-*` | Invisible plane along the layer normal                             | Signed distance from layer mid-plane → new thickness     |
| `fold-limb-*`       | Invisible disc perpendicular to the axial plane                    | Angle from axial plane → contributes to interlimb_angle  |
| `fold-hinge`        | Vertical strip in the axial plane                                  | Angle from horizontal → new plunge                       |

### Calling `updateField`

The drag controller calls `onDragChange(featureKind, featureId, field, value, { intermediate: true })` on every `pointermove`. Throttle to `requestAnimationFrame` cadence — never call more than once per frame.

In `workspace.jsx`, the `onDragChange` callback routes into the existing `updateField` function, with one addition: when `intermediate: true`, set `manually_edited: true` and clear `field_origin[field] = 'inferred'` to `'stated'` as the inspector path does — but suppress any expensive re-derivations. On the final call (`intermediate: false`), do the full bookkeeping.

### Clamping and validation

- `dip`: 0–90°.
- `strike`, `dip_direction`, `plunge_direction`, `axis_strike`: 0–360° (wrap, don't clamp).
- `thickness`: minimum 0.1, maximum 3.0 (matches `applyDefaults`).
- `interlimb_angle`: 5–175°.
- `plunge`: 0–90°.
- `throw`, `heave`, `displacement`: clamped to ±3.0 to stay in the model's local unit range.

### Definition of done

1. Dragging the dip handle on a fault changes the fault's dip in real time, with the change visible in the JSON via the inspector.
2. Dragging the strike handle rotates the fault about the vertical axis.
3. Dragging the throw handle slides the hanging-wall block.
4. Dragging a layer-thickness handle changes the layer's thickness.
5. Dragging fold limbs changes the interlimb angle; dragging the hinge changes the plunge.
6. After every drag, the affected field has `manually_edited: true` set and its `field_origin` value is `"stated"`.
7. The camera does not rotate during a drag.

---

## Sub-phase 1.3 — Overlay co-update during drag

**Goal:** Measurement overlays update in lockstep with handle drags.

This is the proof point for the spec's core principle. The previous sub-phase makes the JSON change in real time; this one makes the overlays *visibly explain* the change in real time.

### The performance problem

Currently the scene rebuilds overlays from scratch in the `setModel` effect in `scene.jsx`. Doing that on every `pointermove` would thrash garbage collection and cause stutter. Two-tier solution:

- **During drag (intermediate updates):** call `overlay.update(newParams)` on affected primitives only. No rebuild.
- **On drag end (final update):** call `setModel(newJson)`, which triggers the full rebuild and reconciles everything.

### `update()` methods on overlay primitives

In `three-helpers.jsx`, every overlay primitive that has a numerical value (dip arc, strike arc, thickness vector, throw line, interlimb arc, plunge arc, dip-direction compass arc) needs an `update(newParams)` method. The method mutates the primitive's geometry in place:

- **Arc:** regenerate the arc curve points with the new angle; update the curve's `setFromPoints`; update the label text.
- **Vector / arrow:** update the endpoint positions; update the label text.
- **Compass arc:** same as arc but with a different orientation.

Each builder function should return an object exposing both the `THREE.Object3D` and the `update` method. Adopt the convention:

```javascript
function buildDipArc(params) {
  const root = new THREE.Group();
  // ... build geometry ...
  function update(newParams) {
    // mutate geometry in place
    // update label text
  }
  return { root, update };
}
```

### Cross-referencing handles to overlays

The drag controller needs to find which overlay primitives correspond to the field being dragged. Two approaches; choose whichever is cleaner:

**Option A — lookup map.** The scene builder stores a map keyed by `(featureId, fieldName)` pointing at the relevant overlay primitive. The drag controller looks up the primitive directly.

**Option B — userData tags.** Each overlay primitive's `THREE.Group` gets `userData = { featureId, controlledFields: ['dip'] }`. The drag controller walks `overlayRoot` and calls `update()` on every primitive whose `controlledFields` includes the dragged field.

Recommended: Option A. It's O(1) lookup and avoids a tree walk per frame.

### Drag preview label

Add a small floating HTML label that follows the cursor during a drag, showing the value as it changes:

```
Dip: 67°
```

Use a fixed-position `<div>` attached to the host element, updated on every `pointermove`. Remove on `pointerup`. This makes the change feel immediate even before the eye registers the geometric update.

### Definition of done

1. Dragging the fault dip handle: the dip-angle arc widens or narrows continuously, the value rendered inside the arc updates each frame, and the dipping plane geometry rotates.
2. Dragging a layer-thickness handle: the thickness vector grows or shrinks, the value next to it updates.
3. Dragging a fold limb: the interlimb angle arc opens or closes, the value updates.
4. The drag preview label appears at the cursor during drag and disappears on release.
5. Frame rate during a drag stays above 30 fps on a mid-range laptop, with a model containing 3 layers + 2 faults + 1 fold.

---

## Sub-phase 1.4 — Acceptance and smoke-test extension

**Goal:** Verify the phase 1 work against `spec-v1.md` and extend the smoke test to cover drag editing.

### Manual verification

Walk through every entry in the phase's acceptance criteria (below) by hand, using the reference glossary page. The glossary cards are pre-populated with known models, so each feature type can be selected and dragged in turn.

### Automated smoke test extension

Extend the phase-0 smoke test (`tests/smoke.js`) with a new scenario:

1. Load `index.html`, wait for `__threeReady`.
2. Type a one-sentence description producing a single normal fault.
3. Click Interpret, wait for the model.
4. Programmatically select the fault (call `setSelected({kind:'event', id:'E1'})` via a test hook).
5. Simulate a drag on the dip handle (synthesise `pointerdown` / `pointermove` / `pointerup` events at known canvas coordinates).
6. Read the resulting JSON. Assert the fault's `dip` value has changed, that `manually_edited: true` is set, and that `field_origin.dip === 'stated'`.

The test won't visually verify the arc widening — that's manual — but it will guarantee the drag → JSON pipeline doesn't regress.

### `STATUS.md` update

On completion, append to `STATUS.md`:

```
## Phase 1 — Direct 3D manipulation
- [x] 1.1 Handle layer foundation
- [x] 1.2 Drag projection per handle type
- [x] 1.3 Overlay co-update during drag
- [x] 1.4 Acceptance and smoke-test extension
- README "Deviations from the spec" entry #3 marked closed.
- Acceptance-criteria table in README: row 4 updated to ✅ for path C.
```

### Definition of done

The full acceptance criteria for phase 1 (below) all pass.

---

## Acceptance criteria for phase 1

1. Each of the eight handle types (dip, strike, throw, layer-thickness top, layer-thickness bottom, fold-limb left, fold-limb right, fold-hinge) appears when the relevant feature is selected and is grabbable at all zoom levels.
2. Dragging any handle visibly updates the geometry and the corresponding measurement overlay in real time.
3. The dragged field has `manually_edited: true` set in the JSON; its `field_origin` becomes `"stated"`.
4. Camera rotation is suppressed during a drag and re-enabled on release.
5. The drag preview label follows the cursor and shows the current value during drag.
6. Frame rate stays at 30 fps or better during drags on a representative model (3 layers, 2 faults, 1 fold).
7. The extended smoke test passes.
8. The README acceptance-criteria table shows ✅ for row 4 (all three editing paths); the "Deviations" section no longer lists path C as partial.

When all eight are true, update `STATUS.md` to `"Phase 1 complete"`.

---

## Notes for the orchestrator

- This phase is **fully isolated** from phases 2 and 3 — different files, different concerns. Three agents can own phases 1, 2, 3 simultaneously and only meet in phase 4.
- The most likely source of bugs is **drag projection math** (1.2). If the user reports "drag feels wrong" or "the value jumps when I start dragging," the issue is in the projection geometry, not the handle layer or the overlay update. Suspect 1.2 first.
- **Performance regression risk** is in 1.3 if the overlay `update()` methods accidentally allocate. Run the smoke test with a 10-feature model after 1.3 lands and compare frame rate to baseline.
- This phase does **not** touch the interpreter, the description pane, or the JSON download/upload flow. If a change is needed in any of those, it belongs in another phase.
