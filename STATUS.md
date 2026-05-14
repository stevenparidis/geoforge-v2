# GeoForge — Status

**Last updated:** 2026-05-15
**Current phase:** Phase 3 complete
**Current sub-phase:** —
**Blockers:** none

## Phase completion

- [x] Phase 0 — Repository hygiene and baseline
- [ ] Phase 1 — Direct 3D manipulation (edit path C)
- [ ] Phase 2 — Incremental re-parse and conflict rule
- [x] Phase 3 — Listric fault correctness
- [ ] Phase 4 — Polish, error handling, performance
- [ ] Phase 5 — Acceptance testing and v1 release
- [ ] Phase 6 — Scope expansion: intrusions and unconformities
- [ ] Phase 7 — Mineralisation and ore deposits
- [ ] Phase 8 — Prediction, persistence, collaboration

## Phase 3 — Listric fault correctness
- [x] 3.1 Listric geometry rebuild
- [x] 3.2 Overlay system
- [x] 3.3 Reference card update and smoke test
- README "Deviations from the spec" entry #4 marked closed.

## Open spec questions

(From spec-v1.md §12 — carry through unchanged until resolved)

- §12.1 Sentence-level diffing for incremental re-parse (deferred to Phase 2)
- §12.2 Conflict rule when manual edits conflict with re-parse result (deferred to Phase 2)

## Active deviations from spec

(Carried from README "Deviations from the spec" section)

1. **Model name & token cap.** The spec asks for `claude-sonnet-4-20250514` with `max_tokens=1000` called directly via the Anthropic API. The sandbox only exposes Claude through `window.claude.complete`, which uses `claude-haiku-4-5` and a fixed 1024-token cap.
2. **No incremental re-parse.** The interpreter re-parses the whole description on each "Interpret" press. Addressed in Phase 2.
3. **Direct 3D manipulation (path C) is partial.** Click-to-select routes to the inspector; live drag-handles deferred. Addressed in Phase 1.
4. **Listric fault dip-at-depth overlay** approximates the curved profile with quadratic interpolation. Addressed in Phase 3.
5. **Throw / displacement clamping.** `applyDefaults` clamps LLM-returned metres-scale values into the model's local frame.
