# GeoForge v2 — Accuracy Audit

**Audit date:** 2026-05-18
**Auditors:** Phase A sub-agents (A.4 faults, A.4 folds-layers, A.4 intrusions-unconformities, A.4 mineralisation)
**Source index:** `docs/v2-audit/sources.md`
**Template:** `docs/v2-audit/template.md`
**Worked example:** `docs/v2-audit/example-normal-fault.md`

---

## Summary

| Rating | Count | Formations |
|---|---|---|
| `correct` | 0 | — |
| `minor-confusion` | 7 | monocline, horizontal-strata, dipping-strata, batholith-granite, disconformity, nonconformity, epithermal-au-ag |
| `misleading` | 16 | normal-fault, reverse-fault, thrust-fault, strike-slip-dextral, strike-slip-sinistral, oblique-slip, listric-fault, anticline, syncline, multilayer-thickness, dyke-basalt, sill-basalt, laccolith-granite, orogenic-gold, porphyry-cu-au, orogenic-gold |
| `incorrect` | 2 | angular-unconformity, vms-deposit, skarn-deposit |
| **Total** | **25** | |

> Note: `incorrect` count is 3 (angular-unconformity, vms-deposit, skarn-deposit); `misleading` count is 15; `minor-confusion` count is 7. Total = 25.

Corrected summary:

| Rating | Count | Formations |
|---|---|---|
| `correct` | 0 | — |
| `minor-confusion` | 7 | monocline, horizontal-strata, dipping-strata, batholith-granite, disconformity, nonconformity, epithermal-au-ag |
| `misleading` | 15 | normal-fault, reverse-fault, thrust-fault, strike-slip-dextral, strike-slip-sinistral, oblique-slip, listric-fault, anticline, syncline, multilayer-thickness, dyke-basalt, sill-basalt, laccolith-granite, porphyry-cu-au, orogenic-gold |
| `incorrect` | 3 | angular-unconformity, vms-deposit, skarn-deposit |
| **Total** | **25** | |

---

## Cross-cutting patterns

These patterns appear across multiple feature classes and are the highest-priority findings because they drive phase priority and represent the widest pedagogical impact.

### Pattern 1 — Stratigraphic age annotation absent from all layer-bearing formations

Every formation that contains geological layers (faults with layer stacks, all fold formations, all standalone layer formations) lacks any stratigraphic age annotation. The `order` field is present in every relevant `geo-data.jsx` entry (0 = oldest, N−1 = youngest) but nothing in any builder renders this as a visible badge, ramp, or arrow.

Affects: all 7 fault formations (normal-fault, reverse-fault, thrust-fault, strike-slip-dextral, strike-slip-sinistral, oblique-slip, listric-fault), anticline, syncline, multilayer-thickness, monocline, horizontal-strata, dipping-strata — 13 of 25 formations directly, and the fold formations most critically.

**Phase B fix (§5.1):** numbered side-face badges, age ramp, younging direction arrow on all layer-bearing formations.

### Pattern 2 — HW/FW labels absent from all 7 fault formations

Not one of the seven fault formations renders a hanging-wall / footwall block label. The `buildFaultScene()` dispatcher places the geometry correctly — HW moves up-dip or down-dip as expected — but neither the HW nor the FW block carries any label, colour coding, or mnemonic tooltip.

Students viewing any fault formation cannot identify which block is the hanging wall. This reinforces spec-v2 §3.4 misconception "HW is always on one specific side" — the mnemonic (you hang on the hanging wall) is invisible without the label.

**Phase B fix (§5.2 labels):** colour-coded "HANGING WALL · HW" (purple) and "FOOTWALL · FW" (teal) floating tags with pointer lines, applied to all 7 fault formations.

### Pattern 3 — Sense-of-motion arrows and stress-state badges absent from all 7 fault formations

All 7 fault formations lack sense-of-motion arrows on the fault plane and stress-state badges (TENSION, COMPRESSION, SHEAR, EXTENSION). These are separate from the throw/heave overlays (which are present on most faults) — they address the kinematic and tectonic-regime questions, not the measurement questions.

**Phase C fix (§5.2 arrows/badge):** all 7 faults require these additions.

### Pattern 4 — Net displacement absent from all dip-slip fault formations

The throw and heave overlays are present on normal, reverse, thrust, and listric faults, but the net displacement (the resultant, `sqrt(throw² + heave²)`) is never shown as a third labelled quantity. Students cannot see that displacement ≠ throw — one of the most commonly documented fault-mechanics misconceptions (spec-v2 §3.4).

For the thrust fault specifically, the `displacement` overlay is listed in the `geo-data.jsx` overlays array as intended, but the renderer does not implement it — a data/renderer mismatch.

**Phase C fix (§5.2):** net displacement labelled overlay for all dip-slip fault formations.

### Pattern 5 — BUG-03 confirmed: anticline and syncline indistinguishable at zero plunge without age annotation

The only code difference between the anticline and syncline renderers is `const sign = subtype === 'syncline' ? -1 : 1` (line 952 of `three-helpers.jsx`). All layer colours, layer thicknesses, overlay colours, and hinge/interlimb/plunge overlays are otherwise identical. At plunge = 0° the two formations are visually indistinguishable without camera rotation. At the default non-zero plunge values (12° north / 8° south) the plunge-direction label provides a weak cue but does not address the fundamental issue: neither formation shows which rocks are oldest at the core.

The `Geological Digressions` source explicitly states that anticline/syncline is a stratigraphic term (oldest/youngest in core), not a geometric term (arch up / trough down). v1 teaches the geometric version only.

**Phase D fix (§5.4):** axial-plane text label "ANTICLINE — axial plane" / "SYNCLINE — axial plane" (BUG-03 FIX) combined with Phase B's age badges provides a complete fix.

### Pattern 6 — Cross-cutting age tags absent from all 4 intrusion formations

None of the four intrusion formations (dyke, sill, batholith, laccolith) carries a cross-cutting age tag or label indicating that the intrusive body post-dates the layers it cuts. The principle of cross-cutting relationships is one of the foundational principles of relative age dating and is the primary pedagogical reason for showing an intrusion at all. Its absence means students learn what intrusions look like but not what they imply about age sequence.

**Phase H fix (§5.7):** cross-cutting age tag ("post-L3" style label with tooltip) on all intrusion formations.

### Pattern 7 — Strike-slip formations share identical camera orientation, making sense indeterminate

Both `strike-slip-dextral` and `strike-slip-sinistral` have `camera: { phi: 1.4, theta: 0.0, dist: 9 }` — looking directly along the strike of the N–S fault. The motion arrow is foreshortened to near-zero apparent length at this camera angle. Textbooks show strike-slip faults in plan view precisely to make lateral sense unambiguous; v1 uses a front-on oblique that hides the motion.

**Phase C fix (§5.3):** fix theta for both strike-slip formations; add plan-view inset indicator.

---

## Faults

*Audited by Phase A.4 (faults group)*
*Auditor branch: phase-a4-faults*

---

### Faults: Normal Fault

**v1 reference ID:** `normal-fault`
**Source files involved:** `three-helpers.jsx` — `buildFaultScene()` (shared dispatcher, `subtype === 'normal'` path), `geo-data.jsx` — `REFERENCE_FORMATIONS['normal-fault']`

#### Source-code reading summary

- Builder function: `buildFaultScene()` in `three-helpers.jsx`
- REFERENCE_FORMATIONS entry: `geo-data.jsx` → `REFERENCE_FORMATIONS['normal-fault']`
- Key parameters: `dip: 60`, `dip_direction: 90` (east), `throw: 0.9`, `heave: 0.52` (inferred as `throw/tan(dip)`), `strike: 0` (inferred). Three layers: sandstone (base, order 0), shale (middle, order 1), limestone (top, order 2).
- Known deviations from default geometry: none. Geometry is well-formed. `slipVec` uses `downDipVec(60°, 90°)` — HW drops down-dip (east and down). Correct for a normal fault.

**What is rendered:**
1. Block split by `THREE.Plane` at 60°/090°; HW half translated by slip vector.
2. Translucent fault plane quad (opacity 0.22) with outline.
3. Floating label: "Normal 60° / 090°".
4. Throw/heave overlays: datum at mid-layer boundary; solid cyan lines labelled "Throw 0.90 u" and "Heave 0.52 u"; dashed purple pre-slip datum reconstruction.
5. Dip arc overlay at top surface; compass rose; strike line.
6. Layer thickness arrows on FW side.

**What is NOT rendered:**
- No HW / FW block labels.
- No sense-of-motion arrows on the fault plane.
- No stress-state badge ("TENSION" / σ₃).
- No net displacement label (`sqrt(throw² + heave²) ≈ 1.04 u`).
- No stratigraphic age badges on layer faces.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | 60° east dip is textbook-typical (Wikipedia: "at least 60°"). HW displaced down-dip via correct `downDipVec(60°, 90°)` slip vector. Block split geometry is correct. Three-layer sequence (sandstone/shale/limestone) is geologically coherent. |
| Measurement overlays | ⚠ partial | Throw and heave are present and correctly computed. Datum reconstruction (pre-slip HW datum in purple dashes) is technically correct. However: net displacement `sqrt(0.9² + 0.52²) ≈ 1.04 u` is not labelled — students cannot see that displacement ≠ throw. |
| Labels and terminology | ⚠ partial | "Normal 60° / 090°" — correct terminology. Throw and heave labelled correctly. Neither HW nor FW block has any label. Fault plane carries no label. `displacement` absent as a third labelled quantity. |
| Misconception risk | ✗ reinforces | Two §3.4 misconceptions unaddressed: (1) "HW is always on one specific side" — no HW/FW labels to teach the mnemonic; (2) "throw = displacement" — throw and heave shown but not the resultant. No stress-state badge (extensional regime absent). No sense-of-motion arrows on fault plane. |
| Default parameters | ✓ | 60° dip is standard textbook value for normal faults. Throw 0.9 u (37% of 2.4 u stack) is prominent but not unrealistic. Strike 0° (inferred) is arbitrary but reasonable for a schematic. |

#### Severity rating

**Rating:** `misleading`

The geometry is correct and the throw/heave overlays function. However, two documented §3.4 misconceptions are reinforced by absence: HW/FW identity is invisible to a student who does not already know it, and the throw/displacement distinction is unresolvable without the net displacement label. The misconception risk axis rates ✗.

#### Required v2 work

