# GeoForge — Application Specification

**Document:** `spec.md`
**Version:** 0.1 (draft)
**Status:** Initial specification, agreed in discussion with Steven
**Companion reference:** `GeoForge_Geology_Reference.docx` (knowledge base; editable, not authoritative)

---

## 1. Purpose

GeoForge converts plain-English descriptions of structural geology — the kind a first- or second-year geology student would write — into an **annotated, editable 3D geological model**.

The application's purpose is **learning**, not production geology. The model is a teaching surface: it shows the student not just *what* a structure looks like, but **where every measurement on it comes from** in geometric space. A dip angle is shown with its vertex; a thickness is shown with its reference plane; a fault's strike is shown along the line it is measured against.

If a student can read a written description of a mine's structural geology and watch it become a 3D shape with all its measurements visibly anchored, they will understand structural geology faster and more deeply than they would from text alone.

---

## 2. Audience

The intended user is one of:

- A first- or second-year geology student building intuition for structural geology.
- A junior mine geologist needing to mentally translate site descriptions into 3D structure.
- A more experienced learner using GeoForge as a visualisation scratchpad.

The application is **not** for the general public. It assumes the user has, or is actively acquiring, a working geological vocabulary. The interface uses real geological terminology without dumbing it down.

---

## 3. The core principle: measurement-origin annotation

This is the principle the entire application is built around. Every other feature serves it.

**Every numerical value displayed on the 3D model must visually show its geometric origin and reference frame.**

A label that says "Dip: 45°" is not enough. The model must show:

- The **fault plane** the dip is measured on.
- The **horizontal reference plane** (or imaginary horizontal) the angle is measured against.
- The **vertex** where the two planes meet — the actual geometric origin of the 45° measurement.
- The **arc** sweeping from the horizontal to the dipping plane, with the value inside it.

The same rule applies to every measurable feature:

| Measurement       | Required visual reference                                                                 |
|-------------------|--------------------------------------------------------------------------------------------|
| Dip angle         | Vertex of angle, horizontal reference plane, arc with value, plane being measured          |
| Dip direction     | North arrow, horizontal projection of the dip line, bearing arc with value                 |
| Strike            | Horizontal line on the plane, north arrow, bearing arc                                     |
| Thickness         | Two parallel surfaces, perpendicular vector between them, value along the vector           |
| Throw (fault)     | Vertical reference line, offset markers on both walls, value along the vertical            |
| Heave (fault)     | Horizontal reference line, offset markers on both walls, value along the horizontal        |
| Plunge (fold)     | Hinge line, horizontal projection, vertex, arc with value                                  |
| Interlimb angle   | Both limbs as visible planes, vertex at hinge, arc between them with value                 |
| Displacement      | Pre-fault marker reconstruction (dashed), post-fault marker, arrow connecting them         |
| Vein width        | Two vein walls, perpendicular vector, value                                                |

If a measurement cannot be shown with its geometric origin, it must not be displayed as a bare number. Either find a way to show its reference frame, or omit it.

This principle is **non-negotiable** and overrides considerations of visual cleanliness. The "Show labels" toggle exists precisely so the user can switch between a clean view and the full pedagogical view at will.

---

## 4. System architecture

GeoForge is composed of three subsystems plus a knowledge base:

```
┌─────────────────────────┐
│  Plain-English input    │  Student writes a description in natural language.
└─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│  AI Interpreter         │  Reads input, draws on the geology reference,
│                         │  outputs structured GeoModel JSON.
└─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│  GeoModel JSON          │  The single source of truth for the model.
│  (schema in §8)         │  Read by renderer; written by interpreter and editor.
└─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│  3D Renderer +          │  Existing visual engine (the prior "GeoForge"
│  Annotation Layer       │  project provides the rendered base; this spec
│                         │  adds the annotation layer and edit hooks).
└─────────────────────────┘
             ▲
             │  Manual edits write back to JSON
             │
┌─────────────────────────┐
│  Manual Edit Controls   │  User drags/rotates/sets values in the 3D view.
└─────────────────────────┘
```

### 4.1 The knowledge base

The `GeoForge_Geology_Reference.docx` document is the project's primary knowledge base. It contains:

- Geological terminology and concepts (sections 1–14).
- The plain-English trigger phrase library (section 16).
- The 3D annotation specification (section 17).
- The GeoModel JSON schema cheat-sheet (section 18).

