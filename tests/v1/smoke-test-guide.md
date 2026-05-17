# GeoForge v2 — Live Smoke Test Guide

This document contains every workflow that exercises the complete functionality of GeoForge v2. Work through each workflow in order. After each step, describe exactly what you see on screen. The orchestrator will use your descriptions to identify bugs or missing features.

---

## How to run this test

1. Start a local server: `node dev-server.js` (set `ANTHROPIC_API_KEY` in env, or use a live Anthropic key)
2. Open `http://localhost:8000` in a browser
3. Work through each workflow below, narrating what appears on screen after each numbered action

---

## WF-01 — Default startup state

**What to check:** The app initialises with the correct empty state before any user input.

1. Open the app in a fresh tab (no prior session)
2. Describe the 3D viewport — is there a grid? A north arrow? What orientation?
3. Describe the left pane — is the textarea empty? Is there placeholder text?
4. Describe the right/inspector area — is it visible? Collapsed?
5. Look at the toolbar — which buttons are visible? Which are enabled?
6. Are "Labels" and "Overlays" toggles both on?
7. Is the "Interpret" button present and enabled?

**Expected:** Empty 3D viewport with grid + north arrow. Empty description textarea with placeholder hint. Inspector not shown. Labels and Overlays both on. No Share or Export PNG buttons visible (model is null).

Actual:When I open a new session there is no good at all. It's there's a middle sector that says no model yet description on the left and click interpreting. Example. There are three examples that are shown there in the left. There is a description. that has a place holder description And it says plain English next to it. If I press on it, then the description activates. and then I can present temperature to do it the right inspector area says middle overview with json for export next to it, and it says nine model we get the inspector for once you interpret a description the toolbar has to maintain tabs workspace and formation reference in the middle and on the right. There is a labels overlaping grid. the interpret button is there and it is blue when I can interpret and it does work it also is about there's a tab next to it. This is predict and then also one that says reset.

I want you to make a to do MD that I can use in the future that will allow me to have guidance for V2 in the future. This should be a blank area. With potentially the ability to manually make your own model. I will I would leave it to you to make your own decision whether make an ability to make your own bottle on the first tab is appropriate. But everything of everything else works besides a besides the not having an opening. 3D viewpoint
---

## WF-02 — Basic interpretation (layer + fault + fold)

**What to check:** The interpreter produces a 3D model from a plain-English description.

1. Type the following in the description pane:
   > A sandstone layer sits below a normal fault and an anticline fold.
2. Click **Interpret**
3. Describe what appears in the 3D viewport — layers visible? fault plane? fold surface?
4. Are measurement overlays visible (cyan arcs, arrows, labels)?
5. Does each measurement label show a value?
6. Are any values rendered in amber with a dashed underline?
7. Look at the right pane — is the inspector showing? What features are listed?
8. Describe the timeline at the bottom — is there a step counter or scrubber?

**Expected:** One sandstone layer, one normal fault plane, one anticline fold surface. Cyan overlays for dip/strike/throw/fold. Several values in amber (inferred). Inspector lists Sandstone layer + 2 events. History timeline shows events.

Actual: I type the description into the description pain, I'm now clicking interpret. It is loading. And I have my model. It describe it is a it is one layer with a fault line in it there with the dip of 60 degrees. there is no variants in the normal model the measurement overlays are visible including. these cyan arc and the IRS and the label there are measurements. The H measurement of the label does show a value. the that there are measurements that have ended. Within an empower and on the right it does say non-in food values these would guess because you're descriptions specify. It click any feature to see which ones. Then it says lens to layers in sandstone. That is equal to one unit. It says 60 degrees / 90 degrees it also says anti-fold, which with fun zero fun zero and plunge zero degrees So there's a two-step counter? at the bottom The one has just a sense and layer. and to has the final Product which is what I described earlier. This the change in the geological history from one to does change the visual.
---

## WF-03 — Stated vs inferred visual distinction

**What to check:** The amber/dashed-underline rendering correctly separates stated values from inferred values.

1. Using the model from WF-02, click on the fault feature in the inspector
2. List every field shown and whether each value is in amber (dashed underline) or standard white
3. Type this description instead (replacing the previous text) and re-interpret:
   > A sandstone layer 2 metres thick. A normal fault with a dip of 70 degrees strikes north-south with a throw of 500 metres.
4. Click **Interpret**
5. In the inspector for the fault, which fields are now white (stated)? Which are still amber (inferred)?
6. In the 3D viewport, do the 3D labels on the fault match — thick white labels for stated, amber dashed for inferred?

**Expected:** `dip: 70°` stated (white), `throw` stated (white), `strike` stated (white). `dip_direction` inferred (amber). Thickness `2` stated on layer. Dip arc label in 3D is white; dip_direction label is amber.

Actual: there is a difference between the ambird value and the And the dash and the real values. the when I click on the field on the fault feature in the inspector all the invalues are in third so the strike dipped and dip directional all in third and they are just all in Amber I'm now typing in the next description, which is a Stanton layer made a sticker known for the dip of saving degrees and a South north south with a throw of 500 meters, I'm now pressing interpret and it is loading now when I click on the normal fault all the variables are what which was stated the 3D labels do match, what do match the stated values and they have now changed to blue? with a Drag button, that changes the direction as well as the adjustable numbers on the right which can change the variables.

---

## WF-04 — All fault subtypes

**What to check:** Every fault type interprets and renders with its characteristic geometry.

For each description below, clear the pane (click Reset), type the description, interpret, and briefly describe what you see in the 3D viewport:

