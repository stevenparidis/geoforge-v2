# Phase 2 — Incremental re-parse and conflict rule

**Parent plan:** `implementation-plan.md`
**Phase:** 2 of 8
**Pre-requisite:** Phase 0 complete.
**Closes:** README deviation #2 ("No incremental re-parse"); spec-v1 open questions §12.1 and §12.2.
**Concurrent with:** phases 1 and 3.

---

## Goal

Replace the prototype's "re-parse the whole description on every Interpret press" behaviour with sentence-level diffing. When a user edits one sentence in a three-sentence description, the interpreter re-runs only on that sentence, and manually-edited fields on the other events are preserved.

This makes the workflow loop tighter (less LLM cost, lower latency) and — more importantly — gives a clear, documented answer to the question "what happens when a description edit and a manual edit conflict?"

## Pre-conditions

- Phase 0 complete.
- The current `interpret()` function in `workspace.jsx` is unchanged from the prototype baseline.

## Files this phase touches

| File                                | Change type | Notes                                                          |
|-------------------------------------|-------------|----------------------------------------------------------------|
| `src/description-diff.js`           | New         | Pure JS module, no React, no THREE. Easy to unit-test.          |
| `src/workspace.jsx`                 | Modify      | Rewire `onInterpret` to use the differ and merge mode.          |
| `docs/edit-conflict-rule.md`        | New         | The rule document (drafted in 2.1, signed off before 2.3).      |
| `index.html`                        | Modify      | Add `<script src="src/description-diff.js">`.                   |

