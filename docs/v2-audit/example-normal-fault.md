# Worked example: Faults — Normal Fault

> **Purpose:** This file is a model for Phase A.4 auditing agents. It shows exactly what a
> complete, correctly filled-in audit entry looks like — including how to read the source
> code, how to identify gaps against textbook canon, how to assign severity ratings with
> per-axis justification, and how to cross-reference required v2 work to spec-v2 §5.
>
> The screenshots and external reference images are placeholders (A.2 has not run yet).
> The code-based assessment is complete.

---

## Faults: Normal Fault

**v1 reference ID:** `normal-fault`
**Source files involved:** `three-helpers.jsx` — `buildFaultScene()` (handles all fault
subtypes via a shared dispatcher; normal-fault path is `subtype === 'normal'`),
`geo-data.jsx` — `REFERENCE_FORMATIONS['normal-fault']`

---

### Source-code reading summary

Before completing the accuracy assessment, the following was established by reading the
source directly. A.4 agents should do the same reading for every formation.

**What `geo-data.jsx` says the model contains:**

```json
{
  "id": "normal-fault",
  "layers": [
    { "id": "L1", "lithology": "sandstone", "thickness": 0.8, "order": 0 },
    { "id": "L2", "lithology": "shale",     "thickness": 0.9, "order": 1 },
    { "id": "L3", "lithology": "limestone", "thickness": 0.7, "order": 2 }
  ],
  "events": [
    {
      "id": "F1", "type": "fault", "subtype": "normal",
      "strike": 0, "dip": 60, "dip_direction": 90,
      "throw": 0.9, "heave": 0.52,
      "field_origin": {
        "strike": "inferred", "dip": "stated", "dip_direction": "stated",
        "throw": "stated", "heave": "inferred"
      }
    }
  ]
}
```

Key data-layer observations:
- Three layers (sandstone base, shale middle, limestone top), each unlabelled with a
  stratigraphic age number. `order` is present in the JSON but not rendered as a visible
  badge on the layer faces.
- Dip 60° east — textbook-typical for a normal fault. Strike 0° (N–S), inferred.
- Throw 0.9 units stated; heave 0.52 units inferred (computed as `throw / tan(dip)`).
- No `sense` field needed for dip-slip; the HW side is determined by `dip_direction`.
- No `displacement` field stored; only throw and heave are tracked independently.
  True net displacement would be `sqrt(throw² + heave²) ≈ 1.04 u` — this is not
  labelled anywhere in v1.

**What `buildFaultScene()` actually renders for `subtype === 'normal'`:**

1. **Block split.** The three-layer stack (total height 2.4 u) is divided into hanging
   wall (HW) and footwall (FW) halves by a `THREE.Plane` through the origin, oriented
   by `planeNormal(dip, dipDir)`. Each layer is a `BoxGeometry` with a `clippingPlanes`
   array that shows only the correct half. The HW half is translated by `slipVec`.

2. **Slip vector.** For a normal fault: `slipVec = downDipVec(60°, 90°).normalize() ×
   (throw / sin(dip))`. This correctly moves the HW block down-dip (east and down). The
   slip direction is geometrically correct.

3. **Fault plane.** A translucent quadrilateral rendered at `opacity: 0.22` in the fault
   colour. The plane spans the full strike and dip extents of the block. It is rendered
   but carries no label (no "fault plane" text, no "F1" label on the plane face itself —
   only the floating `faultLabelHTML` positioned above the block top).

4. **Fault label.** The floating label above the block reads "Normal 60° / 090°" (subtype
   + dip + dip direction). The HW and FW blocks have no labels. There are no colour-coded
   block tags.

5. **Throw / heave overlays** (`addThrowHeaveOverlay`). A datum layer (the middle layer
   boundary) is used as the reference surface. The overlay draws:
   - A dashed cyan line: the datum horizon on the FW side.
   - A dashed cyan line: the datum horizon on the HW side (post-slip position).
   - A dashed purple line: the datum horizon on the HW side PRE-slip (where it was before
     faulting). This is the "datum reconstruction."
   - A solid cyan vertical line connecting the HW post-slip datum to the HW pre-slip datum,
     labelled "Throw 0.90 u."
   - A solid cyan horizontal line connecting the FW datum to the HW pre-slip datum,
     labelled "Heave 0.52 u" (only drawn if heave > 0.05).

6. **Dip arc overlay** (`addDipOverlay`). A horizontal disc at the top of the block,
   a dip arc from horizontal to the down-dip direction at 60°, and a value label
   "60°." A compass rose is rendered. The strike line is drawn at the top surface.
   The dip-direction arrow is drawn from the vertex downslope.

7. **What is NOT rendered for the normal fault:**
   - No HW / FW labels (no colour-coded block tags, no "HANGING WALL" / "FOOTWALL" text).
   - No sense-of-motion arrows on the fault plane surface.
   - No stress-state badge (no "TENSION" pill, no σ₃ notation).
   - No net displacement label (throw and heave are shown, but `displacement =
     sqrt(throw² + heave²)` is not computed or displayed).
   - No stratigraphic age numbers on the layer faces (order 0/1/2 is in the data but
     not rendered as visible badges).
   - No younging arrow.

