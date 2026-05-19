# Misconception Validation Test Suite

This suite verifies that the GeoForge v2 UI correctly renders the `.validation-note-pill`
component when a model feature contains a `validation_note` field, and that the pill is
absent when no `validation_note` is present.

## Two-tier testing strategy

**Tier 1 — Stub tests (this suite):** These tests replace `window.claude.complete` with a
fixture that returns a pre-authored GeoModel JSON. The fixtures for positive tests include a
`validation_note` field on the relevant feature; negative fixtures omit it. Tests assert only
UI behaviour: does the pill appear or not? This layer runs fast and deterministically — no LLM
call is made.

**Tier 2 — Live LLM tests (manual):** Submit each `description.txt` to the live app without
stubbing. Verify that the LLM returns a `validation_note` matching the content in
`expected-validation-note.txt`. Tier 2 tests LLM geological reasoning and are not automated
because LLM output is non-deterministic.

## Test table

| ID  | Type     | Description                                        | What it tests                                               |
|-----|----------|----------------------------------------------------|-------------------------------------------------------------|
| M01 | Positive | Fault dipping 60° east, hanging wall on east side  | Pill appears when `validation_note` set on fault event      |
| M02 | Positive | Anticline with youngest rocks in core              | Pill appears when `validation_note` set on fold event       |
| M03 | Positive | Fault strike 045°, dip direction 200°              | Pill appears for right-hand rule violation on fault event   |
| M04 | Positive | Thrust fault dipping 70° east                      | Pill appears when thrust dip > 45° validation_note set      |
| M05 | Positive | Normal fault, hanging wall moves up                | Pill appears for HW motion error on normal fault event      |
| M06 | Positive | Granite dyke older than the sandstone it cuts      | Pill appears when `validation_note` set on intrusion        |
| M07 | Positive | Fault throw 5m = displacement 5m at 45° dip        | Pill appears for throw/displacement conflation note         |
| N01 | Negative | Horizontal sandstone layer 2m thick                | No pill for a valid simple layer (no events)                |
| N02 | Negative | Normal fault 60° east, HW correctly down-thrown    | No pill after clicking a valid fault event                  |
| N03 | Negative | Anticline with oldest rocks in core, 110°          | No pill after clicking a valid fold event                   |
| N04 | Negative | Thrust fault dipping 20° east                      | No pill after clicking a valid low-angle thrust             |
| N05 | Negative | Granite batholith intruding limestone and shale    | No pill for valid intrusion (younger than host)             |

## How to run

```
node tests/v2/misconception-checks/run-all.js
```

Or via npm:

```
npm run smoke-v2-misconceptions
```

Screenshots are saved to `tests/screenshots/misconception-<ID>.png`.

## Live LLM testing instructions

For each scenario:
1. Open the GeoForge v2 app (no stub).
2. Paste the contents of `<ID>/description.txt` into the description box.
3. Click Interpret.
4. Click the relevant feature in the inspector.
5. Verify whether a validation note appears and whether its text matches `<ID>/expected-validation-note.txt`.
   (Negative tests expect no pill.)
