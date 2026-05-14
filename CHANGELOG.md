# Changelog

## [Unreleased] — Phase 0

### Added
- `src/` directory containing all app JSX modules (app.jsx, geo-data.jsx, reference-view.jsx, scene.jsx, three-helpers.jsx, tweaks-panel.jsx, workspace.jsx)
- `implementation/` directory containing all planning documents, spec files, the GeoForge geology reference, and prototype screenshots
- `tests/acceptance/` directory skeleton for future acceptance tests
- `STATUS.md` — single source of truth for project state
- `CHANGELOG.md` — this file
- `.gitignore`

### Changed
- `index.html` script src paths updated from root-relative to `src/`-prefixed (e.g. `geo-data.jsx` → `src/geo-data.jsx`) — the application behaviour is unchanged
- `README.md` file map updated to reflect new `src/` and `implementation/` paths

### Removed
- `design/` directory (contents reorganised into `implementation/`)
- `spec/` directory (contents reorganised into `implementation/`)
