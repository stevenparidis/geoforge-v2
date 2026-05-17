# v1 Screenshots Index

Captured during Phase A.2 using Playwright (headless Chromium) against a local
static server serving the v1 app. Each formation was scrolled into view, allowed
3–4 seconds for the Three.js render to settle, then clipped at the card boundary.

Two variants per formation:
- `*-overlays-on.png` — toolbar Overlays toggle ON (default state, cyan geometric annotations visible)
- `*-overlays-off.png` — toolbar Overlays toggle OFF (clean 3D render only)

Additionally, `full-reference-view.png` is a full-page screenshot of the entire
Formation Reference tab for archival.

---

## Formations captured

| # | Section | Formation ID | Overlays ON | Overlays OFF |
|---|---------|-------------|-------------|--------------|
| 1 | layers | `horizontal-strata` | [on](layers/horizontal-strata-overlays-on.png) | [off](layers/horizontal-strata-overlays-off.png) |
| 2 | layers | `dipping-strata` | [on](layers/dipping-strata-overlays-on.png) | [off](layers/dipping-strata-overlays-off.png) |
| 3 | layers | `multilayer-thickness` | [on](layers/multilayer-thickness-overlays-on.png) | [off](layers/multilayer-thickness-overlays-off.png) |
| 4 | faults | `normal-fault` | [on](faults/normal-fault-overlays-on.png) | [off](faults/normal-fault-overlays-off.png) |
| 5 | faults | `reverse-fault` | [on](faults/reverse-fault-overlays-on.png) | [off](faults/reverse-fault-overlays-off.png) |
| 6 | faults | `thrust-fault` | [on](faults/thrust-fault-overlays-on.png) | [off](faults/thrust-fault-overlays-off.png) |
| 7 | faults | `strike-slip-dextral` | [on](faults/strike-slip-dextral-overlays-on.png) | [off](faults/strike-slip-dextral-overlays-off.png) |
| 8 | faults | `strike-slip-sinistral` | [on](faults/strike-slip-sinistral-overlays-on.png) | [off](faults/strike-slip-sinistral-overlays-off.png) |
| 9 | faults | `oblique-slip` | [on](faults/oblique-slip-overlays-on.png) | [off](faults/oblique-slip-overlays-off.png) |
| 10 | faults | `listric-fault` | [on](faults/listric-fault-overlays-on.png) | [off](faults/listric-fault-overlays-off.png) |
| 11 | folds | `anticline` | [on](folds/anticline-overlays-on.png) | [off](folds/anticline-overlays-off.png) |
| 12 | folds | `syncline` | [on](folds/syncline-overlays-on.png) | [off](folds/syncline-overlays-off.png) |
| 13 | folds | `monocline` | [on](folds/monocline-overlays-on.png) | [off](folds/monocline-overlays-off.png) |
| 14 | intrusions | `dyke-basalt` | [on](intrusions/dyke-basalt-overlays-on.png) | [off](intrusions/dyke-basalt-overlays-off.png) |
| 15 | intrusions | `sill-basalt` | [on](intrusions/sill-basalt-overlays-on.png) | [off](intrusions/sill-basalt-overlays-off.png) |
| 16 | intrusions | `batholith-granite` | [on](intrusions/batholith-granite-overlays-on.png) | [off](intrusions/batholith-granite-overlays-off.png) |
| 17 | intrusions | `laccolith-granite` | [on](intrusions/laccolith-granite-overlays-on.png) | [off](intrusions/laccolith-granite-overlays-off.png) |
| 18 | unconformities | `angular-unconformity` | [on](unconformities/angular-unconformity-overlays-on.png) | [off](unconformities/angular-unconformity-overlays-off.png) |
| 19 | unconformities | `disconformity` | [on](unconformities/disconformity-overlays-on.png) | [off](unconformities/disconformity-overlays-off.png) |
| 20 | unconformities | `nonconformity` | [on](unconformities/nonconformity-overlays-on.png) | [off](unconformities/nonconformity-overlays-off.png) |
| 21 | mineralisation | `porphyry-cu-au` | [on](mineralisation/porphyry-cu-au-overlays-on.png) | [off](mineralisation/porphyry-cu-au-overlays-off.png) |
| 22 | mineralisation | `orogenic-gold` | [on](mineralisation/orogenic-gold-overlays-on.png) | [off](mineralisation/orogenic-gold-overlays-off.png) |
| 23 | mineralisation | `vms-deposit` | [on](mineralisation/vms-deposit-overlays-on.png) | [off](mineralisation/vms-deposit-overlays-off.png) |
| 24 | mineralisation | `skarn-deposit` | [on](mineralisation/skarn-deposit-overlays-on.png) | [off](mineralisation/skarn-deposit-overlays-off.png) |
| 25 | mineralisation | `epithermal-au-ag` | [on](mineralisation/epithermal-au-ag-overlays-on.png) | [off](mineralisation/epithermal-au-ag-overlays-off.png) |

---

## Section totals

| Section | Count |
|---------|-------|
| layers | 3 |
| faults | 7 |
| folds | 3 |
| intrusions | 4 |
| unconformities | 3 |
| mineralisation | 5 |
| **Total** | **25** |

> Note: v1's Formation Reference includes anticline, syncline, and monocline only for folds. Dome and basin were not included in v1 — their absence is by design.
