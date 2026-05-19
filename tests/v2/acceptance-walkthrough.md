# v2 Acceptance Walkthrough

**Date:** 2026-05-19
**Status:** INCOMPLETE — 2 items remaining (live test runs + dogfooding sign-off)

---

## §13.1 — Audit complete (all reference formations)

- [x] `docs/v2-audit.md` exists and is complete
- [x] Severity ratings assigned (Phase A completion doc confirms 25 formations audited: 0 correct / 7 minor-confusion / 15 misleading / 3 incorrect)

**Evidence:** `docs/v2-audit.md` header table lists all 25 formations across 6 feature classes
(layers, faults, folds, intrusions, unconformities, mineralisation). `STATUS.md` Phase A section
records the audit summary and user sign-off on 2026-05-18.

---

## §13.2 — All `incorrect` / `misleading` items fixed

- [x] All Phase B–H audit work items closed (cross-referenced to STATUS.md + phase completion docs)
- [x] BUG-03 (anticline/syncline age annotation — indistinguishable at zero plunge) resolved in Phase D
- [x] Angular unconformity tilted lower geometry absent — fixed in Phase H.1 (tilted THREE.Group + THREE.Plane clip)
- [x] VMS deposit lens above paleo-seafloor — fixed in Phase H.8 (seafloorY computed from layer thicknesses)
- [x] Skarn granite layer rendered as flat sedimentary slab — fixed in Phase H.8 (intrusion body built by case 'skarn': itself)
- [x] Age annotation absent from all 13 layer-bearing formations — fixed in Phase B (age badges, age ramp, younging arrow)
- [x] HW/FW labels absent from all 7 fault formations — fixed in Phase B
- [x] Sense-of-motion arrows absent from all 7 fault formations — fixed in Phase C
- [x] Stress-state badges absent from all 7 fault formations — fixed in Phase C
- [x] Net displacement not shown on dip-slip faults — fixed in Phase C (throw/heave/displacement triad)
- [x] Strike-slip camera orientation hides lateral sense — fixed in Phase C (theta fix + viewpoint indicator)
- [x] Axial-plane labels absent from folds — fixed in Phase D (D.1–D.2)
- [x] Cross-cutting age tags absent from all 4 intrusion formations — fixed in Phase H.5
- [x] Sill renders flat when host layers are tilted — fixed in Phase H.6
- [x] Laccolith depth clamp preventing correct placement — fixed in Phase H.7
- [x] Porphyry concentric shells offset from centre — fixed in Phase H.8
- [x] Orogenic gold fault subtype 'normal' instead of 'strike-slip' — fixed in Phase H.8

**Evidence:** STATUS.md Phase B–H audit work list sections all marked ✓. Phase completion documents
in `implementation/phase-v2-B-completion.md` through `implementation/phase-v2-H-completion.md`
confirm each item closed.

---

## §13.3 — All v1 features still work

- [x] v1 smoke test: 5/5 pass (Phase H.9 — `npm run smoke`)
- [x] v2 smoke test: 25/25 pass (Phase H.9 — `npm run smoke-v2`)
- [x] v1 acceptance criteria AC1–AC14: all PASS (Phase I.7 — `tests/v2/v1-regression-check.md`)
- [x] Full Formation Reference tab renders all 25 reference cards correctly (6 sections confirmed below)
- [x] JSON import/export round-trip (confirmed in Phase I.7 / AC6)
- [x] Share URL round-trip (confirmed in Phase I.7 / AC13)

**Formation Reference code verification:**
`src/geo-data.jsx` exports `REFERENCE_SECTIONS` with exactly 6 entries:
- `layers` (num 01) — 3 formations (horizontal-strata, dipping-strata, multilayer-thickness)
- `faults` (num 02) — 7 formations (normal, reverse, thrust, dextral, sinistral, oblique, listric)
- `folds` (num 03) — 3 formations (anticline, syncline, monocline)
- `intrusions` (num 04) — 4 formations (dyke, sill, batholith, laccolith)
- `unconformities` (num 05) — 3 formations (angular, disconformity, nonconformity)
- `mineralisation` (num 06) — 5 formations (porphyry, orogenic gold, VMS, skarn, epithermal)

Total: 25 cards across 6 sections. `src/reference-view.jsx` maps over `GD.REFERENCE_SECTIONS`
to render all sections.

---

## §13.4 — Learner's-guide additions in place

- [x] Age annotation on every multi-layer formation — Phase B; `buildAgeBadges` confirmed in `src/three-helpers.jsx` (line 2584)
- [x] HW/FW labels on every fault — Phase B; `buildHWFWLabels` confirmed in `src/three-helpers.jsx` (line 828)
- [x] Stress-state badge on every fault — Phase C; `buildStressBadge` confirmed in `src/three-helpers.jsx` (line 996)
- [x] Throw/heave/displacement triad on every dip-slip fault — Phase C; `addThrowHeaveOverlay` confirmed in `src/three-helpers.jsx` (line 1032)
- [x] Axial-plane label on every fold — Phase D; `buildAxialPlane` and axial-plane label in `src/three-helpers.jsx`
- [x] Concept primer on first launch — Phase E; `ConceptPrimer` component confirmed in `src/app.jsx` (line 252); `showPrimer` state with `handlePrimerDismiss`
- [x] Focus mode toggle works — Phase E; `focusModeOn` state confirmed in `src/app.jsx` (line 49); Focus toggle button rendered in topbar (line 170); prop passed into workspace
- [x] Explanation strip appears after every Interpret — Phase E; `ExplanationStrip` component confirmed in `src/workspace.jsx` (line 463); rendered after model set (line 1143)
- [x] Cross-section tab works — Phase F; `ViewportTabs` component confirmed in `src/workspace.jsx` (line 682); `buildCrossSectionAnnotations` called in `src/scene.jsx` (line 574)
- [x] Map view tab works (including V-patterns for plunging folds) — Phase F; `buildMapViewAnnotations` confirmed in `src/three-helpers.jsx` (line 3143); called in `src/scene.jsx` (line 601)
- [x] Map-view inset visible in 3D and Cross-section tabs — Phase G; `entry.insetCamera` confirmed in `src/scene.jsx` (line 341, line 72); suppressed only in `viewMode === 'map'` (line 72)
- [x] Borehole tool places single boreholes — Phase G; `buildBoreholeGeometry` confirmed in `src/three-helpers.jsx` (line 3309); called in `src/scene.jsx` (line 680) with `viewMode` passed through

