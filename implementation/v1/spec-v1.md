# GeoForge — v1 Feature Specification

**Document:** `spec-v1.md`
**Version:** 0.1 (draft)
**Status:** Initial v1 scope, agreed in discussion with Steven
**Parent document:** `spec.md` (overall vision and architecture)
**Companion reference:** `GeoForge_Geology_Reference.docx` (knowledge base)

---

## 1. Purpose of this document

This document defines **what ships in v1**. It does not redefine the application's purpose, architecture, or core principles — those live in `spec.md`. This document answers a single question: *of everything described in `spec.md`, what is built first?*

The v1 philosophy: **v1 is the smallest version of GeoForge that fully proves the measurement-origin annotation principle.** It is not a stripped MVP; it is a complete demonstration of the central idea at a focused scope.

This means v1 deliberately favours **depth on the core principle** over **breadth of geological features**.

---

## 2. v1 scope at a glance

| Area                       | v1 scope                                                                                       |
|----------------------------|------------------------------------------------------------------------------------------------|
| Geological complexity      | Layers + all fault types + simple folds                                                        |
| Measurement overlays       | All seven (full set — see §4)                                                                  |
| Interpreter behaviour      | Silent best-guess inference; flags inferred fields, no clarification prompts                   |
| Editing                    | All three modes: re-write description, numeric inspector, direct 3D manipulation               |
| History playback           | Yes — step through events oldest → youngest                                                    |
| Persistence                | JSON download / upload only; no auto-save                                                      |
| Default annotation state   | Labels on, overlays on (full teaching mode)                                                    |
| Accessibility              | Single default palette; no dark mode or colourblind palette in v1                              |

---

## 3. Geological features included in v1

### 3.1 Included

**Layers (stratigraphy)**

- Horizontal strata
- Dipping strata (with strike, dip, dip direction)
- Layer thickness as an explicit, measurable property
- Lithology assignment from the reference document §4 catalogue, using the default colours specified there
- Age assignment from the reference document §5 timescale

**Faults (all types from reference §7)**

- Normal
- Reverse
- Thrust (low-angle reverse, dip < 45°)
- Strike-slip (dextral)
- Strike-slip (sinistral)
- Oblique-slip
- Listric (curved; flattens at depth)

Each fault carries: strike, dip, dip direction, sense of movement, throw, heave, displacement, and (where stated) slip vector.

**Folds (simple folds only)**

- Anticline
- Syncline
- Monocline

Each fold carries: hinge line, axial plane orientation, plunge, plunge direction, interlimb angle, and tightness class.

### 3.2 Excluded from v1 (deferred to later versions)

- Intrusive bodies (dykes, sills, batholiths, etc.) — reference §10
- Unconformities — reference §3
- Joints, fractures, fabric — reference §8
- Complex folds (recumbent, isoclinal, chevron, etc.)
- Metamorphic features — reference §11
- Surface and weathering features — reference §12
- Mineralisation and ore deposits — reference §14
- Hydrothermal pathway annotation — reference §13

These remain part of the overall vision in `spec.md` and the JSON schema will accommodate them, but v1 will not interpret, render, or annotate them. If a user's description mentions an excluded feature, the interpreter notes it in a "not yet supported in v1" log entry attached to the model, but does not attempt to render it.

---

## 4. Measurement-origin overlays in v1

All seven overlays from `spec.md` §7.2 are mandatory in v1. This is non-negotiable: omitting any one would undermine the core principle that v1 exists to prove.

| Overlay                       | Required components                                                                                                |
|-------------------------------|---------------------------------------------------------------------------------------------------------------------|
| Dip angle vertex + arc        | Translucent horizontal reference plane through the vertex; arc from horizontal to dipping plane; value inside arc  |
| Dip direction + compass       | Compass rose at vertex; horizontal projection of steepest descent; arc from north to projection; value inside arc  |
| Strike line + compass         | Horizontal line on the plane; small compass rose; arc from north to strike; value inside arc                       |
| Layer thickness vector        | Two reference planes on upper and lower contacts; perpendicular vector between them; value along the vector        |
| Fault throw/heave reconstruction | Vertical dashed line at fault (throw) and horizontal dashed line (heave); pre-fault datum reconstructed on both walls; throw and heave values labelled on their respective references |
| Fold interlimb angle arc      | Both limbs as semi-transparent planes converging at hinge; arc spanning the angle between them; value inside arc   |
| Fold plunge vertex + arc      | Hinge line shown explicitly; horizontal projection; vertex; arc with value                                          |

