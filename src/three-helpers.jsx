/* GeoForge — Three.js geometry and measurement-origin overlay primitives.
 *
 * Coordinate system:
 *   +X = east
 *   +Y = up
 *   +Z = north
 *
 * Bearings (strike, dip-direction, plunge-direction) are degrees clockwise from
 * north. Dip and plunge are degrees down from horizontal.
 *
 * The public entry point is `buildSceneContents(model, opts)`, which takes a
 * GeoModel-shaped object and returns:
 *   {
 *     root:     THREE.Group         // 3D meshes
 *     overlays: THREE.Group         // overlay primitives (arcs, planes, vectors)
 *     labels:   Array<{node, data}> // CSS2DObjects with metadata
 *     handles:  Array<...>          // pickable handles (not implemented in v1)
 *     bounds:   THREE.Box3
 *   }
 */

(function () {
  const T = window.THREE;
  const COLOR = {
    overlay: 0x67e8f9,
    overlayDim: 0x67e8f9,
    inferred: 0xf59e0b,
    grid:     0x232a38,
    gridMajor:0x2e3648,
    north:    0xef6262,
    horizon:  0xa3e4ff,
    dashed:   0x67e8f9,
    fault:    0xff8c5a,
    hinge:    0xf6d3ff,
    axial:    0xb693ff,
    minCore:    0xffd700,  // gold — ore body core
    minPhyllic: 0x708090,  // slate grey — phyllic alteration
    minArgillic:0xcd853f,  // peru brown — argillic alteration
    minPropyl:  0x556b2f,  // dark olive — propylitic alteration
    minVein:    0xf5f5dc,  // beige — quartz veins
    minVMS:     0x696969,  // dim grey — VMS massive sulphide
    minSkarn:   0xd2691e,  // chocolate — skarn
    minEpi:     0xe8d4a0,  // tan — epithermal
  };

  // ---------- Math helpers ----------
  const deg = (r) => (r * 180) / Math.PI;
  const rad = (d) => (d * Math.PI) / 180;

  // Bearing in degrees -> horizontal unit vec (X=east, Z=north).
  // 0=N(+Z), 90=E(+X), 180=S(-Z), 270=W(-X).
  function bearingVec(bDeg) {
    const r = rad(bDeg);
    return new T.Vector3(Math.sin(r), 0, Math.cos(r));
  }
  // Strike axis (horizontal in plane, by convention strike is a bearing).
  function strikeVec(strikeDeg) { return bearingVec(strikeDeg); }
  // Down-dip vec (in plane, sloping down).
  function downDipVec(dipDeg, dipDirDeg) {
    const dr = rad(dipDeg), b = rad(dipDirDeg);
    return new T.Vector3(
      Math.sin(b) * Math.cos(dr),
      -Math.sin(dr),
      Math.cos(b) * Math.cos(dr),
    );
  }
  // Up-dip (in plane, sloping up).
  function upDipVec(dipDeg, dipDirDeg) {
    return downDipVec(dipDeg, dipDirDeg).negate();
  }
  // Plane normal (points "up and out" away from dip direction).
  function planeNormal(dipDeg, dipDirDeg) {
    const dr = rad(dipDeg), b = rad(dipDirDeg);
    return new T.Vector3(
      Math.sin(dr) * Math.sin(b),
      Math.cos(dr),
      Math.sin(dr) * Math.cos(b),
    );
  }

  // ---------- Materials (cached) ----------
  const lineMat = (color, opts = {}) => new T.LineBasicMaterial({
    color, linewidth: opts.width || 1, transparent: true, opacity: opts.opacity ?? 0.9,
    depthTest: opts.depthTest ?? true,
  });
  const dashMat = (color, opts = {}) => new T.LineDashedMaterial({
    color, dashSize: opts.dashSize || 0.08, gapSize: opts.gapSize || 0.05,
    transparent: true, opacity: opts.opacity ?? 0.95, depthTest: opts.depthTest ?? false,
  });
  const planeMatTrans = (color, op = 0.18) => new T.MeshBasicMaterial({
    color, side: T.DoubleSide, transparent: true, opacity: op, depthWrite: false,
  });

  // ---------- Label helpers (CSS2D) ----------
  function makeLabel(text, opts = {}) {
    const el = document.createElement('div');
    el.className = 'geo-label' + (opts.inferred ? ' inferred' : '') + (opts.className ? ' ' + opts.className : '');
    if (opts.html) el.innerHTML = text; else el.textContent = text;
    const obj = new window.CSS2DObject(el);
    obj.element = el;
    if (opts.center) {
      el.style.transform = 'translate(-50%, -50%)';
    }
    return obj;
  }
  function makeValueLabel(text, opts = {}) {
    const el = document.createElement('div');
    el.className = 'geo-overlay-value' + (opts.inferred ? ' inferred' : '') + (opts.muted ? ' muted' : '');
    el.textContent = text;
    return new window.CSS2DObject(el);
  }
  function makeCompassLetter(letter) {
    const el = document.createElement('div');
    el.className = 'geo-compass' + (letter === 'N' ? ' n' : '');
    el.textContent = letter;
    return new window.CSS2DObject(el);
  }
  function fmtDeg(v, inf) { return `${Math.round(v)}°`; }
  function fmtLen(v, units = 'u') { return `${v.toFixed(2)} ${units}`; }
  function fmtBearing(v) {
    const n = ((v % 360) + 360) % 360;
    return `${String(Math.round(n)).padStart(3, '0')}°`;
  }

  // ---------- Primitive: dashed line ----------
  function dashedLine(p1, p2, color = COLOR.dashed, opts = {}) {
    const g = new T.BufferGeometry().setFromPoints([p1, p2]);
    const line = new T.Line(g, dashMat(color, opts));
    line.computeLineDistances();
    return line;
  }
  function solidLine(points, color = COLOR.overlay, opts = {}) {
    const g = new T.BufferGeometry().setFromPoints(points);
    return new T.Line(g, lineMat(color, opts));
  }

  // ---------- Primitive: arc in 3D ----------
  // Builds an arc lying in the plane spanned by `from` and `to` (both unit vectors
  // emanating from `center`), sweeping the angle between them, at radius `radius`.
  // Returns { line, midPoint, plane }
  function arc3D(center, from, to, radius, color = COLOR.overlay, opts = {}) {
    const a = from.clone().normalize();
    const b = to.clone().normalize();
    const dot = Math.max(-1, Math.min(1, a.dot(b)));
    const angle = Math.acos(dot);
    const segments = opts.segments || Math.max(16, Math.ceil(angle * 32 / Math.PI));
    // Build orthonormal basis in arc plane: u = a, v = (b - (a·b) a) normalised.
    const u = a.clone();
    const v = b.clone().sub(a.clone().multiplyScalar(dot)).normalize();
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * angle;
      const p = u.clone().multiplyScalar(Math.cos(t)).add(v.clone().multiplyScalar(Math.sin(t)));
      pts.push(center.clone().add(p.multiplyScalar(radius)));
    }
    const mat = opts.dashed
      ? dashMat(color, { dashSize: 0.06, gapSize: 0.04, depthTest: false })
      : lineMat(color, { depthTest: false, opacity: opts.opacity ?? 0.95 });
    const line = new T.Line(new T.BufferGeometry().setFromPoints(pts), mat);
    if (opts.dashed) line.computeLineDistances();
    line.renderOrder = 10;
    const mid = pts[Math.floor(pts.length / 2)];
    return { line, midPoint: mid, points: pts };
  }

  // ---------- Primitive: filled wedge (arc + two radii, semi-transparent) ----------
  function arcWedge(center, from, to, radius, color = COLOR.overlay, op = 0.12) {
    const a = from.clone().normalize();
    const b = to.clone().normalize();
    const dot = Math.max(-1, Math.min(1, a.dot(b)));
    const angle = Math.acos(dot);
    const segments = Math.max(16, Math.ceil(angle * 32 / Math.PI));
    const u = a.clone();
    const v = b.clone().sub(a.clone().multiplyScalar(dot)).normalize();
    const positions = [];
    const c = center;
    for (let i = 0; i < segments; i++) {
      const t1 = (i / segments) * angle;
      const t2 = ((i + 1) / segments) * angle;
      const p1 = u.clone().multiplyScalar(Math.cos(t1)).add(v.clone().multiplyScalar(Math.sin(t1))).multiplyScalar(radius).add(c);
      const p2 = u.clone().multiplyScalar(Math.cos(t2)).add(v.clone().multiplyScalar(Math.sin(t2))).multiplyScalar(radius).add(c);
      positions.push(c.x, c.y, c.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.computeVertexNormals();
    const m = new T.MeshBasicMaterial({ color, transparent: true, opacity: op, side: T.DoubleSide, depthWrite: false });
    const mesh = new T.Mesh(g, m);
    mesh.renderOrder = 5;
    return mesh;
  }

  // ---------- Primitive: arrow ----------
  function arrow3D(from, to, color = COLOR.overlay, opts = {}) {
    const dir = to.clone().sub(from);
    const length = dir.length();
    if (length < 1e-5) return new T.Group();
    const ah = new T.ArrowHelper(
      dir.clone().normalize(),
      from.clone(),
      length,
      color,
      opts.headLength ?? Math.min(0.15, length * 0.25),
      opts.headWidth ?? Math.min(0.09, length * 0.15),
    );
    ah.line.material = lineMat(color, { depthTest: opts.depthTest ?? false, opacity: opts.opacity ?? 0.95 });
    ah.cone.material = new T.MeshBasicMaterial({ color, transparent: true, opacity: opts.opacity ?? 0.95, depthTest: opts.depthTest ?? false });
    ah.renderOrder = 9;
    return ah;
  }

  // Double-ended arrow (e.g. for thickness)
  function doubleArrow(from, to, color, opts = {}) {
    const g = new T.Group();
    const mid = from.clone().add(to).multiplyScalar(0.5);
    g.add(arrow3D(mid, to, color, opts));
    g.add(arrow3D(mid, from, color, opts));
    return g;
  }

  // ---------- Primitive: horizontal reference disc ----------
  function horizontalDisc(center, radius, color = COLOR.horizon, op = 0.1) {
    const g = new T.CircleGeometry(radius, 48);
    g.rotateX(-Math.PI / 2);
    const m = new T.MeshBasicMaterial({ color, transparent: true, opacity: op, side: T.DoubleSide, depthWrite: false });
    const mesh = new T.Mesh(g, m);
    mesh.position.copy(center);
    // Outline
    const ring = new T.RingGeometry(radius * 0.995, radius, 64);
    ring.rotateX(-Math.PI / 2);
    const rm = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false });
    const rmesh = new T.Mesh(ring, rm);
    rmesh.position.copy(center);
    const grp = new T.Group();
    grp.add(mesh); grp.add(rmesh);
    return grp;
  }

  // ---------- Primitive: compass rose (CSS2D letters) ----------
  function compassRose(center, radius = 0.5) {
    const grp = new T.Group();
    // ring
    const ring = new T.RingGeometry(radius * 0.95, radius, 48);
    ring.rotateX(-Math.PI / 2);
    grp.add(new T.Mesh(ring, new T.MeshBasicMaterial({ color: 0x6e7892, transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false })));
    // ticks
    const dirs = [
      { l: 'N', v: new T.Vector3(0, 0, 1), color: COLOR.north },
      { l: 'E', v: new T.Vector3(1, 0, 0), color: 0x6e7892 },
      { l: 'S', v: new T.Vector3(0, 0, -1), color: 0x6e7892 },
      { l: 'W', v: new T.Vector3(-1, 0, 0), color: 0x6e7892 },
    ];
    for (const d of dirs) {
      const p1 = d.v.clone().multiplyScalar(radius * 0.85);
      const p2 = d.v.clone().multiplyScalar(radius * 1.0);
      const ln = solidLine([p1, p2], d.color, { depthTest: false });
      ln.renderOrder = 10;
      grp.add(ln);
      const letter = makeCompassLetter(d.l);
      letter.position.copy(d.v.clone().multiplyScalar(radius * 1.18));
      grp.add(letter);
    }
    grp.position.copy(center);
    return grp;
  }

  // ---------- Layer geometry helpers ----------
  // We render a block: a rectangle in plan (X * Z) extruded in Y. Each layer is a
  // slab in that block. We return per-layer meshes so events (fault, fold) can
  // operate on them.
  function layerBlock(layers, opts = {}) {
    const width = opts.width || 4;    // X extent
    const depth = opts.depth || 4;    // Z extent
    const palette = opts.palette || window.GD.LITHOLOGY;
    const total = layers.reduce((s, L) => s + (L.thickness || 0.5), 0);
    let y = -total / 2; // centre stack on origin
    const slabs = [];
    for (const L of layers) {
      const t = L.thickness || 0.5;
      const litho = palette[L.lithology] || { color: '#888' };
      const color = L.color || litho.color || '#888';
      const geo = new T.BoxGeometry(width, t, depth);
      const mat = new T.MeshStandardMaterial({
        color: new T.Color(color),
        roughness: 0.92,
        metalness: 0.02,
        flatShading: false,
      });
      const mesh = new T.Mesh(geo, mat);
      mesh.position.y = y + t / 2;
      mesh.userData = { kind: 'layer', layer: L };
      slabs.push({ mesh, top: y + t, bottom: y, thickness: t, L });
      y += t;
    }
    return { group: groupOf(slabs.map((s) => s.mesh)), slabs, width, depth, total };
  }
  function groupOf(items) { const g = new T.Group(); for (const it of items) g.add(it); return g; }

  // ---------- Wireframe block edges (for crisp outlines) ----------
  function blockEdges(width, height, depth, color = 0x2e3648, op = 0.6) {
    const g = new T.BoxGeometry(width, height, depth);
    const e = new T.EdgesGeometry(g);
    return new T.LineSegments(e, new T.LineBasicMaterial({ color, transparent: true, opacity: op }));
  }

  // =============================================================
  // SCENE BUILDERS — one per event type, called from buildSceneContents.
  // Each returns { meshes, overlays, labels, bounds }.
  // =============================================================

  // ---- Stratigraphy with optional tilt ----
  function buildLayersOnly(model) {
    const meshes = new T.Group();
    const overlays = new T.Group();
    const labels = [];

    const tilt = model.tilt || { strike: 0, dip: 0, dip_direction: 0 };
    const dipDeg = tilt.dip || 0;
    const dipDir = tilt.dip_direction || 0;
    const strike = tilt.strike != null ? tilt.strike : ((dipDir + 90) % 360);

    const blk = layerBlock(model.layers, { width: 4.2, depth: 4.2 });
    const stack = blk.group;
    stack.add(blockEdges(4.2, blk.total, 4.2));

    // Tilt the entire stack about its centre using strike axis (in horizontal plane)
    if (dipDeg !== 0) {
      const strikeAxis = strikeVec(strike).normalize();
      // Negative dip about the strike axis tilts towards dip_direction
      stack.rotateOnWorldAxis(strikeAxis, -rad(dipDeg));
    }

    meshes.add(stack);

    // ---- Thickness overlays per layer (computed in tilted world space) ----
    // For each layer slab, draw a perpendicular vector between its top and bottom planes.
    if (model.overlayOpts?.thickness !== false) {
      const n = planeNormal(dipDeg, dipDir); // top-side normal
      const inPlaneU = strikeVec(strike).normalize();
      // We anchor each thickness vector at the layer's mid-edge on one side of the block.
      const sideOffset = -2.1; // along inPlaneU direction
      // Build a transform that takes a "block-frame" vec to world: the stack rotation.
      const blockToWorld = new T.Matrix4();
      const q = new T.Quaternion();
      const strikeAxis = strikeVec(strike).normalize();
      q.setFromAxisAngle(strikeAxis, -rad(dipDeg));
      blockToWorld.makeRotationFromQuaternion(q);

      for (const s of blk.slabs) {
        const bottom = new T.Vector3(sideOffset, s.bottom, 2.1).applyMatrix4(blockToWorld);
        const top = new T.Vector3(sideOffset, s.top, 2.1).applyMatrix4(blockToWorld);
        // Reference planes (short lines along edges of the slab tops/bottoms)
        const refColor = COLOR.horizon;
        // Draw the perpendicular thickness arrow.
        const inferred = s.L.field_origin?.thickness === 'inferred';
        overlays.add(doubleArrow(bottom, top, inferred ? COLOR.inferred : COLOR.overlay, { headLength: 0.07, headWidth: 0.045 }));
        // Value label
        const mid = bottom.clone().add(top).multiplyScalar(0.5).add(new T.Vector3(0.05, 0, 0));
        const lbl = makeValueLabel(`${s.thickness.toFixed(2)} u`, { inferred });
        lbl.position.copy(mid);
        overlays.add(lbl);

        // Layer name label
        const nameLbl = makeLabel(`${s.L.name}`);
        const nl = new T.Vector3(2.1, (s.top + s.bottom) / 2, 2.1).applyMatrix4(blockToWorld);
        nameLbl.position.copy(nl);
        meshes.add(nameLbl);
        labels.push({ node: nameLbl, data: { kind: 'layer', id: s.L.id } });
      }
    }

    // ---- Strike / Dip / DipDir overlays (only if tilted) ----
    if (dipDeg > 0.01 && model.overlayOpts?.tilt !== false) {
      const vertex = new T.Vector3(0, 0, 0); // top centre of stack — but topcentre is rotated
      // Use the top-face centre of the (untilted) block, then rotate.
      const blockToWorld = new T.Matrix4();
      const q = new T.Quaternion();
      const strikeAxis = strikeVec(strike).normalize();
      q.setFromAxisAngle(strikeAxis, -rad(dipDeg));
      blockToWorld.makeRotationFromQuaternion(q);
      const topCenter = new T.Vector3(0, blk.total / 2, 0).applyMatrix4(blockToWorld);

      const stratStriked = model.tilt?.field_origin?.strike;
      const stratDipped = model.tilt?.field_origin?.dip;
      const stratDDir = model.tilt?.field_origin?.dip_direction;
      const stInf = stratStriked === 'inferred';
      const dpInf = stratDipped === 'inferred';
      const ddInf = stratDDir === 'inferred';

      addDipOverlay(overlays, labels, {
        vertex: topCenter,
        strike,
        dipDeg,
        dipDir,
        radius: 1.2,
        inferred: { dip: dpInf, strike: stInf, dipDir: ddInf },
      });
    }

    return { meshes, overlays, labels };
  }

  // ---- Dip / Strike / Dip-direction overlay (composable) ----
  // Draws: horizontal reference disc, dip arc & label, strike line on the dipping
  // plane, compass rose at the vertex, dip-direction arc on the horizontal.
  function addDipOverlay(overlays, labels, { vertex, strike, dipDeg, dipDir, radius = 1.0, inferred = {} }) {
    const horizDir = bearingVec(dipDir);             // horizontal projection of down-dip
    const downDip = downDipVec(dipDeg, dipDir);       // in-plane down-dip vec
    const strikeAxis = strikeVec(strike);

    // 1) Horizontal reference disc through vertex
    overlays.add(horizontalDisc(vertex, radius * 1.05, COLOR.horizon, 0.08));

    // 2) Compass rose at the vertex
    overlays.add(compassRose(vertex, radius * 0.65));

    // 3) Strike line on the dipping plane (also in horizontal because strike is horizontal)
    const sP1 = vertex.clone().add(strikeAxis.clone().multiplyScalar(radius * 1.4));
    const sP2 = vertex.clone().add(strikeAxis.clone().multiplyScalar(-radius * 1.4));
    overlays.add(solidLine([sP1, sP2], COLOR.overlay, { depthTest: false, opacity: 0.85 }));
    const strikeLbl = makeValueLabel(`Strike ${fmtBearing(strike)}`, { inferred: inferred.strike });
    strikeLbl.position.copy(sP1.clone().add(new T.Vector3(0, 0.1, 0)));
    overlays.add(strikeLbl);

    // 4) Dip-direction: horizontal projection of down-dip + arc from N to dipDir
    const ddEnd = vertex.clone().add(horizDir.clone().multiplyScalar(radius * 1.0));
    overlays.add(arrow3D(vertex, ddEnd, COLOR.overlay, { headLength: 0.08, headWidth: 0.05, depthTest: false }));
    // arc on horizontal plane from N (Z+) to horizDir
    const arcDir = arc3D(vertex, new T.Vector3(0, 0, 1), horizDir, radius * 0.55, COLOR.overlay, { opacity: 0.95 });
    overlays.add(arcDir.line);
    overlays.add(arcWedge(vertex, new T.Vector3(0, 0, 1), horizDir, radius * 0.55, COLOR.overlay, 0.08));
    const dirLbl = makeValueLabel(`Dip dir ${fmtBearing(dipDir)}`, { inferred: inferred.dipDir });
    dirLbl.position.copy(arcDir.midPoint.clone().add(new T.Vector3(0, 0.05, 0)));
    overlays.add(dirLbl);

    // 5) Dip arc: from horizontal projection direction down to the down-dip vec
    const dipArc = arc3D(vertex, horizDir, downDip.clone().normalize(), radius * 0.85, COLOR.overlay);
    overlays.add(dipArc.line);
    overlays.add(arcWedge(vertex, horizDir, downDip.clone().normalize(), radius * 0.85, COLOR.overlay, 0.16));
    const dipLbl = makeValueLabel(`Dip ${fmtDeg(dipDeg)}`, { inferred: inferred.dip });
    dipLbl.position.copy(dipArc.midPoint);
    overlays.add(dipLbl);
  }

  // ---- Fault scene ----
  function buildFaultScene(model) {
    const meshes = new T.Group();
    const overlays = new T.Group();
    const labels = [];

    const evt = model.events[0];
    const strike = evt.strike ?? 0;
    const dipDeg = evt.dip ?? 60;
    const dipDir = evt.dip_direction ?? 90;
    const subtype = evt.subtype;
    const throwV = evt.throw ?? 0;
    const heaveV = evt.heave ?? (Math.abs(throwV) / Math.tan(rad(dipDeg))); // h = t/tan
    const displacement = evt.displacement ?? 0;

    // ---- Build the layered block, split in two by a vertical "cut" parametrised
    // by the fault plane.
    // Approach: For each layer slab, build two half-meshes — the footwall (FW,
    // east of fault for east-dipping normal; conceptually "left of plane") and the
    // hanging wall (HW). We translate the HW by the slip vector to show offset.
    //
    // We use a simple stencil: split the box into two by clipping with a plane
    // through origin with given normal & dip direction.

    const width = 4.6;
    const depth = 3.6;
    const total = model.layers.reduce((s, L) => s + L.thickness, 0);
    const palette = window.GD.LITHOLOGY;

    // Slip vector for movement of the hanging wall relative to the footwall.
    // For a normal fault (HW drops): slip is parallel to down-dip line.
    // For a reverse/thrust fault (HW rises): slip is up-dip.
    // For a strike-slip: slip is along strike.
    // For an oblique: combined.
    let slipVec = new T.Vector3(0, 0, 0);
    if (subtype === 'normal' || subtype === 'listric') {
      slipVec = downDipVec(dipDeg, dipDir).normalize().multiplyScalar(throwV / Math.sin(rad(dipDeg) || 1));
    } else if (subtype === 'reverse' || subtype === 'thrust') {
      slipVec = upDipVec(dipDeg, dipDir).normalize().multiplyScalar(throwV / Math.sin(rad(dipDeg) || 1));
    } else if (subtype === 'strike-slip') {
      const sign = evt.sense === 'sinistral' ? -1 : 1;
      slipVec = strikeVec(strike).normalize().multiplyScalar(sign * displacement);
    } else if (subtype === 'oblique') {
      // throw (vertical component) + strike component
      const t = throwV / Math.sin(rad(dipDeg) || 1);
      const ddv = downDipVec(dipDeg, dipDir).normalize().multiplyScalar(t);
      const horizComp = Math.sqrt(Math.max(0, displacement * displacement - t * t));
      const sense = evt.sense === 'sinistral' ? -1 : 1;
      const stv = strikeVec(strike).normalize().multiplyScalar(sense * horizComp);
      slipVec = ddv.add(stv);
    }

    // For listric: we will render the fault plane as a curve. Slip approximated by surface dip.
    const isListric = subtype === 'listric';

    // ---- Render layers as two clipped half-blocks ----
    const planePoint = new T.Vector3(0, 0, 0);
    const planeN = planeNormal(dipDeg, dipDir);
    const clipPlaneHW = new T.Plane(planeN.clone(), 0);
    const clipPlaneFW = new T.Plane(planeN.clone().negate(), 0);

    const slabs = [];
    let y = -total / 2;
    for (const L of model.layers) {
      const t = L.thickness;
      const litho = palette[L.lithology] || { color: '#888' };
      const color = L.color || litho.color || '#888';

      const baseGeom = new T.BoxGeometry(width, t, depth);
      const matBase = new T.MeshStandardMaterial({
        color: new T.Color(color), roughness: 0.92, metalness: 0.02,
        clippingPlanes: [], // set per side
      });
      // Footwall (the half on the "below/negative-normal" side of the plane)
      const fwMat = matBase.clone();
      fwMat.clippingPlanes = [clipPlaneFW];
      const fw = new T.Mesh(baseGeom, fwMat);
      fw.position.y = y + t / 2;
      fw.userData = { kind: 'layer', side: 'fw', layer: L };
      // Hanging wall (the half on the "above/positive-normal" side of the plane)
      const hwMat = matBase.clone();
      hwMat.clippingPlanes = [clipPlaneHW];
      const hw = new T.Mesh(baseGeom, hwMat);
      hw.position.y = y + t / 2;
      hw.position.add(slipVec); // displace HW
      hw.userData = { kind: 'layer', side: 'hw', layer: L };

      meshes.add(fw);
      meshes.add(hw);
      slabs.push({ y0: y, y1: y + t, L, t });
      y += t;
    }

    // ---- Fault plane visualization ----
    if (!isListric) {
      // Quadrilateral lying in the fault plane, spanning slab extents.
      const strikeAxis = strikeVec(strike).normalize();
      const planeAxisU = strikeAxis.clone();
      const planeAxisV = downDipVec(dipDeg, dipDir).normalize();
      const faultHalfStrike = depth * 0.7;
      const faultHalfDip = total * 0.9 / Math.sin(rad(dipDeg) || 1);
      const cornersF = [
        planeAxisU.clone().multiplyScalar(faultHalfStrike).add(planeAxisV.clone().multiplyScalar(faultHalfDip)),
        planeAxisU.clone().multiplyScalar(-faultHalfStrike).add(planeAxisV.clone().multiplyScalar(faultHalfDip)),
        planeAxisU.clone().multiplyScalar(-faultHalfStrike).add(planeAxisV.clone().multiplyScalar(-faultHalfDip)),
        planeAxisU.clone().multiplyScalar(faultHalfStrike).add(planeAxisV.clone().multiplyScalar(-faultHalfDip)),
      ];
      const fp = new T.BufferGeometry();
      fp.setAttribute('position', new T.Float32BufferAttribute([
        cornersF[0].x, cornersF[0].y, cornersF[0].z,
        cornersF[1].x, cornersF[1].y, cornersF[1].z,
        cornersF[2].x, cornersF[2].y, cornersF[2].z,
        cornersF[0].x, cornersF[0].y, cornersF[0].z,
        cornersF[2].x, cornersF[2].y, cornersF[2].z,
        cornersF[3].x, cornersF[3].y, cornersF[3].z,
      ], 3));
      fp.computeVertexNormals();
      const fpMesh = new T.Mesh(fp, new T.MeshBasicMaterial({ color: COLOR.fault, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false }));
      fpMesh.renderOrder = 2;
      meshes.add(fpMesh);
      // Plane outline
      const outline = solidLine([cornersF[0], cornersF[1], cornersF[2], cornersF[3], cornersF[0]], COLOR.fault, { opacity: 0.9 });
      meshes.add(outline);
    } else {
      // ---- Listric: build a curved fault surface using circular-arc geometry ----
      const surfaceDipDeg = dipDeg;
      const dipAtDepthDeg = evt.dip_at_depth ?? 10;
      const detachDepth = evt.detachment_depth ?? (total / 2); // applyDefaults always sets this; fallback matches workspace.jsx
      const arcData = solveCircularArc(surfaceDipDeg, dipAtDepthDeg, detachDepth);
      const { points2D, surfacePt, detachPt } = arcData;

      // Convert 2D cross-section profile to 3D world coordinates.
      // Cross-section: x = horizontal in dip direction, y = depth downward.
      // 3D: dip-dir horizontal vector, depth maps to -Y (downward in scene).
      const dipDirRad = rad(dipDir);
      const dipDirVec3 = new T.Vector3(Math.sin(dipDirRad), 0, Math.cos(dipDirRad));

      // Surface anchor: top-centre of the block (y = +total/2 in scene).
      const surfaceY = total / 2;

      // Build profile as 3D points (surface anchor + arc displacement).
      const profile3D = points2D.map((p) =>
        dipDirVec3.clone().multiplyScalar(p.x).add(new T.Vector3(0, surfaceY - p.y, 0))
      );

      // Extrude profile along strike.
      const strikeAxis = strikeVec(strike).normalize();
      const halfStrike = depth * 0.7;
      const verts = [];
      const idx = [];
      for (let i = 0; i < profile3D.length; i++) {
        const p = profile3D[i];
        const left = p.clone().addScaledVector(strikeAxis, halfStrike);
        const right = p.clone().addScaledVector(strikeAxis, -halfStrike);
        verts.push(left.x, left.y, left.z, right.x, right.y, right.z);
      }
      for (let i = 0; i < profile3D.length - 1; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, b, c, b, d, c);
      }
      const fg = new T.BufferGeometry();
      fg.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
      fg.setIndex(idx);
      fg.computeVertexNormals();
      const fpMesh = new T.Mesh(fg, new T.MeshBasicMaterial({ color: COLOR.fault, transparent: true, opacity: 0.25, side: T.DoubleSide, depthWrite: false }));
      fpMesh.renderOrder = 2;
      meshes.add(fpMesh);

      // Profile trace line as overlay.
      overlays.add(solidLine(profile3D, COLOR.fault, { depthTest: false }));

      // Compute 3D surface and detachment points for overlays.
      const surfacePt3D = dipDirVec3.clone().multiplyScalar(surfacePt.x).add(new T.Vector3(0, surfaceY - surfacePt.y, 0));
      const detachPt3D  = dipDirVec3.clone().multiplyScalar(detachPt.x).add(new T.Vector3(0, surfaceY - detachPt.y, 0));

      // Dip-at-surface and dip-at-depth overlays.
      addListricDipAnnotations(overlays, labels, evt, total, depth, surfacePt3D, detachPt3D);
    }

    // ---- Overlays for the fault: dip / throw / heave / slip / strike ----
    // Vertex of the dip angle = where the fault plane meets the surface (top centre)
    // We anchor it at origin where the plane passes through top of the block.
    // Compute the point along the fault plane at the upper edge.
    const upDip = upDipVec(dipDeg, dipDir).normalize();
    const upEdgePt = new T.Vector3(0, total / 2, 0); // top of section
    // Actually the surface trace intersects fault plane along strike, going through origin
    const vertex = new T.Vector3(0, total / 2, 0);

    const opt = model.overlayOpts || {};
    if (opt.dip !== false && !isListric) {
      addDipOverlay(overlays, labels, {
        vertex,
        strike,
        dipDeg,
        dipDir,
        radius: 0.85,
        inferred: {
          dip: evt.field_origin?.dip === 'inferred',
          strike: evt.field_origin?.strike === 'inferred',
          dipDir: evt.field_origin?.dip_direction === 'inferred',
        },
      });
    }

    // ---- Throw / Heave reconstruction ----
    if ((subtype === 'normal' || subtype === 'reverse' || subtype === 'thrust' || subtype === 'oblique') && opt.throwHeave !== false) {
      addThrowHeaveOverlay(overlays, labels, {
        slip: slipVec,
        strike, dipDeg, dipDir,
        throwV, heaveV: Math.abs(slipVec.x) + Math.abs(slipVec.z), // horizontal component magnitude
        slabs, total,
        evt,
        downSign: (subtype === 'normal' || subtype === 'listric' || subtype === 'oblique') ? -1 : 1,
      });
    }

    // ---- Strike-slip overlays ----
    if (subtype === 'strike-slip') {
      addStrikeSlipOverlay(overlays, labels, {
        slip: slipVec,
        strike, dipDir, dipDeg,
        slabs, total, evt,
      });
    }

    // Slip vector arrow (oblique especially)
    if (subtype === 'oblique' && opt.slipVector !== false) {
      const start = new T.Vector3(0, 0, 0);
      overlays.add(arrow3D(start, start.clone().add(slipVec), COLOR.overlay, { headLength: 0.12, headWidth: 0.08 }));
      const slLbl = makeValueLabel(`Slip ${slipVec.length().toFixed(2)} u`, { inferred: evt.field_origin?.displacement === 'inferred' });
      slLbl.position.copy(start.clone().add(slipVec).multiplyScalar(0.6));
      overlays.add(slLbl);
      // Decomposition: vertical (throw) + horizontal (offset) components
      const vert = new T.Vector3(0, slipVec.y, 0);
      const horiz = new T.Vector3(slipVec.x, 0, slipVec.z);
      const a = arrow3D(start, vert, 0xb693ff, { headLength: 0.08, headWidth: 0.05 });
      const b = arrow3D(vert.clone(), vert.clone().add(horiz), 0xb693ff, { headLength: 0.08, headWidth: 0.05 });
      overlays.add(a); overlays.add(b);
      const dl = makeValueLabel(`throw ${Math.abs(vert.y).toFixed(2)} u`);
      dl.position.copy(vert.clone().multiplyScalar(0.5).add(new T.Vector3(-0.1, 0, 0)));
      overlays.add(dl);
      const hl = makeValueLabel(`offset ${horiz.length().toFixed(2)} u`);
      hl.position.copy(vert.clone().add(horiz.clone().multiplyScalar(0.5)));
      overlays.add(hl);
    }

    // ---- Fault label (primary) ----
    const faultLabel = makeLabel(faultLabelHTML(evt), { html: true });
    faultLabel.position.copy(new T.Vector3(0, total / 2 + 0.4, 0));
    meshes.add(faultLabel);
    labels.push({ node: faultLabel, data: { kind: 'event', id: evt.id } });

    return { meshes, overlays, labels };
  }

  function faultLabelHTML(evt) {
    const sub = evt.subtype === 'strike-slip' ? `Strike-slip ${evt.sense || ''}` : capitalise(evt.subtype || 'Fault');
    const dipInf = evt.field_origin?.dip === 'inferred';
    const ddInf = evt.field_origin?.dip_direction === 'inferred';
    const parts = [`<span class="lbl">${sub}</span>`];
    if (evt.dip != null && evt.subtype !== 'strike-slip') {
      parts.push(`<span class="v${dipInf ? ' inferred' : ''}">${Math.round(evt.dip)}°</span>`);
    }
    if (evt.dip_direction != null && evt.subtype !== 'strike-slip') {
      parts.push(`/ <span class="v${ddInf ? ' inferred' : ''}">${fmtBearing(evt.dip_direction)}</span>`);
    }
    if (evt.subtype === 'strike-slip') {
      parts.push(`<span class="v">${fmtBearing(evt.strike || 0)}</span>`);
    }
    return parts.join(' ');
  }

  function addThrowHeaveOverlay(overlays, labels, { slip, strike, dipDeg, dipDir, slabs, total, evt, downSign }) {
    // We'll pick a marker layer (the top of the second layer from bottom) as the datum.
    if (!slabs || slabs.length < 2) return;
    const datum = slabs[Math.floor(slabs.length / 2)];
    const yDatum = datum.y1;
    // The datum trace runs along the X axis at y=yDatum, z=0.
    // On the footwall side (where x has sign opposite slip x): trace endpoint.
    // On the hanging-wall side: trace shifted by slip vector.
    const horizSign = slip.x !== 0 ? Math.sign(slip.x) : (slip.z !== 0 ? Math.sign(slip.z) : 1);
    const fwAnchor = new T.Vector3(-1.0 * horizSign, yDatum, 0); // footwall datum point near fault
    const hwAnchor = new T.Vector3(1.0 * horizSign, yDatum, 0).add(slip); // hanging wall datum point near fault
    // Reconstructed datum on both walls (dashed)
    const fwEnd = new T.Vector3(-2.3 * horizSign, yDatum, 0);
    const hwEnd = new T.Vector3(2.3 * horizSign, yDatum, 0).add(slip);
    overlays.add(dashedLine(fwAnchor, fwEnd, COLOR.dashed, { dashSize: 0.08, gapSize: 0.06 }));
    overlays.add(dashedLine(hwAnchor, hwEnd, COLOR.dashed, { dashSize: 0.08, gapSize: 0.06 }));

    // Pre-fault datum reconstruction on HW side (dashed, where it WAS before slip)
    const hwPreSlip = new T.Vector3(1.0 * horizSign, yDatum, 0);
    const hwPreEnd = new T.Vector3(2.3 * horizSign, yDatum, 0);
    overlays.add(dashedLine(hwPreSlip, hwPreEnd, 0xb693ff, { dashSize: 0.05, gapSize: 0.05 }));

    // Throw: vertical line from hwAnchor to hwPreSlip
    const throwLine = solidLine([hwAnchor, hwPreSlip], COLOR.overlay, { depthTest: false, opacity: 0.95 });
    overlays.add(throwLine);
    const throwLbl = makeValueLabel(`Throw ${Math.abs(slip.y).toFixed(2)} u`, { inferred: evt.field_origin?.throw === 'inferred' });
    throwLbl.position.copy(hwAnchor.clone().add(hwPreSlip).multiplyScalar(0.5).add(new T.Vector3(0.1 * horizSign, 0, 0)));
    overlays.add(throwLbl);

    // Heave: horizontal segment from hwPreSlip to fwAnchor along the X axis (at y=yDatum)
    const heaveMag = Math.sqrt(slip.x * slip.x + slip.z * slip.z);
    if (heaveMag > 0.05) {
      const heaveStart = new T.Vector3(fwAnchor.x, yDatum, fwAnchor.z);
      const heaveEnd = new T.Vector3(hwPreSlip.x, yDatum, hwPreSlip.z);
      const heaveLine = solidLine([heaveStart, heaveEnd], COLOR.overlay, { depthTest: false });
      overlays.add(heaveLine);
      const heaveLbl = makeValueLabel(`Heave ${heaveMag.toFixed(2)} u`, { inferred: evt.field_origin?.heave === 'inferred' });
      heaveLbl.position.copy(heaveStart.clone().add(heaveEnd).multiplyScalar(0.5).add(new T.Vector3(0, -0.15, 0)));
      overlays.add(heaveLbl);
    }
  }

  function addStrikeSlipOverlay(overlays, labels, { slip, strike, dipDir, slabs, total, evt }) {
    if (!slabs || slabs.length < 2) return;
    const datum = slabs[Math.floor(slabs.length / 2)];
    const y = datum.y1;
    // The strike-slip is vertical. We draw two parallel horizontal offset markers
    // (small Vs) on each side of the fault on the same datum.
    const planeN = planeNormal(90, dipDir).normalize();
    // Markers are points on each side along normal direction.
    const off = 1.4;
    const a = planeN.clone().multiplyScalar(off);   // footwall anchor (one side)
    const b = planeN.clone().multiplyScalar(-off);  // hanging-wall anchor
    a.y = y; b.y = y;
    // The marker shape: small arrow tick on each wall, originally pointing the same way.
    // After motion: HW side is offset along strike by `slip`.
    const tick = strikeVec(strike).normalize().multiplyScalar(0.3);
    overlays.add(solidLine([a.clone(), a.clone().add(tick)], COLOR.overlay, { depthTest: false }));
    overlays.add(solidLine([b.clone().add(slip), b.clone().add(slip).add(tick)], COLOR.overlay, { depthTest: false }));
    // Reconstructed pre-motion marker on the HW side (dashed)
    overlays.add(dashedLine(b.clone(), b.clone().add(tick), 0xb693ff, { dashSize: 0.04, gapSize: 0.04 }));
    // Offset measurement: from b's pre-motion endpoint to b's actual endpoint
    overlays.add(arrow3D(b.clone(), b.clone().add(slip), COLOR.overlay, { headLength: 0.08, headWidth: 0.05 }));
    const dispLbl = makeValueLabel(`${slip.length().toFixed(2)} u ${evt.sense || ''}`, { inferred: evt.field_origin?.displacement === 'inferred' });
    dispLbl.position.copy(b.clone().add(slip.clone().multiplyScalar(0.5)).add(new T.Vector3(0, -0.18, 0)));
    overlays.add(dispLbl);

    // Strike compass at vertex
    const vertex = new T.Vector3(0, total / 2 + 0.05, 0);
    overlays.add(compassRose(vertex, 0.55));
    const sP1 = vertex.clone().add(strikeVec(strike).multiplyScalar(1.4));
    const sP2 = vertex.clone().add(strikeVec(strike).multiplyScalar(-1.4));
    overlays.add(solidLine([sP1, sP2], COLOR.overlay, { depthTest: false }));
    const sLbl = makeValueLabel(`Strike ${fmtBearing(strike)}`, { inferred: evt.field_origin?.strike === 'inferred' });
    sLbl.position.copy(sP1.clone().add(new T.Vector3(0, 0.1, 0)));
    overlays.add(sLbl);
  }

  // ---- Circular-arc solver for listric fault geometry ----
  // Works in 2D cross-section: x = horizontal (dip direction), y = depth (positive downward).
  // Returns { points2D, surfacePt, detachPt, R, Cx, Cy }.
  function solveCircularArc(surfaceDipDeg, dipAtDepthDeg, detachDepth) {
    const sd = rad(surfaceDipDeg);
    const dd = rad(dipAtDepthDeg);

    // Centre at surface: C = (0,0) + R * normal_at_surface
    // Tangent at surface: (sin(sd), cos(sd))  [right + downward]
    // Normal toward centre (left of travel): (-cos(sd), sin(sd))
    // So C = (-R*cos(sd), R*sin(sd))
    //
    // At detachment, tangent = (sin(dd), cos(dd))
    // Normal toward centre: (-cos(dd), sin(dd))
    // P_d = C + R*(cos(dd), -sin(dd))  [centre + R*(−normal)]

    let lo = 0.001, hi = 5000;

    for (let iter = 0; iter < 80; iter++) {
      const R = (lo + hi) / 2;
      const Cx = -R * Math.cos(sd);
      const Cy =  R * Math.sin(sd);
      const Pdy = Cy - R * Math.sin(dd);
      if (Pdy < detachDepth) {
        lo = R;
      } else {
        hi = R;
      }
      if (Math.abs(Pdy - detachDepth) < 1e-6) break;
    }

    const R  = (lo + hi) / 2;
    const Cx = -R * Math.cos(sd);
    const Cy =  R * Math.sin(sd);
    const Pdx = Cx + R * Math.cos(dd);
    const Pdy = Cy - R * Math.sin(dd);

    // Arc angles: atan2(point - centre)
    const thetaStart = Math.atan2(0   - Cy, 0   - Cx);
    const thetaEnd   = Math.atan2(Pdy - Cy, Pdx - Cx);

    // Ensure we sweep in the correct direction (depth increases monotonically).
    // If the arc sweeps backward, use the complementary angle.
    let dTheta = thetaEnd - thetaStart;
    // Normalise to [-2π, 2π]
    while (dTheta >  Math.PI * 2) dTheta -= Math.PI * 2;
    while (dTheta < -Math.PI * 2) dTheta += Math.PI * 2;
    // We want the short arc going in the direction that increases y (depth).
    // Check mid-arc y: if negative dTheta gives correct depth profile, use that.
    const midTheta = thetaStart + dTheta / 2;
    const midY = Cy + R * Math.sin(midTheta);
    if (midY < 0) {
      // Mid-arc is going up — take the complementary sweep direction.
      dTheta = dTheta > 0 ? dTheta - Math.PI * 2 : dTheta + Math.PI * 2;
    }

    const N = 32;
    const points2D = [];
    for (let i = 0; i <= N; i++) {
      const theta = thetaStart + (i / N) * dTheta;
      points2D.push({ x: Cx + R * Math.cos(theta), y: Cy + R * Math.sin(theta) });
    }

    return { points2D, surfacePt: { x: 0, y: 0 }, detachPt: { x: Pdx, y: Pdy }, R, Cx, Cy };
  }

  function addListricDipAnnotations(overlays, labels, evt, total, depth, surfacePt3D, detachPt3D) {
    const surfaceDip = evt.dip;
    const deepDip = evt.dip_at_depth ?? 10;
    const dipDir = evt.dip_direction ?? 90;
    const fo = evt.field_origin || {};

    // ---- Surface dip overlay ----
    // Anchor at the surface point on the arc (top of section).
    const v1 = surfacePt3D ? surfacePt3D.clone() : new T.Vector3(0, total / 2, 0);
    // Horizontal reference disc at surface depth.
    overlays.add(horizontalDisc(v1, 0.65, COLOR.horizon, 0.08));
    // Dip arc: from horizontal down-dip direction to the down-dip vector.
    const horizDir1 = bearingVec(dipDir);
    const downDip1 = downDipVec(surfaceDip, dipDir).normalize();
    const dipArc1 = arc3D(v1, horizDir1, downDip1, 0.55, COLOR.overlay);
    overlays.add(dipArc1.line);
    overlays.add(arcWedge(v1, horizDir1, downDip1, 0.55, COLOR.overlay, 0.16));
    const dipLbl1 = makeValueLabel(`Dip ${fmtDeg(surfaceDip)}`, { inferred: fo.dip === 'inferred' });
    dipLbl1.position.copy(dipArc1.midPoint);
    overlays.add(dipLbl1);

    // ---- Dip-at-depth overlay ----
    // Anchor at the detachment point (bottom of arc).
    const v2 = detachPt3D ? detachPt3D.clone() : new T.Vector3(2.0 * horizDir1.x, total / 2 - (evt.detachment_depth ?? total * 1.5), 2.0 * horizDir1.z);
    // Horizontal reference disc at detachment depth.
    overlays.add(horizontalDisc(v2, 0.55, COLOR.horizon, 0.08));
    // Dip arc at depth.
    const downDip2 = downDipVec(deepDip, dipDir).normalize();
    const dipArc2 = arc3D(v2, horizDir1, downDip2, 0.45, COLOR.overlay);
    overlays.add(dipArc2.line);
    overlays.add(arcWedge(v2, horizDir1, downDip2, 0.45, COLOR.overlay, 0.18));
    const dipLbl2 = makeValueLabel(`Dip @ depth ${fmtDeg(deepDip)}`, { inferred: fo.dip_at_depth === 'inferred' });
    dipLbl2.position.copy(dipArc2.midPoint);
    overlays.add(dipLbl2);

    // ---- Vertical depth annotation ----
    // Dashed vertical line from surface to detachment.
    const v1Vert = v1.clone();
    const v2Vert = new T.Vector3(v1.x, v2.y, v1.z); // same X/Z as surface, Y at detachment
    overlays.add(dashedLine(v1Vert, v2Vert, COLOR.dashed, { dashSize: 0.07, gapSize: 0.05 }));
    overlays.add(doubleArrow(v1Vert, v2Vert, COLOR.overlay, { headLength: 0.07, headWidth: 0.045 }));
    const depthVal = detachPt3D ? parseFloat((total / 2 - detachPt3D.y).toFixed(2)) : (evt.detachment_depth ?? total * 1.5);
    const depthLbl = makeValueLabel(`Detachment depth: ${depthVal} m`, { inferred: fo.detachment_depth === 'inferred' });
    depthLbl.position.copy(v1Vert.clone().add(v2Vert).multiplyScalar(0.5).add(new T.Vector3(0.15, 0, 0)));
    overlays.add(depthLbl);
  }

  // ---- Fold scene ----
  function buildFoldScene(model) {
    const meshes = new T.Group();
    const overlays = new T.Group();
    const labels = [];

    const evt = model.events[0];
    const subtype = evt.subtype;
    const axisStrike = evt.axis_strike ?? 0;       // bearing of fold axis (hinge direction)
    const plunge = evt.plunge ?? 0;
    const plungeDir = evt.plunge_direction ?? axisStrike;
    const interlimb = evt.interlimb_angle ?? 120;
    const amplitude = evt.amplitude ?? 1.0;
    const wavelength = evt.wavelength ?? 4.0;
    const opt = model.overlayOpts || {};

    // Geometry: a band of triangulated layered surfaces curved into a fold.
    // We work in a "fold-local" frame where the fold axis is along Z and the
    // layers are stacked along Y. Bending is in the X-Y plane.
    //
    // Then rotate the entire group so that the axis aligns with `plungeDir`
    // bearing, plunged by `plunge`.
    const width = 5.0;   // X extent (across limbs)
    const length = 5.0;  // Z extent (along axis)
    const segs = 40;
    const total = model.layers.reduce((s, L) => s + L.thickness, 0);

    // Tightness of bend: at interlimb=180 (flat) -> 0 bend; at interlimb=0 (closed) -> max
    // Sign: anticline=+ amplitude (up), syncline=- amplitude (down), monocline=step
    const sign = subtype === 'syncline' ? -1 : 1;

    // Pre-compute height function h(x): height of fold crest above flat reference.
    function foldHeight(x) {
      if (subtype === 'monocline') {
        const w = evt.flexure_width ?? 1.2;
        const h = evt.step_height ?? 0.8;
        // smooth-step from -w/2 to +w/2
        if (x <= -w / 2) return 0;
        if (x >= w / 2) return -h;
        const t = (x + w / 2) / w;
        const s = t * t * (3 - 2 * t); // smoothstep
        return -h * s;
      }
      // Anticline / syncline: cosine
      const lambda = wavelength;
      const A = amplitude * sign;
      return A * Math.cos((Math.PI * x) / (lambda / 2));
    }

    // Build per-layer mesh.
    let y = -total / 2;
    const palette = window.GD.LITHOLOGY;
    const layerYs = [];
    for (const L of model.layers) {
      const t = L.thickness;
      layerYs.push({ y0: y, y1: y + t, L, t });
      y += t;
    }

    // For each layer slab, build a top surface + bottom surface mesh, then sides.
    for (const slab of layerYs) {
      const verts = [];
      const idx = [];
      // We tessellate: nx segments across width, nz along axis
      const nx = segs, nz = 14;
      // Compute top + bottom surfaces.
      const tops = [];
      const bots = [];
      for (let iz = 0; iz <= nz; iz++) {
        const z = (iz / nz - 0.5) * length;
        const topRow = [];
        const botRow = [];
        for (let ix = 0; ix <= nx; ix++) {
          const x = (ix / nx - 0.5) * width;
          const h = foldHeight(x);
          topRow.push(new T.Vector3(x, slab.y1 + h, z));
          botRow.push(new T.Vector3(x, slab.y0 + h, z));
        }
        tops.push(topRow);
        bots.push(botRow);
      }

      // Build geometry for top surface
      const litho = palette[slab.L.lithology] || { color: '#888' };
      const color = slab.L.color || litho.color || '#888';
      const mat = new T.MeshStandardMaterial({ color: new T.Color(color), roughness: 0.92, metalness: 0.02, side: T.DoubleSide, flatShading: false });

      function addQuad(p0, p1, p2, p3, out) {
        const i = out.length / 3;
        out.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
        return i;
      }
      function addSurface(grid) {
        const positions = [];
        for (let iz = 0; iz < nz; iz++) {
          for (let ix = 0; ix < nx; ix++) {
            const p0 = grid[iz][ix];
            const p1 = grid[iz][ix + 1];
            const p2 = grid[iz + 1][ix];
            const p3 = grid[iz + 1][ix + 1];
            positions.push(
              p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z,
              p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z,
            );
          }
        }
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
        g.computeVertexNormals();
        return new T.Mesh(g, mat);
      }
      meshes.add(addSurface(tops));
      meshes.add(addSurface(bots));

      // Add 4 side strips (front/back/left/right)
      function addStrip(rowA, rowB) {
        const positions = [];
        for (let i = 0; i < rowA.length - 1; i++) {
          const p0 = rowA[i], p1 = rowA[i + 1];
          const p2 = rowB[i], p3 = rowB[i + 1];
          positions.push(
            p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z,
            p1.x, p1.y, p1.z, p3.x, p3.y, p3.z, p2.x, p2.y, p2.z,
          );
        }
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
        g.computeVertexNormals();
        return new T.Mesh(g, mat);
      }
      meshes.add(addStrip(tops[0], bots[0]));
      meshes.add(addStrip(tops[nz], bots[nz]));
      // left & right edges: x= -w/2 and +w/2
      const leftTop = tops.map((row) => row[0]);
      const leftBot = bots.map((row) => row[0]);
      const rightTop = tops.map((row) => row[nx]);
      const rightBot = bots.map((row) => row[nx]);
      meshes.add(addStrip(leftTop, leftBot));
      meshes.add(addStrip(rightTop, rightBot));
    }

    // ---- Apply plunge: rotate entire group so axis points along plungeDir bearing with given plunge angle.
    // The fold axis in local frame is along +Z. We want it to point along the
    // bearing-direction tilted down by `plunge` from horizontal.
    // Build target axis vector then rotate group's +Z to match.
    const axisLocal = new T.Vector3(0, 0, 1);
    const bearing = bearingVec(plungeDir);
    const axisTarget = new T.Vector3(
      bearing.x * Math.cos(rad(plunge)),
      -Math.sin(rad(plunge)),
      bearing.z * Math.cos(rad(plunge)),
    ).normalize();
    const q = new T.Quaternion().setFromUnitVectors(axisLocal, axisTarget);
    meshes.applyQuaternion(q);
    overlays.applyQuaternion(q); // overlays we add BEFORE this will rotate too — careful

    // We'll add overlays *after* this rotation in world coords for fold features.

    // ---- Overlays ----
    if (opt.hinge !== false || opt.axial !== false || opt.interlimb !== false) {
      // Hinge line: along the axisTarget direction, length ~1.4 wavelength.
      const hingeStart = axisTarget.clone().multiplyScalar(-length / 2 * 0.9);
      const hingeEnd = axisTarget.clone().multiplyScalar(length / 2 * 0.9);
      // Y-position of hinge: crest height at x=0 in local frame is foldHeight(0)
      const crestY = foldHeight(0);
      // After rotation, the local point (0, total/2 + crestY, z) maps to:
      const hingeOffsetLocal = new T.Vector3(0, total / 2 + crestY + 0.02, 0);
      const hingeOffsetWorld = hingeOffsetLocal.clone().applyQuaternion(q);

      const h1 = hingeStart.clone().add(hingeOffsetWorld);
      const h2 = hingeEnd.clone().add(hingeOffsetWorld);
      const hingeLine = solidLine([h1, h2], COLOR.hinge, { depthTest: false, opacity: 0.95 });
      overlays.add(hingeLine);
      const hingeLbl = makeValueLabel('hinge line', { muted: true });
      hingeLbl.position.copy(h2.clone().add(new T.Vector3(0.1, 0.1, 0)));
      overlays.add(hingeLbl);
    }

    if (opt.axial !== false && subtype !== 'monocline') {
      // Axial plane: vertical plane through hinge containing axisTarget.
      // Local axial plane is YZ plane (x=0). We render as a translucent quad.
      const axialW = total + 0.6;
      const axialL = length * 0.9;
      const aGeo = new T.PlaneGeometry(axialW, axialL);
      // PlaneGeometry is in XY plane facing +Z by default; we want it in YZ plane (normal=X).
      aGeo.rotateY(Math.PI / 2); // now normal is +X, plane is YZ
      const aMesh = new T.Mesh(aGeo, new T.MeshBasicMaterial({ color: COLOR.axial, transparent: true, opacity: 0.18, side: T.DoubleSide, depthWrite: false }));
      aMesh.applyQuaternion(q);
      meshes.add(aMesh);
      // Edges
      const axialEdges = new T.EdgesGeometry(aGeo);
      const aEdge = new T.LineSegments(axialEdges, new T.LineBasicMaterial({ color: COLOR.axial, transparent: true, opacity: 0.6 }));
      aEdge.applyQuaternion(q);
      meshes.add(aEdge);
    }

    if (opt.interlimb !== false && subtype !== 'monocline') {
      // Interlimb angle: at the hinge crest, the two limbs slope away.
      // Slope dθ/dx at x=±wavelength/4 approximately.
      const A = amplitude * sign;
      const lambda = wavelength;
      // dh/dx = -A * (π / (λ/2)) * sin(π x / (λ/2)). Sample at x=±λ/4.
      const xs = lambda / 4;
      const slope = -A * (Math.PI / (lambda / 2)) * Math.sin((Math.PI * xs) / (lambda / 2));
      // Left limb direction (pointing into the limb, away from hinge): (-x, slopeAtLeft, 0).
      const slopeLeft = -A * (Math.PI / (lambda / 2)) * Math.sin((Math.PI * -xs) / (lambda / 2));
      const limbL = new T.Vector3(-1, slopeLeft, 0).normalize();
      const limbR = new T.Vector3(1, slope, 0).normalize();
      // Vertex at hinge in local frame:
      const vertexLocal = new T.Vector3(0, total / 2 + foldHeight(0) + 0.02, 0);
      const vertex = vertexLocal.clone().applyQuaternion(q);
      const limbLw = limbL.clone().applyQuaternion(q);
      const limbRw = limbR.clone().applyQuaternion(q);
      const arc = arc3D(vertex, limbLw, limbRw, 0.7, COLOR.overlay);
      overlays.add(arc.line);
      overlays.add(arcWedge(vertex, limbLw, limbRw, 0.7, COLOR.overlay, 0.18));
      const interlimbActual = deg(Math.acos(Math.max(-1, Math.min(1, limbL.dot(limbR)))));
      const ilbl = makeValueLabel(`Interlimb ${fmtDeg(interlimbActual)}`, { inferred: evt.field_origin?.interlimb_angle === 'inferred' });
      ilbl.position.copy(arc.midPoint);
      overlays.add(ilbl);
    }

    if (opt.plunge !== false && plunge > 0.01 && subtype !== 'monocline') {
      // Plunge: hinge line tilted from horizontal by plunge angle. Show horizontal projection.
      const v = new T.Vector3(0, total / 2 + foldHeight(0) + 0.02, 0).applyQuaternion(q);
      const horizProj = new T.Vector3(bearing.x, 0, bearing.z).normalize().multiplyScalar(1.2);
      const tilted = axisTarget.clone().multiplyScalar(1.2);
      const projEnd = v.clone().add(horizProj);
      const tiltedEnd = v.clone().add(tilted);
      overlays.add(horizontalDisc(v, 0.6, COLOR.horizon, 0.08));
      overlays.add(compassRose(v, 0.5));
      overlays.add(arrow3D(v, projEnd, COLOR.overlay, { headLength: 0.08, headWidth: 0.05 }));
      overlays.add(arrow3D(v, tiltedEnd, COLOR.overlay, { headLength: 0.08, headWidth: 0.05 }));
      const arc = arc3D(v, horizProj.clone().normalize(), tilted.clone().normalize(), 0.65, COLOR.overlay);
      overlays.add(arc.line);
      overlays.add(arcWedge(v, horizProj.clone().normalize(), tilted.clone().normalize(), 0.65, COLOR.overlay, 0.18));
      const plLbl = makeValueLabel(`Plunge ${fmtDeg(plunge)} → ${fmtBearing(plungeDir)}`, { inferred: evt.field_origin?.plunge === 'inferred' });
      plLbl.position.copy(arc.midPoint);
      overlays.add(plLbl);
    }

    // Monocline: flexure dip annotation
    if (subtype === 'monocline') {
      const dipDeg = evt.flexure_dip ?? 30;
      const dipDir = ((axisStrike + 90) % 360);
      const v = new T.Vector3(0, total / 2 + foldHeight(0) + 0.02, 0).applyQuaternion(q);
      addDipOverlay(overlays, labels, {
        vertex: v, strike: axisStrike, dipDeg, dipDir, radius: 0.85,
        inferred: { dip: evt.field_origin?.flexure_dip === 'inferred' },
      });
      const w = evt.flexure_width ?? 1.2;
      // width annotation along x-axis at base
      const a = new T.Vector3(-w / 2, total / 2 + foldHeight(-w / 2), 0).applyQuaternion(q);
      const b = new T.Vector3(w / 2, total / 2 + foldHeight(w / 2), 0).applyQuaternion(q);
      overlays.add(doubleArrow(a, b, COLOR.overlay, { headLength: 0.06, headWidth: 0.04 }));
      const wL = makeValueLabel(`Flexure ${w.toFixed(2)} u`, { inferred: evt.field_origin?.flexure_width === 'inferred' });
      wL.position.copy(a.clone().add(b).multiplyScalar(0.5).add(new T.Vector3(0, 0.15, 0)));
      overlays.add(wL);
    }

    // Fold label
    const foldLabel = makeLabel(`${capitalise(subtype)} · ${fmtDeg(plunge)} → ${fmtBearing(plungeDir)}`);
    foldLabel.position.copy(new T.Vector3(0, total / 2 + amplitude + 0.45, 0));
    meshes.add(foldLabel);
    labels.push({ node: foldLabel, data: { kind: 'event', id: evt.id } });

    return { meshes, overlays, labels };
  }

  // ---- Intrusion geometry builder ----
  // Returns { meshes, overlays, labels } for one intrusion.
  function buildIntrusionGeometry(intrusion, model) {
    const meshes = new T.Group();
    const overlays = new T.Group();
    const labels = [];

    const totalHeight = (model.layers || []).reduce((s, L) => s + (L.thickness ?? 1.0), 0) || 3;
    const halfH = totalHeight / 2;

    // Rock type color
    const col = (window.GD.LITHOLOGY[intrusion.rock_type] || {}).color || '#CC8899';
    const rockColor = new T.Color(col);

    const subtype = intrusion.subtype;

    if (subtype === 'dyke') {
      // Thin vertical plane cutting through the layer stack at the given strike.
      const geo = new T.BoxGeometry(2 * totalHeight, totalHeight, intrusion.thickness || 0.5);
      const mat = new T.MeshLambertMaterial({
        color: rockColor,
        transparent: true,
        opacity: 0.85,
        side: T.DoubleSide,
      });
      const mesh = new T.Mesh(geo, mat);
      mesh.position.y = 0;
      // Strike is angle from north; three.js Y rotation is opposite convention
      mesh.rotation.y = -rad(intrusion.strike || 0);
      meshes.add(mesh);

    } else if (subtype === 'sill') {
      // Thin horizontal plane between layers (at mid-stack by default).
      const geo = new T.BoxGeometry(2 * totalHeight, intrusion.thickness || 0.3, 2 * totalHeight);
      const mat = new T.MeshLambertMaterial({
        color: rockColor,
        transparent: true,
        opacity: 0.8,
        side: T.DoubleSide,
      });
      const mesh = new T.Mesh(geo, mat);
      mesh.position.y = 0;
      meshes.add(mesh);

    } else if (subtype === 'batholith') {
      // Large rounded dome at the base of the section (lower hemisphere only).
      const geo = new T.SphereGeometry(totalHeight * 0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const mat = new T.MeshLambertMaterial({
        color: rockColor,
        transparent: true,
        opacity: 0.75,
        side: T.DoubleSide,
      });
      const mesh = new T.Mesh(geo, mat);
      mesh.position.y = -halfH;
      meshes.add(mesh);

    } else if (subtype === 'laccolith') {
      // Dome shape at emplacement depth, pushing layers up.
      const geo = new T.SphereGeometry(totalHeight * 0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const mat = new T.MeshLambertMaterial({
        color: rockColor,
        transparent: true,
        opacity: 0.75,
        side: T.DoubleSide,
      });
      const mesh = new T.Mesh(geo, mat);
      mesh.position.y = halfH - (intrusion.depth ?? halfH);
      meshes.add(mesh);
    }

    // ---- Measurement-origin overlays ----
    if (subtype === 'dyke') {
      const topPt = new T.Vector3(0, halfH, 0);
      const fo = intrusion.field_origin || {};

      // Strike line: short horizontal line in the strike direction
      const sv = strikeVec(intrusion.strike || 0).multiplyScalar(0.7);
      const strikeLine = solidLine([topPt.clone().sub(sv), topPt.clone().add(sv)], COLOR.overlay);
      overlays.add(strikeLine);

      // Dip arc: since dykes are ~90°, draw a short arc from horizontal to vertical
      const horizDir = bearingVec((intrusion.strike || 0) + 90);
      const vertDir = new T.Vector3(0, 1, 0);
      const dipArc = arc3D(topPt, horizDir, vertDir, 0.5, COLOR.overlay);
      overlays.add(dipArc.line);
      const dipLbl = makeValueLabel(`${intrusion.dip ?? 90}°`, { inferred: fo.dip === 'inferred' });
      dipLbl.position.copy(dipArc.midPoint).addScalar(0.1);
      overlays.add(dipLbl);

      // Thickness label: double arrow across the dyke width
      const perpDir = bearingVec(intrusion.strike || 0);
      const halfT = (intrusion.thickness || 0.5) / 2;
      const from = new T.Vector3(0, 0, 0).sub(perpDir.clone().multiplyScalar(halfT));
      const to = new T.Vector3(0, 0, 0).add(perpDir.clone().multiplyScalar(halfT));
      const thkArrow = doubleArrow(from, to, COLOR.overlay);
      overlays.add(thkArrow);
      const thkLbl = makeValueLabel(`${(intrusion.thickness || 0.5).toFixed(1)} u`, { inferred: fo.thickness === 'inferred' });
      thkLbl.position.set(0, 0.15, 0);
      overlays.add(thkLbl);

      // Feature label
      const lbl = makeLabel(`Dyke (${intrusion.rock_type || 'basalt'})`);
      lbl.position.set(0, halfH + 0.25, 0);
      overlays.add(lbl);

    } else if (subtype === 'sill') {
      const sillY = 0; // mesh position.y
      const fo = intrusion.field_origin || {};

      // Thickness label
      const thkArrow = doubleArrow(
        new T.Vector3(halfH + 0.3, sillY - (intrusion.thickness || 0.3) / 2, 0),
        new T.Vector3(halfH + 0.3, sillY + (intrusion.thickness || 0.3) / 2, 0),
        COLOR.overlay
      );
      overlays.add(thkArrow);
      const thkLbl = makeValueLabel(`${(intrusion.thickness || 0.3).toFixed(1)} u`, { inferred: fo.thickness === 'inferred' });
      thkLbl.position.set(halfH + 0.55, sillY, 0);
      overlays.add(thkLbl);

      // Feature label
      const lbl = makeLabel(`Sill (${intrusion.rock_type || 'basalt'})`);
      lbl.position.set(0, sillY + 0.25, 0);
      overlays.add(lbl);

    } else if (subtype === 'batholith') {
      const domeTopY = -halfH + totalHeight * 0.8;
      const fo = intrusion.field_origin || {};

      // Depth label: dashed line from surface to dome top
      const surfaceY = halfH;
      const depthLine = dashedLine(
        new T.Vector3(halfH * 0.8, surfaceY, 0),
        new T.Vector3(halfH * 0.8, domeTopY, 0),
        COLOR.overlay
      );
      overlays.add(depthLine);
      const depthLbl = makeValueLabel(`depth ${(intrusion.depth ?? totalHeight).toFixed(1)} u`, { inferred: fo.depth === 'inferred' });
      depthLbl.position.set(halfH * 0.8 + 0.15, (surfaceY + domeTopY) / 2, 0);
      overlays.add(depthLbl);

      // Feature label
      const lbl = makeLabel(`Batholith (${intrusion.rock_type || 'granite'})`);
      lbl.position.set(0, domeTopY - 0.3, 0);
      overlays.add(lbl);

    } else if (subtype === 'laccolith') {
      const laccY = halfH - (intrusion.depth ?? halfH);
      const laccRadius = totalHeight * 0.5;
      const fo = intrusion.field_origin || {};

      // Depth label: dashed line from surface to dome top
      const surfaceY = halfH;
      const depthLine = dashedLine(
        new T.Vector3(laccRadius + 0.3, surfaceY, 0),
        new T.Vector3(laccRadius + 0.3, laccY + laccRadius, 0),
        COLOR.overlay
      );
      overlays.add(depthLine);
      const depthLbl = makeValueLabel(`depth ${(intrusion.depth ?? halfH).toFixed(1)} u`, { inferred: fo.depth === 'inferred' });
      depthLbl.position.set(laccRadius + 0.5, (surfaceY + laccY + laccRadius) / 2, 0);
      overlays.add(depthLbl);

      // Feature label
      const lbl = makeLabel(`Laccolith (${intrusion.rock_type || 'granite'})`);
      lbl.position.set(0, laccY + laccRadius + 0.2, 0);
      overlays.add(lbl);
    }

    return { meshes, overlays, labels };
  }

  // ---- Unconformity renderer ----
  // Returns { meshes, overlays, labels } for a single unconformity entry.
  // The wavy line is drawn at the erosion contact between below_layer_id (top) and
  // above_layer_id (bottom of above group), i.e. at the top surface of the 'below' layer.
  // Layer stacking matches buildLayersOnly: y = -totalHeight/2 at base, ascending by order.
  function buildUnconformityGeometry(unconformity, model) {
    const meshes = new T.Group();
    const overlays = new T.Group();

    // Sort layers by order ascending (bottom = 0, top = N)
    const sorted = [...(model.layers || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const totalHeight = sorted.reduce((s, L) => s + (L.thickness ?? 1.0), 0) || 3;

    // Find the contact Y: top of the 'below' layer.
    // Layers are centred on origin: base starts at -totalHeight/2.
    let contactY = 0;
    let cumY = -totalHeight / 2;
    let found = false;
    for (const L of sorted) {
      cumY += L.thickness ?? 1.0;
      if (L.id === unconformity.below_layer_id) {
        contactY = cumY; // top of the 'below' layer in scene coords
        found = true;
        break;
      }
    }
    // Fallback: if IDs don't match, use midpoint
    if (!found) contactY = 0;

    // Draw the wavy line across the full scene width
    const halfW = 2.1; // matches fixed block half-width in layerBlock
    const N = 24;
    const amplitude = 0.08;
    const frequency = 4;
    const wavePoints = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = (t - 0.5) * halfW * 2;
      const yWave = contactY + Math.sin(t * Math.PI * 2 * frequency) * amplitude;
      wavePoints.push(new T.Vector3(x, yWave, 0));
    }
    const waveLine = solidLine(wavePoints, 0xFFAA00, { linewidth: 2 });
    meshes.add(waveLine);

    // For angular subtype: add a second parallel faint line to suggest the angular cut
    if (unconformity.subtype === 'angular') {
      const wavePoints2 = wavePoints.map(p => new T.Vector3(p.x, p.y + 0.04, 0));
      const waveLine2 = solidLine(wavePoints2, 0xFFAA00, { linewidth: 1, opacity: 0.4, transparent: true });
      meshes.add(waveLine2);
    }

    // ---- Overlays ----
    const fo = unconformity.field_origin || {};
    const timeGap = unconformity.time_gap_ma ?? 10;

    // Time gap label — right end of wavy line, slightly above
    const timeLbl = makeValueLabel(
      `~${timeGap} Ma gap`,
      { inferred: fo.time_gap_ma === 'inferred' }
    );
    timeLbl.position.set(2.1, contactY + 0.15, 0);
    overlays.add(timeLbl);

    // Unconformity type label — left end of wavy line, slightly above
    const typeLbl = makeLabel(
      unconformity.subtype === 'angular' ? 'Angular Unconformity'
      : unconformity.subtype === 'nonconformity' ? 'Nonconformity'
      : 'Disconformity'
    );
    typeLbl.position.set(-2.1, contactY + 0.15, 0);
    overlays.add(typeLbl);

    // Angular subtype: discordance arc showing the angle between upper and lower beds
    if (unconformity.subtype === 'angular') {
      const discordance = Math.max(1, unconformity.angular_discordance ?? 30);
      const centre = new T.Vector3(-1.5, contactY, 0);
      const dipRad = rad(discordance);
      // Upper beds are horizontal; lower beds dip at discordance degrees
      const discordanceFromDir = new T.Vector3(1, 0, 0);
      const discordanceToDir = new T.Vector3(Math.cos(-dipRad), Math.sin(-dipRad), 0).normalize();

      const discArc = arc3D(centre, discordanceFromDir, discordanceToDir, 0.4, 0xFFAA00);
      overlays.add(discArc.line);

      // Discordance angle label at the arc midpoint
      const discLbl = makeValueLabel(`${discordance}°`, { inferred: fo.angular_discordance === 'inferred' });
      discLbl.position.copy(discArc.midPoint);
      overlays.add(discLbl);
    }

    return { meshes, overlays, labels: [] };
  }

  function buildMineralisationGeometry(M, model) {
    const meshes   = new T.Group();
    const overlays = new T.Group();
    const labels   = [];

    const totalHeight = (model.layers || []).reduce((s, L) => s + (L.thickness ?? 1.0), 0) || 3;
    const halfH = totalHeight / 2;

    // Ore body centre Y position (depth_top measured from surface = +halfH down)
    const depthTop = M.depth_top != null ? M.depth_top : halfH * 0.6;
    const oreY = halfH - depthTop - (M.alteration_radius || 0.5);

    switch (M.subtype) {

      case 'porphyry': {
        // Four concentric transparent ellipsoidal shells:
        // propylitic (outer) → argillic → phyllic → potassic (inner core)
        const R = M.alteration_radius || 1.0;
        const zones = [
          { f: 1.00, color: COLOR.minPropyl,  op: 0.10 },
          { f: 0.70, color: COLOR.minArgillic,op: 0.15 },
          { f: 0.45, color: COLOR.minPhyllic, op: 0.20 },
          { f: 0.25, color: COLOR.minCore,    op: 0.35 },
        ];
        zones.forEach(({ f, color, op }) => {
          const geo = new T.SphereGeometry(R * f, 16, 12);
          const mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: op, side: T.DoubleSide, depthWrite: false });
          const mesh = new T.Mesh(geo, mat);
          mesh.scale.y = 1.4; // elongate vertically to represent plunge
          mesh.position.set(0, oreY, 0);
          meshes.add(mesh);
        });
        break;
      }

      case 'orogenic_gold': {
        // 3 thin parallel vein planes along strike/dip of structural control (or default N-S vertical)
        const R = M.alteration_radius || 0.3;
        let strike = 0, dip = 70;
        // If structural_control_event_id is set, try to match a fault/fold
        if (M.structural_control_event_id) {
          const ctrl = (model.events || []).find(e => e.id === M.structural_control_event_id);
          if (ctrl) { strike = ctrl.strike ?? ctrl.axis_strike ?? 0; dip = ctrl.dip ?? 70; }
        }
        // Build vein planes as thin boxes rotated to strike/dip
        const veinSpacing = 0.18;
        for (let i = -1; i <= 1; i++) {
          const geo = new T.BoxGeometry(0.04, totalHeight * 0.6, R * 2.5);
          const mat = new T.MeshBasicMaterial({ color: COLOR.minVein, transparent: true, opacity: 0.30, side: T.DoubleSide, depthWrite: false });
          const mesh = new T.Mesh(geo, mat);
          const dipR = rad(dip), stkR = rad(strike);
          mesh.rotation.y = -stkR;
          mesh.rotation.z = -(Math.PI / 2 - dipR);
          mesh.position.set(i * veinSpacing, oreY, 0);
          meshes.add(mesh);
        }
        break;
      }

      case 'vms': {
        // Lens-shaped (flattened sphere) massive sulphide body near the base of the stack
        const R = M.alteration_radius || 0.5;
        const geo = new T.SphereGeometry(R, 16, 12);
        const mat = new T.MeshBasicMaterial({ color: COLOR.minVMS, transparent: true, opacity: 0.40, side: T.DoubleSide, depthWrite: false });
        const mesh = new T.Mesh(geo, mat);
        mesh.scale.y = 0.35; // flatten into a lens
        mesh.position.set(0, -halfH + R * 0.35, 0); // near base of stack
        meshes.add(mesh);
        // Alteration (chlorite) halo
        const haloGeo = new T.SphereGeometry(R * 1.5, 16, 12);
        const haloMat = new T.MeshBasicMaterial({ color: 0x3c6e3c, transparent: true, opacity: 0.10, side: T.DoubleSide, depthWrite: false });
        const halo = new T.Mesh(haloGeo, haloMat);
        halo.scale.y = 0.5;
        halo.position.set(0, -halfH + R * 0.35, 0);
        meshes.add(halo);
        break;
      }

      case 'skarn': {
        // Irregular calc-silicate zone at a contact, rendered as a thick wedge/ellipsoid
        const R = M.alteration_radius || 0.4;
        const geo = new T.SphereGeometry(R, 12, 10);
        const mat = new T.MeshBasicMaterial({ color: COLOR.minSkarn, transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false });
        const mesh = new T.Mesh(geo, mat);
        mesh.scale.set(1.5, 0.6, 0.8); // flatten and widen to represent contact zone
        mesh.position.set(0.8, oreY, 0); // offset from centre toward the intrusion contact
        meshes.add(mesh);
        break;
      }

      case 'epithermal': {
        // Shallow sub-vertical vein set in upper third of section
        const R = M.alteration_radius || 0.5;
        const veinH = totalHeight * 0.4;
        for (let i = 0; i < 3; i++) {
          const geo = new T.BoxGeometry(0.05, veinH, R * 1.2);
          const mat = new T.MeshBasicMaterial({ color: COLOR.minEpi, transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false });
          const mesh = new T.Mesh(geo, mat);
          mesh.position.set((i - 1) * 0.3, halfH * 0.55, 0); // upper portion of section
          mesh.rotation.y = rad(10 * (i - 1)); // slight spread
          meshes.add(mesh);
        }
        break;
      }

      default:
        break;
    }

    // Grade and metals annotation
    if (M.grade != null) {
      const isGoldType = (M.subtype === 'orogenic_gold' || M.subtype === 'epithermal');
      const unit = isGoldType ? ' g/t' : '%';
      const gradeLbl = makeValueLabel(`Grade: ${M.grade}${unit}`, { inferred: M.field_origin?.grade === 'inferred' });
      gradeLbl.position.set(0, oreY - (M.alteration_radius || 0.5) - 0.22, 0);
      overlays.add(gradeLbl);
    }

    if (M.subtype === 'porphyry') {
      const R = M.alteration_radius || 1.0;
      const zoneBoundaries = [
        { f: 1.00, name: 'Propylitic',     color: COLOR.minPropyl },
        { f: 0.70, name: 'Argillic',       color: COLOR.minArgillic },
        { f: 0.45, name: 'Phyllic',        color: COLOR.minPhyllic },
        { f: 0.25, name: 'Potassic (ore)', color: COLOR.minCore },
      ];
      zoneBoundaries.forEach(function({ f, name, color }) {
        overlays.add(horizontalDisc(new T.Vector3(0, oreY, 0), R * f, color, 0.18));
        const zLbl = makeValueLabel(name, { inferred: false });
        zLbl.position.set(R * f + 0.12, oreY, 0);
        overlays.add(zLbl);
      });
    }

    if (M.subtype === 'orogenic_gold') {
      const R = M.alteration_radius || 0.3;
      const envHalfH = totalHeight * 0.3;
      const corners = [
        new T.Vector3(-R, oreY + envHalfH, 0),
        new T.Vector3( R, oreY + envHalfH, 0),
        new T.Vector3( R, oreY - envHalfH, 0),
        new T.Vector3(-R, oreY - envHalfH, 0),
        new T.Vector3(-R, oreY + envHalfH, 0),
      ];
      for (let ci = 0; ci < corners.length - 1; ci++) {
        overlays.add(dashedLine(corners[ci], corners[ci + 1], COLOR.minVein));
      }
      const envLbl = makeValueLabel('Ore envelope', { inferred: false });
      envLbl.position.set(R + 0.12, oreY, 0);
      overlays.add(envLbl);
    }

    if (M.subtype === 'vms') {
      const R = M.alteration_radius || 0.5;
      const lensY = -halfH + R * 0.35;
      overlays.add(horizontalDisc(new T.Vector3(0, lensY, 0), R, COLOR.minVMS, 0.22));
      const lensLbl = makeValueLabel('VMS lens', { inferred: false });
      lensLbl.position.set(R + 0.12, lensY, 0);
      overlays.add(lensLbl);
      overlays.add(horizontalDisc(new T.Vector3(0, lensY, 0), R * 1.5, 0x3c6e3c, 0.12));
      const chlorLbl = makeValueLabel('Chlorite halo', { inferred: false });
      chlorLbl.position.set(R * 1.5 + 0.12, lensY, 0);
      overlays.add(chlorLbl);
    }

    if (M.subtype === 'skarn') {
      const R = M.alteration_radius || 0.4;
      overlays.add(horizontalDisc(new T.Vector3(0.8, oreY, 0), R * 1.4, COLOR.minSkarn, 0.20));
      const skLbl = makeValueLabel('Skarn contact zone', { inferred: false });
      skLbl.position.set(0.8 + R * 1.4 + 0.12, oreY, 0);
      overlays.add(skLbl);
    }

    if (M.subtype === 'epithermal') {
      const R = M.alteration_radius || 0.5;
      const boilingY = halfH * 0.3;
      overlays.add(horizontalDisc(new T.Vector3(0, boilingY, 0), R + 0.5, COLOR.minEpi, 0.14));
      const boilLbl = makeValueLabel('Paleo-boiling zone', { inferred: true });
      boilLbl.position.set(R + 0.62, boilingY, 0);
      overlays.add(boilLbl);
    }

    // Feature label
    const lbl = makeLabel(`${capitalise(M.subtype)} — ${M.metals || ''}`, { center: true });
    lbl.position.set(0, oreY + (M.alteration_radius || 0.5) + 0.25, 0);
    labels.push(lbl);

    return { meshes, overlays, labels };
  }

  // ---- Hydrothermal five-elements annotation (7.3) ----
  function addHydrothermalAnnotation(M, model, overlays, labels) {
    const fe = M.five_elements;
    if (!fe) return;

    const totalHeight = (model.layers || []).reduce((s, L) => s + (L.thickness ?? 1.0), 0) || 3;
    const halfH = totalHeight / 2;

    // Ore body centre Y (same logic as buildMineralisationGeometry)
    const depthTop = M.depth_top != null ? M.depth_top : halfH * 0.6;
    const oreY = halfH - depthTop - (M.alteration_radius || 0.5);

    const elements = [
      { key: 'heat_source',   symbol: '♨', label: 'Heat source' },
      { key: 'fluid_source',  symbol: '💧', label: 'Fluid source' },
      { key: 'metal_source',  symbol: '⛏', label: 'Metal source' },
      { key: 'pathway',       symbol: '→', label: 'Pathway' },
      { key: 'trap',          symbol: '⬡', label: 'Trap' },
    ];

    const spacing = 0.42;
    const xBase = (M.alteration_radius || 0.5) + 1.0; // offset right of the deposit

    elements.forEach(function({ key, symbol, label }, idx) {
      const val = fe[key];
      if (!val) return; // skip empty strings

      const y = oreY + (2 - idx) * spacing; // spread vertically around ore body

      // Small pointing arrow from xBase toward the deposit
      const from = new T.Vector3(xBase + 0.4, y, 0);
      const to   = new T.Vector3(xBase,       y, 0);
      const arrowLine = arrow3D(from, to, 0x67e8f9, { headLength: 0.12, headWidth: 0.07, depthTest: false });
      overlays.add(arrowLine);

      // Label: "Symbol Label: value"
      const lbl = makeLabel(`${symbol} ${label}: ${val}`, { center: false });
      lbl.position.set(xBase + 0.48, y, 0);
      overlays.add(lbl);
    });
  }

  // ---- Master dispatcher ----
  function buildSceneContents(model, opts = {}) {
    const root = new T.Group();
    const overlays = new T.Group();
    const labels = [];
    // overlayUpdateMap: keyed "featureId:fieldName" -> (newValue) -> void
    // Update functions mutate overlay geometry in place without triggering a full rebuild.
    const overlayUpdateMap = {};

    if (!model || !model.layers || model.layers.length === 0) {
      return { root, overlays, labels, overlayUpdateMap, bounds: new T.Box3(new T.Vector3(-1,-1,-1), new T.Vector3(1,1,1)) };
    }

    // Decide which builder to use based on event types
    const firstEvent = (model.events || [])[0];
    let res;
    if (!firstEvent) {
      res = buildLayersOnly(model);
    } else if (firstEvent.type === 'fault') {
      res = buildFaultScene(model);
    } else if (firstEvent.type === 'fold') {
      res = buildFoldScene(model);
    } else {
      res = buildLayersOnly(model);
    }
    root.add(res.meshes);
    overlays.add(res.overlays);
    labels.push(...res.labels);

    // Build overlay update functions for the first event (if any).
    // These let the drag controller co-update overlays without a full scene rebuild.
    if (firstEvent && firstEvent.id) {
      const evtId = firstEvent.id;
      const evtOverlays = res.overlays; // THREE.Group holding the built overlays

      if (firstEvent.type === 'fault') {
        const strike = firstEvent.strike ?? 0;
        const dipDeg = firstEvent.dip ?? 60;
        const dipDir = firstEvent.dip_direction ?? 90;
        const total = model.layers.reduce((s, L) => s + L.thickness, 0);
        const vertex = new T.Vector3(0, total / 2, 0);
        const radius = 0.85;

        // Helper: find (or create) a tagged sub-group inside a group.
        function getTagGroup(parent, tag) {
          for (const c of parent.children) {
            if (c.userData && c.userData.overlayTag === tag) return c;
          }
          const g = new T.Group();
          g.userData.overlayTag = tag;
          parent.add(g);
          return g;
        }

        function disposeGroup(g) {
          g.traverse((n) => {
            if (n.geometry) n.geometry.dispose?.();
            if (n.material) {
              const m = n.material;
              if (Array.isArray(m)) m.forEach(mm => mm.dispose?.());
              else m.dispose?.();
            }
            if (n.isCSS2DObject && n.element && n.element.parentNode) {
              n.element.parentNode.removeChild(n.element);
            }
          });
          while (g.children.length) g.remove(g.children[0]);
        }

        // dip update: rebuild the dip arc and its label
        overlayUpdateMap[`${evtId}:dip`] = (newDip) => {
          const grp = getTagGroup(evtOverlays, `${evtId}:dip`);
          disposeGroup(grp);
          const horizDir = bearingVec(dipDir);
          const downDipN = downDipVec(newDip, dipDir).normalize();
          const dipArcR = arc3D(vertex, horizDir, downDipN, radius, COLOR.overlay);
          grp.add(dipArcR.line);
          grp.add(arcWedge(vertex, horizDir, downDipN, radius, COLOR.overlay, 0.16));
          const lbl = makeValueLabel(`Dip ${fmtDeg(newDip)}`, { inferred: false });
          lbl.position.copy(dipArcR.midPoint);
          grp.add(lbl);
        };

        // strike update: rebuild the strike line and its label
        overlayUpdateMap[`${evtId}:strike`] = (newStrike) => {
          const grp = getTagGroup(evtOverlays, `${evtId}:strike`);
          disposeGroup(grp);
          const strikeAxis = strikeVec(newStrike);
          const sP1 = vertex.clone().add(strikeAxis.clone().multiplyScalar(radius * 1.4));
          const sP2 = vertex.clone().add(strikeAxis.clone().multiplyScalar(-radius * 1.4));
          grp.add(solidLine([sP1, sP2], COLOR.overlay, { depthTest: false, opacity: 0.85 }));
          const strikeLbl = makeValueLabel(`Strike ${fmtBearing(newStrike)}`, { inferred: false });
          strikeLbl.position.copy(sP1.clone().add(new T.Vector3(0, 0.1, 0)));
          grp.add(strikeLbl);
        };

        // throw update: rebuild throw line and label
        overlayUpdateMap[`${evtId}:throw`] = (newThrow) => {
          const grp = getTagGroup(evtOverlays, `${evtId}:throw`);
          disposeGroup(grp);
          // Throw label near the fault plane midpoint
          const throwLbl = makeValueLabel(`Throw ${Math.abs(newThrow).toFixed(2)} u`, { inferred: false });
          throwLbl.position.copy(vertex.clone().add(new T.Vector3(0.2, -total / 4, 0)));
          grp.add(throwLbl);
        };
      }

      if (firstEvent.type === 'fold') {
        const axisStrike = firstEvent.axis_strike ?? 0;
        const plunge = firstEvent.plunge ?? 0;
        const plungeDir = firstEvent.plunge_direction ?? axisStrike;
        const amplitude = firstEvent.amplitude ?? 1.0;
        const wavelength = firstEvent.wavelength ?? 4.0;
        const subtype = firstEvent.subtype;
        const total = model.layers.reduce((s, L) => s + L.thickness, 0);
        const sign = subtype === 'syncline' ? -1 : 1;

        function foldHeight0() { return amplitude * sign * Math.cos(0); }
        const bearing = bearingVec(plungeDir);
        const axisTarget = new T.Vector3(
          bearing.x * Math.cos(rad(plunge)),
          -Math.sin(rad(plunge)),
          bearing.z * Math.cos(rad(plunge)),
        ).normalize();
        const q0 = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), axisTarget);

        function getTagGroup(parent, tag) {
          for (const c of parent.children) {
            if (c.userData && c.userData.overlayTag === tag) return c;
          }
          const g = new T.Group();
          g.userData.overlayTag = tag;
          parent.add(g);
          return g;
        }
        function disposeGroup(g) {
          g.traverse((n) => {
            if (n.geometry) n.geometry.dispose?.();
            if (n.material) {
              const m = n.material;
              if (Array.isArray(m)) m.forEach(mm => mm.dispose?.());
              else m.dispose?.();
            }
            if (n.isCSS2DObject && n.element && n.element.parentNode) {
              n.element.parentNode.removeChild(n.element);
            }
          });
          while (g.children.length) g.remove(g.children[0]);
        }

        // interlimb_angle update: rebuild the interlimb arc
        overlayUpdateMap[`${evtId}:interlimb_angle`] = (newAngle) => {
          if (subtype === 'monocline') return;
          const grp = getTagGroup(evtOverlays, `${evtId}:interlimb_angle`);
          disposeGroup(grp);
          const vertexLocal = new T.Vector3(0, total / 2 + foldHeight0() + 0.02, 0);
          const vertex = vertexLocal.clone().applyQuaternion(q0);
          // Recompute limb vectors from new interlimb angle
          const halfAngle = newAngle / 2;
          const limbL = new T.Vector3(-Math.cos(rad(halfAngle)), sign * Math.sin(rad(halfAngle)), 0).normalize();
          const limbR = new T.Vector3(Math.cos(rad(halfAngle)), sign * Math.sin(rad(halfAngle)), 0).normalize();
          const limbLw = limbL.clone().applyQuaternion(q0);
          const limbRw = limbR.clone().applyQuaternion(q0);
          const a = arc3D(vertex, limbLw, limbRw, 0.7, COLOR.overlay);
          grp.add(a.line);
          grp.add(arcWedge(vertex, limbLw, limbRw, 0.7, COLOR.overlay, 0.18));
          const lbl = makeValueLabel(`Interlimb ${fmtDeg(newAngle)}`, { inferred: false });
          lbl.position.copy(a.midPoint);
          grp.add(lbl);
        };

        // plunge update: rebuild the plunge arc
        overlayUpdateMap[`${evtId}:plunge`] = (newPlunge) => {
          if (subtype === 'monocline' || newPlunge <= 0.01) return;
          const grp = getTagGroup(evtOverlays, `${evtId}:plunge`);
          disposeGroup(grp);
          const bearingP = bearingVec(plungeDir);
          const newAxisTarget = new T.Vector3(
            bearingP.x * Math.cos(rad(newPlunge)),
            -Math.sin(rad(newPlunge)),
            bearingP.z * Math.cos(rad(newPlunge)),
          ).normalize();
          const vertexLocal = new T.Vector3(0, total / 2 + foldHeight0() + 0.02, 0);
          const vertex = vertexLocal.clone().applyQuaternion(q0);
          const horizProj = new T.Vector3(bearingP.x, 0, bearingP.z).normalize().multiplyScalar(1.2);
          const tilted = newAxisTarget.clone().multiplyScalar(1.2);
          const a = arc3D(vertex, horizProj.clone().normalize(), tilted.clone().normalize(), 0.65, COLOR.overlay);
          grp.add(a.line);
          grp.add(arcWedge(vertex, horizProj.clone().normalize(), tilted.clone().normalize(), 0.65, COLOR.overlay, 0.18));
          const lbl = makeValueLabel(`Plunge ${fmtDeg(newPlunge)} → ${fmtBearing(plungeDir)}`, { inferred: false });
          lbl.position.copy(a.midPoint);
          grp.add(lbl);
        };
      }
    }

    // Build overlay update functions for layers (thickness arrows).
    for (const layer of (model.layers || [])) {
      const lid = layer.id;
      const layers = (model.layers || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const total = layers.reduce((s, L) => s + (L.thickness || 1.0), 0);
      let yBottom = -total / 2;
      let slabBottom = yBottom, slabTop = yBottom;
      for (const l of layers) {
        yBottom += l.thickness || 1.0;
        if (l.id === lid) {
          slabTop = yBottom;
          slabBottom = yBottom - (l.thickness || 1.0);
          break;
        }
      }

      // Capture per-slab positions for the closure
      const capturedBottom = slabBottom;
      const capturedTop = slabTop;

      overlayUpdateMap[`${lid}:thickness`] = (newThickness) => {
        // Can't update thickness arrow in-place without knowing the tilt matrix.
        // Thickness is a full-rebuild case — leave as no-op here and let the
        // React model update trigger the full scene rebuild on pointerup.
        // (intermediate drags on thickness handles still update the preview label
        // via onDragChange, but the 3D arrow will catch up on final.)
      };
    }

    // Render intrusions
    (model.intrusions || []).forEach(function(I) {
      const ir = buildIntrusionGeometry(I, model);
      root.add(ir.meshes);
      overlays.add(ir.overlays);
      labels.push(...ir.labels);
    });

    // Render unconformities
    (model.unconformities || []).forEach(function(U) {
      const ur = buildUnconformityGeometry(U, model);
      root.add(ur.meshes);
      overlays.add(ur.overlays);
      labels.push(...ur.labels);
    });

    // Render mineralisation
    (model.mineralisation || []).forEach(function(M) {
      const mr = buildMineralisationGeometry(M, model);
      root.add(mr.meshes);
      overlays.add(mr.overlays);
      labels.push(...mr.labels);
    });

    // Hydrothermal five-elements annotation (7.3)
    (model.mineralisation || []).forEach(function(M) {
      addHydrothermalAnnotation(M, model, overlays, labels);
    });

    const bounds = new T.Box3().setFromObject(root);
    return { root, overlays, labels, overlayUpdateMap, bounds };
  }

  function capitalise(s) { return (s || '').replace(/(^|[-\s])([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase()); }

  // ---- Scene chrome (grid, north arrow, ground) ----
  function makeGrid(size = 10, divisions = 20) {
    const grid = new T.GridHelper(size, divisions, COLOR.gridMajor, COLOR.grid);
    grid.material.transparent = true;
    grid.material.opacity = 0.45;
    grid.position.y = -3;
    return grid;
  }
  function makeNorthArrow(at = new T.Vector3(0, -3, 0), len = 0.7) {
    const grp = new T.Group();
    const arrow = arrow3D(at, at.clone().add(new T.Vector3(0, 0, len)), COLOR.north, { headLength: 0.18, headWidth: 0.1, depthTest: false });
    grp.add(arrow);
    const lbl = makeCompassLetter('N');
    lbl.position.copy(at.clone().add(new T.Vector3(0, 0.05, len + 0.18)));
    grp.add(lbl);
    return grp;
  }

  // Expose everything
  window.GeoThree = {
    buildSceneContents,
    makeGrid,
    makeNorthArrow,
    helpers: {
      bearingVec, strikeVec, downDipVec, upDipVec, planeNormal,
      arc3D, arcWedge, arrow3D, doubleArrow, solidLine, dashedLine,
      horizontalDisc, compassRose,
      makeLabel, makeValueLabel,
      fmtDeg, fmtLen, fmtBearing,
      rad, deg,
    },
    COLOR,
  };
})();
