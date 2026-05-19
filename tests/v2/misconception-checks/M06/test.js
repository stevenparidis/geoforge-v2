// M06: Intrusion older than host (positive)
// Stub returns a sandstone layer + dyke intrusion with validation_note set.
// Test verifies that clicking the dyke intrusion feat-item reveals .validation-note-pill.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PORT = 8004;
const TEST_ID = 'M06';

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
  meta: { name: 'Intrusion Older Than Host', description: 'A granite dyke that is older than the sandstone it cuts through.' },
  layers: [
    {
      id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 1.0, order: 0,
      description_source: 'A granite dyke that is older than the sandstone it cuts through.',
      field_origin: { thickness: 'inferred', lithology: 'stated' },
    },
  ],
  events: [],
  intrusions: [
    {
      id: 'I1', subtype: 'dyke', lithology: 'granite', order: 2,
      description_source: 'A granite dyke that is older than the sandstone it cuts through.',
      validation_note: 'By the principle of cross-cutting relationships, an intrusion must be younger than the rocks it cuts.',
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
    await textarea.fill('A granite dyke that is older than the sandstone it cuts through.');
    await page.locator('button.btn.primary').click();

    await page.waitForFunction(() => window.__lastModel != null, { timeout: 15000, polling: 200 });

    // Wait for layers feat-list
    await page.waitForFunction(
      () => { const lists = document.querySelectorAll('.feat-list'); return lists.length >= 1 && lists[0].querySelectorAll('.feat-item').length >= 1; },
      { timeout: 15000, polling: 200 }
    );

    // Wait for intrusions feat-list (index 2) with at least 1 item
    await page.waitForFunction(
      () => { const lists = document.querySelectorAll('.feat-list'); return lists.length >= 3 && lists[2].querySelectorAll('.feat-item').length >= 1; },
      { timeout: 15000, polling: 200 }
    );

    // Click the first intrusion feat-item (dyke) to open the inspector
    const intrusionItems = page.locator('.feat-list').nth(2).locator('.feat-item');
    await intrusionItems.first().click();

    await page.waitForSelector('.validation-note-pill', { timeout: 10000 });
    const pillVisible = await page.locator('.validation-note-pill').isVisible();
    if (!pillVisible) throw new Error(`${TEST_ID}: .validation-note-pill not visible after clicking intrusion`);

    console.log(`PASS ${TEST_ID}: .validation-note-pill visible for intrusion older than host misconception`);
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
