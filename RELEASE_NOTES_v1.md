# GeoForge v1.0 — Release Notes

**Released:** 2026-05-15

## What's in v1.0

GeoForge v1.0 fully proves the measurement-origin annotation principle for structural geology at a focused scope.

### Geological features
- **Layers**: horizontal and dipping strata with lithology and thickness
- **Faults**: normal, reverse, thrust, strike-slip (dextral and sinistral), oblique-slip, and listric
- **Folds**: anticline, syncline, monocline

### Measurement-origin overlays (all seven)
- Dip angle vertex + arc
- Dip direction + compass
- Strike line + compass
- Layer thickness vector
- Fault throw/heave reconstruction
- Fold interlimb angle arc
- Fold plunge vertex + arc

### Editing
- **Path A**: Re-write the plain-English description; incremental re-parse preserves manual edits on unchanged sentences
- **Path B**: Numeric inspector fields — click any feature, edit values directly
- **Path C**: Direct 3D manipulation — drag handles on fault planes and layer contacts

### History playback
Timeline scrubber steps through geological events oldest → most recent at 0.5×, 1×, or 2× speed.

### Persistence
Manual JSON download and upload. Downloaded file includes both the 3D model and the original description.

### Other
- Toast error notifications (auto-dismiss 6 s) for LLM and upload failures
- Mobile-width fallback notice below 900 px
- Default state: labels and overlays on (full teaching mode)

---

## What's deferred

| Feature | Planned phase |
|---|---|
| Intrusive bodies (dykes, sills, batholiths, laccoliths) | Phase 6 |
| Unconformities (angular, disconformity, nonconformity) | Phase 6 |
| Mineralisation and ore deposits | Phase 7 |
| Hydrothermal pathway annotation | Phase 7 |
| Prediction mode | Phase 8 |
| Browser auto-save / local storage | Phase 8 |
| Share via URL | Phase 8 |
| Export (PDF / PNG) | Phase 8 |
| Complex folds (recumbent, isoclinal, chevron) | Future |
| Colourblind palettes, dark mode | Future |
| Imperial units toggle | Future |

---

## Active deviations from spec

1. **Model name / token cap**: The spec calls for `claude-sonnet-4-20250514` with `max_tokens=1000` via the Anthropic API. The sandbox environment exposes Claude only through `window.claude.complete`, which uses `claude-haiku-4-5` and a fixed 1024-token cap.

2. **Throw / displacement clamping**: `applyDefaults` in `workspace.jsx` clamps LLM-returned metre-scale values into the model's local coordinate frame. Raw values above threshold are scaled down proportionally to the total layer stack height.

---

## Known issues

None blocking. See GitHub issues for the backlog.