1. `A limestone layer cut by a normal fault dipping 60 degrees east.`
2. `A granite layer cut by a reverse fault dipping 45 degrees.`
3. `Two shale layers cut by a thrust fault with a shallow dip of 25 degrees.`
4. `A sandstone layer cut by a dextral strike-slip fault.`
5. `A sandstone layer cut by a sinistral strike-slip fault.`
6. `A sandstone layer cut by an oblique-slip fault.`
7. `A sandstone layer cut by a listric fault with a surface dip of 70 degrees flattening to 10 degrees at depth.`

**For the listric fault specifically:**
8. Are there overlays for dip-at-surface, dip-at-depth, and vertical detachment depth?
9. Does the fault surface appear curved (not planar)?

**Expected:** Each fault renders visibly different geometry. Listric fault is curved. Listric overlays show two dip arcs (surface + depth) and a vertical depth line.

Actual: I am now on wf4. and and typing in the first prompt Which has given the correct value now, I am typing in. the second prompt Which is also given the character value? now I'm typing in the Third Which also? gives the correct value I am now typing in the fourth Trump Which also gives the correct value? I am now type. which also gives the correct value I am now typing in the sixth from that also gets the correct value. then I'm now typing in the seventh from that gives a correct value although the seventh from is showing a curve, however the However, the visual is just a solid block with a curve. And the dip is at 10 degrees. the question eight others for dip and surface I yes there are. does and for the ninth from those default surface a yes, it does a pic of however, there is a Block it looks like in a block shape.


---

## WF-05 — All fold subtypes

**What to check:** Each fold type renders with the correct hinge and axial plane geometry.

1. Interpret: `A sandstone layer deformed into an anticline fold.`
   Describe the 3D shape — which way does it arch?
2. Reset, then interpret: `A sandstone layer deformed into a syncline fold.`
   Describe the 3D shape — which way does it sag?
3. Reset, then interpret: `A sandstone layer tilted as a monocline.`
   Describe the 3D shape — one limb tilted?
4. For any fold, are there overlays for: interlimb angle arc, axial plane, hinge line, plunge arc?

**Expected:** Anticline arches up, syncline arches down, monocline has one limb tilted. Cyan overlays show interlimb arc + hinge + plunge.

ACtual: I am now on wf5, I have interpret the first prompt and there is an anticline fold. it arcs and the Arc is equal on both sides I am now typing in the prompt. to and this is also correct the middle shows the trough. Rather than the peak on the anticline. I'm now typing in the third from I'm interpreting. down this is a Bend that occurs from the hate to the truck to the pig on the left side of the Truffle the right side with the middle. with the middle of the bend in the middle Which is a one little tilt? and there are folds for every fold subtype
---

## WF-06 — All seven measurement overlays

**What to check:** Every overlay type from the spec is present and correctly positioned.

Interpret: `A sandstone layer dipping 30 degrees east with a normal fault striking north-south dipping 60 degrees.`

Walk through each overlay type and confirm it appears:

1. **Dip angle arc** — is there a cyan arc from horizontal to the dipping surface? Is the degree value inside it?
2. **Dip direction arrow + compass rose** — is there a horizontal arrow pointing down-dip? Is there a compass rose with N/E/S/W ticks?
3. **Strike line + compass** — is there a horizontal line on the surface? Does the compass show strike bearing?
4. **Layer thickness vector** — is there a double-headed arrow perpendicular to the layer between its top and bottom contacts?
5. **Fault throw/heave** — is there a vertical dashed line (throw) and a horizontal dashed line (heave)?
6. Click **Overlays** toggle — do all overlays disappear?
7. Click **Overlays** again — do they reappear?
8. Click **Labels** toggle — do text labels disappear while geometry overlays remain?

**Expected:** All 7 overlay types visible. Overlay toggle hides/shows all. Label toggle hides text but not geometry.
 
Actual: I am now on wf06 I am typing in the prompt I and I have interpreting it is now loading. the dip is correct and the dip Direction says 90 degrees there is a sign arc from the horizontal to the dipping surface, which is the dip is 60 degrees the dip direction is Our and compass is seen with the dipped direction of 90 degrees. this strike set is zero degrees. The layers thickness is one unit. and there is a horizontal line on the surface with the compass showing the strike bearing. I do not see a horizontal I do not see a double headed error. perpendicular to the liability between the top and the bottom contacts the there is The is no vertical – line of the throw or a horizontal – line with the heave. when I toggle the labels overlays and grid tab that is a correct Disappearance of the overlays
---

## WF-07 — Edit path A: description rewrite

**What to check:** Editing the description and re-interpreting updates the model.

1. Start from the model in WF-02 (sandstone, normal fault, anticline)
2. Change "anticline" to "syncline" in the description, then click **Interpret**
3. Does the fold shape in the 3D view change from arching up to arching down?
4. Now add a second sentence: `There is also a limestone layer above the sandstone.`
5. Click **Interpret**
6. Is there now a second layer visible?

**Expected:** Fold geometry updates on edit. Adding a sentence adds a new layer. Model reflects the cumulative description.

Actual: I am now doing wf07. okay, I am starting the model from wfo now okay Let's now it is now loaded. and Okay, the model is now started. I'm now changing the thickness. I'm now changing the I am unable to change. Change the anticline to syncline. I am now doing that. now and interpreting It has the exact same. Visual because the sink line called and the anti client called but start at plunge zero degrees/share degrees. It does not change the shape from an arching. Fold view, maybe change maybe the default for an anti-in key simplicon. Shouldn't be zero degrees/zeros. I am now adding the sentence. and reinterpreting for question 4 and a new Sandstone layout does here. so the second layout is visible.

