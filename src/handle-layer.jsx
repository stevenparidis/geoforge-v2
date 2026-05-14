/* GeoForge — Handle Layer (Phase 1: Direct 3D Manipulation)
 *
 * Exports window.GeoHandles with:
 *   createHandlesForFeature(featureKind, featureData, model) -> THREE.Group
 *   attachToScene(scene, selected, model, onDragChange) -> cleanup fn
 *
 * Each handle is a cyan ring/sphere (radius 0.15 world units, opacity 0.7).
 * Handles scale to constant screen size during Surface.tick().
 * Tooltips (CSS2DObject) shown on pointerover.
 *
 * Drag system (sub-phase 1.2):
 *   - pointerdown: capture pointer, disable OrbitControls
 *   - pointermove: raycast onto projection geometry, call onDragChange (rAF-throttled)
 *   - pointerup: re-enable OrbitControls, onDragChange with { final: true }
 */

(function () {
  const HANDLE_COLOR = 0x22d3ee; // cyan
  const HANDLE_OPACITY = 0.7;
  const HANDLE_RADIUS = 0.15;

  // Drag preview label element (shared, one at a time)
  let dragPreviewEl = null;

  function getOrCreateDragPreview(hostEl) {
    if (!dragPreviewEl) {
      dragPreviewEl = document.createElement('div');
      dragPreviewEl.style.cssText = [
        'position: absolute',
        'background: rgba(15,18,24,0.92)',
        'color: #67e8f9',
        'font-family: var(--kbd, monospace)',
        'font-size: 11px',
        'padding: 3px 8px',
        'border-radius: 4px',
        'border: 1px solid rgba(103,232,249,0.4)',
        'pointer-events: none',
        'white-space: nowrap',
        'z-index: 100',
        'display: none',
      ].join(';');
    }
    if (hostEl && !hostEl.contains(dragPreviewEl)) {
      hostEl.appendChild(dragPreviewEl);
    }
    return dragPreviewEl;
  }

  function removeDragPreview() {
    if (dragPreviewEl && dragPreviewEl.parentNode) {
      dragPreviewEl.parentNode.removeChild(dragPreviewEl);
    }
    dragPreviewEl = null;
  }

  // ---- Handle geometry builders ----
  function makeSphereHandle(name, tooltip) {
    const T = window.THREE;
    const geo = new T.SphereGeometry(HANDLE_RADIUS, 12, 8);
    const mat = new T.MeshBasicMaterial({
      color: HANDLE_COLOR,
      transparent: true,
      opacity: HANDLE_OPACITY,
      depthTest: false,
    });
    const mesh = new T.Mesh(geo, mat);
    mesh.renderOrder = 20;
    mesh.userData.isHandle = true;
    mesh.userData.handleName = name;
    mesh.userData.tooltip = tooltip;

    // Tooltip CSS2D object
    const el = document.createElement('div');
    el.className = 'geo-label';
    el.style.cssText = 'background: rgba(15,18,24,0.92); color: #22d3ee; font-size: 11px; pointer-events: none; white-space: nowrap;';
    el.textContent = tooltip;
    el.style.display = 'none';
    const tipObj = new window.CSS2DObject(el);
    tipObj.position.set(0, 0.25, 0);
    tipObj.userData.isTooltip = true;
    mesh.add(tipObj);
    mesh.userData.tooltipEl = el;

    return mesh;
  }

  // ---- Clamping helpers ----
  function clampDip(v)           { return Math.max(0, Math.min(90, v)); }
  function wrapBearing(v)        { return ((v % 360) + 360) % 360; }
  function clampThickness(v)     { return Math.max(0.1, Math.min(3.0, v)); }
  function clampInterlimb(v)     { return Math.max(5, Math.min(175, v)); }
  function clampPlunge(v)        { return Math.max(0, Math.min(90, v)); }
  function clampDisplacement(v)  { return Math.max(-3.0, Math.min(3.0, v)); }

  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;

  function bearingVec(bDeg) {
    const r = rad(bDeg);
    return new window.THREE.Vector3(Math.sin(r), 0, Math.cos(r));
  }
  function downDipVec(dipDeg, dipDirDeg) {
    const dr = rad(dipDeg), b = rad(dipDirDeg);
    return new window.THREE.Vector3(
      Math.sin(b) * Math.cos(dr),
      -Math.sin(dr),
      Math.cos(b) * Math.cos(dr),
    );
  }
  function planeNormal(dipDeg, dipDirDeg) {
    const dr = rad(dipDeg), b = rad(dipDirDeg);
    return new window.THREE.Vector3(
      Math.sin(dr) * Math.sin(b),
      Math.cos(dr),
      Math.sin(dr) * Math.cos(b),
    );
  }
  function strikeVec(strikeDeg) { return bearingVec(strikeDeg); }

  // ---- createHandlesForFeature ----
  function createHandlesForFeature(featureKind, featureData, model) {
    const T = window.THREE;
    const group = new T.Group();
    group.userData.featureKind = featureKind;
    group.userData.featureId = featureData.id;

    if (featureKind === 'event' && featureData.type === 'fault') {
      const evt = featureData;
      const dipDeg = evt.dip ?? 60;
      const dipDir = evt.dip_direction ?? 90;
      const strike = evt.strike ?? 0;
      const throwV = evt.throw ?? 0;

      const total = (model.layers || []).reduce((s, L) => s + (L.thickness || 1.0), 0);
      const halfH = total / 2;

      // Fault plane normal for placing handles
      const normal = planeNormal(dipDeg, dipDir);
      const downDip = downDipVec(dipDeg, dipDir);
      const stk = strikeVec(strike);

      // fault-dip handle: centre of fault plane offset along fault normal
      const dipHandle = makeSphereHandle('fault-dip', 'Drag to change dip');
      dipHandle.position.copy(normal.clone().multiplyScalar(0.8));
      dipHandle.userData.field = 'dip';
      dipHandle.userData.featureKind = featureKind;
      dipHandle.userData.featureId = evt.id;
      dipHandle.userData.startValue = dipDeg;
      group.add(dipHandle);

      // fault-strike handle: top of fault plane
      const strikeHandle = makeSphereHandle('fault-strike', 'Drag to change strike');
      strikeHandle.position.copy(stk.clone().multiplyScalar(1.8).add(new T.Vector3(0, halfH + 0.3, 0)));
      strikeHandle.userData.field = 'strike';
      strikeHandle.userData.featureKind = featureKind;
      strikeHandle.userData.featureId = evt.id;
      strikeHandle.userData.startValue = strike;
      group.add(strikeHandle);

      // fault-throw handle: on hanging-wall block, offset from fault plane
      const throwHandle = makeSphereHandle('fault-throw', 'Drag to change throw/heave');
      const hwOffset = normal.clone().multiplyScalar(1.2);
      throwHandle.position.copy(hwOffset.add(new T.Vector3(0, throwV * 0.5, 0)));
      throwHandle.userData.field = 'throw';
      throwHandle.userData.featureKind = featureKind;
      throwHandle.userData.featureId = evt.id;
      throwHandle.userData.startValue = throwV;
      group.add(throwHandle);

    } else if (featureKind === 'event' && featureData.type === 'fold') {
      const evt = featureData;
      const axisStrike = evt.axis_strike ?? 0;
      const plunge = evt.plunge ?? 0;
      const plungeDir = evt.plunge_direction ?? axisStrike;
      const interlimb = evt.interlimb_angle ?? 110;
      const amplitude = evt.amplitude ?? 1.0;
      const wavelength = evt.wavelength ?? 4.0;
      const total = (model.layers || []).reduce((s, L) => s + (L.thickness || 1.0), 0);

      const bearing = bearingVec(plungeDir);
      const axisTarget = new T.Vector3(
        bearing.x * Math.cos(rad(plunge)),
        -Math.sin(rad(plunge)),
        bearing.z * Math.cos(rad(plunge)),
      ).normalize();
      const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, 1), axisTarget);

      // Limb vectors in fold-local frame
      const halfAngle = (interlimb / 2);
      const sign = evt.subtype === 'syncline' ? -1 : 1;

      const leftLimbLocal = new T.Vector3(-Math.cos(rad(halfAngle)), sign * Math.sin(rad(halfAngle)), 0).normalize();
      const rightLimbLocal = new T.Vector3(Math.cos(rad(halfAngle)), sign * Math.sin(rad(halfAngle)), 0).normalize();
      const leftLimb = leftLimbLocal.clone().applyQuaternion(q);
      const rightLimb = rightLimbLocal.clone().applyQuaternion(q);

      // Crest in world frame
      const crestY = amplitude * sign + total / 2;
      const crestWorld = new T.Vector3(0, crestY + 0.1, 0).applyQuaternion(q);

      // fold-limb-left handle
      const limbLHandle = makeSphereHandle('fold-limb-left', 'Drag to change interlimb angle');
      limbLHandle.position.copy(crestWorld.clone().add(leftLimb.clone().multiplyScalar(1.5)));
      limbLHandle.userData.field = 'interlimb_angle';
      limbLHandle.userData.featureKind = featureKind;
      limbLHandle.userData.featureId = evt.id;
      limbLHandle.userData.startValue = interlimb;
      group.add(limbLHandle);

      // fold-limb-right handle
      const limbRHandle = makeSphereHandle('fold-limb-right', 'Drag to change interlimb angle');
      limbRHandle.position.copy(crestWorld.clone().add(rightLimb.clone().multiplyScalar(1.5)));
      limbRHandle.userData.field = 'interlimb_angle';
      limbRHandle.userData.featureKind = featureKind;
      limbRHandle.userData.featureId = evt.id;
      limbRHandle.userData.startValue = interlimb;
      group.add(limbRHandle);

      // fold-hinge handle: one end of hinge line
      const hingeEnd = axisTarget.clone().multiplyScalar(2.0).add(crestWorld);
      const hingeHandle = makeSphereHandle('fold-hinge', 'Drag to change plunge');
      hingeHandle.position.copy(hingeEnd);
      hingeHandle.userData.field = 'plunge';
      hingeHandle.userData.featureKind = featureKind;
      hingeHandle.userData.featureId = evt.id;
      hingeHandle.userData.startValue = plunge;
      group.add(hingeHandle);

    } else if (featureKind === 'layer') {
      const L = featureData;
      const thickness = L.thickness ?? 1.0;
      // Find layer position in the stack
      const layers = model.layers || [];
      const sortedLayers = layers.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const total = sortedLayers.reduce((s, l) => s + (l.thickness || 1.0), 0);
      let y = -total / 2;
      let layerBottom = y;
      let layerTop = y;
      for (const l of sortedLayers) {
        y += l.thickness || 1.0;
        if (l.id === L.id) {
          layerTop = y;
          layerBottom = y - (l.thickness || 1.0);
          break;
        }
      }

      // layer-thickness-top handle: centre of upper contact
      const topHandle = makeSphereHandle('layer-thickness-top', 'Drag to change thickness');
      topHandle.position.set(-2.2, layerTop, 2.2);
      topHandle.userData.field = 'thickness';
      topHandle.userData.featureKind = featureKind;
      topHandle.userData.featureId = L.id;
      topHandle.userData.startValue = thickness;
      topHandle.userData.isTopHandle = true;
      group.add(topHandle);

      // layer-thickness-bot handle: centre of lower contact
      const botHandle = makeSphereHandle('layer-thickness-bot', 'Drag to change thickness');
      botHandle.position.set(-2.2, layerBottom, 2.2);
      botHandle.userData.field = 'thickness';
      botHandle.userData.featureKind = featureKind;
      botHandle.userData.featureId = L.id;
      botHandle.userData.startValue = thickness;
      botHandle.userData.isTopHandle = false;
      group.add(botHandle);
    }

    return group;
  }

  // ---- Drag controller ----
  function createDragController(hostEl, camera, stateRef, handleGroup, onDragChange) {
    const T = window.THREE;
    const raycaster = new T.Raycaster();
    const mouse = new T.Vector2();

    let activeHandle = null;
    let rafPending = false;
    let pendingValue = null;
    let pendingField = null;
    let pendingFeatureKind = null;
    let pendingFeatureId = null;
    let dragStartY = 0;
    let dragStartValue = 0;

    // Projection planes (invisible) per handle type
    let projPlane = null; // THREE.Plane used for intersection

    function getHandlesArray() {
      const result = [];
      handleGroup.traverse((n) => { if (n.userData && n.userData.isHandle) result.push(n); });
      return result;
    }

    function getMouseNDC(e) {
      const rc = hostEl.getBoundingClientRect();
      return {
        x: ((e.clientX - rc.left) / rc.width) * 2 - 1,
        y: -((e.clientY - rc.top) / rc.height) * 2 + 1,
      };
    }

    function onPointerDown(e) {
      const ndc = getMouseNDC(e);
      mouse.set(ndc.x, ndc.y);
      raycaster.setFromCamera(mouse, camera);
      const handles = getHandlesArray();
      const hits = raycaster.intersectObjects(handles, false);
      if (hits.length === 0) return;

      const hit = hits[0];
      activeHandle = hit.object;
      dragStartY = e.clientY;
      dragStartValue = activeHandle.userData.startValue ?? 0;
      pendingField = activeHandle.userData.field;
      pendingFeatureKind = activeHandle.userData.featureKind;
      pendingFeatureId = activeHandle.userData.featureId;

      // Set up projection plane: horizontal plane through handle position for
      // most handles; vertical for some
      const handlePos = activeHandle.getWorldPosition(new T.Vector3());
      const handleName = activeHandle.userData.handleName;

      // Build projection plane based on handle type
      if (handleName === 'fault-dip') {
        // Sphere centred on origin for dip — use horizontal plane through handle
        projPlane = new T.Plane(new T.Vector3(0, 1, 0), -handlePos.y);
      } else if (handleName === 'fault-strike') {
        // Horizontal disc — use horizontal plane
        projPlane = new T.Plane(new T.Vector3(0, 1, 0), -handlePos.y);
      } else if (handleName === 'fault-throw') {
        // Plane parallel to fault
        const evt = stateRef.featureData;
        const dipDir = evt ? (evt.dip_direction ?? 90) : 90;
        const dipDeg = evt ? (evt.dip ?? 60) : 60;
        const n = planeNormal(dipDeg, dipDir);
        projPlane = new T.Plane(n, -n.dot(handlePos));
      } else if (handleName === 'layer-thickness-top' || handleName === 'layer-thickness-bot') {
        // Horizontal plane along layer normal
        projPlane = new T.Plane(new T.Vector3(0, 1, 0), -handlePos.y);
      } else if (handleName === 'fold-limb-left' || handleName === 'fold-limb-right') {
        // Use a plane perpendicular to hinge axis
        projPlane = new T.Plane(new T.Vector3(0, 1, 0), -handlePos.y);
      } else if (handleName === 'fold-hinge') {
        // Vertical strip in axial plane
        projPlane = new T.Plane(new T.Vector3(1, 0, 0), -handlePos.x);
      } else {
        projPlane = new T.Plane(new T.Vector3(0, 1, 0), -handlePos.y);
      }

      // Disable orbit controls during drag
      const st = stateRef.current || stateRef;
      if (st && st.controls) st.controls.enabled = false;

      hostEl.setPointerCapture(e.pointerId);
      e.stopPropagation();

      // Show drag preview
      const preview = getOrCreateDragPreview(hostEl);
      preview.style.display = 'block';
      preview.style.left = (e.clientX - hostEl.getBoundingClientRect().left + 12) + 'px';
      preview.style.top = (e.clientY - hostEl.getBoundingClientRect().top - 28) + 'px';
      preview.textContent = formatFieldValue(pendingField, dragStartValue);
    }

    function computeNewValue(e) {
      if (!activeHandle) return null;
      const handleName = activeHandle.userData.handleName;
      const ndc = getMouseNDC(e);
      mouse.set(ndc.x, ndc.y);
      raycaster.setFromCamera(mouse, camera);

      // Intersect with projection plane
      const target = new T.Vector3();
      const hit = raycaster.ray.intersectPlane(projPlane, target);
      if (!hit) {
        // Fall back to vertical drag
        const dy = (dragStartY - e.clientY) * 0.02;
        return clampValueForField(pendingField, dragStartValue + dy);
      }

      const handlePos = activeHandle.getWorldPosition(new T.Vector3());

      if (handleName === 'fault-dip') {
        // Angle from origin to intersection, projected onto the vertical plane
        // Measure vertical displacement
        const delta = target.clone().sub(handlePos);
        const newDip = clampDip(dragStartValue - delta.y * 15);
        return newDip;

      } else if (handleName === 'fault-strike') {
        // Bearing from origin to intersection
        const d = target.clone();
        d.y = 0;
        if (d.length() < 0.001) return dragStartValue;
        d.normalize();
        const angle = deg(Math.atan2(d.x, d.z));
        return wrapBearing(angle);

      } else if (handleName === 'fault-throw') {
        // Signed distance along plane normal
        const delta = target.clone().sub(handlePos);
        const newThrow = clampDisplacement(dragStartValue + delta.y * 2);
        return newThrow;

      } else if (handleName === 'layer-thickness-top') {
        // Distance from mid-plane
        const delta = target.clone().sub(handlePos);
        const newThickness = clampThickness(dragStartValue + delta.y * 2);
        return newThickness;

      } else if (handleName === 'layer-thickness-bot') {
        // Moving bottom handle up decreases thickness
        const delta = target.clone().sub(handlePos);
        const newThickness = clampThickness(dragStartValue - delta.y * 2);
        return newThickness;

      } else if (handleName === 'fold-limb-left' || handleName === 'fold-limb-right') {
        // Angle from axial plane -> interlimb_angle
        const delta = target.clone().sub(handlePos);
        const newAngle = clampInterlimb(dragStartValue + delta.x * 20);
        return newAngle;

      } else if (handleName === 'fold-hinge') {
        // Angle from horizontal -> plunge
        const delta = target.clone().sub(handlePos);
        const newPlunge = clampPlunge(dragStartValue - delta.y * 15);
        return newPlunge;
      }

      // Default fallback
      const dy = (dragStartY - e.clientY) * 0.02;
      return clampValueForField(pendingField, dragStartValue + dy);
    }

    function onPointerMove(e) {
      if (!activeHandle) return;
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        if (!activeHandle) return;
        const newVal = computeNewValue(e);
        if (newVal === null) return;
        pendingValue = newVal;

        // Update drag preview label
        const preview = dragPreviewEl;
        if (preview) {
          const rc = hostEl.getBoundingClientRect();
          preview.style.left = (e.clientX - rc.left + 12) + 'px';
          preview.style.top = (e.clientY - rc.top - 28) + 'px';
          preview.textContent = formatFieldValue(pendingField, newVal);
        }

        // Co-update overlay in place (no full rebuild) during intermediate drags.
        const st = stateRef.current || stateRef;
        if (st && st.overlayUpdateMap) {
          const key = `${pendingFeatureId}:${pendingField}`;
          const updateFn = st.overlayUpdateMap[key];
          if (updateFn) updateFn(newVal);
        }

        onDragChange(pendingFeatureKind, pendingFeatureId, pendingField, newVal, { intermediate: true });
      });
    }

    function onPointerUp(e) {
      if (!activeHandle) return;

      const st = stateRef.current || stateRef;
      if (st && st.controls) st.controls.enabled = true;

      if (pendingValue !== null) {
        onDragChange(pendingFeatureKind, pendingFeatureId, pendingField, pendingValue, { final: true });
      }

      activeHandle = null;
      pendingValue = null;
      rafPending = false;

      // Hide drag preview
      if (dragPreviewEl) {
        dragPreviewEl.style.display = 'none';
      }

      try { hostEl.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    // Hover tooltip
    function onPointerOver(e) {
      const ndc = getMouseNDC(e);
      mouse.set(ndc.x, ndc.y);
      raycaster.setFromCamera(mouse, camera);
      const handles = getHandlesArray();
      const hits = raycaster.intersectObjects(handles, false);
      for (const h of handles) {
        const el = h.userData.tooltipEl;
        if (el) el.style.display = 'none';
      }
      if (hits.length > 0) {
        const el = hits[0].object.userData.tooltipEl;
        if (el) el.style.display = 'block';
      }
    }

    hostEl.addEventListener('pointerdown', onPointerDown);
    hostEl.addEventListener('pointermove', onPointerMove);
    hostEl.addEventListener('pointerup', onPointerUp);
    hostEl.addEventListener('pointermove', onPointerOver);

    return function cleanup() {
      hostEl.removeEventListener('pointerdown', onPointerDown);
      hostEl.removeEventListener('pointermove', onPointerMove);
      hostEl.removeEventListener('pointerup', onPointerUp);
      hostEl.removeEventListener('pointermove', onPointerOver);
      removeDragPreview();
    };
  }

  function formatFieldValue(field, value) {
    if (value == null) return '';
    const v = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(v)) return String(value);
    switch (field) {
      case 'dip': return `Dip: ${v.toFixed(1)}°`;
      case 'strike': return `Strike: ${v.toFixed(1)}°`;
      case 'dip_direction': return `Dip dir: ${v.toFixed(1)}°`;
      case 'throw': return `Throw: ${v.toFixed(2)} u`;
      case 'heave': return `Heave: ${v.toFixed(2)} u`;
      case 'thickness': return `Thickness: ${v.toFixed(2)} u`;
      case 'interlimb_angle': return `Interlimb: ${v.toFixed(1)}°`;
      case 'plunge': return `Plunge: ${v.toFixed(1)}°`;
      default: return `${field}: ${v.toFixed(2)}`;
    }
  }

  function clampValueForField(field, value) {
    switch (field) {
      case 'dip': return clampDip(value);
      case 'strike': return wrapBearing(value);
      case 'dip_direction': return wrapBearing(value);
      case 'throw': return clampDisplacement(value);
      case 'heave': return clampDisplacement(value);
      case 'thickness': return clampThickness(value);
      case 'interlimb_angle': return clampInterlimb(value);
      case 'plunge': return clampPlunge(value);
      default: return value;
    }
  }

  // ---- attachToScene ----
  function attachToScene(sceneEntry, selected, model, onDragChange) {
    // sceneEntry is the stateRef.current from scene.jsx { T, scene, camera, controls, host, handleRoot, ... }
    if (!sceneEntry) return () => {};
    const { handleRoot, host, camera } = sceneEntry;
    if (!handleRoot) return () => {};

    // Clear existing handles
    while (handleRoot.children.length > 0) {
      const c = handleRoot.children[0];
      c.traverse((n) => {
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
      handleRoot.remove(c);
    }

    if (!selected || !model) return () => {};

    // Find the selected feature
    let featureData = null;
    let featureKind = null;
    if (selected.kind === 'layer') {
      featureData = (model.layers || []).find((L) => L.id === selected.id);
      featureKind = 'layer';
    } else if (selected.kind === 'event') {
      featureData = (model.events || []).find((E) => E.id === selected.id);
      featureKind = 'event';
    }

    if (!featureData) return () => {};

    // Create handles
    const handleGroup = createHandlesForFeature(featureKind, featureData, model);
    // Store ref to featureData for use in projection calculation
    handleRoot.userData.featureData = featureData;
    handleRoot.add(handleGroup);

    // Attach drag controller
    const cleanupDrag = createDragController(
      host,
      camera,
      { current: sceneEntry, featureData },
      handleGroup,
      onDragChange,
    );

    return function cleanup() {
      cleanupDrag();
      while (handleRoot.children.length > 0) {
        const c = handleRoot.children[0];
        c.traverse((n) => {
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
        handleRoot.remove(c);
      }
    };
  }

  // ---- Camera-scale invariance: called each tick ----
  // scaleHandles is called from scene.jsx's tick loop to keep handles screen-constant.
  function scaleHandles(handleRoot, camera) {
    if (!handleRoot || !camera) return;
    handleRoot.traverse((handle) => {
      if (handle.userData && handle.userData.isHandle) {
        const d = handle.getWorldPosition(new window.THREE.Vector3()).distanceTo(camera.position);
        const targetScale = d * 0.04;
        handle.scale.setScalar(targetScale);
      }
    });
  }

  window.GeoHandles = {
    createHandlesForFeature,
    attachToScene,
    scaleHandles,
    formatFieldValue,
    clampValueForField,
  };
})();
