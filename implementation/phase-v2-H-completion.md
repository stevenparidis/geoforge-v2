# Phase H Completion — Unconformity, Intrusion, and Mineralisation Fixes

**Phase:** H of I (v2)
**Completed:** 2026-05-19
**Commits on master:** e283cf1 (H.5–H.7), 22e6e20 (H.8), 8a77fd3 (H.1–H.4), 25b7f3b (H.9)

---

## What was accomplished

Phase H applies the audit-driven corrections from Phase A to three feature classes: unconformities, intrusions, and mineralisation. All 37 Phase H work items from `docs/v2-audit.md` are addressed.

### H.1–H.2 — Angular unconformity geometry (PR #76)

The most architecturally significant fix in the entire phase. v1 rendered ALL beds in an angular unconformity as horizontal — the defining feature (tilted lower strata) was entirely absent. The discordance arc was therefore pointing at an angle that didn't exist in the rendered scene.

**Fix implemented:**
- Lower block layers are now collected into a `THREE.Group`, rotated `angular_discordance` degrees around the Z-axis (pivot at `contactY`), and clipped by a `THREE.Plane(new T.Vector3(0, -1, 0), contactY)` so the tilted block never protrudes above the erosion surface.
- A companion `suppressClip = new T.Plane(new T.Vector3(0, 1, 0), -contactY)` is applied in `buildSceneContents` to the flat lower layers from `buildLayersOnly`, eliminating z-fighting from double-rendering.
- The discordance arc was replaced with a cyan arc correctly spanning from horizontal upper bedding to the `angular_discordance`-tilted lower bedding, vertex at the contact surface.

**Review-cycle issues overcome:**
- Bug 1: Initial clip plane had inverted normal `(0,1,0)` — rendered the inverted region only. Fixed to `(0,-1,0)` with `contactY` constant.
- Bug 2: Lower layers double-rendered (flat from `buildLayersOnly` + tilted from builder). Fixed with the suppress-clip applied in `buildSceneContents`.
- Bug 3 (non-blocking): Hatch loop variable `y` unused — all hatch lines were identical. Fixed.
- Bug 4 (non-blocking): `applyDefaults` crystalline-basement check clobbered LLM `validation_note`. Fixed with `!U.validation_note` guard.
- Bug 5 (non-blocking): Dead `totalSpan` variable in `GeologicalTimeStrip`. Removed.

### H.3 — Geological time-scale strip (PR #76)

Added `window.GD.ICS_PERIODS` (12 entries, Cambrian–Quaternary, ICS-compliant colours) to `geo-data.jsx`. Added `GeologicalTimeStrip` React component to `workspace.jsx` rendered inside `FeatureInspector` for all three unconformity subtypes (angular, disconformity, nonconformity). Shows coloured period segments with a wavy gap indicator and "Gap: ~N Ma" subtitle.

### H.4 — Nonconformity distinction (PR #76)

- Diagonal hatch lines (`0xC4A882`) across the crystalline basement block, added to the `overlays` group.
- Contact label expanded from `"Nonconformity"` to `"Nonconformity\n(sedimentary on crystalline basement)"` with `whiteSpace: 'pre'` CSS.
- `applyDefaults` validates basement lithology against `['granite', 'gneiss', 'schist', 'marble', 'quartzite']` and sets `validation_note` if non-crystalline (guarded not to overwrite LLM-supplied notes).

### H.5 — Intrusion cross-cutting age tags (PR #74)

Added `buildIntrusionAgeTag(intrusion, model)` helper in `three-helpers.jsx`. Filters `model.layers` where `l.order < intrusion.order`, builds `"post-L1"` (singular) or `"cuts L1, L2"` (plural) badge text, returns a `CSS2DObject` with `.intrusion-age-tag` class. Called in all 4 subtype branches (dyke, sill, batholith, laccolith); added to `overlays` group.

Also added:
- `"discordant — cuts across bedding"` muted note for dykes
- `"concordant — parallel to bedding"` muted note for sills

`order: 3` added to all 4 reference intrusion objects in `geo-data.jsx` so the tag renders for the reference formations.