---

## WF-08 — Edit path B: numeric inspector

**What to check:** Inspector field edits update the 3D model in real time.

1. From a model with a normal fault, click on the fault in the inspector
2. Find the "Dip" field and change the value (e.g. from 60 to 80)
3. Does the fault plane in the 3D viewport update immediately?
4. Does the dip arc overlay update to show the new angle?
5. Does the field's styling change from amber (inferred) to white (stated) after the edit?
6. Now re-interpret the description (click Interpret without changing the text)
7. Does the manually-edited dip value survive the re-interpret?
8. Does the inspector show a "persistence note" beside the manually-edited field?

**Expected:** Inspector edits update 3D geometry. Stated styling appears. Manual edits survive re-parse. Persistence note is shown.

Actual: Ok, I am now on wf08. I from the model with the notebook click on the fault in the inspector. I am now. On the fault with the inspector unchanging dip to 80 degrees and this does work. And the fault plane does update immediately. Yes, the dip off of a does show the new angle. The field does change to White off the edits. Okay, now. I am flicking in temperate. when changing and Nothing without changing the text and nothing changed the dip is. still degrees Yes, the manual editing dip does survive the reinterpretation. and I do not get a persistent notes. The sides oh, I do I have a notice that says manually edited persists unless you change the original sentence.

---

## WF-09 — Edit path C: direct 3D manipulation

**What to check:** Dragging handles on the 3D model updates geometry.

1. From a model with a layer and a fault, look at the 3D viewport
2. Click on the layer in the 3D viewport — do cyan drag handles appear at the top and bottom contacts?
3. Grab a handle and drag it — does the layer thickness change while dragging?
4. Is there a drag preview label following the cursor showing the current value?
5. After releasing, is the new thickness reflected in the inspector?
6. Try dragging a fault handle — does the fault geometry update during drag?
7. During a drag, does the camera rotation stop (no orbit)?
8. After releasing the drag, does camera orbit resume?

**Expected:** Handles appear on selection. Drag updates geometry in real time. Preview label follows cursor. Camera locked during drag.

Actual: I am now doing wf09. on okay Um look at the 3D viewpoint. Yes. the manual drag Has is very buggy and this hard to change? I'm now Frozen on a area and I cannot drag. I cannot drag. And okay, I just refresh the local host and now I can drag again. Yeah the dragging. um the dragging the manual chain dragging does bug and when it does bug the localhost freezes so I cannot zoom in or out or change my view of the visual that is a On the dragon, it says drag to change strike. It says to change dip and there's a blue. button There. Off to it is very buggy. So I'm unable to drag manually. the camera rotation does stop And after lacing does not resume.

---

## WF-10 — Conflict rule (edit path A vs B/C)

**What to check:** The conflict rule correctly preserves manual edits across re-parses.

1. Interpret: `A sandstone layer with a normal fault dipping 60 degrees.`
2. In the inspector, manually change the fault dip to 80 degrees
3. Re-type the description with a different sandstone description but keep the fault sentence unchanged, then interpret
4. Does the fault dip remain at 80 degrees (manual edit preserved)?
5. Now change the fault sentence to `A normal fault dipping 45 degrees.` and re-interpret
6. Does the fault dip now update to 45 degrees (manual edit cleared because originating sentence changed)?

**Expected:** Manual edits survive when their originating sentence is unchanged. Manual edit clears when the user changes the sentence that produced that field.

Actual: I am now on wf-10. I'm now interpreting the First prompt okay now. I do have my normal fault. the dip direction can't be changed. manually will be changed manually from the right. numbers by clicking up and down Maybe a suggestion is to remove the drag. dragging maybe a suggestion is to remove the dragging. manual change could as the manual change of the numerical variables on the right of the screen same to work well. retard description for different sense and description I'm not changing to a red sense stand layer. and the layer on the right does say red sandstone, but which is okay. the when okay, the I now change the dip okay when I change the to red sandstone layer. The manually dip is still preserved. Now I am changed during number five. of a normal fault dipping it 45 degrees and a normal fault with the normal known for dipping 45 degrees Does not show. a the whole dieselization has disappeared and now I only see the grid line. so I don't know what happened there. I'm now resetting and typing in a normal dipping at 45 degrees again and yeah, I am still seeing the visual so maybe that from has some sort of bug. Okay, I am understand what you said and I'm keeping the sandstone layer. And then I'm now changing only the normal fault sentence. to and yes the dip so when I change when I have a sense then layout with a new 45 degrees now 45 degrees. I'm now changing that to 80 degrees now again and okay, so I will start this again. I'm now got now have the original statement in question one. I change the dip Direction to 80 and then I now change the second part of the sentence to a normal fault dipping 45 degrees and the interpret and it does 45 degrees once I do change the problem fully yeah.

---

## WF-11 — History playback

**What to check:** The history timeline steps through geological events in order.

1. Interpret: `A sandstone layer, then a limestone layer deposited on top, followed by a normal fault cutting through both layers.`
2. Describe the timeline at the bottom — are there step controls? A scrubber?
3. Click the step-back button until you're at event 0
4. What is shown in the 3D view at the start of history (oldest state)?
5. Click step-forward once — what appears?
6. Click step-forward again — what appears?
7. Try dragging the scrubber to a middle position
8. Try the Play button — does it animate through events automatically?

**Expected:** Timeline shows each event as a step. Stepping back shows layers without fault. Stepping forward adds fault. Play animates through sequence.

