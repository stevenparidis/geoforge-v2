/* GeoForge — Section math utilities (Phase F.6)
 *
 * Pure JS, no JSX/Babel needed. Exposes window.SectionMath.
 */

window.SectionMath = (function () {

  function averageBearing(bearings) {
    // bearings are circular; convert to unit vectors, average, convert back
    let x = 0, y = 0;
    for (const b of bearings) {
      const rad = b * Math.PI / 180;
      x += Math.cos(rad);
      y += Math.sin(rad);
    }
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  function computeSectionStrike(model, selectedId) {
    if (selectedId) {
      const event = (model.events || []).find(e => e.id === selectedId);
      if (event && event.strike != null) return (event.strike + 90) % 360;
      const intr = (model.intrusions || []).find(i => i.id === selectedId);
      if (intr && intr.strike != null) return (intr.strike + 90) % 360;
    }
    const strikes = [];
    for (const e of (model.events || [])) {
      if (e.strike != null) strikes.push(e.strike);
    }
    if (strikes.length === 0) return 90; // E-W section default
    return averageBearing(strikes);
  }

  function computeModelBounds(model) {
    // Returns { cx, cy, cz, depth } for camera positioning.
    // v1 uses a center-anchored coordinate system: y runs from -totalHeight/2 to +totalHeight/2.
    const layers = model.layers || [];
    const totalH = layers.reduce((s, l) => s + (l.thickness || 1), 0);
    return {
      cx: 0,
      cy: 0,
      cz: 0,
      depth: 4.2, // matches half-width constant used in three-helpers.jsx (halfW = 2.1)
      totalHeight: totalH
    };
  }

  return { averageBearing, computeSectionStrike, computeModelBounds };
})();
