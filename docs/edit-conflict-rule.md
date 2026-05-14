# Edit Conflict Rule — GeoForge v2

## The Rule

When a value can be edited via two paths (description text and manual edit), the most recent edit wins on a per-field basis, with one exception:

**Manual edits "stick" across description re-parses** unless the user edits the *originating sentence* of that field. The originating sentence is the one whose text matches the field's parent event's `description_source`.

When the originating sentence is edited, the new interpretation wins, the `manually_edited` flag is cleared on every field of that event, and `field_origin` is recomputed from the new sentence.

---

## Rationale

This rule preserves hand-tuned values when the user is refining adjacent sentences — it would be frustrating to lose a carefully adjusted dip angle just because you rewrote an unrelated sentence. At the same time, it lets the user "rewrite" a sentence to start fresh on that feature: editing the originating sentence signals deliberate intent to reinterpret that feature from scratch.

---

## Worked Examples

### Example 1 — Manual edit preserved across unrelated re-parse

**Setup:** The description contains two sentences:
1. "A normal fault dips 60° east." → LLM infers `dip = 60°` for event E1.
2. (No second fault yet.)

**Action:** User manually drags E1's dip handle in the viewport to 70°. The `manually_edited` flag is set on E1, and `field_origin.dip` becomes `"stated"`.

**Action:** User adds a new sentence: "A second normal fault dips 45° west." User clicks Interpret.

**Expected outcome:** The differ detects that sentence 1 is **unchanged** and sentence 2 is **added**. Because the originating sentence for E1 was not edited, E1's dip remains **70°** and `manually_edited` stays set. A new event E2 is created from sentence 2 with `dip = 45°`.

---

### Example 2 — Originating sentence rewritten; manual edit cleared

**Setup:** Same as Example 1 after the manual drag — E1 has `dip = 70°`, `manually_edited = true`, originating sentence: "A normal fault dips 60° east."

**Action:** User edits sentence 1 to "A steeply dipping normal fault, 80°." User clicks Interpret.

**Expected outcome:** The differ detects that sentence 1 was **modified** (old text vs. new text, similarity > 0.5 → paired as `modified`). Because the originating sentence for E1 was edited:

- The new interpretation wins: `dip = 80°` (stated in new sentence).
- `manually_edited` is cleared on **all fields** of E1.
- `field_origin` is recomputed from the new sentence (dip → `"stated"`; other fields re-evaluated).
- `description_source` for E1 is updated to the new sentence verbatim.

---

### Example 3 — Verbatim re-type; manual edit preserved

**Setup:**
- Description: "A normal fault with dip of 45°."
- LLM produces `dip = 45°` (stated) for event E1.
- User manually drags to `dip = 55°`; `manually_edited = true`.

**Action:** User selects all text in the description textarea and re-types the identical string "A normal fault with dip of 45°." (no actual change). User clicks Interpret.

**Expected outcome:** The differ compares fingerprints (normalised, lower-case, whitespace-collapsed). The fingerprint of the re-typed sentence **matches** the fingerprint of the original sentence, so it lands in `unchanged` — not `modified`. Because the originating sentence is unchanged, E1's `dip` remains **55°** and `manually_edited` stays set.

---

## User-Visible Signal

In the inspector, any field with `manually_edited = true` should display a small note next to the field value:

> "Manually edited; will persist across re-parses unless you change the sentence."

This note reassures the user that their hand-tuned value is protected, and makes the contract discoverable without reading this document.
