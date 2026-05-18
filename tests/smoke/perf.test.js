// Performance stress-test fixture for GeoForge v2 (Phase 4.5)
//
// Thresholds:
//   1. Initial render < 2000 ms (Interpret click → model visible in inspector)
//   2. Drag operations sustain ≥ 30 fps
//   3. Overlay toggle completes < 200 ms
//
// The test uses a large fixture (10 layers, 5 faults, 2 folds) injected via a
// stubbed window.claude.complete so no real LLM is called.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ---------------------------------------------------------------------------
// Static file server (same pattern as smoke.test.js)
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8001; // different port from smoke test to avoid conflicts

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
// Stress-test fixture: 10 layers, 5 faults (one of each subtype), 2 folds
// ---------------------------------------------------------------------------

const STRESS_FIXTURE = {
  meta: { name: 'stress-test', description: 'Performance stress test' },
  layers: [
    { id: 'L1',  name: 'Layer 1',  lithology: 'sandstone', thickness: 0.5, order: 0, description_source: 's', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L2',  name: 'Layer 2',  lithology: 'shale',     thickness: 0.4, order: 1, description_source: 's', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L3',  name: 'Layer 3',  lithology: 'limestone', thickness: 0.6, order: 2, description_source: 's', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L4',  name: 'Layer 4',  lithology: 'mudstone',  thickness: 0.5, order: 3, description_source: 's', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L5',  name: 'Layer 5',  lithology: 'sandstone', thickness: 0.7, order: 4, description_source: 's', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L6',  name: 'Layer 6',  lithology: 'chalk',     thickness: 0.4, order: 5, description_source: 's', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L7',  name: 'Layer 7',  lithology: 'shale',     thickness: 0.5, order: 6, description_source: 's', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L8',  name: 'Layer 8',  lithology: 'sandstone', thickness: 0.6, order: 7, description_source: 's', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L9',  name: 'Layer 9',  lithology: 'limestone', thickness: 0.5, order: 8, description_source: 's', field_origin: { thickness: 'stated', lithology: 'stated' } },
    { id: 'L10', name: 'Layer 10', lithology: 'mudstone',  thickness: 0.4, order: 9, description_source: 's', field_origin: { thickness: 'stated', lithology: 'stated' } },
  ],
  events: [
    { id: 'F1',  type: 'fault', subtype: 'normal',      strike: 0,   dip: 60, dip_direction: 90,  throw: 0.5, order: 0, description_source: 's', field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'inferred', throw: 'stated' } },
    { id: 'F2',  type: 'fault', subtype: 'reverse',     strike: 180, dip: 45, dip_direction: 270, throw: 0.4, order: 1, description_source: 's', field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'inferred', throw: 'stated' } },
    { id: 'F3',  type: 'fault', subtype: 'thrust',      strike: 90,  dip: 20, dip_direction: 180, throw: 0.3, order: 2, description_source: 's', field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'inferred', throw: 'stated' } },
    { id: 'F4',  type: 'fault', subtype: 'strike-slip', strike: 45,  dip: 90, dip_direction: 135, displacement: 0.8, sense: 'dextral', order: 3, description_source: 's', field_origin: { strike: 'stated', dip: 'inferred', dip_direction: 'inferred', displacement: 'stated', sense: 'stated' } },
    { id: 'F5',  type: 'fault', subtype: 'listric',     strike: 0,   dip: 60, dip_direction: 90,  throw: 0.5, dip_at_depth: 10, detachment_depth: 2.0, order: 4, description_source: 's', field_origin: { strike: 'inferred', dip: 'stated', dip_direction: 'inferred', throw: 'stated', dip_at_depth: 'inferred', detachment_depth: 'inferred' } },
    { id: 'FO1', type: 'fold',  subtype: 'anticline',   axis_strike: 0,  plunge: 5, plunge_direction: 0,  interlimb_angle: 120, amplitude: 1.0, wavelength: 4.0, order: 5, description_source: 's', field_origin: { axis_strike: 'inferred', plunge: 'inferred', plunge_direction: 'inferred', interlimb_angle: 'inferred' } },
    { id: 'FO2', type: 'fold',  subtype: 'syncline',    axis_strike: 90, plunge: 0, plunge_direction: 90, interlimb_angle: 100, amplitude: 1.0, wavelength: 4.0, order: 6, description_source: 's', field_origin: { axis_strike: 'inferred', plunge: 'inferred', plunge_direction: 'inferred', interlimb_angle: 'inferred' } },
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
    server = await startServer();
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('console', (msg) => console.log(`[browser] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.error(`[browser error] ${err.message}`));

    // Inject stub: always returns the stress fixture
    await page.addInitScript((fixtureJson) => {
      window.claude = {
        complete: async function () {
          console.log('[stub] window.claude.complete called — returning stress fixture');
          return fixtureJson;
        },
      };
    }, JSON.stringify(STRESS_FIXTURE));

    await page.goto(`http://localhost:${PORT}/index.html?testmode=1`, { waitUntil: 'domcontentloaded' });

    console.log('Waiting for window.__threeReady...');
    await page.waitForFunction(() => window.__threeReady === true, { timeout: 30000 });
    console.log('Three.js ready');

    await page.waitForSelector('button.btn.primary', { timeout: 15000 });
    console.log('React app mounted');

    // Fill a description so the Interpret button is enabled
    const textarea = page.locator('textarea.desc-area');
    await textarea.click();
    await textarea.fill('Performance stress test description with 10 layers and 5 faults and 2 folds.');
    console.log('Description typed');

    // -------------------------------------------------------------------------
    // Threshold 1: Initial render < 2000 ms
    // -------------------------------------------------------------------------
    console.log('\n=== Threshold 1: Initial render time ===');
    {
      const interpretBtn = page.locator('button.btn.primary');

      const t0 = Date.now();
      await interpretBtn.click();
      console.log('Interpret button clicked');

      // Wait for model to appear: inspector should show the 10 layers
      await page.waitForFunction(
        () => {
          const lists = document.querySelectorAll('.feat-list');
          if (!lists || lists.length === 0) return false;
          return lists[0].querySelectorAll('.feat-item').length >= 10;
        },
        { timeout: 15000, polling: 100 }
      );
      const renderTime = Date.now() - t0;
      console.log(`Render time: ${renderTime} ms`);

      const layerCount = await page.evaluate(() => {
        const lists = document.querySelectorAll('.feat-list');
        return lists[0] ? lists[0].querySelectorAll('.feat-item').length : 0;
      });
      console.log(`Layers in inspector: ${layerCount}`);

      if (renderTime >= 2000) {
        throw new Error(`[Threshold 1] FAIL: render time ${renderTime} ms >= 2000 ms threshold`);
      }
      console.log(`PASS [Threshold 1]: initial render ${renderTime} ms < 2000 ms`);
    }

    await page.screenshot({ path: path.join(screenshotDir, 'perf-after-interpret.png') });

    // -------------------------------------------------------------------------
    // Threshold 2: Drag operations sustain ≥ 30 fps
    //
    // Strategy: inject a rAF frame counter that runs for 1 second, then read
    // the result. We use pointer events on the scene host to trigger OrbitControls
    // drag (which runs on every rAF tick), simulating a real user drag.
    // -------------------------------------------------------------------------
    console.log('\n=== Threshold 2: Drag FPS ===');
    {
      // Wait for the scene canvas/host to be present
      const sceneHost = page.locator('.scene-host');
      await sceneHost.waitFor({ timeout: 10000 });

      // Start dragging so that OrbitControls is active during the measurement
      const box = await sceneHost.boundingBox();
      if (!box) throw new Error('[Threshold 2] Scene host has no bounding box');

      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      // Inject rAF frame counter before we start dragging
      const fpsPromise = page.evaluate(() => {
        return new Promise((resolve) => {
          let frames = 0;
          const start = performance.now();
          const count = () => {
            frames++;
            if (performance.now() - start < 1000) {
              requestAnimationFrame(count);
            } else {
              resolve(frames);
            }
          };
          requestAnimationFrame(count);
        });
      });

      // Simulate a slow drag across the scene while frames are being counted
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      // Move in small steps to simulate a real drag for ~1 second
      const steps = 30;
      const dxPerStep = 3;
      for (let i = 0; i < steps; i++) {
        await page.mouse.move(cx + i * dxPerStep, cy + 5, { steps: 1 });
        // small delay between moves to spread across ~1 second
        await page.waitForTimeout(30);
      }
      await page.mouse.up();

      const fps = await fpsPromise;
      console.log(`Measured FPS over 1 second: ${fps}`);

      if (fps < 30) {
        throw new Error(`[Threshold 2] FAIL: measured ${fps} fps < 30 fps threshold`);
      }
      console.log(`PASS [Threshold 2]: drag FPS ${fps} >= 30 fps`);
    }

    // -------------------------------------------------------------------------
    // Threshold 3: Overlay toggle completes < 200 ms
    //
    // The Overlays button in the topbar toggles showOverlays. The scene.jsx
    // useEffect that reacts to showOverlays changes sets overlayRoot.visible
    // synchronously (no async work). We measure entirely inside the browser
    // using performance.now() to avoid Playwright IPC round-trip latency:
    //   1. Inject a MutationObserver / one-shot listener before clicking
    //   2. The listener records t0 on the click event and t1 when the Three.js
    //      overlayRoot.visible value has actually flipped (polled via rAF)
    //   3. We read the elapsed time back via page.evaluate()
    // -------------------------------------------------------------------------
    console.log('\n=== Threshold 3: Overlay toggle time ===');
    {
      // Get current overlay visibility state
      const overlaysVisibleBefore = await page.evaluate(() => {
        const ref = window.__lastGeoScene;
        if (!ref || !ref.current) return null;
        return ref.current.overlayRoot ? ref.current.overlayRoot.visible : null;
      });
      console.log(`Overlay visible before toggle: ${overlaysVisibleBefore}`);

      if (overlaysVisibleBefore === null) {
        throw new Error('[Threshold 3] Could not read overlayRoot.visible — model may not be loaded');
      }

      const expectedAfter = !overlaysVisibleBefore;

      // Inject an in-browser measurement harness that records t0 at click-event
      // time (not at evaluate() IPC time) to avoid IPC latency skew.
      // The toggle button click listener records t0, then rAF polls until
      // overlayRoot.visible flips, then records t1.
      await page.evaluate((expected) => {
        window.__overlayToggleMs = null;
        const overlayToggleBtn = Array.from(document.querySelectorAll('button.toggle'))
          .find(b => b.textContent.includes('Overlays'));
        if (!overlayToggleBtn) return;
        overlayToggleBtn.addEventListener('click', function onToggleClick() {
          const t0 = performance.now();
          const check = () => {
            const ref = window.__lastGeoScene;
            if (ref && ref.current && ref.current.overlayRoot &&
                ref.current.overlayRoot.visible === expected) {
              window.__overlayToggleMs = performance.now() - t0;
            } else {
              requestAnimationFrame(check);
            }
          };
          requestAnimationFrame(check);
          overlayToggleBtn.removeEventListener('click', onToggleClick);
        });
      }, expectedAfter);

      // Click the toggle button
      const toggleBtn = page.locator('button.toggle', { hasText: 'Overlays' });
      await toggleBtn.click();

      // Wait for in-browser measurement to complete (rAF-based, should be fast)
      await page.waitForFunction(
        () => window.__overlayToggleMs !== null,
        { timeout: 5000, polling: 16 }
      );

      const toggleTime = await page.evaluate(() => Math.round(window.__overlayToggleMs));
      console.log(`Overlay toggle time (in-browser): ${toggleTime} ms`);

      if (toggleTime >= 200) {
        throw new Error(`[Threshold 3] FAIL: overlay toggle ${toggleTime} ms >= 200 ms threshold`);
      }
      console.log(`PASS [Threshold 3]: overlay toggle ${toggleTime} ms < 200 ms`);

      await page.screenshot({ path: path.join(screenshotDir, 'perf-overlay-toggled.png') });
    }

    console.log('\nAll performance thresholds passed.');
    await page.close();
    await context.close();

  } catch (err) {
    console.error(`\nFAIL: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }

  process.exit(exitCode);
}

run();
