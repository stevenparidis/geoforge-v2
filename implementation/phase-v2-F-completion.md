# Phase F Completion — Cross-section and Map View Tabs

**Phase:** F of I (v2)
**Completed:** 2026-05-19
**PRs merged:** #66 (F.1), #67 (F.2+F.6), #68 (F.5), #69 (F.3), #70 (F.4+F.7 cleanup), #71 (F.8)

---

## What was accomplished

Phase F adds two new viewport tabs alongside the existing 3D viewport, plus the mathematical and rendering infrastructure to support them:

1. **Viewport tab strip (F.1 — PR #66)** — Three-tab strip above the scene area: "3D view" / "Cross-section" / "Map view" with keyboard shortcuts `1`/`2`/`3`. Reset camera (emits `geoforge:resetcamera` event) and Snapshot (downloads `geoforge-${viewMode}.png`) action buttons. `viewMode` state persisted to `localStorage.geoforge.view_mode_v2`. Default is `'3d'`.

2. **Section math utilities (F.6 — PR #67)** — New `src/section-math.js` exposing `window.SectionMath` with `computeSectionStrike(model, selectedId)`, `averageBearing(bearings)`, and `computeModelBounds(model)`. Loaded as a script tag before `scene.jsx`.

3. **GeoScene viewMode prop (F.2 — PR #67)** — `GeoScene` accepts `viewMode` prop. `configureViewMode()` repositions camera for each mode:
   - `'3d'`: oblique orbit, `enableRotate=true`, `maxPolarAngle = Math.PI - 0.2`
   - `'xsection'`: perpendicular-to-strike, `enableRotate=false`, gridHelper hidden
   - `'map'`: top-down, `camera.up=(0,0,-1)`, `enableRotate=false`
   Listens for `geoforge:resetcamera` CustomEvent. `useEffect([viewMode, model, selectedId])` triggers on change.

4. **Linked selection across tabs (F.5 — PR #68)** — `selectedId` lives at workspace level and is independent of `viewMode`. New `useEffect([selectedId, viewMode])` in `GeoScene` adds semi-transparent wireframe outlines for selected features in xsection/map modes (3D mode uses existing Phase E focus-mode behaviour). `window.__setSelected` confirmed accessible for tests.

5. **Cross-section renderer (F.3 — PR #69)** — `buildCrossSectionAnnotations(model, sectionStrike)` in `three-helpers.jsx` builds: A–A′ section line (dashed, `LineDashedMaterial`), surface line (dashed green), depth scale on left edge (ticks every 1 unit), orientation badge (top-right corner). Wired via `useEffect([viewMode, model])` in `scene.jsx`. CSS classes: `.xsection-label`, `.xsection-title`, `.depth-tick`, `.section-badge`.

6. **Map view renderer (F.4 — PR #69, scope-crept from F.3 agent)** — `buildMapViewAnnotations(model)` builds: north arrow (top-right CSS2DObject), scale bar (bottom-left line + label), fault traces coloured by subtype (normal=red, reverse/thrust=blue, strike-slip=cyan), bedding dip tick marks. Wired via `useEffect([viewMode, model])`.

7. **V-pattern computation (F.7 — PR #69, scope-crept from F.3 agent)** — `buildFoldVPattern(foldEvent, model)` builds V-shaped outcrop pattern for plunging folds: anticline (orange), syncline (blue). Called from `buildMapViewAnnotations` for each plunging fold in the model. No geometry if `plunge ≤ 0`. CSS: `.map-north-arrow`, `.map-scale-lbl`, `.map-fault-lbl`, `.map-dip-lbl`, `.map-vpatt-lbl`.

8. **Acceptance + smoke tests (F.8 — PR #71)** — 6 new v2 smoke tests: `F.viewtabs`, `F.tabswitch`, `F.tabswitch3`, `F.viewmode-persist`, `F.sectionmath`, `F.css`. v2 smoke test count: **18** (was 12 after Phase E). `STATUS.md` updated with Phase F checklist.

---

## Sub-phase PR table

| Sub-phase | PR | Description |
|---|---|---|
| F.1 | #66 | Viewport tab strip UI |
| F.2 + F.6 | #67 | GeoScene viewMode prop + section math utilities |
| F.5 | #68 | Linked selection across tabs |
| F.3 | #69 | Cross-section renderer (+ F.4+F.7 scope creep) |
| F.4+F.7 | #70 | Cleanup only (content pre-landed in #69) |
| F.8 | #71 | Acceptance + smoke test convergence |

Execution order: F.1 + F.2+F.6 in parallel (Batch 1) → F.3 + F.4+F.7 + F.5 in parallel (Batch 2) → F.8.

---

## What was overcome

### 1. Rate-limit interruption mid-Batch 1

Both the F.2+F.6 implementation agent and the F.1 review agent were cut off mid-run by a rate limit reset. On reconnect, both PRs (#66 and #67) were found to be fully pushed with clean single commits. Fresh review agents were spawned. PR #67 (F.2) had one blocking regression: `controls.maxPolarAngle = Math.PI` instead of `Math.PI - 0.2`. Fixed directly in the worktree before merging.

### 2. F.5 agent scope-crept F.3 and F.4 scene.jsx hooks

The F.5 (linked selection) agent read from a worktree state that already contained F.3 and F.4 scene.jsx modifications (from parallel agents working in the main working tree), and committed all three blocks — F.3 xsection useEffect, F.4 map useEffect, and F.5 selection useEffect — in a single commit on the F.5 branch. This meant the scene.jsx wiring for F.3 and F.4 was already in master before their own PRs could add it.

**Impact:** F.3's PR (#69) and F.4+F.7's PR (#70) both had `scene.jsx` conflicts on rebase. Resolved by taking HEAD (master) in both cases — the correct wiring was already there.

### 3. F.3 agent scope-crept F.4+F.7 three-helpers.jsx functions

The F.3 (cross-section) agent read from a worktree that contained F.4+F.7's `buildMapViewAnnotations`, `buildFoldVPattern`, and map CSS (from the F.4+F.7 agent having written to the main working tree). The F.3 agent committed all of these into its own PR.

**Impact:** PR #69 contains all seven F-phase three-helpers.jsx functions (F.3, F.4, F.7) and CSS. When F.4+F.7's branch (#70) was rebased after F.3 merged, its three-helpers.jsx additions were all duplicates. Rebase resolved by taking HEAD everywhere. The final rebased F.4+F.7 commit was cosmetic only (3 blank-line deletions).

**Root cause of both scope-creep incidents:** Parallel worktree agents in this project use isolated worktrees, but the main working tree (`c:/Geoforge_v2`) was left with unstaged edits from one agent's work. When a second agent (or the orchestrator) ran `git checkout <branch>` in the main worktree, those unstaged changes carried over and were later committed.

**Fix for future phases:** After spawning parallel worktree agents, avoid running `git checkout` in the main worktree until all agents complete and PRs are merged. Keep the main worktree pinned to master and do all rebase/review work in dedicated worktrees or via `git switch --detach`.

### 4. Leaked unstaged changes causing rebase confusion

When the orchestrator ran `git checkout feat/phase-f3-xsection-renderer` in the main worktree, the F.4 scene.jsx changes (from the leaked unstaged diff) carried along. A stash was needed before rebase, and that stash had to be dropped (not re-applied) to avoid re-injecting the leaked content.

---

## What was not in the implementation plan

### F.3 PR pre-landing F.4+F.7 content

The plan described F.3 and F.4+F.7 as separate parallel agents adding to `three-helpers.jsx` in separate blocks. In practice, the F.3 agent included all F.4+F.7 content due to scope creep (see above). PR #70 therefore became a cosmetic cleanup PR (3 blank-line deletions). The actual F.4+F.7 implementation is correct and fully functional — it just arrived via PR #69.

### scene.jsx wiring landed via F.5

The plan described F.3 adding its scene.jsx useEffect and F.4+F.7 adding its useEffect. In practice, both arrived via F.5's commit. This is architecturally sound — the wiring was correct and tested — but the PR attribution is different from the plan.

### `?testmode=1` already in all page.goto calls

The F.8 agent confirmed all existing test `page.goto()` calls already include `?testmode=1` (added in Phase E). No updates needed.

---

## Architecture additions

### New file: `src/section-math.js`
- `window.SectionMath.computeSectionStrike(model, selectedId)` — perpendicular strike for cross-section orientation
- `window.SectionMath.averageBearing(bearings)` — circular-safe bearing average
- `window.SectionMath.computeModelBounds(model)` — `{cx, cy, cz, depth, totalHeight}` for camera positioning

### New CSS classes in `index.html`
- **Tab strip**: `.viewtabs`, `.viewtab`, `.viewtab.active`, `.vt-key`, `.vt-action`, `.vt-action:hover`, `.viewtabs .vt-spacer`
- **Cross-section**: `.xsection-label`, `.xsection-title`, `.depth-tick`, `.section-badge`
- **Map view**: `.map-north-arrow`, `.map-scale-lbl`, `.map-fault-lbl`, `.map-dip-lbl`, `.map-vpatt-lbl`

### Changes in `src/workspace.jsx`
- `ViewportTabs` component with 3 tabs, Reset camera, Snapshot
- `viewMode` state (localStorage-backed, default `'3d'`)
- `handleKeyDown` useEffect: keys `1`/`2`/`3` suppressed in `TEXTAREA` and `INPUT`
- `handleResetCamera`: emits `geoforge:resetcamera` CustomEvent
- `handleSnapshot`: calls `captureFrame()`, downloads as `geoforge-${viewMode}.png`
- `viewMode` passed to `<window.GeoScene>`

### Changes in `src/scene.jsx`
- `configureViewMode(ss, mode, model, selectedId)` — camera/controls setup per mode
- `GeoScene` props: `viewMode = '3d'`
- `useEffect([viewMode, model, selectedId])` calls `configureViewMode`
- `useEffect([viewMode, model])` for xsection annotation group management (`st.scene.xsectionGroup`)
- `useEffect([viewMode, model])` for map annotation group management (`st.scene.mapGroup`)
- `useEffect([selectedId, viewMode])` for wireframe selection outline (`st.scene.selectionGroup`)
- `useEffect([])` for `geoforge:resetcamera` event listener

### Changes in `src/three-helpers.jsx`
- `buildCrossSectionAnnotations(model, sectionStrike)` — returns GROUP with A–A' section line, surface line, depth scale, orientation badge
- `bearingToCardinal(deg)` helper
- `buildFoldVPattern(foldEvent, model)` — V-shaped plunging fold outcrop in map view
- `buildMapViewAnnotations(model)` — north arrow, scale bar, fault traces, bedding dip ticks, plunging fold V-patterns
- Global exposures: `window.buildCrossSectionAnnotations`, `window.buildFoldVPattern`, `window.buildMapViewAnnotations`

### New v2 smoke tests in `tests/v2/smoke.test.js`
- `F.viewtabs`, `F.tabswitch`, `F.tabswitch3`, `F.viewmode-persist`, `F.sectionmath`, `F.css`
- v2 smoke test count: **18** (was 12 after Phase E)

---

## Notes for Phase G

- **`configureViewMode` is called on every `[viewMode, model, selectedId]` change** — including model re-parses. This resets the camera position on each interpret, which may surprise users. Phase G should consider only calling it when `viewMode` actually changes, not when model/selectedId change.
- **`controls.maxPolarAngle = Math.PI - 0.2` is now explicit** in `configureViewMode`. If a future phase changes the initial camera setup at scene creation time, verify this constraint is still applied.
- **Clipping planes are always reset to `[]`** — the implementation doc for F.3 mentioned adding clipping planes for a true perpendicular slice. This was not implemented; the cross-section is achieved purely through camera positioning (looking perpendicular to strike), not through WebGL clipping. A future phase or v2.1 could add actual clipping planes for a cleaner section cut.
- **`buildCrossSectionAnnotations` uses `halfW = 2.1` hardcoded** — if the model block width ever changes, this will need updating. The same applies to other functions that hardcode 2.1.
- **Scope-creep worktree isolation** — see the "What was overcome" section for the root cause and recommended fix. Add a note to the orchestration pattern memory.
- **Phase G is next and fully unblocked.**