**Review-cycle issue overcome:**
- Batholith depth label formula was wrong. The initial formula `domeTopY = -halfH + totalHeight * 0.8` was algebraically unchanged from before the fix. The correct formula is `domeTopY = -halfH` (the sphere's equatorial flat face = the actual geological contact). Fixed to give `actualDepthToTop = surfaceY - domeTopY = 2*halfH = totalHeight` (geometrically correct).

### H.6 — Sill tilt fix (PR #74)

The sill mesh was previously added directly to `root` without inheriting `model.tilt`. In tilted-host models, the sill remained horizontal, effectively discordant (cutting across beds) — the opposite of a sill's defining characteristic.

Fix: after creating the sill mesh, reads `model.tilt` as `{ strike, dip, dip_direction }` and applies `mesh.rotateOnWorldAxis(strikeAxis, -rad(sillDipDeg))` — identical pattern to `buildLayersOnly` lines 366–379. Guarded by `if (sillDipDeg !== 0)`.

### H.7 — Laccolith depth clamp removal + layer doming (PR #74)

- Removed `Math.min(rawDepth, laccRadius - minProtrusion)` clamp. Both the mesh placement and the depth label now use `intrusion.depth` directly.
- Added a schematic parabolic arch overlay (`archY = dome apex = halfH - depth + laccRadius`) as a gold line with "Domed host layers" label, indicating overlying layers are deformed upward.
- Batholith depth label now derived from `actualDepthToTop = surfaceY - domeTopY` (actual geometry) rather than raw JSON `depth` field.

### H.8 — Mineralisation audit follow-up (PR #75)

**Porphyry Cu-Au:**
- All 4 concentric shells moved from `x=1.5` offset to `x=0` (centred in model).
- Causative porphyry stock added: `SphereGeometry(0.15)` scaled `y=2.5`, granite colour `0xD8C0B0`, "Porphyry stock" label. Stock radius (0.15) fits inside the potassic zone (r = R*0.25 = 0.25).

**Review-cycle issue overcome:**
- Initial stock used `SphereGeometry(0.35)` — larger than the potassic zone (r=0.25). Fixed to 0.15.

**Orogenic Gold:**
- Structural fault `subtype` changed from `'normal'` to `'strike-slip'` in `geo-data.jsx`.
- "Shear zone (structural control)" label added to the controlling structure in the mineralisation builder.
- Carbonate alteration halo (`0xD4C5A9`, opacity 0.25) added around the vein array, labelled "Carbonate alteration".
- Feature label fixed: `"Orogenic_gold"` → `"Orogenic gold"` via `replace(/_/g, ' ')`.

**VMS Deposit:**
- `seafloorY` correctly computed from sorted layer thicknesses: `seafloorY = -halfH + th(L1) + th(L2)` (L2/L3 contact = paleo-seafloor). Lens repositioned from below-the-stack (`y = -halfH - R*0.1`) to seafloor.
- Stringer/feeder zone: `CylinderGeometry(0.08, 0.15, halfH*0.6)` below the lens, labelled "Stringer (feeder) zone".
- Exhalite apron: `CylinderGeometry(R*1.8, R*1.8, 0.05)` at lens level, labelled "Exhalite apron".
- "Paleo-seafloor" semi-transparent overlay at lens level.

**Skarn:**
- Granite layer removed from `geo-data.jsx` `skarn-deposit` formation (was a flat sedimentary-style layer, not an intrusive body).
- `case 'skarn':` now renders its own intrusion body (granite, `0xD8C0B0`) + exoskarn zone (warm yellow-brown `0xC8A060`, labelled "Exoskarn (in limestone)") + endoskarn zone (amber-red `0xB06030`, labelled "Endoskarn (in granite)").

**Review-cycle issue overcome:**
- Initial skarn geo-data included an `intrusions: [{ subtype: 'batholith' }]` array. `buildSceneContents` iterated this and called `buildIntrusionGeometry`, producing two competing granite bodies. Fixed by removing the `intrusions` array — the `case 'skarn':` builder creates the granite body itself.

**Epithermal Au-Ag:**
- Vein bottom extended from `halfH * 0.8` to `halfH * 0.3` (the boiling zone level), so veins terminate at the boiling zone disc.
- L1 and L3 `lithology` fixed from `'basalt'` to `'andesite'` in `geo-data.jsx`.
- `andesite` lithology entry added to the `LITHOLOGY` catalogue.

### H.9 — Acceptance and smoke tests (PR #77)

- `npm run smoke` (v1): 5/5 pass (unchanged)
- `npm run smoke-v2`: 25/25 pass (was 22 after Phase G)
- 3 new tests added:
  - `H.angular-tilt` — asserts `unconformities[0].subtype === 'angular'`, canvas present, `window.GD.ICS_PERIODS ≥ 10 entries`
  - `H.intrusion-age-tag` — asserts `intrusions[0].subtype === 'dyke'` and `.intrusion-age-tag` DOM element present
  - `H.vms-seafloor` — asserts `mineralisation[0].subtype === 'vms'` and canvas renders without crash
- `STATUS.md` updated with Phase H checklist

---

## Sub-phase commit table

| Sub-phase | Commit / PR | Description |
|---|---|---|
| H.5–H.7 | e283cf1 (PR #74) | Intrusion age tags, sill tilt, laccolith depth, batholith label |
| H.8 | 22e6e20 (PR #75) | All 5 mineralisation deposit type fixes |
| H.1–H.4 | 8a77fd3 (PR #76) | Unconformity: angular tilt+clip, discordance arc, time strip, nonconformity |
| H.9 | 25b7f3b (PR #77) | Acceptance + smoke test convergence |

Execution: H.5–H.7 + H.8 + H.1–H.4 in parallel (Batch 1) → H.9 sequential (Batch 2).

---

## What was overcome

### 1. Angular unconformity needed full geometry, not just clipping

The Phase H plan document described H.1 as "apply clipping to the lower tilted block." The audit revealed v1 has NO lower-bed tilt at all — the plan assumed tilt existed and just needed clipping. The implementation agent had to build the full tilted block geometry from scratch before clipping could be applied.

### 2. Clip plane sign convention error (PR #76, Bug 1)

THREE.js clips fragments on the **positive** side of the plane (`n·p + d ≥ 0`). The initial clip plane `(0, 1, 0), -contactY` had its positive side **above** the contact (showing the wrong region). Required the complement `(0, -1, 0), contactY` (positive side: `y ≤ contactY`).

### 3. Double-rendering of lower layers (PR #76, Bug 2)

`buildLayersOnly` renders all layers including the lower tilted ones as flat slabs. `buildUnconformityGeometry` then adds the same lower layers as a tilted group. Both appeared simultaneously. Fixed with a complementary suppress-clip applied in `buildSceneContents` to flat lower meshes.

### 4. Skarn double-render (PR #75, blocking)

Adding an `intrusions: [...]` array to the skarn geo-data caused `buildSceneContents` to call both `buildIntrusionGeometry` (large batholith dome) and `buildMineralisationGeometry` case 'skarn' (own granite body). Two conflicting geometries at different positions. Fixed by removing the `intrusions` array from geo-data.

### 5. Batholith depth formula unchanged after "fix" (PR #74, blocking)

The initial fix renamed a variable but the computed value was algebraically identical to the master version. The correct formula requires understanding that the batholith hemisphere's flat equatorial face (local y=0) sits at world y = mesh.position.y = -halfH, so `domeTopY = -halfH` (not `-halfH + bathRadius`).

### 6. Porphyry stock larger than its containing alteration zone (PR #75, non-blocking)

`SphereGeometry(0.35)` stock exceeded the potassic zone radius (R*0.25 = 0.25). Fixed to `SphereGeometry(0.15)`.

---

## What was not in the implementation plan

### Sill concordance label not planned at architecture level

The plan mentioned the sill tilt fix (H.6) but the concordance label ("concordant — parallel to bedding") and the dyke discordance label were added as companion fixes in H.5 rather than a separate sub-phase. Consolidated correctly.

### `buildSceneContents` requires guard for angular unconformity's flat lower layers

The plan had no awareness that `buildLayersOnly` and `buildUnconformityGeometry` would both render the same layers. The suppress-clip pattern in `buildSceneContents` is a new architectural pattern not present in any prior phase.

### Orogenic gold `label` field on geo-data event is not read by `faultLabelHTML`

The `label: 'Shear zone'` field added to the E1 fault event in `geo-data.jsx` has no effect on the fault geometry label (which reads from `subtype`). The 3D scene labels the fault "Strike-slip" while the mineralisation builder labels it "Shear zone." This is a minor inconsistency. The mineralisation builder's label is correct pedagogically; the fault label being "Strike-slip" is technically accurate. Not fixed as it would require modifying `faultLabelHTML` to check `evt.label` first — a cross-cutting concern deferred to Phase I if needed.

---

## Architecture additions

### Changes in `src/three-helpers.jsx`
- `buildIntrusionAgeTag(intrusion, model)` — new helper, returns CSS2DObject for cross-cutting age badge
- Angular unconformity builder: tilted `THREE.Group` + `THREE.Plane` clip; corrected discordance arc
- Nonconformity builder: diagonal hatch overlay lines
- Sill builder: `model.tilt`-aware rotation (H.6)
- Laccolith builder: depth clamp removed; parabolic arch overlay (H.7)
- Batholith builder: `domeTopY = -halfH` (geometrically correct); `actualDepthToTop` from geometry
- Porphyry case: shells at x=0; stock geometry at `SphereGeometry(0.15)` scaled y=2.5
- Orogenic gold case: carbonate halo; shear zone label
- VMS case: `seafloorY` computed from layers; stringer + exhalite + paleo-seafloor overlays
- Skarn case: intrusion body + exoskarn + endoskarn zones with labels
- Epithermal case: vein bottom at `halfH * 0.3`

### Changes in `src/geo-data.jsx`
- `window.GD.ICS_PERIODS` (12 entries, Cambrian–Quaternary)
- Orogenic gold E1 fault: `subtype: 'normal'` → `'strike-slip'`
- Skarn: `intrusions: [...]` removed; now 2 sedimentary layers only
- Epithermal L1/L3: `lithology: 'basalt'` → `'andesite'`
- `andesite` lithology entry added to `LITHOLOGY` catalogue
- `order: 3` on all 4 reference intrusion objects (dyke, sill, batholith, laccolith)

### Changes in `src/workspace.jsx`
- `GeologicalTimeStrip` React component (unconformity time-scale strip)
- Rendered in `FeatureInspector` for all 3 unconformity subtypes
- Nonconformity `applyDefaults` guard: `&& !U.validation_note`

### Changes in `index.html` (CSS)
- `.intrusion-age-tag` — amber cross-cutting age badge
- `.time-strip-container`, `.time-strip`, `.time-strip-gap`, `.time-strip-label` — geological time strip
- `.vms-stringer-lbl`, `.vms-exhalite-lbl`, `.orogenic-carb-lbl`, `.intrusion-stock-lbl` — mineralisation overlay labels

### New v2 smoke tests in `tests/v2/smoke.test.js`
- `H.angular-tilt`, `H.intrusion-age-tag`, `H.vms-seafloor`
- v2 smoke test count: **25** (was 22 after Phase G)

---

## Notes for Phase I

- **Orogenic gold fault label**: The fault geometry labels itself "Strike-slip" while the mineralisation builder labels it "Shear zone." If Phase I cares about label consistency, add `evt.label` check to `faultLabelHTML` first.
- **Disconformity time strip improvement**: The H.3 time strip renders for disconformity/nonconformity too. The disconformity has no period-specific ages in its data model — the strip shows only the gap label (`~15 Ma gap`) without coloured period segments. An improvement would be to add `lower_period` / `upper_period` fields to the unconformity schema.
- **Angular unconformity: `suppressClip` performance note**: The suppress-clip traverses all `meshes` children in `buildSceneContents` after each unconformity render. For complex models with many layers this is a `O(layers)` traversal per unconformity. Acceptable for current model sizes (≤12 layers).
- **Laccolith "show subsurface" toggle not implemented**: H.7 added a schematic arch overlay for domed layers but the spec also called for a "show subsurface" toggle (semi-transparent cap layer). The depth clamp removal + arch overlay is the implemented form; the React toggle was not added. Phase I can add it if the spec requires it.
- **Phase I is next and fully unblocked.** (Phase I = final polish pass — see `implementation/phase-v2-I.md`.)
