# Phase 6 Completion Document

**Phase:** 6 — Scope expansion: intrusions and unconformities
**Completed:** 2026-05-15
**Next phase:** Phase 7 — Mineralisation and ore deposits

---

## What was accomplished

All four Phase 6 acceptance criteria are satisfied.

| Criterion | Status |
|---|---|
| Interpreter handles dykes, sills, batholiths, laccoliths, and three unconformity types | ✅ |
| Each renders with full measurement-origin overlays | ✅ |
| Reference page has cards for each new type | ✅ |
| All v1 tests (AC1–AC7) still pass; new AC8 and AC9 added and passing | ✅ |

### Sub-phase summary

| Sub-phase | Description | PR | Notes |
|---|---|---|---|
| 6.1 | Schema extension | #15 | Added `intrusions`/`unconformities` to schema, prompt, and `applyDefaults` |
| 6.2 | Intrusion renderers | #16 | dyke/sill/batholith/laccolith meshes in `buildIntrusionGeometry` |
| 6.4 | Unconformity renderers | #17 | wavy-line trace via `buildUnconformityGeometry` |
| 6.3 | Intrusion overlays | #18 | strike/dip arc, thickness double-arrow, depth dashed line, feature labels |
| 6.5 | Unconformity overlays | #19 | time-gap label, type label, angular-discordance arc |
| 6.6 | Reference view extension | #20 | 7 new reference cards (4 intrusions, 3 unconformities) |
| 6.7 | Trigger phrase tests | #21 | AC8 (intrusions) and AC9 (unconformities) acceptance tests |

---

## What was overcome

### 1. Worktree contamination: 6.4 unconformity code absorbed into PR #16 (6.2)

The 6.2 (intrusion renderers) and 6.4 (unconformity renderers) agents ran in parallel worktrees. Due to a worktree isolation edge case, the 6.2 agent's PR #16 squash-merge included the `buildUnconformityGeometry` function as well, which should have been delivered only in PR #17 (6.4). The unconformity function in PR #16 also carried two bugs (wrong wave-oscillation axis: Z instead of Y; wave width proportional to layer thickness instead of fixed block width).

Resolution: PR #17 was repurposed as a bug-fix-only PR — it applied the two wave corrections to the unconformity code already on master. The branch was rebased to contain only the fix commit, and the PR merged cleanly.

### 2. Y-coordinate system mismatch in `buildIntrusionGeometry` (PR #16)

The 6.2 agent used a bottom-anchored system (Y=0 at stack base) instead of the center-anchored system used by every other builder in `three-helpers.jsx` (Y=0 at stack midpoint; range −totalHeight/2 to +totalHeight/2). This was caught by the code reviewer before merge.

Fix: a correction commit was pushed to PR #16 before merge: `dyke → y=0`, `sill → y=0`, `batholith → y=-halfH`, `laccolith → y=halfH-(depth??halfH)`.

### 3. 6.3 agent regressed the unconformity wave fix

The 6.3 (intrusion overlays) agent's worktree was initialized from master at a point where master still had the buggy unconformity code (Z-oscillation, dynamic halfW). When the agent ran `git checkout origin/master -- src/three-helpers.jsx` to revert its own accidental changes to that function, it overwrote the 6.4 fix with the buggy version. The regression was caught by the reviewer.

Fix: a further correction commit was pushed restoring `halfW=2.1` and Y-oscillation. PR #18 was then rebased onto master to shed the stale 6.2 commits from the branch history (since they had already been squash-merged).

### 4. `arc3D` NaN when `angular_discordance = 0` (PR #19)

The 6.5 (unconformity overlays) agent passed `discordanceFromDir == discordanceToDir` to `arc3D` when the discordance angle was zero, causing a zero-vector normalize → NaN in the arc geometry and its label position.

Fix: clamped to `Math.max(1, unconformity.angular_discordance ?? 30)` before computing the direction vectors.

### 5. Stale worktree base for 6.7 (PR #21)

The 6.7 agent's worktree was snapshotted before the 6.3 and 6.5 overlay merges completed, so its `three-helpers.jsx` lacked 200+ lines of overlay code. PR #21's diff against master showed that divergence. The fix was a `git rebase --onto origin/master 165e6f2` directly in the main repo (where the branch was already checked out), dropping the stale 6.6 base commit and replanting just the 6.7 test commit on top of current master.

### 6. Session rate-limit interruption (mid-phase)

The orchestrating session hit the Claude rate limit while reviews of PR #16 and PR #17 were being dispatched. After the session reset, the orchestrator audited all open PRs, branches, and worktrees to reconstruct state, then redistributed agents to complete the interrupted reviews.

---

## What was not detailed in the implementation plan

### Inspector not extended for intrusions/unconformities

The plan specified overlays and renderers for intrusions/unconformities but did not specify whether the inspector sidebar should list these as editable features. In Phase 6, intrusions and unconformities are stored on `model.intrusions` and `model.unconformities` respectively, but the `FeatureInspector` in `workspace.jsx` only renders items from `model.layers` and `model.events`. The acceptance tests (AC8, AC9) therefore verify the new features via `window.__lastModel` rather than through inspector UI elements. This is a natural extension point for Phase 7.

### `buildUnconformityGeometry` delivered via PR #16 (unintentionally)

The parallel worktree contamination in 6.2/6.4 meant `buildUnconformityGeometry` landed in master one PR earlier than planned. No semantic harm — the function was present and (after PR #17's fix) correct. The net observable result is identical to the planned delivery order.

### 6.2 Y-coordinate reviewer found immediately — no user regression

The coordinate bug was caught by the independent review agent before PR #16 was merged. The fix was applied in-branch. No user-visible regression occurred.

---

## Important notes for Phase 7

- **Inspector sidebar gap**: `model.intrusions` and `model.unconformities` are not yet surfaced in the inspector UI. Phase 7 mineralisation will likely need its own inspector section. Consider whether to add a combined "Features" section that lists intrusions, unconformities, and mineralisation together.

- **`overlayUpdateMap` not extended for intrusions/unconformities**: The drag-handle live-update system (`overlayUpdateMap` keyed `featureId:fieldName`) has no entries for intrusion or unconformity fields. Inspector edits to these features trigger a full scene rebuild (the fallback path) rather than an in-place overlay update. This is acceptable for Phase 6 but should be addressed if Phase 7 adds many editable fields.

- **`applyVisibility` coverage**: New intrusion and unconformity overlay groups are added as children of `scene.jsx`'s `st.overlayRoot` via `overlays.add(...)` in `buildSceneContents`. The existing `applyVisibility(showOverlays, showLabels, showGrid)` in `scene.jsx` controls `st.overlayRoot.visible` globally, so new overlays are covered automatically without any `scene.jsx` change.

- **All tests pass on master**: `npm run smoke` (4 tests), `npm run acceptance` (9 tests: AC1–AC9). Phase 7 must not regress any of these.

- **Worktree timing**: In this phase, several worktrees were snapshotted before intermediate merges completed, requiring rebase-onto-master fixes. For future phases, allow each sequential merge to fully propagate before dispatching the next parallel tier.

- **`buildSceneContents` dispatch unchanged**: Intrusions and unconformities are rendered additionally (via `forEach` loops at the end of `buildSceneContents`), not via the primary event-type dispatch. The dispatch block (`fault` / `fold` / default) remains untouched. Phase 7 mineralisation should follow the same additive-render pattern.
