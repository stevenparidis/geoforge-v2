# Phase D Completion — Fold Refinements

**Phase:** D of I (v2)
**Completed:** 2026-05-18
**PRs merged:** #58 (D.1/D.2), #59 (D.3), #60 (D.4), #61 (D.5)

---

## What was accomplished

Phase D brought all three fold visualisations (anticline, syncline, monocline) up to the correctness standard identified in the Phase A audit. BUG-03 — the most documented pedagogical failure in v1 — is now resolved.

1. **Axial-plane rendering update (D.1)** — The existing axial plane was moved from the `meshes` group to the `overlays` group (so it responds to the Overlays toggle). Colour changed from violet (`COLOR.axial = 0xb693ff`) to neutral light cyan (`0x8db4c2`) to avoid visual competition with measurement overlays. Opacity reduced from 0.18 to 0.12. `depthTest: true` added. A local `AXIAL_COLOR` constant was used rather than modifying the shared `COLOR` object, eliminating merge-conflict risk with the parallel D.3/D.4 branches.

2. **Axial-plane fold-type label (D.2)** — A CSS2DObject label added at the top of the axial plane:
   - Anticline: "ANTICLINE — axial plane / oldest beds in core"
   - Syncline: "SYNCLINE — axial plane / youngest beds in core"
   Font: Geist 10pt/9pt, light-cyan colour family, dark pill background. Added via `overlays.add(axLbl)` before `labels.push(...)` (correct pattern). Gated by Labels toggle.

3. **Interlimb limb planes (D.3)** — Two faint translucent `PlaneGeometry` meshes added, one per limb, radiating from the fold hinge. Each plane is oriented using `Quaternion.setFromUnitVectors(up, limbDir)` and offset so its base edge starts at the hinge. Colour: `COLOR.overlay` (0x67e8f9), opacity 0.10. Inserted immediately before the existing interlimb arc so the arc visually spans *between* the two planes. Gated by Overlays toggle.

4. **Monocline step indicator (D.4)** — Three `dashedLine` segments added to the monocline section: upper platform (at `y = total/2`), lower platform (at `y = total/2 - step_height`), and a vertical connector at `x = 0`. Colour `0x5a5648` (faint warm grey), opacity 0.55. A CSS2DObject label "underlying step" positioned midway along the vertical drop. All positions rotated by the plunge quaternion `q`. Gated by Overlays toggle.

5. **Smoke test extension and sign-off (D.5)** — Three new tests added to `tests/v2/smoke.test.js`:
   - `D.anticline` — anticline fixture → asserts `.fold-axial-lbl` in DOM with 'ANTICLINE' text
   - `D.syncline` — syncline fixture → asserts `.fold-axial-lbl` with 'SYNCLINE' text
   - `D.monocline` — monocline fixture → asserts `.monocline-step-lbl` in DOM
   All 8 v2 smoke tests pass; all 4 v1 smoke tests pass.

---

## Sub-phase PR table

| Sub-phase | PR | Description |
|---|---|---|
| D.1 / D.2 | #58 | Axial plane colour/opacity/toggle update + fold-type label |
| D.3 | #59 | Interlimb limb planes |
| D.4 | #60 | Monocline underlying-step indicator |
| D.5 | #61 | Smoke test extension + STATUS.md |

D.1/D.2, D.3, and D.4 ran in parallel after Phase C merged, then converged at D.5. No merge conflicts — all three parallel PRs touched different `if` blocks within `buildFoldScene`.

---

## What was overcome

### 1. D.5 agent hit API rate limit on first dispatch

The first D.5 convergence agent was killed by the Claude API rate limit before it could make any commits. The worktree was clean (zero commits, only a `settings.local.json` modification). The agent was re-dispatched with a fresh worktree and completed successfully on the second run.

### 2. Local master desynchronised during orchestration

After merging all four PRs, the main `c:/Geoforge_v2` checkout was on the `feat/phase-d-convergence` branch (created by the failed first D.5 agent) with stale uncommitted changes from earlier worktrees mixed in. Resolved by stashing (then dropping) the stale state, switching to `master`, and fast-forwarding. The stashed changes were already in master via PRs #58–#61 so the drop was safe.

---

## What was not in the implementation plan

### Existing axial plane was already partially implemented

The Phase D plan described D.1 as adding a new `buildAxialPlane()` function. In practice, the axial plane already existed in v1's `buildFoldScene` — it rendered as a violet translucent plane added to the `meshes` group. D.1 was therefore an *update* (colour, opacity, group membership, depthTest) rather than a new function. This simplified the implementation but required careful reading of the existing code before writing.

### `COLOR.axial` not modified — local constant used instead

To avoid merge conflicts between D.1/D.2, D.3, and D.4 (all running in parallel and all touching `buildFoldScene`), the D.1 agent correctly used a local `AXIAL_COLOR = 0x8db4c2` constant rather than modifying the shared `COLOR` object. The `COLOR.axial` entry (0xb693ff, violet) remains in the object but is now unused — it can be cleaned up in a future housekeeping pass.

### Fold inspector wait condition reused fault pattern

The D.5 smoke tests needed to wait for the fold model to appear in the inspector. The fold event list uses the same second `.feat-list` selector as fault models, so the existing wait condition from the fault tests worked without modification.

---

## Architecture additions

New CSS classes in `index.html`:
- `.fold-axial-lbl` — container for the axial-plane fold-type label
- `.fal-type` — primary line (fold type), 10pt, light cyan `#8db4c2`
- `.fal-age` — subtitle line (age-in-core principle), 9pt, lower opacity
- `.monocline-step-lbl` — label for the underlying-step indicator, warm grey `#5a5648`

Modified section in `src/three-helpers.jsx` (`buildFoldScene`):
- `if (opt.axial !== false && subtype !== 'monocline')` block — axial plane moved to `overlays`, colour/opacity updated, `axLbl` CSS2DObject added
- `if (opt.interlimb !== false && subtype !== 'monocline')` block — two limb-plane meshes inserted before the arc
- `if (subtype === 'monocline')` block — three `dashedLine` segments and `stepLbl` CSS2DObject appended

New smoke tests in `tests/v2/smoke.test.js`:
- `D.anticline` — zero-plunge anticline fixture → `.fold-axial-lbl` with 'ANTICLINE' text
- `D.syncline` — zero-plunge syncline fixture → `.fold-axial-lbl` with 'SYNCLINE' text
- `D.monocline` — monocline fixture → `.monocline-step-lbl` in DOM

v2 smoke test count: **8** (was 5 after Phase C).

---

## Notes for Phase E

- **`COLOR.axial` is now unused.** It was the old violet axial-plane colour. Safe to remove in any future cleanup pass.
- **The axial plane is in `overlays`, not `meshes`.** Any future fold-related overlay that should also respond to the Overlays toggle should follow the same pattern: add to `overlays`, and if it's a CSS2DObject, also call `labels.push(...)` for Labels-toggle control.
- **The `makeLimbPlane` helper is defined inline in `buildFoldScene`.** If Phase E or later phases need similar plane-from-direction geometry, extract it to a shared helper at the top of `three-helpers.jsx`.
- **BUG-03 is resolved** via the combination of Phase B's age-ramp side faces + age-sequence badges, and Phase D's axial-plane label. The label is the unambiguous visual differentiator at zero plunge.
- **Phase E (unconformity refinements) is fully unblocked.** No Phase D outputs are pre-requisites for Phase E — the phases are independent audit work items.
