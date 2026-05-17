# GeoForge v2 — Smoke Test v1.6

Regression retest for RT-09b / RT-10b failures found in smoke test v1.5 (PR #40 second correction).

**Hard reload required:** After the dev server is running, press **Ctrl+Shift+R** in the browser
(not just F5) to bypass the HTTP cache and load the updated `three-helpers.jsx`.

**Setup:** `node dev-server.js` with a valid `ANTHROPIC_API_KEY`. Open a **fresh incognito tab**
at `http://localhost:8000`, then **Ctrl+Shift+R** before testing.

---

## RT-09c — Angular unconformity lower layers are physically tilted (PR #40 corrected)

**Was broken in v1.5:** The lower layers rendered as flat horizontal blocks identical to
the upper layers. The wavy contact line and bedding indicator annotations were now visible
(fixed in v1.5 via depthTest:false), but the actual 3D layer geometry was not split or
tilted. Fix: `buildAngularUnconformityLayers` splits the layer stack at the contact and
renders the lower group as a rotated block pivoting at the contact surface, tilted by
`angular_discordance` degrees around the Z axis.

1. Interpret: `An older sandstone series below an angular unconformity with horizontal limestone above.`
2. Wait for the model to render
3. Look at the 3D viewport:
   - Are the **upper limestone layers flat and horizontal**?
   - Are the **lower sandstone layers visibly tilted** at an angle (not horizontal)?
   - Is there a **wavy amber line** at the contact between the two groups?
   - Are there **short dipping lines** below the contact reinforcing the tilt?
4. Is there a discordance arc + angle label (e.g. `30°`) at the left side of the contact?
5. Click the unconformity entry in the right panel inspector — does it show Subtype, Time gap, Angular discordance?

**Pass:** Upper layers flat, lower layers visibly tilted at an angle. Wavy amber line at contact.

Actual:Okay, I'm doing now. RT 09c I'm putting the prompt in And I'm interpreting. and yes they bottom layer the upper layer is flood and horizontal the lower layer is visible tilted when the two layers made there is a flickering of the Light and the two lays into sect there are way that way the amber lines. and there are short dipping lines of that. the reinforcing the tilt there is a labels there, but you know should should delays be intersecting each other or should they be? should you only say the layer that is being infected so like how the layers wouldn't be intercepting in real life so like how should this be visualized? It's this correct. It's like what you what you have here in the smoke test everything is showing but I just don't know if this is correct.

---

## RT-10c — Porphyry shows one target; prediction sphere suppressed (PR #40 corrected)

**Was broken in v1.5:** The interpreter was returning both `mineralisation` (the explicit
deposit) and `predictions` (an AI prediction). The prediction geometry renders as a
wireframe sphere at the model centre, which appeared as a second target "dicing through
the layer." Fix: prediction geometry is now suppressed when explicit `mineralisation` is
already present in the model.

1. Reset. Interpret: `A sandstone layer with a porphyry copper-gold deposit.`
2. Wait for the model to render
3. Look at the 3D viewport:
   - Is there **only one porphyry deposit shape** (concentric shells on one side of the block)?
   - Is there **no wireframe sphere** cutting through the centre of the layer block?
   - Are the shells visible adjacent to the layer block (not entirely hidden below it)?
4. Are zone labels (Propylitic, Argillic, Phyllic, Potassic) visible near the shells?

**Pass:** Single set of porphyry shells. No second wireframe target in the layer centre.

Actual: and then we have our 10C so I'm now interpreting the the sentence one question one. and I now see only one Target and deposit shave there is no that is a y fmc cuttings through the Center of the label block the Shells of visible and not hidden entirely below and yes the zones are labeled.

---

## v1.6 Summary checklist

| # | Retest | Pass / Fail |
|---|--------|-------------|
| RT-09c | Angular unconformity lower layers physically tilted | Pass ✓ |
| RT-10c | Porphyry single target, prediction sphere suppressed | Pass ✓ |

**Carry-over known issues (deferred to v2 — see todo.md):**
- Anticline/syncline visually identical at plunge 0° (BUG-03)
- History timeline bundles layers into one event step (BUG-05)
- Prediction rationale text crowded in 3D viewport — should move to inspector sidebar
- WF-13/WF-14 error-handling workflows need test fixtures
- Mobile/narrow viewport (WF-26) deferred to v2
- Scale inconsistency between stated and inferred depth units (RT-06 note)
- Thickness arrows for tilted lower block in angular unconformity (deferred — v2)
- Inspector read-only for unconformity / mineralisation fields (noted in RT-09b — v2)
- Angular unconformity: tilted lower block corners protrude into upper block (Z-fighting flicker at contact) — requires clipping plane or CSG to truncate lower beds at erosion surface. Deferred to v2.
