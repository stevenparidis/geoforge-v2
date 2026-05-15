# GeoForge v1 — prototype

A working prototype of GeoForge: a plain-English structural geology modeller for first- and second-year geology students. Type a description in everyday English; an LLM interprets it into a structured `GeoModel` JSON; Three.js renders the geology with every measurement annotated against its geometric origin.

This project contains both v1 deliverables:

1. **Workspace** — the live modeller (left description pane, centre 3D view, right inspector, history scrubber, JSON download/upload).
2. **Formation reference** — a glossary of every geological structure the renderer supports, each shown as its own 3D card with full measurement-origin overlays. Switch tabs in the top toolbar.

## Running

Open `index.html` in any modern browser. No build step. No server. The only network requests are Google Fonts (Geist), the Three.js module, React, Babel-standalone — all loaded from public CDNs.

There is no persistence: the description and model live entirely in memory. The **↓ JSON** button (top-right of the inspector) downloads the current state; **↑ JSON** uploads it back.

## What's in `v1`

- Three-pane interface (Description / 3D / Inspector) per `spec-v1.md` §9.
- AI interpreter calling Claude with the full trigger-phrase library and JSON schema embedded in the system prompt; operates in silent best-guess mode and flags inferred fields.
- A `GeoModel` JSON schema implementation (see `geo-data.jsx` for the lithology + period tables, `workspace.jsx` for `applyDefaults`).
- A Three.js renderer for:
  - Horizontal strata, dipping strata, multi-layer sequences.
  - All seven v1 fault types: normal, reverse, thrust, strike-slip (dextral & sinistral), oblique-slip, listric.
  - All three simple folds: anticline, syncline, monocline.
- The full set of measurement-origin overlays from `spec.md` §3 / `spec-v1.md` §4: dip vertex+arc, strike line + compass, dip-direction compass + arc, layer thickness vectors, throw/heave reconstruction with pre-fault datum, slip-vector decomposition, fold hinge + axial plane + interlimb-angle arc + plunge arc.
- The stated-vs-inferred contract: stated values render in white; inferred values in **amber with a dashed underline** (toolbar Tweaks can recolour the amber).
- Inspector editing (path B): every numeric field is editable; on commit, the JSON updates, the 3D view re-renders, and the field is reclassified as stated and `manually_edited: true`.
- Direct 3D drag editing (path C, Phase 1): eight cyan handle types (fault-dip, fault-strike, fault-throw, layer-thickness top/bot, fold-limb left/right, fold-hinge) appear when a feature is selected; dragging updates the JSON field in real-time with `manually_edited: true` and `field_origin: 'stated'`. Overlay arcs and labels co-update in-place during drags without a full scene rebuild.
- Geological history playback: a timeline scrubber with play/pause, step ◀ ▶, and 0.5×/1×/2× speed. Snap-step transitions (no per-event animation in v1).
- JSON download / upload via the inspector toolbar. No browser storage — refresh wipes state.
- Toolbar toggles for **Labels**, **Overlays** and **Grid** — default to on per `spec-v1.md` §9.3.
- **Empty-state demo flow**: clicking the description textarea when empty fills it with a one-sentence example that produces a recognisable model; Interpret then runs in one click — two clicks to first model.
- **Toast error notifications**: LLM failures and invalid JSON uploads surface as auto-dismissing floating toasts (6-second timeout, manual ✕ dismiss). Drag edge-cases (dip near 90°) remain silently clamped.
- **Mobile-width fallback**: viewports narrower than 900 px render a full-screen notice ("GeoForge is desktop-only in v1…") instead of the 3D workspace.
- **Performance**: stress-tested against 10 layers, 5 faults (one of each subtype), and 2 folds. Thresholds: initial render < 2 s, drag ≥ 30 fps, overlay toggle < 200 ms. `npm run perf` runs the Playwright stress suite.

## Architecture notes

- **Single-renderer 3D.** All cards share one off-DOM `WebGLRenderer`. Each scene resizes the shared canvas, renders, then `drawImage`s into its own per-card 2D canvas. This sidesteps the browser's per-page WebGL context cap (cards × 1 context would otherwise crash) and lets card chrome (border-radius, overflow:hidden) clip cleanly. See `scene.jsx`'s `Surface` object.
- **JSON is the single source of truth.** The interpreter writes it; the inspector writes it; the renderer reads it. No second copy of state.
- **Overlay primitives are composable.** `three-helpers.jsx` exports primitives (`arc3D`, `arcWedge`, `arrow3D`, `compassRose`, `horizontalDisc`, `doubleArrow`, ...) that the per-feature builders compose. Adding a new structure type means adding one builder plus an entry in `REFERENCE_FORMATIONS`.