Actual: I am now on wf11. and we will I am now going to put the prompt in number one? I am interpreting. and have a result there are controls at the timeline on the bottom, but the historical events say one of one. So when I go to zero one, there are two. layers, and then when I go to one of one the exact layers the laser the exact same but I now have a fault line by my translucent orange fault one click the button so yep I move to events 0 Which is just the two layers, then I play for it once and it my fault one appears. Then I play forward again. There's only one of one, so this only two options here, so I can't step forward again. I'm now trying to do the dragger to the middle position. and I'm unable to do that because there is only one out of one event happening when I do the play button. It just Waits too seconds and then shows the second event automatically. The first medically so it will be on zero out of one for two seconds, and then it will change to one out of one. there was no animation or yeah, I think there is supposed to be more vents here. but it's just the normal ways and then the fault

---

## WF-12 — JSON download and upload (roundtrip)

**What to check:** Downloading and re-uploading a JSON file restores both description and model exactly.

1. Interpret any model (e.g. from WF-02)
2. Note the layer count and event count
3. Click **Download JSON** (or equivalent) — a `.json` file should download
4. Click **Reset** to clear the model
5. Confirm the 3D viewport is empty and description is cleared
6. Click **Open JSON** (or file upload) and select the downloaded file
7. Does the model restore — same layers and events?
8. Does the description textarea restore the original text?
9. Is the 3D model visually identical to before the reset?

**Expected:** Download produces a .json file. Upload restores exact model and description. Counts match.

Actual: Iron Man wf12 now so I am interpreting the model from wf11 I am noting that the layer count. is two layers And the event count is one. I am now pressing the download Jensen which is the so there is a so, I'm now pressing down Legends I do have a gents and file that is appeared in my downloads and now I'm pressing reset. And then I am pressing. upload Jensen I press my gents and end and the model does successfully. Appear again, so the upper the download and then uploading the real model did work. On it restores perfectly with the same amount of layers and events. And it also installs the restores the original text. And it is visually identical to before the reset.

---

## WF-13 — Invalid JSON upload (error handling)

**What to check:** Uploading a malformed file shows an error toast, not a crash.

1. Create a text file containing `{ "invalid": "not a geoforge model" }` and save as `.json`
2. Use **Open JSON** to upload this file
3. Does an error toast appear? What does it say?
4. Does the app remain stable (no crash)?
5. Is the previous model preserved or cleared?

**Expected:** Toast shows "This file isn't a valid GeoForge model. Check it was downloaded from this app." App remains stable.

Actual: Save a I'm unable to do this, as I don't know how so save a text file as a Jensen with invalid. Not a gefirge model that you're saying question one in the test folder, and I can try this. On the rewind with that. With that json file that you can make for me.

---

## WF-14 — Interpreter error (error handling)

**What to check:** A description that produces invalid JSON from the LLM shows an error toast.

1. This is hard to trigger naturally — if you have a dev server available, you can temporarily make it return invalid JSON
2. If not, describe the error toast behaviour you have seen previously when the interpreter fails

**Expected:** Toast shows "Interpreter couldn't read that. Try again, or rephrase."
 
 ACtual: I am unable to do wf14, as I don't understand it again as in wf13. If you make me some sort of file that I can put that you put in the tests folder. I can retry to redo this on this smoke test rerun.
---

## WF-15 — Intrusions

**What to check:** Intrusive bodies interpret and render with correct geometry.

1. Interpret: `A sandstone layer intruded by a vertical basalt dyke.`
   Describe the dyke geometry — is it a vertical tabular body cutting the layer?
2. Reset. Interpret: `A limestone layer intruded by a horizontal dolerite sill.`
   Describe the sill — is it a flat horizontal sheet?
3. Reset. Interpret: `A sandstone sequence intruded by a large granite batholith.`
   Describe the batholith — is it a large dome-like mass?
4. Reset. Interpret: `A mudstone layer with a laccolith intrusion causing dome uplift.`
   Describe the laccolith — does the overlying layer dome upward?
5. For any intrusion, are there measurement overlays? (strike/dip arc, thickness arrow, depth line)

**Expected:** Each intrusion type has visibly distinct geometry. Overlays present on intrusions.

Actual: I am now on wf15 and I am interpreting the first prompt. I have a weird dike I have a rectangle in the middle of my layer. that is flashing black in a weird way And my events on the right. Not showing as a dike. so this need a rework as the darkest flashing and it's not showing on the events side ice typed in the second prompt and no seal is there. I can say there's no events in on the right. Is it it's just a flat horizontal? say shape with the limestone But it does say that there is a zero point three units. Are now I've been in number three. and I have the same thing. There is nothing there. There's just one the sense and layer with no events on the right. and see layout Now I'm doing from number four. the exact same Result as last time. I'm saying an empty layout with no events on the right. I don't see I see. Maybe a couple overlays. For any intrusion for one over each andtrusion, but there is no visual throwing up. when I go to my formation reference on the next tab assault vessel seal granite I believe is not showing any Visual as well as the angular on conformity disinformity and non-conformity there is no. visual there on the formation reference tab


---

## WF-16 — Unconformities

**What to check:** Unconformities render as wavy lines at the erosional contact.

1. Interpret: `An older tilted sandstone series below an angular unconformity with horizontal limestone deposited above.`
   Describe — is there a wavy line at the contact between the two sequences? Is it amber/gold coloured?
2. Reset. Interpret: `A disconformity between two parallel sandstone layers representing a time gap.`
   Describe the contact line.
3. Reset. Interpret: `A nonconformity with granite below and sedimentary layers above.`
   Describe the contact.
