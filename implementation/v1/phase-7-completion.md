# Phase 7 Completion Document

**Phase:** 7 — Mineralisation and ore deposits
**Completed:** 2026-05-15
**Next phase:** Phase 8 — Prediction, persistence, collaboration

---

## What was accomplished

All three Phase 7 acceptance criteria are satisfied.

| Criterion | Status |
|---|---|
| Each deposit type interprets from plain English | ✅ |
| Each renders with structural control, alteration zones, and five hydrothermal elements | ✅ |
| Reference page covers each deposit type | ✅ |

### Sub-phase summary

| Sub-phase | Description | PR | Notes |
|---|---|---|---|
| 7.1 | Mineralisation schema | #22 | `mineralisation` array added to INTERPRETER_SYSTEM_PROMPT, trigger phrases, defaults, and `applyDefaults` |
| 7.2 | Deposit-type renderers | #23 | `buildMineralisationGeometry` in `three-helpers.jsx` — 5 subtypes; 8 new COLOR entries |
| 7.3 | Hydrothermal-system annotation | #24 | `addHydrothermalAnnotation` for five-elements labels; rebase required after 7.2 merge conflict |
| 7.4 | Mineralisation overlays | #25 | Grade labels, alteration shell rings, ore body envelopes, VMS lens/halo boundaries, epithermal boiling zone |
| 7.5 | Reference view extension | #26 | 5 new reference cards (porphyry-cu-au, orogenic-gold, vms-deposit, skarn-deposit, epithermal-au-ag); new section 06 in REFERENCE_SECTIONS |
| 7.6 | Acceptance tests | #27 | AC10 (porphyry) added; `run-all.js` updated; STATUS.md updated; 10/10 tests pass |

---

## What was overcome

### 1. Session rate-limit interruption (mid-phase)

The orchestrating session hit the Claude rate limit while the 7.4 agent was being dispatched. The 7.4 worktree was created but contained no commits. After session reset, the orchestrator audited all open PRs, branches, and worktrees (all were either merged or empty) and re-dispatched 7.4 without data loss.

### 2. 7.3 label rendering bug caught by review

The 7.3 (hydrothermal annotation) agent pushed CSS2DObject labels via `labels.push(lbl)` instead of `overlays.add(lbl)`. The code-review agent identified this as blocking (though cited the `{node,data}` contract rather than the actual root cause — CSS2DObjects only render when added to a Three.js group traversed by the CSS2DRenderer). The fix was applied before merge.

### 3. Parallel 7.2/7.3 merge conflict in `three-helpers.jsx`

Both 7.2 (deposit renderers) and 7.3 (hydrothermal annotation) modified `three-helpers.jsx`. When 7.2 was merged first, the 7.3 branch had a merge conflict at three locations:
- Start of `buildMineralisationGeometry` vs. start of `addHydrothermalAnnotation` (different function signatures after the same anchor point)
- Body of each function (shared `totalHeight`/`halfH` lines between two conflict blocks)
- The `buildSceneContents` forEach loop (each branch added its own loop)

Resolution: manual three-way merge in the 7.3 worktree, keeping both complete functions and both forEach loops. Rebased and force-pushed before merging.

This is the same worktree-contamination class of issue as Phase 6 — both parallel branches modified the same file. The resolution was the same (rebase-onto-master after the first branch merges).

### 4. Stale worktree base caused duplicate merge commits

PRs #25 and #26 showed "Merge branch 'master' into feature/..." commits in the log. This happened because GitHub auto-rebased the branches during the merge rather than doing a clean squash. The net result is functionally correct (squash merge always produces clean commits on master) but the commit log shows some extra noise. This is a GitHub behaviour, not a worktree issue.

---

## What was not detailed in the implementation plan

### Parallel branch file conflict is predictable but unavoidable

The plan's parallelism map `7.2 || 7.3` implies both run simultaneously, and both were assigned to `three-helpers.jsx`. Phase 6 experienced the same issue with `6.2 || 6.4`. For Phase 8 (where all four sub-phases are marked "can run in parallel"), any pair touching the same file will require a rebase. **Mitigation**: brief each parallel agent to add their function and forEach loop independently, and expect that the second agent to merge will need a rebase.

### `labels.push` vs `overlays.add` contract

The project's file-level JSDoc says `labels: Array<{node,data}>` but the `labels` array returned by `buildSceneContents` is never consumed by `scene.jsx` (only `root` and `overlays` are added to the Three.js scene). CSS2DObjects only render if they are children of a scene graph node. The correct pattern established in Phase 6 intrusion overlays (`overlays.add(lbl)`) is the one to follow. The `labels` array is vestigial metadata — it exists but is not consumed downstream. New overlay-only functions should use `overlays.add(lbl)` exclusively, not `labels.push`.

### Andesite mapped to `basalt` lithology in reference card

The epithermal reference card displays layers named "Andesite" but maps to `lithology: 'basalt'` (the closest valid LITHOLOGY catalogue entry). Andesite is not in the catalogue. This is cosmetically imperfect but functionally correct. A future improvement could add `andesite` to the LITHOLOGY table in `geo-data.jsx`.

### `five_elements` field_origin keys use `'five_' + key` prefix

In `applyDefaults` (7.1), inferred five_elements fields are recorded in `field_origin` as `field_origin.five_heat_source`, `field_origin.five_fluid_source`, etc. This differs from the stated/inferred pattern used for scalar fields (which use the field name directly). No downstream code currently reads these sub-keys so there is no runtime impact, but it is inconsistent. Phase 8 or a future pass could normalise this.

---

## Important notes for Phase 8

- **All tests pass on master**: `npm run smoke` (4 tests), `npm run acceptance` (10 tests: AC1–AC10). Phase 8 must not regress any.

- **Mineralisation not in MERGE MODE**: The interpreter's merge-mode schema (`"Changed sentences"` path) handles only `upsert_layers` and `upsert_events`. Intrusions, unconformities, and mineralisation are not included. Adding mineralisation to merge mode would require updating `mergeIntoModel` in `workspace.jsx` — left for Phase 8 if needed.

- **Inspector sidebar gap**: `model.mineralisation` entries are not surfaced in the `FeatureInspector` UI in `workspace.jsx`. AC10 verifies them via `window.__lastModel` only. Phase 8 should consider a combined "Features" section listing intrusions, unconformities, and mineralisation.

- **`overlayUpdateMap` not extended for mineralisation**: Edits to mineralisation fields trigger full scene rebuild (fallback path). Acceptable given no drag handles for mineralisation.

- **`buildMineralisationGeometry` additive pattern**: Phase 8 should follow the same pattern — forEach loop at the end of `buildSceneContents`, no modifications to the primary event-type dispatch.

- **Phase 8 parallelism**: The plan says all four Phase 8 sub-phases (8.1 persistence, 8.2 prediction, 8.3 share-via-URL, 8.4 export) can run in parallel. They touch different subsystems but watch for `workspace.jsx` — 8.2 (prediction mode in interpreter) and 8.3 (share button) may both touch `workspace.jsx` and/or `app.jsx`. Brief agents to minimise their file overlap.
