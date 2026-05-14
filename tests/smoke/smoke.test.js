// window.claude.complete is only available in the Claude sandbox runtime.
// This test injects a stub via page.addInitScript() that returns a known 2-layer
// fixture so the interpretation pipeline can be exercised without the real LLM.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ---------------------------------------------------------------------------
// Static file server
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8000;

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
      // Strip query string
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
// Stub fixture — 2-layer GeoModel matching the test description
// ---------------------------------------------------------------------------
// "A 1 m thick sandstone layer sits on top of a 0.8 m shale layer."
// Layer order: 0 = bottom (shale), 1 = top (sandstone) — matching GeoForge schema.
const FIXTURE = {
  meta: {
    name: 'Sandstone over Shale',
    description: 'A 1 m thick sandstone layer sits on top of a 0.8 m shale layer.',
  },
  layers: [
    {
      id: 'L1',
      name: 'Shale',
      lithology: 'shale',
      thickness: 0.8,
      order: 0,
      description_source: 'A 1 m thick sandstone layer sits on top of a 0.8 m shale layer.',
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
    {
      id: 'L2',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 1.0,
      order: 1,
      description_source: 'A 1 m thick sandstone layer sits on top of a 0.8 m shale layer.',
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
  ],
  events: [],
};

// ---------------------------------------------------------------------------
// Main test
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
    // 1. Start static file server
    server = await startServer();

    // 2. Launch headless Chromium
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture console output for debugging
    page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

    // 3. Inject stub BEFORE the page loads (addInitScript runs before any page scripts)
    await page.addInitScript((fixtureJson) => {
      window.claude = {
        complete: async function (promptObj) {
          // Test stub — returns a 2-layer fixture regardless of prompt content
          console.log('[stub] window.claude.complete called — returning fixture');
          return fixtureJson;
        },
      };
    }, JSON.stringify(FIXTURE));

    // Navigate to the app
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

    // 4. Wait for window.__threeReady === true (Three.js loads as an ES module)
    console.log('Waiting for window.__threeReady...');
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    console.log('Three.js ready');

    // Also wait for the React app to mount — the Interpret button should appear
    await page.waitForSelector('button.btn.primary', { timeout: 15000 });
    console.log('React app mounted');

    // 5. Type into the description textarea
    const description = 'A 1 m thick sandstone layer sits on top of a 0.8 m shale layer.';
    const textarea = page.locator('textarea.desc-area');
    await textarea.click();
    await textarea.fill(description);
    console.log('Description typed');

    // 6. Click the Interpret button
    const interpretBtn = page.locator('button.btn.primary');
    await interpretBtn.click();
    console.log('Interpret button clicked');

    // 7. Wait up to 15 seconds for the interpretation to complete.
    //    We poll for .feat-item elements inside the inspector's feat-list,
    //    which only appear after setModel() is called with the parsed fixture.
    console.log('Waiting for model to appear in inspector...');
    await page.waitForFunction(
      () => {
        const layersList = document.querySelector('.feat-list');
        return layersList && layersList.querySelectorAll('.feat-item').length >= 2;
      },
      { timeout: 15000, polling: 200 }
    );
    console.log('Model appeared in inspector');

    // 8. Read window state / DOM to confirm layers.length === 2
    const layerCount = await page.evaluate(() => {
      // The first .feat-list in the inspector is the Layers list.
      const layersList = document.querySelector('.feat-list');
      return layersList ? layersList.querySelectorAll('.feat-item').length : 0;
    });

    console.log(`Layer items in DOM: ${layerCount}`);
    if (layerCount !== 2) {
      throw new Error(`Expected 2 layer items in the inspector, got ${layerCount}`);
    }
    console.log('PASS: 2 layers confirmed in the model');

    // 9. Take a screenshot
    const screenshotPath = path.join(screenshotDir, 'smoke-0.3.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved to ${screenshotPath}`);

  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  // 10. Exit with appropriate code
  process.exit(exitCode);
}

run();
