# Phase 8 Completion Document

**Phase:** 8 — Prediction, persistence, collaboration
**Completed:** 2026-05-15
**Final test result:** 14/14 acceptance tests pass (AC1–AC14)

---

## What was accomplished

All four Phase 8 acceptance criteria are satisfied.

| Criterion | Status |
|---|---|
| Page refresh restores the last session | ✅ |
| Prediction mode suggests deposits and annotates them on the model | ✅ |
| A share link reopens the model in a fresh browser session | ✅ |
| Export produces a usable PNG | ✅ |

### Sub-phase summary

| Sub-phase | Description | PR | Notes |
|---|---|---|---|
| 8.1 | Browser localStorage persistence | #28 | Auto-save on every model/description change; restore on mount |
| 8.2 | Prediction mode | #31 | PREDICTION_SYSTEM_PROMPT, predict(), purple wireframe rendering in three-helpers.jsx |
| 8.3 | Share via URL | #29 | btoa/atob URL fragment; Share button in topbar; toast confirmation; URL restore takes priority over localStorage |
| 8.4 | Export PNG | #30 | captureFrame() on stateRef.current; canvas2d.toDataURL; Export PNG button in topbar |

---

## What was overcome

### 1. app.jsx three-way merge (8.1, 8.3, 8.4)

All three sub-phases touched `src/app.jsx`. The merge order was:
- PR #28 (8.1) merged first (clean)
- PR #31 (8.2) had only run-all.js / STATUS.md conflicts — resolved cleanly by including both ac-11 and ac-12 entries
- PR #29 (8.3) had an app.jsx conflict where master had the localStorage hooks and the branch had the share hooks. The 8.3 agent had manually incorporated the PR #28 localStorage code into its branch, so the conflict was structurally clean: keep `shareToast` state + all three effects (localStorage restore, URL restore, auto-save). The URL restore effect was placed second so it overwrites localStorage restore when a share link is present (correct priority).
- PR #30 (8.4) had an app.jsx conflict in the handlers section (handleShare vs handleExport) and in the topbar-actions section (Share button vs Export PNG button). Resolved by keeping both handlers and both buttons.

### 2. AC12 test bug: addInitScript only accepts one argument

The AC12 prediction test used `context.addInitScript(fn, modelJson, predictionsJson)` with two extra arguments. Playwright's `addInitScript(script, arg?)` only accepts one serialised argument. The second argument (`predictionsJson`) was silently `undefined` in the browser, causing `predict()` to throw `TypeError: Cannot read properties of undefined (reading 'trim')` — caught silently by the try/catch, returning null from predict, so `window.__lastModel.predictions` was never set.

**Fix:** Wrapped both values in a single object: `addInitScript(({ modelJson, predictionsJson }) => {...}, { modelJson: ..., predictionsJson: ... })`.

This was a test-only bug — the prediction feature itself was correct.

### 3. AC6 selector regression from Predict button

Phase 8.2 added a `<button className="btn">Predict</button>` to the workspace left pane. The AC6 (JSON roundtrip) test used `.panel-footer button.btn:not(.primary)` to find the Reset button. With the Predict button now matching the same selector, Playwright threw a strict mode violation (2 elements matched).

**Fix:** Changed the AC6 selector to `.panel-footer button.btn:has-text("Reset")` to target the button by text.

### 4. 8.4 agent couldn't run smoke tests

The 8.4 agent reported that port 8000 was in use during its work (another agent's dev server). The `npm run smoke` tests use port 8080 (or 8000), not 8002. This did not affect the PR since the code was syntactically correct and followed established patterns. Smoke tests were confirmed passing when run from the main repo after all PRs merged.

---

## What was not detailed in the implementation plan

### localStorage + URL restore priority

The plan described 8.1 (persistence) and 8.3 (share) as independent. When merged, both add `useEffect` hooks that call `setModel` on mount. The final ordering in app.jsx is:
1. localStorage restore (runs first)
2. URL fragment restore (runs second — overwrites localStorage if a hash is present)

React 18 batches both `setModel` calls within the same synchronous mount cycle. The second call wins. This gives the correct behaviour: a shared link always overrides the saved session.

This priority was not specified in the implementation plan but is the correct UX. It is now documented as a comment in app.jsx.

### Predicted mineralisation not in mergeMode

As with confirmed mineralisation (noted in Phase 7 completion), `model.predictions[]` is not handled by `mergeIntoModel` in workspace.jsx. Predictions survive re-parse only because the merge mode preserves unrecognised top-level fields (they are not in the merge schema and therefore not overwritten). This is coincidentally correct behaviour but not intentionally designed.

### Export captures the 2D canvas, not the WebGL canvas

The export feature captures `canvas2d` (the per-scene 2D canvas in the DOM) rather than the off-DOM WebGL canvas. `canvas2d` pixels come from `drawImage` calls that copy the WebGL render each frame. This means the export captures whatever was last rendered, which is correct for the current session view. The WebGL canvas has `preserveDrawingBuffer: true` anyway, so either canvas would have worked.

### Share URL uses btoa — not URL-safe

`btoa(JSON.stringify({model, description}))` produces base64 that may contain `+`, `/`, and `=` characters. These are not URL-safe and may be mangled by some URL parsers. A production implementation should use base64url encoding (`+→-`, `/→_`, strip `=`). For this prototype this is acceptable; a future improvement could switch to `encodeURIComponent(btoa(...))` on encode and `atob(decodeURIComponent(...))` on decode.

---

## Important notes for future work

- **All 14 acceptance tests pass** (AC1–AC14). Any future changes must not regress any.
- **GeoForge now fully realises spec.md**: plain-English structural modelling, full measurement-origin annotation, predicted mineralisation, shareable models, session persistence, and PNG export.
- **Predict button class collision**: The Predict button uses `className="btn"` (no modifier). Any future test selectors for non-primary buttons in the panel-footer must use `:has-text()` rather than `:not(.primary)` to avoid matching both Predict and Reset.
- **model.predictions is not in INTERPRETER_SYSTEM_PROMPT**: Predictions are produced by a separate LLM call (PREDICTION_SYSTEM_PROMPT) and stored in `model.predictions[]`. The interpreter schema does not include predictions, so re-interpreting a description will not produce or remove predictions — they persist until Reset is clicked.
- **STATUS.md**: All Phase 8 sub-phases are marked complete (PRs #28, #31, #29, #30).
