// AC5: Playback applies events oldest → most recent.
// Criterion:
//   - .timeline element exists after model loads
//   - .timeline-title shows "2 / 2 events" at final state
//   - After ⏮ (go to start), shows "0 / 2 events"
//   - After step-forward once, shows "1 / 2 events"

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

// 1 fault + 1 fold = 2 events (same as AC1 fixture)
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
      window.claude = { complete: async () => fixtureJson };
    }, JSON.stringify(FIXTURE));

    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

    console.log('Waiting for window.__threeReady...');
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    console.log('Three.js ready');

    await page.waitForSelector('button.btn.primary', { timeout: 15000 });

    await page.locator('textarea.desc-area').fill('A sandstone layer sits below a normal fault and an anticline fold.');
    await page.locator('button.btn.primary').click();
    console.log('Interpret clicked');

    // Wait for model with 2 events
    await page.waitForFunction(
      () => window.__lastModel && window.__lastModel.events && window.__lastModel.events.length >= 2,
      { timeout: 15000, polling: 200 }
    );
    console.log('Model with 2 events loaded');

    // Verify timeline exists
    await page.waitForSelector('.timeline', { timeout: 10000 });
    console.log('.timeline element found');

    // Verify timeline title shows "2 / 2 events" (starts at final state)
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.timeline-title');
        return title && title.textContent.includes('2 / 2 events');
      },
      { timeout: 5000, polling: 200 }
    );
    const titleAtStart = await page.evaluate(() => document.querySelector('.timeline-title')?.textContent);
    console.log(`Timeline title at final state: "${titleAtStart}"`);
    if (!titleAtStart || !titleAtStart.includes('2 / 2 events')) {
      throw new Error(`AC5: Expected "2 / 2 events" in timeline title, got "${titleAtStart}"`);
    }

    // Click "go to start" button (⏮)
    await page.locator('button.step-btn', { hasText: '⏮' }).click();
    console.log('Clicked ⏮ (go to start)');

    // Verify timeline title shows "0 / 2 events"
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.timeline-title');
        return title && title.textContent.includes('0 / 2 events');
      },
      { timeout: 5000, polling: 200 }
    );
    const titleAtZero = await page.evaluate(() => document.querySelector('.timeline-title')?.textContent);
    console.log(`Timeline title at start: "${titleAtZero}"`);
    if (!titleAtZero || !titleAtZero.includes('0 / 2 events')) {
      throw new Error(`AC5: Expected "0 / 2 events" after ⏮, got "${titleAtZero}"`);
    }

    // Click step forward button (4th step-btn, index 3, which is ▶ for stepping forward)
    // The step buttons in order: ⏮ (0), ◀ (1), ▶ play/pause (2), ▶ step-forward (3), ⏭ (4)
    await page.locator('button.step-btn').nth(3).click();
    console.log('Clicked ▶ (step forward, index 3)');

    // Verify timeline title shows "1 / 2 events"
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.timeline-title');
        return title && title.textContent.includes('1 / 2 events');
      },
      { timeout: 5000, polling: 200 }
    );
    const titleAfterStep = await page.evaluate(() => document.querySelector('.timeline-title')?.textContent);
    console.log(`Timeline title after step: "${titleAfterStep}"`);
    if (!titleAfterStep || !titleAfterStep.includes('1 / 2 events')) {
      throw new Error(`AC5: Expected "1 / 2 events" after step forward, got "${titleAfterStep}"`);
    }

    console.log('PASS AC5: history playback works oldest→newest (0→1→2 events)');

    await page.screenshot({ path: path.join(screenshotDir, 'ac-5-history-playback.png'), fullPage: false });

    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC5: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
