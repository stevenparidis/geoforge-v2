# Phase A Completion — The Audit

**Phase:** A of I (v2)
**Completed:** 2026-05-18
**Sign-off:** Steven Paridis (2026-05-18)
**Output document:** `docs/v2-audit.md`
**PRs merged:** #41 (A.3), #42 (A.1), #43 (A.2), #44 (A.4 folds/layers), #45 (A.4 faults), #46 (A.4 mineralisation), #47 (A.4 intrusions/unconformities), #48 (A.5 synthesis)

---

## What was accomplished

Phase A produced a complete structured accuracy audit of all 25 v1 reference formations against external textbook geology sources. No source code was modified. Every subsequent phase (B–H) now has a documented, signed-off scope.

**Severity distribution:**

| Rating | Count | Formations |
|---|---|---|
| `correct` | 0 | — |
| `minor-confusion` | 7 | monocline, horizontal-strata, dipping-strata, batholith, disconformity, nonconformity, epithermal |
| `misleading` | 15 | all 7 faults, anticline, syncline, multilayer-thickness, dyke, sill, laccolith, porphyry, orogenic-gold |
| `incorrect` | 3 | angular-unconformity, VMS, skarn |
| **Total** | **25** | |

**41 required work items** distributed across Phases B, C, D, H.

---

## Critical findings

### 1. Angular unconformity — `incorrect`
The most architecturally significant finding. The tilted lower-bed geometry **does not exist** in v1. All four unconformity subtypes render as flat horizontal beds. The angular subtype adds only a wavy amber contact line and a discordance arc that labels a 35° angle with no geometric counterpart in the scene — the scene is visually indistinguishable from a disconformity. Phase H must implement the tilted-lower-block renderer from scratch before any other angular unconformity fix can be applied.

Note: PR #40 (open) adds 4 short overlay lines below the contact — this is a cosmetic partial fix that does not implement the tilted block geometry. The `incorrect` rating stands even after PR #40 merges.

### 2. VMS deposit — `incorrect`
The massive sulphide lens is positioned at `y = -halfH - R*0.1` (below the base of the layer stack). VMS deposits form at the seafloor — the top of the volcanic sequence. The geo-data.jsx entry correctly describes "at the seafloor" but the renderer inverts the geometry. The stringer/feeder zone and exhalite apron are also absent.

### 3. Skarn — `incorrect`
The granite "intrusion" is modelled as a conformable sedimentary layer (`order: 1` in the layers array) with no intrusions array entry. There is no intrusion–carbonate contact geometry and no endoskarn/exoskarn distinction. The fundamental setting of contact metasomatism is not expressed in any geometric element.

### 4. BUG-03 confirmed — anticline/syncline (`misleading`)
The anticline and syncline renderers differ by exactly one sign flip on line 952 of `three-helpers.jsx`. No age annotation, no axial-plane text label, no "oldest in core" callout exists anywhere in the renderers. At zero plunge, a student cannot distinguish the two formations from any camera angle.

### 5. Universal fault gaps (`misleading` — all 7 faults)
No fault formation shows HW/FW labels, sense-of-motion arrows, stress-state badges, or net displacement as a third measurement. These are the primary pedagogical affordances specified in spec-v2 §5.2 and the main reason all 7 fault formations rate `misleading`.

### 6. Strike-slip camera orientation bug
Both strike-slip reference cards use `cameraHint: { theta: 0.0 }`, placing the camera looking directly along fault strike. The sense-of-motion arrows are foreshortened to near-zero apparent length, making dextral vs sinistral determination impossible without rotating the camera.

### 7. Oblique-slip rake field never wired
`rake: 50` is stored in geo-data.jsx for the oblique-slip formation but `evt.rake` is never referenced anywhere in `three-helpers.jsx`. The stored value is also geometrically inconsistent with the actual rendered geometry (~34° computed vs 50° stored). The `sense` field is also absent, causing a silent dextral default via `evt.sense === 'sinistral' ? -1 : 1`.

### 8. Sill tilt architecture gap (`misleading`)
The sill mesh is added directly to `root` in `buildSceneContents()` as a sibling of the tilted layer stack, not a child. The layer stack tilt is applied only inside `buildLayersOnly()` to its own `stack` group. For any tilted-host scenario, the sill stays horizontal while the layers tilt — making the sill geometrically discordant and visually indistinguishable from a dyke.

