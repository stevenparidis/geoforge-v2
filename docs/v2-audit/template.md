# GeoForge v2 — Per-Formation Audit Template

This file is the reusable template for auditing a single v1 reference formation.
One completed entry is produced per formation during Phase A.4.
Each entry lives in `docs/v2-audit/parts/<agent>.md` and is concatenated into
`docs/v2-audit.md` by the Phase A.5 orchestrator.

---

## How to fill in this template

**One template per formation.** Do not combine two formations in one entry even if they
share a feature class or renderer. The severity rating must be per-formation.

**Source files to read first.** Before writing anything, read:
1. The `build<Formation>()` function (or `buildFaultScene()` / `buildFoldScene()` etc.)
   in `src/three-helpers.jsx`. Note exactly what geometry and overlays the renderer
   produces.
2. The `REFERENCE_FORMATIONS['<formation-id>']` entry in `src/geo-data.jsx`. Note the
   stated vs inferred field origins and the default parameter values.
3. Any relevant items in `todo.md` that reference this formation or feature class.

**External sources.** Compare the rendered geometry against at least two independent
external textbook sources (see phase-v2-A.md §A.1 for the recommended source list).
Do not rely solely on `implementation/geology_reference.txt` — it was written alongside
v1 and may share its blind spots.

**Shared sources.** Multiple formations in the same feature class often share the same
textbook references. The `### Textbook reference visualisations` section should cite
the specific pages or figures, not just the top-level source. If images were downloaded
in A.2, reference them here by filename.

---

## Severity rating rubric

Each formation receives **one** of the four ratings below. The rating is determined by
the worst single axis in the accuracy assessment — a formation that scores ✓ on four axes
but ✗ on one still rates `incorrect` on that axis.

| Rating | Meaning | v2 action |
|---|---|---|
| `correct` | Matches textbook canon on all axes; no pedagogical risk | No v2 work required |
| `minor-confusion` | Small issues that could create confusion but are unlikely to generate a lasting misconception. Examples: slightly non-standard terminology, overlays that work but are hard to read at default camera | Optional v2 work; may be deferred to v3 with explicit rationale |
| `misleading` | Could plausibly produce a misconception in a student working through the spec-v2 §3.4 list. The visualisation is not actively wrong, but something important is absent or ambiguous enough to be misread | Required v2 work |
| `incorrect` | Actively wrong relative to consensus geology; a student using the tool would learn something that conflicts with a textbook | Required v2 work, high priority |

**Anti-patterns:**
- Do not rate every formation `correct` because v1 "works." The question is whether the
  visualisation *teaches correctly*, not whether it *runs*.
- Do not rate everything `incorrect` because labels are missing. Labels absent = at most
  `misleading`. Labels present but wrong = `incorrect`.
- If you genuinely cannot tell from the code without running the tool, note that in
  `### Notes` and assign the most conservative rating you can justify.

---

## Per-feature-class audit questions

These are the questions auditors must answer per the axis rubric, by feature class.
Use them to populate the `Notes` column of the accuracy assessment table.

### Faults (all subtypes)

- **Geometry axis:** Is the fault plane orientation (dip angle, dip direction, sense of
  throw) consistent with textbook block diagrams (Girty SDSU Ch. 5, LibreTexts 3.5)?
  For normal faults specifically: does the hanging wall drop? For reverse/thrust: does the
  hanging wall ride up? For strike-slip: is the sense (dextral / sinistral) visually clear
  without requiring camera rotation?
- **Measurement overlays axis:** Is the throw/heave vertex placed on a real datum layer
  (not on the fault plane itself)? Is the dip arc anchored at the correct point — the
  intersection of the fault with the top surface, not an arbitrary midpoint?
- **Labels and terminology axis:** Does the label use accepted terminology? Is `throw`
  distinguished from `displacement`? Is `heave` labelled separately from `throw`?
- **Misconception risk axis:** Are hanging wall (HW) and footwall (FW) identified?
  (Per v1 context, they are NOT — flag as `misleading` per spec-v2 §3.4 and §5.2.)
  Is the stress state (tension, compression, shear) shown? (Per v1 context, it is NOT.)
  Could a student confuse throw with net displacement?
- **Default parameters axis:** Is the default dip realistic? Normal faults: 45°–70°
  (60° is standard). Reverse: 30°–60°. Thrust: <30°. Strike-slip: 90°. Are defaults
  typical of real-world geology or contrived?

### Folds

- **Geometry axis:** Is the fold shape (arch for anticline, trough for syncline) correct?
  At zero plunge, are anticline and syncline visually distinguishable? (BUG-03.)
- **Measurement overlays axis:** Is the interlimb arc drawn between the actual limb planes
  or between arbitrary tangent lines? Is the plunge arc correctly oriented?
- **Labels and terminology axis:** Is the hinge line labelled? Is the axial plane shown
  and labelled? Are the terms `anticline` / `syncline` in the scene label?
