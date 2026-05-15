// AC2: Every measurement has its geometric-origin overlay (overlays render by default).
// Criterion: After model loads, overlayRoot.visible === true, overlayRoot.children.length >= 1,
//            and the Overlays toggle button has class 'on'.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

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

// Use the AC1 fixture (1 layer + 1 fault + 1 fold)
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
          console.log('[stub] AC2: returning fixture');
          return fixtureJson;
        },
      };
    }, JSON.stringify(FIXTURE));

    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

    console.log('Waiting for window.__threeReady...');
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    console.log('Three.js ready');

    await page.waitForSelector('button.btn.primary', { timeout: 15000 });

    const textarea = page.locator('textarea.desc-area');
    await textarea.click();
    await textarea.fill('A sandstone layer sits below a normal fault and an anticline fold.');
    await page.locator('button.btn.primary').click();
    console.log('Interpret clicked');

    // Wait for model to load
    await page.waitForFunction(
      () => window.__lastModel !== null && window.__lastModel !== undefined,
      { timeout: 15000, polling: 200 }
    );
    console.log('Model loaded');

    // Wait for __lastGeoScene to be available with overlayRoot
    await page.waitForFunction(
      () => {
        const ref = window.__lastGeoScene;
        return ref && ref.current && ref.current.overlayRoot;
      },
      { timeout: 15000, polling: 200 }
    );
    console.log('GeoScene ref available');

    // Allow a moment for overlay geometry to populate
    await page.waitForTimeout(1000);

    // Check overlayRoot.visible
    const overlayVisible = await page.evaluate(() => {
      const ref = window.__lastGeoScene;
      if (!ref || !ref.current || !ref.current.overlayRoot) return null;
      return ref.current.overlayRoot.visible;
    });

    console.log(`overlayRoot.visible: ${overlayVisible}`);
    if (overlayVisible !== true) {
      throw new Error(`AC2: Expected overlayRoot.visible === true, got ${overlayVisible}`);
    }

    // Check overlayRoot has children
    const childCount = await page.evaluate(() => {
      const ref = window.__lastGeoScene;
      if (!ref || !ref.current || !ref.current.overlayRoot) return -1;
      return ref.current.overlayRoot.children.length;
    });

    console.log(`overlayRoot.children.length: ${childCount}`);
    if (childCount < 1) {
      throw new Error(`AC2: Expected overlayRoot.children.length >= 1, got ${childCount}`);
    }

    // Check the Overlays toggle button has class 'on'
    // The toggles are: Labels (index 0), Overlays (index 1), Grid (index 2)
    const overlaysToggleOn = await page.evaluate(() => {
      const toggles = document.querySelectorAll('button.toggle');
      if (toggles.length < 2) return null;
      return toggles[1].classList.contains('on');
    });

    console.log(`Overlays toggle has 'on' class: ${overlaysToggleOn}`);
    if (overlaysToggleOn !== true) {
      throw new Error(`AC2: Expected Overlays toggle to have class 'on', got ${overlaysToggleOn}`);
    }

    console.log('PASS AC2: overlays visible by default, overlayRoot has children, toggle is on');

    await page.screenshot({ path: path.join(screenshotDir, 'ac-2-overlays.png'), fullPage: false });

    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC2: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
