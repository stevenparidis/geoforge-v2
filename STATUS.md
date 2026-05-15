# GeoForge — Status

**Last updated:** 2026-05-15
**Current phase:** Phase 7 complete
**Current sub-phase:** —
**Blockers:** none

## Phase completion

- [x] Phase 0 — Repository hygiene and baseline
- [x] Phase 1 — Direct 3D manipulation (edit path C)
- [x] Phase 2 — Incremental re-parse and conflict rule
- [x] Phase 3 — Listric fault correctness
- [x] Phase 4 — Polish, error handling, performance
- [x] Phase 5 — Acceptance testing and v1 release
- [x] Phase 6 — Scope expansion: intrusions and unconformities
- [x] Phase 7 — Mineralisation and ore deposits
<<<<<<< HEAD
- [ ] Phase 8 — Prediction, persistence, collaboration (8.2 complete)
=======
- [x] Phase 8 — Prediction, persistence, collaboration (in progress)
>>>>>>> 041835b (phase 8.3: share via URL)

## Phase 5 — Acceptance testing and v1 release

- [x] 5.1 Acceptance test suite (7 tests, all pass)
- [x] 5.2 Fix-its (no fixes needed — all 7 tests passed first run)
- [x] 5.3 Version tag and release notes
- [x] 5.4 User sign-off (granted 2026-05-15)

## Phase 4 — Polish, error handling, performance

- [x] 4.1 Merge phases 1, 2, 3 (already on master — no conflicts)
- [x] 4.2 Regression sweep (all 4 smoke tests pass)
- [x] 4.3 Empty-state polish (click-to-fill textarea; two-click demo flow)
- [x] 4.4 Error handling (floating toast for LLM failure and invalid JSON; auto-dismiss 6 s)
- [x] 4.5 Performance check (stress fixture: 10 layers, 5 faults, 2 folds; `npm run perf`)
- [x] 4.6 Mobile-width fallback (< 900 px shows full-screen notice; reactive on resize)
- [x] 4.7 README sync

## Phase 1 — Direct 3D manipulation

- [x] 1.1 Handle layer foundation
- [x] 1.2 Drag projection per handle type
- [x] 1.3 Overlay co-update during drag
- [x] 1.4 Acceptance and smoke-test extension
- README "Deviations from the spec" entry #3 marked closed.
- Acceptance-criteria table in README: row 4 updated to ✅ for path C.

## Phase 2 — Incremental re-parse
- [x] 2.1 Conflict rule draft
- [x] 2.2 Rule sign-off (user agreed on 2026-05-15)
- [x] 2.3 Description differ module (window.GeoDiff)
- [x] 2.4 Merge-mode interpreter prompt
- [x] 2.5 Workspace rewire (diff-aware onInterpret, mergeIntoModel)
- [x] 2.6 Tests (unit + smoke)
- README "Deviations from the spec" entry #2 marked closed.

## Phase 3 — Listric fault correctness
- [x] 3.1 Listric geometry rebuild
- [x] 3.2 Overlay system
- [x] 3.3 Reference card update and smoke test
- README "Deviations from the spec" entry #4 marked closed.

## Open spec questions

(All previously open questions resolved in Phases 2 and 3.)

## Active deviations from spec

1. **Model name & token cap.** The spec asks for `claude-sonnet-4-20250514` with `max_tokens=1000` called directly via the Anthropic API. The sandbox only exposes Claude through `window.claude.complete`, which uses `claude-haiku-4-5` and a fixed 1024-token cap.
5. **Throw / displacement clamping.** `applyDefaults` clamps LLM-returned metres-scale values into the model's local frame.

---

## Phase 6 — Scope expansion: intrusions and unconformities

- [x] 6.1 Schema extension (intrusions + unconformities arrays, prompt, applyDefaults) — PR #15
- [x] 6.2 Intrusion renderers (dyke, sill, batholith, laccolith) — PR #16
- [x] 6.4 Unconformity renderers (wavy-line trace, angular/disconformity/nonconformity) — PR #17
- [x] 6.3 Intrusion overlays (strike/dip, thickness, depth, feature labels) — PR #18
- [x] 6.5 Unconformity overlays (time gap, type label, angular discordance arc) — PR #19
- [x] 6.6 Reference view extension (7 cards: 4 intrusions, 3 unconformities) — PR #20
- [x] 6.7 Trigger phrase tests (AC8 intrusions, AC9 unconformities — 9/9 pass) — PR #21

---

## Phase 7 — Mineralisation and ore deposits

- [x] 7.1 Mineralisation schema (mineralisation array, prompt extension, applyDefaults) — PR #22
- [x] 7.2 Mineralisation renderers (porphyry, skarn, VMS, orogenic gold, epithermal) — PR #23
- [x] 7.3 Hydrothermal annotation (five-elements panel, alteration halo) — PR #24
- [x] 7.4 Mineralisation overlays (grade, alteration radius, metal labels) — PR #25
- [x] 7.5 Reference view extension (mineralisation deposit-type cards) — PR #26
- [x] 7.6 Acceptance test AC10 (mineralisation — 10/10 pass) — PR #27

---

**v1.1 released 2026-05-15** — all ten acceptance criteria pass (AC1–AC10).

---

## Phase 8 — Prediction, persistence, collaboration

- [x] 8.1 Browser localStorage persistence (auto-save/restore) — PR #28
- [x] 8.2 Prediction mode (Predict button; model.predictions[]; rendered as purple wireframe) — PR #31
- [x] 8.3 Share via URL (Share button; base64 URL fragment; toast confirmation) — PR #29
- [x] 8.4 Export PNG (Export PNG button; canvas2d.toDataURL capture; file download) — PR #30
