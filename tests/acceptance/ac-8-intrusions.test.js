// AC8: An intrusion description (dyke) produces a GeoModel with an intrusions array
// and the renderer shows the result (canvas non-empty, model stored on window.__lastModel).
// Criterion: After interpret, window.__lastModel.intrusions.length >= 1 (intrusion I1 present);
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
// Fixture: 2 layers + 1 dyke intrusion
// ---------------------------------------------------------------------------
const FIXTURE = {
  meta: {
    name: 'Dyke Test',
    description: 'A basalt dyke cuts the layers.',
  },
  layers: [
    {
      id: 'L1',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 1.0,
      order: 0,
      description_source: 'sandstone',
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
    {
      id: 'L2',
      name: 'Shale',
      lithology: 'shale',
      thickness: 1.0,
      order: 1,
      description_source: 'shale',
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
  ],
  events: [],
  intrusions: [
    {
      id: 'I1',
      subtype: 'dyke',
      rock_type: 'basalt',
      strike: 0,
      dip: 90,
      thickness: 0.5,
      description_source: 'A basalt dyke cuts the layers.',
      field_origin: {
        strike: 'stated',
        dip: 'stated',
        thickness: 'stated',
        rock_type: 'stated',
      },
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
          console.log('[stub] AC8: returning 2-layer + dyke intrusion fixture');
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
    await textarea.fill('A basalt dyke cuts the layers.');

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
    if (layerCount < 2) throw new Error(`AC8: Expected >= 2 layers in inspector, got ${layerCount}`);

    // Verify window.__lastModel has intrusions
    const modelCheck = await page.evaluate(() => {
      const m = window.__lastModel;
      if (!m) return null;
      return {
        layers: m.layers ? m.layers.length : 0,
        intrusions: m.intrusions ? m.intrusions.length : 0,
        intrusionSubtype: m.intrusions && m.intrusions[0] ? m.intrusions[0].subtype : null,
      };
    });

    if (!modelCheck) throw new Error('AC8: window.__lastModel is null after interpret');
    if (modelCheck.layers < 2) throw new Error(`AC8: Expected >= 2 layers in __lastModel, got ${modelCheck.layers}`);
    if (modelCheck.intrusions < 1) throw new Error(`AC8: Expected >= 1 intrusion in __lastModel, got ${modelCheck.intrusions}`);
    if (modelCheck.intrusionSubtype !== 'dyke') throw new Error(`AC8: Expected intrusion subtype 'dyke', got '${modelCheck.intrusionSubtype}'`);

    console.log(`Model: ${modelCheck.layers} layer(s), ${modelCheck.intrusions} intrusion(s) (${modelCheck.intrusionSubtype})`);

    // Verify canvas is present and visible in the DOM
    const canvasVisible = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (!canvasVisible) throw new Error('AC8: Expected a visible canvas element after interpret');

    console.log('PASS AC8: interpret produced model with intrusion (dyke); canvas visible');

    await page.screenshot({ path: path.join(screenshotDir, 'ac-8-intrusions.png'), fullPage: false });

    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC8: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
