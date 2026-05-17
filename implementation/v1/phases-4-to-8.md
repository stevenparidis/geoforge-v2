# Phase 4 — Polish, error handling, performance

**Parent plan:** `implementation-plan.md`
**Phase:** 4 of 8
**Pre-requisite:** Phases 1, 2, and 3 all complete.

---

## Goal

The convergence point. Phases 1, 2, and 3 produced three feature branches that need to merge cleanly. This phase merges them, then takes the converged prototype from "working" to "shippable" — empty-state polish, error handling, performance under load.

## Files this phase touches

Potentially any file. The phase is about quality, not new architecture.

---

## Parallelism map

```
4.1 (merge) ──> 4.2 (regression sweep) ──┬──> 4.3 (empty state)
                                         ├──> 4.4 (error handling)
                                         ├──> 4.5 (performance)
                                         └──> 4.6 (mobile fallback)
                                         (these four in parallel)
                                                  ▼
                                         4.7 (README sync)
```

4.1 and 4.2 are sequential. 4.3–4.6 can run in parallel. 4.7 runs last.

---

## Sub-phase 4.1 — Merge phases 1, 2, 3

Bring the three feature branches together. The phases were designed with non-overlapping files (see the "Files this phase touches" tables in phases 1, 2, 3) so the merge should be clean in most cases. Conflicts are most likely in `workspace.jsx` (phases 1, 2, and 3 all touch it).

**Conflict resolution rule:** phase 2 changes `onInterpret` and `updateField`; phase 1 adds drag callbacks into the same `updateField`; phase 3 adds inspector fields for listric depth. Resolve in that priority order. Each phase's tests must pass after the merge.

---

## Sub-phase 4.2 — Regression sweep

Run the phase-0 smoke test, the phase-1 extended smoke test, the phase-2 unit + smoke tests, and the phase-3 smoke test all in sequence. Any failure is a regression introduced by the merge. Fix before continuing.

---

## Sub-phase 4.3 — Empty-state polish

The placeholder text in the description textarea should be a one-line example that produces a recognisable model when the user clicks Interpret without typing anything. Recommended example:

> A 1 m thick sandstone layer overlies a 0.8 m shale layer, all dipping 30° east. A normal fault cuts through them, dipping 60° east with 0.5 m of throw.

Make the placeholder selectable-by-click into the text area so first-time users get a working demo in two clicks.

---

## Sub-phase 4.4 — Error handling

For each failure path, surface a small toast notification with a clear message and a retry option where applicable:

- LLM call fails (network, rate limit, malformed JSON) → "Interpreter couldn't read that. Try again, or rephrase."
- JSON upload fails validation → "This file isn't a valid GeoForge model. Check it was downloaded from this app."
- Drag projection edge case (e.g. dip near 90°) → silent clamp; no toast.

Replace any existing silent failures (look for `catch` blocks with no UI surface) with these toasts.

---

## Sub-phase 4.5 — Performance check

Build a stress-test fixture: a description producing 10 layers, 5 faults (one of each subtype), and 2 folds. Verify:

- Initial render under 2 seconds.
- Drag operations sustain 30 fps.
- Toggling Overlays on/off completes in under 200 ms.

If any threshold fails, profile with browser devtools. The most likely culprits are: overlay rebuilds on every frame (should be `update()` calls per phase 1.3); label DOM thrash (consider CSS containment); per-frame `getBoundingClientRect()` in `Surface.tick()` (already throttled but check).

---

## Sub-phase 4.6 — Mobile-width fallback

Below 900px viewport width, show a single-screen notice: "GeoForge is desktop-only in v1. Open this page on a screen at least 1024px wide for the full experience." Do not attempt to render the workspace or reference view at narrow widths.

---

## Sub-phase 4.7 — README sync

Update the README to reflect reality: acceptance criteria table now all ✅, deviations list closed, file map matches the new repo layout. Update `STATUS.md`.

---

## Acceptance criteria for phase 4

1. All four prior phases' tests pass after the merge.
2. A first-time user can produce a working model in two clicks (placeholder + Interpret).
3. Every failure path produces a visible toast rather than a silent failure.
4. The stress-test fixture renders and animates at 30+ fps.
5. Mobile widths show a clean fallback notice.
6. README matches reality.

---

---

# Phase 5 — Acceptance testing and v1 release

**Parent plan:** `implementation-plan.md`
**Phase:** 5 of 8
**Pre-requisite:** Phase 4 complete.

---

## Goal

Walk through `spec-v1.md` §11 acceptance criteria as formal tests, capture any final fixes, cut v1.0.

---

## Parallelism map

```
5.1 (acceptance test suite) ──> 5.2 (fix-its) ──> 5.3 (version + release notes) ──> 5.4 (user signoff)
```

Sequential — each step depends on the previous.

---

## Sub-phase 5.1 — Acceptance test suite

For each of the seven acceptance criteria in `spec-v1.md` §11, write a test script in `tests/acceptance/`:

| AC # | Test name                          | Verifies                                                          |
|------|------------------------------------|-------------------------------------------------------------------|
| 1    | `ac-1-interpret.test.js`           | Plain-English description produces a 3D model.                    |
| 2    | `ac-2-overlays.test.js`            | Every measurement has its geometric-origin overlay.               |
| 3    | `ac-3-stated-inferred.test.js`     | Inferred values render in amber+dashed; stated in white.          |
| 4    | `ac-4-three-edit-paths.test.js`    | All three edit paths produce consistent JSON.                     |
| 5    | `ac-5-history-playback.test.js`    | Playback applies events oldest → most recent.                     |
| 6    | `ac-6-json-roundtrip.test.js`      | Download then re-upload restores both description and 3D state.    |
| 7    | `ac-7-default-state.test.js`       | Fresh model loads with labels and overlays on.                     |