The knowledge base is **editable**. Anyone working on the project can revise it, and the application should be able to absorb those revisions. It is not a frozen authoritative source; it is the current best statement of the domain knowledge that GeoForge encodes.

### 4.2 The visual foundation (existing)

A prior project provides the 3D rendering engine. The base visuals — layers, fault planes, fold surfaces, intrusive bodies — are already implemented and visually polished. **This spec does not redefine the renderer.** It defines what the renderer is fed (the JSON) and what is layered on top of it (the annotation system).

---

## 5. Input model

### 5.1 Vocabulary level

The user writes in **first- or second-year geology student English**. This means:

- Real geological terms used (anticline, thrust fault, hanging wall, dip, strike, schist).
- Imprecise or colloquial phrasing accepted ("the layers tip down to the east at about 30 degrees", "there's a big fault that drops the east side").
- Mining and field jargon accepted where it overlaps with student vocabulary ("reef", "lode", "outcrop", "gossan").
- Numbers may be approximate or symbolic ("steeply dipping", "gentle fold").

The trigger phrase library in section 16 of the reference document seeds the AI interpreter's recognition vocabulary. It is explicitly described as **incomplete by design** and grows as the project evolves.

### 5.2 Input form

A single editable text field accepts a multi-sentence geological description. The user may:

- Type a fresh description from scratch.
- Append additional sentences to an existing description; the model updates incrementally.
- Edit any sentence; the affected events in the model update.

Each sentence (or clause) that produces a structural event in the model is stored as the `description_source` field on that event in the JSON, so the link between *words written* and *feature shown* is preserved.

### 5.3 Order of description = order of events

The reference document's JSON schema includes an `order` field on events. GeoForge interprets the order in which the user describes events as the order in which they occurred geologically, unless the user explicitly states otherwise ("an older fault was reactivated"). This reinforces the pedagogical point that geology is a sequence of events, not a snapshot.

---

## 6. The AI interpreter

The interpreter is the bridge between plain English and structured geological data. Its job is to read the user's text and produce valid GeoModel JSON.

### 6.1 What the interpreter does

1. **Parse the input** sentence by sentence.
2. **Identify geological entities** mentioned: layers (lithology, age, thickness), structural events (faults, folds, intrusions), and any associated measurements.
3. **Match phrases against the trigger phrase library** (reference document §16) to classify each entity by type and subtype.
4. **Infer missing fields** with conservative defaults — e.g. if the user says "a normal fault" without specifying dip, use 60° (the typical Andersonian value from reference §1) and flag it as inferred.
5. **Order events** by the sequence in which they appear in the user's description, unless the user supplies an explicit ordering cue.
6. **Emit GeoModel JSON** conforming to the schema in §8 of this spec (which mirrors §18 of the reference doc).
7. **Record the source sentence** on every event in the `description_source` field.

### 6.2 What the interpreter must distinguish

| Plain English                                         | What the interpreter must conclude                                                                                  |
|-------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| "A fault dips 45° east"                               | A planar fault, dip = 45°, dip_direction = 90°. Type defaults to undetermined until further cues appear.            |
| "A normal fault dips 45° east"                        | Same as above, with subtype = normal.                                                                                |
| "The hanging wall dropped"                            | Sets fault subtype = normal.                                                                                          |
| "The hanging wall rose 20 m"                          | Sets fault subtype = reverse (or thrust if dip < 45°), displacement.throw = 20 m.                                    |
| "The east side moved north 10 m"                      | Strike-slip, sense = dextral (right-lateral), displacement = 10 m.                                                  |
| "An anticline plunges 20° to the north-east"          | Fold, subtype = anticline, plunge = 20°, plunge_direction = 045°.                                                    |
| "The granite cuts the limestone"                      | Intrusion (granite) is younger than host (limestone); intrusion event ordered *after* limestone deposition.          |
| "There's a gossan on the surface"                     | Surface feature, gossan; flags the presence of an underlying oxidising sulphide body to annotate.                    |
| "Gold occurs in quartz veins in a shear zone"         | Orogenic gold deposit, host structure = shear zone, ore geometry = veined.                                           |

### 6.3 Inferred vs stated values

Every field in the output JSON must carry a flag indicating whether it was **stated explicitly** by the user or **inferred** by the interpreter. The 3D annotation renders inferred values differently (e.g. in italics, or with a dashed underline) so the student can see at a glance which parts of the model came directly from their words and which were the interpreter's best guess.

### 6.4 Ambiguity handling

