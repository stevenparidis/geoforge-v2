'use strict';
const { execSync } = require('child_process');
const path = require('path');

const tests = [
  'L01', 'L02', 'L03',
  'F01', 'F02', 'F03', 'F04', 'F05', 'F06', 'F07',
  'D01', 'D02', 'D03',
  'U01', 'U02', 'U03',
  'I01', 'I02', 'I03', 'I04',
  'M01', 'M02', 'M03', 'M04', 'M05',
  'C01', 'C02', 'C03', 'C04', 'C05',
  'H01',
];

let failed = 0;
for (const id of tests) {
  const testFile = path.join(__dirname, id, 'test.js');
  console.log(`\n${'='.repeat(60)}\nRunning ${id}\n${'='.repeat(60)}`);
  try {
    execSync(`node ${testFile}`, { stdio: 'inherit' });
    console.log(`PASS: ${id}`);
  } catch (e) {
    console.error(`FAIL: ${id}`);
    failed++;
  }
}

console.log(`\n${tests.length - failed}/${tests.length} tests passed.`);
process.exit(failed > 0 ? 1 : 0);
