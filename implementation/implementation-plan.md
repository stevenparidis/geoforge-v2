# GeoForge — Multi-phase Implementation Plan

**Document:** `implementation-plan.md`
**Version:** 0.2
**Parent documents:** `spec.md`, `spec-v1.md`
**Companion reference:** `GeoForge_Geology_Reference.docx`
**Starting point:** existing prototype (Babel-in-browser SPA, single off-DOM renderer, working interpreter, partial v1 coverage per README acceptance-criteria table)

---

## How to use this document

This plan takes the existing GeoForge prototype from its current state — a mostly-working v1 with three documented deviations — through to a polished, fully-spec-compliant v1, and then sets up the rails for the deferred features (mineralisation, unconformities, intrusions, prediction, persistence).

The plan is organised into **eight phases**. Each phase has its own document (`phase-0.md`, `phase-1.md`, …) with enough detail that an orchestrating agent can pick up the phase and dispatch sub-tasks without needing to ask further questions of the spec. Phase 0 is housekeeping; phases 1–3 each close one v1 deviation; phases 4–5 polish and ship v1; phases 6–8 build out the deferred vision.

Each phase document contains, at the top:

- **Goal** — the single sentence answering "what does this phase achieve?"
- **Pre-conditions** — what must be true before the phase starts.
- **Sub-phases** — the breakdown of work.
- **Parallelism map** — which sub-phases can run concurrently and which must run in sequence.
- **Acceptance criteria** — testable conditions for the phase as a whole.

This master document contains the same information at a summary level so the orchestrator has a single map of the whole project.

---

## Why eight phases, not six

An earlier draft of this plan bundled three independent pieces of work — direct 3D manipulation, incremental re-parse, and the listric fault overlay — into a single "close the v1 deviations" phase. They were grouped because the prototype's README lists them all as deviations.

That grouping is wrong for engineering work. Each piece is a self-contained, demonstrable shipping unit, and each can be owned by a different sub-agent without coordination overhead. Splitting them makes each one a real checkpoint.

The trade-off is more phases to track, but each phase is now small enough to complete in a single focused work session.

---

## Phase summary

| Phase | Title                                              | Closes                  | Size   | Depends on |
|-------|----------------------------------------------------|-------------------------|--------|------------|
| 0     | Repository hygiene and baseline                    | —                       | Small  | —          |
| 1     | Direct 3D manipulation (edit path C)               | spec-v1 §6.3            | Medium | Phase 0    |
| 2     | Incremental re-parse and conflict rule             | spec-v1 §12.1, §12.2    | Medium | Phase 0    |
| 3     | Listric fault correctness                          | README deviation #4     | Small  | Phase 0    |
| 4     | Polish, error handling, performance                | spec-v1 quality bar     | Medium | Phases 1–3 |
| 5     | Acceptance testing and v1 release                  | spec-v1 §11             | Small  | Phase 4    |
| 6     | Scope expansion: intrusions and unconformities     | spec §3.2 (partial)     | Large  | Phase 5    |
| 7     | Mineralisation and ore deposits                    | spec §3.2 (remainder)   | Large  | Phase 6    |
| 8     | Prediction, persistence, collaboration             | spec §10                | Large  | Phase 7    |

**Phases 1, 2, and 3 are independent of each other.** All three can run in parallel after phase 0 completes. Each touches a different part of the codebase: phase 1 adds a new handle layer, phase 2 modifies the interpreter and adds a diff layer, phase 3 rewrites one geometry builder. Three sub-agents can own them concurrently and the only merge work is in phase 4.

**Phase 4 is the convergence point** where the three parallel streams come together and get polished as one shippable v1.

**Phase 5 is the release.** Phases 6–8 are post-v1 vision work.

---

## Phase 0 — Repository hygiene and baseline

**Goal:** Get the project into a state where a multi-agent team can work on it without stepping on each other.

**Outcome:** Clean repo layout (`src/`, `docs/`, `tests/`), a `STATUS.md` the orchestrator updates each pass, a smoke test that proves the existing prototype still works, and an architecture doc.

See `phase-0.md`.

---

## Phase 1 — Direct 3D manipulation (edit path C)

**Goal:** Add live drag handles to faults, layers, and folds so users can edit the model directly in 3D. Closes deviation #3 from the current README.

**Outcome:** Dragging a handle on a fault plane changes its dip, with the dip-angle arc widening or narrowing in lockstep. The same applies to layer thickness, fold interlimb angle, and fold plunge.

**Concurrent with:** phases 2 and 3.

See `phase-1.md`.

---

## Phase 2 — Incremental re-parse and conflict rule