---

### v1 visualisation

> **Placeholder — to be populated by A.2.**

![v1 default view (overlays on)](v1-screenshots/faults/normal-fault-overlays-on.png)
*Screenshot to be captured in Phase A.2.*

![v1 clean view (overlays off)](v1-screenshots/faults/normal-fault-overlays-off.png)
*Screenshot to be captured in Phase A.2.*

---

### Textbook reference visualisations

> **Placeholder — to be populated by A.2.** Reference images listed below with their
> expected URLs. Download and save to `docs/v2-audit/references/faults/` during A.2.
> Replace the "Reference image to be downloaded in A.2" notes with actual `<img>` tags.

**Source 1 — LibreTexts Geosciences: Faults and Folds**

*Reference image to be downloaded in A.2*

URL: https://geo.libretexts.org/Bookshelves/Geology/Physical_Geology_(Earle)/12%3A_Geological_Structures/12.03%3A_Faults

Expected content: Block diagram of a normal fault showing dip direction, hanging wall
block (labelled HW) descending, footwall block (labelled FW) stationary. Throw and heave
annotated as vertical and horizontal components of net slip respectively. Stress arrows
shown as diverging horizontal σ₃ vectors indicating extensional regime.

*Source: LibreTexts Geosciences, "Physical Geology" (Earle), §12.3 — Faults, accessed 2026-05-18*

**Source 2 — Wikipedia: Fault (geology)**

*Reference image to be downloaded in A.2*

URL: https://en.wikipedia.org/wiki/Fault_(geology)#Normal_fault

Expected content: Diagram showing normal fault cross-section with HW labelled above fault
plane, FW below, downward displacement of hanging wall indicated by arrows. Net slip
vector shown along fault plane distinguishing throw (vertical) and heave (horizontal)
components. Fault plane shown as a line; extension direction indicated.

*Source: Wikipedia, "Fault (geology)" — Normal fault section, accessed 2026-05-18*

**Source 3 — Girty, G.H., SDSU Perilous Earth Ch. 5**

*Reference image to be downloaded in A.2*

URL: https://geology.sdsu.edu/how_volcanoes_work/Perilous_Earth/

Expected content: Annotated block diagram of a normal fault (dip-slip extensional) with
labelled HW block, FW block, fault plane, slip vector, and dip angle. Typical dip range
for normal faults stated as 45°–75°.

*Source: Girty, G. H., SDSU, "Perilous Earth" Chapter 5: Faults, accessed 2026-05-18*

---

### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches | Block split by a clipped `THREE.Plane` at 60°/090°; HW displaced by `downDipVec(60°, 90°) × net-slip`. Slip direction is correct — HW moves east and down. The 60° default dip is the textbook-typical value for normal faults (accepted range 45°–75°, Girty Ch. 5). Fault plane rendered as a translucent quad at correct orientation. Three-layer stack of sandstone/shale/limestone is a reasonable schematic host. |
| Measurement overlays | ⚠ partial | Throw and heave are present and correctly computed (`heave = throw / tan(dip) ≈ 0.52 u`). The datum reconstruction (pre-slip position of HW datum, in purple dashes) is technically correct. However: (a) net displacement is not labelled anywhere — students cannot see that `displacement ≠ throw`; (b) the datum choice (mid-layer boundary) is not explained; (c) the dip arc is anchored at the top of the block, which is the correct surface intersection, but the strike line is thin and easily missed at the default camera angle (`phi: 1.15, theta: 0.0`). |
| Labels and terminology | ⚠ partial | The floating label "Normal 60° / 090°" uses correct terminology. Throw is labelled as "Throw N u" (correct). Heave is labelled as "Heave N u" (correct). However, neither the HW nor FW block has any label — a student cannot identify which block is which from the visualisation alone without external knowledge. The fault plane itself carries no label. `displacement` is not shown as a third labelled quantity. |
| Misconception risk | ✗ reinforces | Two documented misconceptions from spec-v2 §3.4 are unaddressed: (1) "The hanging wall is always on the [specific] side of the fault" — v1 renders the HW on the east side with no label explaining that HW is always the block above the dipping plane regardless of compass direction. Without HW/FW labels, this misconception is not corrected and may be reinforced if the student incorrectly reads "east block = hanging wall" as a permanent rule. (2) "Fault throw and displacement are the same thing" — v1 shows throw and heave but not displacement, leaving the student unable to see the three-way distinction. Also absent: stress-state badge (no indication this is an extensional/tension regime), sense-of-motion arrows on the fault plane. |
| Default parameters | ✓ | Dip 60° east is standard for a textbook normal fault. Throw 0.9 u (roughly 37% of the 2.4 u stack height) is visually prominent without being unrealistically large. Strike 0° (N–S, inferred) is arbitrary but reasonable for a schematic. The three-layer sequence (sandstone / shale / limestone) is a geologically coherent clastic-carbonate sequence. |

