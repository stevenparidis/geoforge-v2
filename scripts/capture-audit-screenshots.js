'use strict';

/**
 * GeoForge Phase A.2 — v1 Reference Formation Screenshot Capture
 *
 * Starts a static HTTP server, navigates to the Formation Reference view,
 * and captures overlays-on and overlays-off screenshots for every v1 formation.
 *
 * Output: docs/v2-audit/v1-screenshots/<section>/<id>-overlays-on.png
 *         docs/v2-audit/v1-screenshots/<section>/<id>-overlays-off.png
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPO_ROOT  = path.resolve(__dirname, '..');
const PORT       = 8081;
const OUT_DIR    = path.join(REPO_ROOT, 'docs', 'v2-audit', 'v1-screenshots');

// MIME map (same as smoke test)
function getMime(ext) {
  return ({
    '.html': 'text/html',
    '.js'  : 'application/javascript',
    '.jsx' : 'application/javascript',
    '.css' : 'text/css',
    '.json': 'application/json',
    '.png' : 'image/png',
    '.svg' : 'image/svg+xml',
    '.ico' : 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
  })[ext] || 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// Static file server
// ---------------------------------------------------------------------------

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath  = req.url.split('?')[0];
      // Map root and /index.html → v1-package/index.html.
      // All other requests (e.g. /src/geo-data.jsx) are served from REPO_ROOT as-is.
      let fsPath;
      if (urlPath === '/' || urlPath === '/index.html') {
        fsPath = path.join(REPO_ROOT, 'v1-package', 'index.html');
      } else {
        fsPath = path.join(REPO_ROOT, urlPath);
      }
      const filePath = fsPath;
      const ext      = path.extname(filePath).toLowerCase();

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found: ' + urlPath);
          return;
        }
        res.writeHead(200, {
          'Content-Type': getMime(ext),
          'Cache-Control': 'no-store',
        });
        res.end(data);
      });
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Static server on http://localhost:${PORT}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Formation list (ids + section from geo-data.jsx)
// ---------------------------------------------------------------------------

const FORMATIONS = [
  // layers
  { id: 'horizontal-strata',        section: 'layers'        },
  { id: 'dipping-strata',           section: 'layers'        },
  { id: 'multilayer-thickness',     section: 'layers'        },
  // faults
  { id: 'normal-fault',             section: 'faults'        },
  { id: 'reverse-fault',            section: 'faults'        },
  { id: 'thrust-fault',             section: 'faults'        },
  { id: 'strike-slip-dextral',      section: 'faults'        },
  { id: 'strike-slip-sinistral',    section: 'faults'        },
  { id: 'oblique-slip',             section: 'faults'        },
  { id: 'listric-fault',            section: 'faults'        },
  // folds
  { id: 'anticline',                section: 'folds'         },
  { id: 'syncline',                 section: 'folds'         },
  { id: 'monocline',                section: 'folds'         },
  // intrusions
  { id: 'dyke-basalt',              section: 'intrusions'    },
  { id: 'sill-basalt',              section: 'intrusions'    },
  { id: 'batholith-granite',        section: 'intrusions'    },
  { id: 'laccolith-granite',        section: 'intrusions'    },
  // unconformities
  { id: 'angular-unconformity',     section: 'unconformities'},
  { id: 'disconformity',            section: 'unconformities'},
  { id: 'nonconformity',            section: 'unconformities'},
  // mineralisation
  { id: 'porphyry-cu-au',           section: 'mineralisation'},
  { id: 'orogenic-gold',            section: 'mineralisation'},
  { id: 'vms-deposit',              section: 'mineralisation'},
  { id: 'skarn-deposit',            section: 'mineralisation'},
  { id: 'epithermal-au-ag',         section: 'mineralisation'},
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Wait up to `ms` milliseconds for all WebGL canvases on the page to stop
 * producing new pixel data (heuristic: compare two frames 500 ms apart).
 */
