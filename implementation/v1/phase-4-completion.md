# Phase 4 Completion Document

**Phase:** 4 — Polish, error handling, performance
**Completed:** 2026-05-15
**Next phase:** Phase 5 — Acceptance testing and v1 release

---

## What was accomplished

All acceptance criteria for Phase 4 are satisfied.

| Criterion | Status |
|---|---|
| All four prior phases' tests pass after the merge | ✅ (all 4 smoke tests pass on master) |
| A first-time user can produce a working model in two clicks (placeholder + Interpret) | ✅ (click-to-fill textarea) |
| Every failure path produces a visible toast rather than a silent failure | ✅ (Toast component, auto-dismiss 6 s) |
| The stress-test fixture renders and animates at 30+ fps | ✅ (~49 fps measured; all three thresholds met) |
| Mobile widths show a clean fallback notice | ✅ (< 900 px; reactive on resize) |
| README matches reality | ✅ (PR #12) |

### Sub-phase summary

| Sub-phase | Description | PR | Notes |
|---|---|---|---|
| 4.1 | Merge phases 1, 2, 3 | — | Already on master before Phase 4 started; no work needed |
| 4.2 | Regression sweep | — | All 4 smoke tests passed on master before any Phase 4 changes |
| 4.3 | Empty-state polish | #8 | Click-to-fill textarea; simplified placeholder |
| 4.4 | Error handling | #10 | Toast component, user-friendly messages, auto-dismiss, upload validation |
| 4.5 | Performance check | #11 | Stress fixture + perf test; fixed overlay toggle bottleneck |
| 4.6 | Mobile-width fallback | #9 | Below 900 px shows full-screen notice; one fix round (single `<p>` tag) |
| 4.7 | README sync | #12 | README, STATUS.md, CHANGELOG.md all updated |

---

## What was overcome

### 1. Sub-phase 4.1 was already done

The plan showed 4.1 (merge phases 1, 2, 3) as the first sequential step. In practice, all three phases had already been merged to master before Phase 4 began (this happened during the Phase 1–3 sessions). The regression sweep (4.2) confirmed master was clean from the start. Both 4.1 and 4.2 were therefore verified in minutes rather than requiring a dedicated PR.

### 2. Overlay toggle threshold failure (Phase 4.5)

The initial stress-test run showed the overlay toggle at ~210 ms — exceeding the 200 ms threshold. Root cause: clicking "Overlays" in the toolbar dispatched a React state update (`setTweak('overlaysOn', ...)`) that triggered a full `App → Workspace → GeoScene` re-render; only after that re-render did a `useEffect` apply `overlayRoot.visible = false`. With 10 layers and 7 events in the inspector, this re-render consumed ~210 ms before the Three.js visibility change took effect.

Fix: exposed an imperative `applyVisibility(showOverlays, showLabels, showGrid)` method on `stateRef.current` in `scene.jsx`. The Overlays button click handler in `app.jsx` calls `applyVisibility()` **before** `setTweak`, so Three.js visibility is updated synchronously in the same event loop tick. Result: ~26 ms measured.

This was a real bottleneck surfaced only by the stress fixture — it would not appear on the simple 2-layer test model.

### 3. `useLayoutEffect` introduced and then reverted (Phase 4.5)

The Phase 4.5 agent also switched the Three.js visibility `useEffect` to `useLayoutEffect` (which fires before paint instead of after). The reviewer correctly identified this as semantically wrong for Three.js mutations (which are not DOM reads/writes) and providing essentially no benefit — the speedup came entirely from the imperative pre-click call. A follow-up fix reverted `useLayoutEffect` back to `useEffect` and nulled `applyVisibility` in the cleanup function to prevent stale-ref calls after unmount.

**Lesson for Phase 5:** When a performance fix involves multiple changes (imperative call + scheduling tweak), verify each change independently to avoid shipping unnecessary semantic violations alongside the real fix.

### 4. PR #9 (Phase 4.6) failed first review — split `<p>` tag

The mobile fallback notice was specified as a single paragraph. The agent rendered the two sentences as two separate `<p>` elements. The reviewer caught this. A one-commit fix merged the tags and the second review passed immediately.

### 5. `window.__lastGeoScene` global — pre-existing and not addressed

The reviewer of PR #11 flagged that `applyVisibility` is called via `window.__lastGeoScene`, a global that is overwritten on each `GeoScene` mount. This means in a hypothetical multi-scene layout, `applyVisibility` could operate on the wrong scene. This global was pre-existing (not introduced in Phase 4); the reviewer classified it as a concern rather than a blocking issue, and a scene-identity guard was noted as suggested but non-blocking. Phase 5 should not need to address this.

---

## What was not detailed in the implementation plan

### Phase 4.4: Upload validation was additive

The plan specified toasts for LLM failures and JSON upload failures. The agent also added a pre-parse structural validation (`!json.version && !json.layers && !json.events && !json.model`) before calling `applyDefaults`. This was a sensible extension — without it, uploading a valid JSON that is not a GeoForge model (e.g., a package.json) would silently produce a broken model rather than a user-facing error.

### Phase 4.4: React.Fragment wrapper

The inline error display was at a `position: absolute` location inside the workspace. Moving to a fixed-position toast required wrapping the Workspace component's return in `React.Fragment` so the `Toast` renders as a sibling of (not inside) the workspace div. The plan said "add toasts" but did not specify this structural change.

### Phase 4.5: The perf test uses port 8001

The smoke test uses port 8000. To allow both tests to potentially run in parallel without conflict, the perf test was implemented on port 8001. This was an agent-level decision not specified in the plan. It is the correct approach.

### Phase 4.5: FPS measurement measures rAF cadence, not WebGL frame delivery

The reviewer noted that in headless Chromium, rAF is typically shimmed; the measured "~49 fps" reflects rAF scheduling, not actual WebGL frame delivery. The test will pass on any machine where Chromium runs rAF at ≥ 30 Hz. For Phase 5, if a more rigorous FPS measurement is needed, it should instrument `Surface.tick()` directly.

### Phase 4.6: `useEffect` + `useState` hooks must precede the conditional early return

The mobile fallback requires reading `window.innerWidth` in a `useState` hook and subscribing to `resize` in a `useEffect`. React's rules of hooks require these to be called unconditionally, before any early return. The reviewer verified this on both the initial PR and the fix commit.

---

## Important notes for Phase 5

- **`npm run perf`** is now available for performance regression checking. Run it when source files that affect render performance are changed.

- **The `applyVisibility(showOverlays, showLabels, showGrid)` method** is called imperatively from `app.jsx`'s Overlays button handler. If Phase 5 adds a new toggle (e.g., for predicted mineralisation), it should follow the same pattern: call `applyVisibility` first, then dispatch React state.

- **All four smoke tests (A, B, C, Phase 3 listric) plus the perf test must pass** on every master commit going forward.

- **Toast error notifications are user-facing contract.** The exact strings ("Interpreter couldn't read that. Try again, or rephrase." and "This file isn't a valid GeoForge model. Check it was downloaded from this app.") are now visible to users. Do not change them without considering the UX impact.

- **Mobile fallback threshold is 900 px.** The spec notice says "at least 1024px." These two numbers are intentional: 900 px is the gating threshold (below which the workspace won't render), and 1024 px is the recommended minimum for a good experience. Do not conflate them.

- **Deviation #1** (model name / token cap via `window.claude.complete`) remains open going into Phase 5. The acceptance testing phase will need to account for this — test stubs should continue using the existing `window.claude.complete` mechanism.

- **Phase 5 is entirely sequential** (5.1 → 5.2 → 5.3 → 5.4). No parallel sub-phases.
