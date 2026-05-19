'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PORT = 8003;
const SCENARIO_ID = 'M02';

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

const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected-model.json'), 'utf8'));

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
    await textarea.fill('An orogenic gold deposit hosted in a shear zone with quartz veins.');
    await page.locator('button.btn.primary').click();

    await page.waitForFunction(() => window.__lastModel != null, { timeout: 15000, polling: 200 });

    const model = await page.evaluate(() => window.__lastModel);
    if (!model) throw new Error(`FAIL ${SCENARIO_ID}: window.__lastModel is null`);
    if (!model.mineralisation || model.mineralisation.length < 1) throw new Error(`FAIL ${SCENARIO_ID}: expected >= 1 mineralisation`);
    if (model.mineralisation[0].subtype !== 'orogenic_gold') throw new Error(`FAIL ${SCENARIO_ID}: expected orogenic_gold, got ${model.mineralisation[0].subtype}`);
    const metalsM = Array.isArray(model.mineralisation[0].metals) ? model.mineralisation[0].metals : [model.mineralisation[0].metals];
    if (!metalsM.some(m => String(m).includes('Au'))) throw new Error(`FAIL ${SCENARIO_ID}: expected Au`);

    // DOM assertions
    await page.waitForSelector('.explanation-strip', { timeout: 10000 });

    await page.screenshot({ path: path.join(screenshotDir, `regression-${SCENARIO_ID}.png`), fullPage: false });
    console.log(`PASS ${SCENARIO_ID}`);
    await page.close(); await context.close();
  } catch (err) {
    console.error(`FAIL ${SCENARIO_ID}: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
  process.exit(exitCode);
}

run();
