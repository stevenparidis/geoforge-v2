# GeoForge v1 Architecture

> Written for a new agent or contributor reading it cold. Target reading time: under five minutes.

## Quick start for a new contributor

- **No build step.** Open `index.html` directly in a browser; React, Three.js, and Babel are pulled from CDN. The 7 JSX files in `src/` are compiled in-browser by Babel Standalone.
- **Everything lives on `window`.** Because Babel-in-browser does not support ES modules, each source file registers its exports as a property of `window` (e.g. `window.GeoScene`, `window.GD`). When you add a new file, do the same thing — assign your public API to a named `window.*` property at the bottom of your IIFE.
- **The JSON model is the single source of truth.** Every change — LLM interpretation, inspector edit, JSON upload — flows into one `setModel(json)` call in `app.jsx`. The renderer reads that object directly; there is no second copy of state.
- **Overlay primitives are composable.** `three-helpers.jsx` exports small 3D drawing functions (`arc3D`, `arrow3D`, `compassRose`, etc.). Per-structure scene builders in the same file call these to produce the cyan measurement-origin overlays that float above each scene.
- **The amber dashed underline = inferred value.** Every numeric field on every layer and event carries a `field_origin` map. When a field's origin is `"inferred"`, the inspector renders it with a dashed amber underline, and the 3D label gets the `.inferred` CSS class.

---

## 1. The shared off-DOM WebGLRenderer

### Why it exists

Browsers impose a hard limit on simultaneous WebGL contexts per page (typically 8–16). The Reference view can display a dozen or more formation cards simultaneously, each needing its own 3D scene. If each card created its own `WebGLRenderer`, the tab would hit the limit and silently drop contexts.

### How `Surface` solves it

`scene.jsx` exports one singleton object called `Surface` (also written to `window.GeoSurface`). It owns a single `WebGLRenderer` attached to a canvas that is positioned off-screen at `top: -10000px; left: -10000px` — it is in the DOM (required for GPU access) but invisible:

```js
const Surface = {
  inited: false,
  webglCanvas: null,
  renderer: null,
  scenes: new Set(),
  raf: 0,
  init() { /* creates one WebGLRenderer, calls tick() */ },
  addScene(entry) { this.scenes.add(entry); this.init(); },
  removeScene(entry) { this.scenes.delete(entry); },
  tick() { /* rAF loop — renders each registered scene in turn */ },
};
```

### The per-card 2D canvas trick

Each `GeoScene` component creates two canvases:

1. **The shared off-screen WebGL canvas** — owned by `Surface.renderer`, resized to each card's dimensions on demand.
2. **A per-card 2D canvas** (`canvas2d`) — appended as an absolutely-positioned child of the card's host `<div>`. This canvas lives inside the card, so `overflow: hidden` and `border-radius` clip it correctly.

In `Surface.tick()`, after calling `r.render(entry.scene, entry.camera)` on the shared renderer, the resulting pixels are immediately blitted to the card's 2D canvas:

```js
ctx2d.clearRect(0, 0, entry.canvas2d.width, entry.canvas2d.height);
ctx2d.drawImage(this.webglCanvas, 0, 0);
```

This single `drawImage` call is cheap (GPU → 2D canvas copy). Labels (CSS2D objects) are rendered by a per-scene `CSS2DRenderer` that writes directly into a dedicated `<div>` alongside the 2D canvas.

Cards that are scrolled out of the viewport are skipped each tick to save GPU:

```js
if (rect.bottom < -200 || rect.top > window.innerHeight + 200) continue;
```

---

## 2. The `window` namespacing pattern

Babel Standalone compiles JSX in `<script type="text/babel">` tags, but it does not give those scripts access to ES module `import`/`export` syntax. Every file is therefore wrapped in an IIFE and attaches its public API to `window`:

| File | Export |
|---|---|
| `geo-data.jsx` | `window.GD` |
| `three-helpers.jsx` | `window.GeoThree` |
| `scene.jsx` | `window.GeoScene`, `window.GeoSurface` |
| `reference-view.jsx` | `window.ReferenceView` |
| `workspace.jsx` | `window.Workspace`, `window.GeoForgeInterpret` |
| `tweaks-panel.jsx` | `window.useTweaks`, `window.TweaksPanel`, and individual control components |
| `app.jsx` | (mounts `<App />` directly; no window export needed) |

