// AC3: Inferred values render in amber+dashed; stated values render in standard white.
// Criterion: After clicking the fault event in the inspector,
//   - .field-value.inferred elements exist in the DOM
//   - .field-value elements WITHOUT the inferred class also exist
//   - computed color of a .field-value.inferred contains 245 (for rgb(245,158,11))

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

// Fixture: fault with dip=stated, strike+dip_direction=inferred
const FIXTURE = {
  meta: {
    name: 'Fault with mixed field origins',
    description: 'A normal fault dips 60 degrees east.',
  },
  layers: [
    {
      id: 'L1',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 1.0,
      order: 0,
      description_source: 'A normal fault dips 60 degrees east.',
      field_origin: { thickness: 'inferred', lithology: 'inferred' },
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
      description_source: 'A normal fault dips 60 degrees east.',
      field_origin: {
        strike: 'inferred',
        dip: 'stated',
        dip_direction: 'inferred',
        throw: 'inferred',
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
          console.log('[stub] AC3: returning fault fixture');
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
    await textarea.fill('A normal fault dips 60 degrees east.');
    await page.locator('button.btn.primary').click();
    console.log('Interpret clicked');

    // Wait for events list to appear
    await page.waitForFunction(
      () => {
        const lists = document.querySelectorAll('.feat-list');
        return lists.length >= 2 && lists[1].querySelectorAll('.feat-item').length >= 1;
      },
      { timeout: 15000, polling: 200 }
    );
    console.log('Events list appeared');

    // Click the fault event in the inspector (second feat-list, first item)
    const eventItem = page.locator('.feat-list').nth(1).locator('.feat-item').first();
    await eventItem.click();
    console.log('Clicked fault event in inspector');

    // Wait for .field-value elements to appear (FeatureInspector open)
    await page.waitForSelector('.field-value', { timeout: 10000 });
    console.log('FeatureInspector opened');

    // Verify .field-value.inferred elements exist
    const inferredCount = await page.evaluate(() => {
      return document.querySelectorAll('.field-value.inferred').length;
    });
    console.log(`field-value.inferred count: ${inferredCount}`);
    if (inferredCount < 1) {
      throw new Error(`AC3: Expected at least 1 .field-value.inferred element, got ${inferredCount}`);
    }

    // Verify .field-value elements WITHOUT inferred class also exist
    const statedCount = await page.evaluate(() => {
      return document.querySelectorAll('.field-value:not(.inferred)').length;
    });
    console.log(`field-value (stated) count: ${statedCount}`);
    if (statedCount < 1) {
      throw new Error(`AC3: Expected at least 1 .field-value (stated) element, got ${statedCount}`);
    }

    // Verify the computed color of a .field-value.inferred contains 245 (amber rgb(245,158,11))
    const inferredColor = await page.evaluate(() => {
      const el = document.querySelector('.field-value.inferred');
      if (!el) return null;
      return window.getComputedStyle(el).color;
    });
    console.log(`Inferred field computed color: ${inferredColor}`);
    if (!inferredColor || !inferredColor.includes('245')) {
      throw new Error(
        `AC3: Expected inferred field color to contain 245 (amber rgb(245,158,11)), got "${inferredColor}"`
      );
    }

    console.log('PASS AC3: inferred values amber+dashed, stated values in standard color');

    await page.screenshot({ path: path.join(screenshotDir, 'ac-3-stated-inferred.png'), fullPage: false });

    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC3: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
