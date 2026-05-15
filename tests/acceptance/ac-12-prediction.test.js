// AC12: Prediction mode — clicking Predict produces model.predictions with at least one entry.

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

const MODEL_FIXTURE = {
  meta: { name: 'Prediction Test', description: 'Structural setting for prediction.' },
  layers: [
    { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 1.0, order: 0,
      description_source: 'sandstone', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L2', name: 'Limestone', lithology: 'limestone', thickness: 0.9, order: 1,
      description_source: 'limestone', field_origin: { thickness: 'stated', lithology: 'stated' } },
  ],
  events: [],
};

const PREDICTIONS_FIXTURE = [
  {
    id: 'P1',
    subtype: 'skarn',
    metals: 'Fe-Cu',
    rationale: 'Limestone host rocks adjacent to intrusive contact.',
    confidence: 'high',
    alteration_radius: 0.8,
    predicted: true,
    five_elements: {
      heat_source: 'Intrusion', fluid_source: 'Magmatic', metal_source: 'Magmatic',
      pathway: 'Contact zone', trap: 'Limestone reactive horizon',
    },
  },
];

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

    // Stub: first call returns model fixture, second returns predictions
    await context.addInitScript((modelJson, predictionsJson) => {
      let callCount = 0;
      window.claude = {
        complete: async () => {
          callCount++;
          if (callCount === 1) return modelJson;
          return predictionsJson;
        },
      };
    }, JSON.stringify(MODEL_FIXTURE), JSON.stringify(PREDICTIONS_FIXTURE));

    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    await page.waitForSelector('button.btn.primary', { timeout: 15000 });

    // Interpret first
    const textarea = page.locator('textarea.desc-area');
    await textarea.click();
    await textarea.fill('Two layers: sandstone over limestone.');
    await page.locator('button.btn.primary').click();
    console.log('Interpret clicked');

    await page.waitForFunction(
      () => window.__lastModel && window.__lastModel.layers && window.__lastModel.layers.length >= 2,
      { timeout: 15000, polling: 200 }
    );
    console.log('Base model loaded');

    // Click Predict button
    const predictBtn = page.locator('button:has-text("Predict")');
    await predictBtn.waitFor({ timeout: 10000 });
    await predictBtn.click();
    console.log('Predict clicked');

    // Wait for predictions to appear
    await page.waitForFunction(
      () => window.__lastModel && window.__lastModel.predictions && window.__lastModel.predictions.length >= 1,
      { timeout: 15000, polling: 200 }
    );

    const check = await page.evaluate(() => {
      const m = window.__lastModel;
      return {
        predictions: m.predictions ? m.predictions.length : 0,
        subtype: m.predictions && m.predictions[0] ? m.predictions[0].subtype : null,
        predicted: m.predictions && m.predictions[0] ? m.predictions[0].predicted : false,
      };
    });

    if (check.predictions < 1) throw new Error(`AC12: Expected >= 1 prediction, got ${check.predictions}`);
    if (check.predicted !== true) throw new Error('AC12: Expected prediction.predicted === true');

    console.log(`AC12 PASS: ${check.predictions} prediction(s); subtype=${check.subtype}; predicted=${check.predicted}`);

    await page.screenshot({ path: path.join(screenshotDir, 'ac-12-prediction.png'), fullPage: false });
    await page.close();
    await context.close();
  } catch (err) {
    console.error(`FAIL AC12: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
