// AC7: Fresh model loads with labels and overlays on, demonstrating the measurement-origin principle.
// Criterion (no interpret, just page load):
//   - Labels toggle has class 'on' (first toggle)
//   - Overlays toggle has class 'on' (second toggle)
//   - Grid toggle has class 'on' (third toggle)
//   - Empty state shown (.empty element exists OR "No model yet" text present)
//   - window.__lastModel === null

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

    // Inject a stub (required for the app to mount, but we won't call interpret)
    await page.addInitScript(() => {
      window.claude = { complete: async () => '{}' };
    });

    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

    console.log('Waiting for window.__threeReady...');
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    console.log('Three.js ready');

    await page.waitForSelector('button.btn.primary', { timeout: 15000 });
    console.log('React app mounted (no interpret)');

    // Check Labels toggle (index 0) has class 'on'
    const labelsOn = await page.evaluate(() => {
      const toggles = document.querySelectorAll('button.toggle');
      if (toggles.length < 1) return null;
      return toggles[0].classList.contains('on');
    });
    console.log(`Labels toggle 'on': ${labelsOn}`);
    if (labelsOn !== true) {
      throw new Error(`AC7: Expected Labels toggle to have class 'on' by default, got ${labelsOn}`);
    }

    // Check Overlays toggle (index 1) has class 'on'
    const overlaysOn = await page.evaluate(() => {
      const toggles = document.querySelectorAll('button.toggle');
      if (toggles.length < 2) return null;
      return toggles[1].classList.contains('on');
    });
    console.log(`Overlays toggle 'on': ${overlaysOn}`);
    if (overlaysOn !== true) {
      throw new Error(`AC7: Expected Overlays toggle to have class 'on' by default, got ${overlaysOn}`);
    }

    // Check Grid toggle (index 2) has class 'on'
    const gridOn = await page.evaluate(() => {
      const toggles = document.querySelectorAll('button.toggle');
      if (toggles.length < 3) return null;
      return toggles[2].classList.contains('on');
    });
    console.log(`Grid toggle 'on': ${gridOn}`);
    if (gridOn !== true) {
      throw new Error(`AC7: Expected Grid toggle to have class 'on' by default, got ${gridOn}`);
    }

    // Check empty state — .empty element exists OR "No model yet" text present
    const emptyState = await page.evaluate(() => {
      const emptyEl = document.querySelector('.empty');
      const bodyText = document.body.innerText || '';
      return {
        hasEmptyEl: !!emptyEl,
        hasNoModelText: bodyText.includes('No model yet'),
      };
    });
    console.log(`Empty state: hasEmptyEl=${emptyState.hasEmptyEl}, hasNoModelText=${emptyState.hasNoModelText}`);
    if (!emptyState.hasEmptyEl && !emptyState.hasNoModelText) {
      throw new Error('AC7: Expected empty state (.empty element or "No model yet" text) but found neither');
    }

    // Verify window.__lastModel === null
    const lastModel = await page.evaluate(() => window.__lastModel);
    console.log(`window.__lastModel: ${lastModel}`);
    if (lastModel !== null && lastModel !== undefined) {
      throw new Error(`AC7: Expected window.__lastModel to be null on fresh load, got ${JSON.stringify(lastModel)}`);
    }

    console.log('PASS AC7: fresh page has all toggles on, empty state shown, no model');

    await page.screenshot({ path: path.join(screenshotDir, 'ac-7-default-state.png'), fullPage: false });

    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC7: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
