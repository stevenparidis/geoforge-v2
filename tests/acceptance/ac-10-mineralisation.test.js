// AC10: A mineralisation description (porphyry Cu-Au) produces a GeoModel with a mineralisation array
// and the renderer shows the result (canvas non-empty, model stored on window.__lastModel).
// Criterion: After interpret, window.__lastModel.mineralisation.length >= 1 (mineralisation M1 present);
//            inspector layers list shows >= 2 items (L1 + L2);
//            canvas is visible and attached to the DOM.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ---------------------------------------------------------------------------
// Static file server (port 8002 — dedicated to acceptance tests)
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8002;

function getMime(ext) {
  const map = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.jsx': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
  };
  return map[ext] || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(REPO_ROOT, urlPath === '/' ? 'index.html' : urlPath);
      const ext = path.extname(filePath).toLowerCase();
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found: ' + urlPath);
          return;
        }
        res.writeHead(200, { 'Content-Type': getMime(ext), 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Static server running at http://localhost:${PORT}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Fixture: 2 layers + 1 porphyry Cu-Au mineralisation
// ---------------------------------------------------------------------------
const FIXTURE = {
  meta: { name: 'Porphyry Test', description: 'A porphyry Cu-Au deposit.' },
  layers: [
    { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 1.0, order: 0,
      description_source: 'sandstone', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L2', name: 'Limestone', lithology: 'limestone', thickness: 0.9, order: 1,
      description_source: 'limestone', field_origin: { thickness: 'stated', lithology: 'stated' } },
  ],
  events: [],
  mineralisation: [
    {
      id: 'M1',
      subtype: 'porphyry',
      metals: 'Cu-Au',
      grade: 0.5,
      alteration_radius: 1.0,
      five_elements: {
        heat_source: 'Porphyritic intrusion',
        fluid_source: 'Magmatic + meteoric water',
        metal_source: 'Magmatic source',
        pathway: 'Stockwork fractures',
        trap: 'Cooling and boiling zone',
      },
      description_source: 'A porphyry copper-gold deposit.',
      field_origin: { metals: 'stated', grade: 'stated', alteration_radius: 'inferred' },
    },
  ],
};

// ---------------------------------------------------------------------------
// Main test
// ---------------------------------------------------------------------------

async function run() {
  const screenshotDir = path.join(REPO_ROOT, 'tests', 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  let server;
  let browser;
  let exitCode = 0;

  try {
    server = await startServer();
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

    await page.addInitScript((fixtureJson) => {
      window.claude = {
        complete: async function () {
          console.log('[stub] AC10: returning 2-layer + porphyry mineralisation fixture');
          return fixtureJson;
        },
      };
    }, JSON.stringify(FIXTURE));

    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

    console.log('Waiting for window.__threeReady...');
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    console.log('Three.js ready');

    await page.waitForSelector('button.btn.primary', { timeout: 15000 });
    console.log('React app mounted');

    const textarea = page.locator('textarea.desc-area');
    await textarea.click();
    await textarea.fill('A porphyry Cu-Au deposit.');

    await page.locator('button.btn.primary').click();
    console.log('Interpret clicked');

    // Wait for the layers feat-list to show at least 2 items (L1 + L2)
    console.log('Waiting for layers inspector list (>= 2 items)...');
    await page.waitForFunction(
      () => {
        const lists = document.querySelectorAll('.feat-list');
        return lists.length >= 1 && lists[0].querySelectorAll('.feat-item').length >= 2;
      },
      { timeout: 15000, polling: 200 }
    );

    const layerCount = await page.evaluate(() => {
      const lists = document.querySelectorAll('.feat-list');
      return lists[0] ? lists[0].querySelectorAll('.feat-item').length : 0;
    });

    console.log(`Inspector: ${layerCount} layer(s)`);
    if (layerCount < 2) throw new Error(`AC10: Expected >= 2 layers in inspector, got ${layerCount}`);

    // Verify window.__lastModel has mineralisation
    const modelCheck = await page.evaluate(() => {
      const m = window.__lastModel;
      if (!m) return null;
      return {
        layers: m.layers ? m.layers.length : 0,
        mineralisation: m.mineralisation ? m.mineralisation.length : 0,
        mineralisationSubtype: m.mineralisation && m.mineralisation[0] ? m.mineralisation[0].subtype : null,
        mineralisationMetals: m.mineralisation && m.mineralisation[0] ? m.mineralisation[0].metals : null,
      };
    });

    if (!modelCheck) throw new Error('AC10: window.__lastModel is null after interpret');
    if (modelCheck.layers < 2) throw new Error(`AC10: Expected >= 2 layers in __lastModel, got ${modelCheck.layers}`);
    if (modelCheck.mineralisation < 1) throw new Error(`AC10: Expected >= 1 mineralisation in __lastModel, got ${modelCheck.mineralisation}`);
    if (modelCheck.mineralisationSubtype !== 'porphyry') throw new Error(`AC10: Expected mineralisation subtype 'porphyry', got '${modelCheck.mineralisationSubtype}'`);
    if (modelCheck.mineralisationMetals !== 'Cu-Au') throw new Error(`AC10: Expected mineralisation metals 'Cu-Au', got '${modelCheck.mineralisationMetals}'`);

    console.log(`Model: ${modelCheck.layers} layer(s), ${modelCheck.mineralisation} mineralisation(s) (${modelCheck.mineralisationSubtype}, ${modelCheck.mineralisationMetals})`);

    // Verify canvas is present and visible in the DOM
    const canvasVisible = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (!canvasVisible) throw new Error('AC10: Expected a visible canvas element after interpret');

    console.log('PASS AC10: interpret produced model with mineralisation (porphyry, Cu-Au); canvas visible');

    await page.screenshot({ path: path.join(screenshotDir, 'ac-10-mineralisation.png'), fullPage: false });

    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC10: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