Three.js itself is loaded as an ES module and then hoisted onto `window` by a small inline `<script type="module">` in `index.html`:

```js
window.THREE = THREE;
window.OrbitControls = OrbitControls;
window.CSS2DRenderer = CSS2DRenderer;
window.CSS2DObject = CSS2DObject;
window.__threeReady = true;
window.dispatchEvent(new Event('three-ready'));
```

**Adding a new module:** wrap your code in `(function () { ... })();`, write your logic, then at the bottom assign your exports: `window.MyModule = { ... };`. Add the new `<script type="text/babel" src="src/my-module.jsx">` tag in `index.html` after whichever files it depends on.

---

## 3. JSON as the single source of truth

The entire application state is one plain JSON object called the **GeoModel**. Its top-level shape is:

```json
{
  "meta": { "name": "...", "description": "..." },
  "layers": [ { "id", "name", "lithology", "thickness", "order", "field_origin", ... } ],
  "events": [ { "id", "type", "subtype", "field_origin", ... } ],
  "tilt":   { "strike", "dip", "dip_direction", "field_origin" }
}
```

### Three writers, one setter

All state changes flow through `setModel` (React state setter in `app.jsx`):

1. **LLM interpretation** — `workspace.jsx`'s `interpret()` calls `window.claude.complete`, parses the returned JSON, calls `applyDefaults(json)`, and passes the result to `setModel`.
2. **Inspector edits** — `updateField(kind, id, field, value)` in `workspace.jsx` deep-clones the model with `JSON.parse(JSON.stringify(m))`, mutates the target field, sets `field_origin[field] = 'stated'` and `manually_edited = true`, then returns the new object to `setModel`.
3. **JSON upload** — the file reader in `workspace.jsx` parses the uploaded file, calls `applyDefaults(json.model || json)`, and passes it to `setModel`.

The `GeoScene` component receives the current model as a prop and calls `window.GeoThree.buildSceneContents(model)` to rebuild the Three.js scene graph. It never holds its own copy of geological data.

### `applyDefaults(model)`

Defined in `workspace.jsx`. Called after every model write. It:

- Ensures `model.meta`, `model.layers`, and `model.events` exist (guards against partial LLM output).
- Assigns sequential `id` and `order` if missing.
- Clamps `thickness` to the range `[0.2, 3.0]`.
- Ensures `field_origin` exists on every layer and event.
- For fault events: fills in `dip` (from `window.GD.DEFAULTS.fault_dip[subtype]`), `dip_direction` (default 90°), and `strike` (derived as `(dip_direction + 90) % 360`) when absent, marking each as `'inferred'`.
- For fold events: fills in `axis_strike`, `plunge`, `plunge_direction`, `interlimb_angle`, `amplitude`, `wavelength`, and monocline-specific fields when absent, each marked `'inferred'`.
- Rescales unrealistically large displacement values (raw-metre LLM output) to the model's internal 0–2 unit range.

---

## 4. The `field_origin` / `manually_edited` convention

Every layer object and every event object carries a `field_origin` dictionary mapping field names to one of three string values:

| Value | Meaning |
|---|---|
| `"stated"` | The student's description explicitly mentioned this number. |
| `"inferred"` | The LLM or `applyDefaults` guessed the value because it was absent. |
| `"default"` | (Used in reference formation data in `geo-data.jsx` for the same concept.) |

In practice the live workspace uses `"stated"` and `"inferred"`; the static `REFERENCE_FORMATIONS` data in `geo-data.jsx` also uses `"inferred"` to mark fields that are pedagogically interesting to highlight.

### How it propagates

- **`applyDefaults`** writes `field_origin[field] = 'inferred'` whenever it fills in a missing value.
- **The LLM** is instructed in `INTERPRETER_SYSTEM_PROMPT` to write `field_origin` for every field it emits, using `"stated"` when the student said the number and `"inferred"` when it guessed.
- **Inspector edit handler** (`updateField`) writes `field_origin[field] = 'stated'` whenever a user changes a value, and also sets `manually_edited = true` on the feature.

### How the UI reads it

In the inspector (`FeatureInspector` in `workspace.jsx`):