4. For any unconformity, is there a label showing the time gap or type? Is there an angular discordance arc (where applicable)?

**Expected:** Wavy amber/gold line at the erosional contact. Labels showing unconformity type and time gap. Angular discordance arc for angular unconformity.


Actual: nothing like previous wf15
---

## WF-17 — Mineralisation (porphyry deposit)

**What to check:** A porphyry Cu-Au deposit interprets and renders with hydrothermal overlays.

1. Interpret: `A porphyry copper-gold deposit associated with a granodiorite intrusion with potassic and phyllic alteration zones.`
2. Describe the 3D rendering — is there a central ore body? Concentric alteration shells?
3. Are there hydrothermal five-elements arrow labels? (heat source, fluid source, metal source, pathway, trap)
4. Are grade labels present on the ore body?
5. Are the alteration zone boundaries visible as separate rings?

**Expected:** Porphyry ore body with concentric alteration shells. Five-elements arrows pointing outward from ore body. Grade and alteration labels visible.

Actual: Ok, I'm now on wf17. I interpreting the first prompt. and I get a flame a clear grid line with no visual there is no layers or events on the right. There is no 3D rendering it all. There's no five elements and the arrow labels. There were no great labels, and there are no alteration boundaries visible as separate links.

---

## WF-18 — Mineralisation (other deposit types)

**What to check:** All five mineralisation subtypes interpret and render.

1. Interpret: `An orogenic gold deposit hosted in quartz veins along a shear zone.`
   Describe the geometry — is there a linear vein-like body?
2. Reset. Interpret: `A volcanogenic massive sulphide deposit at a submarine volcanic centre.`
   Describe — is there a lens-shaped ore body with a stringer zone below?
3. Reset. Interpret: `A skarn deposit at the contact between a granite intrusion and limestone.`
   Describe — is there a reaction zone at the intrusion-limestone contact?
4. Reset. Interpret: `An epithermal gold-silver deposit in a volcanic setting with boiling zone.`
   Describe — is there a near-surface ore body? A boiling zone marker?

**Expected:** Each deposit type has visibly distinct geometry matching its structural setting. All five-element overlays present.


Actual: I am now doing wf18. I'm interpreting the first prompt. When I interpret there is no 3D visual at all. I am doing the second prompt No visual at the second prompt. I am now doing prompt. There is a visual for the third prompt. It has five labels. It has it says in blue firstly of the scan contact soon, and then it says heat source fluid sauce metal sauce pathway, and trap with different descriptions. But I do not see anything occurring visually. I am not doing the fourth from and the event for the third from there is no events on the right. On the fourth prompt there is nothing, so no visual no events no ways.
---

## WF-19 — Reference view

**What to check:** The Reference tab shows geological type cards with 3D scenes.

1. Click the **Reference** tab (or button) — does a new view open?
2. How many reference sections are listed? (Expected: ~6 — Layers, Faults, Folds, Intrusions, Unconformities, Mineralisation)
3. Scroll through the cards — are there individual cards for each geological type?
4. Pick a fault card (e.g. Normal Fault) — does its 3D scene show a rendered fault with overlays?
5. Are the stated/inferred field labels present on the reference card 3D scenes?
6. Are there multiple mineralisation cards (porphyry, orogenic gold, VMS, skarn, epithermal)?

**Expected:** 6 reference sections. Cards for all layer, fault, fold, intrusion, unconformity, and mineralisation types. Each card has a live 3D scene with overlays.

Actual: I am now doing Um WF 19 reference view so I'm clicking on the reference tab. The on my layers are showing correctly or my faults are showing. Correctly, or my folds are showing correctly. There is no intrusions. and there is that is a occurrence for my deposits with five values and five descriptors and layers of different mineralizations and all deposits But in the previous FM there was no visual showing up when I gave the prompts

---

## WF-20 — localStorage persistence

**What to check:** Refreshing the browser restores the last session automatically.

1. Interpret any model (e.g. WF-02 model)
2. Note the model contents
3. Close the tab and reopen it (or press F5 to refresh)
4. Without any input, does the previous model restore automatically?
5. Does the description textarea also restore?
6. Is the 3D model rendered correctly?

**Expected:** After refresh, model and description restore from localStorage automatically without any user action.

Actual: I am now doing If fw20 which is local storage persistence, I interpreting I'm now currently interpreting. the model from FM 02 the model On the right words as model overview. So yep, I have noted the model contacts. It says one layer of sandstone, and then the first of it as a normal fault. The second event is an anti-claim fold. I'm now pressing F5 and my visual is still there with the correct. model and the previous model does restore and the text area also restores and 3D model does render correctly.

---

## WF-21 — Share via URL

**What to check:** The Share button generates a URL that restores the model in a fresh session.

1. Interpret a model (e.g. WF-02)
2. Look for the **Share** button in the toolbar — is it visible?
3. Click **Share** — does a toast notification appear saying "Link copied to clipboard!"?
4. Check the browser URL bar — has a `#model=...` fragment been appended?
5. Open a new tab and paste the URL
6. Without any user input, does the model load automatically in the new tab?
7. Does the description textarea restore?
8. Is the 3D model correct?

**Expected:** Share button visible. Click produces toast and URL hash. Pasting URL in new tab restores full model without user interaction.

Actual: I am now doing FM 21. Okay, so I've interpreting the model from wf02 I found the share button. I click share and it said copy to linkboard. click the yes, the the model URL has changed and when I open and You tab and paste the url. It automatically loads with the new tab. And the text area does restore and the 3D model is correct.

---

## WF-22 — URL share takes priority over localStorage

