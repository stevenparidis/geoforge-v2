'use strict';
const { execSync } = require('child_process');
const path = require('path');
const tests = [
  'ac-1-interpret.test.js',
  'ac-2-overlays.test.js',
  'ac-3-stated-inferred.test.js',
  'ac-4-three-edit-paths.test.js',
  'ac-5-history-playback.test.js',
  'ac-6-json-roundtrip.test.js',
  'ac-7-default-state.test.js',
  'ac-8-intrusions.test.js',
  'ac-9-unconformities.test.js',
  'ac-10-mineralisation.test.js',
];
let failed = 0;
for (const t of tests) {
  console.log(`\n${'='.repeat(60)}\nRunning ${t}\n${'='.repeat(60)}`);
  try {
    execSync(`node ${path.join(__dirname, t)}`, { stdio: 'inherit' });
    console.log(`PASS: ${t}`);
  } catch (e) {
    console.error(`FAIL: ${t}`);
    failed++;
  }
}
console.log(`\n${tests.length - failed}/${tests.length} tests passed.`);
process.exit(failed > 0 ? 1 : 0);
