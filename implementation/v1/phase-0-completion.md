# Phase 0 Completion Document

**Phase:** 0 — Repository hygiene and baseline
**Completed:** 2026-05-14
**Next phase:** Phase 1 — Direct 3D manipulation (edit path C)

---

## What was accomplished

All four acceptance criteria from `phase-0.md` are satisfied:

| Criterion | Status |
|---|---|
| Repo follows the target layout; application still works | ✅ |
| `STATUS.md` and `CHANGELOG.md` exist with accurate content | ✅ |
| `npm run smoke` passes | ✅ |
| `implementation/architecture.md` exists and is accurate | ✅ |

### Sub-phase summary

| Sub-phase | PR | Outcome |
|---|---|---|
| 0.1 — Repository structure | #1 | File reorganisation, `src/` script path fix, stub files |
| 0.2 — Status and changelog | #2 | `STATUS.md` and `CHANGELOG.md` fully populated |
| 0.3 — Smoke test | #3 | Playwright test passing; `npm run smoke` wired up |
| 0.4 — Architecture doc | #4 | 322-line `implementation/architecture.md` covering all required sections |

---

## What was overcome

### 1. Duplicate and misnamed spec files

The baseline had spec files in two locations with inconsistent naming (`spec/spec_v1.md` with an underscore vs `design/uploads/spec-v1.md` with a hyphen). The `design/uploads/` versions were treated as canonical and moved to `implementation/`; the `spec/` copy was removed. The two files had different content (the `spec/` copy was the full v1 spec; they were maintained separately). Future agents should treat `implementation/spec-v1.md` as canonical.

### 2. Extra files on the architecture doc branch (PR #4)

The 0.4 worktree was created from master while the 0.2 and 0.3 agents were still running concurrently. When the 0.2 and 0.3 agents committed their changes, those commits ended up as parents of the 0.4 agent's commit (the worktree appeared to inherit the history of the parallel branches). The fix was a `git rebase --onto origin/master` to drop the foreign commits, leaving only the `architecture.md` changes on the 0.4 branch. The force-push was necessary to rewrite history after the rebase.

### 3. Smoke test DOM assertion (PR #3)

The initial smoke test counted all `.feat-item` elements across both the Layers and Events sections of the inspector (a global `querySelectorAll`). For a 2-layer/0-event fixture this coincidentally returned `2`, but it was not a true `layers.length === 2` check. The fix scoped the query to `document.querySelector('.feat-list')` (the first/Layers list) before counting children.

### 4. Architecture doc factual inaccuracies (PR #4)

Two invented facts were caught in review:
- Section 7 said "seven fault subtypes" — the actual codebase has six (normal, reverse, thrust, strike-slip, oblique, listric).
- Section 4 listed `"default"` as a valid `field_origin` value — this value does not exist in the codebase; only `"stated"` and `"inferred"` are used.

Both were corrected before merge. Additionally, the claim "every file is wrapped in an IIFE" was qualified — `tweaks-panel.jsx` uses `Object.assign(window, ...)` directly without an IIFE wrapper.

---

## What was not detailed in the implementation plan

### `window.claude.complete` argument shape

The implementation plan described `window.claude.complete` as a function that takes a prompt string. In reality it takes an **object**: `{ messages: [{ role: 'user', content: string }], system: string }`. The smoke test's stub correctly implements this interface (discovered by reading `workspace.jsx` directly). Future agents writing LLM-related tests should use this shape.

### Concurrent worktree commit contamination

The plan's parallelism map (0.2, 0.3, 0.4 independent after 0.1) is correct at the logical level, but the worktree implementation caused one branch to inherit foreign commits from sibling agents. This is a git worktree isolation concern — future parallel phases should ensure each agent explicitly branches from `origin/master` (not from any local state) and uses `git rebase --onto origin/<base>` if contamination is detected.

### package-lock.json committed

The smoke test setup ran `npm install`, which produced a `package-lock.json`. This file is now committed to master. It was not mentioned in the phase-0 plan. This is correct practice (lockfiles should be committed for reproducible installs) and should be maintained going forward.

### `.claude/settings.json` and `.claude/settings.local.json` in git

These Claude Code configuration files were included in the initial baseline commit. They are machine-local and arguably should be in `.gitignore`. They were not added to `.gitignore` in this phase to avoid disrupting the Claude Code environment. A future housekeeping commit could address this; it is not a blocker.

---

## Important notes for Phase 1

- **Phases 1, 2, and 3 are independent and can run in parallel.** Each touches a different part of the codebase (phase 1: handle mesh layer; phase 2: interpreter + diff layer; phase 3: listric geometry builder).
- **The `npm run smoke` test must pass on every commit** on each parallel branch — this is the baseline health check.
- **The `field_origin` / `manually_edited` convention** is documented in `implementation/architecture.md` §4. Phase 1's drag-handle edits must set `manually_edited: true` and update `field_origin` to `"stated"` on any field the user modifies by dragging.
- **The `window.claude.complete` stub pattern** for tests is documented in `tests/smoke/smoke.test.js`. Phase 2's incremental-re-parse tests should reuse this pattern.
- **The shared WebGL renderer** (documented in `architecture.md` §1) means adding new geometry in Phase 1 must go through the existing `Surface.tick()` render loop — do not create a second `WebGLRenderer`.
- **The worktree contamination issue** documented above: each Phase 1/2/3 agent should run `git log --oneline origin/master..HEAD` early to verify their branch contains only their own commits.