```js
const fo = feature.field_origin || {};
<FieldRow label="Dip" value={...} inferred={fo.dip === 'inferred'} ... />
```

`FieldRow` applies `className="field-value inferred"` when `inferred` is true, which triggers the CSS rule:

```css
.field-value.inferred {
  color: var(--inferred);
  text-decoration: underline dashed var(--inferred);
  text-underline-offset: 3px;
}
```

In the 3D scene, `three-helpers.jsx` uses the same flag when building CSS2D labels:

```js
const inferred = s.L.field_origin?.thickness === 'inferred';
overlays.add(doubleArrow(bottom, top, inferred ? COLOR.inferred : COLOR.overlay, ...));
const lbl = makeValueLabel(`${s.thickness.toFixed(2)} u`, { inferred });
```

`makeValueLabel` adds the class `geo-overlay-value inferred` to the DOM element, which CSS styles with the amber dashed underline.

---

## 5. Script load order

`index.html` loads scripts in a strict dependency order. Each file assumes the previous ones are already on `window`:

```
1. Three.js module (inline <script type="module">)
     → sets window.THREE, window.OrbitControls, window.CSS2DRenderer,
       window.CSS2DObject, window.__threeReady = true
     → dispatches 'three-ready' event

2. React 18 UMD          → window.React
3. ReactDOM 18 UMD       → window.ReactDOM
4. Babel Standalone      → enables <script type="text/babel"> compilation

5. src/geo-data.jsx      → window.GD
     Depends on: nothing
     Provides: LITHOLOGY, PERIODS, DEFAULTS, REFERENCE_FORMATIONS,
               REFERENCE_SECTIONS, SAMPLE_DESCRIPTIONS

6. src/three-helpers.jsx → window.GeoThree
     Depends on: window.THREE, window.GD (for LITHOLOGY colours)
     Provides: buildSceneContents, makeGrid, makeNorthArrow,
               all overlay primitives

7. src/scene.jsx         → window.GeoScene, window.GeoSurface
     Depends on: window.THREE, window.OrbitControls,
                 window.CSS2DRenderer, window.CSS2DObject,
                 window.GeoThree, React
     Provides: <GeoScene> React component, Surface singleton

8. src/reference-view.jsx → window.ReferenceView
     Depends on: window.GeoScene, window.GD, React
     Provides: <ReferenceView> React component

9. src/workspace.jsx     → window.Workspace, window.GeoForgeInterpret
     Depends on: window.GeoScene, window.GD, React
     Provides: <Workspace> React component, interpret()

10. src/tweaks-panel.jsx  → window.useTweaks, window.TweaksPanel, controls
     Depends on: React
     Provides: draggable floating Tweaks shell and form controls

11. src/app.jsx           → (mounts App to #root)
     Depends on: ALL of the above
     Waits for 'three-ready' event before calling ReactDOM.createRoot():

     if (window.__threeReady) mount();
     else window.addEventListener('three-ready', mount, { once: true });
```

The `three-ready` event is critical: Three.js loads as an ES module asynchronously. The Babel scripts begin executing as they are fetched, but `app.jsx` does not call `ReactDOM.createRoot` until it sees `window.__threeReady`. This avoids a race where `<GeoScene>` would try to instantiate `window.THREE` before the module has resolved.

---

## 6. Where the LLM call lives

### `interpret()` in `workspace.jsx`

```js
async function interpret(description, onErr) {
  const raw = await window.claude.complete({
    messages: [{ role: 'user', content: `Description:\n"""${description}"""\n\nReturn the GeoModel JSON only.` }],
    system: INTERPRETER_SYSTEM_PROMPT,
  });
  // strip Markdown fences, find first { ... last }, JSON.parse
  return applyDefaults(json);
}
```

`window.claude.complete` is provided by the host environment (the Claude Code harness or a thin adapter in the HTML). It accepts an object with:

- `messages`: an array of `{ role, content }` objects (standard Claude messages format).
- `system`: a system prompt string.

It returns a `Promise<string>` — the raw text of the model's reply.

The function is also exposed on `window.GeoForgeInterpret = interpret` for external callers.

### `INTERPRETER_SYSTEM_PROMPT`

A large constant string defined at the top of `workspace.jsx`. It tells the LLM to:

