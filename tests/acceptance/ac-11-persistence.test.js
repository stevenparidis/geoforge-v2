// AC11: Page refresh restores the last session from localStorage.
// After interpret, reload the page and verify window.__lastModel is restored.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8002;

function getMime(ext) {
  const map = {
    '.html': 'text/html', '.js': 'application/javascript',
    '.jsx': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.woff2': 'font/woff2', '.woff': 'font/woff',
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
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': getMime(ext), 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.listen(PORT, '127.0.0.1', () => { console.log(`Server at http://localhost:${PORT}`); resolve(server); });
    server.on('error', reject);
  });
}

const FIXTURE = {
  meta: { name: 'Persistence Test', description: 'Two layers.' },
  layers: [
    { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 1.0, order: 0,
      description_source: 'sandstone', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L2', name: 'Shale', lithology: 'shale', thickness: 0.8, order: 1,
      description_source: 'shale', field_origin: { thickness: 'stated', lithology: 'stated' } },
  ],
  events: [],
};

async function run() {
  const screenshotDir = path.join(REPO_ROOT, 'tests', 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  let server, browser;
  let exitCode = 0;

  try {
    server = await startServer();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('console', msg => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[browser error] ${err.message}`));

    // Stub claude.complete — runs on every navigation in this context
    await context.addInitScript((fixtureJson) => {
      window.claude = { complete: async () => fixtureJson };
    }, JSON.stringify(FIXTURE));

    // Load the app
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    await page.waitForSelector('button.btn.primary', { timeout: 15000 });

    // Interpret to produce a model
    const textarea = page.locator('textarea.desc-area');
    await textarea.click();
    await textarea.fill('A sandstone layer over a shale layer.');
    await page.locator('button.btn.primary').click();
    console.log('Interpret clicked');

    // Wait for model to load
    await page.waitForFunction(
      () => window.__lastModel && window.__lastModel.layers && window.__lastModel.layers.length >= 2,
      { timeout: 15000, polling: 200 }
    );
    console.log('Model loaded before reload');

    // Reload the page — localStorage should persist
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    console.log('Page reloaded');

    // Wait for React to mount and restore from localStorage
    await page.waitForTimeout(2000);

    // Verify model is restored
    const restored = await page.evaluate(() => {
      const m = window.__lastModel;
      return m ? { layers: m.layers ? m.layers.length : 0 } : null;
    });

    if (!restored) throw new Error('AC11: window.__lastModel is null after reload — localStorage restore failed');
    if (restored.layers < 2) throw new Error(`AC11: Expected >= 2 layers after reload, got ${restored.layers}`);

    console.log(`AC11 PASS: ${restored.layers} layer(s) restored from localStorage after page reload`);

    await page.screenshot({ path: path.join(screenshotDir, 'ac-11-persistence.png'), fullPage: false });
    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC11: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
