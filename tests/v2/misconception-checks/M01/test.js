// M01: Hanging-wall-static (positive)
// Stub returns a normal fault event with validation_note set.
// Test verifies that clicking the event feat-item reveals .validation-note-pill.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PORT = 8004;
const TEST_ID = 'M01';

function getMime(ext) {
  const map = {
    '.html': 'text/html', '.js': 'application/javascript', '.jsx': 'application/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
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
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found: ' + urlPath); return; }
        res.writeHead(200, { 'Content-Type': getMime(ext), 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => { console.log(`Static server running at http://localhost:${PORT}`); resolve(server); });
    server.on('error', reject);
  });
}

const FIXTURE = {
  meta: { name: 'Hanging Wall Static', description: 'A fault dipping 60° east with the hanging wall on the east side.' },
  layers: [
    {
      id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 1.0, order: 0,
      description_source: 'A fault dipping 60° east with the hanging wall on the east side.',
      field_origin: { thickness: 'inferred', lithology: 'inferred' },
    },
  ],
  events: [
    {
      id: 'E1', type: 'fault', subtype: 'normal', strike: 0, dip: 60, dip_direction: 90, throw: 0.5, order: 0,
      description_source: 'A fault dipping 60° east with the hanging wall on the east side.',
      field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'stated', throw: 'inferred' },
      validation_note: 'Hanging wall position is determined by dip direction geometry, not by the stated side. The hanging wall is the block above the fault plane.',
    },
  ],
};

async function run() {
  const screenshotDir = path.join(REPO_ROOT, 'tests', 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  let server, browser, exitCode = 0;
  try {
    server = await startServer();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

    await page.addInitScript((fixtureJson) => {
      window.claude = { complete: async function () { return fixtureJson; } };
    }, JSON.stringify(FIXTURE));

    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    await page.waitForSelector('button.btn.primary', { timeout: 15000 });

    const textarea = page.locator('textarea.desc-area');
    await textarea.click();
    await textarea.fill('A fault dipping 60° east with the hanging wall on the east side.');
    await page.locator('button.btn.primary').click();

    await page.waitForFunction(() => window.__lastModel != null, { timeout: 15000, polling: 200 });

    // Wait for layers feat-list
    await page.waitForFunction(
      () => { const lists = document.querySelectorAll('.feat-list'); return lists.length >= 1 && lists[0].querySelectorAll('.feat-item').length >= 1; },
      { timeout: 15000, polling: 200 }
    );
    // Wait for events feat-list
    await page.waitForFunction(
      () => { const lists = document.querySelectorAll('.feat-list'); return lists.length >= 2 && lists[1].querySelectorAll('.feat-item').length >= 1; },
      { timeout: 15000, polling: 200 }
    );

    // Click the first event feat-item to open the inspector panel
    const eventItems = page.locator('.feat-list').nth(1).locator('.feat-item');
    await eventItems.first().click();

    await page.waitForSelector('.validation-note-pill', { timeout: 10000 });
    const pillVisible = await page.locator('.validation-note-pill').isVisible();
    if (!pillVisible) throw new Error(`${TEST_ID}: .validation-note-pill not visible after clicking event`);

    console.log(`PASS ${TEST_ID}: .validation-note-pill visible for hanging-wall misconception`);
    await page.screenshot({ path: path.join(screenshotDir, `misconception-${TEST_ID}.png`), fullPage: false });
    await page.close(); await context.close();
  } catch (err) {
    console.error(`FAIL ${TEST_ID}: ${err.message}`); exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
  process.exit(exitCode);
}
run();
