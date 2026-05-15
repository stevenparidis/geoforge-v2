// AC9: An unconformity description (angular) produces a GeoModel with an unconformities array
// and the renderer shows the result (canvas non-empty, model stored on window.__lastModel).
// Criterion: After interpret, window.__lastModel.unconformities.length >= 1 (unconformity U1 present);
//            inspector layers list shows >= 3 items (L1 + L2 + L3);
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
// Fixture: 3 layers + 1 angular unconformity
// ---------------------------------------------------------------------------
const FIXTURE = {
  meta: {
    name: 'Unconformity Test',
    description: 'An angular unconformity separates tilted and flat beds.',
  },
  layers: [
    {
      id: 'L1',
      name: 'Old Shale',
      lithology: 'shale',
      thickness: 0.8,
      order: 0,
      description_source: 'old shale',
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
    {
      id: 'L2',
      name: 'Old Sandstone',
      lithology: 'sandstone',
      thickness: 0.8,
      order: 1,
      description_source: 'old sandstone',
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
    {
      id: 'L3',
      name: 'Young Limestone',
      lithology: 'limestone',
      thickness: 0.8,
      order: 2,
      description_source: 'young limestone',
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
  ],
  events: [],
  unconformities: [
    {
      id: 'U1',
      subtype: 'angular',
      above_layer_id: 'L3',
      below_layer_id: 'L2',
      time_gap_ma: 25,
      angular_discordance: 35,
      description_source: 'An angular unconformity.',
      field_origin: { time_gap_ma: 'stated', angular_discordance: 'stated' },
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
          console.log('[stub] AC9: returning 3-layer + angular unconformity fixture');
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
    await textarea.fill('An angular unconformity separates tilted and flat beds.');

    await page.locator('button.btn.primary').click();
    console.log('Interpret clicked');

    // Wait for the layers feat-list to show at least 3 items (L1 + L2 + L3)
    console.log('Waiting for layers inspector list (>= 3 items)...');
    await page.waitForFunction(
      () => {
        const lists = document.querySelectorAll('.feat-list');
        return lists.length >= 1 && lists[0].querySelectorAll('.feat-item').length >= 3;
      },
      { timeout: 15000, polling: 200 }
    );

    const layerCount = await page.evaluate(() => {
      const lists = document.querySelectorAll('.feat-list');
      return lists[0] ? lists[0].querySelectorAll('.feat-item').length : 0;
    });

    console.log(`Inspector: ${layerCount} layer(s)`);
    if (layerCount < 3) throw new Error(`AC9: Expected >= 3 layers in inspector, got ${layerCount}`);

    // Verify window.__lastModel has unconformities
    const modelCheck = await page.evaluate(() => {
      const m = window.__lastModel;
      if (!m) return null;
      return {
        layers: m.layers ? m.layers.length : 0,
        unconformities: m.unconformities ? m.unconformities.length : 0,
        unconformitySubtype: m.unconformities && m.unconformities[0] ? m.unconformities[0].subtype : null,
      };
    });

    if (!modelCheck) throw new Error('AC9: window.__lastModel is null after interpret');
    if (modelCheck.layers < 3) throw new Error(`AC9: Expected >= 3 layers in __lastModel, got ${modelCheck.layers}`);
    if (modelCheck.unconformities < 1) throw new Error(`AC9: Expected >= 1 unconformity in __lastModel, got ${modelCheck.unconformities}`);
    if (modelCheck.unconformitySubtype !== 'angular') throw new Error(`AC9: Expected unconformity subtype 'angular', got '${modelCheck.unconformitySubtype}'`);

    console.log(`Model: ${modelCheck.layers} layer(s), ${modelCheck.unconformities} unconformit(y/ies) (${modelCheck.unconformitySubtype})`);

    // Verify canvas is present and visible in the DOM
    const canvasVisible = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (!canvasVisible) throw new Error('AC9: Expected a visible canvas element after interpret');

    console.log('PASS AC9: interpret produced model with unconformity (angular); canvas visible');

    await page.screenshot({ path: path.join(screenshotDir, 'ac-9-unconformities.png'), fullPage: false });

    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC9: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