- Output a single JSON object matching the GeoModel schema (no prose, no Markdown).
- Use the trigger-phrase library to classify the structure type.
- Apply the DEFAULTS table when values are absent, marking them `"inferred"` in `field_origin`.
- Quote the verbatim source sentence in `description_source` for each feature.
- Never ask the user — always best-guess and flag uncertainties as inferred.

---

## 7. The overlay primitives system

### Primitives in `three-helpers.jsx`

All primitive functions are pure: they take geometric parameters and return Three.js objects. They do not modify any external state. They are collected under `window.GeoThree.helpers`:

| Primitive | What it draws |
|---|---|
| `arc3D(center, from, to, radius, color, opts)` | Arc between two unit vectors; returns `{ line, midPoint, points }` |
| `arcWedge(center, from, to, radius, color, op)` | Filled semi-transparent wedge for the same angular span |
| `arrow3D(from, to, color, opts)` | `THREE.ArrowHelper` with consistent material settings |
| `doubleArrow(from, to, color, opts)` | Two arrows pointing outward from midpoint (used for thickness) |
| `solidLine(points, color, opts)` | `THREE.Line` from an array of Vector3 points |
| `dashedLine(p1, p2, color, opts)` | `LineDashedMaterial` line with `computeLineDistances()` |
| `horizontalDisc(center, radius, color, op)` | Flat translucent circle for the horizontal reference plane |
| `compassRose(center, radius)` | N/E/S/W tick marks and CSS2D letters |
| `makeLabel(text, opts)` | CSS2D floating label with `.geo-label` class |
| `makeValueLabel(text, opts)` | Smaller `.geo-overlay-value` label (value annotations near geometry) |

Math helpers (`bearingVec`, `strikeVec`, `downDipVec`, `upDipVec`, `planeNormal`, `rad`, `deg`) convert between geological angle conventions and Three.js Vector3 space (+X = east, +Y = up, +Z = north).

### Per-structure builders

Also in `three-helpers.jsx`. Each builder returns `{ meshes, overlays, labels }`:

| Builder | Handles |
|---|---|
| `buildLayersOnly(model)` | Flat or tilted layer cake; thickness arrows; strike/dip overlays if tilted |
| `buildFaultScene(model)` | All seven fault subtypes; clips layers with `THREE.Plane`; adds dip, throw/heave, strike-slip, or listric overlays |
| `buildFoldScene(model)` | Anticline, syncline, monocline; tessellated surface; hinge, axial plane, interlimb arc, plunge overlays |

`addDipOverlay` is a composable helper called by both `buildLayersOnly` and `buildFaultScene` — it draws the horizontal reference disc, compass rose, strike line, dip-direction arrow+arc, and dip arc as a single unit.

### The master dispatcher

```js
function buildSceneContents(model, opts = {}) {
  const firstEvent = (model.events || [])[0];
  if (!firstEvent)                    res = buildLayersOnly(model);
  else if (firstEvent.type === 'fault') res = buildFaultScene(model);
  else if (firstEvent.type === 'fold')  res = buildFoldScene(model);
  else                                res = buildLayersOnly(model);
  // ... attaches root, overlays, labels to Three.js groups
}
```

### How to add a new structure type

1. **Add a builder function** in `three-helpers.jsx` following the `{ meshes, overlays, labels }` return convention. Call existing primitives from `GeoThree.helpers` to compose overlays.
2. **Register the type** in `buildSceneContents`'s dispatch block (add an `else if` branch keyed on `firstEvent.type` or `firstEvent.subtype`).
3. **Add reference formation entries** in `geo-data.jsx`'s `REFERENCE_FORMATIONS` array. Each entry needs a `model` field with valid GeoModel JSON (with `field_origin` populated), a `cameraHint`, a list of `overlays` strings, and the `section` id (`'layers'`, `'faults'`, or `'folds'`).
4. **Update the LLM system prompt** in `workspace.jsx`'s `INTERPRETER_SYSTEM_PROMPT` to add trigger phrases and any new schema fields.
5. **Extend `applyDefaults`** in `workspace.jsx` if the new type has fields that need default values.

The `REFERENCE_FORMATIONS` array in `geo-data.jsx` serves as both the reference-view data source and a living test fixture: every card is a self-contained model that exercises the full render pipeline.
