'use strict';
const { execSync } = require('child_process');
const path = require('path');

const tests = [
  'M01/test.js',
  'M02/test.js',
  'M03/test.js',
  'M04/test.js',
  'M05/test.js',
  'M06/test.js',
  'M07/test.js',
  'N01/test.js',
  'N02/test.js',
  'N03/test.js',
  'N04/test.js',
  'N05/test.js',
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
