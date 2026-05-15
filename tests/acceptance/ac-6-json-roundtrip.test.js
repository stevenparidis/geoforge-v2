// AC6: Download then re-upload restores both description and 3D state.
// Criterion:
//   - After interpret, capture model + description
//   - Construct roundtrip JSON { version: '1.0', description, model }
//   - Reset (model cleared)
//   - Upload the JSON
//   - Verify model restored (same layer/event counts)
//   - Verify textarea description restored

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

const DESCRIPTION = 'A sandstone layer sits below a normal fault and an anticline fold.';

const FIXTURE = {
  meta: { name: 'Layer, Fault, and Fold', description: DESCRIPTION },
  layers: [
    {
      id: 'L1',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 1.0,
      order: 0,
      description_source: DESCRIPTION,
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
      description_source: DESCRIPTION,
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
      description_source: DESCRIPTION,
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
      window.claude = { complete: async () => fixtureJson };
    }, JSON.stringify(FIXTURE));

    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

    console.log('Waiting for window.__threeReady...');
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    console.log('Three.js ready');

    await page.waitForSelector('button.btn.primary', { timeout: 15000 });

    const textarea = page.locator('textarea.desc-area');
    await textarea.fill(DESCRIPTION);
    await page.locator('button.btn.primary').click();
    console.log('Interpret clicked');

    // Wait for model to load
    await page.waitForFunction(
      () => window.__lastModel && window.__lastModel.events && window.__lastModel.events.length >= 2,
      { timeout: 15000, polling: 200 }
    );
    console.log('Model loaded');

    // Capture the current model and description
    const capturedState = await page.evaluate(() => {
      return {
        model: JSON.parse(JSON.stringify(window.__lastModel)),
        description: document.querySelector('textarea.desc-area')?.value || '',
      };
    });
    console.log(`Captured: ${capturedState.model.layers.length} layers, ${capturedState.model.events.length} events`);
    console.log(`Captured description: "${capturedState.description.slice(0, 60)}..."`);

    const originalLayerCount = capturedState.model.layers.length;
    const originalEventCount = capturedState.model.events.length;
    const originalDescription = capturedState.description;

    // Construct roundtrip JSON
    const roundtripData = {
      version: '1.0',
      description: originalDescription,
      model: capturedState.model,
    };

    // Click Reset button (second button in .panel-footer, text "Reset")
    const resetBtn = page.locator('.panel-footer button.btn:not(.primary)');
    await resetBtn.click();
    console.log('Reset clicked');

    // Wait for model to clear
    await page.waitForFunction(
      () => window.__lastModel === null || window.__lastModel === undefined,
      { timeout: 5000, polling: 100 }
    );
    console.log('Model cleared after Reset');

    // Upload the roundtrip JSON file
    await page.setInputFiles(
      'input.visually-hidden[type="file"]',
      {
        name: 'test.geoforge.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(roundtripData)),
      }
    );
    console.log('Uploaded roundtrip JSON');

    // Wait for model to be restored
    await page.waitForFunction(
      () => window.__lastModel !== null && window.__lastModel !== undefined,
      { timeout: 10000, polling: 200 }
    );
    console.log('Model restored after upload');

    // Verify layer and event counts match
    const restoredState = await page.evaluate(() => {
      const m = window.__lastModel;
      return {
        layers: m ? (m.layers ? m.layers.length : 0) : 0,
        events: m ? (m.events ? m.events.length : 0) : 0,
        description: document.querySelector('textarea.desc-area')?.value || '',
      };
    });

    console.log(`Restored: ${restoredState.layers} layers, ${restoredState.events} events`);
    console.log(`Restored description: "${restoredState.description.slice(0, 60)}..."`);

    if (restoredState.layers !== originalLayerCount) {
      throw new Error(
        `AC6: Layer count mismatch — expected ${originalLayerCount}, got ${restoredState.layers}`
      );
    }
    if (restoredState.events !== originalEventCount) {
      throw new Error(
        `AC6: Event count mismatch — expected ${originalEventCount}, got ${restoredState.events}`
      );
    }
    if (restoredState.description !== originalDescription) {
      throw new Error(
        `AC6: Description mismatch after upload.\n  Expected: "${originalDescription}"\n  Got: "${restoredState.description}"`
      );
    }

    console.log('PASS AC6: JSON roundtrip restores model and description correctly');

    await page.screenshot({ path: path.join(screenshotDir, 'ac-6-json-roundtrip.png'), fullPage: false });

    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC6: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
