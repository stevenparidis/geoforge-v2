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
      "field_origin": { fieldName: "stated"|"inferred" }
    }, ...
  ],
  "tilt": {
    "strike": 0..360, "dip": 0..90, "dip_direction": 0..360,
    "field_origin": { ... }
  }  // optional; only if the layer cake itself is tilted (e.g. "the beds dip 20° east")
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

DEFAULTS (use when a value is missing and mark it inferred):
- Normal fault dip = 60°
- Reverse fault dip = 45°
- Thrust fault dip = 25°
- Strike-slip fault dip = 90° (vertical)
- Listric: dip = 70° at surface, dip_at_depth = 10°, detachment_depth = half of total layer thickness
- Fold plunge = 0° (non-plunging)
- Layer thickness when not stated = 1.0
- Order events in the order they appear in the user's text.

RULES:
- Be SILENT — never ask the user, never include caveats. Best-guess and flag inferred.
- Compass bearings are degrees clockwise from north. "east" = 90, "north" = 0, "south" = 180, "west" = 270.
- "the beds dip east" → tilt.dip_direction = 90; strike perpendicular = 0 (north-south).
- "the layers tip down to the east at 30°" → tilt.dip = 30, dip_direction = 90.
- For every field, set field_origin to "stated" if the user said the number explicitly, otherwise "inferred".
- description_source must quote the original sentence verbatim.
- Output ONLY the JSON.`;

  function applyDefaults(model) {
    // Patch any missing required fields with sensible defaults.
    if (!model.meta) model.meta = { name: 'Untitled', description: '' };
    if (!model.layers) model.layers = [];
    if (!model.events) model.events = [];
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

    const onInterpret = useCallback(async () => {
      if (!description.trim()) return;
      setInterpreting(true);
      setError(null);
      const json = await interpret(description, setError);
      setInterpreting(false);
      if (json) {
        setModel(json);
        setSelected(null);
      }
    }, [description, setModel]);

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

    // onDragChange: called from handle-layer.jsx drag controller on each drag frame.
    const onDragChange = useCallback((featureKind, featureId, field, value, opts) => {
      setModel((prev) => {
        if (!prev) return prev;
        const next = JSON.parse(JSON.stringify(prev));
        let feature = null;
        if (featureKind === 'layer') {
          feature = (next.layers || []).find((L) => L.id === featureId);
        } else if (featureKind === 'event') {
          feature = (next.events || []).find((E) => E.id === featureId);
        }
        if (!feature) return prev;
        feature[field] = value;
        feature.manually_edited = true;
        if (!feature.field_origin) feature.field_origin = {};
        feature.field_origin[field] = 'stated';
        return next;
      });
    }, [setModel]);

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
          if (json.description) setDescription(json.description);
          if (json.model) setModel(applyDefaults(json.model));
          else if (json.layers || json.events) setModel(applyDefaults(json));
        } catch (err) {
          setError('Could not parse JSON: ' + err.message);
        }
      };
      r.readAsText(f);
      e.target.value = '';
    };

    const selectedFeature = useMemo(() => {
      if (!selected || !model) return null;
      if (selected.kind === 'layer') return model.layers.find((L) => L.id === selected.id);
      if (selected.kind === 'event') return model.events.find((E) => E.id === selected.id);
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
      <div className={'workspace' + (inspectorOpen ? '' : ' no-inspector')}>
        {/* ============== LEFT — Description ============== */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Description · plain English</span>
            <span style={{ fontFamily: 'var(--kbd)', fontSize: 10, color: 'var(--fg-3)' }}>{description.length} ch</span>
          </div>
          <textarea
            className="desc-area"
            placeholder={"Write a structural geology description in plain English. E.g.\n\nA 200 m sequence of sandstone, shale, and limestone is tilted 25° to the east. A normal fault dips 60° east and has dropped the hanging wall about 30 m."}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          <div className="panel-footer">
            <button className="btn primary" onClick={onInterpret} disabled={interpreting || !description.trim()}>
              {interpreting ? <><span className="spin"></span> Interpreting…</> : 'Interpret →'}
            </button>
            <button className="btn" onClick={() => { setDescription(''); setModel(null); setSelected(null); }}>
              Reset
            </button>
          </div>
        </div>

        {/* ============== CENTRE — 3D ============== */}
        <div className="center">
          <div className="scene-host">
            {model ? (
              <window.GeoScene
                model={playbackModel}
                showLabels={showLabels}
                showOverlays={showOverlays}
                showGrid={showGrid}
                cameraHint={cameraHint}
                onSelect={onSelectFeature}
                selectedId={selected?.id}
                selected={selected}
                onDragChange={onDragChange}
              />
            ) : (
              <div className="empty">
                <div className="glyph" />
                <div className="empty-headline">No model yet</div>
                <div className="empty-hint">Write a description on the left and click Interpret, or pick a sample:</div>
                <div className="sample-list">
                  {window.GD.SAMPLE_DESCRIPTIONS.map((s, i) => (
                    <button key={i} className="sample" onClick={() => setDescription(s.text)}>
                      <div style={{ color: 'var(--fg-0)', fontWeight: 500, marginBottom: 4 }}>{s.title}</div>
                      <div style={{ color: 'var(--fg-2)', fontSize: 11.5 }}>{s.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
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

          {error && (
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 6, maxWidth: 320 }}>
              <div className="notice error">{error}</div>
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
        {feature.manually_edited && (
          <div className="notice info" style={{ marginTop: 12 }}>
            This feature has been manually edited. The original description above is preserved as a historical record.
          </div>
        )}
      </div>
    );
  }

  window.Workspace = Workspace;
  window.GeoForgeInterpret = interpret;
})();