### 9. Porphyry zoning — correct (no v2 work on zoning)
The porphyry zoning order is correct: potassic innermost (f=0.25), propylitic outermost (f=1.00). No fix needed on zoning. The `misleading` rating is for the absent causative porphyry stock (no intrusion body visible in the scene).

---

## What was not in the implementation plan

### Additional formations found (25 vs 20 expected)
The implementation plan estimated 20 reference formations. The actual v1 Formation Reference tab has 25 cards (7 faults + 3 folds + 3 layers + 4 intrusions + 3 unconformities + 5 mineralisation). The 5 extra are the 5 mineralisation deposit types, which the plan had not counted separately. All 25 were audited.

### Mineralisation is the most severely deficient feature class
The plan's risk register flagged mineralisation as the hardest class to audit (references are textbook-scale). The actual finding was more severe than expected: 2 `incorrect` ratings (VMS, skarn), not just terminology issues. This is the most challenging feature class for Phase H.

### PR #40 conflict
An existing open PR (#40) partially addresses the angular unconformity by adding overlay lines. This PR predates Phase A and was not merged during Phase A. Phase H implementers must either merge PR #40 first or supersede it. The `incorrect` rating for angular unconformity is based on the merged master state, not PR #40's state.

### Screenshots captured via Playwright (A.2)
Phase A.2 successfully used Playwright + a static HTTP server on port 8081 to capture all 50 formation screenshots (25 formations × overlays-on/off). The capture script is at `scripts/capture-audit-screenshots.js` and is re-runnable. This was not prescribed in detail in the phase doc but the approach worked cleanly.

---

## Notes for Phase B (next phase)

Phase B is the immediate next phase (per the parallelism map: B is a dependency for C, D, and F). Phase B implements:
- **§5.1 — Stratigraphic age annotation:** numbered badges on layer side-faces, age ramp gradient, younging arrow. Applies to all 13 layer-bearing formations.
- **§5.2 — HW/FW labels:** colour-coded floating block labels (HW = purple `#d68fff`, FW = teal `#80e0c0`) with mnemonic tooltip. Applies to all 7 fault formations.

**Phase B audit-driven work list (4 items from `docs/v2-audit.md`):**
- [ ] §5.1 Age sequence badges (1–N) on all layer faces for all layer-bearing formations
- [ ] §5.1 Younging direction arrow on all layer-bearing formations
- [ ] §5.2 HW/FW colour-coded labels with mnemonic tooltip on all 7 fault formations
- [ ] §5.2 Layer ID stability — ensure L1, L2, … IDs are consistent across all three viewport tabs

**Key constraint from the audit:** Phase B's age badges are a prerequisite for Phase D's BUG-03 fix. The axial-plane labels "ANTICLINE — axial plane" and "SYNCLINE — axial plane" are meaningless without visible age numbers to confirm which type it is. Do not attempt Phase D before Phase B is merged.

**Performance note:** The age badge system will add CSS2DObject labels to every layer face. With 5–7 layers per formation this could be 15–21 new label objects. Ensure the badge system reuses the existing `makeLabel` infrastructure and that the v1 perf test (`npm run perf`) still passes after Phase B.

**Phase B pre-conditions (all met):**
- Phase A complete and signed off ✓
- `docs/v2-audit.md` merged ✓
- v1 smoke test passing (unchanged) ✓

---

## Parallelism guidance for the orchestrator

From `implementation-plan-v2.md §3`:

After Phase B merges, the following can run in parallel:
- **Phase C** (fault refinements) — depends on B for HW/FW label infrastructure
- **Phase D** (fold refinements) — depends on B for age badges
- **Phase E** (pedagogical scaffolds) — no code dependencies on B; can start immediately
- **Phase F** (cross-section + map tabs) — depends on B (D recommended first)
- **Phase H** (intrusion/unconformity/mineralisation) — depends on A only; can start now

Phase G (map inset + borehole) depends on Phase F.
Phase I (tests + release) depends on all of B–H.

**Recommended next steps:**
1. Start Phase B immediately (single agent, the dependency for C/D/F).
2. Start Phase E and Phase H in parallel with Phase B (both have no code dependency on B).
3. After Phase B merges: start Phases C, D, F in parallel.
