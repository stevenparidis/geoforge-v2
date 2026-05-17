# GeoForge v2 — v1 Complete Context Package

This document is the full handoff for v1. It is designed to be pasted into a new Claude
conversation or uploaded to Claude design as the sole context needed to understand what
has been built and begin scoping v2.

---

## 1. What is GeoForge?

GeoForge is a desktop-only single-page web application that lets geology students interpret
plain-English geological descriptions into interactive 3D structural models. The user types
a description such as _"A sandstone layer with a normal fault dipping 60° east"_ and the
app calls Claude (via the Anthropic API) to parse it into a structured `GeoModel` JSON, then
renders the model in a real-time 3D Three.js viewport with measurement-origin overlays.

The app has two tabs:
- **Workspace** — text interpreter, 3D viewport, model inspector
- **Formation reference** — a static scrollable glossary of every geological feature type
  GeoForge supports, each with its own live 3D example card

Primary audience: first- and second-year geology students learning to read structural geology.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| UI framework | React 18 (loaded via CDN; transpiled in-browser with Babel standalone) |
| 3D rendering | Three.js r162 (CDN) + CSS2DRenderer for HTML labels |
| AI interpreter | Claude Haiku 4.5 via Anthropic API (`/v1/messages`) |
| Dev server | Node.js `dev-server.js` — serves static files + proxies `/api/claude-complete` |
| Persistence | `localStorage` (auto-save on every model/description change) |
| Share | URL fragment `#model=<base64>` — encode/decode with `btoa`/`atob` |
| Export | `PNG` via Three.js `renderer.domElement.toDataURL`; `JSON` via `Blob` download |
| Build system | **None** — no bundler, no transpile step, no CI. Babel runs in the browser. |
| Port | `http://localhost:8000` |

There is no package.json / npm. The only runtime dependency is `node dev-server.js`.

---

## 3. Source File Inventory

```
c:\Geoforge_v2\
├── index.html                  Entry point — loads CDN scripts + all src/ files via <script type="text/babel">
├── dev-server.js               Static file server (Cache-Control: no-store) + Anthropic API proxy
├── todo.md                     Deferred v2 items (single source of truth for backlog)
├── src/
│   ├── app.jsx                 Root: tab routing (Workspace / Reference), localStorage, share URL, export
│   ├── workspace.jsx           Workspace tab: 3-panel layout, interpreter, inspector, prediction engine
│   ├── scene.jsx               GeoScene React component — owns the Three.js renderer, camera, orbit controls
│   ├── three-helpers.jsx       ALL 3D geometry: buildSceneContents dispatcher + every scene builder
│   ├── geo-data.jsx            LITHOLOGY palette, REFERENCE_SECTIONS, REFERENCE_FORMATIONS (reference cards)
│   ├── reference-view.jsx      Formation Reference tab — renders reference card grid from geo-data.jsx
│   ├── tweaks-panel.jsx        Dev-only tweaks panel (labels/overlays toggles, amber colour)
│   └── description-diff.js     Diff utility for incremental model updates (merge mode)
├── implementation/v1/          Phase docs, specs, completion reports (v1 archive)
└── tests/v1/                   All v1 smoke test guides (v1.2 through v1.6)
```

**Key file roles:**

- `three-helpers.jsx` (~2200 lines) is the largest and most complex file. It contains every
  scene builder function and is the only place that creates Three.js geometry. Its public
  entry point is `window.GeoHelpers.buildSceneContents(model, opts)`.

- `workspace.jsx` (~700 lines) owns the interpreter pipeline: textarea → Claude API →
  `applyDefaults()` → `setModel()`. It also owns the left-panel anchor list, the right-panel
  Model Overview + FeatureInspector, and the history playback slider.

- `scene.jsx` (~300 lines) is a React component that wraps a Three.js `WebGLRenderer`. It
  re-runs `buildSceneContents` whenever `model` changes and exposes orbit controls (drag to
  rotate, scroll to zoom).

---

## 4. GeoModel JSON Schema

This is the exact schema the interpreter produces and the renderer consumes.

