// GeoForge v2 smoke tests — Phase B + Phase C features
// Tests:
//   B.age         — Age badges (numbered circles) and younging arrow on a multi-layer model
//   B.hwfw        — HW/FW colour-coded labels on a fault model
//   C.fault-arrows — Normal fault renders motion arrows (ArrowHelper) and TENSION stress badge
//   C.validation  — Thrust fault dipping 70° triggers validation_note + inspector pill
//   C.strike-slip-vp — Strike-slip dextral card in Formation Reference shows .vp-indicator
//
// Runs its own static HTTP server on port 8001 to avoid colliding with the
// v1 smoke tests (port 8000).

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ---------------------------------------------------------------------------
// Static file server
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8001;

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
// Fixtures
// ---------------------------------------------------------------------------

// Two-layer layers-only model for B.age test
const LAYERS_FIXTURE = {
  meta: { name: 'Two Layers', description: 'A 1m sandstone over 1m shale.' },
  layers: [
    {
      id: 'L1',
      name: 'Shale',
      lithology: 'shale',
      thickness: 1,
      order: 0,
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
    {
      id: 'L2',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 1,
      order: 1,
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
  ],
  events: [],
};

// Single-fault model for B.hwfw test
const FAULT_FIXTURE = {
  meta: { name: 'Normal Fault', description: 'A normal fault dips 60° east.' },
  layers: [
    {
      id: 'L1',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 2,
      order: 0,
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
      throw: 1,
      heave: 0.5,
      order: 0,
      description_source: 'A normal fault dips 60° east.',
      field_origin: {
        strike: 'inferred',
        dip: 'stated',
        dip_direction: 'inferred',
      },
    },
  ],
};

// Normal fault for C.fault-arrows test (same shape as B.hwfw fixture)
const NORMAL_FAULT_FIXTURE = {
  meta: { name: 'Normal Fault C', description: 'A normal fault dipping 60° east.' },
  layers: [
    {
      id: 'L1',
      name: 'Sandstone',
      lithology: 'sandstone',
      thickness: 2,
      order: 0,
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
      throw: 1,
      heave: 0.5,
      order: 0,
      description_source: 'A normal fault dipping 60° east.',
      field_origin: {
        strike: 'inferred',
        dip: 'stated',
        dip_direction: 'inferred',
        throw: 'stated',
        heave: 'inferred',
      },
    },
  ],
};

// Thrust fault with dip 70° for C.validation test — applyDefaults() will add validation_note
const THRUST_FIXTURE = {
  meta: { name: 'Steep Thrust', description: 'A thrust fault dipping 70°.' },
  layers: [
    {
      id: 'L1',
      name: 'Limestone',
      lithology: 'limestone',
      thickness: 2,
      order: 0,
      field_origin: { thickness: 'stated', lithology: 'stated' },
    },
  ],
  events: [
    {
      id: 'E1',
      type: 'fault',
      subtype: 'thrust',
      strike: 0,
      dip: 70,
      dip_direction: 90,
      throw: 0.8,
      heave: 0.3,
      order: 0,
      description_source: 'A thrust fault dipping 70°.',
      field_origin: {
        strike: 'inferred',
        dip: 'stated',
        dip_direction: 'inferred',
        throw: 'stated',
        heave: 'inferred',
      },
    },
  ],
};

// Anticline at zero plunge — D.anticline test
const ANTICLINE_FIXTURE = {
  meta: { name: 'Anticline', description: 'An anticline with zero plunge.' },
  layers: [
    { id: 'L1', name: 'Shale',     lithology: 'shale',     thickness: 0.8, order: 0, field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L2', name: 'Sandstone', lithology: 'sandstone', thickness: 0.8, order: 1, field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.8, order: 2, field_origin: { thickness: 'stated', lithology: 'stated' } },
  ],
  events: [{
    id: 'E1', type: 'fold', subtype: 'anticline',
    axis_strike: 0, plunge: 0, plunge_direction: 0,
    interlimb_angle: 120, amplitude: 0.8, wavelength: 4.0, order: 0,
    description_source: 'An anticline with zero plunge.',
    field_origin: { axis_strike: 'stated', plunge: 'stated', interlimb_angle: 'inferred', amplitude: 'inferred', wavelength: 'inferred' },
  }],
};

// Syncline at zero plunge — D.syncline test
const SYNCLINE_FIXTURE = {
  meta: { name: 'Syncline', description: 'A syncline with zero plunge.' },
  layers: [
    { id: 'L1', name: 'Shale',     lithology: 'shale',     thickness: 0.8, order: 0, field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L2', name: 'Sandstone', lithology: 'sandstone', thickness: 0.8, order: 1, field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.8, order: 2, field_origin: { thickness: 'stated', lithology: 'stated' } },
  ],
  events: [{
    id: 'E1', type: 'fold', subtype: 'syncline',
    axis_strike: 0, plunge: 0, plunge_direction: 0,
    interlimb_angle: 120, amplitude: 0.8, wavelength: 4.0, order: 0,
    description_source: 'A syncline with zero plunge.',
    field_origin: { axis_strike: 'stated', plunge: 'stated', interlimb_angle: 'inferred', amplitude: 'inferred', wavelength: 'inferred' },
  }],
};

// Monocline — D.monocline test
const MONOCLINE_FIXTURE = {
  meta: { name: 'Monocline', description: 'A monocline with a 30 degree flexure dip.' },
  layers: [
    { id: 'L1', name: 'Shale',     lithology: 'shale',     thickness: 0.8, order: 0, field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L2', name: 'Sandstone', lithology: 'sandstone', thickness: 0.8, order: 1, field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.8, order: 2, field_origin: { thickness: 'stated', lithology: 'stated' } },
  ],
  events: [{
    id: 'E1', type: 'fold', subtype: 'monocline',
    axis_strike: 0, flexure_dip: 30, flexure_width: 1.2, step_height: 0.8, order: 0,
    description_source: 'A monocline with a 30 degree flexure dip.',
    field_origin: { axis_strike: 'stated', flexure_dip: 'stated', flexure_width: 'inferred', step_height: 'inferred' },
  }],
};

// ---------------------------------------------------------------------------
// Main test runner
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
    server = await startServer();
    browser = await chromium.launch({ headless: true });

    // -----------------------------------------------------------------------
    // Test B.age — Age badges and younging arrow on multi-layer model
    //
    //   1. Load a 2-layer layers-only model
    //   2. Wait for Three.js ready and CSS2D rendering to settle
    //   3. Assert: at least one age-sequence badge (numbered circle with
    //      border-radius:50%) containing text "1" is in the DOM
    //   4. Assert: at least one element with text "YOUNGING" is in the DOM
    // -----------------------------------------------------------------------
    console.log('\n=== Test B.age: age badges and younging arrow ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = {
          complete: async function () {
            console.log('[stub] returning layers fixture');
            return fixtureJson;
          },
        };
      }, JSON.stringify(LAYERS_FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

      console.log('Waiting for window.__threeReady...');
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      console.log('Three.js ready');

      await page.waitForSelector('button.btn.primary', { timeout: 15000 });
      console.log('React app mounted');

      // Type description and interpret
      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('A 1m sandstone over 1m shale.');

      await page.locator('button.btn.primary').click();
      console.log('Interpret button clicked');

      // Wait for model to load in inspector
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          return lists.length >= 1 && lists[0].querySelectorAll('.feat-item').length >= 2;
        },
        { timeout: 15000, polling: 200 }
      );
      console.log('Model appeared in inspector');

      // Allow CSS2D rendering to settle
      await page.waitForTimeout(500);

      // Assert: YOUNGING label exists in DOM
      console.log('Checking for YOUNGING label...');
      await page.waitForFunction(
        () => {
          return Array.from(document.querySelectorAll('*')).some(
            (el) => el.textContent.trim() === 'YOUNGING'
          );
        },
        { timeout: 5000 }
      );
      console.log('YOUNGING label found');

      // Assert: age badge "1" (circle with border-radius:50%) exists
      console.log('Checking for age badge "1"...');
      const hasBadge = await page.evaluate(() =>
        Array.from(document.querySelectorAll('*')).some(
          (el) =>
            el.textContent.trim() === '1' &&
            el.style.borderRadius &&
            el.style.borderRadius.includes('50%')
        )
      );
      if (!hasBadge) {
        throw new Error('Test B.age: Expected an age-sequence badge with text "1" and border-radius:50%, but none found');
      }
      console.log('Age badge "1" found');

      console.log('PASS [Test B.age]: YOUNGING label and age badge confirmed in DOM');

      const screenshotPath = path.join(screenshotDir, 'smoke-b-age.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to ${screenshotPath}`);

      await page.close();
      await context.close();
    }

    // -----------------------------------------------------------------------
    // Test B.hwfw — HW/FW labels on fault model
    //
    //   1. Load a single-fault model
    //   2. Wait for Three.js ready and CSS2D rendering to settle
    //   3. Assert: at least 2 elements with class "hwfw-label" exist
    //   4. Assert: one contains "HW" and another contains "FW"
    // -----------------------------------------------------------------------
    console.log('\n=== Test B.hwfw: HW/FW labels on fault model ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = {
          complete: async function () {
            console.log('[stub] returning fault fixture');
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

      // Type description and interpret
      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('A normal fault dips 60° east.');

      await page.locator('button.btn.primary').click();
      console.log('Interpret button clicked');

      // Wait for fault model to load in inspector
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          if (lists.length < 2) return false;
          return lists[1].querySelectorAll('.feat-item').length >= 1;
        },
        { timeout: 15000, polling: 200 }
      );
      console.log('Fault model appeared in inspector');

      // Allow CSS2D rendering to settle
      await page.waitForTimeout(500);

      // Assert: two hwfw-label elements exist, one HW, one FW
      console.log('Checking for HW/FW labels...');
      const hwfwLabels = await page.evaluate(() => {
        const els = document.querySelectorAll('.hwfw-label');
        return Array.from(els).map((el) => el.textContent.trim());
      });

      console.log(`hwfw-label elements found: ${hwfwLabels.length} — ${JSON.stringify(hwfwLabels)}`);

      if (hwfwLabels.length < 2) {
        throw new Error(`Test B.hwfw: Expected 2 hwfw-label elements, got ${hwfwLabels.length}`);
      }
      if (!hwfwLabels.some((t) => t.includes('HW'))) {
        throw new Error('Test B.hwfw: No HW label found');
      }
      if (!hwfwLabels.some((t) => t.includes('FW'))) {
        throw new Error('Test B.hwfw: No FW label found');
      }

      console.log('PASS [Test B.hwfw]: HW and FW labels confirmed in DOM');

      const screenshotPath = path.join(screenshotDir, 'smoke-b-hwfw.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to ${screenshotPath}`);

      await page.close();
      await context.close();
    }

    // -----------------------------------------------------------------------
    // Test C.fault-arrows — Normal fault renders motion arrows and TENSION badge
    //
    //   1. Load a normal fault fixture via the claude.complete stub
    //   2. Wait for Three.js ready and the fault model to appear in inspector
    //   3. Assert: window.__lastModel has events[0].subtype === 'normal'
    //   4. Assert: a .stress-badge element exists in the DOM
    //   5. Assert: the stress badge contains the text 'TENSION'
    // -----------------------------------------------------------------------
    console.log('\n=== Test C.fault-arrows: normal fault motion arrows and TENSION badge ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = {
          complete: async function () {
            console.log('[stub] returning normal fault fixture for C.fault-arrows');
            return fixtureJson;
          },
        };
      }, JSON.stringify(NORMAL_FAULT_FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

      console.log('Waiting for window.__threeReady...');
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      console.log('Three.js ready');

      await page.waitForSelector('button.btn.primary', { timeout: 15000 });

      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('A normal fault dipping 60° east.');
      await page.locator('button.btn.primary').click();
      console.log('Interpret button clicked');

      // Wait for fault model to load in inspector
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          if (lists.length < 2) return false;
          return lists[1].querySelectorAll('.feat-item').length >= 1;
        },
        { timeout: 15000, polling: 200 }
      );
      console.log('Fault model appeared in inspector');

      // Allow CSS2D rendering to settle
      await page.waitForTimeout(600);

      // Assert: window.__lastModel has the normal fault subtype
      console.log('Checking window.__lastModel for normal fault type...');
      const faultSubtype = await page.evaluate(() => {
        const m = window.__lastModel;
        if (!m || !m.events || !m.events.length) return null;
        return m.events[0].subtype;
      });
      console.log(`Fault subtype: ${faultSubtype}`);
      if (faultSubtype !== 'normal') {
        throw new Error(`Test C.fault-arrows: Expected subtype 'normal', got '${faultSubtype}'`);
      }

      // Assert: .stress-badge element exists in the DOM (CSS2D label added by buildStressBadge)
      console.log('Checking for .stress-badge element...');
      await page.waitForFunction(
        () => document.querySelector('.stress-badge') !== null,
        { timeout: 5000 }
      );
      console.log('.stress-badge element found');

      // Assert: stress badge contains the text 'TENSION'
      console.log('Checking for TENSION text in stress badge...');
      const badgeText = await page.evaluate(() => {
        const badge = document.querySelector('.stress-badge');
        return badge ? badge.textContent : '';
      });
      console.log(`Stress badge text: "${badgeText}"`);
      if (!badgeText.includes('TENSION')) {
        throw new Error(`Test C.fault-arrows: Expected 'TENSION' in stress badge, got "${badgeText}"`);
      }

      console.log('PASS [Test C.fault-arrows]: stress badge with TENSION confirmed in DOM');

      const screenshotPath = path.join(screenshotDir, 'smoke-c-fault-arrows.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to ${screenshotPath}`);

      await page.close();
      await context.close();
    }

    // -----------------------------------------------------------------------
    // Test C.validation — Thrust dipping 70° gets validation_note + pill
    //
    //   1. Load a thrust fault with dip 70° via the claude.complete stub
    //   2. applyDefaults() is called on the model, which adds validation_note
    //   3. Assert: window.__lastModel.events[0].validation_note is set
    //   4. Assert: a .validation-note-pill element exists in the DOM
    // -----------------------------------------------------------------------
    console.log('\n=== Test C.validation: thrust dipping 70° gets validation_note ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = {
          complete: async function () {
            console.log('[stub] returning thrust fault fixture for C.validation');
            return fixtureJson;
          },
        };
      }, JSON.stringify(THRUST_FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

      console.log('Waiting for window.__threeReady...');
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      console.log('Three.js ready');

      await page.waitForSelector('button.btn.primary', { timeout: 15000 });

      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('A thrust fault dipping 70°.');
      await page.locator('button.btn.primary').click();
      console.log('Interpret button clicked');

      // Wait for fault model to load in inspector
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          if (lists.length < 2) return false;
          return lists[1].querySelectorAll('.feat-item').length >= 1;
        },
        { timeout: 15000, polling: 200 }
      );
      console.log('Thrust fault appeared in inspector');

      // Allow inspector to finish rendering
      await page.waitForTimeout(400);

      // Assert: window.__lastModel has a validation_note on the first event
      console.log('Checking window.__lastModel for validation_note...');
      const validationNote = await page.evaluate(() => {
        const m = window.__lastModel;
        if (!m || !m.events || !m.events.length) return null;
        return m.events[0].validation_note || null;
      });
      console.log(`validation_note: "${validationNote}"`);
      if (!validationNote) {
        throw new Error('Test C.validation: Expected validation_note to be set on the thrust event, but it was absent');
      }
      if (!validationNote.includes('Thrust') && !validationNote.includes('thrust')) {
        throw new Error(`Test C.validation: validation_note does not mention thrust. Got: "${validationNote}"`);
      }

      // Assert: .validation-note-pill exists in the DOM (rendered by FeatureInspector)
      console.log('Checking for .validation-note-pill in DOM...');
      // First click on the fault event in the inspector to open its detail panel
      const faultItem = page.locator('.feat-list').nth(1).locator('.feat-item').first();
      await faultItem.click();
      await page.waitForTimeout(300);

      await page.waitForFunction(
        () => document.querySelector('.validation-note-pill') !== null,
        { timeout: 5000 }
      );
      console.log('.validation-note-pill element found in DOM');

      console.log('PASS [Test C.validation]: validation_note set and pill rendered in inspector');

      const screenshotPath = path.join(screenshotDir, 'smoke-c-validation.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to ${screenshotPath}`);

      await page.close();
      await context.close();
    }

    // -----------------------------------------------------------------------
    // Test C.strike-slip-vp — Strike-slip fault renders .vp-indicator
    //
    //   1. Load a dextral strike-slip fault fixture via claude.complete stub
    //   2. Wait for Three.js ready and the fault model to appear in inspector
    //   3. Allow CSS2D rendering to settle (the label is in the overlays group)
    //   4. Assert: a .vp-indicator element exists in the DOM
    //   5. Assert: the indicator text includes 'dextral' or 'right'
    //
    // Note: This test uses the workspace view (not the Formation Reference tab)
    // because the reference tab renders 25+ cards and the off-viewport optimisation
    // in Surface.tick() skips CSS2D rendering for cards below the fold.
    // -----------------------------------------------------------------------
    console.log('\n=== Test C.strike-slip-vp: strike-slip fault renders viewpoint indicator ===');
    {
      const STRIKE_SLIP_FIXTURE = {
        meta: { name: 'Dextral Strike-slip', description: 'A right-lateral strike-slip fault.' },
        layers: [
          { id: 'L1', name: 'Sandstone', lithology: 'sandstone', thickness: 0.6, order: 0, field_origin: { thickness: 'stated', lithology: 'stated' } },
          { id: 'L2', name: 'Shale', lithology: 'shale', thickness: 0.7, order: 1, field_origin: { thickness: 'stated', lithology: 'stated' } },
          { id: 'L3', name: 'Limestone', lithology: 'limestone', thickness: 0.6, order: 2, field_origin: { thickness: 'stated', lithology: 'stated' } },
        ],
        events: [
          {
            id: 'E1',
            type: 'fault',
            subtype: 'strike-slip',
            sense: 'dextral',
            strike: 0,
            dip: 90,
            dip_direction: 90,
            displacement: 1.0,
            order: 0,
            description_source: 'A right-lateral strike-slip fault.',
            field_origin: { strike: 'stated', dip: 'inferred', dip_direction: 'inferred', displacement: 'stated', sense: 'stated' },
          },
        ],
      };

      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = {
          complete: async function () {
            console.log('[stub] returning strike-slip fixture for C.strike-slip-vp');
            return fixtureJson;
          },
        };
      }, JSON.stringify(STRIKE_SLIP_FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });

      console.log('Waiting for window.__threeReady...');
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      console.log('Three.js ready');

      await page.waitForSelector('button.btn.primary', { timeout: 15000 });

      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('A right-lateral strike-slip fault.');
      await page.locator('button.btn.primary').click();
      console.log('Interpret button clicked');

      // Wait for fault model to load in inspector
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          if (lists.length < 2) return false;
          return lists[1].querySelectorAll('.feat-item').length >= 1;
        },
        { timeout: 15000, polling: 200 }
      );
      console.log('Strike-slip fault appeared in inspector');

      // Allow CSS2D rendering to settle
      await page.waitForTimeout(600);

      // Assert: .vp-indicator element exists in the DOM
      console.log('Checking for .vp-indicator element...');
      await page.waitForFunction(
        () => document.querySelector('.vp-indicator') !== null,
        { timeout: 8000 }
      );
      console.log('.vp-indicator element found in DOM');

      const vpText = await page.evaluate(() => {
        const el = document.querySelector('.vp-indicator');
        return el ? el.textContent.trim() : '';
      });
      console.log(`vp-indicator text: "${vpText}"`);
      if (!vpText.includes('dextral') && !vpText.includes('right')) {
        throw new Error(`Test C.strike-slip-vp: .vp-indicator text does not mention dextral/right. Got: "${vpText}"`);
      }

      console.log('PASS [Test C.strike-slip-vp]: .vp-indicator confirmed in DOM for strike-slip fault');

      const screenshotPath = path.join(screenshotDir, 'smoke-c-strike-slip-vp.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Screenshot saved to ${screenshotPath}`);

      await page.close();
      await context.close();
    }

    // -----------------------------------------------------------------------
    // Test D.anticline — anticline renders .fold-axial-lbl with 'ANTICLINE'
    //
    //   1. Load an anticline fixture via the claude.complete stub
    //   2. Wait for Three.js ready and the fold model to appear in inspector
    //   3. Assert: window.__lastModel.events[0].subtype === 'anticline'
    //   4. Assert: a .fold-axial-lbl element exists in the DOM
    //   5. Assert: the label text contains 'ANTICLINE'
    // -----------------------------------------------------------------------
    console.log('\n=== Test D.anticline: anticline renders axial-plane label ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = { complete: async function () { return fixtureJson; } };
      }, JSON.stringify(ANTICLINE_FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      await page.waitForSelector('button.btn.primary', { timeout: 15000 });

      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('An anticline with zero plunge.');
      await page.locator('button.btn.primary').click();

      // Wait for fold event to appear in inspector
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          if (lists.length < 2) return false;
          return lists[1].querySelectorAll('.feat-item').length >= 1;
        },
        { timeout: 15000, polling: 200 }
      );
      await page.waitForTimeout(600);

      // Assert subtype
      const subtype = await page.evaluate(() => {
        const m = window.__lastModel;
        if (!m || !m.events || !m.events.length) return null;
        return m.events[0].subtype;
      });
      if (subtype !== 'anticline') throw new Error(`Test D.anticline: Expected subtype 'anticline', got '${subtype}'`);

      // Assert .fold-axial-lbl exists with ANTICLINE text
      await page.waitForFunction(
        () => document.querySelector('.fold-axial-lbl') !== null,
        { timeout: 5000 }
      );
      const lblText = await page.evaluate(() => {
        const el = document.querySelector('.fold-axial-lbl');
        return el ? el.textContent : '';
      });
      if (!lblText.includes('ANTICLINE')) throw new Error(`Test D.anticline: .fold-axial-lbl missing 'ANTICLINE'. Got: "${lblText}"`);

      console.log('PASS [Test D.anticline]: .fold-axial-lbl with ANTICLINE confirmed in DOM');
      await page.screenshot({ path: require('path').join(REPO_ROOT, 'tests', 'screenshots', 'smoke-d-anticline.png') });
      await page.close();
      await context.close();
    }

    // -----------------------------------------------------------------------
    // Test D.syncline — syncline renders .fold-axial-lbl with 'SYNCLINE'
    //
    //   1. Load a syncline fixture via the claude.complete stub
    //   2. Wait for Three.js ready and the fold model to appear in inspector
    //   3. Assert: window.__lastModel.events[0].subtype === 'syncline'
    //   4. Assert: a .fold-axial-lbl element exists in the DOM
    //   5. Assert: the label text contains 'SYNCLINE'
    // -----------------------------------------------------------------------
    console.log('\n=== Test D.syncline: syncline renders axial-plane label ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = { complete: async function () { return fixtureJson; } };
      }, JSON.stringify(SYNCLINE_FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      await page.waitForSelector('button.btn.primary', { timeout: 15000 });

      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('A syncline with zero plunge.');
      await page.locator('button.btn.primary').click();

      // Wait for fold event to appear in inspector
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          if (lists.length < 2) return false;
          return lists[1].querySelectorAll('.feat-item').length >= 1;
        },
        { timeout: 15000, polling: 200 }
      );
      await page.waitForTimeout(600);

      // Assert subtype
      const subtype = await page.evaluate(() => {
        const m = window.__lastModel;
        if (!m || !m.events || !m.events.length) return null;
        return m.events[0].subtype;
      });
      if (subtype !== 'syncline') throw new Error(`Test D.syncline: Expected subtype 'syncline', got '${subtype}'`);

      // Assert .fold-axial-lbl exists with SYNCLINE text
      await page.waitForFunction(
        () => document.querySelector('.fold-axial-lbl') !== null,
        { timeout: 5000 }
      );
      const lblText = await page.evaluate(() => {
        const el = document.querySelector('.fold-axial-lbl');
        return el ? el.textContent : '';
      });
      if (!lblText.includes('SYNCLINE')) throw new Error(`Test D.syncline: .fold-axial-lbl missing 'SYNCLINE'. Got: "${lblText}"`);

      console.log('PASS [Test D.syncline]: .fold-axial-lbl with SYNCLINE confirmed in DOM');
      await page.screenshot({ path: require('path').join(REPO_ROOT, 'tests', 'screenshots', 'smoke-d-syncline.png') });
      await page.close();
      await context.close();
    }

    // -----------------------------------------------------------------------
    // Test D.monocline — monocline renders .monocline-step-lbl
    //
    //   1. Load a monocline fixture via the claude.complete stub
    //   2. Wait for Three.js ready and the fold model to appear in inspector
    //   3. Assert: window.__lastModel.events[0].subtype === 'monocline'
    //   4. Assert: a .monocline-step-lbl element exists in the DOM
    // -----------------------------------------------------------------------
    console.log('\n=== Test D.monocline: monocline renders underlying-step label ===');
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

      await page.addInitScript((fixtureJson) => {
        window.claude = { complete: async function () { return fixtureJson; } };
      }, JSON.stringify(MONOCLINE_FIXTURE));

      await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
      await page.waitForSelector('button.btn.primary', { timeout: 15000 });

      const textarea = page.locator('textarea.desc-area');
      await textarea.click();
      await textarea.fill('A monocline with a 30 degree flexure dip.');
      await page.locator('button.btn.primary').click();

      // Wait for fold event to appear in inspector
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          if (lists.length < 2) return false;
          return lists[1].querySelectorAll('.feat-item').length >= 1;
        },
        { timeout: 15000, polling: 200 }
      );
      await page.waitForTimeout(600);

      // Assert subtype
      const subtype = await page.evaluate(() => {
        const m = window.__lastModel;
        if (!m || !m.events || !m.events.length) return null;
        return m.events[0].subtype;
      });
      if (subtype !== 'monocline') throw new Error(`Test D.monocline: Expected subtype 'monocline', got '${subtype}'`);

      // Assert .monocline-step-lbl exists
      await page.waitForFunction(
        () => document.querySelector('.monocline-step-lbl') !== null,
        { timeout: 5000 }
      );
      console.log('PASS [Test D.monocline]: .monocline-step-lbl confirmed in DOM');
      await page.screenshot({ path: require('path').join(REPO_ROOT, 'tests', 'screenshots', 'smoke-d-monocline.png') });
      await page.close();
      await context.close();
    }

  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
