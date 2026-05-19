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
- [x] Phase 8 — Prediction, persistence, collaboration

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

---

## Phase A — The audit (2026-05-18)
- [x] A.1 Source selection
- [x] A.2 v1 screenshot capture (25 formations, 50 screenshots)
- [x] A.3 Audit template and worked example
- [x] A.4 Per-formation audit (all 25 formations across 6 feature classes)
- [x] A.5 Prioritisation and synthesis
- [x] A.6 User sign-off (2026-05-18)

### Audit summary
- 0 formations rated correct
- 7 rated minor-confusion
- 15 rated misleading
- 3 rated incorrect
- Total: 25 formations audited

**Phases B–H unblocked.**

---

## Phase B — Layer age annotation + HW/FW labels
- [x] B.1 CSS variables + palette extension
- [x] B.2 Age-ramp side faces
- [x] B.3 Younging arrow
- [x] B.4 Age sequence badges
- [x] B.5 HW/FW labels + mnemonic tooltip
- [x] B.6 Smoke test + signoff

Audit work list closed:
- §5.1 age annotation: all layer-bearing formations ✓
- §5.2 HW/FW labels: all 7 fault formations ✓

v1 smoke test: passing (all 4 tests).
v2 smoke test: passing (B.age, B.hwfw).
Phase C unblocked.

---

## Phase C — Fault refinements + interpreter validation
- [x] C.1 Sense-of-motion arrows (PR #55)
- [x] C.2 Stress-state badge (PR #55)
- [x] C.3 Throw/heave/displacement triad (PR #55)
- [x] C.4 Subtype refinements: listric detachment surface, strike-slip viewpoint indicator, oblique decomposition, camera angle fix (PR #56)
- [x] C.5 Interpreter validation gates (PR #54)
- [x] C.6 Inspector validation note pill (PR #54)
- [x] C.7 Smoke test + convergence (this PR)

Audit work list closed:
- §5.2 motion arrows, stress badge, displacement triad: all 7 fault formations ✓
- §5.3 subtype-specific refinements: listric, strike-slip, oblique ✓
- §5.5 right-hand rule check: implemented ✓
- §9 validation gates: implemented ✓

Phase D unblocked.

---

## Phase D — Fold refinements
- [x] D.1 Axial-plane rendering (light-cyan, gated by Overlays toggle) — PR #58
- [x] D.2 Axial-plane label with anticline/syncline identification (gated by Labels toggle) — PR #58
- [x] D.3 Interlimb-angle limb planes (measurement-origin clarity) — PR #59
- [x] D.4 Monocline step indicator (dashed underlying-step + label) — PR #60
- [x] D.5 Acceptance + smoke test convergence (this PR)

Audit work list closed:
- §5.4 fold refinements: all 3 fold formations ✓

BUG-03 (anticline vs syncline at zero plunge) resolved.

Phase E unblocked.

---

## Phase E — Concept primer + focus mode + explanation strip
- [x] E.1 Concept primer modal (PR #62)
- [x] E.2 Focus mode (PR #65)
- [x] E.3 Explanation strip (PR #64)
- [x] E.4 Inspector explanation paragraphs (PR #63)
- [x] E.5 Acceptance + smoke test convergence (this PR)

Audit work list closed:
- §6.1 concept primer ✓
- §6.2 focus mode ✓
- §6.3 explanation strip ✓
- §6.4 inspector explanations ✓

Phase F unblocked.

---

## Phase F — Cross-section and Map view tabs
- [x] F.1 Viewport tab strip UI
- [x] F.2 GeoScene viewMode prop
- [x] F.3 Cross-section renderer
- [x] F.4 Map view renderer
- [x] F.5 Linked selection
- [x] F.6 Cross-section plane computation
- [x] F.7 Map V-pattern computation
- [x] F.8 Acceptance + smoke test

Audit work list closed:
- §7.1 three-tab viewport ✓
- §7.2 map view V-pattern surfaced ✓

Phase G unblocked.

---

## Phase G — Map-view inset + borehole tool
- [x] G.1 Map-view inset renderer
- [x] G.2 Inset positioning + view sync
- [x] G.3 Borehole tool toggle + click handler
- [x] G.4 Borehole geometry + lithology readout
- [x] G.5 Acceptance + smoke test

Audit work list closed:
- §7.3 map-view inset ✓
- §7.4 single-borehole tool ✓

Phase H unblocked.

---

## Phase H — Unconformity / intrusion / mineralisation fixes
- [x] H.1 Angular unconformity: tilted lower beds + THREE.Plane clipping
- [x] H.2 Discordance arc: connects actual upper/lower bedding planes
- [x] H.3 Geological time-scale strip (ICS periods)
- [x] H.4 Nonconformity: crystalline texture + expanded label
- [x] H.5 Intrusion cross-cutting age tags (all 4 subtypes)
- [x] H.6 Sill tilt fix + concordance/discordance labels
- [x] H.7 Laccolith: depth clamp removed + schematic domed-layer arch
- [x] H.8 Mineralisation audit follow-up (VMS, skarn, orogenic gold, porphyry, epithermal)
- [x] H.9 Acceptance + smoke test convergence

Audit work list closed:
- §5.6 unconformities ✓
- §5.7 intrusions ✓
- §5.8 mineralisation (audit subset) ✓

Phase I unblocked.

---

## Phase I.7 — v1 Regression Check (code-level)
- [x] AC1–AC14 verified by source-code inspection (2026-05-19)
- [x] `tests/v2/v1-regression-check.md` written
- Result: 14 PASS / 0 RISK / 0 FAIL

---

## Phase I.3 — Full acceptance walkthrough
- [x] tests/v2/acceptance-walkthrough.md written (2026-05-19)
- §13.1–§13.4, §13.8: all PASS
- §13.5–§13.6: suites exist; live run pending
- §13.7: awaiting Phase I.4 dogfooding sign-off
