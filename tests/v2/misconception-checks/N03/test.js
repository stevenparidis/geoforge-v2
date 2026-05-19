// N03: Valid anticline correct core (negative)
// Stub returns a valid anticline fold with no validation_note.
// Test verifies that clicking the event feat-item does NOT reveal .validation-note-pill.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PORT = 8004;
const TEST_ID = 'N03';

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
  meta: { name: 'Anticline Valid Core', description: 'An anticline with the oldest rocks in the core, interlimb angle 110°.' },
  layers: [
    {
      id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 1.0, order: 0,
      description_source: 'An anticline with the oldest rocks in the core, interlimb angle 110°.',
      field_origin: { thickness: 'inferred', lithology: 'inferred' },
    },
  ],
  events: [
    {
      id: 'E1', type: 'fold', subtype: 'anticline', axis_strike: 0, plunge: 0, plunge_direction: 0, interlimb_angle: 110, order: 0,
      description_source: 'An anticline with the oldest rocks in the core, interlimb angle 110°.',
      field_origin: { axis_strike: 'inferred', plunge: 'inferred', plunge_direction: 'inferred', interlimb_angle: 'stated' },
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
    await textarea.fill('An anticline with the oldest rocks in the core, interlimb angle 110°.');
    await page.locator('button.btn.primary').click();

    await page.waitForFunction(() => window.__lastModel != null, { timeout: 15000, polling: 200 });

    await page.waitForFunction(
      () => { const lists = document.querySelectorAll('.feat-list'); return lists.length >= 1 && lists[0].querySelectorAll('.feat-item').length >= 1; },
      { timeout: 15000, polling: 200 }
    );
    await page.waitForFunction(
      () => { const lists = document.querySelectorAll('.feat-list'); return lists.length >= 2 && lists[1].querySelectorAll('.feat-item').length >= 1; },
      { timeout: 15000, polling: 200 }
    );

    const eventItems = page.locator('.feat-list').nth(1).locator('.feat-item');
    await eventItems.first().click();

    const pillCount = await page.locator('.validation-note-pill').count();
    if (pillCount > 0) throw new Error(`${TEST_ID}: unexpected .validation-note-pill found (count: ${pillCount})`);

    console.log(`PASS ${TEST_ID}: no .validation-note-pill for valid anticline`);
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
