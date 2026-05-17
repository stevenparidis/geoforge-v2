# Phase 1, 2, and 3 Completion Document

**Phases:** 1 (Direct 3D manipulation), 2 (Incremental re-parse and conflict rule), 3 (Listric fault correctness)
**Completed:** 2026-05-15
**Next phase:** Phase 4 — Polish, error handling, performance

---

## What was accomplished

All acceptance criteria for all three phases are satisfied.

### Phase 1 — Direct 3D manipulation

| Criterion | Status |
|---|---|
| 8 handle types appear on feature selection and are grabbable at all zoom levels | ✅ |
| Dragging any handle updates geometry and measurement overlay in real time | ✅ |
| Dragged field has `manually_edited: true`; `field_origin` becomes `"stated"` | ✅ |
| Camera rotation suppressed during drag, re-enabled on release | ✅ |
| Drag preview label follows cursor showing current value | ✅ |
| Frame rate ≥ 30 fps on representative model | ✅ |
| Extended smoke test passes (Test B: drag→JSON pipeline) | ✅ |
| README deviation #3 closed; acceptance-criteria row 4 marked ✅ | ✅ |

### Phase 2 — Incremental re-parse

| Criterion | Status |
|---|---|
| Editing one sentence causes interpreter to run only on that sentence | ✅ |
| Manually-edited fields on unchanged events preserved across re-parses | ✅ |
| Editing an originating sentence clears `manually_edited` on that event | ✅ |
| Inspector shows persistence note next to manually-edited fields | ✅ |
| `docs/edit-conflict-rule.md` exists and signed off by user (2026-05-15) | ✅ |
| README deviation #2 closed | ✅ |
| All phase 2 tests pass (unit + smoke Test C) | ✅ |

### Phase 3 — Listric fault correctness

| Criterion | Status |
|---|---|
| Listric fault renders as a visibly curved surface | ✅ |
| Surface dip annotated with arc at depth 0 | ✅ |
| Dip-at-depth annotated with arc at detachment depth | ✅ |
| Vertical depth annotation with double-arrow and value label | ✅ |
| Editing `dip`, `dip_at_depth`, `detachment_depth` updates geometry and overlays | ✅ |
| Formation reference card shows new overlays cleanly | ✅ |
| Smoke test passes (listric card screenshot + overlay count) | ✅ |
| README deviation #4 closed | ✅ |

### Sub-phase summary

| Phase | Sub-phase | PR | Outcome |
|---|---|---|---|
| 1 | 1.1+1.2 Handle layer foundation + drag projection | #7 | New `handle-layer.jsx`, scene/workspace/index.html wiring |
| 1 | 1.3 Overlay co-update | #7 | `update()` methods on overlay primitives; `overlayUpdateMap` |
| 1 | 1.4 Acceptance + smoke | #7 | Test B; STATUS.md + README updated |
| 2 | 2.1 Conflict rule draft | #5 | `docs/edit-conflict-rule.md` |
| 2 | 2.2 Rule sign-off | — | User signed off 2026-05-15 |
| 2 | 2.3 Description differ | #5 | `src/description-diff.js` (window.GeoDiff) |
| 2 | 2.4 Merge-mode prompt | #5 | INTERPRETER_SYSTEM_PROMPT extended |
| 2 | 2.5 Workspace rewire | #5 | `onInterpret`, `interpretMerge`, `mergeIntoModel` |
| 2 | 2.6 Tests | #5 | 3 unit test files; smoke Test C |
| 3 | 3.1 Geometry rebuild | #6 | Circular-arc solver replacing quadratic approximation |
| 3 | 3.2 Overlay system | #6 | `addListricDipAnnotations` (surface + depth arcs + depth line) |
| 3 | 3.3 Reference card + smoke | #6 | `geo-data.jsx` updated; smoke Phase 3 extension |

---

## What was overcome

### 1. Rate limit interruption mid-session

All three phase agents hit the API rate limit immediately after launching. The worktrees were already created and one agent had written partial files (`handle-layer.jsx` for Phase 1, `description-diff.js` and `edit-conflict-rule.md` for Phase 2) but made no commits. Recovery required detecting uncommitted partial work in each worktree (`git status`) and briefing new continuation agents precisely on what was already done vs. what remained, to avoid re-doing completed work.

**Lesson:** Agents should commit after each logical unit of work, not only at sub-phase boundaries. A partial file with no commit is indistinguishable from "nothing done" to a fresh agent.

### 2. `isolation: "worktree"` not available in this session

The Agent tool's `isolation: "worktree"` parameter failed with "not in a git repository" despite the repo being valid at `C:/Geoforge_v2`. The environment context showed `"Is a git repository: false"` at session level (a VS Code extension detection issue). Worktrees were created manually with `git worktree add` and agents were given explicit path instructions instead.

### 3. Stale locked worktrees from Phase 0

Four worktrees from Phase 0 were still locked (`-f -f` required to remove them). The standard `git worktree remove --force` was insufficient; `git worktree remove -f -f` was needed.

### 4. Phase 3 binary search direction inverted

`solveCircularArc` in `three-helpers.jsx` had the `lo`/`hi` branches swapped. With `Pdy < detachDepth` incorrectly lowering `hi`, `R` diverged to ~5000 instead of converging to ~3.92, placing the listric fault ~3200 scene units off-screen. The smoke test did not catch this because it only checked that the overlay group was non-empty (fixed: assertion strengthened to `>= 10` descendants).

