/* GeoForge — geological data tables and reference formation definitions.
 *
 * Sourced from GeoForge_Geology_Reference.docx §4 (lithology palette),
 * §5 (geological timescale), §7 (fault types and default dips per §1).
 *
 * Every entry exported to window.GD so other Babel scripts can read it.
 */

// ---- Lithology catalogue (subset; defaults per reference §4) ----
const LITHOLOGY = {
  sandstone:   { name: 'Sandstone',   color: '#E8D8A8', class: 'sed' },
  mudstone:    { name: 'Mudstone',    color: '#6B5D4B', class: 'sed' },
  shale:       { name: 'Shale',       color: '#4A4A4A', class: 'sed' },
  conglomerate:{ name: 'Conglomerate',color: '#8C6E4A', class: 'sed' },
  limestone:   { name: 'Limestone',   color: '#D8DCE0', class: 'sed' },
  chalk:       { name: 'Chalk',       color: '#F0EDE6', class: 'sed' },
  dolostone:   { name: 'Dolostone',   color: '#C8B8A0', class: 'sed' },
  chert:       { name: 'Chert',       color: '#3C4040', class: 'sed' },
  coal:        { name: 'Coal',        color: '#1A1A1A', class: 'sed' },
  granite:     { name: 'Granite',     color: '#D8C0B0', class: 'ign' },
  diorite:     { name: 'Diorite',     color: '#7C7066', class: 'ign' },
  gabbro:      { name: 'Gabbro',      color: '#3C463C', class: 'ign' },
  basalt:      { name: 'Basalt',      color: '#2C2C2C', class: 'ign' },
  rhyolite:    { name: 'Rhyolite',    color: '#E8D0C8', class: 'ign' },
  schist:      { name: 'Schist',      color: '#7C6C5C', class: 'met' },
  gneiss:      { name: 'Gneiss',      color: '#B4A090', class: 'met' },
  quartzite:   { name: 'Quartzite',   color: '#DCD8CC', class: 'met' },
  marble:      { name: 'Marble',      color: '#ECE4D0', class: 'met' },
  slate:       { name: 'Slate',       color: '#3C4448', class: 'met' },
};

// ---- Geological periods (subset) ----
const PERIODS = {
  Quaternary:  { ma_top: 0,    ma_base: 2.58,  era: 'Cenozoic' },
  Neogene:     { ma_top: 2.58, ma_base: 23.0,  era: 'Cenozoic' },
  Palaeogene:  { ma_top: 23.0, ma_base: 66.0,  era: 'Cenozoic' },
  Cretaceous:  { ma_top: 66.0, ma_base: 145,   era: 'Mesozoic' },
  Jurassic:    { ma_top: 145,  ma_base: 201.3, era: 'Mesozoic' },
  Triassic:    { ma_top: 201.3,ma_base: 251.9, era: 'Mesozoic' },
  Permian:     { ma_top: 251.9,ma_base: 298.9, era: 'Palaeozoic' },
  Carboniferous:{ma_top: 298.9,ma_base: 358.9, era: 'Palaeozoic' },
  Devonian:    { ma_top: 358.9,ma_base: 419.2, era: 'Palaeozoic' },
};

// ---- Default values for inferred fields (spec-v1 §5.3) ----
const DEFAULTS = {
  fault_dip: { normal: 60, reverse: 45, thrust: 25, 'strike-slip': 90, oblique: 55, listric: 70 },
  fold_plunge: 0,
  layer_thickness_pct: 0.10, // 10% of model height
};

// ---- Reference formation definitions for Deliverable 2.
// Each entry is rendered as a self-contained 3D card with all required overlays.
// `model` is a minimal GeoModel JSON the scene can render directly.
//
// Stated values are values the *student* would have said in the description.
// Inferred values are values the interpreter would have had to guess if absent.
// Here we mark a couple of values inferred per card so the dashed-amber treatment
// is visible in the glossary.

