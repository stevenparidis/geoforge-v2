# GeoForge — Status

**Last updated:** 2026-05-15
**Current phase:** v1.0 released
**Current sub-phase:** —
**Blockers:** none

## Phase completion

- [x] Phase 0 — Repository hygiene and baseline
- [x] Phase 1 — Direct 3D manipulation (edit path C)
- [x] Phase 2 — Incremental re-parse and conflict rule
- [x] Phase 3 — Listric fault correctness
- [x] Phase 4 — Polish, error handling, performance
- [x] Phase 5 — Acceptance testing and v1 release
- [ ] Phase 6 — Scope expansion: intrusions and unconformities
- [ ] Phase 7 — Mineralisation and ore deposits
- [ ] Phase 8 — Prediction, persistence, collaboration

## Phase 5 — Acceptance testing and v1 release

- [x] 5.1 Acceptance test suite (7 tests, all pass)
- [x] 5.2 Fix-its (no fixes needed — all 7 tests passed first run)
- [x] 5.3 Version tag and release notes
- [ ] 5.4 User sign-off (pending)

## Phase 4 — Polish, error handling, performance

- [x] 4.1 Merge phases 1, 2, 3 (already on master — no conflicts)
- [x] 4.2 Regression sweep (all 4 smoke tests pass)
- [x] 4.3 Empty-state polish (click-to-fill textarea; two-click demo flow)
- [x] 4.4 Error handling (floating toast for LLM failure and invalid JSON; auto-dismiss 6 s)
- [x] 4.5 Performance check (stress fixture: 10 layers, 5 faults, 2 folds; `npm run perf`)
- [x] 4.6 Mobile-width fallback (< 900 px shows full-screen notice; reactive on resize)
- [x] 4.7 README sync

## Phase 1 — Direct 3D manipulation

- [x] 1.1 Handle layer foundation
- [x] 1.2 Drag projection per handle type
- [x] 1.3 Overlay co-update during drag
- [x] 1.4 Acceptance and smoke-test extension
- README "Deviations from the spec" entry #3 marked closed.
- Acceptance-criteria table in README: row 4 updated to ✅ for path C.

## Phase 2 — Incremental re-parse
- [x] 2.1 Conflict rule draft
- [x] 2.2 Rule sign-off (user agreed on 2026-05-15)
- [x] 2.3 Description differ module (window.GeoDiff)
- [x] 2.4 Merge-mode interpreter prompt
- [x] 2.5 Workspace rewire (diff-aware onInterpret, mergeIntoModel)
- [x] 2.6 Tests (unit + smoke)
- README "Deviations from the spec" entry #2 marked closed.

## Phase 3 — Listric fault correctness
- [x] 3.1 Listric geometry rebuild
- [x] 3.2 Overlay system
- [x] 3.3 Reference card update and smoke test
- README "Deviations from the spec" entry #4 marked closed.

## Open spec questions

(All previously open questions resolved in Phases 2 and 3.)

## Active deviations from spec

1. **Model name & token cap.** The spec asks for `claude-sonnet-4-20250514` with `max_tokens=1000` called directly via the Anthropic API. The sandbox only exposes Claude through `window.claude.complete`, which uses `claude-haiku-4-5` and a fixed 1024-token cap.
5. **Throw / displacement clamping.** `applyDefaults` clamps LLM-returned metres-scale values into the model's local frame.

---

**v1.0 released 2026-05-15** — all seven acceptance criteria pass.
