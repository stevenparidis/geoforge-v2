// AC4: All three edit paths modify the same underlying JSON.
//
// Path A (re-interpret): Load a model. Change description. Second stub returns different model.
//   Verify window.__lastModel changed.
//
// Path B (inspector numeric input): Load a fault model. Click fault. Fill strike input.
//   Verify model updates (with manually_edited + field_origin[field] === 'stated').
//   NOTE: React controlled inputs can be tricky to trigger via fill() — if this path
//   fails in practice, a comment documents the attempted approach and fallback.
//
// Path C (drag): Use window.__testDragChange('event','E1','dip',75,{final:true})
//   Verify dip === 75, manually_edited === true, field_origin.dip === 'stated'.

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

const FAULT_FIXTURE_V1 = {
  meta: { name: 'Normal Fault', description: 'A normal fault dips 60 degrees east.' },
  layers: [
    {
      id: 'L1',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 1.0,
      order: 0,
      description_source: 'A normal fault dips 60 degrees east.',
      field_origin: { thickness: 'inferred', lithology: 'inferred' },
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
      description_source: 'A normal fault dips 60 degrees east.',
      field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'inferred', throw: 'inferred' },
    },
  ],
};

const FAULT_FIXTURE_V2 = {
  meta: { name: 'Reverse Fault', description: 'A reverse fault dips 45 degrees west.' },
  layers: [
    {
      id: 'L1',
      name: 'Shale',
      lithology: 'shale',
      thickness: 1.2,
      order: 0,
      description_source: 'A reverse fault dips 45 degrees west.',
      field_origin: { thickness: 'inferred', lithology: 'stated' },
    },
  ],
  events: [
    {
      id: 'E1',
      type: 'fault',
      subtype: 'reverse',
      strike: 0,
      dip: 45,
      dip_direction: 270,
      throw: 0.8,
      order: 0,
      description_source: 'A reverse fault dips 45 degrees west.',
      field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'inferred', throw: 'inferred' },
    },
  ],
};