**Goal:** Replace the "re-parse the whole description on every Interpret press" behaviour with sentence-level diffing, so manually-edited fields are preserved when the user edits an unrelated part of the description. Closes deviation #2 from the current README and resolves spec-v1 open questions §12.1 and §12.2.

**Outcome:** Editing one sentence in a three-sentence description re-runs the interpreter only on that sentence. Manually-edited fields on other events are preserved across re-parses.

**Concurrent with:** phases 1 and 3.

See `phase-2.md`.

---

## Phase 3 — Listric fault correctness

**Goal:** Replace the quadratic approximation of the listric fault profile with a proper circular-arc geometry, and annotate both the surface dip and the dip-at-depth with their own measurement-origin overlays. Closes deviation #4 from the current README.

**Outcome:** The listric fault renders as a visibly curved surface with two dip-angle arcs — one at the surface, one at the detachment depth — each annotated against its own horizontal reference plane.

**Concurrent with:** phases 1 and 2.

See `phase-3.md`.

---

## Phase 4 — Polish, error handling, performance

**Goal:** Make the prototype shippable. This phase is the convergence point where the three parallel streams (phases 1, 2, 3) get merged and polished together.

**Outcome:** Empty-state polish, error-handling for LLM failures and bad uploads, performance check under realistic feature counts, label-collision handling, mobile-width fallback notice. The README is updated to reflect reality.

**Pre-condition:** Phases 1, 2, and 3 all complete.

See `phase-4.md`.

---

## Phase 5 — Acceptance testing and v1 release

**Goal:** Walk through `spec-v1.md` §11 acceptance criteria with formal tests, capture any final fixes, and cut v1.0.

**Outcome:** All acceptance criteria pass under automated tests. Version tag is updated, release notes are written, user signs off after running through two real-world descriptions.

See `phase-5.md`.

---

## Phase 6 — Scope expansion: intrusions and unconformities

**Goal:** Add the two highest-priority post-v1 feature classes: intrusive bodies (dykes, sills, batholiths, laccoliths) and unconformities (angular, dis-, non-).

**Outcome:** Both feature classes interpret from plain English, render with full overlays, and appear in the formation reference page.

See `phase-6.md`.

---

## Phase 7 — Mineralisation and ore deposits

**Goal:** Add the v2-priority deposit set (porphyry, orogenic gold, VMS, skarn, epithermal) with structural control, alteration shells, and the five-element hydrothermal annotation from reference §13.

**Outcome:** GeoForge becomes useful for understanding *why* deposits form where they do, not just *what* the structure looks like.

See `phase-7.md`.

---

## Phase 8 — Prediction, persistence, collaboration

**Goal:** Address the deferred features from `spec.md` §10: mineralisation prediction, browser-storage auto-save, share-via-link URLs, and PDF/PNG export.

**Outcome:** The full vision in `spec.md` is realised.

See `phase-8.md`.

---

## Cross-phase concerns

### Spec drift

`spec.md`, `spec-v1.md`, and the reference document are the authoritative sources. Any phase that needs to deviate must record the deviation in `STATUS.md` and propose an explicit spec change. The pattern from the existing README — "Deviations from the spec" — is the right one and should be carried through every phase.

### The measurement-origin principle

The principle from `spec.md` §3 — every numerical value must show its geometric origin — applies to every new feature added in phases 6–8. There is no version of GeoForge that introduces a feature without its measurement overlays. If an overlay cannot be designed for a measurement, the measurement is not added.

### The `field_origin` and `manually_edited` flags

Every new feature class added in phases 6–8 must use the same convention: `field_origin: { fieldName: "stated" | "inferred" }` and `manually_edited: true` on fields the user has overridden. This convention is what powers the visual stated-vs-inferred contract, and it cannot be optional.

### Test coverage

`tests/acceptance/` is the project's quality gate. Every phase from phase 4 onwards adds tests for the features it introduces; no phase removes tests. By phase 8, the test suite should cover every feature in the reference document.

### Concurrency conventions

When phases 1–3 run in parallel, the three sub-agents should:

- Each work on a feature branch (or git worktree) — never push directly to main.
- Touch only files in their phase's "files modified" list (recorded in each phase doc).
- Append to `STATUS.md` under their phase heading; never modify another phase's section.
- Run the phase-0 smoke test on every commit on their branch.

The phase-4 merge brings the three branches together and is the only point where cross-phase coordination is required.

---

## Document changelog

| Version | Date       | Changes                                                                                          |
|---------|------------|--------------------------------------------------------------------------------------------------|
| 0.1     | 2026-05-14 | Initial six-phase plan.                                                                          |
| 0.2     | 2026-05-14 | Split old phase 1 into three independent phases (direct manipulation / re-parse / listric); renumbered the rest. Phases 1–3 now run in parallel. |
