# GeoForge v2 — Smoke Test v1.5

Regression retest for RT-09 / RT-10 / RT-11 failures found in smoke test v1.4 (PR #40 corrected).

Run against master after PR #40 is merged. The dev server must be **restarted** after merge
so it picks up the updated `three-helpers.jsx`.

**Setup:** `node dev-server.js` with a valid `ANTHROPIC_API_KEY`. Open a **fresh incognito tab**
at `http://localhost:8000`.

---

## RT-09b — Angular unconformity contact line and dipping beds visible (PR #40 corrected)

**Was broken in v1.4:** Wavy amber line and bedding indicators were added to the `meshes`
group with depth-testing enabled, so they were occluded by the opaque layer block geometry
and invisible. The discordance arc was visible only because it lives in `overlays`
(depth-test disabled). Fix: moved all contact/bedding lines into `overlays` with
`depthTest: false` and `renderOrder: 9`.

1. Interpret: `An older sandstone series below an angular unconformity with horizontal limestone above.`
2. Wait for the model to render
3. Look at the 3D viewport — is there a **wavy amber line** across the model at the layer contact?
4. Below that wavy line, are there **short dipping lines** tilted at an angle (bedding indicators
   for the lower, tilted sequence)?
5. Are those lower-bed lines at a clearly **different angle** from the horizontal upper layers?
6. Is there a discordance arc + angle label (e.g. `30°`) at the left side of the contact?
7. Is there a `~10 Ma gap` label and an `Angular Unconformity` label near the contact?

**Pass:** Wavy amber contact line visible + dipping bedding indicators below it + arc/angle label.

Actual: Ok, I'm now doing RT 09b. I am putting the prompt in from the first question. And I'm interpreting. and there is no way the amberline across the model when the contact. occurs There are no dip short dipping lines. Are so lines at a different angled. No, there's no lines at a different angle. The labels are still there, but yeah, this what this looks like. Is it just looks like two layers on top of each other with no. with no difference, so yeah, they look. Just it just looks like two layers that are on. touched Yeah. and I noticed that you can't change the Third you can't change the third values say the inside value should be a you should be able to edit the inside values so Yeah, this also another issue.

---

## RT-10b — Porphyry shows one coherent target (PR #40 corrected)

**Was broken in v1.4:** After moving disc overlays to x=1.5 (same as shells), the flat
horizontal discs were still visible as a separate ring shape perpendicular to the 3D shells,
creating two visually distinct objects. Fix: removed horizontal disc overlays entirely —
the concentric shells already show the alteration zones, labels alongside are sufficient.

1. Reset. Interpret: `A sandstone layer with a porphyry copper-gold deposit.`
2. Wait for the model to render
3. Look at the 3D viewport — is the porphyry shown as a **single group** of concentric
   spherical shells protruding from one side of the layer block?
4. Is there **only one target location** with no flat disc rings or second shape visible?
5. Are zone labels (Propylitic, Argillic, Phyllic, Potassic) visible near the shells?
6. Is the ore body visible within or adjacent to the layer block (not hidden below it)?

**Pass:** One coherent set of concentric shells. No flat horizontal rings. Labels present.

Actual: I'm now doing RT 10B I am putting in the prompt in the first question. and interpreting and I still see two targets so yeah, I still see two targets one is directly under the layout while one is going yeah going is perpendicular to the one going under the way and it does diced through the layer so yeah, there's yeah. And the labels are correct. and yeah, so yeah, that's 10.


---

## v1.5 Summary checklist

| # | Retest | Pass / Fail |
|---|--------|-------------|
| RT-09b | Angular unconformity contact line + dipping beds visible | |
| RT-10b | Porphyry single coherent target, no disc rings | |

**Carry-over known issues (deferred to v2 — see todo.md):**
- Anticline/syncline visually identical at plunge 0° (BUG-03)
- History timeline bundles layers into one event step (BUG-05)
- Prediction rationale text crowded in 3D viewport — should move to inspector sidebar
- WF-13/WF-14 error-handling workflows need test fixtures
- Mobile/narrow viewport (WF-26) deferred to v2
- Scale inconsistency between stated and inferred depth units (RT-06 note)