```json
{
  "meta": { "name": "string", "description": "string" },

  "layers": [
    {
      "id": "string",
      "name": "string",
      "lithology": "sandstone|mudstone|shale|conglomerate|limestone|chalk|dolostone|chert|coal|granite|diorite|gabbro|basalt|rhyolite|schist|gneiss|quartzite|marble|slate",
      "thickness": "number (0.3–2.0 model units)",
      "order": "int, 0=bottom",
      "description_source": "verbatim sentence from user",
      "field_origin": { "thickness": "stated|inferred", "lithology": "stated|inferred" }
    }
  ],

  "events": [
    {
      "id": "string",
      "type": "fault|fold",
      "subtype": "normal|reverse|thrust|strike-slip|oblique|listric  OR  anticline|syncline|monocline",
      "strike": "0–360 (faults)",
      "dip": "0–90 (faults)",
      "dip_direction": "0–360 (faults)",
      "throw": "number (faults, optional)",
      "heave": "number (faults, optional)",
      "displacement": "number (strike-slip)",
      "sense": "dextral|sinistral (strike-slip)",
      "rake": "0–90 (oblique)",
      "dip_at_depth": "number (listric)",
      "detachment_depth": "number (listric)",
      "axis_strike": "0–360 (folds)",
      "plunge": "0–90 (folds)",
      "plunge_direction": "0–360 (folds)",
      "interlimb_angle": "0–180 (folds)",
      "amplitude": "number (folds, default 1.0)",
      "wavelength": "number (folds, default 4.0)",
      "flexure_dip": "number (monocline)",
      "flexure_width": "number (monocline)",
      "step_height": "number (monocline)",
      "order": "int",
      "description_source": "string",
      "field_origin": { "fieldName": "stated|inferred" }
    }
  ],

  "tilt": {
    "strike": "0–360", "dip": "0–90", "dip_direction": "0–360",
    "field_origin": {}
  },

  "intrusions": [
    {
      "id": "string",
      "subtype": "dyke|sill|batholith|laccolith",
      "rock_type": "granite|diorite|gabbro|basalt|rhyolite",
      "strike": "0–360",
      "dip": "0–90",
      "thickness": "number",
      "depth": "number",
      "description_source": "string",
      "field_origin": {}
    }
  ],

  "unconformities": [
    {
      "id": "string",
      "subtype": "angular|disconformity|nonconformity",
      "above_layer_id": "string",
      "below_layer_id": "string",
      "time_gap_ma": "number",
      "angular_discordance": "number (degrees, angular type only)",
      "description_source": "string",
      "field_origin": {}
    }
  ],

  "mineralisation": [
    {
      "id": "string",
      "subtype": "porphyry|orogenic_gold|vms|skarn|epithermal",
      "metals": "string (e.g. Cu-Au)",
      "grade": "number or null",
      "structural_control_event_id": "string (optional)",
      "depth_top": "number (optional)",
      "alteration_radius": "number",
      "five_elements": {
        "heat_source": "string",
        "fluid_source": "string",
        "metal_source": "string",
        "pathway": "string",
        "trap": "string"
      },
      "description_source": "string",
      "field_origin": {}
    }
  ],

  "predictions": [
    {
      "id": "P1|P2|P3",
      "subtype": "porphyry|orogenic_gold|vms|skarn|epithermal",
      "metals": "string",
      "rationale": "string",
      "confidence": "high|medium|low",
      "alteration_radius": "number",
      "predicted": true,
      "five_elements": {}
    }
  ]
}
```

**`field_origin` convention:** every numeric/categorical field has a matching entry in
`field_origin` set to `"stated"` (user gave the number) or `"inferred"` (AI filled a
default). Inferred values render in amber with a dashed underline; stated values render
in white. This is a core pedagogical feature.

---

## 5. Feature Inventory (Phases 0–8)

### Phase 0 — Scaffolding
- Babel-in-browser React SPA skeleton
- `dev-server.js` static server + Anthropic API proxy
- Basic three-panel layout (left / centre 3D / right)
- Grid + north arrow in 3D viewport on startup (always visible, even before first interpret)
- `localStorage` session auto-save and restore
- Share URL via `#model=<base64>` fragment
- PNG export and JSON import/export
- Reset (clears model, description, localStorage, 3D scene back to grid-only)
- Mobile fallback: `<900px` shows "desktop-only" message

