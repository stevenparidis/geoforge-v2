# Phase C Completion — Fault Refinements + Interpreter Validation

**Phase:** C of I (v2)
**Completed:** 2026-05-18
**PRs merged:** #54 (C.5/C.6/C.4a), #55 (C.1/C.2/C.3), #56 (C.4), #57 (C.7 — this document)

---

## What was accomplished

Phase C brought every v1 fault rendering up to the correctness standard identified in the Phase A audit, and added interpreter validation gates that surface geologically inconsistent inputs as visible warnings rather than silent rewrites.

1. **Sense-of-motion arrows (C.1)** — Two `THREE.ArrowHelper` objects per fault, colour-coded to HW (purple `#d68fff`) and FW (teal `#80e0c0`). Direction is coded per subtype: down-dip for normal/listric, up-dip for reverse/thrust, along-strike for strike-slip, combined rake direction for oblique. Added to the overlays group so the Overlays toggle controls them.

2. **Stress-state badge (C.2)** — CSS2DObject label below the model stack. Maps fault subtype to `TENSION` (normal, listric), `COMPRESSION` (reverse, thrust), or `SHEAR` (strike-slip, oblique). Includes directional arrows, a principal-stress label, and a subtitle with the stress-regime notation. Added to the scene root so the Labels toggle controls it. Class: `.stress-badge`.

3. **Throw/heave/displacement triad (C.3)** — The existing throw/heave overlay (cyan lines) extended with a dashed light-blue displacement line connecting equivalent piercing points. Displacement computed as `sqrt(throw² + heave²)` when not stated. Renders for dip-slip faults; strike-slip faults get displacement along strike.

4. **Subtype-specific refinements (C.4)**:
   - **C.4.a** — Thrust/reverse dip validation: `applyDefaults()` flags thrust faults with dip > 45° and reverse faults with dip ≤ 30° via `validation_note` (never silently rewrites).
   - **C.4.b** — Listric detachment surface: translucent cyan horizontal plane at `detachment_depth`, labelled "detachment surface", with dip-at-depth arc annotation.
   - **C.4.c** — Strike-slip viewpoint indicator: CSS2DObject label below the model reading "From this viewpoint, the far side moves to the right → dextral." / "...left → sinistral." Class: `.vp-indicator`.
   - **C.4.d** — Oblique decomposition labels renamed from "throw / offset" to "dip-slip component / strike-slip component" for geological accuracy.
   - Camera angle fix: strike-slip `cameraHint.theta` changed from `0.0` to `1.2` so lateral motion is visible (was looking straight down the fault plane).

5. **Interpreter validation gates (C.5)** — `INTERPRETER_SYSTEM_PROMPT` extended with `VALIDATION RULES`, `EXPLANATION GENERATION`, and `MISCONCEPTION AVOIDANCE` sections. `applyDefaults()` extended with:
   - Thrust/reverse dip check (C.4.a).
   - Right-hand-rule check (fires only when both strike and dip_direction are `stated`; guards against false positives on inferred values).
   - Anticline/syncline core-age check.

6. **Inspector validation note pill (C.6)** — `FeatureInspector` renders an amber `.validation-note-pill` at the top of any feature panel where `feature.validation_note` is set. The pill is styled with the `--inferred` amber to be visually consistent with inferred-value warnings. It does not block rendering.

7. **Smoke test + convergence (C.7)** — Three new tests added to `tests/v2/smoke.test.js`. One bug found and fixed during convergence (see below).

---

## Sub-phase PR table

| Sub-phase | PR | Description |
|---|---|---|
| C.5/C.6/C.4a | #54 | Interpreter validation gates, inspector pill, thrust/reverse dip check |
| C.1/C.2/C.3 | #55 | Motion arrows, stress badge, displacement triad |
| C.4 | #56 | Listric detachment surface, strike-slip viewpoint, oblique decomposition, camera fix |
| C.7 | #57 | Smoke test extension, bug fix (vp-indicator not in scene graph), STATUS.md, completion doc |

C.5/C.6/C.4a, C.1/C.2/C.3, and C.4 ran in parallel after Phase B merged, then converged at C.7.

---

## What was overcome

### 1. Motion arrow direction vectors (found in review before PR #55 merged)

The initial implementation of `buildSenseOfMotionArrows` computed the slip direction using bearing arithmetic that mixed up the coordinate-system conventions (Y-up vs Z-up). The HW arrow for a normal fault pointed at an angle inconsistent with the fault plane rather than cleanly down-dip. Fixed by projecting the slip vector onto the fault plane normal explicitly and using the same `rad()` / `planeNormal()` helpers already established in the fault builder.

### 2. RHR false-positive on inferred values (found in review before PR #54 merged)

The right-hand-rule check in `applyDefaults()` initially fired whenever strike and dip_direction disagreed by more than 10°, including cases where dip_direction was `inferred` by `applyDefaults()` itself from a default. This produced spurious `validation_note` warnings on perfectly valid descriptions. Fixed by guarding the RHR check: it only fires when both `field_origin.strike === 'stated'` and `field_origin.dip_direction === 'stated'`. The fix required a second commit on the PR branch before merge.

### 3. Detachment arc reference vector (found in review before PR #56 merged)

