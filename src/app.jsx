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

    return (
      <div className="app">
        <div className="topbar">
          <div className="brand">
            <div className="mark" />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span>GeoForge</span>
              <span className="brand-sub">v1 · prototype</span>
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
