# GeoForge v2 — Smoke Test v1.3

Regression retest for all bugs fixed in PRs #36–#39 (v1.2 cycle).

Run against a fresh build of master after those PRs are merged.

**Setup:** `node dev-server.js` with a valid `ANTHROPIC_API_KEY`. Open a **fresh incognito tab**
at `http://localhost:8000` (no prior localStorage — incognito guarantees a clean session).

---

## RT-01 — Formation reference: intrusions and unconformities render (PR #36)

**Was broken:** All intrusion and unconformity reference cards showed a blank 3D scene because
`cameraHint` used `{ distance, azimuth, elevation }` instead of the `{ phi, theta, dist }` format
that `GeoScene` reads. Camera resolved to NaN and scenes did not render.

1. Click the **Formation reference** tab
2. Scroll to section **04 — Intrusions**
3. Check each of the 4 cards (Basalt Dyke, Basalt Sill, Granite Batholith, Granite Laccolith):
   - Is a 3D scene visible in each card (not a blank grey box)?
   - Does the dyke card show a vertical dark rectangle cutting through the layer stack?
   - Does the sill card show a thin flat sheet?
   - Does the batholith card show a dome shape below the stack?
   - Does the laccolith card show a dome pushing upward?
4. Scroll to section **05 — Unconformities**
5. Check all 3 cards (Angular, Disconformity, Nonconformity):
   - Is a 3D scene visible in each card?

**Pass:** All 7 cards have a live 3D scene. No blank grey boxes.

Actual:

---

## RT-02 — 3D viewport and grid visible on startup (PR #37)

**Was broken:** Opening the app on a fresh session (no localStorage) showed a blank centre panel.
The grid and north arrow were not rendered until after the first Interpret call.

1. In an incognito tab, open `http://localhost:8000`
2. **Before typing anything:** is the centre panel showing a 3D viewport?
3. Is there a grid of lines in the viewport?
4. Is there a red north arrow?
5. Are the sample prompt buttons visible in the **left panel** (not the centre)?

**Pass:** Grid + north arrow visible immediately on fresh load. Sample prompts in left panel only.

Actual:

---

## RT-03 — Reset clears 3D scene and localStorage (PR #37)

**Was broken:** Clicking Reset left the old model visible in the 3D viewport (scene.jsx bailed
early when model became null). Also, after Reset, refreshing restored the old session from
localStorage because the null state was never written.

1. Interpret any model (e.g. "A sandstone layer with a normal fault dipping 60 degrees east.")
2. Confirm the model is visible in the viewport
3. Click **Reset**
4. Is the 3D viewport now empty (just grid + north arrow)?
5. Is the description textarea empty?
6. Is the inspector panel showing "No model yet"?
7. Press **F5** to refresh the page
8. Does the app open to an empty state (not restoring the old model)?

**Pass:** Reset immediately clears scene. Refresh after Reset shows empty startup state.

Actual:

---

## RT-04 — Throw/heave overlay visible on single-layer fault models (PR #38)

**Was broken:** `addThrowHeaveOverlay` had `if (slabs.length < 2) return` — with only one layer,
the overlay was silently skipped.

1. Interpret: `A sandstone layer 2 metres thick. A normal fault dipping 60 degrees east.`
2. Wait for the model
3. Look at the fault scene — is there a **vertical cyan line** marking the throw?
4. Is there a label "Throw X.XX u" near the fault?
5. Is there a **horizontal cyan line** at datum level marking the heave?
6. Are the throw/heave values shown with amber (inferred) styling since they were not stated?

**Pass:** Throw vertical line + heave horizontal line both visible. Amber styling on inferred values.

Actual:

---

## RT-05 — Sill protrudes visibly from layer block (PR #38)

**Was broken:** Sill XZ extent was `2 * totalHeight` which was smaller than the 4-unit layer block
for single-layer models — the sill was entirely hidden inside the opaque layer.