- **Misconception risk axis:** Can a student identify which type it is purely by age in
  core (oldest = anticline, youngest = syncline)? If age labels are absent at zero plunge
  — `misleading`.
- **Default parameters axis:** Is a non-zero plunge the default? (Zero plunge is
  pedagogically the worst case for the BUG-03 distinction.)

### Unconformities

- **Geometry axis:** For angular unconformity: does the lower tilted block protrude into
  the upper block (known clip-through artefact, `todo.md`)? If yes — `incorrect`.
- **Measurement overlays axis:** Is the angular discordance arc connecting upper bedding
  to lower bedding (correct) or to the contact surface itself (incorrect per spec-v2 §5.6)?
- **Labels and terminology axis:** Is the type (angular / disconformity / nonconformity)
  labelled? For nonconformity: is the basement rock forced to a crystalline lithology?
- **Misconception risk axis:** Is the time gap (in Ma) labelled? Is there any indication
  that a significant erosion interval occurred?
- **Default parameters axis:** Is the angular discordance large enough (≥20°) to be
  clearly visible without zooming?

### Intrusions

- **Geometry axis:** Is a dyke discordant (cuts across bedding) and a sill concordant
  (parallel to bedding)? Does the laccolith dome the overlying layers?
- **Measurement overlays axis:** Is the intrusion thickness annotated for dykes and sills?
- **Labels and terminology axis:** Is the intrusion subtype labelled? For sills vs dykes:
  is the orientation relationship to bedding labelled?
- **Misconception risk axis:** Is the cross-cutting relationship (intrusion is younger than
  what it cuts) labelled? (Per v1 context, it is NOT — potential `misleading` item per
  spec-v2 §5.7.)
- **Default parameters axis:** Are default rock types appropriate (basalt for dykes/sills,
  granite for batholiths/laccoliths)?

### Mineralisation

- **Geometry axis:** Are alteration zones rendered in the correct sequence outward from
  the ore-grade core? For porphyry: potassic (innermost) → phyllic → argillic → propylitic
  (outermost). Reversed order = `incorrect`.
- **Measurement overlays axis:** Is the alteration radius labelled?
- **Labels and terminology axis:** Are the alteration zones individually labelled?
- **Misconception risk axis:** Is the structural control (fault, shear zone) visible and
  labelled for structurally controlled deposits (e.g. orogenic gold, VMS)?
- **Default parameters axis:** Are the deposit parameters (grade, alteration radius)
  within typical published ranges for this deposit type?

---

## The template

Copy this block verbatim for each formation, then fill it in:

---

## <feature-class>: <formation-name>

**v1 reference ID:** `<formation-id>` (e.g. `normal-fault`)
**Source files involved:** `three-helpers.jsx` builder `build<Formation>()`, `geo-data.jsx` entry `REFERENCE_FORMATIONS['<formation-id>']`

### Source-code reading summary

- Builder function: `build<Formation>()` in `three-helpers.jsx`
- REFERENCE_FORMATIONS entry: `geo-data.jsx` → `REFERENCE_FORMATIONS['<formation-id>']`
- Key parameters: <list what drives the rendering>
- Known deviations from default geometry: <or "none">

### v1 visualisation

![v1 default view](v1-screenshots/<feature-class>/<formation-id>-overlays-on.png)
![v1 clean view](v1-screenshots/<feature-class>/<formation-id>-overlays-off.png)

### Textbook reference visualisations

![Source 1](references/<feature-class>/<source1>-<formation>.png)
*Source: <Citation>, accessed <date>*

![Source 2](references/<feature-class>/<source2>-<formation>.png)
*Source: <Citation>, accessed <date>*

### Accuracy assessment

| Axis | Assessment | Notes |
|---|---|---|
| Geometry | ✓ matches / ⚠ partial / ✗ wrong | <one-line note> |
| Measurement overlays | ✓ / ⚠ / ✗ | <vertex correctly placed? reference frame correct?> |
| Labels and terminology | ✓ / ⚠ / ✗ | <accepted terminology? consistent with sources?> |
| Misconception risk | ✓ no risk / ⚠ subtle / ✗ reinforces | <which spec-v2 §3.4 misconception, if any?> |
| Default parameters | ✓ / ⚠ / ✗ | <are the defaults typical of real-world geology?> |

### Severity rating

**Rating:** `correct` | `minor-confusion` | `misleading` | `incorrect`

- `correct` — matches textbook canon on all axes; no v2 work needed.
- `minor-confusion` — small issues that could be addressed but aren't critical. Optional v2 work; may be deferred to v3.
- `misleading` — could plausibly produce a misconception in a student. Required v2 work.
- `incorrect` — actively wrong relative to consensus geology. Required v2 work, high priority.

### Required v2 work

If no required v2 work: write "None — formation rates correct on all axes."

<list of specific changes required, each cross-referenced to a spec-v2 §5 sub-section>

### Notes

<anything else worth flagging — open questions, judgement calls, references that disagree>