When the interpreter cannot confidently classify a phrase, it should:

1. Make its best inference and flag the field as `inferred = true` with a short `inference_reason`.
2. Surface a non-blocking notice in the UI listing the assumptions made ("I assumed your fault is normal because you said the hanging wall dropped").
3. Never silently invent measurements the user did not provide and that have no sensible default.

Detailed error testing and a clarification dialogue loop are deferred (see §10).

### 6.5 What the interpreter does not do

- It does not predict where mineralisation will form (deferred — see §10).
- It does not validate the geological plausibility of the user's description. If a student writes something physically impossible, the interpreter builds it anyway and lets the visual reveal the problem.
- It does not run quizzes, generate questions, or grade the user.

---

## 7. The annotation layer

### 7.1 Annotation rules (from reference document §17, extended)

- Labels are **toggleable** via a "Show labels" control. Default state: labels on.
- Labels **billboard** toward the camera so they remain readable from any angle.
- Labels use thin **leader lines** from the label text to the feature.
- Where labels would collide in a given view, the higher-priority label wins. Priority order:
  1. Faults
  2. Unconformities
  3. Folds
  4. Major lithology contacts
  5. Intrusive bodies
  6. Mineralisation
  7. Joints and minor features
  8. Rock type labels
  9. Grade contours
- Numeric values default to SI units (metres, degrees) with a setting for imperial.
- Every annotation is **clickable**. Clicking surfaces:
  - The original plain-English sentence (`description_source`) that produced this feature.
  - All secondary fields (e.g. for a fault: throw, heave, slip vector, sense).
  - Whether each value was stated or inferred.

### 7.2 Measurement-origin overlays

This subsection enforces the core principle from §3. For every annotated measurement, the annotation layer must render an associated **geometric overlay** showing how the measurement is defined:

| Annotation        | Overlay components                                                                                                                                |
|-------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| Dip angle         | Translucent horizontal reference plane through the dip vertex; arc connecting horizontal to dipping plane; value floating inside arc.             |
| Dip direction     | Compass rose at vertex; horizontal projection of the steepest descent line; arc from north to the projection; value inside arc.                   |
| Strike            | Horizontal line on the plane; small compass rose; arc from north to strike; value inside arc.                                                     |
| Layer thickness   | Two reference planes on the layer's upper and lower contacts; perpendicular measurement vector between them; value along the vector.              |
| Fault throw       | Vertical dashed line at the fault; pre-fault datum reconstructed (dashed) on both walls; throw value labelled on the vertical between them.       |
| Fault heave       | Horizontal dashed line at the fault; same datum reconstruction; heave value labelled on the horizontal.                                           |
| Slip vector       | Arrow on the fault plane from a hanging-wall point to its footwall counterpart along the slip direction; rake annotated as an arc.                |
| Fold plunge       | Hinge line shown explicitly; horizontal projection; vertex; arc with value.                                                                       |
| Interlimb angle   | Both limbs visualised as semi-transparent planes converging at the hinge; arc spanning the angle between them; value inside arc.                  |
| Vein width        | Two vein walls as parallel surfaces; perpendicular vector between them; value along the vector.                                                   |

These overlays are part of the same toggle as the labels. They are the visual mechanism by which the application teaches.

### 7.3 Per-feature label content

Following reference document §17:

| Feature class    | Primary label                            | Secondary fields (on click)                                          |
|------------------|------------------------------------------|----------------------------------------------------------------------|
| Layer            | Rock name + age                          | Thickness, lithology code, age range (Ma), notes                     |
| Fault            | Fault type + dip° / dip direction        | Throw, heave, slip vector, sense, displacement (m)                   |
| Fold             | Fold type + plunge° / plunge direction   | Interlimb angle, axial plane orientation, wavelength                 |
| Joint            | Joint type + strike°                     | Aperture, spacing, set ID                                            |
| Vein             | Mineral + strike° / dip°                 | Width, grade if known, vein generation                               |
| Unconformity     | Type + time gap (Ma)                     | Underlying / overlying ages, angular discordance                     |
| Intrusion        | Rock type + body type                    | Age, depth of emplacement, area                                      |
| Ore body         | Deposit type + grade                     | Tonnage, ore minerals, structural control                            |
| Alteration zone  | Alteration name                          | Mineral assemblage, distance from source, intensity                  |
| Tectonic setting | Setting name                             | Era of activity, principal stress orientation                        |

---

