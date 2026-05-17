# Phase 0 — Repository hygiene and baseline

**Parent plan:** `implementation-plan.md`
**Phase:** 0 of 6
**Status:** Ready to start

---

## Goal

Get the project into a state where a multi-agent team can work on it without stepping on each other, and where the orchestrator has a single source of truth about what's done and what's next.

## Pre-conditions

None. The existing prototype on disk (the seven `.jsx` files, `index.html`, `README.md`) is the starting baseline. No code from the prototype is deleted in this phase; only reorganised.

---

## Parallelism map

```
0.1 (file layout) ──┬──> 0.2 (status files)
                    ├──> 0.3 (smoke test)
                    └──> 0.4 (architecture doc)
```

- **Sequential:** 0.1 must complete before any other sub-phase.
- **Parallel after 0.1:** 0.2, 0.3, and 0.4 are independent of each other.

---

## Sub-phase 0.1 — Repository structure

**Goal:** A clean, predictable file layout.

**What to do:**

Create the following directory structure at the repo root:

```
geoforge/
├── index.html                 (entry point; unchanged behaviour)
├── src/
│   ├── app.jsx
│   ├── geo-data.jsx
│   ├── reference-view.jsx
│   ├── scene.jsx
│   ├── three-helpers.jsx
│   ├── tweaks-panel.jsx
│   └── workspace.jsx
├── implementation/
│   ├── spec.md
│   ├── spec-v1.md
│   ├── implementation-plan.md
│   ├── architecture.md         (created in 0.4)
│   ├── GeoForge_Geology_Reference.docx
│   ├── phase-0.md ... phase-6.md
│   └── screenshots/
├── tests/
│   └── acceptance/             (populated from phase 2 onwards)
├── CHANGELOG.md
├── STATUS.md
└── README.md                   (existing, lightly updated to point to new paths)
```

Update the `<script src="...">` tags in `index.html` to reference `src/` paths.

**Notes:**

- Keep file names as they are — the existing code uses `window.GD`, `window.GeoThree`, etc., and renaming files would only add risk for no benefit.
- The Babel-in-browser setup means there are no imports to update; only the `<script src>` paths.

**Definition of done:** The project loads from `index.html` exactly as before, with all files in their new locations.

---

## Sub-phase 0.2 — Status and changelog files

**Goal:** A single place to read the project's state.

**What to do:**

Create `STATUS.md` at the repo root with this template:

```markdown
# GeoForge — Status

**Last updated:** [ISO date]
**Current phase:** [number — title]
**Current sub-phase:** [number]
**Blockers:** [list, or "none"]

## Phase completion

- [x] Phase 0 — Repository hygiene and baseline
- [ ] Phase 1 — Close the v1 deviations
- [ ] Phase 2 — Polish, accessibility, and acceptance testing
- [ ] Phase 3 — v1 release
- [ ] Phase 4 — Scope expansion: intrusions and unconformities
- [ ] Phase 5 — Mineralisation and ore deposits
- [ ] Phase 6 — Prediction, persistence, collaboration

## Open spec questions

- [list of items from spec-v1 §12 still unresolved]

## Active deviations from spec

- [carry over from current README "Deviations from the spec" section]
```

Create `CHANGELOG.md` with an entry for phase 0 completion.

The orchestrator updates `STATUS.md` after every sub-phase completes; the file is the authoritative answer to "where are we?"

**Definition of done:** Both files exist and contain accurate current state.

---

## Sub-phase 0.3 — Smoke test

**Goal:** A test that proves the application still works, runnable on every commit.

**What to do:**

Decide on a test runner. Recommendation: a small Node script using Playwright. If that's heavy, a hand-rolled headless Chrome via Puppeteer also works. Pick one and stick with it for the rest of the project.

The first smoke test:

1. Launch a static server in `geoforge/` (e.g. `python -m http.server 8000`).
2. Open `http://localhost:8000/index.html` in headless Chrome.
3. Wait for `window.__threeReady` to be true (defined in `index.html`).
4. Type into the description textarea: `"A 1 m thick sandstone layer sits on top of a 0.8 m shale layer."`
5. Click the Interpret button.
6. Wait for the interpreter response (up to 15 s).
7. Read `window` state to confirm the resulting JSON has `layers.length === 2`.
8. Take a screenshot to `tests/screenshots/smoke-0.3.png`.
9. Exit with code 0 if everything checked out, non-zero otherwise.

The test does **not** assert anything about the LLM's exact output — only that the interpretation pipeline produces a parseable model with the right shape.

**Notes:**

- The interpreter uses `window.claude.complete`, which is only available in the sandbox runtime. If running the test outside the sandbox, you'll need to stub it. Recommended: detect `localhost:8000` and inject a stub that returns a known fixture. Document this in the test file.

**Definition of done:** Running `npm run smoke` (or equivalent) passes. The test produces a screenshot.

---

## Sub-phase 0.4 — Architecture documentation

**Goal:** A document that explains the prototype's architecture to a new agent in under five minutes.

**What to do:**

Create `docs/architecture.md` covering:

- **The shared off-DOM WebGLRenderer.** What it is, why it exists (per-page WebGL context cap), how `Surface` in `scene.jsx` coordinates the per-card 2D canvases. Diagram if helpful.
- **The `window` namespacing pattern.** Babel-in-browser doesn't support ES modules cleanly, so each file attaches its exports to `window`: `window.GD`, `window.GeoThree`, `window.GeoScene`, `window.Workspace`, `window.ReferenceView`, `window.TweaksPanel`. Document this convention.
- **JSON as the single source of truth.** Three writers (interpreter, inspector, manual edits) all flow into one `setModel` call. The renderer reads. No second copy of state.
- **The `field_origin` / `manually_edited` convention.** Defined on every layer and event. Read by the inspector to render the dashed amber underline. Maintained by `applyDefaults` and the inspector edit handler.
- **Script load order.** `geo-data` → `three-helpers` → `scene` → `reference-view` → `workspace` → `tweaks-panel` → `app`. Each file depends on the previous one's `window` exports.
- **Where the LLM call lives.** `workspace.jsx`'s `interpret()` function. The system prompt is the long string `INTERPRETER_SYSTEM_PROMPT` at the top of the same file.

**Definition of done:** A new contributor can read this doc and modify the codebase without asking architectural questions.

---

## Acceptance criteria for phase 0

1. The repo follows the layout in 0.1; the application still works.
2. `STATUS.md` and `CHANGELOG.md` exist with accurate content.
3. `npm run smoke` (or the equivalent) passes.
4. `docs/architecture.md` exists and is accurate.

When all four are true, update `STATUS.md` to `"Phase 0 complete; Phase 1 ready to start"` and commit.
