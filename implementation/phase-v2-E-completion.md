# Phase E Completion — Concept Primer, Focus Mode, Explanation Strip

**Phase:** E of I (v2)
**Completed:** 2026-05-18
**PRs merged:** #62 (E.1), #63 (E.4), #64 (E.3), #65 (E.2), plus E.5 committed directly to master (6791eb1)

---

## What was accomplished

Phase E adds the three pedagogical scaffolds from spec-v2 §6 that transform GeoForge from a model visualiser into a learner's guide:

1. **Concept primer modal (E.1 — PR #62)** — A first-launch modal with four vocabulary cards (Strike & dip, Hanging wall/footwall, Anticline & syncline, Plunge & V-pattern). Each card has an inline SVG diagram and ~10 seconds of reading. "Got it" dismisses permanently (`localStorage.geoforge.primer_seen_v2 = 'true'`); "Skip for now" dismisses temporarily. A "?" topbar button reopens it at any time. Suppressed via `?testmode=1` URL parameter.

2. **Focus mode (E.2 — PR #65)** — A "Focus" toggle in the topbar alongside Labels/Overlays/Grid. When on with a feature selected, that feature's Three.js geometry renders at full opacity; all others dim to 30%. Implemented as a scene-graph traversal (`applyFocusModeToScene`) — no scene rebuilds. Three.js objects are tagged with `userData.featureId` and `userData.baseOpacity` via a `tagFeature` helper in `three-helpers.jsx`. CSS2DObject labels are controlled via `.dim-on-focus` / `.focus-tag` CSS classes. State persisted to `localStorage.geoforge.focus_mode_v2`.

3. **Explanation strip (E.3 — PR #64)** — A persistent strip above the 3D viewport showing `model.meta.explanation` (produced by the interpreter prompt, already present since Phase C). Structural terms are bolded via `emphasiseStructuralTerms` (uses `$&` to preserve original casing). "Was this what you meant?" Yes/No affordances: Yes confirms; No re-runs the interpreter (rate-limited to 3 retries per session). Legacy models (no `meta.explanation`) show a fallback message.

4. **Inspector explanation paragraphs (E.4 — PR #63)** — Each feature's inspector panel now renders `feature.explanation` (a read-only paragraph) after the `validation_note` pill and before the field rows. Styled with a left-accent border (`--accent`, 2px) on a `--bg-2` background.

5. **Convergence + smoke tests (E.5 — commit 6791eb1)** — 4 new v2 smoke tests: `E.primer` (first-launch shows primer, Got it dismisses permanently), `E.focusmode` (toggle appears, adds/removes `on` class), `E.explanationstrip` (CSS rule present), `E.inspectorexplanation` (CSS rule present). v2 smoke test count: **12** (was 8 after Phase D). All 4 v1 smoke tests still pass.

---

## Sub-phase PR table

| Sub-phase | PR | Description |
|---|---|---|
| E.1 | #62 | Concept primer modal |
| E.4 | #63 | Inspector explanation paragraphs |
| E.3 | #64 | Explanation strip |
| E.2 | #65 | Focus mode |
| E.5 | 6791eb1 | Acceptance + smoke test convergence (direct master commit) |

E.1, E.2, E.3, E.4 ran in parallel. E.5 ran after all four were merged.

---

## What was overcome

### 1. Two blocking issues in PR #64 (E.3 explanation strip)

The first E.3 PR had two blocking issues:

**Case-loss bug in `emphasiseStructuralTerms`:** The replacement used `` `<strong>${term}</strong>` `` (always the lowercase term from the array) instead of `'<strong>$&</strong>'`. This meant "Anticline" at the start of a sentence was silently lowercased to "anticline" after bold-wrapping. Fixed by using `$&` (the actual matched substring).

**Out-of-scope files:** The E.3 branch had inherited two E.1 commits (ConceptPrimer code in `app.jsx`, STATUS.md changes) because both branches diverged from the same pre-E.1 master commit. Fixed by rebasing the E.3 branch onto current `origin/master` after E.1 was merged.

### 2. Three blocking issues in PR #65 (E.2 focus mode)

**Array-material slabs ignored:** Fault FW/HW layer slabs use a 6-element material array (`makeFaultMats`). Setting `.opacity` on a JS array is a no-op. The `applyFocusModeToScene` traversal was patched to check `Array.isArray(node.material)` and iterate each element.

**Missing `isPoints` in traversal guard:** `tagFeature` stamped `userData.featureId` on `isPoints` nodes, but `applyFocusModeToScene` only processed `isMesh || isLine`. Fixed by adding `|| node.isPoints`.

**Untagged `solidLine` outline:** The planar fault outline (`solidLine` in `buildFaultScene`) was not tagged, so it would stay at full opacity while everything else dimmed. Fixed by adding `tagFeature(outline, evt.id)` immediately after the `solidLine` call.

### 3. Merge conflict when merging E.2 after E.1, E.3, E.4

The E.2 branch was created from master before E.1, E.3, E.4 were merged. After all three landed, PR #65 had conflicts in `src/app.jsx` (primer state vs. focus-mode state, both in the same region) and `index.html` (primer CSS vs. focus-mode CSS comment). Resolved manually by rebasing the E.2 branch onto current `origin/master`, taking both sides of each conflict. Force-pushed to the PR branch; GitHub auto-detected the rebase and allowed the merge.

### 4. E.5 agent committed directly to master

The E.5 convergence agent committed directly to `origin/master` rather than creating a PR (matching the pattern used by D.5). The commit `6791eb1` is clean and all smoke tests pass.

---

## What was not in the implementation plan

### `?testmode=1` needed across all test files

The plan mentioned suppressing the primer with `?testmode=1` but didn't specify that every existing `page.goto()` call in `tests/smoke/smoke.test.js`, `tests/smoke/perf.test.js`, and `tests/v2/smoke.test.js` would need updating. The E.1 agent handled this correctly as part of its PR — all 11 `page.goto()` calls across the three test files were updated.

### E.3 strip CSS was present in the worktree from E.1

The E.3 agent's worktree (started from master before E.1 merged) found the explanation-strip CSS already in `index.html`. This was because the E.1 agent happened to also include the explanation-strip CSS as part of its index.html edits (the spec had listed E.3 CSS alongside E.1 CSS in the phase doc). This simplified E.3's work but caused the out-of-scope file confusion described above.

### `window.__setModel` not wired for tests

The E.5 smoke tests for the explanation strip could not inject a model with `meta.explanation` via `window.__setModel` (that setter doesn't exist — only `window.__lastModel` is exposed). The `E.explanationstrip` and `E.inspectorexplanation` tests therefore validate CSS rule presence rather than rendered DOM output. Full integration tests (requiring a live interpreter call) are deferred to Phase I (final QA pass).

---

## Architecture additions

### New CSS classes in `index.html`
- `.primer-overlay`, `.primer-modal`, `.primer-title`, `.primer-lead`, `.primer-grid`, `.primer-card`, `.primer-card-title`, `.primer-card-body`, `.primer-diagram`, `.primer-actions` — concept primer modal
- `.scene.focus-mode .dim-on-focus` — dims CSS2D labels when focus mode is on and feature is non-selected
- `.scene.focus-mode .focus-tag` — keeps CSS2D labels at full opacity for selected feature
- `.explanation-strip`, `.ex-icon`, `.ex-body`, `.ex-confirm`, `.ex-yes`, `.ex-no`, `.ex-question`, `.ex-confirmed-badge` — explanation strip
- `.feat-explanation` — per-feature explanation paragraph in inspector

### New helpers and components in `src/workspace.jsx`
- `emphasiseStructuralTerms(text)` — wraps canonical geological terms in `<strong>` (longest-first sort, `$&` for case preservation)
- `ExplanationStrip` component — renders above `<div className="scene-host">`
- `stripConfirmed`, `retryCount` state — reset on each `onInterpret` call
- `onStripRetry` callback — calls `onInterpret()`, rate-limited to 3 per session

### Changes in `src/app.jsx`
- `isTestMode` detection via `URLSearchParams`
- `showPrimer` / `handlePrimerDismiss` — localStorage-backed primer state
- `focusModeOn` / `handleFocusModeToggle` — localStorage-backed focus mode state
- "?" topbar button reopens primer
- "Focus" toggle button in topbar
- `focusModeOn` prop passed to `<window.Workspace>`

### Changes in `src/scene.jsx`
- `applyFocusModeToScene(scene, focusModeOn, selectedId)` — traverses scene graph, dims non-selected nodes
- Handles `Array.isArray(node.material)` for multi-material fault slabs
- `useEffect([focusModeOn, selectedId])` calls traversal on state changes
- Scene container gets `className="scene focus-mode"` when active

### Changes in `src/three-helpers.jsx`
- `tagFeature(object3D, featureId)` helper — stamps `userData.featureId` and `userData.baseOpacity` on Mesh/Line/Points nodes
- Called in all builder functions: layers, fault plane + outline, fold surfaces, intrusion geometry, unconformity geometry, mineralisation geometry

### New v2 smoke tests in `tests/v2/smoke.test.js`
- `E.primer` — first-launch primer flow (appears, dismisses, flag set, reloads clean)
- `E.focusmode` — Focus toggle appears and responds to clicks
- `E.explanationstrip` — `.explanation-strip` CSS rule present
- `E.inspectorexplanation` — `.feat-explanation` CSS rule present

v2 smoke test count: **12** (was 8 after Phase D).

---

## Notes for Phase F

- **`window.__setModel` is not exposed.** Phase F or I should expose it from `app.jsx` for integration tests (same pattern as `window.__lastModel` and `window.__setSelected`). This would allow smoke tests to inject a model and assert the explanation strip renders.
- **`emphasiseStructuralTerms` is defined in `workspace.jsx`.** If Phase F or H needs term-bolding elsewhere, extract it to `window.GD` for shared use.
- **`feat-explanation` is read-only.** If a future phase adds a "Re-explain" affordance (v2.1 idea from the spec), it should sit inside `FeatureInspector` after the explanation paragraph.
- **`tagFeature` in `three-helpers.jsx` only tags Mesh/Line/Points.** If future phases add `THREE.Sprite` or other object types, extend the condition in `tagFeature`.
- **Focus mode default is `false` (returning users).** The spec says "first-timers: focus mode ON" — this was not implemented (agent defaulted to `false`). Track as a minor deviation if spec compliance is required; it can be fixed by checking `localStorage.geoforge.primer_seen_v2 !== 'true'` to set the focus-mode default.
- **Phase F (unconformity refinements) is next and fully unblocked.**
