/* GeoForge — App root. Tab routing between Workspace and Reference views. */

(function () {
  const { useState, useEffect } = React;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "labelsOn": true,
    "overlaysOn": true,
    "gridOn": true,
    "amber": "#f59e0b"
  }/*EDITMODE-END*/;

  function App() {
    const [tab, setTab] = useState('workspace'); // Workspace is the primary view; Formation reference is the glossary
    const [model, setModel] = useState(null);
    const [description, setDescription] = useState('');

    const useTweaks = window.useTweaks || ((d) => [d, () => {}]);
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

    useEffect(() => {
      if (t.amber) document.documentElement.style.setProperty('--inferred', t.amber);
    }, [t.amber]);

    const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
    useEffect(() => {
      const handler = () => setViewportWidth(window.innerWidth);
      window.addEventListener('resize', handler);
      return () => window.removeEventListener('resize', handler);
    }, []);

    const [shareToast, setShareToast] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Restore last session from localStorage on mount
    useEffect(() => {
      try {
        const saved = localStorage.getItem('geoforge-session');
        if (saved) {
          const { model: m, description: d } = JSON.parse(saved);
          if (m) setModel(m);
          if (d != null) setDescription(d);
        }
      } catch (e) {}
    }, []);

    // Restore model from URL fragment on mount (share link — takes priority over localStorage)
    useEffect(() => {
      try {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#model=')) {
          const encoded = hash.slice('#model='.length);
          const decoded = JSON.parse(atob(encoded));
          if (decoded.model) setModel(decoded.model);
          if (decoded.description != null) setDescription(decoded.description);
        }
      } catch (e) {}
    }, []);

    // Auto-save session to localStorage whenever model or description changes
    useEffect(() => {
      try {
        localStorage.setItem('geoforge-session', JSON.stringify({ model, description }));
      } catch (e) {}
    }, [model, description]);


    if (viewportWidth < 900) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 32, textAlign: 'center',
          background: 'var(--bg-1, #181825)', color: 'var(--fg-2, #a6adc8)',
          fontFamily: 'var(--sans, sans-serif)', fontSize: 16, lineHeight: 1.6,
        }}>
          <div>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
            <p>GeoForge is desktop-only in v1. Open this page on a screen at least 1024px wide for the full experience.</p>
          </div>
        </div>
      );
    }

    const handleShare = () => {
      if (!model) return;
      const payload = btoa(JSON.stringify({ model, description }));
      const hash = '#model=' + payload;
      window.history.replaceState(null, '', hash);
      const url = window.location.href;
      navigator.clipboard.writeText(url).catch(() => {});
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3000);
    };

    const handleExport = async () => {
      if (exporting) return;
      const sceneRef = window.__lastGeoScene;
      if (!sceneRef || !sceneRef.current || !sceneRef.current.captureFrame) return;
      setExporting(true);
      try {
        const dataUrl = await sceneRef.current.captureFrame();
        if (!dataUrl) return;
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'geoforge-export.png';
        a.click();
      } finally {
        setExporting(false);
      }
    };

    return (
      <div className="app">
        <div className="topbar">
          <div className="brand">
            <div className="mark" />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span>GeoForge</span>
              <span className="brand-sub">v1.0</span>
            </div>
          </div>
          <div className="tabs">
            <button className={'tab' + (tab === 'workspace' ? ' active' : '')} onClick={() => setTab('workspace')}>Workspace</button>
            <button className={'tab' + (tab === 'reference' ? ' active' : '')} onClick={() => setTab('reference')}>Formation reference</button>
          </div>
          <div className="topbar-actions">
            <button className={'toggle' + (t.labelsOn ? ' on' : '')} onClick={() => setTweak('labelsOn', !t.labelsOn)}>Labels</button>
            <button className={'toggle' + (t.overlaysOn ? ' on' : '')} onClick={() => {
              const next = !t.overlaysOn;
              // Apply imperatively to Three.js scene first — before React's render cycle —
              // to keep overlay toggle under the 200 ms performance threshold on large models.
              const sceneRef = window.__lastGeoScene;
              if (sceneRef && sceneRef.current && sceneRef.current.applyVisibility) {
                sceneRef.current.applyVisibility(next, t.labelsOn, t.gridOn);
              }
              setTweak('overlaysOn', next);
            }}>Overlays</button>
            <button className={'toggle' + (t.gridOn ? ' on' : '')} onClick={() => setTweak('gridOn', !t.gridOn)}>Grid</button>
            {model && (
              <button
                onClick={handleShare}
                style={{ fontSize: 13, padding: '4px 10px', background: 'var(--blue, #89b4fa)', color: '#11111b', border: 'none', borderRadius: 4, cursor: 'pointer', marginLeft: 8 }}
              >
                Share
              </button>
            )}
            <button
              className="btn"
              disabled={!model || exporting}
              style={{ opacity: (!model || exporting) ? 0.5 : 1 }}
              onClick={handleExport}
            >
              {exporting ? 'Exporting…' : 'Export PNG'}
            </button>
          </div>
        </div>
        <div className="view">
          {tab === 'workspace' && (
            <window.Workspace
              model={model}
              setModel={setModel}
              description={description}
              setDescription={setDescription}
              showLabels={t.labelsOn}
              showOverlays={t.overlaysOn}
              showGrid={t.gridOn}
            />
          )}
          {tab === 'reference' && (
            <window.ReferenceView
              showLabels={t.labelsOn}
              showOverlays={t.overlaysOn}
            />
          )}
        </div>

        {/* Tweaks panel (self-managing — toggled by toolbar Tweaks button) */}
        {window.TweaksPanel && (
          <window.TweaksPanel title="Tweaks">
            <window.TweakSection title="Default toggles">
              <window.TweakToggle label="Labels on by default" value={t.labelsOn} onChange={(v) => setTweak('labelsOn', v)} />
              <window.TweakToggle label="Overlays on by default" value={t.overlaysOn} onChange={(v) => setTweak('overlaysOn', v)} />
              <window.TweakToggle label="Grid on by default" value={t.gridOn} onChange={(v) => setTweak('gridOn', v)} />
            </window.TweakSection>
            <window.TweakSection title="Inferred-value colour">
              <window.TweakColor
                label="Amber"
                value={t.amber}
                options={['#f59e0b', '#ff7043', '#fde047', '#fb923c']}
                onChange={(v) => setTweak('amber', v)}
              />
            </window.TweakSection>
          </window.TweaksPanel>
        )}
        {shareToast && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-2, #1e1e2e)', color: 'var(--fg-1, #cdd6f4)',
            border: '1px solid var(--green, #a6e3a1)', borderRadius: 8,
            padding: '10px 16px', zIndex: 9999, fontSize: 13, pointerEvents: 'none',
          }}>
            Link copied to clipboard!
          </div>
        )}
      </div>
    );
  }

  function mount() {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  }

  if (window.__threeReady) mount();
  else window.addEventListener('three-ready', mount, { once: true });
})();