async function waitForRenderSettle(page, ms = 3000) {
  await page.waitForTimeout(ms);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  let server;
  let browser;
  let exitCode = 0;
  const results = [];

  try {
    // Ensure output dirs exist
    for (const f of FORMATIONS) {
      await ensureDir(path.join(OUT_DIR, f.section));
    }

    server  = await startServer();
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 },
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error(`[browser error] ${msg.text()}`);
    });
    page.on('pageerror', (err) => console.error(`[pageerror] ${err.message}`));

    // Inject stub so the app mounts without real Claude API
    await page.addInitScript(() => {
      window.claude = { complete: async () => '{}' };
    });

    // Navigate to the app
    console.log('Loading app…');
    await page.goto(`http://localhost:${PORT}/`, {
      waitUntil: 'domcontentloaded',
    });

    // Wait for Three.js to be ready
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 60000 });
    console.log('Three.js ready');

    // Wait for React to mount
    await page.waitForSelector('button.tab', { timeout: 15000 });
    console.log('React app mounted');

    // Click the "Formation reference" tab
    const refTabBtn = page.locator('button.tab', { hasText: 'Formation reference' });
    await refTabBtn.click();
    console.log('Navigated to Formation reference tab');

    // Wait for at least one ref-card to appear
    await page.waitForSelector('.ref-card', { timeout: 30000 });
    console.log('Formation reference cards rendered');

    // Give the 3D scenes extra time to settle after initial render
    await waitForRenderSettle(page, 4000);
    console.log('Initial render settled');

    // Verify overlays are ON (default state per TWEAK_DEFAULTS)
    // We'll rely on toggling via the Overlays button as needed.

    // ------------------------------------------------------------------
    // Screenshot loop
    // ------------------------------------------------------------------
    for (const formation of FORMATIONS) {
      const { id, section } = formation;
      console.log(`\nCapturing: ${id} (${section})`);

      // Find the card by looking for the ref-card whose canvas has data-id
      // The cards don't have data-id attributes — we match by scrolling to
      // the card within the section that corresponds to the formation.
      // Strategy: evaluate in-browser to find the card index, then scroll to it.

      // Find the card element. The ref-card-title text uniquely identifies it,
      // but since some titles might be ambiguous we also match by section.
      // We inject the formation ID into the search via the ref-section id attribute.
      const cardHandle = await page.evaluateHandle((formationId) => {
        // Each formation renders inside a section whose parent .ref-section
        // exists. We rely on the DOM order matching geo-data.jsx order.
        // We identify the card by its rendered title (from geo-data.jsx).
        // The data we need is in window.GD.REFERENCE_FORMATIONS.
        const formations = window.GD && window.GD.REFERENCE_FORMATIONS;
        if (!formations) return null;
        const entry = formations.find((f) => f.id === formationId);
        if (!entry) return null;

        // Find all ref-card-title elements and match the one whose text equals entry.title
        const titles = document.querySelectorAll('.ref-card-title');
        for (const t of titles) {
          if (t.textContent.trim() === entry.title) {
            return t.closest('.ref-card');
          }
        }
        return null;
      }, id);

      if (!cardHandle || (await cardHandle.evaluate((el) => el === null))) {
        console.warn(`  WARNING: card not found for ${id} — skipping`);
        results.push({ id, section, status: 'card-not-found' });
        await cardHandle.dispose();
        continue;
      }

      // Scroll card into view
      await cardHandle.evaluate((el) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
      await page.waitForTimeout(300);

      // Get bounding box for clipped screenshot
      const box = await cardHandle.boundingBox();
      if (!box) {
        console.warn(`  WARNING: zero bounding box for ${id} — skipping`);
        results.push({ id, section, status: 'no-bounding-box' });
        await cardHandle.dispose();
        continue;
      }

      // Wait for renders inside the card to settle
      await waitForRenderSettle(page, 2500);

      // ---- Overlays ON ----
      const onPath = path.join(OUT_DIR, section, `${id}-overlays-on.png`);
      await page.screenshot({
        path: onPath,
        clip: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width:  box.width,
          height: box.height,
        },
      });
      console.log(`  [overlays ON]  → ${path.relative(REPO_ROOT, onPath)}`);

      // ---- Toggle overlays OFF ----
      const overlaysBtn = page.locator('button.toggle', { hasText: 'Overlays' });
      await overlaysBtn.click();
      await page.waitForTimeout(400); // allow React re-render

      // ---- Overlays OFF ----
      const offPath = path.join(OUT_DIR, section, `${id}-overlays-off.png`);
      await page.screenshot({
        path: offPath,
        clip: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width:  box.width,
          height: box.height,
        },
      });
      console.log(`  [overlays OFF] → ${path.relative(REPO_ROOT, offPath)}`);

      // ---- Toggle overlays back ON ----
      await overlaysBtn.click();
      await page.waitForTimeout(300);

      results.push({ id, section, status: 'ok' });
      await cardHandle.dispose();
    }

    // Full-page screenshot of the entire reference view for archival
    const fullPath = path.join(OUT_DIR, 'full-reference-view.png');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: fullPath, fullPage: true });
    console.log(`\nFull-page reference view → ${path.relative(REPO_ROOT, fullPath)}`);

    await page.close();
    await context.close();

  } catch (err) {
    console.error(`\nFATAL: ${err.message}`);
    console.error(err.stack);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server)  server.close();
  }

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log('\n======= CAPTURE SUMMARY =======');
  let ok = 0, skip = 0;
  for (const r of results) {
    const sym = r.status === 'ok' ? '✓' : '✗';
    console.log(`  ${sym} ${r.section}/${r.id} — ${r.status}`);
    if (r.status === 'ok') ok++; else skip++;
  }
  console.log(`\n  Total: ${ok} captured, ${skip} skipped`);
  console.log('================================\n');

  process.exit(exitCode);
}

run();
