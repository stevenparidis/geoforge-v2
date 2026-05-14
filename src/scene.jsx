/* GeoForge — <GeoScene>: React wrapper around a shared Three.js renderer.
 *
 * Architecture: ONE off-DOM WebGLRenderer renders each scene in turn. After
 * each render its pixels are copied via drawImage into the corresponding
 * per-card 2D canvas (which IS a child of the card, so border-radius and
 * overflow:hidden work correctly). This eliminates the per-page WebGL
 * context cap while keeping clean per-card composition. Labels go through
 * per-scene CSS2DRenderer.
 */

(function () {
  const { useEffect, useRef } = React;

  // ---------- Shared surface ----------
  const Surface = {
    inited: false,
    webglCanvas: null,
    renderer: null,
    scenes: new Set(),
    raf: 0,
    init() {
      if (this.inited) return;
      const T = window.THREE;
      const canvas = document.createElement('canvas');
      canvas.width = 16; canvas.height = 16;
      // Keep offscreen but still rendering-capable
      canvas.style.cssText = 'position: fixed; top: -10000px; left: -10000px; pointer-events: none;';
      document.body.appendChild(canvas);
      this.webglCanvas = canvas;
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.localClippingEnabled = true;
      this.renderer = renderer;
      this.tick();
      this.inited = true;
    },
    addScene(entry) { this.scenes.add(entry); this.init(); },
    removeScene(entry) { this.scenes.delete(entry); },
    tick() {
      this.raf = requestAnimationFrame(() => this.tick());
      const r = this.renderer;
      if (!r) return;
      const pxR = r.getPixelRatio();
      for (const entry of this.scenes) {
        const host = entry.host;
        if (!host || !host.isConnected) continue;
        const rect = host.getBoundingClientRect();
        // Skip off-viewport scenes to save GPU
        if (rect.bottom < -200 || rect.top > window.innerHeight + 200) continue;
        if (rect.right < -200 || rect.left > window.innerWidth + 200) continue;
        const w = Math.max(8, Math.round(rect.width));
        const h = Math.max(8, Math.round(rect.height));
        // Resize WebGL canvas and per-card 2D canvas
        if (entry._w !== w || entry._h !== h) {
          r.setSize(w, h, false);
          const cardCanvas = entry.canvas2d;
          const wp = Math.floor(w * pxR), hp = Math.floor(h * pxR);
          if (cardCanvas.width !== wp) cardCanvas.width = wp;
          if (cardCanvas.height !== hp) cardCanvas.height = hp;
          cardCanvas.style.width = w + 'px';
          cardCanvas.style.height = h + 'px';
          if (entry.labelRenderer) entry.labelRenderer.setSize(w, h);
          entry.camera.aspect = w / h;
          entry.camera.updateProjectionMatrix();
          entry._w = w; entry._h = h;
        }
        if (entry.controls) entry.controls.update();
        r.render(entry.scene, entry.camera);
        // Scale handles to constant screen size
        if (window.GeoHandles && entry.handleRoot) {
          window.GeoHandles.scaleHandles(entry.handleRoot, entry.camera);
        }
        // Copy to card's 2D canvas
        const ctx2d = entry.ctx2d;
        ctx2d.clearRect(0, 0, entry.canvas2d.width, entry.canvas2d.height);
        ctx2d.drawImage(this.webglCanvas, 0, 0);
        if (entry.labelRenderer) entry.labelRenderer.render(entry.scene, entry.camera);
      }
    },
  };
  window.GeoSurface = Surface;

  function GeoScene(props) {
    const {
      model,
      showLabels = true,
      showOverlays = true,
      showGrid = true,
      cameraHint = { phi: 1.05, theta: 0.5, dist: 9 },
      interactive = true,
      onSelect,
      selected,
      onDragChange,
      className = '',
      style = {},
    } = props;

    const hostRef = useRef(null);
    const labelHostRef = useRef(null);
    const stateRef = useRef(null);

    useEffect(() => {
      if (!window.__threeReady) return;
      const host = hostRef.current;
      const labelHost = labelHostRef.current;
      if (!host || !labelHost) return;

      const T = window.THREE;
      const scene = new T.Scene();
      scene.background = null;

      const r0 = host.getBoundingClientRect();
      const camera = new T.PerspectiveCamera(40, (r0.width || 1) / (r0.height || 1), 0.1, 200);
      const sphPos = (h) => new T.Vector3(
        h.dist * Math.sin(h.phi) * Math.sin(h.theta),
        h.dist * Math.cos(h.phi),
        h.dist * Math.sin(h.phi) * Math.cos(h.theta),
      );
      camera.position.copy(sphPos(cameraHint));
      camera.lookAt(0, 0, 0);

      // Lights
      scene.add(new T.HemisphereLight(0xa0c4ff, 0x202028, 0.7));
      const dir = new T.DirectionalLight(0xffffff, 0.9);
      dir.position.set(4, 7, 5);
      scene.add(dir);
      const dir2 = new T.DirectionalLight(0xa6c8ff, 0.25);
      dir2.position.set(-5, 3, -4);
      scene.add(dir2);
      scene.add(new T.AmbientLight(0xffffff, 0.15));

      // Per-card 2D canvas that lives inside the host (clipped by overflow:hidden)
      const canvas2d = document.createElement('canvas');
      canvas2d.style.cssText = 'display: block; position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;';
      host.appendChild(canvas2d);
      const ctx2d = canvas2d.getContext('2d');

      // CSS2D label renderer
      const labelRenderer = new window.CSS2DRenderer({ element: labelHost });
      labelHost.style.position = 'absolute';
      labelHost.style.inset = '0';
      labelHost.style.pointerEvents = 'none';
      labelHost.style.overflow = 'hidden';

      // OrbitControls bound to host
      let controls = null;
      if (interactive) {
        controls = new window.OrbitControls(camera, host);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.target.set(0, 0, 0);
        controls.maxPolarAngle = Math.PI - 0.2;
        controls.minDistance = 2;
        controls.maxDistance = 40;
        controls.enablePan = false;
        controls.zoomSpeed = 0.6;
      }

      const chrome = new T.Group();
      scene.add(chrome);
      const modelRoot = new T.Group();
      scene.add(modelRoot);
      const overlayRoot = new T.Group();
      scene.add(overlayRoot);
      const handleRoot = new T.Group();
      scene.add(handleRoot);

      const entry = { host, scene, camera, controls, labelRenderer, canvas2d, ctx2d, chrome, modelRoot, overlayRoot, handleRoot };
      stateRef.current = { T, ...entry };
      window.__lastGeoScene = stateRef;
      Surface.addScene(entry);

      // Picking
      const raycaster = new T.Raycaster();
      const mouse = new T.Vector2();
      const onClick = (e) => {
        if (!onSelect) return;
        const rc = host.getBoundingClientRect();
        mouse.x = ((e.clientX - rc.left) / rc.width) * 2 - 1;
        mouse.y = -((e.clientY - rc.top) / rc.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(modelRoot.children, true);
        for (const h of hits) {
          let cur = h.object;
          while (cur && !cur.userData?.kind) cur = cur.parent;
          if (cur && cur.userData?.kind) { onSelect(cur.userData); return; }
        }
      };
      host.addEventListener('click', onClick);

      return () => {
        Surface.removeScene(entry);
        host.removeEventListener('click', onClick);
        if (controls) controls.dispose();
        if (canvas2d.parentNode) canvas2d.parentNode.removeChild(canvas2d);
        scene.traverse((n) => {
          if (n.geometry) n.geometry.dispose?.();
          if (n.material) {
            const m = n.material; if (Array.isArray(m)) m.forEach(mm => mm.dispose?.()); else m.dispose?.();
          }
        });
      };
    }, [window.__threeReady]);

    // Rebuild on model change
    useEffect(() => {
      const st = stateRef.current;
      if (!st || !model) return;
      const T = st.T;
      const disposeNode = (node) => {
        node.traverse?.((n) => {
          if (n.geometry) n.geometry.dispose?.();
          if (n.material) {
            const m = n.material; if (Array.isArray(m)) m.forEach(mm => mm.dispose?.()); else m.dispose?.();
          }
        });
      };
      [st.modelRoot, st.overlayRoot, st.chrome].forEach((g) => {
        while (g.children.length) {
          const c = g.children.pop();
          c.traverse?.((n) => {
            if (n.isCSS2DObject && n.element && n.element.parentNode) {
              n.element.parentNode.removeChild(n.element);
            }
          });
          disposeNode(c);
        }
      });
      const built = window.GeoThree.buildSceneContents(model);
      st.modelRoot.add(built.root);
      st.overlayRoot.add(built.overlays);
      st.chrome.add(window.GeoThree.makeGrid(10, 20));
      st.chrome.add(window.GeoThree.makeNorthArrow(new T.Vector3(0, -3 + 0.01, 0), 0.7));

      // Auto-fit camera to bounds
      const box = new T.Box3().setFromObject(st.modelRoot);
      if (!box.isEmpty()) {
        const size = box.getSize(new T.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = st.camera.fov * (Math.PI / 180);
        const dist = (maxDim * 1.0) / Math.tan(fov / 2) * 0.65 + 2.5;
        const newDist = Math.max(5, Math.min(28, dist));
        // Preserve current azimuth/elevation
        const cur = st.camera.position.clone();
        const len = cur.length() || 1;
        cur.multiplyScalar(newDist / len);
        st.camera.position.copy(cur);
        st.camera.lookAt(0, 0, 0);
        if (st.controls) st.controls.target.set(0, 0, 0);
      }

      st.overlayRoot.visible = showOverlays;
      st.chrome.visible = showGrid;
      st.modelRoot.traverse((n) => { if (n.isCSS2DObject) n.visible = showLabels; });
      st.overlayRoot.traverse((n) => { if (n.isCSS2DObject) n.visible = showOverlays; });
    }, [model]);

    useEffect(() => {
      const st = stateRef.current;
      if (!st) return;
      st.overlayRoot.visible = showOverlays;
      st.chrome.visible = showGrid;
      st.modelRoot.traverse((n) => { if (n.isCSS2DObject) n.visible = showLabels; });
      st.overlayRoot.traverse((n) => { if (n.isCSS2DObject) n.visible = showOverlays; });
    }, [showLabels, showOverlays, showGrid]);

    // Attach / re-attach handle layer when selection or model changes.
    useEffect(() => {
      const st = stateRef.current;
      if (!st || !window.GeoHandles) return;
      const cb = onDragChange || (() => {});
      const cleanup = window.GeoHandles.attachToScene(st, selected, model, cb);
      return cleanup;
    }, [selected, model, onDragChange]);

    return (
      <div
        ref={hostRef}
        className={className}
        style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'none', ...style }}
      >
        <div ref={labelHostRef} />
      </div>
    );
  }

  window.GeoScene = GeoScene;
})();