const REFERENCE_FORMATIONS = [
  // -------- Layers & stratigraphy --------
  {
    id: 'horizontal-strata',
    section: 'layers',
    title: 'Horizontal strata',
    tag: 'Stratigraphy',
    caption: 'Undeformed flat-lying sedimentary sequence. Dip = 0°. Each layer carries a thickness vector overlay between its upper and lower contact planes.',
    overlays: ['thickness'],
    cameraHint: { phi: 1.05, theta: 0.7, dist: 8 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 1.2, order: 0, field_origin: { thickness: 'stated' } },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.9, order: 1, field_origin: { thickness: 'stated' } },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 1.5, order: 2, field_origin: { thickness: 'stated' } },
        { id: 'L4', name: 'Mudstone',  lithology: 'mudstone',  thickness: 0.6, order: 3, field_origin: { thickness: 'inferred' } },
      ],
      events: [],
      tilt: { strike: 0, dip: 0, dip_direction: 0 },
    },
  },
  {
    id: 'dipping-strata',
    section: 'layers',
    title: 'Dipping strata',
    tag: 'Stratigraphy',
    caption: 'A tilted layer cake. Strike, dip and dip-direction are each rendered against their geometric reference: the horizontal plane, a compass rose, and the line of steepest descent.',
    overlays: ['strike', 'dip', 'dip-direction'],
    cameraHint: { phi: 1.05, theta: 0.6, dist: 8 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 1.0, order: 0, field_origin: { thickness: 'stated' } },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.8, order: 1, field_origin: { thickness: 'stated' } },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 1.0, order: 2, field_origin: { thickness: 'stated' } },
      ],
      events: [],
      tilt: { strike: 0, dip: 30, dip_direction: 90, field_origin: { strike: 'stated', dip: 'stated', dip_direction: 'stated' } },
    },
  },
  {
    id: 'multilayer-thickness',
    section: 'layers',
    title: 'Multi-layer sequence with thickness vectors',
    tag: 'Stratigraphy',
    caption: 'Four-unit sequence with a perpendicular thickness vector annotated on every layer. Each vector connects two parallel reference planes (top/bottom of layer).',
    overlays: ['thickness'],
    cameraHint: { phi: 1.0, theta: 0.5, dist: 9 },
    model: {
      layers: [
        { id: 'L1', name: 'Mudstone',  lithology: 'mudstone',  thickness: 0.7, order: 0, field_origin: { thickness: 'stated' } },
        { id: 'L2', name: 'Sandstone', lithology: 'sandstone', thickness: 1.1, order: 1, field_origin: { thickness: 'stated' } },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.8, order: 2, field_origin: { thickness: 'stated' } },
        { id: 'L4', name: 'Chalk',     lithology: 'chalk',     thickness: 0.5, order: 3, field_origin: { thickness: 'inferred' } },
        { id: 'L5', name: 'Shale',     lithology: 'shale',     thickness: 1.0, order: 4, field_origin: { thickness: 'stated' } },
      ],
      events: [],
      tilt: { strike: 0, dip: 8, dip_direction: 90 },
    },
  },

  // -------- Faults --------
  {
    id: 'normal-fault',
    section: 'faults',
    title: 'Normal fault',
    tag: 'Fault · extensional',
    caption: 'Hanging wall drops relative to the footwall. Dip-angle vertex+arc, throw (vertical), and heave (horizontal) reconstructions all visible.',
    overlays: ['dip', 'throw', 'heave', 'datum-reconstruction'],
    cameraHint: { phi: 1.15, theta: 0.0, dist: 9 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 0.8, order: 0 },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.9, order: 1 },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.7, order: 2 },
      ],
      events: [
        { id: 'F1', type: 'fault', subtype: 'normal', strike: 0, dip: 60, dip_direction: 90,
          throw: 0.9, heave: 0.52, order: 0,
          description_source: 'A normal fault dips 60° to the east; the hanging wall has dropped about 0.9 units.',
          field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'stated', throw: 'stated', heave: 'inferred' } },
      ],
    },
  },
  {
    id: 'reverse-fault',
    section: 'faults',
    title: 'Reverse fault',
    tag: 'Fault · compressional',
    caption: 'Hanging wall rides up over the footwall. Steeper than a thrust (dip ≥ 45°). Same overlay set as normal fault but throw is upward.',
    overlays: ['dip', 'throw', 'heave', 'datum-reconstruction'],
    cameraHint: { phi: 1.15, theta: 0.0, dist: 9 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 0.8, order: 0 },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.9, order: 1 },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.7, order: 2 },
      ],
      events: [
        { id: 'F1', type: 'fault', subtype: 'reverse', strike: 0, dip: 50, dip_direction: 90,
          throw: 0.7, heave: 0.59, order: 0,
          description_source: 'A reverse fault dipping 50° east has driven the hanging wall upward by ~0.7 units.',
          field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'stated', throw: 'stated', heave: 'inferred' } },
      ],
    },
  },
  {
    id: 'thrust-fault',
    section: 'faults',
    title: 'Thrust fault',
    tag: 'Fault · low-angle reverse',
    caption: 'A reverse fault with dip < 45°. The shallow geometry is the diagnostic feature — the dip arc is small, the heave is large relative to the throw.',
    overlays: ['dip', 'throw', 'heave', 'displacement'],
    cameraHint: { phi: 1.1, theta: 0.0, dist: 10 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 0.7, order: 0 },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.7, order: 1 },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.7, order: 2 },
      ],
      events: [
        { id: 'F1', type: 'fault', subtype: 'thrust', strike: 0, dip: 25, dip_direction: 90,
          throw: 0.45, heave: 0.97, order: 0,
          description_source: 'A low-angle thrust dipping 25° has pushed the hanging-wall sheet east.',
          field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'stated', throw: 'inferred', heave: 'inferred' } },
      ],
    },
  },
  {
    id: 'strike-slip-dextral',
    section: 'faults',
    title: 'Strike-slip — dextral',
    tag: 'Fault · right-lateral',
    caption: 'Vertical fault; the far side has moved to the right (north) as viewed across the fault. Horizontal offset markers on either wall plus a slip-vector arrow lying in the plane.',
    overlays: ['strike', 'horizontal-offset', 'slip-vector'],
    cameraHint: { phi: 1.4, theta: 0.0, dist: 9 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 0.6, order: 0 },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.7, order: 1 },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.6, order: 2 },
      ],
      events: [
        { id: 'F1', type: 'fault', subtype: 'strike-slip', sense: 'dextral',
          strike: 0, dip: 90, dip_direction: 90, displacement: 1.0, order: 0,
          description_source: 'A right-lateral strike-slip fault; the east side has moved north about 1 unit.',
          field_origin: { strike: 'stated', dip: 'inferred', dip_direction: 'inferred', displacement: 'stated', sense: 'stated' } },
      ],
    },
  },
  {
    id: 'strike-slip-sinistral',
    section: 'faults',
    title: 'Strike-slip — sinistral',
    tag: 'Fault · left-lateral',
    caption: 'Vertical fault; the far side has moved to the left (south). Same overlays as dextral with the slip arrow reversed.',
    overlays: ['strike', 'horizontal-offset', 'slip-vector'],
    cameraHint: { phi: 1.4, theta: 0.0, dist: 9 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 0.6, order: 0 },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.7, order: 1 },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.6, order: 2 },
      ],
      events: [
        { id: 'F1', type: 'fault', subtype: 'strike-slip', sense: 'sinistral',
          strike: 0, dip: 90, dip_direction: 90, displacement: 0.9, order: 0,
          description_source: 'A left-lateral strike-slip fault; the east side has moved south about 0.9 units.',
          field_origin: { strike: 'stated', dip: 'inferred', dip_direction: 'inferred', displacement: 'stated', sense: 'stated' } },
      ],
    },
  },
  {
    id: 'oblique-slip',
    section: 'faults',
    title: 'Oblique-slip fault',
    tag: 'Fault · mixed',
    caption: 'Combined dip-slip and strike-slip motion. The slip vector is decomposed visually into its vertical (throw) and horizontal (offset) components.',
    overlays: ['dip', 'throw', 'horizontal-offset', 'slip-vector', 'slip-decomposed'],
    cameraHint: { phi: 1.2, theta: 0.0, dist: 10 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 0.7, order: 0 },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.7, order: 1 },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.6, order: 2 },
      ],
      events: [
        { id: 'F1', type: 'fault', subtype: 'oblique', strike: 0, dip: 65, dip_direction: 90,
          throw: 0.55, displacement: 1.05, rake: 50, order: 0,
          description_source: 'An oblique fault: the hanging wall has dropped ~0.55 units and also moved north ~0.9 units.',
          field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'stated', throw: 'stated', displacement: 'stated', rake: 'inferred' } },
      ],
    },
  },
  {
    id: 'listric-fault',
    section: 'faults',
    title: 'Listric fault',
    tag: 'Fault',
    caption: 'A curved normal fault that flattens with depth. The dip at the surface and the dip at depth are each measured against their own horizontal reference, with the detachment depth labelled vertically between them.',
    overlays: ['surface dip', 'dip at depth', 'detachment depth'],
    cameraHint: { phi: 1.05, theta: 0.0, dist: 10 },
    model: {
      layers: [
        { id: 'L1', name: 'Upper unit',  lithology: 'sandstone', thickness: 1.0, color: '#c8a96e', order: 0 },
        { id: 'L2', name: 'Middle unit', lithology: 'shale',     thickness: 1.0, color: '#8c9aa0', order: 1 },
        { id: 'L3', name: 'Lower unit',  lithology: 'limestone', thickness: 1.5, color: '#b0c4b1', order: 2 },
      ],
      events: [{
        id: 'E1',
        type: 'fault',
        subtype: 'listric',
        strike: 0,
        dip: 70,
        dip_direction: 90,
        dip_at_depth: 10,
        detachment_depth: 3.0,
        throw: 1.0,
        order: 0,
        description_source: 'A listric normal fault dips 70° east at surface, flattens to 10° at a detachment 3 m down, with 1 m of throw.',
        field_origin: {
          strike: 'stated',
          dip: 'stated',
          dip_direction: 'stated',
          dip_at_depth: 'stated',
          detachment_depth: 'inferred',
          throw: 'stated',
        },
      }],
    },
  },

  // -------- Folds --------
  {
    id: 'anticline',
    section: 'folds',
    title: 'Anticline',
    tag: 'Fold · arches up',
    caption: 'Layers fold into an upward arch; oldest rocks at the core. Hinge line, axial plane, interlimb angle, and plunge of the hinge are all annotated to their geometric origins.',
    overlays: ['hinge', 'axial-plane', 'interlimb', 'plunge'],
    cameraHint: { phi: 1.1, theta: 0.5, dist: 11 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 0.55, order: 0 },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.55, order: 1 },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.55, order: 2 },
      ],
      events: [
        { id: 'O1', type: 'fold', subtype: 'anticline', axis_strike: 0, plunge: 12, plunge_direction: 0,
          interlimb_angle: 100, amplitude: 1.0, wavelength: 4.5, order: 0,
          description_source: 'An anticline plunges ~12° north with an interlimb angle around 100°.',
          field_origin: { axis_strike: 'inferred', plunge: 'stated', plunge_direction: 'stated', interlimb_angle: 'stated' } },
      ],
    },
  },
  {
    id: 'syncline',
    section: 'folds',
    title: 'Syncline',
    tag: 'Fold · bowls down',
    caption: 'Layers fold into a trough; youngest rocks at the core. Same overlay set as the anticline with the curvature inverted.',
    overlays: ['hinge', 'axial-plane', 'interlimb', 'plunge'],
    cameraHint: { phi: 1.1, theta: 0.5, dist: 11 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 0.55, order: 0 },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.55, order: 1 },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.55, order: 2 },
      ],
      events: [
        { id: 'O1', type: 'fold', subtype: 'syncline', axis_strike: 0, plunge: 8, plunge_direction: 180,
          interlimb_angle: 110, amplitude: 1.0, wavelength: 4.5, order: 0,
          description_source: 'A syncline plunges ~8° south; interlimb angle approximately 110°.',
          field_origin: { axis_strike: 'inferred', plunge: 'stated', plunge_direction: 'stated', interlimb_angle: 'stated' } },
      ],
    },
  },
  {
    id: 'monocline',
    section: 'folds',
    title: 'Monocline',
    tag: 'Fold · single flexure',
    caption: 'A one-sided step in otherwise horizontal layers — flat, flex, flat. The flexure dip and the width of the flexure panel are annotated against the horizontal datum on either side.',
    overlays: ['flexure-dip', 'flexure-width', 'plunge'],
    cameraHint: { phi: 1.15, theta: 0.2, dist: 10 },
    model: {
      layers: [
        { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 0.5, order: 0 },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 0.5, order: 1 },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.5, order: 2 },
      ],
      events: [
        { id: 'O1', type: 'fold', subtype: 'monocline', axis_strike: 0, flexure_dip: 35, flexure_width: 1.2,
          step_height: 0.9, order: 0,
          description_source: 'A monocline steps the sequence down to the east; the flexure panel dips about 35°.',
          field_origin: { axis_strike: 'inferred', flexure_dip: 'stated', flexure_width: 'inferred', step_height: 'stated' } },
      ],
    },
  },

  // -------- Intrusions --------
  {
    id: 'dyke-basalt',
    section: 'intrusions',
    title: 'Basalt Dyke',
    blurb: 'A near-vertical discordant sheet of basalt cutting across bedding planes.',
    overlays: ['strike line', 'dip arc', 'thickness label'],
    cameraHint: { distance: 6, azimuth: 45, elevation: 30 },
    model: {
      meta: { name: 'Basalt Dyke', description: 'A vertical basalt dyke cuts across sandstone-shale-limestone stratigraphy.' },
      layers: [
        { id: 'L1', name: 'Limestone', lithology: 'limestone', thickness: 1.0, order: 0, description_source: 'limestone base', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 1.0, order: 1, description_source: 'shale middle', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L3', name: 'Sandstone', lithology: 'sandstone', thickness: 1.0, order: 2, description_source: 'sandstone top', field_origin: { thickness: 'stated', lithology: 'stated' } },
      ],
      events: [],
      intrusions: [
        { id: 'I1', subtype: 'dyke', rock_type: 'basalt', strike: 0, dip: 90, thickness: 0.4, description_source: 'A basalt dyke cuts across the layers.', field_origin: { strike: 'stated', dip: 'stated', thickness: 'stated', rock_type: 'stated' } },
      ],
    },
  },
  {
    id: 'sill-basalt',
    section: 'intrusions',
    title: 'Basalt Sill',
    blurb: 'A concordant tabular sheet of basalt injected parallel to bedding planes.',
    overlays: ['thickness label', 'feature label'],
    cameraHint: { distance: 6, azimuth: 45, elevation: 30 },
    model: {
      meta: { name: 'Basalt Sill', description: 'A horizontal basalt sill injected along bedding.' },
      layers: [
        { id: 'L1', name: 'Limestone', lithology: 'limestone', thickness: 1.0, order: 0, description_source: 'limestone base', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L2', name: 'Shale',     lithology: 'shale',     thickness: 1.0, order: 1, description_source: 'shale middle', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L3', name: 'Sandstone', lithology: 'sandstone', thickness: 1.0, order: 2, description_source: 'sandstone top', field_origin: { thickness: 'stated', lithology: 'stated' } },
      ],
      events: [],
      intrusions: [
        { id: 'I1', subtype: 'sill', rock_type: 'basalt', strike: 0, dip: 0, thickness: 0.3, description_source: 'A basalt sill was injected along the bedding.', field_origin: { strike: 'inferred', dip: 'inferred', thickness: 'stated', rock_type: 'stated' } },
      ],
    },
  },
  {
    id: 'batholith-granite',
    section: 'intrusions',
    title: 'Granite Batholith',
    blurb: 'A large discordant granitic pluton underlying the sedimentary sequence.',
    overlays: ['depth label', 'feature label'],
    cameraHint: { distance: 7, azimuth: 30, elevation: 20 },
    model: {
      meta: { name: 'Granite Batholith', description: 'A large granite batholith underlies the sedimentary layers.' },
      layers: [
        { id: 'L1', name: 'Shale',      lithology: 'shale',      thickness: 1.0, order: 0, description_source: 'shale', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L2', name: 'Sandstone',  lithology: 'sandstone',  thickness: 1.2, order: 1, description_source: 'sandstone', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L3', name: 'Limestone',  lithology: 'limestone',  thickness: 0.8, order: 2, description_source: 'limestone', field_origin: { thickness: 'stated', lithology: 'stated' } },
      ],
      events: [],
      intrusions: [
        { id: 'I1', subtype: 'batholith', rock_type: 'granite', depth: 3.0, description_source: 'A large granite batholith underlies the sequence.', field_origin: { rock_type: 'stated', depth: 'stated' } },
      ],
    },
  },
  {
    id: 'laccolith-granite',
    section: 'intrusions',
    title: 'Granite Laccolith',
    blurb: 'A dome-roofed intrusion that pushed overlying strata into an arch.',
    overlays: ['depth label', 'feature label'],
    cameraHint: { distance: 6, azimuth: 45, elevation: 30 },
    model: {
      meta: { name: 'Granite Laccolith', description: 'A granite laccolith domed the overlying strata upward.' },
      layers: [
        { id: 'L1', name: 'Shale',     lithology: 'shale',     thickness: 1.0, order: 0, description_source: 'shale', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L2', name: 'Sandstone', lithology: 'sandstone', thickness: 1.0, order: 1, description_source: 'sandstone', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 1.0, order: 2, description_source: 'limestone', field_origin: { thickness: 'stated', lithology: 'stated' } },
      ],
      events: [],
      intrusions: [
        { id: 'I1', subtype: 'laccolith', rock_type: 'granite', depth: 1.5, description_source: 'A granite laccolith pushed the layers into a dome.', field_origin: { rock_type: 'stated', depth: 'stated' } },
      ],
    },
  },

  // -------- Unconformities --------
  {
    id: 'angular-unconformity',
    section: 'unconformities',
    title: 'Angular Unconformity',
    blurb: 'Tilted older strata erosionally cut by flat-lying younger strata — records uplift, tilting, erosion, and resubmergence.',
    overlays: ['time gap', 'angular discordance arc'],
    cameraHint: { distance: 6, azimuth: 45, elevation: 30 },
    model: {
      meta: { name: 'Angular Unconformity', description: 'Tilted older beds cut by younger horizontal beds — 25 Ma time gap.' },
      layers: [
        { id: 'L1', name: 'Old Shale',      lithology: 'shale',      thickness: 0.8, order: 0, description_source: 'old shale', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L2', name: 'Old Sandstone',  lithology: 'sandstone',  thickness: 0.8, order: 1, description_source: 'old sandstone', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L3', name: 'Young Limestone',lithology: 'limestone',  thickness: 0.8, order: 2, description_source: 'young limestone', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L4', name: 'Young Sandstone',lithology: 'sandstone',  thickness: 0.8, order: 3, description_source: 'young sandstone', field_origin: { thickness: 'stated', lithology: 'stated' } },
      ],
      events: [],
      unconformities: [
        { id: 'U1', subtype: 'angular', above_layer_id: 'L3', below_layer_id: 'L2', time_gap_ma: 25, angular_discordance: 35, description_source: 'Tilted beds cut by horizontal beds at 25 Ma time gap.', field_origin: { time_gap_ma: 'stated', angular_discordance: 'stated' } },
      ],
    },
  },
  {
    id: 'disconformity',
    section: 'unconformities',
    title: 'Disconformity',
    blurb: 'An erosion surface between parallel strata — the beds above and below are parallel but a time gap is missing.',
    overlays: ['time gap'],
    cameraHint: { distance: 6, azimuth: 45, elevation: 30 },
    model: {
      meta: { name: 'Disconformity', description: 'An erosion surface between parallel shale and limestone beds — 15 Ma time gap.' },
      layers: [
        { id: 'L1', name: 'Lower Shale',    lithology: 'shale',     thickness: 1.0, order: 0, description_source: 'lower shale', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L2', name: 'Lower Sandstone',lithology: 'sandstone', thickness: 0.8, order: 1, description_source: 'lower sandstone', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L3', name: 'Upper Limestone',lithology: 'limestone', thickness: 0.8, order: 2, description_source: 'upper limestone', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L4', name: 'Upper Shale',    lithology: 'shale',     thickness: 1.0, order: 3, description_source: 'upper shale', field_origin: { thickness: 'stated', lithology: 'stated' } },
      ],
      events: [],
      unconformities: [
        { id: 'U1', subtype: 'disconformity', above_layer_id: 'L3', below_layer_id: 'L2', time_gap_ma: 15, description_source: 'An erosion surface between the parallel beds, 15 Ma gap.', field_origin: { time_gap_ma: 'stated' } },
      ],
    },
  },
  {
    id: 'nonconformity',
    section: 'unconformities',
    title: 'Nonconformity',
    blurb: 'Sedimentary rocks deposited directly on eroded igneous or metamorphic basement rock.',
    overlays: ['time gap'],
    cameraHint: { distance: 6, azimuth: 45, elevation: 30 },
    model: {
      meta: { name: 'Nonconformity', description: 'Sandstone deposited directly on granite basement — 200 Ma time gap.' },
      layers: [
        { id: 'L1', name: 'Granite Basement', lithology: 'granite',    thickness: 1.5, order: 0, description_source: 'granite basement', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L2', name: 'Sandstone',         lithology: 'sandstone', thickness: 1.0, order: 1, description_source: 'sandstone', field_origin: { thickness: 'stated', lithology: 'stated' } },
        { id: 'L3', name: 'Shale',             lithology: 'shale',     thickness: 1.0, order: 2, description_source: 'shale', field_origin: { thickness: 'stated', lithology: 'stated' } },
      ],
      events: [],
      unconformities: [
        { id: 'U1', subtype: 'nonconformity', above_layer_id: 'L2', below_layer_id: 'L1', time_gap_ma: 200, description_source: 'Sediments rest directly on granite basement — 200 Ma gap.', field_origin: { time_gap_ma: 'stated' } },
      ],
    },
  },
];

const REFERENCE_SECTIONS = [
  { id: 'layers',        num: '01', title: 'Layers & stratigraphy', blurb: 'Strike, dip and thickness — the three measurements every layer carries.' },
  { id: 'faults',        num: '02', title: 'Faults — all seven v1 types', blurb: 'Dip-angle vertex+arc, throw, heave, slip vector, and datum reconstruction.' },
  { id: 'folds',         num: '03', title: 'Folds — simple', blurb: 'Hinge line, axial plane, interlimb angle and plunge.' },
  { id: 'intrusions',    num: '04', title: 'Intrusions', blurb: 'Igneous bodies that cut or inject into the host stratigraphy — dykes, sills, batholiths, and laccoliths.' },
  { id: 'unconformities',num: '05', title: 'Unconformities', blurb: 'Erosion surfaces recording missing time — angular, parallel, and basement contacts.' },
];

// ---- Sample descriptions for the workspace empty state ----
const SAMPLE_DESCRIPTIONS = [
  {
    title: 'Tilted limestone with a normal fault',
    text: 'A 200 m sequence of sandstone over shale over limestone, tilted 25° to the east. A normal fault dips 60° east through the sequence, with about 30 m of throw down to the east.',
  },
  {
    title: 'Anticline cut by a thrust',
    text: 'Three layers of quartzite, schist, and marble form a gentle anticline plunging 15° to the north. Later, a thrust fault dipping 20° east pushed the hanging-wall block westward.',
  },
  {
    title: 'Strike-slip cuts dipping beds',
    text: 'Beds of sandstone, shale, and chalk dip 20° to the south. A right-lateral strike-slip fault striking north–south has offset the sequence by about 40 m.',
  },
];

window.GD = {
  LITHOLOGY,
  PERIODS,
  DEFAULTS,
  REFERENCE_FORMATIONS,
  REFERENCE_SECTIONS,
  SAMPLE_DESCRIPTIONS,
};