The dip-at-depth arc annotation for the listric detachment surface used the wrong reference vector for the angle computation. The arc was drawn against the fault-plane tangent rather than the horizontal plane (which is the correct reference for measuring dip). Fixed by using `new T.Vector3(1, 0, 0)` (horizontal in the dip-direction plane) as the arc's zero-angle reference.

---

## What was not in the implementation plan

### Merge conflicts between PRs touching the same files

All three parallel PRs (#54, #55, #56) touched `src/three-helpers.jsx` and/or `src/workspace.jsx`. PR #54 merged first (validation gates affect `workspace.jsx` only). PR #55 merged second with a rebase to pick up #54's changes. PR #56 had a conflict in `three-helpers.jsx` in the `buildFaultScene` function where both #55 (motion arrows + stress badge calls) and #56 (strike-slip viewpoint, oblique label rename) had added calls in the same region. Resolved by keeping all additions: the C.1/C.2 calls from #55 and the C.4 refinements from #56.

### Bug: vp-indicator CSS2DObject not added to scene graph (found in C.7 convergence)

The Phase C.4 implementation in `addStrikeSlipOverlay` pushed the `.vp-indicator` CSS2DObject to the `labels` array (for visibility-toggle bookkeeping) but never called `overlays.add(vpLbl)` to attach it to the Three.js scene graph. The CSS2DRenderer only renders objects in the scene graph, so the `.vp-indicator` element never appeared in the DOM despite the code being present. The bug was discovered when the C.7 smoke test for `.vp-indicator` timed out. Fixed by adding `overlays.add(vpLbl)` before the `labels.push()` call in `addStrikeSlipOverlay`. This is a one-line fix in `three-helpers.jsx`.

The v1 smoke tests and the pre-existing B.age / B.hwfw v2 tests confirmed all other labels were unaffected.

---

## Architecture additions

New functions in `src/three-helpers.jsx`:
- `buildSenseOfMotionArrows(faultEvent, model)` — returns `{ hwArrow, fwArrow }` (`THREE.ArrowHelper` objects), or `null` for vertical faults (handled separately inside `addStrikeSlipOverlay`).
- `buildStressBadge(faultEvent, model)` — returns a `CSS2DObject` containing a `.stress-badge` div with stress state, directional arrows, and subtitle.

Modified functions in `src/three-helpers.jsx`:
- `addStrikeSlipOverlay` — added `.vp-indicator` CSS2DObject (with `overlays.add(vpLbl)` fix from C.7).
- `addThrowHeaveOverlay` — added displacement line (dashed) and label.
- `buildFaultScene` (via `buildSceneContents`) — wired `buildSenseOfMotionArrows` and `buildStressBadge` calls for each fault event.
- Listric fault builder — added detachment surface plane + label + dip-at-depth arc.
- Oblique builder — renamed component labels.

New fields added to event schema (documented in `workspace.jsx` prompt):
- `validation_note: string (optional)` — set by interpreter or `applyDefaults()` when a geological inconsistency is detected. Never overwrites a value already set; first rule wins.

New CSS classes in `index.html`:
- `.stress-badge`, `.stress-badge--tension`, `.stress-badge--compression`, `.stress-badge--shear`, `.sb-label`, `.sb-sub`
- `.vp-indicator`, `.vp-eye`, `.vp-text`
- `.validation-note-pill`, `.vn-icon`, `.vn-text`

New validation logic in `src/workspace.jsx` (`applyDefaults()`):
- `validateFaultEvent` inline rules: thrust/reverse dip, RHR check (stated-only), anticline/syncline core-age.

New smoke tests in `tests/v2/smoke.test.js`:
- `C.fault-arrows` — normal fault → `.stress-badge` exists with "TENSION".
- `C.validation` — thrust dip 70° → `validation_note` set, `.validation-note-pill` in DOM.
- `C.strike-slip-vp` — dextral strike-slip → `.vp-indicator` in DOM with correct text.

---

## Notes for Phase D (fold refinements)

- **Phase C's `validation_note` convention is established.** Phase D's fold sense-of-motion (anticline/syncline distinction) should use the same pattern: if the user's description implies ambiguity, produce a `validation_note` rather than silently choosing. The anticline/syncline core-age check is already implemented in C.5; Phase D should extend it with the visual fold-core coloring.
- **The `buildSceneContents` labels-array pattern has a footgun.** Any CSS2DObject pushed to `labels` must also be added to the scene graph (via `root.add()`, `overlays.add()`, or `meshes.add()`). The `labels` array is only used for visibility toggling; it is not a scene-graph insertion mechanism. Phase D implementers should add both calls whenever creating a new CSS2DObject.
- **The off-viewport optimisation in `Surface.tick()` affects reference-tab tests.** Reference cards below the fold are skipped by the render loop (`rect.bottom < -200 || rect.top > window.innerHeight + 200`). Smoke tests that need to verify CSS2D output from reference cards should use a workspace fixture (inject via `window.claude.complete`) rather than navigating the Formation Reference tab.
- **`ArrowHelper` objects from C.1 are in `res.overlays`.** Phase D fold sense-of-motion arrows should follow the same pattern: add to the overlays group so they are hidden by the Overlays toggle.
- **Stress-badge gating is via Labels toggle.** If Phase D adds a fold-regime badge (extensional/compressional fold environment), it should be added to `root` (not `overlays`) and pushed to `labels` so it responds to the Labels toggle consistently with the fault stress badge.
