# GeoForge v2 — TODO for Spec v2

Items below are out-of-scope for the current v1 codebase. They represent enhancements,
low-priority bugs, and new features identified during v1.1 and v1.2 smoke testing, to be
scoped into a future v2 specification.

---

## UX / Layout

### Prediction info in inspector sidebar (from WF-24/WF-25)
- Move prediction rationale, confidence, and predicted deposit type out of the 3D scene and
  into the Model Overview inspector panel on the right side.
- The 3D viewport should show only a minimal "PREDICTED: skarn (Fe-Cu)" label; all reasoning
  and confidence data should be readable in the sidebar without crowding the visual.
- If more than one prediction exists, a collapsible "Predictions" section in the inspector
  should list each one (type, metals, confidence, rationale) with a scroll if needed.

### Camera auto-zoom too tight for complex models (from RT-08 / WF-24)
- When predictions are active, or models include large intrusions, the initial camera
  distance is too close — the user cannot see the full model from the default position.
- Fix: after building scene contents, auto-fit camera using bounding box of ALL objects
  (model + predictions + intrusions), not just the layer stack bounding box.
- The `bounds` returned from `buildSceneContents` already captures the full extent;
  apply it to set camera distance on every model or prediction update.

### Custom model builder (from WF-01 user feedback)
- Currently the workspace opens to an empty state with example prompts.
- v2 option: ability to place geological features manually in the 3D viewport (click to add a
  layer, drag to add a fault) without using the text interpreter.
- Decision: whether the manual builder occupies the same first tab or a dedicated "Draw" tab
  is left to the v2 spec author.

---

## Geometry / Rendering

### Angular unconformity — tilted lower block clips through upper block (from RT-09c)
- When `buildAngularUnconformityLayers` tilts the lower slab group, the far corners of
  the rectangular lower block protrude into the space occupied by the upper horizontal
  block, producing visible intersection and Z-fighting flicker at the contact surface.
- In real geology, the erosion surface truncates the tops of the lower tilted beds —
  they should not extend above the contact plane.
- Fix: clip the lower block to the half-space below `contactY` using a Three.js clipping
  plane (`renderer.clippingPlanes`) or compute CSG subtraction. The clipping-plane approach
  is simpler: one `THREE.Plane(new T.Vector3(0,1,0), -contactY)` applied to the lower
  block's materials clips everything above `y = contactY`.
- Until fixed, the intersection is a known visual artefact noted in smoke-test-v1.6.

### Anticline vs syncline visual distinction at zero plunge (BUG-03, from WF-07)
- At default parameters (plunge 0°, interlimb ~120°) an anticline and syncline render
  identically because both produce a gentle arch with no directional cue.
- Fix: anticline default interlimb should be ~110° (tight arch upward); syncline default
  ~120° (wider trough downward). Or add a visible axial-plane label so the type is legible
  at zero plunge.

### History timeline event grouping (BUG-05, from WF-11)
- A description with three sentences ("sandstone layer, then limestone layer, followed by
  a normal fault") produces only two history steps (layers bundled as one, then fault).
- Root cause: the interpreter groups both layer sentences into a single "event" in the
  history sequence, even though they're separate geological episodes.
- Fix: each interpreted sentence should produce exactly one history step; the interpreter
  prompt should assign each layer an `order` field that corresponds to its deposition
  sequence, and the history slider should step through layer-by-layer.

---

## Accessibility / Testing

### Test fixtures for error-handling workflows (from WF-13/WF-14)
- WF-13 (invalid JSON upload) requires a `.json` file that passes `JSON.parse` but is not
  a valid GeoForge model. Add `tests/fixtures/invalid-model.json` with `{ "invalid": true }`.
- WF-14 (interpreter error) requires the dev server to return malformed JSON. Add a
  `--force-error` flag to `dev-server.js` that makes `/api/claude` return `{"broken":` so
  the interpreter throws.
- Document both in smoke-test-guide.md once fixtures exist.

### Mobile / narrow viewport (from WF-26)
- Currently shows a static "GeoForge is desktop-only" fallback below 900 px.
- v2 spec: simplified single-panel layout for tablets/phones with a drawer for the inspector.

---

## Share URL

### URL-safe base64 for share link (known improvement from architecture notes)
- Current share URL uses `btoa(JSON.stringify(...))` which produces `+`, `/`, `=` characters
  that are not URL-safe and break when pasted via some email clients or URL shorteners.
- Fix: encode as `encodeURIComponent(btoa(...))` and decode as `atob(decodeURIComponent(...))`.
- Low-risk change, does not affect existing localStorage session or any other feature.

---

## Direct 3D Drag (Removed in v1 — v2 decision needed)
- The drag-handle system (`handle-layer.jsx`) was removed in v1 (PR #39) after being reported
  as unreliable and causing browser freezes on Windows pointer events.
- The inspector numeric inputs (click ↑/↓) cover the same use case reliably.
- v2 decision: either invest in a polished drag UX (smooth snap, visible guide rails,
  multi-axis handles) or keep numeric-only editing as the sole interaction path.
