# Phase G Completion — Map-view Inset and Single-borehole Tool

**Phase:** G of I (v2)
**Completed:** 2026-05-19
**Commits on master:** 7754e30 (G.1), 1eefba4 (G.3 — PR #73), d68c0e2 (G.2), fe03491 (G.4), a78dbec (G.5)

---

## What was accomplished

Phase G adds two compact tools that build on Phase F's map view renderer:

1. **Map-view inset renderer (G.1 — 7754e30, PR #72)** — A 150×150 px top-down orthographic mini-map rendered in the **upper-right corner** of the 3D and Cross-section tabs via WebGL scissor+viewport on the shared Surface renderer. Suppressed in map mode (where the main view is already a map). Uses a dedicated `OrthographicCamera` (`entry.insetCamera`) stored on the Surface entry object. Frustum repositioned on model load via `SectionMath.computeModelBounds`. Guarded by `entry._w >= 200 && entry._h >= 200` to avoid tiny-canvas artefacts.

2. **Inset view-direction indicator (G.2 — d68c0e2)** — ctx2d overlay drawn on top of the inset WebGL pixels after `ctx2d.drawImage`. In **3D mode**: cyan filled circle at the inset centre plus an azimuth line showing where the main camera is looking. In **Cross-section mode**: yellow dashed A–A′ trace with end labels, oriented perpendicular to the section strike. Both branches use `ctx.scale(pxR, pxR)` for HiDPI sharpness. Data propagated to the entry via `entry.indicatorModel` / `entry.indicatorStrike` from a new `useEffect([model, selectedId])` in `GeoScene`.

3. **Borehole toggle + click handler (G.3 — 1eefba4, PR #73)** — `boreholesOn` / `borehole` state in `Workspace`. `<div className="scene-toolbar">` with a Boreholes toggle button (`.toggle.on` pattern) inside `.scene-host`, gated on model presence. `handleSceneClick` converts NDC → world-space XZ (using `SectionMath.computeModelBounds` frustum), calls `sampleLithologiesAtPoint`, and sets borehole state. Clicks in 3D mode are ignored. `window.__borehole` test hook. `e.stopPropagation()` on the toggle button prevents spurious borehole placement on toggle.

4. **`sampleLithologiesAtPoint` (G.3 — 1eefba4, PR #73)** — Pure function in `three-helpers.jsx` exposed as `window.GeoThree.sampleLithologiesAtPoint`. Builds the flat layer stack (youngest-first), then applies simplified fault vertical offsets: `fault.throw ?? fault.displacement ?? 0`, with correct sign (`-disp` for normal/listric HW, `+disp` for reverse/thrust HW, skip for strike-slip). `position_x` normalized as `(position_x ?? 0.5) * 4.2 - 2.1`. Returns layers sorted surface-downward.

5. **Borehole geometry (G.4 — fe03491)** — `buildBoreholeGeometry(borehole, viewMode)` in `three-helpers.jsx`. **3D**: coloured `CylinderGeometry` segments per layer + cyan wireframe outline cylinder. **Cross-section**: coloured `PlaneGeometry` vertical strip + cyan `Line`. **Map**: 24-point arc circle (standard well symbol). `getLithologyColor(lithology)` provides per-lithology hex colours. Wired via `useEffect([borehole, viewMode])` in `GeoScene` (`st.scene.boreholeGroup` with proper geometry disposal on change).

6. **Borehole inspector readout (G.4 — fe03491)** — `.borehole-readout` panel in the right inspector, shown when `borehole` state is non-null. Table with Depth / Lithology / Thickness columns. Depth is computed as distance from the topmost layer's `topY`. CSS classes: `.borehole-readout`, `.borehole-title`, `.borehole-table`, `.borehole-table th`, `.borehole-table td`.

7. **Acceptance + smoke tests (G.5 — a78dbec)** — 4 new v2 smoke tests: `G.inset`, `G.borehole-toggle`, `G.borehole-sample`, `G.borehole-readout-css`. v2 smoke test count: **22** (was 18 after Phase F). All 4 v1 smoke tests pass. STATUS.md updated.

---

## Sub-phase commit table

| Sub-phase | Commit / PR | Description |
|---|---|---|
| G.1 | 7754e30 (PR #72) | Map-view inset renderer |
| G.3 | 1eefba4 (PR #73) | Borehole toggle + `sampleLithologiesAtPoint` |
| G.2 | d68c0e2 (direct) | Inset view-direction indicator |
| G.4 | fe03491 (direct) | Borehole geometry + inspector readout |
| G.5 | a78dbec (direct) | Acceptance + smoke test convergence |

Execution order: G.1 + G.3 in parallel (Batch 1) → G.2 + G.4 in parallel (Batch 2) → G.5.

---

## What was overcome

### 1. Inset corner placement bug (G.1 review)

The initial G.1 implementation placed the inset in the **lower-right** corner (`y = margin`, where y=0 is bottom in WebGL). The spec requires **upper-right**. Fixed in a follow-up commit: `y = entry._h - insetH - margin`. The re-review confirmed the fix and cleared the PR.

### 2. Reverse/thrust fault sign wrong in `sampleLithologiesAtPoint` (G.3 review)

The initial G.3 implementation used `const offset = onHW ? -disp : 0` for all non-strike-slip faults. For reverse/thrust faults the HW moves **up** (`+disp`), not down. Fixed with:
```js
const isNormalFamily = subtype === 'normal' || subtype === 'listric';
const offset = onHW ? (isNormalFamily ? -disp : +disp) : 0;
```

### 3. Wrong displacement field in `sampleLithologiesAtPoint` (G.3 review)

The initial implementation read `fault.displacement_u` which does not exist in the model. The actual field used in scene rendering is `fault.throw`. Fixed to `fault.throw ?? fault.displacement ?? 0`.

### 4. Toggle button click bubbling (G.3 review)

The Boreholes toggle button is inside `.scene-host onClick={handleSceneClick}`. Clicking the button to turn boreholes ON immediately fired `handleSceneClick` at the button's pixel position, placing a spurious borehole. Fixed with `e.stopPropagation()` on the toggle button's handler.

### 5. G.2 and G.4 pushed directly to master (workflow deviation)

G.2 and G.4 agents committed and pushed directly to master instead of creating feature-branch PRs. This is a workflow deviation from the established pattern (G.1 and G.3 used PRs with review). The commits were reviewed inline from the `git show` diff and confirmed correct before G.5 proceeded. No content errors were found. **Future phases should reinforce the PR-based workflow in agent prompts.**

### 6. Rate limit mid-G.5 (completion doc only)

The rate limit reset after G.5 was fully committed and pushed. The only interrupted task was this completion document. On reconnect, master was confirmed complete and the doc was written directly.

---

## What was not in the implementation plan

### G.2 pushed directly to master

The plan described G.2 as a PR-based sub-phase. The implementation agent pushed directly to master, citing "consistent with prior pattern." This is incorrect — all prior phases used PRs for non-trivial changes. Noted for Phase H.

### `EllipseCurve` replaced with manual arc

The plan's `buildBoreholeGeometry` map-mode section used `new T.EllipseCurve(...)`. The G.4 agent substituted a manual 24-point arc loop to avoid any THREE.js version uncertainty. Functionally equivalent.

### Cross-section NDC→world is approximate

The `handleSceneClick` NDC→world conversion in G.3 uses the inset frustum half-size (`Math.max(3, Math.max(b.depth, 4.5))`) to map click coordinates, which is a reasonable approximation. In cross-section mode, the `z` coordinate is set to `b.cz - ndcY * halfView` — since the cross-section camera looks perpendicular to strike, the Y-axis of the click maps to world-Y (depth), not Z. This is noted as a known approximation; fault-side detection uses only `point.x`, so it doesn't cause incorrect lithology sampling.

---

## Architecture additions

### Changes in `src/scene.jsx`
- `Surface.tick()`: inset render block (scissor+viewport, `r.autoClear = false/true`) after main render; ctx2d view-direction indicator after `drawImage`; borehole group `useEffect([borehole, viewMode])`
- `GeoScene` init effect: creates `entry.insetCamera` (OrthographicCamera), stores `stateRef.current._surfaceEntry = entry`
- New `useEffect([viewMode])`: propagates `entry.viewMode`
- Model `useEffect` addition: repositions inset camera frustum
- New `useEffect([model, selectedId])`: propagates `entry.indicatorModel`, `entry.indicatorStrike`
- `borehole = null` prop + `useEffect([borehole, viewMode])`: builds/disposes `st.scene.boreholeGroup`

### Changes in `src/three-helpers.jsx`
- `sampleLithologiesAtPoint(model, point)` — fault-aware layer sampler, `window.GeoThree.sampleLithologiesAtPoint`
- `getLithologyColor(lithology)` — hex colour palette for borehole segments
- `buildBoreholeGeometry(borehole, viewMode)` — 3D cylinder / xsection strip / map circle, `window.GeoThree.buildBoreholeGeometry`

### Changes in `src/workspace.jsx`
- `boreholesOn`, `borehole` state
- `window.__borehole` test hook + clear-on-toggle-off effect
- `handleSceneClick` callback (NDC → world → sample → setState)
- `<div className="scene-toolbar">` with Boreholes toggle (e.stopPropagation)
- `onClick={handleSceneClick}` on `.scene-host`
- `borehole={borehole}` prop passed to `<window.GeoScene>`
- `.borehole-readout` panel in right inspector

### New CSS in `index.html`
- `.borehole-readout`, `.borehole-title`, `.borehole-table`, `.borehole-table th`, `.borehole-table td`

### New v2 smoke tests in `tests/v2/smoke.test.js`
- `G.inset`, `G.borehole-toggle`, `G.borehole-sample`, `G.borehole-readout-css`
- v2 smoke test count: **22** (was 18 after Phase F)

---

## Notes for Phase H

- **PR-based workflow must be enforced in agent prompts.** G.2 and G.4 bypassed the PR + review cycle. Add an explicit instruction: "Do NOT push to master directly — always create a feature branch and open a PR."
- **Cross-section click NDC mapping** is approximate. If Phase H or later needs borehole placement accuracy in cross-section, the conversion should account for the camera's actual viewing direction, not just the Y-click-as-depth approximation.
- **`entry.viewMode` has a one-frame lag** — `useEffect([viewMode])` that sets `entry.viewMode` fires after the React render, not synchronously. There is a single-frame window where the inset shows in map mode immediately after a tab switch. Phase H can eliminate this by setting `entry.viewMode` inside the existing `configureViewMode` call rather than in a separate effect.
- **`captureFrame` does not include the inset** — the imperative snapshot path calls a bare `Surface.renderer.render(st.scene, st.camera)` without the scissor inset pass. Screenshots will not show the inset mini-map. Intentional for now; document if it becomes surprising.
- **Open PR #40** (`fix/unconformity-mineralisation-visuals`) remains open from Phase A. The project state memory notes it must be resolved in Phase H.
- **Phase H is next and fully unblocked.**