1. **Add HW/FW colour-coded block labels (spec-v2 §5.2 — required).** "HANGING WALL · HW" (purple) and "FOOTWALL · FW" (teal) floating tags with pointer lines to respective blocks. Applies to all 7 fault formations.
2. **Add sense-of-motion arrows on fault plane (spec-v2 §5.2 — required).** HW arrow pointing down-dip; FW arrow pointing up-dip. Colour-coded to match HW/FW labels.
3. **Add net displacement as a third labelled quantity (spec-v2 §5.2 — required).** Dashed line along fault plane between equivalent piercing points. Label "Displacement N u". Computed as `sqrt(throw² + heave²)`.
4. **Add stress-state badge (spec-v2 §5.2 — required).** "TENSION" pill with outward σ₃ arrows and subtitle "extensional regime."
5. **Add stratigraphic age badges on layer faces (spec-v2 §5.1 — required).** Numbered badges (1 = oldest, N = youngest) on visible slab faces.

---

### Faults: Reverse Fault

**v1 reference ID:** `reverse-fault`
**Source files involved:** `three-helpers.jsx` — `buildFaultScene()` (`subtype === 'reverse'` path), `geo-data.jsx` — `REFERENCE_FORMATIONS['reverse-fault']`

#### Source-code reading summary

- Key parameters: `dip: 50`, `dip_direction: 90` (east), `throw: 0.7`, `heave: 0.59` (inferred), `strike: 0` (inferred). Three layers: sandstone (order 0), shale (order 1), limestone (order 2). Tag: "Fault · compressional".
- Known deviations from default geometry: none. `slipVec` uses `upDipVec(50°, 90°)` — HW rides up-dip. Correct for reverse fault.

**What is NOT rendered:**
- No HW / FW labels.
- No sense-of-motion arrows on fault plane.
- No stress-state badge ("COMPRESSION" / σ₁ horizontal).
- No net displacement label.
- No stratigraphic age badges.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ⚠ partial | 50° dip is within the accepted reverse fault range (>45°). The up-dip slip vector is correct. The 90° dip_direction places HW overriding eastward — opposite the classic textbook convention (HW overrides toward the foreland/west). Self-consistent but potentially confusing. |
| Measurement overlays | ⚠ partial | Throw and heave present and correctly computed. Net displacement absent. |
| Labels and terminology | ⚠ partial | "Reverse 50° / 090°" — correct. Throw/heave labelled. No HW/FW block labels. No displacement label. |
| Misconception risk | ✗ reinforces | Same two §3.4 misconceptions as normal fault: no HW/FW labels; no displacement vs throw distinction. No COMPRESSION stress-state badge. No sense-of-motion arrows. |
| Default parameters | ✓ | 50° dip correctly places this above the thrust/reverse boundary (45°). |

#### Severity rating

**Rating:** `misleading`

#### Required v2 work

1. **Add HW/FW labels (spec-v2 §5.2 — required).** Applies to all 7 fault formations.
2. **Add sense-of-motion arrows on fault plane (spec-v2 §5.2 — required).** HW arrow up-dip; FW arrow down-dip.
3. **Add net displacement label (spec-v2 §5.2 — required).**
4. **Add stress-state badge (spec-v2 §5.2 — required).** "COMPRESSION" pill with converging horizontal σ₁ arrows.
5. **Add stratigraphic age badges (spec-v2 §5.1 — required).**

---

### Faults: Thrust Fault

**v1 reference ID:** `thrust-fault`
**Source files involved:** `three-helpers.jsx` — `buildFaultScene()` (`subtype === 'thrust'` path), `geo-data.jsx` — `REFERENCE_FORMATIONS['thrust-fault']`

#### Source-code reading summary

- Key parameters: `dip: 25`, `dip_direction: 90` (east), `throw: 0.45`, `heave: 0.97` (inferred). Overlays include `displacement` (listed in metadata but NOT rendered by the builder — a data/renderer mismatch).

**What is NOT rendered:**
- No HW / FW labels.
- No sense-of-motion arrows on fault plane.
- No stress-state badge ("COMPRESSION").
- No net displacement label (listed in metadata but builder does not render it — mismatch confirmed).
- No stratigraphic age badges.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | 25° dip correctly categorises this as a thrust (< 45°). Large heave relative to throw (0.97 vs 0.45) is geometrically correct and visually diagnostic. |
| Measurement overlays | ⚠ partial | Throw and heave correctly shown. The `displacement` entry in the overlays array is metadata only — the builder does not render a displacement line. Discrepancy between stated and actual behaviour. |
| Labels and terminology | ⚠ partial | "Thrust 25° / 090°" label is correct. No HW/FW block labels. The reverse/thrust distinction (dip < 45°) not annotated anywhere in the scene. |
| Misconception risk | ✗ reinforces | Same §3.4 misconceptions: no HW/FW labels, no displacement. The threshold between reverse and thrust (45°) is not explained in the scene. No stress-state badge. |
| Default parameters | ✓ | 25° dip is well within thrust range. |

#### Severity rating

**Rating:** `misleading`

#### Required v2 work

1. **Add HW/FW labels (spec-v2 §5.2 — required).**
2. **Add sense-of-motion arrows on fault plane (spec-v2 §5.2 — required).**
3. **Implement net displacement as a labelled overlay (spec-v2 §5.2 — required).** The geo-data overlays array already lists `displacement` but the builder does not render it. Wire this in `buildFaultScene()` for `subtype === 'thrust'`.
4. **Add stress-state badge (spec-v2 §5.2 — required).** "COMPRESSION" pill.
5. **Add "thrust boundary" annotation (spec-v2 §5.2 — optional).** Label or tooltip: "Thrust faults dip < 45°; reverse faults dip ≥ 45°."
6. **Add stratigraphic age badges (spec-v2 §5.1 — required).**

---

### Faults: Strike-slip (Dextral)

**v1 reference ID:** `strike-slip-dextral`
**Source files involved:** `three-helpers.jsx` — `buildFaultScene()` (`subtype === 'strike-slip'`, `sense === 'dextral'` path), `geo-data.jsx` — `REFERENCE_FORMATIONS['strike-slip-dextral']`

#### Source-code reading summary

- Key parameters: `dip: 90`, `strike: 0` (N–S), `sense: 'dextral'`, `displacement: 1.0`. Camera: `{ phi: 1.4, theta: 0.0, dist: 9 }`.
- **Critical camera issue:** `theta = 0.0` places camera looking directly along the N–S fault strike. The fault plane appears as a vertical line and the slip arrow is foreshortened to near-zero apparent length. Sense of motion is not visually determinable without rotating the camera.

**What is NOT rendered:**
- No HW / FW labels.
- No sense-of-motion arrows ON the fault plane surface.
- No stress-state badge ("SHEAR" / lateral motion).
- No plan-view (map-view) representation — the dominant textbook presentation for strike-slip faults.
- No stratigraphic age badges.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Vertical fault plane correct for strike-slip. East block offset northward by 1.0 u is geometrically correct for dextral sense on an N–S fault. |
| Measurement overlays | ⚠ partial | Offset arrow and displacement label ("1.00 u dextral") present but foreshortened by default camera orientation. |
| Labels and terminology | ⚠ partial | "Strike-slip dextral 000°" label correct. No HW/FW labels. |
| Misconception risk | ✗ reinforces | Camera angle (`theta = 0.0`) makes sense of motion visually indeterminate. Slip arrow foreshortened. Textbooks show strike-slip in plan view precisely to make sense unambiguous. No stress-state badge. |
| Default parameters | ✓ | 90° dip correct. Displacement 1.0 u visually prominent. |

#### Severity rating

**Rating:** `misleading`

#### Required v2 work

1. **Fix default camera orientation (spec-v2 §5.3 — required, high priority).** Change `theta` to approximately `π/2` (1.57 rad) or use overhead oblique (`phi ≈ 0.5, theta ≈ 0.4`) for plan-like view showing lateral offset.
2. **Add plan-view inset (spec-v2 §5.3 — recommended).** 2D plan-view overlay showing the map trace and dextral-sense arrows.
3. **Add block identity labels and stress-state badge (spec-v2 §5.2 — required).**
4. **Add stratigraphic age badges (spec-v2 §5.1 — required).**

---

### Faults: Strike-slip (Sinistral)

**v1 reference ID:** `strike-slip-sinistral`
**Source files involved:** `three-helpers.jsx` — `buildFaultScene()` (`subtype === 'strike-slip'`, `sense === 'sinistral'` path), `geo-data.jsx` — `REFERENCE_FORMATIONS['strike-slip-sinistral']`

#### Source-code reading summary

- Key parameters: `dip: 90`, `strike: 0`, `sense: 'sinistral'`, `displacement: 0.9`. Camera: `{ phi: 1.4, theta: 0.0, dist: 9 }` — same as dextral.
- Near-clone of dextral with only `sense` and `displacement` differing. Same `theta = 0.0` foreshortening problem. At default view, sinistral and dextral are visually nearly indistinguishable.

**What is NOT rendered:** Same list as dextral.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Vertical fault, east block moves south (−Z). Sign convention correctly applied. |
| Measurement overlays | ⚠ partial | Same foreshortening problem as dextral at default camera. |
| Labels and terminology | ⚠ partial | "Strike-slip sinistral 000°" label correct. No block identity labels. |
| Misconception risk | ✗ reinforces | Same camera problem as dextral. At default view, sinistral and dextral are visually nearly indistinguishable — directly undermining the formation's purpose of distinguishing the two senses. |
| Default parameters | ✓ | 90° dip and 0.9 u displacement appropriate. |

#### Severity rating

**Rating:** `misleading`

#### Required v2 work

1. **Fix default camera orientation (spec-v2 §5.3 — required).** Same fix as dextral. Apply to both sinistral and dextral.
2. **Ensure sinistral/dextral are visually distinguishable at default view (spec-v2 §5.3 — required).**
3. **Add block identity labels and stress-state badge (spec-v2 §5.2 — required).**
4. **Add stratigraphic age badges (spec-v2 §5.1 — required).**

---

### Faults: Oblique-slip Fault

**v1 reference ID:** `oblique-slip`
**Source files involved:** `three-helpers.jsx` — `buildFaultScene()` (`subtype === 'oblique'` path), `geo-data.jsx` — `REFERENCE_FORMATIONS['oblique-slip']`

#### Source-code reading summary