**What to check:** A shared URL overrides any existing localStorage session.

1. Interpret model A (e.g. one layer)
2. Click Share — copy the URL
3. Interpret a different model B (e.g. three layers)
4. Open the model-A URL in the same tab (paste it in the address bar)
5. Does model A load (not model B)?

**Expected:** URL hash takes priority over the localStorage session. The shared model wins.

Actual: I am now doing wf22. So, I'm interpreting a model with one layer. I click the share and copy the url. and copying the url so now I am opening up a new model that I will. That I am. finding from FM for questions seven I've now opening that. and when I when I paste the URL for model a I am getting my w2. model so the shared model does take priority in the local storage And this is correct. 

---

## WF-23 — Export PNG

**What to check:** The Export PNG button downloads a screenshot of the current 3D view.

1. Interpret a model with visible overlays
2. Look for the **Export PNG** button in the toolbar — is it visible?
3. Click **Export PNG**
4. Does a file download start? What is the filename?
5. Open the downloaded image — does it show the 3D model as it appeared on screen?
6. Are overlays/labels visible in the exported image?

**Expected:** Export PNG button visible when model is loaded. Clicking downloads `geoforge-export.png`. Image shows current 3D view with overlays.

Actual: Okay, now I am doing wf23. I will get A I will use the example in w. f O2 again And I am now interpreting this. um I will. now Click the export PNG button. I have a file pin gmi download says gforge. Dash export.png I am opening it. and I see. a 3D model on the screen There are no overlays visible on the exported image. They image will say exactly the correct angle that I pressed export image. But there are overlays off. There is the They're in their labels, but there is a compass. with the and the dip Direction angle in blue button no label for that

---

## WF-24 — Prediction mode

**What to check:** The Predict button generates predicted mineralisation and renders it as a purple wireframe.

1. Interpret: `A sandstone layer over a limestone layer with a granite intrusion nearby.`
2. Look for the **Predict** button in the workspace pane — is it visible and enabled?
3. Click **Predict** — does the button text change to "Predicting…" while loading?
4. After prediction completes, does a purple wireframe overlay appear in the 3D view?
5. Are there prediction labels? (e.g. "PREDICTED: skarn (Fe-Cu)")
6. Is there a confidence label?
7. Is there a rationale text label?
8. Click **Reset** — do the predictions clear?

**Expected:** Predict button present. During prediction, button shows "Predicting…". Purple wireframe prediction added to scene. Labels show predicted subtype, metals, confidence, and rationale.

Actual: I am now completing f W f-24 I'm interpreting the prompt in the First statement now and I interpreting. there is no intrusion yeah by That is a prediction TAB which is invisible and enabled. I click predicting. And it is learning the prediction. and I have a purple wire for frame with the image it says confidence High Scone cufe W it has a confidence level of high medium and low. And it says predicted Scone predicted. predicted for more free and predict it be thermal and then at the rationalized text at the bottom it's distant epidemic consistence can develop but it cuts off and says dot and can't finish statement for the Rational text. I suggest that the rationale text. as well as the prediction should be on the right with the model overview as it is easy to read and doesn't skew doesn't. Disrupt the visual. If it can't fit in the model overview Tower like section, then maybe a scroll down. for this section is reasonable, so we can say all these in information, and this is a General thing we don't want to dilute the visual with extra information. That is not relevant to be on the visual. Any extra information? That is not labeled or something. Quite important can be put on the model overview right side area. So the visual is so readable and good. to see the properly good properly, so when I press reset The predictions clear as well as the model and I go back to my home screen where it says no model yet right description on the left and temperate.


---

## WF-25 — Predictions survive re-interpret

**What to check:** Re-interpreting the description does not clear predictions.

1. From WF-24 (model with predictions visible)
2. Add a sentence to the description and re-click **Interpret**
3. Are the purple wireframe predictions still visible after re-interpret?

**Expected:** Predictions persist through re-interpret because they are not part of the interpreter's schema. Predictions clear only when Reset is clicked.

Actual: I am now doing wf25. I'm using the same prompts that I get for I got from. Wf24 I'm interpreting. And then I'm predicting. I now have my Overlay again but prediction of again, but it is different. To my previous one. It is now the riding is over. Each other and I can't read the stuff that well. So yeah, the there is some model problems to prediction and they're prediction description. So maybe that does have to be in text format on the right. I think that is a better solution. I'm now adding a sentence saying there is above the layer and I am free clicking interpret. the model does change and to the prediction overlay is cleared. is cleared and there is no I can't see the purple wireframe.

---

## WF-26 — Mobile / narrow viewport fallback

**What to check:** The app shows a usable fallback on narrow viewports.

1. Resize your browser window to below 900px wide (or use browser DevTools to simulate a mobile device)
2. What does the layout look like — is there a fallback message or does the layout reflow?
3. Is the app still usable at this width?

**Expected:** A mobile fallback message or simplified layout appears below 900px. No broken layout or scrollbars cutting off content.

Actual: I dont know how to do this, dont worry about this for now

---

## WF-27 — Overlay toggle performance

**What to check:** Overlay and label toggling is fast (no perceptible lag).

1. Interpret a complex model (e.g. a fault + fold + intrusion + mineralisation)
2. Rapidly click the **Overlays** toggle 10 times
3. Is there any visible lag or frame drop?
4. Toggle **Labels** on and off — is it instant?

**Expected:** Overlay toggle < 200 ms response. No perceptible lag on a representative model.