1. Reset. Interpret: `A limestone layer intruded by a horizontal basalt sill.`
2. Is there a **flat horizontal sheet** visible at the sides of the layer block?
3. Does the sill protrude beyond the layer edges?
4. Is there a thickness label on the sill?

**Pass:** Flat horizontal sill visible sticking out from the layer block edges.

Actual:

---

## RT-06 — Laccolith dome protrudes above layer top (PR #38)

**Was broken:** Laccolith position formula placed the dome below the layer surface when stated
depth ≥ dome radius. For the reference card (depth=1.5, radius=1.2) the dome never reached
the top of the stack.

1. Reset. Interpret: `A mudstone layer with a granite laccolith intrusion causing dome uplift.`
2. Is there a **dome shape** visible above or at the top of the layer stack?
3. Does the dome appear to push upward from inside the layer?
4. Reset. Click **Formation reference** → **04 — Intrusions** → Granite Laccolith card
5. Is a dome visible in the 3D card scene?

**Pass:** Dome protrudes above layer top in both interpreter-produced and reference card scenes.

Actual:

---

## RT-07 — Inspector shows intrusions, unconformities, mineralisation (PR #39)

**Was broken:** The right panel "Model overview" only listed Layers and Events. Intrusions,
unconformities, and mineralisation were absent from the inspector entirely. Clicking their
anchors in the left panel did nothing.

1. Interpret: `A sandstone layer intruded by a vertical basalt dyke.`
2. In the **right panel** (Model overview), is there an **Intrusions** section?
3. Does it list the dyke entry?
4. Click the dyke entry — does the inspector open showing fields (Subtype, Rock type, etc.)?
5. Reset. Interpret: `An older sandstone series below an angular unconformity with horizontal limestone above.`
6. Does the right panel show an **Unconformities** section listing the unconformity?
7. Click it — does the inspector show Subtype, Time gap, Angular discordance?
8. Reset. Interpret: `A sandstone layer with a porphyry copper-gold deposit.`
9. Does the right panel show a **Mineralisation** section?
10. Click it — does the inspector show Subtype, Metals, Alteration radius?

**Pass:** All three feature types appear in Model overview and open a read-only inspector on click.

Actual:

---

## RT-08 — Drag handles removed (PR #39, user request)

**Was broken:** The 3D drag handle system froze the app on Windows pointer events and was
reported as unusable. User explicitly requested removal.

1. Interpret: `A sandstone layer with a normal fault dipping 60 degrees east.`
2. Click on the **sandstone layer** in the inspector to select it
3. Look at the 3D viewport — are there **no cyan drag handles** (no sphere handles at contacts)?
4. Click on the fault in the inspector — same check: no drag handles?
5. Try clicking directly on the layer in the 3D viewport — no handles appear?
6. Confirm numeric inputs in the inspector (dip, strike, etc.) still work — change a value
   and confirm the 3D view updates

**Pass:** No drag handles visible anywhere. Numeric inspector inputs still update the 3D scene.

Actual:

---

## v1.3 Summary checklist

| # | Retest | Pass / Fail |
|---|--------|-------------|
| RT-01 | Formation reference intrusions + unconformities render | |
| RT-02 | 3D grid visible on fresh startup | |
| RT-03 | Reset clears scene + localStorage | |
| RT-04 | Throw/heave overlay on 1-layer fault model | |
| RT-05 | Sill protrudes from layer block | |
| RT-06 | Laccolith dome above layer top | |
| RT-07 | Inspector shows intrusions / unconformities / mineralisation | |
| RT-08 | No drag handles; numeric inputs still work | |

**Carry-over known issues (deferred to v2 — see todo.md):**
- Anticline/syncline visually identical at plunge 0° (BUG-03)
- History timeline bundles layers into one event step (BUG-05)
- Prediction rationale text crowded in 3D viewport — should move to inspector sidebar
- WF-13/WF-14 error-handling workflows need test fixtures
- Mobile/narrow viewport (WF-26) deferred to v2
