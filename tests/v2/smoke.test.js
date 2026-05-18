// GeoForge v2 smoke tests — Phase B features
// Tests:
//   B.age  — Age badges (numbered circles) and younging arrow on a multi-layer model
//   B.hwfw — HW/FW colour-coded labels on a fault model
//
// Runs its own static HTTP server on port 8001 to avoid colliding with the
// v1 smoke tests (port 8000).

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ---------------------------------------------------------------------------
// Static file server
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8001;

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
        res.writeHead(200, {
          'Content-Type': getMime(ext),
          'Cache-Control': 'no-store',
        });
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
// Fixtures
// ---------------------------------------------------------------------------

// Two-layer layers-only model for B.age test
const LAYERS_FIXTURE = {
  meta: { name: 'Two Layers', description: 'A 1m sandstone over 1m shale.' },
  layers: [
    {
      id: 'L1',
      name: 'Shale',
      lithology: 'shale',
      thickness: 1,
      order: 0,
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
    {
      id: 'L2',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 1,
      order: 1,
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
  ],
  events: [],
};

// Single-fault model for B.hwfw test
const FAULT_FIXTURE = {
  meta: { name: 'Normal Fault', description: 'A normal fault dips 60° east.' },
  layers: [
    {
      id: 'L1',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 2,
      order: 0,
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
      throw: 1,
      heave: 0.5,
      order: 0,
      description_source: 'A normal fault dips 60° east.',
      field_origin: {
        strike: 'inferred',
        dip: 'stated',
        dip_direction: 'inferred',
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------

async function run() {
  const screenshotDir = path.join(REPO_ROOT, 'tests', 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  let server;
  let browser;
  let exitCode = 0;

  try {
    server = await startServer();
    browser = await chromium.launch({ headless: true });

    // -----------------------------------------------------------------------
    // Test B.age — Age badges and younging arrow on multi-layer model
    //
    //   1. Load a 2-layer layers-only model
    //   2. Wait for Three.js ready and CSS2D rendering to settle
    //   3. Assert: at least one age-sequence badge (numbered circle with
    //      border-radius:50%) containing text "1" is in the DOM
    //   4. Assert: at least one element with text "YOUNGING" is in the DOM
    // -----------------------------------------------------------------------
    console.log('\n=== Test B.age: age badges and younging arrow ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = {
          complete: async function () {
            console.log('[stub] returning layers fixture');
            return fixtureJson;
          },
        };
      }, JSON.stringify(LAYERS_FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

      console.log('Waiting for window.__threeReady...');
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      console.log('Three.js ready');

      await page.waitForSelector('button.btn.primary', { timeout: 15000 });
      console.log('React app mounted');

      // Type description and interpret
      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('A 1m sandstone over 1m shale.');

      await page.locator('button.btn.primary').click();
      console.log('Interpret button clicked');

      // Wait for model to load in inspector
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          return lists.length >= 1 && lists[0].querySelectorAll('.feat-item').length >= 2;
        },
        { timeout: 15000, polling: 200 }
      );
      console.log('Model appeared in inspector');

      // Allow CSS2D rendering to settle
      await page.waitForTimeout(500);

      // Assert: YOUNGING label exists in DOM
      console.log('Checking for YOUNGING label...');
      await page.waitForFunction(
        () => {
          return Array.from(document.querySelectorAll('*')).some(
            (el) => el.textContent.trim() === 'YOUNGING'
          );
        },
        { timeout: 5000 }
      );
      console.log('YOUNGING label found');

      // Assert: age badge "1" (circle with border-radius:50%) exists
      console.log('Checking for age badge "1"...');
      const hasBadge = await page.evaluate(() =>
        Array.from(document.querySelectorAll('*')).some(
          (el) =>
            el.textContent.trim() === '1' &&
            el.style.borderRadius &&
            el.style.borderRadius.includes('50%')
        )
      );
      if (!hasBadge) {
        throw new Error('Test B.age: Expected an age-sequence badge with text "1" and border-radius:50%, but none found');
      }
      console.log('Age badge "1" found');

      console.log('PASS [Test B.age]: YOUNGING label and age badge confirmed in DOM');

      const screenshotPath = path.join(screenshotDir, 'smoke-b-age.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to ${screenshotPath}`);

      await page.close();
      await context.close();
    }

    // -----------------------------------------------------------------------
    // Test B.hwfw — HW/FW labels on fault model
    //
    //   1. Load a single-fault model
    //   2. Wait for Three.js ready and CSS2D rendering to settle
    //   3. Assert: at least 2 elements with class "hwfw-label" exist
    //   4. Assert: one contains "HW" and another contains "FW"
    // -----------------------------------------------------------------------
    console.log('\n=== Test B.hwfw: HW/FW labels on fault model ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = {
          complete: async function () {
            console.log('[stub] returning fault fixture');
            return fixtureJson;
          },
        };
      }, JSON.stringify(FAULT_FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

      console.log('Waiting for window.__threeReady...');
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      console.log('Three.js ready');

      await page.waitForSelector('button.btn.primary', { timeout: 15000 });
      console.log('React app mounted');

      // Type description and interpret
      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('A normal fault dips 60° east.');

      await page.locator('button.btn.primary').click();
      console.log('Interpret button clicked');

      // Wait for fault model to load in inspector
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          if (lists.length < 2) return false;
          return lists[1].querySelectorAll('.feat-item').length >= 1;
        },
        { timeout: 15000, polling: 200 }
      );
      console.log('Fault model appeared in inspector');

      // Allow CSS2D rendering to settle
      await page.waitForTimeout(500);

      // Assert: two hwfw-label elements exist, one HW, one FW
      console.log('Checking for HW/FW labels...');
      const hwfwLabels = await page.evaluate(() => {
        const els = document.querySelectorAll('.hwfw-label');
        return Array.from(els).map((el) => el.textContent.trim());
      });

      console.log(`hwfw-label elements found: ${hwfwLabels.length} — ${JSON.stringify(hwfwLabels)}`);

      if (hwfwLabels.length < 2) {
        throw new Error(`Test B.hwfw: Expected 2 hwfw-label elements, got ${hwfwLabels.length}`);
      }
      if (!hwfwLabels.some((t) => t.includes('HW'))) {
        throw new Error('Test B.hwfw: No HW label found');
      }
      if (!hwfwLabels.some((t) => t.includes('FW'))) {
        throw new Error('Test B.hwfw: No FW label found');
      }

      console.log('PASS [Test B.hwfw]: HW and FW labels confirmed in DOM');

      const screenshotPath = path.join(screenshotDir, 'smoke-b-hwfw.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to ${screenshotPath}`);

      await page.close();
      await context.close();
    }

  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