## 8. GeoModel JSON schema

This mirrors §18 of the reference document and is reproduced here so the spec can stand alone. The schema is the contract between the interpreter (writer), the manual editor (writer), and the renderer (reader).

### 8.1 Top-level structure

```json
{
  "version": "1.0",
  "meta": { "name": "...", "description": "...", "location": "...", "tectonic_setting": "..." },
  "scale": { "x": 1000, "y": 1000, "z": 500, "units": "m" },
  "layers": [ /* Layer objects, ordered bottom to top */ ],
  "events": [ /* Event objects, ordered oldest to youngest */ ],
  "intrusions": [ /* Intrusion objects */ ],
  "mineralisation": [ /* Mineralisation objects */ ],
  "view": { "camera": {...}, "lighting": {...}, "grid": true }
}
```

### 8.2 Common fields on every object

Every layer, event, intrusion, and mineralisation entry carries:

- `id` — unique identifier
- `description_source` — the user's original sentence
- `field_origin` — map of `{ field_name: "stated" | "inferred" }` so the annotation layer can render inferred values distinctly

### 8.3 Layer, Event, Mineralisation objects

Field-by-field definitions follow §18 of the reference document. The interpreter and editor must produce JSON that validates against these definitions.

---

## 9. User interaction model

### 9.1 The three views

1. **Description view** — the text input pane. The user writes here.
2. **3D model view** — the rendered geology with toggleable annotations and measurement overlays.
3. **Inspector panel** — opens when a feature is clicked; shows source sentence, all fields, stated/inferred status, and edit controls.

### 9.2 The two ways to change the model

#### Path A: Edit the description

The user edits the plain-English text. The interpreter re-parses (incrementally where possible) and updates the JSON. The 3D view re-renders.

#### Path B: Edit the model directly

The user manipulates the 3D model:

- Drag a fault plane to change its dip or strike.
- Drag a layer contact to change thickness.
- Rotate a fold limb to change interlimb angle.
- Set a precise numeric value via the inspector panel.

Direct edits write back to the JSON. The `description_source` field is preserved; an additional `manually_edited: true` flag is set on any field the user has overridden. The user's original sentence is **not** rewritten — the spec deliberately keeps the written description as a historical record of the student's first attempt.

### 9.3 Toggleable controls

- Labels on / off
- Measurement-origin overlays on / off (separate from labels, so the student can see clean labels first, then add the geometric overlays)
- Geological history playback — step through events from oldest to youngest, watching each one apply to the model in sequence
- Grid and north arrow on / off

---

## 10. Deferred decisions

Items consciously postponed. Each has a placeholder so it can be slotted in later without restructuring the spec.

| Item                                    | Status        | Where it will plug in                                                                |
|-----------------------------------------|---------------|--------------------------------------------------------------------------------------|
| Mineralisation prediction               | Deferred      | New §11 "Prediction" + extension to the interpreter's behaviour in §6.5             |
| Error testing and ambiguity dialogue    | Deferred      | Extension to §6.4                                                                    |
| Persistence and saving                  | Deferred      | New §12 "Persistence and export"                                                     |
| Quizzes / interpretation feedback       | Excluded      | Will not be added unless the project's scope changes                                 |
| General-public audience mode            | Excluded      | Will not be added                                                                    |
| Authoritative-source rule for reference | Excluded      | Reference document is editable working knowledge, not a frozen contract              |

---

## 11. Open questions

To be resolved before implementation begins:

1. **Coordinate system convention** — the reference document uses geological conventions (strike 0–360°, dip 0–90°). Confirm the 3D engine's world axes and the mapping from geological coordinates to render coordinates.
2. **Scale and units** — does the model auto-scale based on the user's description (e.g. "a 200 m thick layer"), or does the user set the model's bounding box up front?
3. **Interpreter implementation** — LLM call per input change, or a more deterministic rule-based parser with LLM fallback? Affects latency and predictability.
4. **Annotation density at scale** — when a model has dozens of features, label collision becomes severe. The priority order in §7.1 helps but may need a clustering or level-of-detail strategy.
5. **Sentence-to-event mapping granularity** — does each sentence produce exactly one event, or can a single sentence produce several (e.g. "A series of three parallel normal faults offsets the sequence")?

---

## 12. Document changelog

| Version | Date       | Changes                                    |
|---------|------------|--------------------------------------------|
| 0.1     | 2026-05-14 | Initial draft from discussion with Steven. |