- Key parameters: `dip: 65`, `dip_direction: 90`, `throw: 0.55`, `displacement: 1.05`, `rake: 50` (stored but **never read by renderer**), `sense`: absent (renderer defaults to dextral silently).
- **Critical issues:** (1) `sense` field absent from data — renderer silently defaults to dextral; (2) `rake` field present in data but `evt.rake` is never referenced in `three-helpers.jsx` — the rake angle is the canonical textbook parameter for oblique-slip classification and its absence from rendering is a data/renderer mismatch.

**What is NOT rendered:**
- No HW / FW labels.
- No rake angle annotation (neither the `rake: 50` data value nor a computed arc).
- No stress-state badge.
- No compound classification label (e.g. "Dextral-normal oblique").
- No stratigraphic age badges.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ⚠ partial | Combined dip-slip + strike-slip slip vector is geometrically correct. However, `sense` field is absent from data causing a silent code default. Data model does not explicitly document the full kinematic classification (rake and sense). |
| Measurement overlays | ⚠ partial | Slip decomposition (vertical throw arm + horizontal offset arm) is present and is the correct way to visualise oblique-slip decomposition. However: (a) rake angle not shown as arc within the fault plane; (b) compound classification absent; (c) net displacement vector anchored to origin rather than a real piercing point on a datum layer. |
| Labels and terminology | ✗ wrong | `rake: 50` data field is present but renderer ignores it entirely. The rake angle is the canonical textbook parameter for classifying oblique-slip faults; its presence in data but absence from rendering is a mismatch. Compound classification (e.g. "dextral-normal oblique") absent from label. `sense` field absent from data causes silent default. |
| Misconception risk | ✗ reinforces | No HW/FW labels. No rake annotation. No compound classification label. The sense of the strike-slip component is implicit (defaults to dextral via code fallback). |
| Default parameters | ⚠ partial | 65° dip plausible. `rake: 50` stored but unused — serves no function in rendering. |

#### Severity rating

**Rating:** `misleading`

The slip decomposition overlay is implemented. However, the `rake` field is stored but never rendered, the `sense` field is absent causing a silent code default, and neither the rake angle nor the compound classification is shown. Labels and terminology axis rates ✗.

#### Required v2 work

1. **Implement rake angle overlay in the fault plane (spec-v2 §5.3 — required).** Draw an arc within the fault plane from the strike direction to the slip vector, labelled with the rake angle in degrees.
2. **Add `sense` field to oblique-slip data entry (spec-v2 §5.3 — required).** Add `sense: 'dextral'` to `geo-data.jsx` to make the intent explicit.
3. **Add compound classification label (spec-v2 §5.3 — required).** Show the full classification (e.g. "Dextral-normal oblique") in the floating label.
4. **Add HW/FW labels (spec-v2 §5.2 — required).**
5. **Add stress-state badge (spec-v2 §5.2 — required).**
6. **Add stratigraphic age badges (spec-v2 §5.1 — required).**

---

### Faults: Listric Fault

**v1 reference ID:** `listric-fault`
**Source files involved:** `three-helpers.jsx` — `buildFaultScene()` (`subtype === 'listric'` path), `solveCircularArc()`, `addListricDipAnnotations()`, `geo-data.jsx` — `REFERENCE_FORMATIONS['listric-fault']`

#### Source-code reading summary

- Key parameters: `dip: 70` (surface), `dip_at_depth: 10`, `detachment_depth: 3.0`, `throw: 1.0`. Camera: `{ phi: 1.05, theta: 0.0, dist: 10 }`.
- **Critical issue:** Block clipping uses a flat plane at surface dip (70°), not the full curved surface. The curved fault surface is rendered as a visual overlay only. This creates a visible geometric mismatch between the cut block geometry and the curved fault surface — the defining characteristic of a listric fault (curved surface) is contradicted by the flat block boundary.
- Detachment surface not rendered as a distinct labelled horizontal plane; only the arc terminus is shown.

**What is NOT rendered:**
- No HW / FW labels.
- No distinct detachment surface plane (decollement) at the arc terminus.
- No sense-of-motion arrows.
- No stress-state badge ("EXTENSION").
- No stratigraphic age badges.
- Block mechanics (flat-plane clip) do not match the rendered curved surface — geometric mismatch visible when overlays are turned off.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ⚠ partial | The curved fault surface arc geometry is mathematically correct. However, the block clipping uses a flat plane at the surface dip angle (70°), not the curved surface. The HW block face is cut flat while the fault surface is curved — the two visual elements contradict each other. A student may conclude listric faults have flat planes. |
| Measurement overlays | ⚠ partial | Surface dip (70°) and dip-at-depth (10°) overlays are present and correctly anchored. Detachment depth annotation is present. However: no horizontal detachment plane is shown extending from the arc terminus. |
| Labels and terminology | ⚠ partial | "Listric 70° / 090°" label correct. Dip at surface and dip at depth labelled. "Detachment depth: N m" labelled. However: the detachment surface itself is not labelled as a "decollement" or "detachment surface" — only its depth is measured. |
| Misconception risk | ✗ reinforces | The flat-plane block clipping vs curved surface mismatch risks teaching students that listric faults have a flat block boundary at the surface dip. The detachment surface is not shown as a distinct horizontal plane with a label. No HW/FW labels. No extension badge. |
| Default parameters | ✓ | Surface dip 70° and detachment dip 10° are realistic. |

#### Severity rating

**Rating:** `misleading`

#### Required v2 work

1. **Implement curved block clipping (spec-v2 §5.3 — required, high priority).** Replace the flat-plane clip with a curved surface clip that matches the rendered arc profile.
2. **Add explicit detachment surface plane (spec-v2 §5.3 — required).** Translucent horizontal plane at detachment depth labelled "Detachment surface (decollement)."
3. **Add HW/FW labels (spec-v2 §5.2 — required).**
4. **Add sense-of-motion arrow on fault surface (spec-v2 §5.2 — required).**
5. **Add stress-state badge (spec-v2 §5.2 — required).** "EXTENSION" pill.
6. **Add stratigraphic age badges (spec-v2 §5.1 — required).**

---

## Folds and Layers

*Audited by Phase A.4 (folds-layers group)*
*Auditor branch: phase-a4-folds-layers*

---

### Folds: Anticline

**v1 reference ID:** `anticline`
**Source files involved:** `three-helpers.jsx` — `buildFoldScene()` (`subtype === 'anticline'`), `geo-data.jsx` — `REFERENCE_FORMATIONS['anticline']`

#### Source-code reading summary

- Key parameters: `axis_strike: 0`, `plunge: 12`, `plunge_direction: 0`, `interlimb_angle: 100`, `amplitude: 1.0`, `wavelength: 4.5`. Three equal-thickness layers (0.55 u each). Axial plane rendered as a translucent surface but **carries no text label**.
- BUG-03 confirmed at source-code level: `const sign = subtype === 'syncline' ? -1 : 1` (line 952). Single sign flip is the only code difference between anticline and syncline renderers.

**What is NOT rendered:**
- No stratigraphic age badges. `order` field exists in data (0 = oldest, 2 = youngest) but nothing in `buildFoldScene()` renders numbered badges or any age indicator.
- No axial plane text label (translucent surface is present but unlabelled).
- No younging direction arrow.
- No "oldest rock in core" callout.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Cosine-arch fold with `sign = +1` correctly produces an upward arch. Amplitude 1.0 u, plunge 12° north, interlimb 100° — all textbook-valid. |
| Measurement overlays | ⚠ partial | Hinge line (labelled), interlimb arc (labelled), plunge arc (labelled) all present and geometrically correct. The axial plane surface is present but **carries no text label**. |
| Labels and terminology | ⚠ partial | Floating label reads "Anticline · 12° → 000°" — correct. Axial plane surface exists but is unlabelled. No layer-age callout anywhere. |
| Misconception risk | ✗ reinforces | BUG-03: anticline and syncline rendered with identical layer colours and identical thickness ratios. At `plunge = 0` the two scenes are indistinguishable to a student who flips the camera. Even at 12° plunge, no age annotation distinguishes the two. The "oldest in core" rule (the textbook definition of anticline) is entirely absent. |
| Default parameters | ⚠ partial | Plunge 12° is non-zero but `todo.md` flags `plunge = 0` as the worst case. Age annotation should be present before zero-plunge is safe. |

#### Severity rating

**Rating:** `misleading`

#### Required v2 work

1. **Add stratigraphic age badges to layer faces (spec-v2 §5.1 — required).** Sandstone L1/order-0 = oldest = badge "1"; limestone L3/order-2 = youngest = badge "3".
2. **Add axial-plane text label (spec-v2 §5.4 — required, BUG-03 FIX).** "ANTICLINE — axial plane" along the top edge of the axial-plane quad.
3. **Add younging direction arrow (spec-v2 §5.1 — required).** "YOUNGING ↑" pointing outward from the core on both limbs.

---

### Folds: Syncline

**v1 reference ID:** `syncline`
**Source files involved:** `three-helpers.jsx` — `buildFoldScene()` (`subtype === 'syncline'`), `geo-data.jsx` — `REFERENCE_FORMATIONS['syncline']`

#### Source-code reading summary

- Key parameters: `plunge: 8`, `plunge_direction: 180`, `interlimb_angle: 110`, `amplitude: 1.0`. Identical layer stack to anticline (same lithology names, colours, thickness 0.55 u × 3). No age badges.
- The sole rendering difference from the anticline is `sign = -1`.

