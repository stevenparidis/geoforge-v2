# GeoForge v2 — Smoke Test v1.4

Regression retest for visual fixes in PR #40 (v1.3 carry-overs).

Run against a fresh build of master after PR #40 is merged.

**Setup:** `node dev-server.js` with a valid `ANTHROPIC_API_KEY`. Open a **fresh incognito tab**
at `http://localhost:8000` (no prior localStorage — incognito guarantees a clean session).

---

## RT-09 — Angular unconformity lower beds show dipping stratigraphy (PR #40)

**Was broken:** The lower sequence below an angular unconformity contact was visually
indistinguishable from the upper sequence. Only a subtle wavy amber line appeared at the
contact; no indication that the lower beds were dipping at the discordance angle.

1. Interpret: `An older sandstone series below an angular unconformity with horizontal limestone above.`
2. Wait for the model to render
3. Look at the 3D viewport — is there a wavy amber line across the model at the contact?
4. Below that wavy line, are there **short dipping lines** (bedding plane indicators) tilted
   at an angle relative to the flat upper layers?
5. Are those lower-bed lines clearly at a different angle from the horizontal upper layers?
6. Is there a discordance arc + angle label (e.g. `30°`) at the left side of the contact?
7. Is there a `~10 Ma gap` label and an `Angular Unconformity` label near the contact?

**Pass:** Wavy contact line visible + dipping bedding indicators below the contact + arc/angle label.

Actual: ok doing RTO 9 and now putting the first prompt in I'm waiting for the model to render. and there is no wavely yellow line and the line across the model where contacts. and there's no short dipping lines betting plane indicators that are tilted so yeah. The lower bed is not at a different angle to the alphabet. There is a there is a discordance Arcana angle label, but it's not in forced. And yeah, so this is still not really working.

---

## RT-10 — Porphyry mineralisation renders as a single co-located target (PR #40)

**Was broken:** The 4 horizontal disc overlays for porphyry were centred at `x=0` while the
4 concentric shell meshes were at `x=1.5`, producing two separate-looking targets — one at
the side of the block and one perpendicular through the centre.

1. Reset. Interpret: `A sandstone layer with a porphyry copper-gold deposit.`
2. Wait for the model to render
3. Look at the 3D viewport — is the porphyry shown as a **single group** of concentric shapes
   (shells and discs together) protruding from one side of the layer block?
4. Is there **only one target location** (not two separate visual objects)?
5. Are the zone labels (Propylitic, Argillic, Phyllic, Potassic) near that single target?
6. Click the mineralisation entry in the right panel — do the inspector fields show
   (Subtype, Metals, Alteration radius)?

**Pass:** Single coherent porphyry visualisation with all zones co-located. No separate disc target at block centre.

Actual: I am now doing RTO 10. I'm putting the prompting from the First question, I'm waiting for the model to render and yeah, it's the exact same as last time. so yeah, this is a single group of con connection shapes protruding from one side the block. There's two Target visual objects one underneath the layer and one on the side. Yes, like design labels are on the say yeah there is one there's an extra Target At the bottom, so at the side of the thing going downwards in parallel. parallel to the side of the layer and and when I'm click The show when I click the mineralization and fill in the right so subtype Metals and alteration radius.

---

## RT-11 — Porphyry ore body visible within layer block (PR #40)

**Was broken:** For a single thin layer with default `alteration_radius=1.0`, the ore body
centre was calculated at y=−0.8, placing it entirely below the visible layer block (which
only extends to y=−0.5 for a 1 m layer). The shells were mostly invisible.

1. Using the same model from RT-10 (single sandstone layer, porphyry deposit)
2. Does the ore body visually overlap with or protrude from the layer block?
3. Are the concentric shells (or at least part of them) visible within or adjacent to the
   layer block, rather than entirely hidden below it?

**Pass:** At least part of the ore body is visible relative to the layer block on a default single-layer model.

Actual: So I am doing RT 11. so I'm getting the prompts from rt10 right now and I'm interpreting. so Yeah, I am. I there is again as the same as rt10. There are two targets. and yeah, they the one that is in line with it does for true to the block, but I don't really understand what you're trying to suggest with this here so Yeah. I don't understand what it's trying to suggest.

---

## v1.4 Summary checklist

| # | Retest | Pass / Fail |
|---|--------|-------------|
| RT-09 | Angular unconformity dipping bed indicators | |
| RT-10 | Porphyry single co-located target | |
| RT-11 | Porphyry ore body visible in layer block | |

**Carry-over known issues (deferred to v2 — see todo.md):**
- Anticline/syncline visually identical at plunge 0° (BUG-03)
- History timeline bundles layers into one event step (BUG-05)
- Prediction rationale text crowded in 3D viewport — should move to inspector sidebar
- WF-13/WF-14 error-handling workflows need test fixtures
- Mobile/narrow viewport (WF-26) deferred to v2
- Scale inconsistency between stated and inferred depth units (RT-06 note)