Actual: I am now doing wf27. I have my model from wf25 with three layers and a intrusion, but it Doesn't the intrusion doesn't work? I'm now rapidly clicking overlays. 10 times there's no frame drop and it is instant. I'm now rapidly clicking labels. There is no frame drop. And it is instant.

---

## Summary checklist

After completing all workflows, mark each item:

| # | Workflow | Result |
|---|----------|--------|
| WF-01 | Default startup state | |
| WF-02 | Basic interpretation | |
| WF-03 | Stated vs inferred visuals | |
| WF-04 | All fault subtypes | |
| WF-05 | All fold subtypes | |
| WF-06 | All 7 measurement overlays | |
| WF-07 | Edit path A: description rewrite | |
| WF-08 | Edit path B: numeric inspector | |
| WF-09 | Edit path C: direct 3D manipulation | |
| WF-10 | Conflict rule | |
| WF-11 | History playback | |
| WF-12 | JSON download/upload roundtrip | |
| WF-13 | Invalid JSON error handling | |
| WF-14 | Interpreter error handling | |
| WF-15 | Intrusions (all 4 subtypes) | |
| WF-16 | Unconformities (all 3 subtypes) | |
| WF-17 | Mineralisation: porphyry | |
| WF-18 | Mineralisation: other 4 types | |
| WF-19 | Reference view | |
| WF-20 | localStorage persistence | |
| WF-21 | Share via URL | |
| WF-22 | URL priority over localStorage | |
| WF-23 | Export PNG | |
| WF-24 | Prediction mode | |
| WF-25 | Predictions survive re-interpret | |
| WF-26 | Mobile/narrow viewport | |
| WF-27 | Overlay toggle performance | |

---

---

# Smoke Test v1.2 — Bug Regression Retest