**What is NOT rendered:** Same omission list as anticline. No age badges, no axial-plane text label, no younging arrow.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Cosine-trough fold with `sign = -1`. Amplitude 1.0 u, plunge 8° south, interlimb 110° — all valid. |
| Measurement overlays | ⚠ partial | Same as anticline: hinge line (labelled), interlimb arc (labelled), plunge overlay (labelled) present and correct. Axial plane surface present but unlabelled. |
| Labels and terminology | ⚠ partial | Floating label "Syncline · 8° → 180°" correct. Axial plane unlabelled. No age annotation. |
| Misconception risk | ✗ reinforces | BUG-03 applies identically to syncline as to anticline. The only code difference from the anticline renderer is `sign = -1`. The "youngest in core" rule (the textbook definition of syncline) is entirely absent. |
| Default parameters | ⚠ partial | Plunge 8° (weaker than anticline's 12°) is marginally better than zero but a minimal mitigation. |

#### Severity rating

**Rating:** `misleading`

#### Required v2 work

1. **Add stratigraphic age badges to layer faces (spec-v2 §5.1 — required).** Sandstone L1/order-0 = oldest = "1" on outermost limb; limestone L3/order-2 = youngest = "3" at trough core.
2. **Add axial-plane text label (spec-v2 §5.4 — required, BUG-03 FIX).** "SYNCLINE — axial plane" along the top edge.
3. **Add younging direction arrow (spec-v2 §5.1 — required).** Arrow pointing inward toward the trough core on each limb.

---

### Folds: Monocline

**v1 reference ID:** `monocline`
**Source files involved:** `three-helpers.jsx` — `buildFoldScene()` (`subtype === 'monocline'`), `geo-data.jsx` — `REFERENCE_FORMATIONS['monocline']`

#### Source-code reading summary

- Key parameters: `flexure_dip: 35`, `flexure_width: 1.2`, `step_height: 0.9`. Three layers (0.5 u each). Plunge overlay explicitly disabled for monocline (correct). Axial plane explicitly disabled (correct). Underlying step indicator absent.

**What is NOT rendered:**
- No underlying step indicator (dashed line below the flexure showing the controlling fault or basement step).
- No stratigraphic age badges.
- No younging direction arrow.
- No label distinguishing upper flat panel from lower flat panel.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Smoothstep function correctly renders flat–flex–flat monocline pattern. Step height 0.9 u (60% of total) is clearly visible. Flexure dip 35° is realistic. |
| Measurement overlays | ✓ | Flexure dip overlay (strike, dip arc, dip-direction, compass rose) and flexure width double-arrow both present and correctly placed. |
| Labels and terminology | ⚠ partial | Floating label "Monocline · 0° → 000°" correct. Hinge line labelled. The underlying step indicator (the "stair" the monocline drapes over) is absent. |
| Misconception risk | ⚠ subtle | The underlying step indicator is absent. The step mnemonic (a carpet draped over a stair) is standard pedagogy (spec-v2 §5.4). Without it, a student may not understand *why* the monocline has this shape. A missed pedagogical opportunity rather than an active misconception. Age annotation absent but less critical than for anticline/syncline. |
| Default parameters | ✓ | Flexure dip 35° (stated), step height 0.9 u, flexure width 1.2 u are realistic. |

#### Severity rating

**Rating:** `minor-confusion`

The monocline geometry is correct and all core overlays are present and correctly labelled. The missing underlying step indicator is the main gap — a missed teaching opportunity rather than an active error. Worst axis is Misconception risk at ⚠.

#### Required v2 work

1. **Add underlying step indicator (spec-v2 §5.4 — required).** Faint dashed line below the flexure zone labelled "controlling step (basement fault)."
2. **Add stratigraphic age badges to layer faces (spec-v2 §5.1 — required).**

---

### Layers: Horizontal strata

**v1 reference ID:** `horizontal-strata`
**Source files involved:** `three-helpers.jsx` — `buildLayersOnly()` (no fold/fault event; `tilt.dip = 0`), `geo-data.jsx` — `REFERENCE_FORMATIONS['horizontal-strata']`

#### Source-code reading summary

- Four layers (sandstone/shale/limestone/mudstone, 1.2/0.9/1.5/0.6 u). `tilt.dip = 0`. `order` values 0–3 present in JSON but not rendered.

**What is NOT rendered:**
- No stratigraphic age badges.
- No younging direction arrow.
- No layer age annotation of any kind.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | A horizontal four-unit stack with varying thickness is the canonical example. No tilt applied. |
| Measurement overlays | ✓ | Thickness double-arrows drawn per layer, labelled correctly. Arrow placement geometrically correct. |
| Labels and terminology | ⚠ partial | Layer name labels present. No age annotation. The stratigraphic order is implied by vertical position but not made explicit. A student who does not already know "older is lower in an undisturbed sequence" will not learn this from the visualisation. |
| Misconception risk | ⚠ subtle | Standard misconception: oldest always at the bottom regardless of tectonic history (Steno's superposition). v1 renders correctly but does not label the age or explain superposition. The risk is subtle. |
| Default parameters | ✓ | Dip 0° correct. Four layers with varying thickness — realistic sedimentary stack. |

#### Severity rating

**Rating:** `minor-confusion`

Geometry and thickness overlays correct. Missing age annotation rates `minor-confusion` for single undisturbed sequences where "oldest at bottom" is at least geometrically implicit.

#### Required v2 work

1. **Add stratigraphic age badges to layer faces (spec-v2 §5.1 — required).** Mudstone L4/order-3 = youngest = "4" at top; sandstone L1/order-0 = oldest = "1" at base.
2. **Add younging direction arrow (spec-v2 §5.1 — required).** "YOUNGING ↑" arrow on the right side pointing upward.

---

### Layers: Dipping strata

**v1 reference ID:** `dipping-strata`
**Source files involved:** `three-helpers.jsx` — `buildLayersOnly()` with `tilt.dip = 30`, `geo-data.jsx` — `REFERENCE_FORMATIONS['dipping-strata']`

#### Source-code reading summary

- Three layers (sandstone/shale/limestone, 1.0/0.8/1.0 u). `tilt: { strike: 0, dip: 30, dip_direction: 90 }`. All field_origin values are `stated`. All three measurement overlays (strike/dip/dip-direction) present.

**What is NOT rendered:**
- No age badges (universal gap).
- No younging arrow.
- No strike-and-dip T-symbol (the overlays show the measurement values but not the standard map symbol — minor distinction).

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Three-layer stack tilted 30°/090°. Canonical dipping-strata geometry. |
| Measurement overlays | ✓ | Strike (000°), dip (30°), and dip-direction (090°) all rendered with correct arc geometry. Thickness perpendicular-to-bedding arrows correctly drawn in the tilted frame. |
| Labels and terminology | ✓ | Strike, dip, and dip-direction labels use accepted terminology. Layer name labels present. |
| Misconception risk | ⚠ subtle | Same universal gap as horizontal-strata: no age annotation. Also absent: apparent vs. true thickness distinction — students who examine from different angles may confuse apparent width with true thickness. Minor teaching gap. |
| Default parameters | ✓ | Dip 30° east is a commonly used textbook example. |

#### Severity rating

**Rating:** `minor-confusion`

Geometry and all three measurement overlays are correct. The only gaps are the universal missing age annotation and the absence of an apparent-vs-true thickness callout.

#### Required v2 work

1. **Add stratigraphic age badges to layer faces (spec-v2 §5.1 — required).**
2. **Add younging direction arrow (spec-v2 §5.1 — required).**

---

### Layers: Multi-layer sequence with thickness vectors

**v1 reference ID:** `multilayer-thickness`
**Source files involved:** `three-helpers.jsx` — `buildLayersOnly()` with `tilt.dip = 8`, `geo-data.jsx` — `REFERENCE_FORMATIONS['multilayer-thickness']`

#### Source-code reading summary

- Five layers (mudstone/sandstone/limestone/chalk/shale, 0.7/1.1/0.8/0.5/1.0 u). `tilt: { dip: 8 }`. L4 (Chalk) has `field_origin: { thickness: 'inferred' }` — renders in amber/dashed inferred style. The caption explicitly states this formation's purpose is to teach "perpendicular thickness vector annotated on every layer."

**What is NOT rendered:**
- No age badges. For a five-layer sequence the age order is particularly important — a student has no way to determine the stratigraphic order from the visualisation alone.
- No younging arrow.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Five-layer stack with mild 8° dip. Varying lithology colours and thickness values clearly distinguishable. |
| Measurement overlays | ✓ | Five perpendicular thickness arrows correctly placed in the tilted frame. L4 (Chalk) correctly renders in the inferred style. |
| Labels and terminology | ⚠ partial | Layer name labels present. No age annotation. For a five-layer sequence, age order is pedagogically critical — the purpose of showing five layers is to teach stratigraphic reading, which requires age. Without badges the sequence is a colour chart, not a stratigraphy lesson. |
| Misconception risk | ✗ reinforces | The multi-layer sequence is the formation most at risk from absent age annotation. The lithology sequence (mudstone/sandstone/limestone/chalk/shale) has no natural age mnemonic — if a student asks "which is oldest?" the correct answer (mudstone, order=0) is invisible in the rendered scene. The scene's purpose is to teach stratigraphic reading but it withholds the key information needed to read stratigraphy. |
| Default parameters | ✓ | Dip 8°. Five distinct lithologies with varying thickness (0.5–1.1 u) give a realistic sedimentary package. Chalk (L4) as the inferred-thickness unit is a correct teaching example. |

#### Severity rating

**Rating:** `misleading`

The geometry and thickness overlays are correct. The severity is driven by the misconception risk axis (✗): the formation's explicit pedagogical purpose is to teach multi-layer stratigraphic reading, but it omits the stratigraphic age information that makes such reading possible.

#### Required v2 work

1. **Add stratigraphic age badges to all five layer faces (spec-v2 §5.1 — required, highest priority for this formation).** Mudstone "1", sandstone "2", limestone "3", chalk "4", shale "5" on all visible side faces.
2. **Add younging direction arrow (spec-v2 §5.1 — required).**

---

## Intrusions and Unconformities

*Audited by Phase A.4 (intrusions-unconformities group)*
*Auditor branch: phase-a4-intrusions-unconformities*

---

### Intrusions: Dyke

**v1 reference ID:** `dyke-basalt`
**Source files involved:** `src/three-helpers.jsx` — `buildIntrusionGeometry()` (subtype `dyke` path), `src/geo-data.jsx` — `REFERENCE_FORMATIONS['dyke-basalt']`

#### Source-code reading summary

- Key parameters: `strike: 0`, `dip: 90`, `thickness: 0.4`, `rock_type: 'basalt'`. Layers are flat.
- Dyke geometry: `BoxGeometry` rotated to align with stated strike — correctly discordant.

**What is NOT rendered:**
- No cross-cutting age tag ("post-L3" or similar) indicating which layers the dyke post-dates (spec-v2 §5.7).
- No orientation-to-bedding label ("discordant — cuts across layering").
- No chilled-margin texture.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Vertical box geometry cutting across three horizontal layers — correctly discordant. Strike rotation applied correctly. |
| Measurement overlays | ✓ | Strike line, dip arc to vertical, and thickness double-arrow all correctly anchored and labelled. |
| Labels and terminology | ⚠ partial | "Dyke (basalt)" label uses correct terminology. No label stating the orientation relationship to host bedding ("discordant — cuts across layering"). No cross-cutting age tag. |
| Misconception risk | ⚠ subtle | Without any label stating the dyke is younger than the layers it cuts, a student has no cue for the cross-cutting relationship. Risk is real but moderate — unlikely to infer the wrong age relationship from geometry alone. |
| Default parameters | ✓ | `rock_type: 'basalt'` correct. `dip: 90` standard. `thickness: 0.4 u` visible. |

#### Severity rating

**Rating:** `misleading`

The geometry and overlays are correct. However, the absence of any cross-cutting age label means the tool does not teach the principle of cross-cutting relationships — one of the primary pedagogical reasons for showing a dyke.

#### Required v2 work

1. **Add cross-cutting age tag (spec-v2 §5.7 — required).** "post-L2, post-L3" on the dyke body with tooltip. Applies to all discordant intrusions.
2. **Add orientation-relationship label (spec-v2 §5.7 — required).** "discordant — cuts across bedding." Pairs with sill's "concordant — parallel to bedding."

---

### Intrusions: Sill

**v1 reference ID:** `sill-basalt`
**Source files involved:** `src/three-helpers.jsx` — `buildIntrusionGeometry()` (subtype `sill` path), `src/geo-data.jsx` — `REFERENCE_FORMATIONS['sill-basalt']`

#### Source-code reading summary

- Key parameters: `strike: 0` (inferred), `dip: 0` (inferred), `thickness: 0.3`, `rock_type: 'basalt'`. Layers are flat (no `model.tilt`).
- **Critical architecture issue:** Sill mesh is added directly to `root` as a sibling to the layer stack — no tilt is applied to it. For the reference formation (flat layers), the sill renders correctly. For any tilted-host scenario, the sill remains horizontal while the layers tilt — geometrically equivalent to a dyke (cutting across tilted beds). The sill fails its primary defining characteristic (concordance with bedding) in any tilted scenario.

**What is NOT rendered:**
- No orientation-to-bedding label ("concordant — parallel to bedding").
- No cross-cutting age tag.
- No distinction from a dyke via labelling.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ⚠ partial | For the reference formation (flat layers), the sill renders correctly: horizontal sheet parallel to horizontal beds. But the architecture does not tilt the sill with host layers — in any tilted-host scenario the sill remains horizontal (discordant). |
| Measurement overlays | ⚠ partial | Thickness double-arrow and feature label present. Thickness arrow anchored off-centre. No dip or strike overlay. |
| Labels and terminology | ⚠ partial | "Sill (basalt)" correct. No concordance label. No cross-cutting age tag. Without the concordance label, a student cannot distinguish the sill from a flat dyke by labels alone. |
| Misconception risk | ✗ reinforces | Two risks: (1) In reference formation the sill appears to be "always horizontal" — the mnemonic "sill = flat, dyke = vertical" is a common documented misconception. (2) The architectural failure means any user-generated model with tilted host produces a sill that looks like a dyke. |
| Default parameters | ✓ | `rock_type: 'basalt'` correct. `thickness: 0.3 u` appropriate. |

#### Severity rating

**Rating:** `misleading`

Two issues combine: (1) architecture-level failure means any tilted-host model renders the sill as geometrically discordant; (2) the label "concordant — parallel to bedding" is absent.

#### Required v2 work

1. **Fix sill tilt to track host-layer attitude (spec-v2 §5.7 — required).** Read `model.tilt` in `buildIntrusionGeometry()` and apply the same rotation to the sill mesh.
2. **Add concordance label (spec-v2 §5.7 — required).** "concordant — parallel to bedding."
3. **Add cross-cutting age tag (spec-v2 §5.7 — required).**

---

### Intrusions: Batholith

**v1 reference ID:** `batholith-granite`
**Source files involved:** `src/three-helpers.jsx` — `buildIntrusionGeometry()` (subtype `batholith` path), `src/geo-data.jsx` — `REFERENCE_FORMATIONS['batholith-granite']`

#### Source-code reading summary

- Key parameters: `rock_type: 'granite'`, `depth: 3.0`. Three sedimentary layers (shale/sandstone/limestone) overlie the intrusion.
- Lower hemisphere (`SphereGeometry`) placed beneath the sedimentary layers. The batholith is shown buried beneath sedimentary cover — conflicting with the textbook definition (exposed at the surface after erosion).
- Depth label reads from JSON `depth` field without verifying against actual geometry. For the reference formation, `depth: 3.0` in the label but actual dome-top-to-surface distance ≈ 0.6 u — label is significantly wrong.

**What is NOT rendered:**
- No contact aureole or metamorphic halo.
- No irregular contact surface.
- No cross-cutting age tag.
- No label indicating the batholith is discordant.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ⚠ partial | Hemispheric shape is schematically reasonable. Placement below sedimentary layers is misleading: the canonical textbook batholith is exposed at the surface after erosion. |
| Measurement overlays | ⚠ partial | Depth label present. However, `depth: 3.0` in label but actual dome-top-to-surface distance is ~0.6 u — the label is significantly wrong for the reference formation. |
| Labels and terminology | ⚠ partial | "Batholith (granite)" correct. No discordant label. No contact aureole indicator. No "exposed at surface" note. |
| Misconception risk | ⚠ subtle | The buried-beneath-sediments presentation may teach that a batholith is a subsurface intrusion like a stock, rather than a large surface-exposed pluton. |
| Default parameters | ✓ | `rock_type: 'granite'` correct. Three sedimentary host layers geologically coherent. |

#### Severity rating

**Rating:** `minor-confusion`

Not actively wrong in shape. Main issue (batholith shown buried rather than exposed) is a schematic simplification that could cause minor confusion about what defines a batholith.

#### Required v2 work

1. **Clarify exposure state (spec-v2 §5.7 — optional, may defer to v3).** Show the batholith with overlying sediments removed, or add annotation note about erosion.
2. **Add cross-cutting age tag (spec-v2 §5.7 — required).**
3. **Fix depth-label geometry mismatch.** Depth overlay label should derive its value from the actual rendered position.

---

### Intrusions: Laccolith

**v1 reference ID:** `laccolith-granite`
**Source files involved:** `src/three-helpers.jsx` — `buildIntrusionGeometry()` (subtype `laccolith` path), `src/geo-data.jsx` — `REFERENCE_FORMATIONS['laccolith-granite']`

#### Source-code reading summary

- Key parameters: `rock_type: 'granite'`, `depth: 1.5`. Three equal-thickness layers.
- **Depth clamping:** `effectiveDepth = Math.min(rawDepth, laccRadius - minProtrusion)`. Stated depth 1.5 u clamped to 0.96 u. The label reads the stated depth (`1.5 u`) but the actual dome is at the clamped position — label is incorrect relative to the rendered geometry.
- **Layer doming absent:** The laccolith dome protrudes above the layer stack top but the layers themselves remain flat rectangular slabs. A real laccolith domes the overlying layers upward.

**What is NOT rendered:**
- No domed/arched host layers (the defining feature of a laccolith).
- No cross-cutting age tag.
- No concordance label.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ⚠ partial | Dome shape (upper hemisphere) is correct for a laccolith. However: (a) overlying layers are not domed — they remain flat, failing the primary diagnostic feature ("expanded upward by deforming the overlying rock"); (b) depth clamp means the stated depth is not honoured geometrically, so the labelled depth is incorrect. |
| Measurement overlays | ⚠ partial | Depth label present but the label value (1.5 u) does not match the actual rendered depth (0.96 u effective). The label is geometrically incorrect. |
| Labels and terminology | ⚠ partial | "Laccolith (granite)" correct. No concordance label. No cross-cutting age tag. Key defining process (upward deformation of overburden) not communicated. |
| Misconception risk | ⚠ subtle | Without domed host layers, the laccolith looks like a stock or a partially eroded batholith. The depth-label mismatch is a direct factual error. |
| Default parameters | ✓ | `rock_type: 'granite'` reasonable. `depth: 1.5 u` within shallow-intrusion range. |

#### Severity rating

**Rating:** `misleading`

Three compounding issues: (1) overlying layers not domed (the defining geometric feature of a laccolith); (2) depth clamp means label value does not match rendered geometry; (3) spec-v2 §5.7 explicitly calls out the depth clamping as something v2 must fix.

#### Required v2 work

1. **Dome the overlying host layers (spec-v2 §5.7 — required).** Layer slabs above the laccolith should arch over the dome.
2. **Remove the depth clamp (spec-v2 §5.7 — required).** Remove `Math.min(rawDepth, laccRadius - minProtrusion)`. Add "show subsurface" toggle per spec-v2 §5.7.
3. **Fix depth-label geometry consistency.** Depth overlay label should derive from actual rendered position.
4. **Add cross-cutting age tag (spec-v2 §5.7 — required).**

---

### Unconformities: Angular Unconformity

**v1 reference ID:** `angular-unconformity`
**Source files involved:** `src/three-helpers.jsx` — `buildUnconformityGeometry()` (subtype `angular` path), `src/geo-data.jsx` — `REFERENCE_FORMATIONS['angular-unconformity']`

#### Source-code reading summary

- Key parameters: 4 layers; `angular_discordance: 35`, `time_gap_ma: 25`. No `model.tilt` field.
- **Critical bug — no lower-bed tilt:** ALL four beds render as horizontal. The only geometric indication of the angular relationship is the discordance arc (which angles downward from the contact) and a second faint parallel line. The defining geometric characteristic of an angular unconformity (tilted lower strata beneath flat upper strata) is entirely absent from the 3D geometry.
- The discordance arc is geometrically inconsistent with the model it is drawn on — it labels an angle that does not exist in the rendered scene.

**What is NOT rendered:**
- No tilted lower beds (the defining feature).
- No THREE.Plane clip of the lower tilted block at the erosion surface.
- No time gap label in geological terms (only "~25 Ma gap" text overlay).

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✗ wrong | The lower beds are not tilted. All four beds render as horizontal. The defining geometric characteristic of an angular unconformity — tilted lower strata — is entirely absent. |
| Measurement overlays | ✗ wrong | The discordance arc claims to show the angle between upper and lower beds, but since the lower beds are flat (not tilted), the arc is pointing at an angle that does not exist in the rendered scene. |
| Labels and terminology | ⚠ partial | "Angular Unconformity" label and "~25 Ma gap" are correct. No label distinguishing old from young beds by age. |
| Misconception risk | ✗ reinforces | A student viewing this formation would see four horizontal beds with a wavy line — indistinguishable from a disconformity — plus a discordance arc that points at a tilt that doesn't exist. Reinforces the misconception that an angular unconformity is just a disconformity with a different label. |
| Default parameters | ⚠ partial | `angular_discordance: 35°` and `time_gap_ma: 25` feed only labels; they do not drive geometry. |

#### Severity rating

**Rating:** `incorrect`

The angular unconformity is the most geometrically incorrect formation in the intrusions and unconformities group. The defining feature — tilted lower strata — is absent. The discordance arc compounds the error by labelling an angle that does not appear in the rendered geometry.

**Note on the clip-through bug:** The task brief and spec-v2 §5.6 reference a clip-through artefact where the lower tilted block protrudes into the upper block. In v1, this bug does not manifest because the lower beds are never tilted at all — the clip-through requires a tilted geometry that v1 does not implement. The clip-through fix (THREE.Plane clipping) cannot be applied until the lower-bed tilt is first implemented.

#### Required v2 work

1. **Implement lower-bed tilt (spec-v2 §5.6 — required, high priority).** Layers below `below_layer_id` must be rendered as a tilted block (tilted by `angular_discordance` degrees), while layers above `above_layer_id` remain horizontal.
2. **Implement THREE.Plane clipping at the erosion surface (spec-v2 §5.6 — required, applies after item 1).** Clip the tilted lower block at the erosion-surface plane to produce bevelled flat-at-unconformity geometry.
3. **Fix discordance arc placement.** Once lower beds are tilted, anchor the arc to the actual rendered geometry.
4. **Add geological-age strip (spec-v2 §5.6 — required).**

---

### Unconformities: Disconformity

**v1 reference ID:** `disconformity`
**Source files involved:** `src/three-helpers.jsx` — `buildUnconformityGeometry()` (base path), `src/geo-data.jsx` — `REFERENCE_FORMATIONS['disconformity']`

#### Source-code reading summary

- Key parameters: 4 layers; `time_gap_ma: 15`. All four layers render as horizontal flat slabs — correct for a disconformity. Wavy erosion surface at the contact (amplitude 0.08 u — subtle).

**What is NOT rendered:**
- No channel features or palaeosol in the erosion surface.
- No 3D irregular surface — erosion surface is only a 2D profile line.
- No time gap on a geological timescale strip.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Parallel beds above and below the contact — correct. Horizontal contact correct. Wavy line indicating irregular erosion surface correct in principle. |
| Measurement overlays | ⚠ partial | Time gap "~15 Ma gap" correct. The wavy erosion surface is only a 2D profile line (constant Z), not a 3D surface. |
| Labels and terminology | ✓ | "Disconformity" and "~15 Ma gap" correct terms. No significant labelling gaps. |
| Misconception risk | ⚠ subtle | Subtle waviness (amplitude 0.08 u ≈ 2% of block width) may not be visually prominent enough. At default camera angle, a student might confuse it with a conformable contact. |
| Default parameters | ✓ | `time_gap_ma: 15` reasonable. Four appropriate sedimentary layers. |

#### Severity rating

**Rating:** `minor-confusion`

The disconformity renders correctly in all essential geometric respects. The issues are of degree and completeness: waviness is subtle, the surface is 2D not 3D, and channels/palaeosols are absent. Not `incorrect` and unlikely to generate a lasting misconception.

#### Required v2 work

1. **Increase erosion surface amplitude or 3D character (spec-v2 §5.6 — optional).** Increase to ~0.15–0.2 u or add depth variation.
2. **Add geological-age strip (spec-v2 §5.6 — required, shared with other unconformities).**

---

### Unconformities: Nonconformity

**v1 reference ID:** `nonconformity`
**Source files involved:** `src/three-helpers.jsx` — `buildUnconformityGeometry()` (base path), `src/geo-data.jsx` — `REFERENCE_FORMATIONS['nonconformity']`

#### Source-code reading summary

- Key parameters: 3 layers — `L1: granite (basement, thickness 1.5, order 0)`, `L2: sandstone (thickness 1.0, order 1)`, `L3: shale (thickness 1.0, order 2)`. `time_gap_ma: 200`.
- The basement is rendered with the granite colour (`#D8C0B0`). The distinction between granite basement and sedimentary layers is colour-only — no distinctive texture.
- The spec-v2 §5.6 full label "nonconformity (sedimentary on crystalline basement)" is absent; v1 only shows "Nonconformity."

**What is NOT rendered:**
- No crystalline texture on the basement.
- No contact metamorphism or baking effect.
- No explicit label identifying the basement as crystalline/igneous.
- No geological-age strip.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Crystalline basement (granite, thick 1.5 u) below sedimentary sequence with wavy contact at the top of the basement. Correct geometry for a nonconformity. |
| Measurement overlays | ⚠ partial | "~200 Ma gap" correct and well-chosen. Type label "Nonconformity" present. No geological-age strip. |
| Labels and terminology | ⚠ partial | "Nonconformity" is correct but incomplete; missing "(sedimentary on crystalline basement)." The basement layer name "Granite Basement" provides a backup cue. |
| Misconception risk | ⚠ subtle | Granite basement (`#D8C0B0`) and sandstone (`#E8D8A8`) are close in colour — crystalline/sedimentary distinction visually weak without a texture or explicit label. |
| Default parameters | ✓ | `lithology: 'granite'` correct. `time_gap_ma: 200` appropriate for a nonconformity. |

#### Severity rating

**Rating:** `minor-confusion`

Correct geometry, correct rock types, correct labelling at the formation level. Issues are: (1) no crystalline texture, (2) incomplete label, (3) modest colour contrast. A careful student with layer names visible can identify the nonconformity correctly.

#### Required v2 work

1. **Add crystalline texture to basement (spec-v2 §5.6 — required).** Render granite/gneiss/schist basement with a distinctive visual texture.
2. **Expand contact label (spec-v2 §5.6 — required).** Change "Nonconformity" to "Nonconformity (sedimentary on crystalline basement)."
3. **Add geological-age strip (spec-v2 §5.6 — required, shared with other unconformities).**

---

## Mineralisation

*Audited by Phase A.4 (mineralisation group)*
*Auditor branch: phase-a4-mineralisation*

---

### Mineralisation: Porphyry Cu-Au

**v1 reference ID:** `porphyry-cu-au`
**Source files involved:** `three-helpers.jsx` — `buildMineralisationGeometry()` (`case 'porphyry'`), `geo-data.jsx` — `REFERENCE_FORMATIONS['porphyry-cu-au']`

#### Source-code reading summary

- Three sedimentary layers: mudstone (L1, order 0), sandstone (L2, order 1), limestone (L3, order 2). No intrusive event — the causative porphyry stock has no 3D geometry in the scene.
- Four concentric alteration shells in correct canonical order: potassic (f=0.25, innermost) → phyllic (f=0.45) → argillic (f=0.70) → propylitic (f=1.00, outermost). Shells offset to `x=1.5` (edge of layer block) — ambiguous spatial relationship to host rock.

**What is NOT rendered:**
- No causative porphyry stock / intrusion body. The granite is described in `five_elements` text but has no 3D geometry.
- No stockwork vein texture inside the ore core.
- No depth-to-ore annotation.
- No indication that shells represent hydrothermal alteration overprinting the host stratigraphy.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ⚠ partial | Four concentric shells render in the correct canonical order: potassic innermost, propylitic outermost — consistent with Wikipedia/Cox 1986 and USGS OF 2008-1321. Shell proportions are a reasonable approximation. However, the causative porphyry stock is entirely absent; the shells float alongside a sedimentary layer stack with no intrusive body, making the genetic relationship (shells form around the stock) invisible. The `x=1.5` offset positions shells at the edge of the layer block. |
| Measurement overlays | ⚠ partial | Zone boundary overlays and labels correctly identify each zone. Grade (0.5%) labelled. Alteration radius not explicitly labelled. |
| Labels and terminology | ✓ matches | Zone names "Potassic (ore)", "Phyllic", "Argillic", "Propylitic" are accepted USGS/textbook terms. Grade unit "%" correct. |
| Misconception risk | ✗ reinforces | Without a visible intrusive stock, a student cannot learn that porphyry alteration is centred on and genetically linked to the causative intrusion. A student will see concentric shells alongside a sedimentary sequence and may not understand why or where the alteration is centred. |
| Default parameters | ✓ | Grade 0.5% Cu within typical ranges (0.3%–0.8%). |

#### Severity rating

**Rating:** `misleading`

Zoning order is correct and labels are textbook-standard. However, the complete absence of the causative porphyry stock means the scene cannot teach the central principle of a porphyry system.

#### Required v2 work

1. **Add causative porphyry stock geometry (spec-v2 §5.8 — required).** Vertical elongated ellipsoid at the centre of the alteration shells, styled with granite lithology colour, labelled "Porphyry stock."
2. **Centre shells within host stratigraphy (spec-v2 §5.8 — required).** Move shell centre from `x=1.5` (edge offset) to `x=0`.
3. **Add alteration-radius label (spec-v2 §5.8 — optional improvement).**

---

### Mineralisation: Orogenic Gold

**v1 reference ID:** `orogenic-gold`
**Source files involved:** `three-helpers.jsx` — `buildMineralisationGeometry()` (`case 'orogenic_gold'`), `geo-data.jsx` — `REFERENCE_FORMATIONS['orogenic-gold']`

#### Source-code reading summary

- Three metamorphic layers: schist (L1), quartzite (L2), gneiss (L3). Appropriate for an orogenic gold setting.
- One fault event: E1, `subtype: 'normal'`, `dip: 70°` east. **Critical mismatch:** The structural control is modelled as `subtype: 'normal'` — orogenic gold shear zones are typically strike-slip or oblique reverse, not normal (USGS OF 2003-077). Three thin vein planes at the structural control strike/dip — this is directionally correct.
- Feature label uses underscore notation (`Orogenic_gold`) rather than "Orogenic gold."

**What is NOT rendered:**
- No carbonate alteration halo (canonical diagnostic alteration for orogenic gold — USGS OF 2003-077 states "intense carbonate alteration is always present").
- No sense-of-shear indicators on the controlling structure (E1 rendered as a generic normal fault, not a shear zone).

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ⚠ partial | Vein planes rendered with correct steep dip (~70°) and orientation from structural control. Broadly correct for steeply-dipping shear-zone vein array. However, the structural control event is `subtype: 'normal'` — incorrect for orogenic gold. |
| Measurement overlays | ⚠ partial | Ore envelope label present. Grade labelled correctly in g/t. Rectangular envelope shape is misleading. |
| Labels and terminology | ⚠ partial | "Ore envelope" and grade labelled. Feature label uses underscore (`Orogenic_gold`). No carbonate alteration label. The controlling structure not identified as a shear zone; no kinematic indicators. |
| Misconception risk | ⚠ subtle | Two issues: (1) structural control modelled as `subtype: 'normal'` — a student may learn orogenic gold forms along normal faults; (2) rectangular ore envelope does not convey the vein-corridor geometry characteristic of orogenic gold. |
| Default parameters | ✓ | Grade 8.0 g/t Au within published range. Host lithologies (schist, quartzite, gneiss) appropriate for a metamorphic terrane. |

#### Severity rating

**Rating:** `misleading`

The vein geometry is directionally correct but the misclassification of the host structure as a normal fault actively teaches an incorrect tectonic setting for orogenic gold.

#### Required v2 work

1. **Change structural control event subtype (spec-v2 §5.8 — required).** Replace `subtype: 'normal'` with `subtype: 'strike-slip'` or introduce a dedicated `subtype: 'shear_zone'` event type. Label the controlling structure "Shear zone." Add kinematic (sense-of-shear) arrows.
2. **Add carbonate alteration label (spec-v2 §5.8 — required).** Subtle alteration halo labelled "Carbonate alteration."
3. **Fix feature label formatting (minor).** Replace "Orogenic_gold" with "Orogenic gold."

---

### Mineralisation: VMS (Volcanogenic Massive Sulphide)

**v1 reference ID:** `vms-deposit`
**Source files involved:** `three-helpers.jsx` — `buildMineralisationGeometry()` (`case 'vms'`), `geo-data.jsx` — `REFERENCE_FORMATIONS['vms-deposit']`

#### Source-code reading summary

- Three volcanic layers: Basalt footwall (L1, order 0), Rhyolite (L2, order 1), Basalt hangingwall (L3, order 2). `description_source` reads "A VMS deposit forms at the seafloor between the basalt units."
- **Critical positional error:** Massive sulphide lens is positioned at `y = -halfH - R * 0.1` — **below the base** of the layer stack, not at the seafloor (top of the volcanic sequence). The intent expressed in `description_source` is "at the seafloor" but the geometry places it beneath the entire stack.

**What is NOT rendered:**
- No stringer/feeder zone below the lens.
- No exhalite apron.
- No seafloor surface representation.
- No chert/chemical sediment cap above the lens.
- No structural labels distinguishing footwall from hangingwall.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✗ wrong | The VMS lens is positioned below the base of the layer stack, but canonical VMS deposits form at the seafloor — the top of the volcanic footwall sequence. In v1, the rendered lens sits below all three layers rather than at the L2/L3 contact or the top of L3. The feeder/stringer zone, exhalite apron, and chert cap are all absent. |
| Measurement overlays | ⚠ partial | "VMS lens" and "Chlorite halo" boundaries labelled. Grade (8.0%) labelled. No seafloor contact marker. |
| Labels and terminology | ⚠ partial | "VMS lens" and "Chlorite halo" labels present and use accepted terminology. No "Stringer zone," "Exhalite," or "Footwall/Hangingwall" labels. |
| Misconception risk | ✗ reinforces | The lens position below the layer stack is directly contrary to the defining VMS model: deposits form *at* the seafloor interface, not below the entire volcanic sequence. A student will believe VMS deposits are sub-basement rather than seafloor-hosted — a fundamental error. |
| Default parameters | ✓ | Grade 8.0% Zn-Pb-Cu consistent with published high-grade VMS ranges. Host volcanics (basalt/rhyolite/basalt) appropriate for a bimodal mafic-felsic VMS setting. |

#### Severity rating

**Rating:** `incorrect`

The geometry axis rates ✗ and the misconception risk axis rates ✗. The lens is rendered below the base of the volcanic sequence rather than at the seafloor. This is directly contrary to the defining characteristic of VMS deposits per every primary source consulted.

#### Required v2 work

1. **Reposition VMS lens to the seafloor contact (spec-v2 §5.8 — required, high priority).** Move the lens from `y = -halfH - R*0.1` to at or near the top of the footwall sequence (L2/L3 contact or L3 surface). Anchor to a seafloor surface plane.
2. **Add stringer/feeder zone below the lens (spec-v2 §5.8 — required).** Sub-vertical stockwork zone extending downward from the base of the lens into the footwall volcanics, labelled "Stringer (feeder) zone."
3. **Add exhalite apron (spec-v2 §5.8 — required).** Thin horizontal disc at the lens level extending laterally, labelled "Exhalite apron."
4. **Add seafloor surface marker (spec-v2 §5.8 — optional but strongly recommended).** Semi-transparent plane at top of footwall sequence labelled "Paleo-seafloor."

---

### Mineralisation: Skarn (Contact Metasomatic)

**v1 reference ID:** `skarn-deposit`
**Source files involved:** `three-helpers.jsx` — `buildMineralisationGeometry()` (`case 'skarn'`), `geo-data.jsx` — `REFERENCE_FORMATIONS['skarn-deposit']`

#### Source-code reading summary

- Three layers: limestone (L1, order 0), granite (L2, order 1), mudstone (L3, order 2). **Critical issue:** The "granite" is modelled as a *layer* with `lithology: 'granite'`, not as an intrusion event. No `intrusions` array is present.
- Single flattened sphere near the edge of the layer block. No endoskarn/exoskarn distinction. No mineralogical zonation. No geometric contact that would drive metasomatism.

**What is NOT rendered:**
- No distinction between endoskarn (within the granite body) and exoskarn (within the limestone host).
- No spatial relationship to the intrusion–carbonate contact.
- No mineralogical zonation (garnet → pyroxene; EarthSci.org).
- No intrusive body geometry; the granite layer is indistinguishable from sedimentary strata in the 3D scene.
- `grade: null` — no grade label shown.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✗ wrong | A skarn is defined by its position at the contact between an intrusive body and carbonate wallrocks. In v1, the granite is a flat horizontal layer rather than an intrusive body; there is no geometric contact that would drive metasomatism. The single flattened sphere does not convey the contact-zone geometry or the endo/exo distinction. |
| Measurement overlays | ⚠ partial | "Skarn contact zone" disc and label present. No endo/exo boundary annotation. Alteration radius implicit but not explicitly labelled. |
| Labels and terminology | ⚠ partial | "Skarn contact zone" is correct terminology. No "Endoskarn" or "Exoskarn" labels required per spec-v2 §5.8. No mineralogical labels. |
| Misconception risk | ✗ reinforces | Two documented misconception risks: (1) Without endoskarn/exoskarn distinction, students cannot understand bidirectional metasomatic process. (2) Rendering the granite as a horizontal layer misrepresents the fundamental setting — skarns require a discordant pluton, not a conformable sill. A student will not understand that the granite drives the reaction or that it intrudes the limestone. |
| Default parameters | ⚠ partial | `metals: 'Fe-Cu'` geologically correct. `grade: null` means no grade shown. Host lithologies (limestone/granite/mudstone) appropriate. |

#### Severity rating

**Rating:** `incorrect`

The geometry axis rates ✗: the fundamental setting (intrusion intruding carbonate) is not geometrically expressed. The granite is a horizontal layer, not a pluton with a contact. The endo/exo distinction required by spec-v2 §5.8 is entirely absent. A student would learn that skarns are associated with a granite layer, not a granite intrusion — directly contradicting the definition of contact metasomatism.

#### Required v2 work

1. **Replace granite layer with intrusion body (spec-v2 §5.8 — required, high priority).** Remove the granite `layer` entry and replace with an `intrusions` array entry (stock or batholith subtype) positioned so its contact intersects the limestone layer.
2. **Add endoskarn/exoskarn zones (spec-v2 §5.8 — required).** Render two distinct zones labelled "Endoskarn (in granite)" and "Exoskarn (in limestone)" on either side of the intrusion–carbonate contact.
3. **Add mineralogical zonation overlay (spec-v2 §5.8 — optional improvement).** Zone labels from the contact outward: "Garnet zone (proximal)" and "Pyroxene zone (distal)" per EarthSci.org.

---

### Mineralisation: Epithermal Au-Ag

**v1 reference ID:** `epithermal-au-ag`
**Source files involved:** `three-helpers.jsx` — `buildMineralisationGeometry()` (`case 'epithermal'`), `geo-data.jsx` — `REFERENCE_FORMATIONS['epithermal-au-ag']`

#### Source-code reading summary

- Three volcanic layers: Andesite L1 (order 0, `lithology: 'basalt'`), Rhyolite L2 (order 1), Andesite L3 (order 2, `lithology: 'basalt'`). Note: L1 and L3 are named "Andesite" but use `lithology: 'basalt'` — a terminology inconsistency.
- Three shallow sub-vertical veins in the upper part of the section. Boiling zone disc at `y = halfH * 0.3` labelled "Paleo-boiling zone" (correctly rendered with `inferred: true` amber dashes). Gap between the veins and the boiling disc — spatial relationship not geometrically clear.

**What is NOT rendered:**
- No LS vs HS distinction — generic model only.
- No clay alteration cap above the boiling zone (HS systems have advanced argillic lithocap).
- No depth-to-paleo-surface annotation.
- L1/L3 named "Andesite" but rendered with basalt lithology colour — minor data inconsistency.

#### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ⚠ partial | Three shallow sub-vertical veins in the upper part of the section broadly matches the canonical shallow epithermal setting. However, veins are positioned in the upper half (`y = halfH * 0.8`) and do not extend toward the boiling zone disc (`y = halfH * 0.3`) — gap between veins and boiling disc means "veins terminate at the boiling zone" is not geometrically clear. |
| Measurement overlays | ⚠ partial | "Paleo-boiling zone" disc correctly positioned and labelled with `inferred: true`. Grade labelled correctly in g/t. No depth annotation. |
| Labels and terminology | ⚠ partial | "Paleo-boiling zone" broadly correct. No LS/HS specification. L1/L3 mislabelled as basalt. |
| Misconception risk | ⚠ subtle | Generic model does not distinguish LS from HS epithermal styles. A student will learn a single "epithermal" model when the two subtypes have distinctly different alteration, vein mineralogy, and structural settings. The mislabelling of andesite layers as basalt could cause confusion. |
| Default parameters | ✓ | Grade 3.5 g/t Au within published range. Alteration radius 0.5 u reasonable. |

#### Severity rating

**Rating:** `minor-confusion`

The boiling zone disc is present, positioned correctly, and labelled with `inferred: true` — a good pedagogical choice. The geometry is approximately right. The main issues are: LS/HS distinction absent, veins do not geometrically connect to the boiling disc, and layer lithology mislabelling. None constitutes an actively wrong teaching.

#### Required v2 work

1. **Extend vein geometry to intersect the boiling zone disc (spec-v2 §5.8 — required).** Adjust vein bottom position so veins terminate at or near the boiling zone disc.
2. **Add LS/HS subtype field and differentiated rendering (spec-v2 §5.8 — optional improvement).** Minimum: a single reference card for LS with annotation "Low-sulphidation (adularia-sericite)."
3. **Fix andesite lithology mislabelling (minor — spec-v2 §5.1).** Change `lithology: 'basalt'` to `lithology: 'andesite'` for L1 and L3 in `geo-data.jsx`.

---

## Per-phase work lists

### Phase B work list (from audit)

Phase B implements spec-v2 §5.1 (layer age annotation) and §5.2 (HW/FW labels only).

- [ ] §5.1 Age sequence badges on all layer faces — required for: all 7 fault formations (where layers exist), anticline, syncline, multilayer-thickness, monocline, horizontal-strata, dipping-strata (13 layer-bearing formations total)
- [ ] §5.1 Younging direction arrow — required for all layer-bearing formations (same 13 formations)
- [ ] §5.1 Age ramp on side faces (dark = old, light = young) — required for all layer-bearing formations
- [ ] §5.2 HW/FW colour-coded labels with mnemonic tooltip — required for all 7 fault formations (normal-fault, reverse-fault, thrust-fault, strike-slip-dextral, strike-slip-sinistral, oblique-slip, listric-fault)

### Phase C work list (from audit)

Phase C implements spec-v2 §5.2 (sense-of-motion arrows, stress-state badge, displacement triad), §5.3 (strike-slip viewpoint indicator, oblique-slip decomposition, listric detachment), §5.5, §9 (interpreter validation).

- [ ] §5.2 Sense-of-motion arrows on fault plane — all 7 fault formations
- [ ] §5.2 Stress-state badge (TENSION/COMPRESSION/SHEAR/EXTENSION) — all 7 fault formations (normal=TENSION, reverse=COMPRESSION, thrust=COMPRESSION, dextral=LATERAL SHEAR, sinistral=LATERAL SHEAR, oblique=OBLIQUE, listric=EXTENSION)
- [ ] §5.2 Net displacement as a third labelled quantity — all dip-slip faults (normal-fault, reverse-fault, thrust-fault, oblique-slip, listric-fault); note: thrust-fault has displacement listed in metadata but not rendered — implement it
- [ ] §5.3 Strike-slip viewpoint indicator — fix `theta=0.0` camera for both dextral and sinistral reference cards; ensure both formations are visually distinguishable at default view
- [ ] §5.3 Strike-slip plan-view inset — 2D plan-view overlay showing map trace and dextral/sinistral sense arrows
- [ ] §5.3 Oblique-slip decomposition: wire `rake` field into renderer; draw arc within fault plane from strike direction to slip vector, labelled with rake angle in degrees
- [ ] §5.3 Oblique-slip: add `sense` field to oblique-slip data entry (`sense: 'dextral'`) in `geo-data.jsx`; add compound classification label (e.g. "Dextral-normal oblique")
- [ ] §5.3 Listric detachment: render translucent horizontal plane at detachment depth labelled "Detachment surface (decollement)"; fix block clipping to follow curved surface rather than flat plane approximation

### Phase D work list (from audit)

Phase D implements spec-v2 §5.4 (fold refinements — BUG-03 fix, monocline step indicator).

- [ ] §5.4 Axial-plane text label "ANTICLINE — axial plane" on the existing anticline axial-plane quad (BUG-03 FIX)
- [ ] §5.4 Axial-plane text label "SYNCLINE — axial plane" on the existing syncline axial-plane quad (BUG-03 FIX)
- [ ] §5.4 Monocline step indicator: faint dashed line below the flexure zone labelled "controlling step (basement fault)"

### Phase E work list (from audit)

Phase E implements spec-v2 §6 (concept primer, focus mode, explanation strip). **No audit-driven items** — these are new pedagogical additions. The audit confirms that pedagogical scaffolds are absent from all formations, but their implementation is a new feature not a v1 fix.

### Phase F work list (from audit)

Phase F implements spec-v2 §7.1, §7.2 (Cross-section and Map view tabs). **No audit-driven items** — these are wholly new viewports not present in v1.

### Phase G work list (from audit)

Phase G implements spec-v2 §7.3, §7.4 (Map inset + borehole). **No audit-driven items** — these are wholly new features.

### Phase H work list (from audit)

Phase H implements spec-v2 §5.6, §5.7, §5.8 (unconformity, intrusion, and mineralisation fixes).

**Unconformities (§5.6):**
- [ ] §5.6 Angular unconformity: implement tilted lower-bed block geometry — all beds below `below_layer_id` must render as a tilted block (tilted by `angular_discordance` degrees); upper beds remain horizontal (currently absent; all subtypes render as flat beds)
- [ ] §5.6 Angular unconformity: implement THREE.Plane clipping at the erosion surface (apply after tilted lower-bed geometry is implemented) — clip the tilted lower block at the erosion-surface plane to produce bevelled geometry
- [ ] §5.6 Angular unconformity: fix discordance arc placement — anchor arc to actual rendered geometry once lower-bed tilt is implemented; arc must connect actual upper bedding plane to actual lower bedding plane (not to a computed angle against flat beds)
- [ ] §5.6 Geological-age strip — required for all three unconformity formations (angular, disconformity, nonconformity); timescale strip showing the eroded interval as a wavy gap
- [ ] §5.6 Nonconformity: render granite/gneiss/schist basement with a distinctive visual texture (fabric hatch pattern or stipple) to distinguish it from flat-colour sedimentary layers
- [ ] §5.6 Nonconformity: expand contact label from "Nonconformity" to "Nonconformity (sedimentary on crystalline basement)" per spec-v2 §5.6

**Intrusions (§5.7):**
- [ ] §5.7 Cross-cutting age tag for dyke — "post-L2, post-L3" label on the dyke body with tooltip: "Cross-cutting relationship: the dyke is younger than every layer it cuts"
- [ ] §5.7 Cross-cutting age tag for sill — same cross-cutting age tag mechanism applied to sill
- [ ] §5.7 Cross-cutting age tag for batholith — same cross-cutting age tag mechanism
- [ ] §5.7 Cross-cutting age tag for laccolith — same cross-cutting age tag mechanism
- [ ] §5.7 Sill: apply host-layer tilt rotation to sill mesh in `buildIntrusionGeometry()` — read `model.tilt` and apply the same rotation to the sill mesh that `buildLayersOnly()` applies to the layer stack; critical architecture fix
- [ ] §5.7 Sill: add concordance label "concordant — parallel to bedding"
- [ ] §5.7 Dyke: add discordance label "discordant — cuts across bedding"
- [ ] §5.7 Laccolith: dome host-layers above laccolith — deform layer slabs above the laccolith emplacement to arch over the dome (schematic bezier arch on each overlying layer slab)
- [ ] §5.7 Laccolith: lift depth clamp — remove `Math.min(rawDepth, laccRadius - minProtrusion)` clamp; add "show subsurface" toggle (semi-transparent layer cap) per spec-v2 §5.7
- [ ] §5.7 Batholith: fix depth-label geometry mismatch — depth overlay label should derive its value from the actual rendered position, not from the raw JSON `depth` field

**Mineralisation (§5.8):**
- [ ] §5.8 VMS: reposition deposit lens from `y = -halfH - R*0.1` (below the stack) to at or near the top of the footwall sequence (seafloor contact); anchor to seafloor surface plane
- [ ] §5.8 VMS: add stringer/feeder zone — sub-vertical stockwork zone extending downward from base of lens into footwall volcanics, labelled "Stringer (feeder) zone"
- [ ] §5.8 VMS: add exhalite apron — thin horizontal disc at lens level extending laterally, labelled "Exhalite apron"
- [ ] §5.8 Skarn: replace sedimentary-layer granite with actual intrusive body — remove granite `layer` entry; replace with `intrusions` array entry (stock or batholith subtype) positioned so its contact intersects the limestone layer
- [ ] §5.8 Skarn: add endoskarn/exoskarn zones — two distinct labelled zones ("Endoskarn (in granite)" and "Exoskarn (in limestone)") on either side of the intrusion–carbonate contact, with visually distinct colours
- [ ] §5.8 Orogenic gold: change structural setting from normal fault to reverse/strike-slip shear zone — replace `subtype: 'normal'` with `subtype: 'strike-slip'` or introduce `subtype: 'shear_zone'`; label controlling structure "Shear zone"; add kinematic (sense-of-shear) arrows
- [ ] §5.8 Orogenic gold: add carbonate alteration halo label "Carbonate alteration" around the vein array
- [ ] §5.8 Porphyry: add causative porphyry stock at deposit centre — vertical elongated ellipsoid at the centre of the alteration shells, styled with granite lithology colour, labelled "Porphyry stock"; move shell centre from `x=1.5` to `x=0`
- [ ] §5.8 Epithermal: extend vein geometry to intersect the boiling zone disc — adjust vein bottom position so veins terminate at or near the boiling zone disc (`y = halfH * 0.3`)
- [ ] §5.8 Epithermal: fix andesite lithology mislabelling — change `lithology: 'basalt'` to `lithology: 'andesite'` for L1 and L3

---

## Scope risk assessment

**Total audit findings:** 0 correct, 7 minor-confusion, 15 misleading, 3 incorrect
**Required v2 work items:** 52 items across phases B, C, D, H (B: 4, C: 8, D: 3, H: 37)

The audit outcome is at the higher end of expected range but within it. The 3 `incorrect` ratings (angular-unconformity, vms-deposit, skarn-deposit) are all concentrated in Phase H. The 15 `misleading` ratings are dominated by two universal patterns — absent HW/FW labels and absent stratigraphic age annotation — that resolve as Phase B and Phase C batch fixes across 7 and 13 formations respectively, making the per-phase work more tractable than the raw formation count suggests.

**Phase H scope risk is elevated.** The three `incorrect` formations each require substantial geometry work: angular unconformity requires implementing tilted lower-bed geometry from scratch (the most architecturally significant fix in the entire audit), skarn requires replacing a layer with an intrusion body, and VMS requires repositioning the lens and adding three absent features. Phase H should be scoped conservatively, with the angular unconformity fix treated as a multi-sub-phase effort.

**Phase C scope risk is moderate.** The eight work items include two high-priority camera fixes (dextral/sinistral) plus substantial oblique-slip and listric detachment geometry work. The listric curved-block clipping is particularly non-trivial given that v1's architecture uses flat-plane clipping. This item should be treated as a sub-phase in its own right within Phase C.
