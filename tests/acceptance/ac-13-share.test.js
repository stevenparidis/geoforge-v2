// AC13: Share via URL — navigating to a URL with #model=<base64> restores the model.

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

const FIXTURE_MODEL = {
  meta: { name: 'Share Test', description: 'Shared model.' },
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

    // Stub claude.complete — no-op since model comes from URL
    await context.addInitScript(() => {
      window.claude = { complete: async () => '{}' };
    });

    // Build the share URL with base64-encoded model
    const payload = Buffer.from(JSON.stringify({ model: FIXTURE_MODEL, description: 'Shared model.' })).toString('base64');
    const shareUrl = `http://localhost:${PORT}/index.html#model=${payload}`;

    await page.goto(shareUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    console.log('Three.js ready');

    // Wait for model to be set from URL fragment
    await page.waitForFunction(
      () => window.__lastModel && window.__lastModel.layers && window.__lastModel.layers.length >= 2,
      { timeout: 15000, polling: 200 }
    );

    const check = await page.evaluate(() => {
      const m = window.__lastModel;
      return m ? { layers: m.layers ? m.layers.length : 0, name: m.meta ? m.meta.name : null } : null;
    });

    if (!check) throw new Error('AC13: window.__lastModel is null after share URL navigation');
    if (check.layers < 2) throw new Error(`AC13: Expected >= 2 layers from share URL, got ${check.layers}`);

    console.log(`AC13 PASS: ${check.layers} layer(s) restored from share URL (model: ${check.name})`);

    await page.screenshot({ path: path.join(screenshotDir, 'ac-13-share.png'), fullPage: false });
    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC13: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