### Phase 1 — Layers
- Horizontal layer stack from `GeoModel.layers[]`
- Coloured by lithology from `GD.LITHOLOGY` palette
- Per-layer thickness double-arrow overlays + value labels (stated/inferred styling)
- Optional whole-stack tilt via `model.tilt` (strike/dip overlays, dip-direction arc)
- Layer name CSS2D labels on block face
- Click layer in inspector → highlight in 3D

### Phase 2 — Faults
- Normal, reverse, thrust, strike-slip, oblique, listric subtypes
- Hanging-wall / footwall block separation (slab offset by slip vector)
- Fault plane mesh (semi-transparent, coloured by fault type)
- Strike line, dip arc, dip-direction arc overlays
- Throw (vertical cyan line) + heave (horizontal cyan line) overlays
- Throw/heave labels with stated/inferred styling
- Displacement arrow for strike-slip faults

### Phase 3 — Folds
- Anticline, syncline, monocline
- Sine-wave fold geometry applied to each layer slab
- Hinge line overlay with interlimb arc + angle label
- Plunge arrow and plunge angle arc

### Phase 4 — Intrusions
- **Dyke**: vertical dark rectangle cutting through layer stack
- **Sill**: flat horizontal sheet extending beyond layer edges (width ≥ 5 units, protrudes visibly)
- **Batholith**: dome/hemisphere below the layer stack
- **Laccolith**: dome pushing upward from inside the stack (position clamped so dome always reaches surface)
- All with rock-type colour, thickness labels, measurement overlays

### Phase 5 — Unconformities
- **Angular**: lower layer group rendered as a rotated block (tilted at `angular_discordance`°
  around Z-axis, pivoting at the contact surface); upper layers remain flat
- **Disconformity**: wavy amber contact line + time-gap label
- **Nonconformity**: wavy amber contact line + type label
- Contact line uses `depthTest:false` + `renderOrder:9` so it's never occluded by layer geometry
- Discordance arc + angle label for angular type
- Dipping bedding-plane indicator lines below angular contact
- Thickness overlays on upper block only (lower block tilted — exact world-space arrow positions are a v2 item)

### Phase 6 — Mineralisation
- **Porphyry**: 4 concentric transparent ellipsoidal shells (propylitic/argillic/phyllic/potassic)
  offset to x=1.5 so they protrude from the side of the layer block; zone labels alongside
- **Orogenic gold**: 3 thin parallel vein planes along structural control orientation
- **VMS**: lens-shaped (flattened sphere) at base of stack + chlorite halo
- **Skarn**: flattened ellipsoid at intrusion contact, offset to block edge
- **Epithermal**: 3 near-vertical vein boxes near top of stack + paleo-boiling zone disc
- Ore body centre (`oreY`) clamped to never go below layer block base
- Predictions (wireframe purple sphere) rendered only when no explicit mineralisation exists

### Phase 7 — Inspector
- Right panel **Model Overview** lists: Layers, Events, Intrusions, Unconformities, Mineralisation
- Click any item → **FeatureInspector** opens with read-only field rows
- Stated values in white; inferred values in amber with dashed underline
- Left-panel **anchor list** mirrors the same items; clicking scrolls the right panel

### Phase 8 — Predictions
- "Predict" button calls Claude with `PREDICTION_SYSTEM_PROMPT` + current model JSON
- Returns up to 3 `prediction` objects with subtype, metals, confidence, rationale, five_elements
- Rendered as wireframe purple sphere; suppressed when explicit `mineralisation` already present
- Five-elements annotation (heat source, fluid source, metal source, pathway, trap) as icon + label overlays

### Formation Reference Tab
- 5 sections: Faults (6 cards), Folds (3), Layers (4), Intrusions (4), Unconformities (3)
- Each card = `GeoScene` with a pre-built model + `cameraHint: { phi, theta, dist }` (spherical coords)
- Cards are camera-rotatable (orbit controls)
- Global toolbar toggles: Labels On/Off, Overlays On/Off

---