This phase does not touch `scene.jsx`, `three-helpers.jsx`, `handle-layer.jsx` (phase 1's territory), or `geo-data.jsx`. It runs in parallel with phases 1 and 3 with zero file overlap.

---

## Parallelism map

```
2.1 (rule draft) ──> 2.2 (rule signoff) ──> 2.3 (diff module) ──┬──> 2.4 (merge-mode prompt) ──> 2.5 (workspace rewire) ──> 2.6 (tests)
                                                                │
                                                                └──> 2.4 can also start in parallel with 2.3 once both are scoped
```

**Sequential backbone:** 2.1 → 2.2 → 2.3 → 2.5 → 2.6.

**Parallel possible:** 2.3 and 2.4 can run in parallel once 2.2 is signed off, because they don't depend on each other's output. 2.5 needs both to land.

---

## Sub-phase 2.1 — Conflict rule draft

**Goal:** Write down the rule for what happens when a description edit and a manual edit conflict, so 2.3 onward have a clear spec to implement.

### The recommended rule (carried from `spec.md` and spec-v1 §12.2)

> When a value can be edited via two paths (description text and manual edit), the most recent edit wins on a per-field basis, with one exception:
>
> **Manual edits "stick" across description re-parses** unless the user edits the *originating sentence* of that field. The originating sentence is the one whose text matches the field's parent event's `description_source`.
>
> When the originating sentence is edited, the new interpretation wins, the `manually_edited` flag is cleared on every field of that event, and `field_origin` is recomputed from the new sentence.

### What 2.1 produces

A draft of `docs/edit-conflict-rule.md` containing:

- The rule itself (above).
- The rationale (preserves the student's hand-tuned values when refining adjacent parts of the description; lets them genuinely "rewrite" a sentence when they want to start over on that feature).
- Three worked examples:
  1. User describes a fault, the LLM infers a 60° dip, the user manually drags it to 70°, then adds a new sentence about a different fault. Expected: 70° preserved.
  2. Same setup, but the user edits the original sentence to "a steeply dipping normal fault, 80°." Expected: the dip is now 80° (stated), `manually_edited` cleared.
  3. User describes a fault with `dip: 45°` stated. LLM produces a model with dip = 45° stated. User manually drags to 55°. User then re-types the same sentence verbatim (no actual change). Expected: 55° preserved (the differ sees no change to the sentence text).
- The expected user-visible signal in the inspector: a small note next to manually-edited fields saying "Manually edited; will persist across re-parses unless you change the sentence."

### Definition of done

`docs/edit-conflict-rule.md` exists, drafted in full, ready to be circulated to the user for sign-off in 2.2.

---

## Sub-phase 2.2 — Rule sign-off

**Goal:** Get explicit user agreement on the rule before it's implemented.

### What to do

Present `docs/edit-conflict-rule.md` to the user along with the three worked examples. Get a yes/no on each example.

If any example is contested, revise the rule, regenerate the examples, and re-present. Do not begin 2.3 until the rule is signed off.

### Definition of done

`STATUS.md` shows an entry:

```
## Phase 2 — Incremental re-parse
- [x] 2.1 Conflict rule draft
- [x] 2.2 Rule sign-off (user agreed on YYYY-MM-DD)
```

---

## Sub-phase 2.3 — Description differ module

**Goal:** A pure-JS module that can diff two descriptions sentence by sentence.

### Architecture

Create `src/description-diff.js`. No React, no THREE, no `window` dependencies — just plain functions exported via `window.GeoDiff`:

```javascript
window.GeoDiff = {
  splitSentences(text),
  diffDescriptions(prev, next),
  fingerprintSentence(text),
};
```

### `splitSentences(text)`

Splits a description into sentences. The implementation must handle:

- Standard sentence terminators: `.`, `!`, `?` followed by whitespace.
- Newline-separated sentences (the user may use Enter as a sentence break).
- Common abbreviations that should *not* split: `e.g.`, `i.e.`, `etc.`, `Ma`, `m.y.a.`
- Decimal numbers: `45.5°` is not two sentences.

Recommended: use a regex with negative lookbehind for abbreviations and decimals, then trim and filter empty strings:

```javascript
const SENTENCE_BREAK = /(?<![A-Za-z]\.[A-Za-z])(?<!\b(?:e\.g|i\.e|etc|Ma|m\.y\.a))(?<=[.!?])\s+(?=[A-Z])/;
```

(Test against the example descriptions in the README before declaring this done.)

### `fingerprintSentence(text)`

Returns a normalised, lower-case, whitespace-collapsed version of a sentence. Used as the join key when matching previous → next sentences. Whitespace differences and case differences should *not* count as edits.

### `diffDescriptions(prev, next)`

Takes two descriptions, returns:

```javascript
{
  unchanged: [{ fingerprint, text }, ...],     // present in both, fingerprints match
  added:     [{ fingerprint, text }, ...],     // present in next, not in prev
  removed:   [{ fingerprint, text }, ...],     // present in prev, not in next
  modified:  [{ before: {...}, after: {...} }, ...],  // best-effort pairing of edits
}
```

For `modified` pairing: when a sentence appears in `prev` and disappears in `next`, look at `added` sentences and pick the one with the highest character-similarity (Levenshtein, or a simple token-overlap score). Pair them only if similarity exceeds 0.5 — otherwise leave them in `removed` / `added`.

### Tests

In `tests/unit/description-diff.test.js`, write at least these cases:

1. Empty `prev`, three-sentence `next` → all three in `added`.
2. Three-sentence `prev`, same three sentences in `next` → all three in `unchanged`.
3. Three-sentence `prev`, middle sentence changed in `next` → first and third in `unchanged`, middle in `modified`.
4. Three-sentence `prev`, middle sentence deleted in `next` → first and third in `unchanged`, middle in `removed`.
5. Three-sentence `prev`, all three rewritten in `next` → behaviour depends on similarity scores; document expected outcome.

### Definition of done

The module exists, exports the three functions, and all five unit tests pass.

---

## Sub-phase 2.4 — Merge-mode interpreter prompt

**Goal:** Extend the interpreter system prompt to support a "merge mode" that returns deltas for changed sentences only.

### Design

The existing prompt (in `workspace.jsx`) instructs the LLM to produce a full `GeoModel` JSON. Merge mode flips this: given the existing model and a set of changed/added sentences, the LLM returns only the events and layers derived from those sentences.

### Two-call shape

The new prompt has two modes selected by the user message:

**Full mode** (current behaviour, kept as a fallback):

```
Description:
"""<full description>"""

Return the GeoModel JSON only.
```

**Merge mode** (new):

```
Existing model:
<JSON of current model, with description_source stripped from events not in scope>

Changed sentences (each may be added or modified):
1. "<sentence 1>"
2. "<sentence 2>"

Removed sentences:
- "<removed sentence>"

Return ONLY the JSON for layers and events derived from the changed sentences. Use the same id values as the existing model where the description_source matches a modified (not added) sentence.
```

### System prompt addition

Append to `INTERPRETER_SYSTEM_PROMPT`:

```
MERGE MODE:
When the user message contains "Changed sentences", you must return ONLY the
layers and events derived from those changed sentences, plus any layers/events
that need to be removed (listed by id).

Output shape in merge mode:
{
  "merge": true,
  "upsert_layers": [...],
  "upsert_events": [...],
  "remove_layer_ids": [...],
  "remove_event_ids": [...]
}

Match modified sentences by their description_source to find the existing id
to reuse. Added sentences get fresh ids.

In all other respects (defaults, field_origin flags, description_source
quoting), behave identically to full mode.
```

### Definition of done

The system prompt change is in place. A hand-crafted test call (in `tests/unit/interpreter-merge.test.js`) with a known existing model and one changed sentence returns a valid merge response whose `upsert_events` contains exactly the event for the changed sentence with the existing event's id.

---

## Sub-phase 2.5 — Workspace rewire

**Goal:** Replace the existing `onInterpret` flow with a diff-aware version.

### New flow in `workspace.jsx`

```javascript
const onInterpret = useCallback(async () => {
  if (!description.trim()) return;
  setInterpreting(true);
  setError(null);

  const prevDesc = model?.meta?.last_parsed_description || '';
  const diff = window.GeoDiff.diffDescriptions(prevDesc, description);

  // If nothing changed (e.g. only whitespace), do nothing.
  if (diff.added.length === 0 && diff.modified.length === 0 && diff.removed.length === 0) {
    setInterpreting(false);
    return;
  }

  // If nothing existed before, or the diff is "everything new", do a full parse.
  const useMerge = prevDesc && diff.unchanged.length > 0;

  let json;
  if (useMerge) {
    const mergeResp = await interpretMerge(model, diff, setError);
    json = mergeResp ? mergeIntoModel(model, mergeResp, diff) : null;
  } else {
    json = await interpret(description, setError);
  }

  setInterpreting(false);
  if (json) {
    json.meta = json.meta || {};
    json.meta.last_parsed_description = description;
    setModel(json);
    setSelected(null);
  }
}, [description, model, setModel]);
```

### `mergeIntoModel(existingModel, mergeResp, diff)`

Pure function that takes the existing model and the LLM's merge response, applies it, and returns a new model:

1. For each event in `existingModel.events`:
   - If its `description_source` matches a sentence in `diff.removed`, drop it.
   - Else, keep it as-is (including its `manually_edited` flags).
2. For each entry in `mergeResp.upsert_events`:
   - If an existing event has the same id, replace it. **Preserve** `manually_edited` flags on individual fields where the field value is unchanged — but **clear** them on any field whose value differs (the new interpretation wins per the conflict rule, because the user changed the sentence).
   - Else, append.
3. Same for layers and `upsert_layers` / `remove_layer_ids`.
4. Run the result through `applyDefaults` to normalise.

### Inspector update

In the inspector panel, next to any field with `manually_edited: true`, add a small note:

> Manually edited; persists unless you change the originating sentence.

This makes the conflict rule visible to the user at the point where it matters.

### Definition of done

The new `onInterpret` flow works end-to-end. The smoke test extended in 2.6 passes.

---

## Sub-phase 2.6 — Tests

**Goal:** Verify the incremental re-parse behaviour, including the conflict rule.

### Unit tests

In `tests/unit/merge-into-model.test.js`:

1. Existing model has events `E1` (sentence A), `E2` (sentence B, dip manually edited to 70°), `E3` (sentence C). Diff: A unchanged, B unchanged, C modified. Expected: E1 and E2 (with 70° preserved) unchanged; E3 replaced.

2. Existing model has events `E1` (sentence A, dip manually edited to 70°). Diff: A modified. Expected: E1 replaced; dip is whatever the new sentence interprets to (no longer 70°); `manually_edited` cleared on every field of E1.

3. Existing model has events `E1` (sentence A), `E2` (sentence B). Diff: A unchanged, B removed. Expected: E1 kept, E2 dropped.

### Smoke-test extension

Extend `tests/smoke.js`:

1. Type a three-sentence description producing three events.
2. Click Interpret. Verify three events exist.
3. Programmatically manually-edit the dip of event 2 to 70°.
4. Edit only the third sentence in the description (via DOM manipulation).
5. Click Interpret.
6. Verify: event 1 unchanged. Event 2's dip is still 70° and `manually_edited` still true. Event 3 has been replaced.

### Definition of done

All three unit tests pass. The extended smoke test passes.

---

## Acceptance criteria for phase 2

1. Editing one sentence in a multi-sentence description causes the interpreter to run only on that sentence (verifiable in network logs / instrumented LLM call count).
2. Manually-edited fields on events whose originating sentence is unchanged are preserved across re-parses.
3. Editing an originating sentence clears `manually_edited` on every field of the derived event.
4. The inspector shows a note next to manually-edited fields explaining the persistence rule.
5. `docs/edit-conflict-rule.md` exists and is signed off by the user.
6. The README "Deviations from the spec" section no longer lists the no-incremental-re-parse deviation.
7. All phase 2 tests (unit + extended smoke) pass.

When all seven are true, update `STATUS.md` to `"Phase 2 complete"`.

---

## Notes for the orchestrator

- This phase is the **highest-risk** of the three parallel phases in terms of breaking existing behaviour, because it changes the central `onInterpret` flow. Recommend running the phase-0 smoke test after 2.5 and before 2.6.
- The conflict rule (2.1, 2.2) is **non-blocking for code work** in the sense that the differ module (2.3) and the merge-mode prompt (2.4) can be developed in parallel with the sign-off. But 2.5 — the rewire — cannot land until the rule is signed off, because the merge logic *encodes* the rule.
- This phase does **not** touch the 3D renderer, the handle layer, the overlay primitives, or any geological geometry. If a 3D bug appears during phase 2 work, it's almost certainly unrelated; check whether phase 1 or phase 3 has merged something recently.
