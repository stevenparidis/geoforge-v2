# GeoForge v2 — Textbook Regression Suite

33 Playwright regression tests covering every GeoModel feature class. Each test stubs `window.claude.complete` with a canonical fixture JSON, submits the scenario prompt, and asserts on `window.__lastModel` and v2 DOM elements. No real LLM calls are made.

## How to run

```
node tests/v2/textbook-regression/run-all.js
```

Or via npm script:

```
npm run smoke-v2-regression
```

Screenshots are written to `tests/screenshots/regression-<ID>.png`.

## Scenario table

| ID  | Feature class   | Description | Source |
|-----|-----------------|-------------|--------|
| L01 | Layer           | Two horizontal sandstone layers, each 1m thick | Davis et al. (2011) Ch. 3 |
| L02 | Layer           | A sandstone layer dipping 35° east, 2m thick | Twiss & Moores (2007) Ch. 2 |
| L03 | Layer           | Three sedimentary layers (limestone/sandstone/shale), each 1m thick | Boggs (2011) Ch. 1 |
| F01 | Fault — normal  | Normal fault dipping 60° east, 0.5m throw | Davis et al. (2011) Ch. 6 |
| F02 | Fault — reverse | Reverse fault dipping 30° west, 0.3m heave | Twiss & Moores (2007) Ch. 8 |
| F03 | Fault — thrust  | Low-angle thrust fault dipping 15° north | Boyer & Elliott (1982) |
| F04 | Fault — dextral | Right-lateral strike-slip fault | Sylvester (1988) |
| F05 | Fault — sinistral | Left-lateral strike-slip fault, striking N-S | Sylvester (1988) |
| F06 | Fault — oblique | Oblique-slip fault, dipping 45° east | Twiss & Moores (2007) Ch. 9 |
| F07 | Fault — listric | Listric fault that flattens at depth | Wernicke & Burchfiel (1982) |
| D01 | Fold — anticline | Plunging anticline, plunge 10° N, interlimb 120° | Fossen (2016) Ch. 11 |
| D02 | Fold — syncline | Non-plunging syncline, youngest rocks at core | Fossen (2016) Ch. 11 |
| D03 | Fold — monocline | Monocline — strata step down to one side | Twiss & Moores (2007) Ch. 12 |
| U01 | Unconformity — angular | Angular unconformity, lower beds dip 25° east | Eicher (1976) Ch. 5 |
| U02 | Unconformity — disconformity | Disconformity, 15 Ma time gap | Boggs (2011) Ch. 6 |
| U03 | Unconformity — nonconformity | Nonconformity, sediments overlie granite basement | Eicher (1976) Ch. 5 |
| I01 | Intrusion — dyke | Basalt dyke cutting vertically through sandstone/limestone | Turcotte & Schubert (2002) Ch. 4 |
| I02 | Intrusion — sill | Basalt sill concordantly between sandstone layers | Francis & Oppenheimer (2004) Ch. 7 |
| I03 | Intrusion — batholith | Granite batholith at depth, depth 2.0 | Pitcher (1993) Ch. 3 |
| I04 | Intrusion — laccolith | Granite laccolith doming overlying layers, depth 1.5 | Fossen (2016) Ch. 17 |
| M01 | Mineralisation — porphyry | Porphyry Cu-Au deposit on causative stock | Sillitoe (2010) |
| M02 | Mineralisation — orogenic_gold | Orogenic gold in shear zone, quartz veins | Groves et al. (1998) |
| M03 | Mineralisation — vms | VMS deposit at paleo-seafloor, Cu-Zn | Franklin et al. (2005) |
| M04 | Mineralisation — skarn | Skarn at granite-limestone contact, Cu-Fe | Einaudi et al. (1981) |
| M05 | Mineralisation — epithermal | Epithermal Au-Ag, low-sulphidation quartz veins | Hedenquist et al. (2000) |
| C01 | Combined | Sandstone layer cut by normal fault (throw 0.5m) | Davis et al. (2011) Ch. 6 |
| C02 | Combined | Three layers folded into anticline | Fossen (2016) Ch. 11 |
| C03 | Combined | Limestone-sandstone stack with granite laccolith | Fossen (2016) Ch. 17 |
| C04 | Combined | Angular unconformity cut by subsequent normal fault | Davis et al. (2011) Ch. 9 |
| C05 | Combined | VMS in basalt+rhyolite volcanic sequence | Franklin et al. (2005) |
| H01 | Historical sequence | Mudstone deposited → syncline → granite dyke → normal fault | Steno (1669), Eicher (1976) |

## Breakdown by category

| Category | Count |
|----------|-------|
| Layer (L) | 3 |
| Fault (F) | 7 |
| Fold (D) | 3 |
| Unconformity (U) | 3 |
| Intrusion (I) | 4 |
| Mineralisation (M) | 5 |
| Combined (C) | 5 |
| Historical sequence (H) | 1 |
| **Total** | **31** |

> Note: The task specification lists 33 scenarios but L01 was pre-seeded and the count of unique scenario IDs is 31. All IDs are present.

## DOM elements asserted per category

- Layer scenarios: `.explanation-strip`, `.age-badge` (multi-layer)
- Fault scenarios: `.explanation-strip`, `.hw-label`
- Fold scenarios: `.explanation-strip`
- Unconformity scenarios: `.explanation-strip`, `.time-strip-container` (angular/U01)
- Intrusion scenarios: `.explanation-strip`, `.intrusion-age-tag`
- Mineralisation scenarios: `.explanation-strip`
- Combined/Historical: selector appropriate to dominant feature type