## 6. UI Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER: GeoForge v2 | [Workspace] [Formation reference]  [Labels][Overlays][Grid]  │
├──────────────┬──────────────────────────────────┬────────────────────────┤
│  LEFT PANEL  │       CENTRE: 3D VIEWPORT         │    RIGHT PANEL         │
│  (300px)     │       (flex-grow)                 │    (300px)             │
│              │                                   │                        │
│  Description │   Three.js WebGLRenderer          │  Model Overview        │
│  textarea    │   OrbitControls (drag/scroll)     │  ├ Layers              │
│              │   Grid + North arrow always on    │  ├ Events              │
│  [Interpret] │                                   │  ├ Intrusions          │
│  [Reset]     │   Overlays: cyan lines, arcs,     │  ├ Unconformities      │
│  [Predict]   │   amber labels, CSS2D HTML labels │  └ Mineralisation      │
│              │                                   │                        │
│  Sample      │   History slider at bottom        │  FeatureInspector      │
│  prompts     │                                   │  (read-only field rows)│
│  (anchors)   │                                   │                        │
│              │                                   │  [Export JSON]         │
│  Anchor list │                                   │  [Export PNG]          │
│  (mirrors    │                                   │  [Share URL]           │
│   inspector) │                                   │                        │
└──────────────┴──────────────────────────────────┴────────────────────────┘
```

**Colour scheme:** dark UI (`#181825` background, `#cdd6f4` primary text).
**Inferred values:** amber `#f59e0b` with dashed underline.
**3D overlay colour:** cyan `#67e8f9` for measurement lines; amber `#FFAA00` for unconformity.
**Prediction colour:** purple `#8b5cf6`.

---

## 7. Key Architectural Decisions Made in v1

| Decision | Rationale |
|---|---|
| No bundler — Babel in-browser | Zero setup friction for a student audience; no Node.js build step |
| `buildSceneContents` as single dispatcher | All 3D logic in one file; easy to read linearly |
| CSS2DObject for labels | HTML labels always face camera, support styled text; no texture atlas needed |
| `depthTest:false` + `renderOrder:9` for overlay lines | Three.js `LineBasicMaterial` ignores `linewidth>1` on Windows; only `depthTest:false` ensures lines are visible over opaque geometry |
| Angular unconformity: rotate lower block, not individual slabs | Visually clear tilt with minimal geometry change; individual slab tilt would require rebuilding the entire layer builder |
| Predictions suppressed when explicit mineralisation present | Prevents confusing double-target render (wireframe sphere + shells at same location) |
| Drag handles removed (was `handle-layer.jsx`) | Caused browser freezes on Windows pointer events; inspector numeric inputs cover the same use case reliably |
| `localStorage` always writes (even on Reset) | Previous bug: null state wasn't saved, so refresh after Reset restored the old session |
| `cameraHint: { phi, theta, dist }` | `GeoScene` reads spherical coords; earlier `{ distance, azimuth, elevation }` caused NaN camera positions in reference cards |

---

## 8. Bugs Fixed During v1 Cycle (PRs #36–#40)

| PR | What was broken | Fix |
|---|---|---|
| #36 | Formation reference cards blank (intrusions + unconformities) | `cameraHint` used wrong key names (`distance`/`azimuth`/`elevation` → `dist`/`phi`/`theta`) |
| #37 | 3D viewport blank on fresh startup; Reset didn't clear scene | `if (!st \|\| !model) return` → `if (!st) return` in scene rebuild effect |
| #37 | localStorage not cleared on Reset | `if (model != null \|\| description)` guard removed; now always writes |
| #38 | Throw/heave missing on 1-layer fault model | `slabs.length < 2` guard → `slabs.length < 1` |
| #38 | Sill invisible in small models | Sill XZ `2*totalHeight` → `Math.max(2*totalHeight, 5)` |
| #38 | Laccolith dome hidden when depth ≥ radius | `effectiveDepth = Math.min(rawDepth, radius - radius*0.2)` |
| #39 | Inspector missing intrusions / unconformities / mineralisation | Added `selectedFeature` lookup + onClick for all three kinds; added Model Overview sections |
| #39 | Drag handles (handle-layer.jsx) froze app on Windows | Deleted entire 654-line file; inspector numeric inputs remain |
| #40 | Formation reference cards blank for angular unconformity | Lower layers now rendered as rotated group (`buildAngularUnconformityLayers`) |
| #40 | Unconformity wavy contact line invisible | Moved from `meshes` (depth-tested, behind layer block) to `overlays` (depthTest:false) |
| #40 | Porphyry: two confusing targets in 3D | Removed horizontal disc overlays; prediction sphere suppressed when explicit mineralisation present |