This section retests every bug identified during the v1.1 smoke test. Run these after the
v1.1 bug-fix PRs (#32, #33, #35) have been merged to master.

Start the server: `node dev-server.js` with a valid `ANTHROPIC_API_KEY`. Open a fresh tab at
`http://localhost:8000` (no prior session — clear localStorage or use incognito).

---

## RT-01 — 3D viewport visible on startup (was BUG-01 / WF-01)

**What was broken:** Opening the app showed a "No model yet" empty state in the centre panel
instead of a live 3D viewport. The grid and north arrow were not visible until after first interpret.

**Expected after fix:** A 3D scene with a grid and a red north arrow is visible immediately on
a fresh load, before any description is typed. The sample prompt buttons appear in the left
description panel.

1. Open `http://localhost:8000` in a fresh tab
2. Without typing anything, describe the centre area — is there a 3D grid visible?
3. Is there a red north arrow pointing toward the camera (+Z direction)?
4. Are the sample prompt buttons (e.g. "Tilted limestone with a normal fault") visible in the
   left panel, not the centre?

**Pass criteria:** Grid + north arrow visible immediately. Sample prompts in left panel only.

Actual:

---

## RT-02 — Layer thickness vector and fault throw/heave overlays (was BUG-02 / WF-06)

**What was broken:** In a fault scene, the layer thickness double-headed perpendicular arrow
was missing. The fault throw (vertical dashed line) and heave (horizontal dashed line) were not
visible when throw was not explicitly stated in the description.

**Expected after fix:** Both the thickness vector and throw/heave lines are visible.

1. Interpret: `A sandstone layer 2 metres thick. A normal fault dipping 60 degrees east.`
2. Click Interpret and wait for the model
3. Look at the LEFT side of the layer block — is there a double-headed arrow running vertically
   (perpendicular to the layer), with a thickness label (e.g. "2.00 u")?
4. Look for a vertical dashed line above the fault plane — is the throw line visible with a
   "Throw X.XX u" label?
5. Is there a horizontal dashed line at the datum level — is the heave line visible?
6. Are throw and heave values shown with amber (inferred) styling since they were not stated?

**Pass criteria:** Thickness double-arrow on left side of block. Throw and heave dashed lines
present with inferred amber styling.

Actual:

---

## RT-03 — Drag handles no longer freeze (was BUG-04 / WF-09)

**What was broken:** Grabbing a 3D drag handle froze the browser. After releasing, camera orbit
did not resume.

**Expected after fix:** Dragging is smooth, app does not freeze, camera orbit resumes on release.

1. Interpret: `A sandstone layer 1 metre thick with a normal fault dipping 60 degrees east.`
2. Click on the sandstone layer in the inspector to select it — cyan drag handles should appear
3. Grab the TOP drag handle and move the mouse slowly — does the layer thickness change smoothly?
4. Does the app remain responsive (can you still zoom/orbit with a slight hold)?
5. Release the handle — does camera orbit resume immediately?
6. Check the inspector: does the thickness reflect the new dragged value?

**Pass criteria:** No freeze. Layer thickness updates. Camera orbit resumes after release.

Actual:

---

## RT-04 — Intrusions render correctly (was BUG-06 / WF-15)

**What was broken:** Dyke geometry z-fought with layers (flickering black). Batholith and
laccolith were invisible (hidden inside opaque layer geometry). Events panel never listed
intrusions.

**Expected after fix:** Each subtype has a distinct visible geometry. Inspector lists the intrusion.

1. Interpret: `A sandstone layer intruded by a vertical basalt dyke.`
   - Does the dyke appear as a stable dark vertical rectangle (no black flickering)?
   - Does the left panel anchor list show "dyke" with its source sentence?
2. Reset. Interpret: `A limestone layer intruded by a horizontal dolerite sill.`
   - Is a flat horizontal sheet visible?
3. Reset. Interpret: `A sandstone sequence intruded by a large granite batholith.`
   - Is a dome visible BELOW the layer stack (protruding downward)?
4. Reset. Interpret: `A mudstone layer with a laccolith intrusion causing dome uplift.`
   - Is a dome visible pushing upward from inside the layer stack?

**Pass criteria:** Dyke stable (no flicker). Sill flat. Batholith dome below stack. Laccolith
dome within/above stack. All four show their subtype in the left panel anchor list.

Actual:

---

## RT-05 — Unconformities render correctly (was BUG-07 / WF-16)

**What was broken:** Unconformities produced no visual output at all.

1. Interpret: `An older tilted sandstone series below an angular unconformity with horizontal
   limestone deposited above.`
   - Is there a wavy amber/gold line at the contact between the tilted and horizontal sequences?
2. Reset. Interpret: `A disconformity between two parallel sandstone layers representing a
   time gap.`
   - Is there a contact line between the two parallel layers?
3. Does the left panel anchor list show the unconformity subtype?

**Pass criteria:** Wavy amber line visible for angular unconformity. Contact visible for
disconformity. Subtype listed in anchor panel.

Actual:

---

## RT-06 — Mineralisation renders correctly (was BUG-08 / WF-17 + WF-18)

**What was broken:** All mineralisation subtypes rendered no visible geometry (ore body was
inside the opaque layer block). Porphyry prompts with no layers returned a blank scene.

**Expected after fix:** Each deposit type has a visible geometry partially outside the layer
block. A mineralisation-only prompt (no layers mentioned) still renders.

1. Interpret: `A porphyry copper-gold deposit associated with a granodiorite intrusion.`
   (Note: no sedimentary layers mentioned)
   - Is there a visible 3D shape (concentric spheres or similar) even without layers?
2. Reset. Interpret: `A sandstone layer with an orogenic gold deposit in quartz veins along
   a shear zone.`
   - Are thin vein-like bodies visible cutting through the layer?
3. Reset. Interpret: `A sandstone layer with a skarn deposit at a contact.`
   - Is there a contact zone visible protruding from the side of the block?
4. Does the left panel anchor list show the mineralisation subtype for each?

**Pass criteria:** Porphyry renders without layers. Orogenic gold veins visible. Skarn at
block edge. All listed in anchor panel.

Actual:

---

## RT-07 — Export PNG includes overlays (was BUG-10 / WF-23)

**What was broken:** The exported PNG contained only the 3D geometry with no measurement
overlays (cyan arcs, labels, arrows).

**Expected after fix:** Exported PNG shows the full scene including overlays and labels,
on a dark background matching the app.

1. Interpret: `A sandstone layer dipping 30 degrees east with a normal fault dipping 60 degrees.`
2. Make sure Overlays and Labels toggles are both ON
3. Click **Export PNG** — a file `geoforge-export.png` downloads
4. Open the PNG — is the background dark (not white/transparent)?
5. Are the cyan measurement overlays (dip arc, strike line) visible in the image?
6. Are the text labels (e.g. "Dip 30°", "Strike N°") visible in the image?
7. Click Export PNG twice quickly — does only ONE file download (no double-download)?

**Pass criteria:** Dark background. Overlays and labels visible in image. Single download per click.

Actual:

---

## RT-08 — Predictions survive re-interpret (was BUG-11 / WF-25)

**What was broken:** Re-interpreting the description (even by adding a single sentence) cleared
the purple wireframe predictions.

**Expected after fix:** Predictions persist through re-interpret and are only cleared by Reset.

1. Interpret: `A sandstone layer over a limestone layer with a granite intrusion nearby.`
2. Click **Predict** — wait for the purple wireframe overlay to appear
3. Note the predicted deposit type shown in labels
4. Add a new sentence to the description: `The granite is coarse-grained.`
5. Click **Interpret** again
6. Is the purple wireframe prediction still visible after re-interpret?
7. Are the prediction labels still showing the same deposit type?
8. Click **Reset** — do predictions clear?

**Pass criteria:** Purple wireframe survives re-interpret. Reset clears it.

Actual:

---

## RT-09 — Prediction labels no longer overlap (was BUG-11 / WF-24)

**What was broken:** When 2–3 predictions were generated, all labels rendered at the same
position and overlapped, making them unreadable.

**Expected after fix:** Each prediction's labels are stacked vertically above the model,
readable without overlap.

1. Interpret: `A sandstone layer over a limestone layer with a granite intrusion nearby.`
2. Click **Predict** — wait for predictions
3. If 2 or 3 predictions appear, are their labels clearly separated vertically?
4. Can you read each predicted type without the text from one obscuring another?

**Pass criteria:** Labels for P1, P2, P3 are stacked and separately readable.

Actual:

---

## v1.2 Summary checklist

| # | Retest | Pass / Fail |
|---|--------|-------------|
| RT-01 | 3D viewport visible on startup | |
| RT-02 | Thickness vector + throw/heave overlays | |
| RT-03 | Drag handles no longer freeze | |
| RT-04 | Intrusions render (all 4 subtypes) | |
| RT-05 | Unconformities render | |
| RT-06 | Mineralisation renders (incl. no-layer prompt) | |
| RT-07 | Export PNG includes overlays on dark background | |
| RT-08 | Predictions survive re-interpret | |
| RT-09 | Prediction labels do not overlap | |

**Workflows not retested (deferred to v2 — see todo.md):**
- WF-11 (history event grouping) — anticline/syncline at zero plunge look identical
- WF-13/WF-14 (error handling) — requires test fixtures not yet created
- WF-26 (mobile viewport) — skipped in v1.1, deferred to v2