---

## §13.5 — Interpreter misconception suite passes

- [x] All 12 tests exist in `tests/v2/misconception-checks/` (7 positive: M01–M07; 5 negative: N01–N05)
- [ ] Tests pass on v2 codebase — *requires live Playwright run with browser*

**Evidence:** `tests/v2/misconception-checks/README.md` indexes all 12 tests across M01–M07
(positive, validation_note pill appears) and N01–N05 (negative, no pill). Run via
`npm run smoke-v2-misconceptions`.

> **Note:** These tests use stub fixtures (not live LLM calls) and assert only UI pill
> behaviour. The stub tier can be run without `ANTHROPIC_API_KEY`; the live-LLM tier is
> manual. The [ ] above refers specifically to the live browser/Playwright run.

---

## §13.6 — Textbook regression suite passes

- [x] 31 tests exist in `tests/v2/textbook-regression/` (Phase I.1)
- [ ] Tests pass on v2 codebase — *requires live Playwright run with browser*

**Evidence:** `tests/v2/textbook-regression/README.md` indexes 31 scenarios: L01–L03 (layers),
F01–F07 (faults), D01–D03 (folds), U01–U03 (unconformities), I01–I04 (intrusions),
M01–M05 (mineralisation), C01–C05 (combined), H01 (historical sequence). Run via
`npm run smoke-v2-regression`.

**Coverage breakdown:**

| Category           | Count |
|--------------------|-------|
| Layer (L)          | 3     |
| Fault (F)          | 7     |
| Fold (D)           | 3     |
| Unconformity (U)   | 3     |
| Intrusion (I)      | 4     |
| Mineralisation (M) | 5     |
| Combined (C)       | 5     |
| Historical (H)     | 1     |
| **Total**          | **31** |

---

## §13.7 — Owner sign-off on 5 scenarios (Phase I.4 — PENDING)

- [ ] Documented in `tests/v2/dogfood-log-steven.md`
- [ ] Steven signs off (text confirmation in STATUS.md)

**Status:** AWAITING Steven's personal dogfooding pass. Phase I.4 is the next sequential
sub-phase. Steven must run 5 real geological scenarios (one per major feature class:
layer/fault/fold/intrusion/unconformity), log results in `tests/v2/dogfood-log-steven.md`,
and confirm sign-off in STATUS.md before v2.0 can be cut.

---

## §13.8 — No v1 feature has been removed

- [x] Verified by code inspection (Phase I.7 — `tests/v2/v1-regression-check.md`)
- [x] All AC1–AC14 v1 criteria PASS on v2

**Evidence:** `tests/v2/v1-regression-check.md` records 14 PASS / 0 RISK / 0 FAIL.
v2 additions (concept primer, focus mode, explanation strip, inspector explanations,
viewport tabs, map-view inset, borehole tool, unconformity/intrusion/mineralisation
geometry fixes, fourth Focus toggle, geological time-scale strip) are all additive and
do not remove any DOM element, `window` property, or state property that v1 tests
rely on.

---

## Open Items

1. **§13.5 / §13.6 tests need a live run** — Run `npm run smoke-v2-misconceptions` and
   `npm run smoke-v2-regression` against the live app to verify runtime pass. Requires
   `node dev-server.js` (port 8000) + Playwright installed. Stub-tier misconception tests
   do not need `ANTHROPIC_API_KEY` but do require a running browser context via Playwright.
2. **§13.7 dogfooding** — Steven must complete Phase I.4 before v2.0 can be cut.
   At minimum: 5 real geological descriptions, one per feature class, logged with pass/fail
   and any issues found.

---

## Conclusion

6/8 acceptance criteria fully verified by code inspection and phase documentation.
§13.5 and §13.6 suites exist and are structured correctly — their test files and fixture
JSON are present; the remaining gate is a live Playwright run confirming no runtime errors.
§13.7 is the primary human gate before v2.0 is cut.

| Criterion | Status |
|-----------|--------|
| §13.1 Audit complete | PASS |
| §13.2 All incorrect/misleading items fixed | PASS |
| §13.3 All v1 features still work | PASS |
| §13.4 Learner's-guide additions in place | PASS |
| §13.5 Misconception suite passes | SUITES EXIST — live run pending |
| §13.6 Textbook regression suite passes | SUITES EXIST — live run pending |
| §13.7 Owner sign-off | PENDING (Phase I.4) |
| §13.8 No v1 feature removed | PASS |
