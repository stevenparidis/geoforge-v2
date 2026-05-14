/* GeoForge — Reference view (Deliverable 2).
 *
 * Static glossary of every geological formation supported in v1. Each card
 * embeds a self-contained 3D scene with all required measurement-origin
 * overlays visible by default. Cards are camera-rotatable.
 */

(function () {
  const { useState } = React;

  function RefCard({ entry, showLabels, showOverlays }) {
    return (
      <div className="ref-card">
        <div className="ref-card-canvas">
          <window.GeoScene
            model={entry.model}
            showLabels={showLabels}
            showOverlays={showOverlays}
            cameraHint={entry.cameraHint}
            interactive={true}
            showGrid={false}
          />
        </div>
        <div className="ref-card-body">
          <div className="ref-card-header">
            <div className="ref-card-title">{entry.title}</div>
            <div className="ref-card-tag">{entry.tag}</div>
          </div>
          <div className="ref-card-caption">{entry.caption}</div>
          <div className="ref-card-overlays">
            <span className="lit">overlays:</span>
            {entry.overlays.join(' · ')}
          </div>
        </div>
      </div>
    );
  }

  function ReferenceView({ showLabels, showOverlays }) {
    const GD = window.GD;
    return (
      <div className="reference">
        <div className="ref-intro">
          <h1>Formation reference</h1>
          <p>
            Every geological structure GeoForge v1 supports, rendered as a self-contained 3D example with its full set of measurement-origin overlays visible. Drag any card to rotate the camera; toggle <span style={{ color: 'var(--accent)', fontFamily: 'var(--kbd)' }}>labels</span> and <span style={{ color: 'var(--accent)', fontFamily: 'var(--kbd)' }}>overlays</span> in the top toolbar to compare clean and pedagogical views.
          </p>
          <p style={{ color: 'var(--fg-3)', fontSize: 12.5, marginTop: 10 }}>
            Inferred values display in <span style={{ color: 'var(--inferred)', borderBottom: '1px dashed var(--inferred)' }}>amber with a dashed underline</span>; stated values display in white. The cyan overlays show the geometric origin of every number.
          </p>
        </div>

        {GD.REFERENCE_SECTIONS.map((sec) => {
          const items = GD.REFERENCE_FORMATIONS.filter((f) => f.section === sec.id);
          return (
            <div key={sec.id} className="ref-section">
              <div className="ref-section-title">
                <span className="num">{sec.num}</span>
                <h2>{sec.title}</h2>
                <span className="blurb">{sec.blurb}</span>
              </div>
              <div className="ref-grid">
                {items.map((entry) => (
                  <RefCard
                    key={entry.id}
                    entry={entry}
                    showLabels={showLabels}
                    showOverlays={showOverlays}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  window.ReferenceView = ReferenceView;
})();
