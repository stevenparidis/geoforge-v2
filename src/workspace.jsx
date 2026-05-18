/* GeoForge — Workspace view (Deliverable 1).
 *
 * Three panes:
 *   - Left: plain-English description input + interpret button
 *   - Centre: 3D model with toolbar overlay + timeline scrubber
 *   - Right: inspector (collapsible; shows feature fields when selected,
 *     otherwise lists features and inference notices)
 *
 * The interpreter is a window.claude.complete call (Haiku 4.5; the spec's
 * claude-sonnet-4-20250514 is not available in this environment — see README).
 */

(function () {
  const { useState, useRef, useMemo, useCallback, useEffect } = React;

  const INTERPRETER_SYSTEM_PROMPT = `You are GeoForge's geological interpreter. Convert a plain-English geological description from a first- or second-year geology student into a strict GeoModel JSON.

OUTPUT: a single JSON object, no prose, no markdown. The first character must be { and the last }.

SCHEMA:
{
  "meta": { "name": string, "description": string },
  "layers": [
    {
      "id": string, "name": string,
      "lithology": one of [sandstone, mudstone, shale, conglomerate, limestone, chalk, dolostone, chert, coal, granite, diorite, gabbro, basalt, rhyolite, schist, gneiss, quartzite, marble, slate],
      "thickness": number (units between 0.3 and 2.0),
      "order": int 0..N (bottom=0),
      "description_source": string (the sentence that produced this layer),
      "field_origin": { "thickness": "stated"|"inferred", "lithology": "stated"|"inferred" }
    }, ...
  ],
  "events": [
    {
      "id": string, "type": "fault"|"fold",
      "subtype": for fault one of [normal, reverse, thrust, strike-slip, oblique, listric];
                 for fold one of [anticline, syncline, monocline],
      "strike": 0..360 (faults only),
      "dip":    0..90  (faults only),
      "dip_direction": 0..360 (faults only),
      "throw":  number (faults; in same units as thickness, optional),
      "heave":  number (faults; optional),
      "displacement": number (strike-slip; optional),
      "sense":  "dextral"|"sinistral" (strike-slip only, optional),
      "rake":   0..90 (oblique only, optional),
      "dip_at_depth": number (listric only, optional),
      "detachment_depth": number (listric only, optional — vertical depth to detachment),
      "axis_strike": 0..360 (folds only),
      "plunge":   0..90 (folds only),
      "plunge_direction": 0..360 (folds only),
      "interlimb_angle": 0..180 (folds; not monocline),
      "amplitude": number (folds, default 1.0),
      "wavelength": number (folds, default 4.0),
      "flexure_dip": number (monocline only),
      "flexure_width": number (monocline only),
      "step_height": number (monocline only),
      "order": int (sequence; first event=0),
      "description_source": string,
      "field_origin": { fieldName: "stated"|"inferred" },
      "validation_note": string (optional) — set this when you detect a geological inconsistency per the VALIDATION RULES section below. Leave absent when input is consistent.
    }, ...
  ],
  "tilt": {
    "strike": 0..360, "dip": 0..90, "dip_direction": 0..360,
    "field_origin": { ... }
  },  // optional; only if the layer cake itself is tilted (e.g. "the beds dip 20° east")
  "intrusions": [   // optional; omit if none mentioned
    {
      "id": string,
      "subtype": one of [dyke, sill, batholith, laccolith],
      "rock_type": one of [granite, diorite, gabbro, basalt, rhyolite] (default basalt for mafic, granite for felsic),
      "strike": 0..360 (dyke/sill orientation; omit for batholith/laccolith),
      "dip": 0..90 (dyke ~90, sill ~0; omit for batholith/laccolith),
      "thickness": number (apparent width in model units, default 0.5),
      "depth": number (emplacement depth below surface in model units; for batholith/laccolith),
      "description_source": string,
      "field_origin": { fieldName: "stated"|"inferred" }
    }, ...
  ],
  "unconformities": [   // optional; omit if none mentioned
    {
      "id": string,
      "subtype": one of [angular, disconformity, nonconformity],
      "above_layer_id": string (id of the layer immediately above the surface; match a layer id),
      "below_layer_id": string (id of the layer immediately below the surface; match a layer id),
      "time_gap_ma": number (millions of years; default 10 if not stated),
      "angular_discordance": number (degrees difference in dip between layers; for angular type only; default 30 if not stated),
      "description_source": string,
      "field_origin": { fieldName: "stated"|"inferred" }
    }, ...
  ],
  "mineralisation": [   // optional; omit if none mentioned
    {
      "id": string,
      "subtype": one of [porphyry, orogenic_gold, vms, skarn, epithermal],
      "metals": string (primary commodities e.g. "Cu-Au", "Au", "Zn-Pb-Cu", "Au-Ag"; inferred from subtype if not stated),
      "grade": number or null (g/t Au for gold types, % for base metals; omit if not stated),
      "structural_control_event_id": string (optional; id of the fault, fold, or intrusion that controls the deposit geometry; match an existing id),
      "depth_top": number (depth from surface to top of mineralisation in model units; optional),
      "alteration_radius": number (radius of alteration halo in model units; inferred from subtype if not stated),
      "five_elements": {
        "heat_source": string,
        "fluid_source": string,
        "metal_source": string,
        "pathway": string,
        "trap": string
      },
      "description_source": string,
      "field_origin": { fieldName: "stated"|"inferred" }
    }, ...
  ]
}

TRIGGER PHRASE LIBRARY (for classification — incomplete by design):
- Normal fault: "dropped down", "hanging wall fell", "down-thrown", "extensional", "rift", "basin-bounding"
- Reverse fault: "thrust up", "shortening", "compressional", "hanging wall is up", "up-thrown"
- Thrust fault: "low-angle thrust", "overthrust", "nappe", "thrust sheet", "shallow-dipping reverse"
- Strike-slip sinistral: "left-lateral", "sinistral", "east side moved south"
- Strike-slip dextral: "right-lateral", "dextral", "east side moved north"
- Oblique-slip: combination of vertical + horizontal motion
- Listric: "curved fault", "flattens at depth", "shovel-shaped", "rotational"
- Anticline: "arches up", "upfold", "oldest rocks in middle", "dome up", "crest"
- Syncline: "bowl-shaped", "downfold", "youngest rocks in centre", "trough"
- Monocline: "one-sided flexure", "step-like bend", "single dip panel", "flexure"
- Horizontal strata: "flat-lying beds", "undeformed layers", "horizontal bedding"
- Dipping strata: "beds dip", "tilted layers", "inclined bedding"
- Dyke: "vertical intrusion", "crosscutting sheet", "discordant intrusion", "the granite cuts the layers", "intrudes across bedding"
- Sill: "flat intrusion", "intrusion parallel to bedding", "concordant sheet", "injected along bedding", "horizontal intrusion"
- Batholith: "large granite mass", "pluton", "big intrusive body", "the granite basement", "granitoid body"
- Laccolith: "dome-roofed intrusion", "mushroom intrusion", "the intrusion pushed the layers up into a dome", "doming intrusion"
- Angular unconformity: "tilted beds cut by horizontal beds", "angular discordance", "break in the record at an angle", "dipping strata overlain by flat strata"
- Disconformity: "erosion surface between parallel beds", "time gap", "missing strata", "parallel unconformity", "hiatus between parallel layers"
- Nonconformity: "sediments resting on basement", "sediments on top of granite", "basement contact", "sediments deposited on igneous rock"
- Porphyry: "porphyry copper", "porphyry gold", "Cu-Au porphyry", "porphyritic intrusion with ore", "concentric alteration zones", "stockwork mineralisation"
- Orogenic gold: "orogenic gold", "gold in quartz veins", "lode gold", "mesothermal gold", "gold in shear zone", "gold-bearing veins"
- VMS: "volcanic-hosted massive sulphide", "VMS deposit", "submarine massive sulphide", "seafloor sulphide", "kuroko-type"
- Skarn: "skarn", "contact metasomatic", "garnet-pyroxene ore zone", "ore at igneous contact", "calc-silicate deposit"
- Epithermal: "epithermal gold", "epithermal silver", "low-sulphidation", "high-sulphidation", "hot spring gold", "shallow volcanic gold"

DEFAULTS (use when a value is missing and mark it inferred):
- Normal fault dip = 60°
- Reverse fault dip = 45°
- Thrust fault dip = 25°
- Strike-slip fault dip = 90° (vertical)
- Listric: dip = 70° at surface, dip_at_depth = 10°, detachment_depth = half of total layer thickness
- Normal fault throw = 0.5 if not stated; mark throw and heave as "inferred" in field_origin
- Reverse fault throw = 0.3 if not stated; mark throw and heave as "inferred" in field_origin
- Thrust fault throw = 0.2 if not stated; mark throw and heave as "inferred" in field_origin
- Strike-slip fault throw = 0; displacement is the measured quantity for strike-slip
- Fold plunge = 0° (non-plunging)
- Layer thickness when not stated = 1.0
- Order events in the order they appear in the user's text.
- Dyke dip = 90° (vertical), thickness = 0.5, rock_type = basalt if not specified
- Sill dip = 0° (horizontal), thickness = 0.3, rock_type = basalt if not specified
- Batholith: no strike/dip (it is a pluton), rock_type = granite if not specified, depth = total_layer_thickness
- Laccolith: no strike/dip, rock_type = granite if not specified, depth = total_layer_thickness / 2
- Unconformity time_gap_ma = 10 if not stated; angular_discordance = 30 for angular type if not stated
- Porphyry: metals = "Cu-Au", alteration_radius = 1.0
- Orogenic gold: metals = "Au", alteration_radius = 0.3
- VMS: metals = "Zn-Pb-Cu", alteration_radius = 0.5
- Skarn: metals = "Fe-Cu", alteration_radius = 0.4
- Epithermal: metals = "Au-Ag", alteration_radius = 0.5
- five_elements: all five fields inferred generically from subtype when not stated

RULES:
- Be SILENT — never ask the user, never include caveats. Best-guess and flag inferred.
- Compass bearings are degrees clockwise from north. "east" = 90, "north" = 0, "south" = 180, "west" = 270.
- "the beds dip east" → tilt.dip_direction = 90; strike perpendicular = 0 (north-south).
- "the layers tip down to the east at 30°" → tilt.dip = 30, dip_direction = 90.
- For every field, set field_origin to "stated" if the user said the number explicitly, otherwise "inferred".
- description_source must quote the original sentence verbatim.
- Output ONLY the JSON.

MERGE MODE:
When the user message contains "Changed sentences", you must return ONLY the
layers and events derived from those changed sentences, plus any layers/events
that need to be removed (listed by id).

Output shape in merge mode:
{
  "merge": true,
  "upsert_layers": [...],
  "upsert_events": [...],
  "remove_layer_ids": [...],
  "remove_event_ids": [...]
}

Match modified sentences by their description_source to find the existing id
to reuse. Added sentences get fresh ids.

In all other respects (defaults, field_origin flags, description_source
quoting), behave identically to full mode.

VALIDATION RULES:

When you detect an inconsistency between the user's stated values and standard
structural geology, do NOT silently rewrite the user's input. Instead, populate
a \`validation_note\` field on the affected feature with a one-sentence
explanation.

Specifically:
- Thrust with dip > 45°: set validation_note, render as stated.
- Normal fault with HW physically above FW after slip: validation_note explaining the mismatch.
- Anticline with younger rocks toward the core: validation_note asking whether the user meant a syncline.
- Intrusion with order < any layer it cuts: validation_note explaining the cross-cutting age violation.
- Strike + dip_direction violating right-hand rule (dip_direction should = (strike+90)%360 within ±10°): validation_note.

In every case, render the model AS THE USER DESCRIBED IT. The validation_note
appears in the inspector as a warning but does not block the render.

EXPLANATION GENERATION:

After producing the model JSON, generate two additional plain-English fields:

1. model.meta.explanation: a 1-3 sentence summary of the model, used in the
   "Was this what you meant?" strip in the UI. Bold key structural terms with **term**.

2. Per feature, feature.explanation: a 1-2 sentence description of what
   the feature is and why its values matter. Used in the inspector.

Keep both explanations plain. Avoid jargon the user did not use. Use the
miner's-lantern phrasing for HW/FW (you hang a lantern on the hanging wall).

MISCONCEPTION AVOIDANCE:

Watch for and avoid reinforcing these common student misconceptions:

1. Hanging wall is always on the left/right of a fault. (No — depends on
   dip_direction; render as the user described.)
2. Anticline vs syncline is about shape only. (No — it is about stratigraphic
   age; oldest rocks in core = anticline, youngest = syncline.)
3. Strike and dip are independent. (Related by right-hand rule.)
4. Throw and displacement are the same. (Throw = vertical; displacement =
   total slip; emit both.)

When the user's description is ambiguous, prefer the interpretation that
avoids reinforcing one of these misconceptions.`;

  const PREDICTION_SYSTEM_PROMPT = `You are GeoForge's geological prediction engine. Given a GeoModel JSON, suggest up to 3 plausible mineral deposit types that could form given the structural setting.

OUTPUT: a JSON array only — no prose, no markdown. First character must be [ and last must be ].

Each element:
{
  "id": "P1"|"P2"|"P3",
  "subtype": one of [porphyry, orogenic_gold, vms, skarn, epithermal],
  "metals": string (e.g. "Cu-Au", "Au", "Zn-Pb-Cu"),
  "rationale": string (one sentence explaining why this deposit type fits the structural context),
  "confidence": "high"|"medium"|"low",
  "alteration_radius": number (default 0.8),
  "predicted": true,
  "five_elements": {
    "heat_source": string,
    "fluid_source": string,
    "metal_source": string,
    "pathway": string,
    "trap": string
  }
}

Base your predictions on: fault types (normal→rift settings, thrust→orogenic gold), intrusion types (batholith/porphyry→porphyry Cu, sill→skarn potential), lithologies (limestone→skarn, volcanic→VMS/epithermal), and structural traps (fold hinges, fault intersections).

If the model has no structural features to guide prediction, return an empty array [].`;

  function applyDefaults(model) {
    // Patch any missing required fields with sensible defaults.
    if (!model.meta) model.meta = { name: 'Untitled', description: '' };
    if (!model.layers) model.layers = [];
    if (!model.events) model.events = [];
    if (!model.intrusions) model.intrusions = [];
    if (!model.unconformities) model.unconformities = [];
    if (!model.mineralisation) model.mineralisation = [];
    model.layers.forEach((L, i) => {
      L.id = L.id || `L${i + 1}`;
      L.order = L.order ?? i;
      L.thickness = clamp(L.thickness ?? 1.0, 0.2, 3.0);
      L.field_origin = L.field_origin || {};
    });
    model.events.forEach((E, i) => {
      E.id = E.id || `E${i + 1}`;
      E.order = E.order ?? i;
      E.field_origin = E.field_origin || {};
      // Clamp huge displacements (LLM may emit raw metres while our units are 0-2 range)
      const clampDisp = (v) => {
        if (v == null) return v;
        if (Math.abs(v) > 3) {
          // Scale by factor implied by max layer thickness
          const total = (model.layers || []).reduce((s, L) => s + L.thickness, 0) || 3;
          return Math.sign(v) * Math.min(2.5, Math.abs(v) / (Math.abs(v) > 50 ? 50 : 10)) * (total / 3);
        }
        return v;
      };
      if (E.throw != null) E.throw = clampDisp(E.throw);
      if (E.heave != null) E.heave = clampDisp(E.heave);
      if (E.displacement != null) E.displacement = clampDisp(E.displacement);
      if (E.type === 'fault') {
        const def = window.GD.DEFAULTS.fault_dip[E.subtype] || 60;
        if (E.dip == null) { E.dip = def; E.field_origin.dip = 'inferred'; }
        if (E.dip_direction == null) { E.dip_direction = 90; E.field_origin.dip_direction = 'inferred'; }
        if (E.strike == null) { E.strike = (E.dip_direction + 90) % 360; E.field_origin.strike = 'inferred'; }
        if (E.subtype === 'strike-slip' && E.displacement == null) { E.displacement = 1.0; E.field_origin.displacement = 'inferred'; }
        if (E.subtype === 'listric') {
          const modelTotalHeight = (model.layers || []).reduce((s, L) => s + (L.thickness ?? 1.0), 0);
          if (E.dip_at_depth == null) { E.dip_at_depth = 10; E.field_origin.dip_at_depth = 'inferred'; }
          if (E.detachment_depth == null) { E.detachment_depth = modelTotalHeight / 2; E.field_origin.detachment_depth = 'inferred'; }
        }
      }
      if (E.type === 'fold') {
        if (E.axis_strike == null) { E.axis_strike = 0; E.field_origin.axis_strike = 'inferred'; }
        if (E.plunge == null) { E.plunge = 0; E.field_origin.plunge = 'inferred'; }
        if (E.plunge_direction == null) { E.plunge_direction = E.axis_strike; E.field_origin.plunge_direction = 'inferred'; }
        if (E.subtype !== 'monocline') {
          if (E.interlimb_angle == null) { E.interlimb_angle = 110; E.field_origin.interlimb_angle = 'inferred'; }
          E.amplitude = E.amplitude ?? 1.0;
          E.wavelength = E.wavelength ?? 4.0;
        } else {
          if (E.flexure_dip == null) { E.flexure_dip = 30; E.field_origin.flexure_dip = 'inferred'; }
          if (E.flexure_width == null) { E.flexure_width = 1.2; E.field_origin.flexure_width = 'inferred'; }
          if (E.step_height == null) { E.step_height = 0.8; E.field_origin.step_height = 'inferred'; }
        }
      }
    });
    const totalLayerHeight = (model.layers || []).reduce((s, L) => s + (L.thickness ?? 1.0), 0) || 3;
    model.intrusions.forEach((I, i) => {
      I.id = I.id || `I${i + 1}`;
      I.field_origin = I.field_origin || {};
      if (I.thickness == null) { I.thickness = I.subtype === 'sill' ? 0.3 : 0.5; I.field_origin.thickness = 'inferred'; }
      if (I.subtype === 'dyke') {
        if (I.dip == null) { I.dip = 90; I.field_origin.dip = 'inferred'; }
        if (I.strike == null) { I.strike = 0; I.field_origin.strike = 'inferred'; }
        if (I.rock_type == null) { I.rock_type = 'basalt'; I.field_origin.rock_type = 'inferred'; }
      }
      if (I.subtype === 'sill') {
        if (I.dip == null) { I.dip = 0; I.field_origin.dip = 'inferred'; }
        if (I.strike == null) { I.strike = 0; I.field_origin.strike = 'inferred'; }
        if (I.rock_type == null) { I.rock_type = 'basalt'; I.field_origin.rock_type = 'inferred'; }
      }
      if (I.subtype === 'batholith' || I.subtype === 'laccolith') {
        if (I.rock_type == null) { I.rock_type = 'granite'; I.field_origin.rock_type = 'inferred'; }
        if (I.depth == null) {
          I.depth = I.subtype === 'batholith' ? totalLayerHeight : totalLayerHeight / 2;
          I.field_origin.depth = 'inferred';
        }
      }
    });
    model.unconformities.forEach((U, i) => {
      U.id = U.id || `U${i + 1}`;
      U.field_origin = U.field_origin || {};
      if (U.time_gap_ma == null) { U.time_gap_ma = 10; U.field_origin.time_gap_ma = 'inferred'; }
      if (U.subtype === 'angular' && U.angular_discordance == null) {
        U.angular_discordance = 30; U.field_origin.angular_discordance = 'inferred';
      }
    });
    const MINERAL_DEFAULTS = {
      porphyry:      { metals: 'Cu-Au',    alteration_radius: 1.0 },
      orogenic_gold: { metals: 'Au',       alteration_radius: 0.3 },
      vms:           { metals: 'Zn-Pb-Cu', alteration_radius: 0.5 },
      skarn:         { metals: 'Fe-Cu',    alteration_radius: 0.4 },
      epithermal:    { metals: 'Au-Ag',    alteration_radius: 0.5 },
    };
    const FIVE_ELEMENTS_DEFAULTS = {
      porphyry:      { heat_source: 'Porphyritic intrusion', fluid_source: 'Magmatic + meteoric water', metal_source: 'Magmatic source', pathway: 'Stockwork fractures', trap: 'Cooling and boiling zone' },
      orogenic_gold: { heat_source: 'Metamorphic heat', fluid_source: 'Metamorphic fluids', metal_source: 'Crustal source', pathway: 'Shear zones and veins', trap: 'Pressure-temperature drop' },
      vms:           { heat_source: 'Seafloor volcanism', fluid_source: 'Seawater + magmatic', metal_source: 'Volcanic rocks', pathway: 'Hydrothermal vents', trap: 'Seafloor interface' },
      skarn:         { heat_source: 'Intrusive body', fluid_source: 'Magmatic fluids', metal_source: 'Intrusion and carbonate', pathway: 'Contact zone fractures', trap: 'Reactive carbonate host' },
      epithermal:    { heat_source: 'Shallow magma body', fluid_source: 'Meteoric + magmatic water', metal_source: 'Hydrothermal fluids', pathway: 'Fault and vein systems', trap: 'Boiling zone' },
    };
    model.mineralisation.forEach((M, i) => {
      M.id = M.id || `M${i + 1}`;
      M.field_origin = M.field_origin || {};
      const mDef = MINERAL_DEFAULTS[M.subtype] || {};
      if (M.alteration_radius == null) {
        M.alteration_radius = mDef.alteration_radius || 0.5;
        M.field_origin.alteration_radius = 'inferred';
      }
      if (M.metals == null) {
        M.metals = mDef.metals || 'Au';
        M.field_origin.metals = 'inferred';
      }
      if (!M.five_elements || Object.keys(M.five_elements).length === 0) {
        const feDef = FIVE_ELEMENTS_DEFAULTS[M.subtype] || {};
        M.five_elements = {};
        for (const key of ['heat_source', 'fluid_source', 'metal_source', 'pathway', 'trap']) {
          M.five_elements[key] = feDef[key] || '';
          if (!M.field_origin['five_' + key]) M.field_origin['five_' + key] = 'inferred';
        }
      }
    });

    // C.4.a: Validate thrust/reverse dip consistency
    for (const evt of (model.events || [])) {
      if (evt.type !== 'fault') continue;
      if (evt.validation_note) continue; // don't overwrite if LLM already set one
      if (evt.subtype === 'thrust' && evt.dip != null && evt.dip > 45) {
        evt.validation_note = `Thrust faults dip ≤45° by definition. The stated dip of ${evt.dip}° is more typical of a reverse fault.`;
      } else if (evt.subtype === 'reverse' && evt.dip != null && evt.dip <= 30) {
        evt.validation_note = `Reverse faults with dip ≤30° are usually classified as thrusts. Consider 'thrust' if the structural context fits.`;
      }
    }

    // C.5.b: Additional validation checks
    for (const evt of (model.events || [])) {
      if (evt.type !== 'fault') continue;
      if (evt.validation_note) continue; // first rule wins
      // Right-hand rule check — only fire when both fields were explicitly stated by the user
      if (
        evt.strike != null && evt.dip_direction != null &&
        evt.field_origin?.strike === 'stated' && evt.field_origin?.dip_direction === 'stated'
      ) {
        const expected = (evt.strike + 90) % 360;
        const diff = Math.abs(((evt.dip_direction - expected) + 540) % 360 - 180);
        if (diff > 10) {
          evt.validation_note = `Strike ${evt.strike}° and dip direction ${evt.dip_direction}° violate the right-hand rule. By convention, dip direction = (strike + 90°) mod 360°, which gives ${expected}°.`;
        }
      }
    }

    // C.5.b: Fold validation (anticline/syncline age at core)
    for (const evt of (model.events || [])) {
      if (evt.type !== 'fold') continue;
      if (evt.validation_note) continue;
      // If user explicitly states youngest rocks are in core of an anticline
      if (evt.subtype === 'anticline' && evt.core_age === 'youngest') {
        evt.validation_note = 'Anticlines have the oldest rocks in the core. If youngest rocks are in the core, this is a syncline by definition.';
      } else if (evt.subtype === 'syncline' && evt.core_age === 'oldest') {
        evt.validation_note = 'Synclines have the youngest rocks in the core. If oldest rocks are in the core, this is an anticline by definition.';
      }
    }

    return model;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  async function interpret(description, onErr) {
    try {
      const raw = await window.claude.complete({
        messages: [{ role: 'user', content: `Description:\n"""${description}"""\n\nReturn the GeoModel JSON only.` }],
        system: INTERPRETER_SYSTEM_PROMPT,
      });
      // Extract JSON
      let txt = raw.trim();
      // Strip markdown fences
      txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      const i0 = txt.indexOf('{');
      const i1 = txt.lastIndexOf('}');
      if (i0 < 0 || i1 < 0) throw new Error('No JSON object found in response');
      const json = JSON.parse(txt.slice(i0, i1 + 1));
      return applyDefaults(json);
    } catch (e) {
      onErr?.(e.message || String(e));
      return null;
    }
  }

  async function predict(model, onErr) {
    try {
      const raw = await window.claude.complete({
        messages: [{ role: 'user', content: `GeoModel:\n\`\`\`json\n${JSON.stringify(model)}\n\`\`\`\n\nSuggest mineral deposits for this structural setting.` }],
        system: PREDICTION_SYSTEM_PROMPT,
      });
      let txt = raw.trim();
      txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      const i0 = txt.indexOf('[');
      const i1 = txt.lastIndexOf(']');
      if (i0 < 0 || i1 < 0) throw new Error('No JSON array in response');
      return JSON.parse(txt.slice(i0, i1 + 1));
    } catch (e) {
      onErr?.(e.message || String(e));
      return null;
    }
  }

  function Toast({ message, onDismiss }) {
    return (
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--bg-2, #1e1e2e)', color: 'var(--fg-1, #cdd6f4)',
        border: '1px solid var(--red, #f38ba8)', borderRadius: 8,
        padding: '10px 16px', zIndex: 9999, display: 'flex', gap: 12, alignItems: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)', maxWidth: 480, fontSize: 13,
      }}>
        <span style={{ flex: 1 }}>{message}</span>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}>✕</button>
      </div>
    );
  }

  async function interpretMerge(model, diff, setError) {
    const changedSentences = [
      ...diff.modified.map((m, i) => `${i + 1}. "${m.after.text}"`),
      ...diff.added.map((a, i) => `${diff.modified.length + i + 1}. "${a.text}"`),
    ].join('\n');

    const removedSentences = diff.removed.map(r => `- "${r.text}"`).join('\n');

    // Strip description_source from events not in scope to reduce prompt size
    const contextModel = JSON.parse(JSON.stringify(model));
    const changedFingerprints = new Set([
      ...diff.modified.map(m => m.before.fingerprint),
      ...diff.added.map(a => a.fingerprint),
    ]);
    (contextModel.events || []).forEach(e => {
      const fp = window.GeoDiff.fingerprintSentence(e.description_source || '');
      if (!changedFingerprints.has(fp)) delete e.description_source;
    });

    const userMessage = [
      'Existing model:',
      JSON.stringify(contextModel, null, 2),
      '',
      'Changed sentences:',
      changedSentences,
      removedSentences ? `\nRemoved sentences:\n${removedSentences}` : '',
    ].filter(Boolean).join('\n');

    try {
      const result = await window.claude.complete({
        messages: [{ role: 'user', content: userMessage }],
        system: INTERPRETER_SYSTEM_PROMPT,
      });
      const json = JSON.parse(result.match(/\{[\s\S]*\}/)[0]);
      if (!json.merge) throw new Error('Not a merge response');
      return json;
    } catch (err) {
      setError('Interpreter couldn\'t read that. Try again, or rephrase.');
      return null;
    }
  }

  function mergeIntoModel(existingModel, mergeResp, diff) {
    const next = JSON.parse(JSON.stringify(existingModel));

    // Sentences whose originating event should be cleared of manual edits
    const modifiedFingerprints = new Set(diff.modified.map(m => m.before.fingerprint));
    const removedFingerprints = new Set(diff.removed.map(r => r.fingerprint));

    // Remove events whose originating sentence was removed
    next.events = (next.events || []).filter(e => {
      const fp = window.GeoDiff.fingerprintSentence(e.description_source || '');
      return !removedFingerprints.has(fp);
    });

    // Remove layers by id
    (mergeResp.remove_layer_ids || []).forEach(id => {
      next.layers = (next.layers || []).filter(l => l.id !== id);
    });

    // Upsert events
    (mergeResp.upsert_events || []).forEach(upsertEvt => {
      const existingIdx = (next.events || []).findIndex(e => e.id === upsertEvt.id);
      if (existingIdx >= 0) {
        const existing = next.events[existingIdx];
        const fp = window.GeoDiff.fingerprintSentence(existing.description_source || '');
        if (modifiedFingerprints.has(fp)) {
          // Originating sentence was edited — new interpretation wins, clear manual edits
          next.events[existingIdx] = upsertEvt;
        } else {
          // Preserve manually_edited fields whose values are unchanged
          const merged = Object.assign({}, upsertEvt);
          if (existing.manually_edited) {
            merged.manually_edited = true;
            // Restore the values of manually-edited fields from the existing event
            const fieldOrigin = existing.field_origin || {};
            Object.keys(fieldOrigin).forEach(field => {
              if (fieldOrigin[field] === 'stated' && existing.manually_edited) {
                merged[field] = existing[field];
                if (!merged.field_origin) merged.field_origin = {};
                merged.field_origin[field] = 'stated';
              }
            });
          }
          next.events[existingIdx] = merged;
        }
      } else {
        next.events = next.events || [];
        next.events.push(upsertEvt);
      }
    });

    // Upsert layers
    (mergeResp.upsert_layers || []).forEach(upsertLayer => {
      const existingIdx = (next.layers || []).findIndex(l => l.id === upsertLayer.id);
      if (existingIdx >= 0) {
        next.layers[existingIdx] = upsertLayer;
      } else {
        next.layers = next.layers || [];
        next.layers.push(upsertLayer);
      }
    });

    return applyDefaults(next);
  }

  // ---- Inspector helpers ----
  function FieldRow({ label, value, unit, inferred, onChange, source }) {
    return (
      <div className="field">
        <div className="field-label">
          {label}
          {inferred && <span style={{ marginLeft: 8 }}><span className="inferred-pill">inferred</span></span>}
        </div>
        <div className={'field-value' + (inferred ? ' inferred' : '')}>
          {onChange ? (
            <input className="num-input" type="number" value={value} step={1}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
          ) : (
            <span>{value}</span>
          )}
          {unit && <span className="unit">{unit}</span>}
        </div>
        {source && <div className="source-quote">"{source}"</div>}
      </div>
    );
  }

  // ---- Workspace ----
  function Workspace({
    model, setModel,
    description, setDescription,
    showLabels, showOverlays, showGrid,
  }) {
    const [interpreting, setInterpreting] = useState(false);
    const [predicting, setPredicting] = useState(false);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null); // { kind: 'layer'|'event', id }
    const [inspectorOpen, setInspectorOpen] = useState(true);

    // History playback
    const eventCount = (model?.events || []).length;
    const [historyIdx, setHistoryIdx] = useState(eventCount); // count = current/final state
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);

    useEffect(() => {
      setHistoryIdx((model?.events || []).length);
    }, [model?.events?.length]);

    // Auto-play
    useEffect(() => {
      if (!playing) return;
      const total = (model?.events || []).length;
      if (historyIdx >= total) { setPlaying(false); return; }
      const dur = 1400 / speed;
      const t = setTimeout(() => setHistoryIdx((i) => Math.min(total, i + 1)), dur);
      return () => clearTimeout(t);
    }, [playing, historyIdx, speed, model]);

    const playbackModel = useMemo(() => {
      if (!model) return null;
      // Slice events to first `historyIdx` events; layers always present.
      // If historyIdx===0: layers only, no events.
      return {
        ...model,
        events: (model.events || []).slice(0, historyIdx),
      };
    }, [model, historyIdx]);

    // Auto-fit camera by computing reasonable hint from model
    const cameraHint = useMemo(() => {
      if (!model) return { phi: 1.05, theta: 0.6, dist: 10 };
      const evt = (model.events || [])[0];
      if (!evt) return { phi: 1.05, theta: 0.6, dist: 10 };
      if (evt.type === 'fault') {
        if (evt.subtype === 'strike-slip') return { phi: 1.4, theta: 0.0, dist: 10 };
        return { phi: 1.15, theta: 0.0, dist: 10 };
      }
      return { phi: 1.1, theta: 0.4, dist: 11 };
    }, [model?.events?.[0]?.subtype]);

    // Test hooks — expose current model and a way to set the selection from outside.
    // These are used by smoke tests; they are no-ops in production (window.__ are undefined).
    useEffect(() => {
      window.__lastModel = model;
    }, [model]);
    useEffect(() => {
      window.__setSelected = (sel) => setSelected(sel);
      return () => { window.__setSelected = null; };
    }, [setSelected]);

    useEffect(() => {
      if (!error) return;
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }, [error]);

    // B.5: HW/FW tooltip — delegated listeners on document capture hover over CSS2D labels
    useEffect(() => {
      const tooltip = document.getElementById('hwfw-tooltip');
      if (!tooltip) return;

      const TOOLTIP_HW = '<em>In a fault, the <strong>hanging wall</strong> is the block above the dipping fault plane — where a miner could hang a lantern. The <strong>footwall</strong> is the block below, at the miner\'s feet.</em>';
      const TOOLTIP_FW = '<em>The <strong>footwall</strong> is the block below the dipping fault plane — at the miner\'s feet. The <strong>hanging wall</strong> is above, where a lantern could be hung.</em>';
      const TOOLTIP_VERTICAL = ' <em>For vertical strike-slip faults, hanging wall and footwall are not strictly defined.</em>';

      function showTooltip(e) {
        const label = e.target.closest?.('.hwfw-label');
        if (!label) return;
        const role = label.dataset.tooltip; // 'hw' or 'fw'
        const isVertical = label.dataset.vertical === 'true';
        let content = role === 'hw' ? TOOLTIP_HW : TOOLTIP_FW;
        if (isVertical) content += TOOLTIP_VERTICAL;
        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top  = (e.clientY - 8) + 'px';
      }

      function moveTooltip(e) {
        const label = e.target.closest?.('.hwfw-label');
        if (!label) {
          tooltip.style.display = 'none';
          return;
        }
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top  = (e.clientY - 8) + 'px';
      }

      function hideTooltip(e) {
        const label = e.target.closest?.('.hwfw-label');
        if (label && !label.contains(e.relatedTarget)) {
          tooltip.style.display = 'none';
        }
      }

      document.addEventListener('mouseover', showTooltip, true);
      document.addEventListener('mousemove', moveTooltip, true);
      document.addEventListener('mouseout', hideTooltip, true);

      return () => {
        document.removeEventListener('mouseover', showTooltip, true);
        document.removeEventListener('mousemove', moveTooltip, true);
        document.removeEventListener('mouseout', hideTooltip, true);
        tooltip.style.display = 'none';
      };
    }, []);

    const onInterpret = useCallback(async () => {
      if (!description.trim()) return;
      setInterpreting(true);
      setError(null);

      const prevDesc = (model && model.meta && model.meta.last_parsed_description) || '';
      const diff = window.GeoDiff
        ? window.GeoDiff.diffDescriptions(prevDesc, description)
        : { unchanged: [], added: [], removed: [], modified: [] };

      // Nothing actually changed (whitespace/case only)
      if (diff.added.length === 0 && diff.modified.length === 0 && diff.removed.length === 0 && prevDesc) {
        setInterpreting(false);
        return;
      }

      const useMerge = prevDesc && diff.unchanged.length > 0 && window.GeoDiff;

      let json;
      if (useMerge) {
        const mergeResp = await interpretMerge(model, diff, setError);
        json = mergeResp ? mergeIntoModel(model, mergeResp, diff) : null;
      } else {
        json = await interpret(description, (msg) => setError('Interpreter couldn\'t read that. Try again, or rephrase.'));
      }

      setInterpreting(false);
      if (json) {
        json.meta = json.meta || {};
        json.meta.last_parsed_description = description;
        // Preserve predictions through re-interpret — they are cleared only by Reset
        if (model && model.predictions && model.predictions.length > 0) {
          json.predictions = model.predictions;
        }
        setModel(json);
        setSelected(null);
      }
    }, [description, model, setModel]);

    const handlePredict = async () => {
      if (!model || predicting) return;
      setPredicting(true);
      const predictions = await predict(model, (msg) => setError(msg));
      if (predictions) {
        const newModel = { ...model, predictions };
        setModel(newModel);
        window.__lastModel = newModel;
      }
      setPredicting(false);
    };

    const onSelectFeature = (data) => {
      setSelected(data);
      setInspectorOpen(true);
    };

    const updateField = (kind, id, field, value) => {
      setModel((m) => {
        if (!m) return m;
        const cp = JSON.parse(JSON.stringify(m));
        const arr = kind === 'layer' ? cp.layers : cp.events;
        const target = arr.find((x) => x.id === id);
        if (target) {
          target[field] = value;
          target.field_origin = target.field_origin || {};
          target.field_origin[field] = 'stated';
          target.manually_edited = true;
        }
        return cp;
      });
    };

    // Test hook — allow smoke tests to directly trigger a manual-edit.
    // Replaces the old drag-handle hook removed in commit 81a1c0c.
    // The 5th `opts` argument (from the old drag system) is silently ignored.
    useEffect(() => {
      window.__testDragChange = (kind, id, field, value /*, opts — ignored */) =>
        updateField(kind, id, field, value);
      return () => { window.__testDragChange = null; };
    }, [updateField]);

    // ---- JSON download / upload ----
    const downloadJSON = () => {
      const blob = new Blob([JSON.stringify({ version: '1.0', description, model }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const name = (model?.meta?.name || 'geoforge-model').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
      a.download = `${name}.geoforge.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const uploadRef = useRef(null);
    const onUpload = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const json = JSON.parse(String(r.result));
          if (!json.version && !json.layers && !json.events && !json.model) {
            setError('This file isn\'t a valid GeoForge model. Check it was downloaded from this app.');
            return;
          }
          if (json.description) setDescription(json.description);
          if (json.model) setModel(applyDefaults(json.model));
          else if (json.layers || json.events) setModel(applyDefaults(json));
        } catch (err) {
          setError('This file isn\'t a valid GeoForge model. Check it was downloaded from this app.');
        }
      };
      r.readAsText(f);
      e.target.value = '';
    };

    const selectedFeature = useMemo(() => {
      if (!selected || !model) return null;
      if (selected.kind === 'layer') return model.layers.find((L) => L.id === selected.id);
      if (selected.kind === 'event') return model.events.find((E) => E.id === selected.id);
      if (selected.kind === 'intrusion') return (model.intrusions || []).find((I) => I.id === selected.id);
      if (selected.kind === 'unconformity') return (model.unconformities || []).find((U) => U.id === selected.id);
      if (selected.kind === 'mineralisation') return (model.mineralisation || []).find((M) => M.id === selected.id);
      return null;
    }, [selected, model]);

    // List of inference notices
    const inferenceNotices = useMemo(() => {
      if (!model) return [];
      const notes = [];
      for (const E of (model.events || [])) {
        for (const [k, v] of Object.entries(E.field_origin || {})) {
          if (v === 'inferred') {
            notes.push({ id: `${E.id}-${k}`, evt: E, field: k });
          }
        }
      }
      return notes;
    }, [model]);

    return (
      <React.Fragment>
        {error && <Toast message={error} onDismiss={() => setError(null)} />}
        <div className={'workspace' + (inspectorOpen ? '' : ' no-inspector')}>
        {/* ============== LEFT — Description ============== */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Description · plain English</span>
            <span style={{ fontFamily: 'var(--kbd)', fontSize: 10, color: 'var(--fg-3)' }}>{description.length} ch</span>
          </div>
          <textarea
            className="desc-area"
            placeholder="A 1 m thick sandstone layer overlies a 0.8 m shale layer, all dipping 30° east. A normal fault cuts through them, dipping 60° east with 0.5 m of throw."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onClick={() => { if (!description.trim()) setDescription('A 1 m thick sandstone layer overlies a 0.8 m shale layer, all dipping 30° east. A normal fault cuts through them, dipping 60° east with 0.5 m of throw.'); }}
          />
          {model?.events?.length > 0 && (
            <div className="desc-anchors">
              {model.events.map((E) => (
                <div key={E.id} className="anchor" onClick={() => onSelectFeature({ kind: 'event', id: E.id })}>
                  <span className="tag">{E.subtype || E.type}</span>
                  <span className="src">{E.description_source || '—'}</span>
                </div>
              ))}
            </div>
          )}
          {(model?.intrusions?.length > 0 || model?.unconformities?.length > 0 || model?.mineralisation?.length > 0) && (
            <div className="desc-anchors">
              {(model.intrusions || []).map((I) => (
                <div key={I.id} className="anchor" onClick={() => onSelectFeature({ kind: 'intrusion', id: I.id })}>
                  <span className="tag">{I.subtype}</span>
                  <span className="src">{I.description_source || '—'}</span>
                </div>
              ))}
              {(model.unconformities || []).map((U) => (
                <div key={U.id} className="anchor" onClick={() => onSelectFeature({ kind: 'unconformity', id: U.id })}>
                  <span className="tag">{U.subtype}</span>
                  <span className="src">{U.description_source || '—'}</span>
                </div>
              ))}
              {(model.mineralisation || []).map((M) => (
                <div key={M.id} className="anchor" onClick={() => onSelectFeature({ kind: 'mineralisation', id: M.id })}>
                  <span className="tag">{M.subtype}</span>
                  <span className="src">{M.description_source || '—'}</span>
                </div>
              ))}
            </div>
          )}
          {!model && !description.trim() && (
            <div className="sample-list" style={{ marginTop: 8 }}>
              {window.GD.SAMPLE_DESCRIPTIONS.map((s, i) => (
                <button key={i} className="sample" onClick={() => setDescription(s.text)}>
                  <div style={{ color: 'var(--fg-0)', fontWeight: 500, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ color: 'var(--fg-2)', fontSize: 11.5 }}>{s.text}</div>
                </button>
              ))}
            </div>
          )}
          <div className="panel-footer">
            <button className="btn primary" onClick={onInterpret} disabled={interpreting || !description.trim()}>
              {interpreting ? <><span className="spin"></span> Interpreting…</> : 'Interpret →'}
            </button>
            <button
              className="btn"
              onClick={handlePredict}
              disabled={!model || predicting}
              style={{ opacity: (!model || predicting) ? 0.5 : 1 }}
            >
              {predicting ? 'Predicting…' : 'Predict'}
            </button>
            <button className="btn" onClick={() => { setDescription(''); setModel(null); setSelected(null); }}>
              Reset
            </button>
          </div>
        </div>

        {/* ============== CENTRE — 3D ============== */}
        <div className="center">
          <div className="scene-host">
            <window.GeoScene
              model={playbackModel}
              showLabels={showLabels}
              showOverlays={showOverlays}
              showGrid={showGrid}
              cameraHint={cameraHint}
              onSelect={onSelectFeature}
              selectedId={selected?.id}
              selected={selected}
            />
          </div>

          {/* Timeline scrubber */}
          {model && eventCount > 0 && (
            <div className="timeline">
              <div className="timeline-head">
                <span className="timeline-title">Geological history · {historyIdx} / {eventCount} events</span>
                <div className="timeline-controls">
                  <button className="step-btn" onClick={() => setHistoryIdx(0)}>⏮</button>
                  <button className="step-btn" onClick={() => setHistoryIdx((i) => Math.max(0, i - 1))}>◀</button>
                  <button className="step-btn" onClick={() => setPlaying((p) => !p)}>{playing ? '⏸' : '▶'}</button>
                  <button className="step-btn" onClick={() => setHistoryIdx((i) => Math.min(eventCount, i + 1))}>▶</button>
                  <button className="step-btn" onClick={() => setHistoryIdx(eventCount)}>⏭</button>
                  <select className="speed-pick" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}>
                    <option value="0.5">0.5×</option>
                    <option value="1">1×</option>
                    <option value="2">2×</option>
                  </select>
                </div>
              </div>
              <div className="scrubber" style={{ position: 'relative' }}>
                <div className="scrubber-track">
                  <div className="scrubber-fill" style={{ width: `${eventCount === 0 ? 0 : (historyIdx / eventCount) * 100}%` }} />
                  {Array.from({ length: eventCount + 1 }).map((_, i) => (
                    <React.Fragment key={i}>
                      <div
                        className={'scrubber-tick' + (i === historyIdx ? ' active' : (i < historyIdx ? ' past' : ''))}
                        style={{ left: `${(i / eventCount) * 100}%` }}
                        onClick={() => setHistoryIdx(i)}
                      />
                      <div className="scrubber-label" style={{ left: `${(i / eventCount) * 100}%` }}>
                        {i === 0 ? 'pre' : (model.events[i - 1]?.subtype || 'event ' + i)}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ============== RIGHT — Inspector ============== */}
        {inspectorOpen && (
        <div className="panel right">
          <div className="panel-header">
            <span className="panel-title">{selectedFeature ? 'Inspector' : 'Model overview'}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn icon" onClick={downloadJSON} title="Download JSON">↓ JSON</button>
              <button className="btn icon" onClick={() => uploadRef.current?.click()} title="Upload JSON">↑ JSON</button>
              <input ref={uploadRef} type="file" accept=".json,application/json" onChange={onUpload} className="visually-hidden" />
            </div>
          </div>
          <div className="panel-body">
            {!model && (
              <div className="empty" style={{ padding: 0 }}>
                <div className="empty-hint">No model yet. The inspector will fill in once you interpret a description.</div>
              </div>
            )}
            {model && !selectedFeature && (
              <>
                {inferenceNotices.length > 0 && (
                  <div className="notice">
                    <strong>{inferenceNotices.length} inferred {inferenceNotices.length === 1 ? 'value' : 'values'}</strong> — these were guessed because your description didn't specify them. Click any feature to see which ones.
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <div className="panel-title" style={{ marginBottom: 6 }}>Layers</div>
                  <div className="feat-list">
                    {(model.layers || []).map((L) => (
                      <div key={L.id} className={'feat-item' + (selected?.id === L.id ? ' selected' : '')} onClick={() => onSelectFeature({ kind: 'layer', id: L.id })}>
                        <div className="row">
                          <span className="name">{L.name}</span>
                          <span className="meta">{L.thickness?.toFixed?.(2)} u</span>
                        </div>
                        <span className="type">{L.lithology}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="panel-title" style={{ marginBottom: 6 }}>Events · oldest first</div>
                  <div className="feat-list">
                    {(model.events || []).map((E, i) => (
                      <div key={E.id} className={'feat-item' + (selected?.id === E.id ? ' selected' : '')} onClick={() => onSelectFeature({ kind: 'event', id: E.id })}>
                        <div className="row">
                          <span className="name">{E.subtype} {E.type}</span>
                          <span className="meta">#{i + 1}</span>
                        </div>
                        {E.type === 'fault' && <span className="type">dip {E.dip}° / {Math.round(E.dip_direction)}°</span>}
                        {E.type === 'fold' && <span className="type">plunge {E.plunge}° / {Math.round(E.plunge_direction)}°</span>}
                      </div>
                    ))}
                  </div>
                </div>
                {(model.intrusions || []).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="panel-title" style={{ marginBottom: 6 }}>Intrusions</div>
                    <div className="feat-list">
                      {(model.intrusions || []).map((I) => (
                        <div key={I.id} className={'feat-item' + (selected?.id === I.id ? ' selected' : '')} onClick={() => onSelectFeature({ kind: 'intrusion', id: I.id })}>
                          <div className="row">
                            <span className="name">{I.subtype} · {I.rock_type}</span>
                          </div>
                          <span className="type">{I.subtype}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(model.unconformities || []).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="panel-title" style={{ marginBottom: 6 }}>Unconformities</div>
                    <div className="feat-list">
                      {(model.unconformities || []).map((U) => (
                        <div key={U.id} className={'feat-item' + (selected?.id === U.id ? ' selected' : '')} onClick={() => onSelectFeature({ kind: 'unconformity', id: U.id })}>
                          <div className="row">
                            <span className="name">{U.subtype}</span>
                            {U.time_gap_ma != null && <span className="meta">{U.time_gap_ma} Ma</span>}
                          </div>
                          <span className="type">{U.subtype}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(model.mineralisation || []).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="panel-title" style={{ marginBottom: 6 }}>Mineralisation</div>
                    <div className="feat-list">
                      {(model.mineralisation || []).map((M) => (
                        <div key={M.id} className={'feat-item' + (selected?.id === M.id ? ' selected' : '')} onClick={() => onSelectFeature({ kind: 'mineralisation', id: M.id })}>
                          <div className="row">
                            <span className="name">{M.subtype}</span>
                            {M.metals && <span className="meta">{M.metals}</span>}
                          </div>
                          <span className="type">{M.subtype}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {selectedFeature && (
              <FeatureInspector
                feature={selectedFeature}
                kind={selected.kind}
                onChange={(field, value) => updateField(selected.kind, selected.id, field, value)}
                onClose={() => setSelected(null)}
              />
            )}
          </div>
        </div>
        )}
      </div>
      </React.Fragment>
    );
  }

  function FeatureInspector({ feature, kind, onChange, onClose }) {
    const fo = feature.field_origin || {};
    const isLayer = kind === 'layer';
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{feature.name || feature.subtype || feature.type}</div>
            <div style={{ fontFamily: 'var(--kbd)', fontSize: 10.5, color: 'var(--fg-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isLayer ? feature.lithology : `${feature.type} · ${feature.subtype}`}
            </div>
          </div>
          <button className="btn icon" onClick={onClose}>×</button>
        </div>
        {feature.description_source && (
          <div className="source-quote" style={{ marginBottom: 10 }}>"{feature.description_source}"</div>
        )}
        {feature.validation_note && (
          <div className="validation-note-pill">
            <span className="vn-icon">⚠</span>
            <span className="vn-text">{feature.validation_note}</span>
          </div>
        )}
        {isLayer && (
          <>
            <FieldRow label="Thickness" value={feature.thickness} unit="u" inferred={fo.thickness === 'inferred'} onChange={(v) => onChange('thickness', v)} />
            <FieldRow label="Lithology" value={feature.lithology} inferred={fo.lithology === 'inferred'} />
            <FieldRow label="Order in stack" value={feature.order} inferred={false} />
          </>
        )}
        {!isLayer && feature.type === 'fault' && (
          <>
            <FieldRow label="Strike" value={Math.round(feature.strike || 0)} unit="° from N" inferred={fo.strike === 'inferred'} onChange={(v) => onChange('strike', v)} />
            <FieldRow label="Dip" value={Math.round(feature.dip || 0)} unit="° from horiz" inferred={fo.dip === 'inferred'} onChange={(v) => onChange('dip', v)} />
            <FieldRow label="Dip direction" value={Math.round(feature.dip_direction || 0)} unit="° from N" inferred={fo.dip_direction === 'inferred'} onChange={(v) => onChange('dip_direction', v)} />
            {feature.throw != null && <FieldRow label="Throw" value={feature.throw} unit="u" inferred={fo.throw === 'inferred'} onChange={(v) => onChange('throw', v)} />}
            {feature.heave != null && <FieldRow label="Heave" value={feature.heave} unit="u" inferred={fo.heave === 'inferred'} onChange={(v) => onChange('heave', v)} />}
            {feature.displacement != null && <FieldRow label="Displacement" value={feature.displacement} unit="u" inferred={fo.displacement === 'inferred'} onChange={(v) => onChange('displacement', v)} />}
            {feature.sense != null && <FieldRow label="Sense" value={feature.sense} inferred={fo.sense === 'inferred'} />}
            {feature.dip_at_depth != null && <FieldRow label="Dip at depth" value={feature.dip_at_depth} unit="°" inferred={fo.dip_at_depth === 'inferred'} onChange={(v) => onChange('dip_at_depth', v)} />}
          </>
        )}
        {!isLayer && feature.type === 'fold' && (
          <>
            <FieldRow label="Axis strike" value={Math.round(feature.axis_strike || 0)} unit="° from N" inferred={fo.axis_strike === 'inferred'} onChange={(v) => onChange('axis_strike', v)} />
            <FieldRow label="Plunge" value={feature.plunge || 0} unit="°" inferred={fo.plunge === 'inferred'} onChange={(v) => onChange('plunge', v)} />
            <FieldRow label="Plunge direction" value={Math.round(feature.plunge_direction || 0)} unit="° from N" inferred={fo.plunge_direction === 'inferred'} onChange={(v) => onChange('plunge_direction', v)} />
            {feature.interlimb_angle != null && <FieldRow label="Interlimb angle" value={feature.interlimb_angle} unit="°" inferred={fo.interlimb_angle === 'inferred'} onChange={(v) => onChange('interlimb_angle', v)} />}
            {feature.flexure_dip != null && <FieldRow label="Flexure dip" value={feature.flexure_dip} unit="°" inferred={fo.flexure_dip === 'inferred'} onChange={(v) => onChange('flexure_dip', v)} />}
            {feature.flexure_width != null && <FieldRow label="Flexure width" value={feature.flexure_width} unit="u" inferred={fo.flexure_width === 'inferred'} onChange={(v) => onChange('flexure_width', v)} />}
            {feature.step_height != null && <FieldRow label="Step height" value={feature.step_height} unit="u" inferred={fo.step_height === 'inferred'} onChange={(v) => onChange('step_height', v)} />}
          </>
        )}
        {kind === 'intrusion' && (
          <>
            <FieldRow label="Subtype" value={feature.subtype} inferred={false} />
            <FieldRow label="Rock type" value={feature.rock_type} inferred={fo.rock_type === 'inferred'} />
            {feature.thickness != null && <FieldRow label="Thickness" value={feature.thickness} unit="u" inferred={fo.thickness === 'inferred'} />}
            {feature.depth != null && <FieldRow label="Depth" value={feature.depth} unit="u" inferred={fo.depth === 'inferred'} />}
            {feature.strike != null && <FieldRow label="Strike" value={feature.strike} unit="°" inferred={fo.strike === 'inferred'} />}
            {feature.dip != null && <FieldRow label="Dip" value={feature.dip} unit="°" inferred={fo.dip === 'inferred'} />}
          </>
        )}
        {kind === 'unconformity' && (
          <>
            <FieldRow label="Subtype" value={feature.subtype} inferred={false} />
            {feature.time_gap_ma != null && <FieldRow label="Time gap" value={feature.time_gap_ma} unit="Ma" inferred={fo.time_gap_ma === 'inferred'} />}
            {feature.angular_discordance != null && <FieldRow label="Angular discordance" value={feature.angular_discordance} unit="°" inferred={fo.angular_discordance === 'inferred'} />}
          </>
        )}
        {kind === 'mineralisation' && (
          <>
            <FieldRow label="Subtype" value={feature.subtype} inferred={false} />
            {feature.metals && <FieldRow label="Metals" value={feature.metals} inferred={fo.metals === 'inferred'} />}
            {feature.grade != null && <FieldRow label="Grade" value={feature.grade} unit="g/t or %" inferred={fo.grade === 'inferred'} />}
            {feature.alteration_radius != null && <FieldRow label="Alteration radius" value={feature.alteration_radius} unit="u" inferred={fo.alteration_radius === 'inferred'} />}
          </>
        )}
        {feature.manually_edited && (
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px' }}>
            Manually edited — persists unless you change the originating sentence.
          </div>
        )}
      </div>
    );
  }

  window.Workspace = Workspace;
  window.GeoForgeInterpret = interpret;
})();