Each test uses the smoke-test harness from phase 0.

---

## Sub-phase 5.2 — Fix-its

Anything 5.1 surfaces, fix. Repeat 5.1 until all seven pass.

---

## Sub-phase 5.3 — Version tag and release notes

- Bump version strings everywhere (`app.jsx` shows `v1 · prototype` — change to `v1.0`).
- Write `RELEASE_NOTES_v1.md` summarising what's in, what's out, what's deferred to phases 6–8.
- Update `CHANGELOG.md`.

---

## Sub-phase 5.4 — User sign-off

The user runs through v1 personally with two real-world descriptions of their choosing. Sign-off is required; defects file to a v1.1 backlog rather than blocking release unless they're severe.

---

## Acceptance criteria for phase 5

1. All seven `tests/acceptance/` tests pass automatically.
2. Version tag is `v1.0` consistently.
3. Release notes exist.
4. User has personally run two real-world descriptions through the app and signed off.

When all four are true, GeoForge v1 is released. Update `STATUS.md` to `"v1 released; phase 6 unblocked"`.

---

---

# Phase 6 — Scope expansion: intrusions and unconformities

**Parent plan:** `implementation-plan.md`
**Phase:** 6 of 8
**Pre-requisite:** Phase 5 complete.

---

## Goal

Add the two highest-priority post-v1 feature classes: intrusive bodies and unconformities.

---

## Sub-phases

- **6.1 Schema extension.** Add `intrusions` and `unconformities` top-level arrays to the GeoModel schema. Update the interpreter prompt (trigger phrases already in reference §16). Update `applyDefaults`.
- **6.2 Intrusion renderers.** Builders for dyke, sill, batholith, laccolith. Each renders its host-rock contact as a separate annotatable feature.
- **6.3 Intrusion overlays.** Contact orientation (strike/dip), emplacement depth, body geometry. Same conventions as fault overlays.
- **6.4 Unconformity renderers.** Angular, dis-, non-. Wavy-line trace per reference §15.
- **6.5 Unconformity overlays.** Time gap labelled against age labels; angular discordance arc.
- **6.6 Reference view extension.** Cards for each new feature.
- **6.7 Trigger phrase tests.** Add to `tests/acceptance/`.

## Parallelism map

```
6.1 ──┬──> 6.2 ──> 6.3 ──┐
      └──> 6.4 ──> 6.5 ──┴──> 6.6 ──> 6.7
```

6.2/6.3 (intrusions) and 6.4/6.5 (unconformities) run in parallel.

## Acceptance criteria

1. Interpreter handles dykes, sills, batholiths, laccoliths, and three unconformity types.
2. Each renders with full measurement-origin overlays.
3. Reference page has cards for each.
4. All v1 tests still pass.

---

---

# Phase 7 — Mineralisation and ore deposits

**Parent plan:** `implementation-plan.md`
**Phase:** 7 of 8
**Pre-requisite:** Phase 6 complete.

---

## Goal

Make GeoForge useful for understanding *why* deposits form where they do.

---

## Sub-phases

- **7.1 Mineralisation schema.** `mineralisation` top-level array per reference §18.
- **7.2 Deposit-type catalogue.** Renderers for porphyry, orogenic gold, VMS, skarn, epithermal Au-Ag.
- **7.3 Hydrothermal-system annotation.** The "five elements" labels (heat source, fluid source, metal source, pathway, trap) per reference §13.2.
- **7.4 Mineralisation overlays.** Grade contours, alteration shell boundaries, ore body envelope.
- **7.5 Reference view extension.** Cards for each deposit type.
- **7.6 Tests.**

## Parallelism map

```
7.1 ──┬──> 7.2 ──> 7.4 ──┐
      └──> 7.3 ──────────┴──> 7.5 ──> 7.6
```

7.2 and 7.3 run in parallel.

## Acceptance criteria

1. Each deposit type interprets from plain English.
2. Each renders with structural control, alteration zones, and (where applicable) the five hydrothermal elements.
3. Reference page covers each.

---

---

# Phase 8 — Prediction, persistence, collaboration

**Parent plan:** `implementation-plan.md`
**Phase:** 8 of 8
**Pre-requisite:** Phase 7 complete.

---

## Goal

Close out the deferred items from `spec.md` §10.

---

## Sub-phases

- **8.1 Persistence.** Browser local storage with auto-save. Coexists with the existing JSON download (download remains the manual export).
- **8.2 Prediction.** A "predict" mode in the interpreter: given structural context, suggest plausible deposit types and locations. Output annotated onto the model as "predicted mineralisation," visually distinct from confirmed.
- **8.3 Share via URL.** A share button generating a URL with the JSON-encoded model in the fragment. No backend.
- **8.4 Export.** PDF or PNG of the current 3D view + annotations + description.

## Parallelism map

All four sub-phases can run in parallel. They touch different subsystems.

## Acceptance criteria

1. Page refresh restores the last session.
2. Prediction mode suggests deposits and annotates them on the model.
3. A share link reopens the model in a fresh browser session.
4. Export produces a usable image or PDF.

---

## End state

After phase 8: GeoForge fully realises `spec.md`. Geology students get plain-English structural modelling, full measurement-origin annotation, predicted mineralisation, and shareable models. The pedagogical principle is intact throughout.
