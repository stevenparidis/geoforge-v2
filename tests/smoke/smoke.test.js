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
// Fault fixture — single normal fault for the drag-edit smoke test
// ---------------------------------------------------------------------------
// "A normal fault dips 60 degrees east."
const FAULT_FIXTURE = {
  meta: {
    name: 'Normal Fault',
    description: 'A normal fault dips 60 degrees east.',
  },
  layers: [
    {
      id: 'L1',
      name: 'Shale',
      lithology: 'shale',
      thickness: 0.8,
      order: 0,
      description_source: 'A normal fault dips 60 degrees east.',
      field_origin: { thickness: 'inferred', lithology: 'inferred' },
    },
    {
      id: 'L2',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 1.0,
      order: 1,
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
      field_origin: {
        strike: 'inferred',
        dip: 'stated',
        dip_direction: 'inferred',
        throw: 'inferred',
      },
    },
  ],
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

    // -----------------------------------------------------------------------
    // Test A: 2-layer layers-only model (baseline smoke test)
    // -----------------------------------------------------------------------
    console.log('\n=== Test A: layers-only model ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      // Inject stub returning the layers-only fixture
      await page.addInitScript((fixtureJson) => {
        window.claude = {
          complete: async function (promptObj) {
            console.log('[stub] window.claude.complete called — returning layers fixture');
            return fixtureJson;
          },
        };
      }, JSON.stringify(FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

      console.log('Waiting for window.__threeReady...');
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      console.log('Three.js ready');

      await page.waitForSelector('button.btn.primary', { timeout: 15000 });
      console.log('React app mounted');

      const description = 'A 1 m thick sandstone layer sits on top of a 0.8 m shale layer.';
      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill(description);
      console.log('Description typed');

      const interpretBtn = page.locator('button.btn.primary');
      await interpretBtn.click();
      console.log('Interpret button clicked');

      console.log('Waiting for model to appear in inspector...');
      await page.waitForFunction(
        () => {
          const layersList = document.querySelector('.feat-list');
          return layersList && layersList.querySelectorAll('.feat-item').length >= 2;
        },
        { timeout: 15000, polling: 200 }
      );
      console.log('Model appeared in inspector');

      const layerCount = await page.evaluate(() => {
        const layersList = document.querySelector('.feat-list');
        return layersList ? layersList.querySelectorAll('.feat-item').length : 0;
      });

      console.log(`Layer items in DOM: ${layerCount}`);
      if (layerCount !== 2) {
        throw new Error(`[Test A] Expected 2 layer items in the inspector, got ${layerCount}`);
      }
      console.log('PASS [Test A]: 2 layers confirmed in the model');

      const screenshotPath = path.join(screenshotDir, 'smoke-0.3.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to ${screenshotPath}`);

      await page.close();
      await context.close();
    }

    // -----------------------------------------------------------------------
    // Test B: drag-edit pipeline (Phase 1.4)
    //   - Loads a normal-fault model (FAULT_FIXTURE)
    //   - Sets selection to the fault event via window.__setSelected
    //   - Directly calls window.__testDragChange to simulate a drag update
    //   - Asserts: fault dip changed, manually_edited === true, field_origin.dip === 'stated'
    // -----------------------------------------------------------------------
    console.log('\n=== Test B: drag-edit pipeline (Phase 1.4) ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      // Inject stub returning the fault fixture
      await page.addInitScript((fixtureJson) => {
        window.claude = {
          complete: async function (promptObj) {
            console.log('[stub] window.claude.complete called — returning fault fixture');
            return fixtureJson;
          },
        };
      }, JSON.stringify(FAULT_FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

      console.log('Waiting for window.__threeReady...');
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      console.log('Three.js ready');

      await page.waitForSelector('button.btn.primary', { timeout: 15000 });
      console.log('React app mounted');

      // Type fault description and interpret
      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('A normal fault dips 60 degrees east.');
      console.log('Description typed');

      await page.locator('button.btn.primary').click();
      console.log('Interpret button clicked');

      // Wait for model with events to appear
      console.log('Waiting for fault model to appear...');
      await page.waitForFunction(
        () => {
          // The events feat-list is the second .feat-list in the inspector
          const lists = document.querySelectorAll('.feat-list');
          if (lists.length < 2) return false;
          return lists[1].querySelectorAll('.feat-item').length >= 1;
        },
        { timeout: 15000, polling: 200 }
      );
      console.log('Fault model appeared in inspector');

      // Wait for window.__setSelected and window.__testDragChange hooks to be set
      await page.waitForFunction(
        () => typeof window.__setSelected === 'function' && typeof window.__testDragChange === 'function',
        { timeout: 5000 }
      );
      console.log('Test hooks available');

      // Record the initial dip value
      const initialDip = await page.evaluate(() => {
        const m = window.__lastModel;
        if (!m || !m.events || !m.events[0]) return null;
        return m.events[0].dip;
      });
      console.log(`Initial fault dip: ${initialDip}°`);
      if (initialDip === null) {
        throw new Error('[Test B] Could not read initial dip from window.__lastModel');
      }

      // Simulate a drag: directly call window.__testDragChange with a new dip value
      const newDip = 45;
      await page.evaluate((args) => {
        // Select the fault event
        window.__setSelected({ kind: 'event', id: args.eventId });
        // Call onDragChange with the new dip value (final drag)
        window.__testDragChange('event', args.eventId, 'dip', args.newDip, { final: true });
      }, { eventId: 'E1', newDip });
      console.log(`Simulated drag: dip changed from ${initialDip}° to ${newDip}°`);

      // Wait for the model to update
      await page.waitForFunction(
        (expectedDip) => {
          const m = window.__lastModel;
          if (!m || !m.events || !m.events[0]) return false;
          return m.events[0].dip === expectedDip;
        },
        newDip,
        { timeout: 5000, polling: 100 }
      );
      console.log('Model updated after drag');

      // Read and verify the updated model
      const result = await page.evaluate(() => {
        const m = window.__lastModel;
        if (!m || !m.events || !m.events[0]) return null;
        const evt = m.events[0];
        return {
          dip: evt.dip,
          manually_edited: evt.manually_edited,
          field_origin_dip: evt.field_origin && evt.field_origin.dip,
        };
      });

      console.log('Updated model event:', JSON.stringify(result));

      if (!result) {
        throw new Error('[Test B] Could not read updated model from window.__lastModel');
      }
      if (result.dip !== newDip) {
        throw new Error(`[Test B] Expected dip ${newDip}, got ${result.dip}`);
      }
      if (!result.manually_edited) {
        throw new Error('[Test B] Expected manually_edited === true after drag');
      }
      if (result.field_origin_dip !== 'stated') {
        throw new Error(`[Test B] Expected field_origin.dip === 'stated', got '${result.field_origin_dip}'`);
      }
      console.log('PASS [Test B]: drag→JSON pipeline verified (dip changed, manually_edited=true, field_origin.dip=stated)');

      const screenshotPath = path.join(screenshotDir, 'smoke-1.4-drag.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to ${screenshotPath}`);

      await page.close();
      await context.close();
    }

    // ---- Phase 3 extension: listric fault reference card ----
    // 10. Navigate to the Formation reference tab.
    const refTabBtn = page.locator('button.tab', { hasText: 'Formation reference' });
    await refTabBtn.click();
    console.log('Navigated to Formation reference tab');

    // 11. Wait for the listric fault card to appear.
    await page.waitForFunction(
      () => {
        const titles = document.querySelectorAll('.ref-card-title');
        for (const t of titles) {
          if (t.textContent && t.textContent.toLowerCase().includes('listric')) return true;
        }
        return false;
      },
      { timeout: 15000, polling: 200 }
    );
    console.log('Listric fault card found in Formation reference');

    // 12. Screenshot the formation reference page.
    const listricScreenshot = path.join(screenshotDir, 'listric-fault.png');
    await page.screenshot({ path: listricScreenshot, fullPage: false });
    console.log(`Listric fault screenshot saved to ${listricScreenshot}`);

    // 13. Verify the listric fault card has the expected overlay labels in the DOM.
    const listricOverlays = await page.evaluate(() => {
      const cards = document.querySelectorAll('.ref-card');
      for (const card of cards) {
        const title = card.querySelector('.ref-card-title');
        if (title && title.textContent.toLowerCase().includes('listric')) {
          const overlayText = card.querySelector('.ref-card-overlays');
          return overlayText ? overlayText.textContent : '';
        }
      }
      return '';
    });
    console.log(`Listric card overlays text: ${listricOverlays}`);
    if (!listricOverlays.includes('surface dip') || !listricOverlays.includes('dip at depth') || !listricOverlays.includes('detachment depth')) {
      throw new Error(`Listric fault card missing expected overlay labels. Got: "${listricOverlays}"`);
    }
    console.log('PASS: Listric fault card overlay labels confirmed');

    // 14. Verify via window.__lastGeoScene that the overlay group has children.
    //     Allow extra time for all reference cards to finish rendering.
    await page.waitForTimeout(1500);
    const overlayChildCount = await page.evaluate(() => {
      const ref = window.__lastGeoScene;
      if (!ref || !ref.current) return -1;
      const overlayRoot = ref.current.overlayRoot;
      if (!overlayRoot) return -1;
      let count = 0;
      overlayRoot.traverse(() => { count++; });
      return count;
    });
    console.log(`Last GeoScene overlayRoot descendant count: ${overlayChildCount}`);
    if (overlayChildCount < 10) {
      throw new Error(`overlayRoot should have at least 10 descendants, got ${overlayChildCount}`);
    }
    console.log('PASS: overlayRoot has geometry children');

  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  // Exit with appropriate code
  process.exit(exitCode);
}

run();