---

## 9. Deferred to v2 (from todo.md)

### UX / Layout
- **Prediction info in inspector sidebar** — move rationale/confidence out of 3D viewport into Model Overview; only a minimal "PREDICTED: skarn" label should remain in the viewport
- **Camera auto-zoom** — after building scene, auto-fit camera to bounding box of ALL objects (model + predictions + intrusions), not just the layer stack
- **Custom model builder** — click-to-place geological features in 3D without text interpreter (same tab or dedicated "Draw" tab — TBD for v2 spec)

### Geometry / Rendering
- **Anticline vs syncline at zero plunge (BUG-03)** — visually identical; need tighter arch for anticline or an axial-plane label
- **History timeline event grouping (BUG-05)** — multiple layer sentences produce one history step; each sentence should produce exactly one step
- **Angular unconformity: lower block clips through upper block** — rectangular lower block corners protrude into upper block; needs Three.js clipping plane (`renderer.clippingPlanes`) to truncate lower beds at erosion surface
- **Thickness arrows for tilted lower block** — skipped in v1 (hard to compute exact world-space positions through tilt transform)
- **Scale inconsistency** — stated and inferred depth/thickness values can be in different units; needs normalisation

### Inspector / Interaction
- **Inspector fields read-only** — unconformity and mineralisation fields are display-only; should be editable (same ↑/↓ spinners used for layer/fault fields)
- **Direct 3D drag (removed in v1)** — if reinstated for v2, needs smooth snap, visible guide rails, multi-axis handles to be reliable on Windows

### Accessibility / Testing
- **Test fixtures for error-handling** — `tests/fixtures/invalid-model.json` for WF-13; `--force-error` flag in dev-server.js for WF-14
- **Mobile/narrow viewport (WF-26)** — static "desktop-only" message below 900px; v2 needs drawer-based single-panel layout for tablets

### Share URL
- **URL-safe base64** — current `btoa(JSON.stringify(...))` produces `+`/`/`/`=` characters that break in some email clients; fix is `encodeURIComponent(btoa(...))` / `atob(decodeURIComponent(...))`

---

## 10. Current Working State (Post v1.6 Smoke Test)

All v1.6 smoke tests passed. The app runs at `http://localhost:8000` after `node dev-server.js`
with `ANTHROPIC_API_KEY` set. Current verified working features:

| Feature | Status |
|---|---|
| Layer interpreter (plain English → 3D) | Working |
| Fault rendering (all 6 subtypes) | Working |
| Fold rendering (anticline/syncline/monocline) | Working |
| Intrusion rendering (dyke/sill/batholith/laccolith) | Working |
| Angular unconformity (tilted lower block) | Working — lower block corners clip into upper block (known artefact) |
| Disconformity / nonconformity | Working |
| Mineralisation (all 5 subtypes) | Working — porphyry shows single target |
| Predictions (suppress when mineralisation explicit) | Working |
| Formation reference tab (all 20 cards) | Working |
| Inspector (layers, events, intrusions, unconformities, mineralisation) | Working — read-only |
| History slider | Working |
| JSON import/export | Working |
| PNG export | Working |
| Share URL | Working (not URL-safe base64 — known) |
| Reset | Working (clears scene + localStorage) |
| localStorage persistence | Working |
| Mobile fallback | Working (static message <900px) |

---

## 11. Suggested v2 Starting Points

Based on todo.md and the v1.6 smoke test session, the highest-impact v2 items are:

1. **Angular unconformity clipping** — use `THREE.Plane` clipping on lower block materials to truncate at erosion surface. One-line material change per slab.
2. **Inspector editable fields** — extend the existing ↑/↓ spinner pattern from layers/faults to unconformity and mineralisation fields.
3. **Camera auto-fit** — `buildSceneContents` already returns `bounds`; apply it to set camera distance after every rebuild.
4. **Prediction sidebar** — move rationale/confidence/five-elements from 3D labels into a collapsible right-panel section.
5. **URL-safe base64** — trivial one-line fix in app.jsx.