All overlays are bound to the same toggle as the labels (overlays follow the labels' on/off state). They render by default when a fresh model loads.

---

## 5. The AI interpreter in v1

### 5.1 Behaviour

The interpreter parses the user's plain-English description and produces GeoModel JSON. In v1, its behaviour is **silent best-guess**:

1. Parse input sentence by sentence.
2. Identify entities and classify them against the trigger phrase library (reference §16).
3. Where a field is not explicitly stated, choose a reasonable default and mark the field as `inferred = true`.
4. Where a phrase is genuinely ambiguous, pick the most likely interpretation and mark all derived fields as `inferred = true` with an `inference_reason` string.
5. **Do not** prompt the user, halt parsing, or open a clarification dialogue. v1 prioritises flow.

### 5.2 The stated-vs-inferred contract

Because the interpreter never asks for clarification, the visual distinction between stated and inferred values is the **only** signal the user receives about what the model actually assumed. v1 therefore commits to a precise rendering:

- **Stated values:** rendered in the standard label colour (high-contrast white/near-white).
- **Inferred values:** rendered in **amber/orange** with a **dashed underline**.

Two reinforcing signals (colour + underline) so the distinction cannot be missed at a glance and remains legible in greyscale or for users who have difficulty distinguishing the two colours.

Hovering or clicking an inferred value reveals the `inference_reason`.

### 5.3 v1 default values for common inferences

When a fault type is named but no dip is given, v1 uses the Andersonian defaults from reference §1:

| Stated fault type        | Default dip   | Default dip direction              |
|--------------------------|---------------|------------------------------------|
| Normal                   | 60°           | Inferred from "down-thrown" cues   |
| Reverse                  | 45°           | Inferred from compression cues     |
| Thrust                   | 25°           | Inferred from low-angle cues       |
| Strike-slip (either)     | 90° (vertical)| N/A (vertical fault)               |
| Listric                  | 70° at surface, curving to ~10° at depth | Inferred from context |

When a fold is named but no plunge is given, v1 defaults to 0° (non-plunging) and flags it as inferred.

When a layer is named but no thickness is given, v1 defaults to a layer thickness of 10% of the model height, marked as inferred.

---

## 6. Editing in v1

The JSON is the single source of truth. All three editing paths write to it; the renderer reads from it.

### 6.1 Path A — re-write the description

The user edits the text in the description pane. The interpreter re-parses (incrementally where the description is appended; fully where the description is restructured). The JSON updates. The 3D view re-renders.

### 6.2 Path B — numeric inspector

Clicking a feature opens an inspector panel showing all fields. The user can edit values directly. On commit, the JSON updates and the 3D view re-renders. The corresponding field is marked `manually_edited = true` and any `inferred = true` flag is cleared.

### 6.3 Path C — direct 3D manipulation

The user grabs handles on features in the 3D view:

- A fault plane can be rotated (changing strike/dip) and translated (changing throw/heave by dragging the hanging-wall block).
- A layer's contact surfaces can be dragged to change thickness.
- A fold's limbs can be rotated to change interlimb angle; the hinge line can be tilted to change plunge.

Direct edits write back to the JSON in real time. Affected fields are marked `manually_edited = true`.

### 6.4 What edits do not change

The user's **original plain-English description is never rewritten** by edits made through paths B or C. The description remains a historical record of the student's first attempt; the JSON diverges from it once the student starts editing. The inspector panel can display this divergence so the student can see how their initial interpretation evolved.

---

## 7. History playback in v1

The 3D view includes a timeline control along the bottom. The timeline shows the ordered sequence of events from the JSON `events` array. Controls:

- **Play / pause** — animate through the events.
- **Step forward / step back** — advance one event at a time.
- **Scrubber** — drag to any point in the sequence.
- **Speed control** — 0.5×, 1×, 2× playback.

At each step, the model renders the state of the geology *after* that event has been applied. Annotations and overlays update accordingly. This reinforces the pedagogical point that the final structure is the cumulative result of an ordered sequence of geological events.

The default playback state is **stopped at the final (most recent) state** — i.e. what the model looks like today. The user opts in to playback.

---

## 8. Persistence in v1

v1 supports **manual JSON download and upload only**.

- **Download:** a prominent "Download JSON" control in the main toolbar exports the full GeoModel JSON to a file named after the model's `meta.name` field.
- **Upload:** an "Open JSON" control accepts a previously downloaded file, validates it against the v1 schema, and loads it into the model and description panes.

No browser local storage, no auto-save, no cloud sync. A browser refresh wipes the model unless the user has downloaded the JSON. The UI must make the Download control visually prominent so the consequence is obvious.

The downloaded JSON includes both the structured model and the user's original description, so re-opening restores both panes exactly.

---

## 9. Interface in v1

### 9.1 Layout

Three primary panes, simultaneously visible on a desktop viewport:

1. **Description pane (left)** — the text input where the user writes plain-English geology.
2. **3D model pane (centre, largest)** — the rendered model with annotations and overlays.
3. **Inspector pane (right, collapsible)** — opens when a feature is clicked; shows all its fields.

Mobile layout is not a v1 requirement.

### 9.2 Toolbar controls

- **Labels on/off**
- **Overlays on/off** (independent toggle, though both default on)
- **History playback controls** (play / pause / step / scrubber / speed)
- **Download JSON**
- **Open JSON**
- **Reset model** (with confirmation)

### 9.3 Default startup state

- Description pane: empty, with placeholder text giving a one-sentence example.
- 3D pane: empty workspace with grid and north arrow visible.
- Inspector pane: collapsed.
- Toolbar: Labels on, Overlays on, playback stopped at "current state".

---

## 10. Out of scope for v1

Beyond the geological features listed in §3.2, the following are explicitly out of scope:

- Multi-user collaboration
- Sharing links or embeddable views
- Print-to-PDF or report export
- Mineralisation prediction (deferred per `spec.md` §10)
- Quizzes, scoring, or assessment (excluded from the overall vision)
- Customisable colour palettes, dark mode, colourblind palettes
- Imperial units toggle (SI only in v1)
- Touch / tablet / mobile layouts
- Real coordinate systems (geographic projections, mine grids); v1 uses a local Cartesian frame
- Cross-section export to 2D
- Drill-hole or borehole representation

These may appear in later versions; the JSON schema should not be designed in a way that precludes them.

---

## 11. v1 acceptance criteria

v1 ships when all of the following are true:

1. A user can type a plain-English description containing at least one layer, one fault, and one simple fold, and see a corresponding 3D model render automatically.
2. Every measurement on the model displays with its geometric origin overlay as defined in §4.
3. Every value visibly indicates whether it was stated or inferred, per §5.2.
4. All three editing paths (description re-write, numeric inspector, direct 3D manipulation) modify the same underlying JSON and produce consistent visual results.
5. The user can play back the geological history from oldest event to most recent and see each event applied.
6. The user can download the model as JSON and reload it later, recovering both the description and the 3D state exactly.
7. The default startup state shows labels and overlays on, demonstrating the measurement-origin principle without any user action required.

---

## 12. Open questions for v1

To resolve during implementation, in order of urgency:

1. **Incremental re-parse vs full re-parse** — when the user edits the description, does the interpreter re-parse only the changed sentence, or the whole text? Affects latency and consistency.
2. **Conflict resolution between edit paths** — if a user manually edits a fault's dip via the inspector and then re-words the description in a way that contradicts the manual edit, which wins? Recommended default: the manual edit wins until the user changes the relevant sentence again, but this needs a clear rule.
3. **Direct-manipulation handle visibility** — are 3D edit handles always visible, or only when a feature is selected? Always-visible is more discoverable; selection-only is less cluttered.
4. **Playback granularity** — does each event animate (e.g. the fault visibly moves into place), or does the model snap to the post-event state? Animation is more pedagogical but more work.
5. **Where the AI interpreter runs** — client-side LLM call, server-side, or hybrid? Affects latency, cost, and offline behaviour.

---

## 13. Document changelog

| Version | Date       | Changes                                            |
|---------|------------|----------------------------------------------------|
| 0.1     | 2026-05-14 | Initial v1 scope from second discussion with Steven. |