async function run() {
  const screenshotDir = path.join(REPO_ROOT, 'tests', 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  let server;
  let browser;
  const failures = [];

  try {
    server = await startServer();
    browser = await chromium.launch({ headless: true });

    // -------------------------------------------------------------------------
    // Path A: Re-interpret produces new model
    // -------------------------------------------------------------------------
    console.log('\n--- Path A: re-interpret ---');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtures) => {
        let callCount = 0;
        window.claude = {
          complete: async function () {
            callCount++;
            if (callCount === 1) {
              console.log('[stub] AC4 Path A: call 1 — v1 fixture');
              return JSON.stringify(fixtures.v1);
            }
            console.log('[stub] AC4 Path A: call 2 — v2 fixture');
            return JSON.stringify(fixtures.v2);
          },
        };
      }, { v1: FAULT_FIXTURE_V1, v2: FAULT_FIXTURE_V2 });

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      await page.waitForSelector('button.btn.primary', { timeout: 15000 });

      const textarea = page.locator('textarea.desc-area');
      await textarea.fill('A normal fault dips 60 degrees east.');
      await page.locator('button.btn.primary').click();

      await page.waitForFunction(
        () => window.__lastModel && window.__lastModel.events && window.__lastModel.events[0] && window.__lastModel.events[0].dip === 60,
        { timeout: 15000, polling: 200 }
      );
      console.log('First model loaded (dip=60)');

      // Change description and re-interpret
      await textarea.fill('A reverse fault dips 45 degrees west.');
      await page.locator('button.btn.primary').click();

      await page.waitForFunction(
        () => {
          const m = window.__lastModel;
          return m && m.events && m.events[0] && m.events[0].subtype === 'reverse';
        },
        { timeout: 15000, polling: 200 }
      );

      const v2Model = await page.evaluate(() => {
        const m = window.__lastModel;
        return { subtype: m.events[0].subtype, dip: m.events[0].dip };
      });
      console.log(`After re-interpret: subtype=${v2Model.subtype}, dip=${v2Model.dip}`);

      if (v2Model.subtype !== 'reverse' || v2Model.dip !== 45) {
        const msg = `AC4 Path A: Expected reverse fault dip=45, got subtype=${v2Model.subtype} dip=${v2Model.dip}`;
        console.error(`FAIL: ${msg}`);
        failures.push(msg);
      } else {
        console.log('PASS Path A: re-interpret updated the model');
      }

      await page.screenshot({ path: path.join(screenshotDir, 'ac-4-path-a.png'), fullPage: false });
      await page.close();
      await context.close();
    }

    // -------------------------------------------------------------------------
    // Path B: Inspector numeric input
    // -------------------------------------------------------------------------
    console.log('\n--- Path B: inspector numeric input ---');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = { complete: async () => fixtureJson };
      }, JSON.stringify(FAULT_FIXTURE_V1));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      await page.waitForSelector('button.btn.primary', { timeout: 15000 });

      const textarea = page.locator('textarea.desc-area');
      await textarea.fill('A normal fault dips 60 degrees east.');
      await page.locator('button.btn.primary').click();

      // Wait for events list
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          return lists.length >= 2 && lists[1].querySelectorAll('.feat-item').length >= 1;
        },
        { timeout: 15000, polling: 200 }
      );

      // Click fault event in inspector to open FeatureInspector
      await page.locator('.feat-list').nth(1).locator('.feat-item').first().click();
      console.log('Clicked fault event in inspector');

      // Wait for num-input fields to appear
      await page.waitForSelector('input.num-input', { timeout: 10000 });
      console.log('Numeric inputs found in FeatureInspector');

      // Get count of num-input fields and initial strike value
      const initialInputs = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input.num-input');
        return Array.from(inputs).map(inp => ({ value: inp.value, name: inp.name || 'unnamed' }));
      });
      console.log('Initial num-inputs:', JSON.stringify(initialInputs));

      // The first num-input is Strike for fault events
      const strikeInput = page.locator('input.num-input').first();

      // Fill with new value and trigger React synthetic change event
      // Approach: use fill() then dispatch native input + change events
      await strikeInput.click({ clickCount: 3 }); // select all
      await strikeInput.fill('45');
      await page.evaluate(() => {
        const input = document.querySelector('input.num-input');
        if (!input) return;
        // Dispatch native input event for React controlled input
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, '45');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      console.log('Dispatched input/change events on strike input (value=45)');

      // Press Tab to trigger blur/change (React may need this for controlled inputs)
      await strikeInput.press('Tab');
      console.log('Pressed Tab after input');

      // Wait up to 5 seconds for model to update (strike === 45)
      let pathBPassed = false;
      try {
        await page.waitForFunction(
          () => {
            const m = window.__lastModel;
            if (!m || !m.events || !m.events[0]) return false;
            return m.events[0].strike === 45;
          },
          { timeout: 5000, polling: 100 }
        );

        const result = await page.evaluate(() => {
          const evt = window.__lastModel.events[0];
          return {
            strike: evt.strike,
            manually_edited: evt.manually_edited,
            field_origin_strike: evt.field_origin && evt.field_origin.strike,
          };
        });
        console.log('Path B result:', JSON.stringify(result));

        if (result.strike !== 45) {
          throw new Error(`Expected strike=45, got ${result.strike}`);
        }
        if (!result.manually_edited) {
          throw new Error('Expected manually_edited=true');
        }
        if (result.field_origin_strike !== 'stated') {
          throw new Error(`Expected field_origin.strike='stated', got '${result.field_origin_strike}'`);
        }
        console.log('PASS Path B: inspector numeric input updated model correctly');
        pathBPassed = true;
      } catch (e) {
        const msg = `AC4 Path B: inspector numeric input did not update model — ${e.message}`;
        console.error(`FAIL: ${msg}`);
        failures.push(msg);
      }

      await page.screenshot({ path: path.join(screenshotDir, 'ac-4-path-b.png'), fullPage: false });
      await page.close();
      await context.close();
    }

    // -------------------------------------------------------------------------
    // Path C: Drag edit via window.__testDragChange
    // -------------------------------------------------------------------------
    console.log('\n--- Path C: drag edit ---');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = { complete: async () => fixtureJson };
      }, JSON.stringify(FAULT_FIXTURE_V1));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      await page.waitForSelector('button.btn.primary', { timeout: 15000 });

      await page.locator('textarea.desc-area').fill('A normal fault dips 60 degrees east.');
      await page.locator('button.btn.primary').click();

      // Wait for model with fault
      await page.waitForFunction(
        () => window.__lastModel && window.__lastModel.events && window.__lastModel.events.length >= 1,
        { timeout: 15000, polling: 200 }
      );

      // Wait for test hooks
      await page.waitForFunction(
        () => typeof window.__setSelected === 'function' && typeof window.__testDragChange === 'function',
        { timeout: 5000 }
      );
      console.log('Test hooks available');

      // Simulate drag: set dip to 75
      await page.evaluate(() => {
        window.__setSelected({ kind: 'event', id: 'E1' });
        window.__testDragChange('event', 'E1', 'dip', 75, { final: true });
      });
      console.log('Drag simulated: dip → 75');

      await page.waitForFunction(
        () => {
          const m = window.__lastModel;
          return m && m.events && m.events[0] && m.events[0].dip === 75;
        },
        { timeout: 5000, polling: 100 }
      );

      const dragResult = await page.evaluate(() => {
        const evt = window.__lastModel.events[0];
        return {
          dip: evt.dip,
          manually_edited: evt.manually_edited,
          field_origin_dip: evt.field_origin && evt.field_origin.dip,
        };
      });
      console.log('Path C result:', JSON.stringify(dragResult));

      if (dragResult.dip !== 75) {
        failures.push(`AC4 Path C: Expected dip=75, got ${dragResult.dip}`);
      } else if (!dragResult.manually_edited) {
        failures.push('AC4 Path C: Expected manually_edited=true');
      } else if (dragResult.field_origin_dip !== 'stated') {
        failures.push(`AC4 Path C: Expected field_origin.dip='stated', got '${dragResult.field_origin_dip}'`);
      } else {
        console.log('PASS Path C: drag→JSON pipeline verified');
      }

      await page.screenshot({ path: path.join(screenshotDir, 'ac-4-path-c.png'), fullPage: false });
      await page.close();
      await context.close();
    }

  } catch (err) {
    console.error(`FAIL AC4 (unexpected): ${err.message}`);
    failures.push(err.message);
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  if (failures.length > 0) {
    for (const f of failures) console.error(`FAIL: ${f}`);
  } else {
    console.log('\nPASS AC4: all three edit paths verified');
  }

  const exitCode = failures.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

run();
