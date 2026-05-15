// AC1: A plain-English description containing at least one layer, one fault,
// and one simple fold produces a 3D model.
// Criterion: After interpret, inspector shows 1 layer item + 2 event items;
//            window.__lastModel has .layers.length >= 1 and .events.length >= 2.

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
// Fixture: 1 sandstone layer + 1 normal fault + 1 anticline fold
// ---------------------------------------------------------------------------
const FIXTURE = {
  meta: {
    name: 'Layer, Fault, and Fold',
    description: 'A sandstone layer sits below a normal fault and an anticline fold.',
  },
  layers: [
    {
      id: 'L1',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 1.0,
      order: 0,
      description_source: 'A sandstone layer sits below a normal fault and an anticline fold.',
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
  ],
  events: [
    {
      id: 'E1',
      type: 'fault',
      subtype: 'normal',
      strike: 0,
      dip: 60,
      dip_direction: 90,
      throw: 0.5,
      order: 0,
      description_source: 'A sandstone layer sits below a normal fault and an anticline fold.',
      field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'inferred', throw: 'inferred' },
    },
    {
      id: 'E2',
      type: 'fold',
      subtype: 'anticline',
      axis_strike: 0,
      plunge: 0,
      plunge_direction: 0,
      interlimb_angle: 110,
      order: 1,
      description_source: 'A sandstone layer sits below a normal fault and an anticline fold.',
      field_origin: {
        axis_strike: 'inferred',
        plunge: 'inferred',
        plunge_direction: 'inferred',
        interlimb_angle: 'inferred',
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
          console.log('[stub] AC1: returning layer+fault+fold fixture');
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
    await textarea.fill('A sandstone layer sits below a normal fault and an anticline fold.');

    await page.locator('button.btn.primary').click();
    console.log('Interpret clicked');

    // Wait for the layers feat-list to show 1 item
    console.log('Waiting for layers inspector list...');
    await page.waitForFunction(
      () => {
        const lists = document.querySelectorAll('.feat-list');
        return lists.length >= 1 && lists[0].querySelectorAll('.feat-item').length >= 1;
      },
      { timeout: 15000, polling: 200 }
    );

    // Wait for the events feat-list to show 2 items
    console.log('Waiting for events inspector list...');
    await page.waitForFunction(
      () => {
        const lists = document.querySelectorAll('.feat-list');
        return lists.length >= 2 && lists[1].querySelectorAll('.feat-item').length >= 2;
      },
      { timeout: 15000, polling: 200 }
    );

    const counts = await page.evaluate(() => {
      const lists = document.querySelectorAll('.feat-list');
      return {
        layers: lists[0] ? lists[0].querySelectorAll('.feat-item').length : 0,
        events: lists[1] ? lists[1].querySelectorAll('.feat-item').length : 0,
      };
    });

    console.log(`Inspector: ${counts.layers} layer(s), ${counts.events} event(s)`);
    if (counts.layers < 1) throw new Error(`AC1: Expected >= 1 layer in inspector, got ${counts.layers}`);
    if (counts.events < 2) throw new Error(`AC1: Expected >= 2 events in inspector, got ${counts.events}`);

    const modelCheck = await page.evaluate(() => {
      const m = window.__lastModel;
      if (!m) return null;
      return { layers: m.layers ? m.layers.length : 0, events: m.events ? m.events.length : 0 };
    });

    if (!modelCheck) throw new Error('AC1: window.__lastModel is null after interpret');
    if (modelCheck.layers < 1) throw new Error(`AC1: Expected >= 1 layer in __lastModel, got ${modelCheck.layers}`);
    if (modelCheck.events < 2) throw new Error(`AC1: Expected >= 2 events in __lastModel, got ${modelCheck.events}`);

    console.log('PASS AC1: interpret produced model with layers + fault + fold');

    await page.screenshot({ path: path.join(screenshotDir, 'ac-1-interpret.png'), fullPage: false });

    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC1: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
