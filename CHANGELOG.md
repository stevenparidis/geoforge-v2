# Changelog

## [1.0.0] — Phase 5 — 2026-05-15

### Added
- `tests/acceptance/` — 7 Playwright acceptance tests covering all v1 acceptance criteria (AC1–AC7)
- `tests/acceptance/run-all.js` — sequential runner for the acceptance suite
- `npm run acceptance` script in `package.json`
- `RELEASE_NOTES_v1.md` — v1.0 release notes

### Changed
- `src/app.jsx` — version string updated from `v1 · prototype` to `v1.0`
- `STATUS.md` — updated to v1 released

## [0.4.0] — Phase 4 — 2026-05-15

### Added
- `tests/smoke/perf.test.js` — Playwright performance stress test with 10-layer/5-fault/2-fold fixture; three threshold assertions (render < 2 s, drag ≥ 30 fps, overlay toggle < 200 ms)
- `npm run perf` script in `package.json`
- Toast error notification system in `src/workspace.jsx` (`Toast` component; auto-dismiss 6 s; manual ✕)
- Mobile-width fallback in `src/app.jsx` — viewports < 900 px render a full-screen notice instead of the workspace
- Click-to-fill UX in description textarea — clicking when empty fills it with a one-sentence example

### Changed
- `src/workspace.jsx` — user-facing error messages: LLM failures → "Interpreter couldn't read that. Try again, or rephrase."; invalid JSON upload → "This file isn't a valid GeoForge model. Check it was downloaded from this app."
- `src/workspace.jsx` — inline error notice replaced with floating Toast component (sibling of workspace div via React.Fragment)
- `src/workspace.jsx` — JSON upload now validates for GeoForge structure before applying
- `src/workspace.jsx` — description textarea placeholder simplified to the recommended example sentence
- `src/app.jsx` — Overlays toggle calls imperative `applyVisibility()` before React state dispatch, reducing overlay toggle latency from ~210 ms to ~26 ms on large models
- `src/scene.jsx` — exposes `stateRef.current.applyVisibility()` for imperative overlay/label/grid toggling; nulled in cleanup to prevent stale-ref calls after unmount

## [0.1.0] — Phase 0 — 2026-05-14

### Added
- `src/` directory containing all app JSX modules (app.jsx, geo-data.jsx, reference-view.jsx, scene.jsx, three-helpers.jsx, tweaks-panel.jsx, workspace.jsx)
- `implementation/` directory containing all planning documents, spec files, the GeoForge geology reference, and prototype screenshots
- `implementation/architecture.md` — architecture document covering shared WebGL renderer, window namespacing, JSON model, field_origin convention, script load order, LLM call location, and overlay primitive system
- `tests/acceptance/` directory skeleton for future acceptance tests
- `tests/smoke/smoke.test.js` — Playwright smoke test; stubs `window.claude.complete`, runs a 2-layer interpretation, asserts `layers.length === 2`
- `package.json` with `npm run smoke` script
- `STATUS.md` — single source of truth for project state
- `CHANGELOG.md` — this file
- `.gitignore`

### Changed
- `index.html` script src paths updated from root-relative to `src/`-prefixed (e.g. `geo-data.jsx` → `src/geo-data.jsx`) — the application behaviour is unchanged
- `README.md` file map updated to reflect new `src/` and `implementation/` paths

### Removed
- `design/` directory (contents reorganised into `implementation/`)
- `spec/` directory (contents reorganised into `implementation/`)