---

### Severity rating

**Rating:** `misleading`

**Justification:**

The geometry is correct and the throw/heave overlays work. The formation is not
*actively wrong* (it does not teach incorrect geometry). However, two documented
misconceptions from spec-v2 §3.4 are left unaddressed and the visualisation can
plausibly *reinforce* them:

1. HW and FW are unlabelled. A student who does not already know the hanging-wall
   mnemonic will view the model without any help distinguishing which block is the
   hanging wall — the central conceptual distinction of fault kinematics. The
   LibreTexts and Wikipedia references both label HW and FW explicitly.

2. Displacement is not shown as distinct from throw. The model provides the
   components (throw, heave) but not the resultant, leaving the throw/displacement
   conflation unaddressed.

The absence of the stress-state badge (TENSION, σ₃ horizontal) means the dynamic
context (why the hanging wall dropped — extensional tectonics) is entirely absent.
This is not the same level of risk as the above two, but it is a missed pedagogical
opportunity.

The misconception risk axis rates ✗, which places the formation at `misleading`
under the rubric, even though all other axes rate ✓ or ⚠.

---

### Required v2 work

The following items are required for this formation in v2. Each is cross-referenced to
the relevant spec-v2 §5 sub-section:

1. **Add HW/FW colour-coded block labels (spec-v2 §5.2 — required).**
   Implement the "HANGING WALL · HW" (purple) and "FOOTWALL · FW" (teal) floating
   label tags with dashed pointer-lines to the respective blocks, per the v2 mockup.
   Include the hover tooltip: *"In a fault, the hanging wall is the block above the
   dipping fault plane — where a miner could hang a lantern. The footwall is the block
   below, at the miner's feet."*
   Applies to all 7 fault formations.

2. **Add sense-of-motion arrows on the fault plane (spec-v2 §5.2 — required).**
   Two arrows on the visible fault plane: HW arrow pointing down-dip (east, downward),
   FW arrow pointing up-dip (west, upward). Colour-code to match HW/FW labels
   (purple HW, teal FW).
   Applies to all dip-slip fault formations.

3. **Add net displacement as a third labelled quantity (spec-v2 §5.2 — required).**
   Show displacement as a dashed light-blue line along the fault plane connecting
   equivalent piercing points on HW and FW. Label "Displacement N u" using `--accent-2`
   colour (`#a3e4ff`). Compute as `sqrt(throw² + heave²)`.
   This directly addresses the "throw = displacement" misconception in §3.4.

4. **Add stress-state badge (spec-v2 §5.2 — required).**
   A small pill-shaped panel below the model labelled "TENSION" with outward-pointing
   horizontal stress arrows and subtitle "σ₃ horizontal · extensional regime."
   Applies to all normal fault formations; each fault subtype gets its own badge wording.

5. **Add stratigraphic age numbers to layer faces (spec-v2 §5.1 — required).**
   Numbered badges (1 = oldest, N = youngest) on the visible side faces of each layer.
   The normal fault's three layers (sandstone L1/order-0 = oldest, limestone L3/order-2
   = youngest) should be labelled accordingly. This is a cross-cutting requirement for
   all multi-layer formations, not specific to the normal fault.

---

### Notes

- **Camera hint assessment.** The default camera hint `{ phi: 1.15, theta: 0.0, dist: 9 }`
  gives a near-orthographic front-on view perpendicular to strike. This is the standard
  textbook presentation for a dip-slip fault (you look along strike to see the dip-slip
  geometry). No change needed.

- **Heave calculation check.** The stored heave value (0.52 u) matches `throw / tan(60°) =
  0.9 / tan(60°) ≈ 0.52`. The renderer recomputes heave from slip vector components
  (`Math.sqrt(slip.x² + slip.z²)`) rather than reading the stored value directly, so
  a rounding inconsistency in the JSON does not produce a visual discrepancy.

- **`displacement` field absent from JSON.** The normal-fault JSON entry in `geo-data.jsx`
  has no `displacement` field — only `throw` and `heave`. When v2 adds the displacement
  overlay (item 3 above), the renderer must compute it rather than reading from the model
  JSON. The computation is straightforward: `sqrt(throw² + heave²)`.

- **Open question — throw sign convention.** The code uses `downSign = -1` for normal
  faults in `addThrowHeaveOverlay`. The throw label reads the absolute value of `slip.y`.
  This is correct (throw is always positive by convention, with direction implied by
  subtype). No issue.

- **Relationship to BUG-03 (anticline/syncline distinction).** The normal fault does not
  share this bug. BUG-03 applies to the fold formations only.

- **Relationship to angular unconformity clip-through.** The normal fault does not share
  this artefact. The clip-through bug (noted in `todo.md`) is specific to the angular
  unconformity renderer.
