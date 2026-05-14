# Changelog

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
