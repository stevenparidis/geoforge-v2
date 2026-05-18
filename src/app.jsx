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

    // Detect test mode — primer is suppressed in smoke tests
    const isTestMode = new URLSearchParams(window.location.search).has('testmode');

    const [showPrimer, setShowPrimer] = useState(() => {
      if (isTestMode) return false;
      return localStorage.getItem('geoforge.primer_seen_v2') !== 'true';
    });

    const handlePrimerDismiss = ({ permanent }) => {
      if (permanent) localStorage.setItem('geoforge.primer_seen_v2', 'true');
      setShowPrimer(false);
    };

    // E.2: Focus mode — dims non-selected features to 30% opacity
    const [focusModeOn, setFocusModeOn] = useState(() => {
      const saved = localStorage.getItem('geoforge.focus_mode_v2');
      return saved === null ? false : saved === 'true';
    });

    const handleFocusModeToggle = () => {
      const next = !focusModeOn;
      setFocusModeOn(next);
      localStorage.setItem('geoforge.focus_mode_v2', String(next));
    };

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
            <button
              className="btn icon"
              onClick={() => setShowPrimer(true)}
              title="Show concept primer"
              style={{ fontSize: 13 }}
            >?</button>
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
            <button className={'toggle' + (focusModeOn ? ' on' : '')} onClick={handleFocusModeToggle}>Focus</button>
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
              focusModeOn={focusModeOn}
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
        {showPrimer && <ConceptPrimer onDismiss={handlePrimerDismiss} />}
      </div>
    );
  }

  function ConceptCard({ title, children }) {
    return (
      <div className="primer-card">
        <div className="primer-card-title">{title}</div>
        <div className="primer-card-body">{children}</div>
      </div>
    );
  }

  function ConceptPrimer({ onDismiss }) {
    return (
      <div className="primer-overlay">
        <div className="primer-modal">
          <h2 className="primer-title">Welcome to GeoForge</h2>
          <p className="primer-lead">A quick orientation before you start. ~1 minute of reading.</p>
          <div className="primer-grid">
            <ConceptCard title="Strike & dip">
              <p>A bedding plane (or fault plane) is described by <strong>strike</strong> and <strong>dip</strong>.</p>
              <ul>
                <li><strong>Strike</strong> is the bearing of the line where the plane meets a horizontal surface (000°–360°).</li>
                <li><strong>Dip</strong> is the angle the plane makes with horizontal (0°–90°).</li>
                <li><strong>Dip direction</strong> is always 90° to the right of strike (right-hand rule).</li>
              </ul>
              <svg className="primer-diagram" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="10" width="100" height="4" fill="#8db4c2" opacity="0.6" transform="rotate(0 10 12)"/>
                <text x="12" y="9" fontSize="9" fill="#8db4c2">strike</text>
                <line x1="60" y1="12" x2="60" y2="65" stroke="#f59e0b" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <text x="63" y="50" fontSize="9" fill="#f59e0b">dip</text>
                <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#f59e0b"/></marker></defs>
              </svg>
            </ConceptCard>
            <ConceptCard title="Hanging wall, footwall">
              <p>Faults divide rock into two blocks. The mnemonic is from miners:</p>
              <ul>
                <li>The <strong>hanging wall</strong> (HW) is the block <em>above</em> the dipping fault plane — where a miner could hang a lantern.</li>
                <li>The <strong>footwall</strong> (FW) is the block <em>below</em> — at the miner's feet.</li>
              </ul>
              <p>The names are not tied to which side of the page the block is on.</p>
              <svg className="primer-diagram" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="20" y1="70" x2="100" y2="10" stroke="#a6adc8" strokeWidth="1.5"/>
                <text x="22" y="40" fontSize="9" fill="#cba6f7">HW</text>
                <text x="70" y="72" fontSize="9" fill="#89b4fa">FW</text>
              </svg>
            </ConceptCard>
            <ConceptCard title="Anticline & syncline">
              <p>Folds are bends in rock. Two basic types:</p>
              <ul>
                <li><strong>Anticline:</strong> an "up-fold." The <strong>oldest</strong> rocks sit in the core.</li>
                <li><strong>Syncline:</strong> a "down-fold." The <strong>youngest</strong> rocks sit in the core.</li>
              </ul>
              <p>The shape alone doesn't tell you — <em>the age sequence does.</em></p>
              <svg className="primer-diagram" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5,60 Q30,15 55,60" stroke="#89b4fa" strokeWidth="1.5" fill="none"/>
                <text x="22" y="75" fontSize="8" fill="#89b4fa">anticline</text>
                <text x="16" y="47" fontSize="7" fill="#a6e3a1">old</text>
                <path d="M65,15 Q90,60 115,15" stroke="#cba6f7" strokeWidth="1.5" fill="none"/>
                <text x="82" y="75" fontSize="8" fill="#cba6f7">syncline</text>
                <text x="85" y="40" fontSize="7" fill="#f59e0b">young</text>
              </svg>
            </ConceptCard>
            <ConceptCard title="Plunge & the V-pattern">
              <p>A fold "plunges" if its hinge line tips into the ground.</p>
              <p>When erosion exposes a plunging fold from above:</p>
              <ul>
                <li><strong>Plunging anticline:</strong> Vs point in the direction of plunge.</li>
                <li><strong>Plunging syncline:</strong> Vs point <em>opposite</em> to the plunge.</li>
              </ul>
              <p>See this in the Map View tab.</p>
              <svg className="primer-diagram" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20,10 L60,65 L100,10" stroke="#89b4fa" strokeWidth="1.5" fill="none"/>
                <text x="45" y="78" fontSize="8" fill="#89b4fa">↓ plunge</text>
                <text x="35" y="8" fontSize="8" fill="#a6adc8">plunging anticline</text>
              </svg>
            </ConceptCard>
          </div>
          <div className="primer-actions">
            <button className="btn" onClick={() => onDismiss({ permanent: false })}>Skip for now</button>
            <button className="btn primary" onClick={() => onDismiss({ permanent: true })}>Got it</button>
          </div>
        </div>
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