## Deviations from the spec

1. **Model name & token cap.** The spec asks for `claude-sonnet-4-20250514` with `max_tokens=1000` called directly via the Anthropic API. This sandbox only exposes Claude through `window.claude.complete`, which uses `claude-haiku-4-5` and a fixed 1024-token cap. The system prompt and JSON-extraction logic are otherwise identical to the spec.
2. ~~**No incremental re-parse.**~~ **CLOSED in Phase 2.** `description-diff.js` (`window.GeoDiff`) diffs descriptions at the sentence level; `onInterpret` uses `interpretMerge` + `mergeIntoModel` when unchanged sentences exist, preserving manually-edited fields on unmodified events.
3. ~~**Direct 3D manipulation (path C) is partial.**~~ **CLOSED in Phase 1.** All three editing paths (A: re-interpret, B: inspector numeric fields, C: 3D drag handles) now write to the same JSON. `src/handle-layer.jsx` adds 8 handle types: `fault-dip`, `fault-strike`, `fault-throw`, `layer-thickness-top`, `layer-thickness-bot`, `fold-limb-left`, `fold-limb-right`, `fold-hinge`. Each handle uses a projection-plane drag controller; dragged values update the model JSON live with `manually_edited: true` and `field_origin: 'stated'`. Overlay primitives are co-updated in-place during drags via `overlayUpdateMap`.
4. ~~**Listric fault dip-at-depth overlay** approximates the curved profile with a quadratic interpolation between surface and depth dips, rendered as a profile line.~~ **CLOSED in Phase 3.** Replaced with a circular-arc solver that correctly respects surface dip and dip-at-depth as tangent constraints. Two dip overlays (at surface and at detachment depth) and a vertical depth annotation are now rendered.
5. **Throw / displacement clamping.** The LLM occasionally returns metres-scale values (e.g. `throw: 30`) when our internal units are 0.3–2.0. `applyDefaults` clamps these into the model's local frame so the geometry stays viewable; the inspector still shows the value as supplied.

## File map

| File | Purpose |
|---|---|
| `index.html` | Shell, fonts, Three.js bootstrap, script load order |
| `src/app.jsx` | Root component; tab routing; toolbar; tweaks panel |
| `src/geo-data.jsx` | Lithology palette, periods, defaults, reference formation definitions |
| `src/three-helpers.jsx` | All Three.js geometry + overlay primitives |
| `src/scene.jsx` | `<GeoScene>` React wrapper + shared renderer surface |
| `src/handle-layer.jsx` | `window.GeoHandles` — 8 handle types, drag controller, overlay co-update (Phase 1) |
| `src/reference-view.jsx` | Formation reference glossary (Deliverable 2) |
| `src/workspace.jsx` | Workspace pane (Deliverable 1) + interpreter wiring |
| `src/tweaks-panel.jsx` | Tweaks UI primitives (shared component) |
| `implementation/` | Phase plans, specs, reference docs, screenshots |
| `tests/acceptance/` | Acceptance test suite (skeleton — populated in phase 0.2) |
| `tests/smoke/perf.test.js` | Playwright performance stress test (10 layers, 5 faults, 2 folds); three threshold assertions |
| `CHANGELOG.md` | Release changelog (populated in phase 0.2) |
| `STATUS.md` | Current project status (populated in phase 0.2) |

## Acceptance criteria status (per `spec-v1.md` §11)

| # | Criterion | Status |
|---|---|---|
| 1 | Plain-English → 3D model on Interpret | ✅ |
| 2 | Every measurement displays with its geometric-origin overlay | ✅ (see Formation reference for full coverage) |
| 3 | Every value indicates stated vs inferred | ✅ |
| 4 | All three editing paths write to same JSON | ✅ paths A, B and C all wired; drag handles implemented in Phase 1 |
| 5 | History playback applies events oldest → most recent | ✅ |
| 6 | JSON download / upload restores both description and 3D state | ✅ |
| 7 | Default startup shows labels + overlays on | ✅ |