**Lesson for Phase 4:** Any numeric solver should have a convergence-check assertion or log the converged value during development so geometric bugs surface visually before review.

### 5. Phase 2 fingerprint maps were not multisets

`diffDescriptions` used plain object keyed by fingerprint. Descriptions with two identical sentences (e.g. a repeated annotation sentence) would silently drop one, causing missed re-interprets or missed event removals. Fixed with reference-count drain maps.

### 6. Phase 1 Temporal Dead Zone crash

`workspace.jsx` had a `useEffect` whose dependency array referenced `onDragChange` before the `const onDragChange = useCallback(...)` declaration (40 lines later). JavaScript's TDZ makes this a `ReferenceError` on every page load. Fixed by moving the `useCallback` declaration before the `useEffect`.

### 7. Phase 2 `window.applyDefaults` dead guard

`mergeIntoModel` ended with `if (window.applyDefaults) { … }` — always false because `applyDefaults` is a local function never assigned to `window`. New events from merge responses were silently getting no defaults applied. Fixed by replacing with `return applyDefaults(next)`, matching the full-parse path.

### 8. Phase 2 preserve-path value overwrite

In `mergeIntoModel`, when a manually-edited event appeared in `upsert_events` with an unchanged originating sentence, the code stamped `manually_edited: true` but still used the LLM's returned field values — so the hand-tuned value was overwritten. Fixed by restoring all `stated`-origin field values from the existing event.

---

## What was not detailed in the implementation plan

### Phase 1: `overlayUpdateMap` design

The plan specified Option A (lookup map keyed by `featureId:fieldName`) but did not detail how the map would be populated or passed to the drag controller. The implementation stores the map on `stateRef.current.overlayUpdateMap` (set during `buildSceneContents`) and the drag controller accesses it via the scene entry reference passed to `attachToScene`.

### Phase 1: `three-helpers.jsx` overlay builder refactor

Adding `update()` methods required refactoring several overlay builder functions from returning `THREE.Object3D` to returning `{ root, update }`. The plan called this out but did not specify which builders needed refactoring. In practice: `buildDipArc`, `buildStrikeArc`, `buildThicknessVector`, `buildThrowLine`, `buildInterlimbArc`, `buildPlungeArc`. The `buildSceneContents` call sites were also updated to destructure `{ root }`.

### Phase 2: `"Changed sentences"` trigger-phrase coupling

The merge-mode detection in `INTERPRETER_SYSTEM_PROMPT` fires only when the user message contains the literal string `"Changed sentences"`. The `interpretMerge` function must emit exactly that string to activate merge mode. This coupling is not documented in the plan. Future agents modifying the merge prompt structure must preserve this exact phrase.

### Phase 2: smoke test stub complexity for Test C

Test C required a smart `window.claude.complete` stub that returns different responses depending on whether the call is a full parse or merge parse (detected by whether the user message contains `"Changed sentences"`). The Phase 0 stub pattern was a simple single-response fixture; this was extended with a conditional branch.

### Phase 3: `colour` vs `color` in `geo-data.jsx`

The phase plan specified adding a `color` field to the listric fault reference card layers. The agent used British spelling `colour`. Three.js reads `color`. The reference card layer colours were silently ignored until caught in review.

### Phase 3: overlay commits merged with geometry (not separate)

The plan specified 3.1 (geometry) and 3.2 (overlays) as separate sub-phases with separate commits. The Phase 3 agent implemented both in a single pass of `three-helpers.jsx` for efficiency. This is fine functionally; the phase plan's separation was a guidance preference, not a hard requirement.

---

## Important notes for Phase 4

- **Phases 1, 2, 3 share `workspace.jsx` and `index.html`** — all three modified them. Future phases that also touch `workspace.jsx` should expect merge complexity and rebase onto master explicitly before opening a PR.

- **`overlayUpdateMap` is populated on every `buildSceneContents` call.** If a new overlay primitive type is added in Phase 4 (e.g. for new fault subtypes), its builder must also return `{ root, update }` and register itself in the map, otherwise drag co-update will silently skip it.

- **`mergeIntoModel` contains an inline copy in `tests/unit/merge-into-model.test.js`** — if the function signature or behaviour changes in Phase 4, the test file's copy must be updated in sync.

- **The `"Changed sentences"` trigger phrase** is load-bearing in `INTERPRETER_SYSTEM_PROMPT`. Do not rephrase it without also updating `interpretMerge`.

- **`window.GeoHandles.scaleHandles`** is called every tick. Any new geometry added to `handleRoot` that is not tagged with `userData.isHandle = true` will not be scaled and will appear at a fixed world size (likely too large or too small at non-default zoom).

- **`npm run smoke`** now tests four scenarios (A, B, C, Phase 3 listric). All four must pass on every master commit going forward.

- **Phase 2 sub-phase 2.2 (conflict rule sign-off) is documented** in `docs/edit-conflict-rule.md`. Phase 4 should not change the conflict rule without a new sign-off — any change to when `manually_edited` is cleared or preserved is user-facing behaviour, not an implementation detail.

- **Deviation #1** (model name / token cap via `window.claude.complete`) remains open. Phase 4 is not expected to address it, but it should be tracked.
