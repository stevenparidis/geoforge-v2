/**
 * Unit tests for src/description-diff.js
 *
 * Run with: node tests/unit/description-diff.test.js
 *
 * Loads the browser IIFE module by setting global.window = global,
 * then eval-ing the script so window.GeoDiff becomes available.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Bootstrap: expose `window` so the IIFE can attach GeoDiff to it.
global.window = global;
eval(fs.readFileSync(path.join(__dirname, '../../src/description-diff.js'), 'utf8'));

const { diffDescriptions } = window.GeoDiff;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error('  FAIL: ' + message);
    failed++;
  } else {
    console.log('  pass: ' + message);
    passed++;
  }
}

// ---------------------------------------------------------------------------
// Test 1 — Empty prev, three-sentence next → all three in added
// ---------------------------------------------------------------------------
console.log('\nTest 1: empty prev, three-sentence next');
{
  const prev = '';
  const next = 'A normal fault dips 60 degrees east. A reverse fault dips 45 degrees west. The beds are tilted 20 degrees north.';
  const result = diffDescriptions(prev, next);

  assert(result.added.length === 3,       'added.length === 3');
  assert(result.unchanged.length === 0,   'unchanged.length === 0');
  assert(result.removed.length === 0,     'removed.length === 0');
  assert(result.modified.length === 0,    'modified.length === 0');
}

// ---------------------------------------------------------------------------
// Test 2 — Three-sentence prev, same three sentences in next → all unchanged
// ---------------------------------------------------------------------------
console.log('\nTest 2: identical prev and next — all unchanged');
{
  const text = 'A normal fault dips 60 degrees east. A reverse fault dips 45 degrees west. The beds are tilted 20 degrees north.';
  const result = diffDescriptions(text, text);

  assert(result.unchanged.length === 3,   'unchanged.length === 3');
  assert(result.added.length === 0,       'added.length === 0');
  assert(result.removed.length === 0,     'removed.length === 0');
  assert(result.modified.length === 0,    'modified.length === 0');
}

// ---------------------------------------------------------------------------
// Test 3 — Middle sentence changed → first and third unchanged, middle modified
// ---------------------------------------------------------------------------
console.log('\nTest 3: middle sentence changed → first+third unchanged, middle modified');
{
  const prev = 'A normal fault dips 60 degrees east. A reverse fault dips 45 degrees west. The beds are tilted 20 degrees north.';
  const next = 'A normal fault dips 60 degrees east. A reverse fault dips 70 degrees west. The beds are tilted 20 degrees north.';
  const result = diffDescriptions(prev, next);

  // The two flanking sentences are identical fingerprints → unchanged
  assert(result.unchanged.length === 2,   'unchanged.length === 2 (first + third)');

  // The middle sentence changed only "45" to "70", bigram similarity is well above 0.5
  // → it should be classified as modified, not removed+added
  assert(result.modified.length === 1,    'modified.length === 1 (middle sentence)');
  assert(result.removed.length === 0,     'removed.length === 0');
  assert(result.added.length === 0,       'added.length === 0');

  // Verify the before/after content
  assert(
    result.modified[0].before.text.includes('45'),
    'modified before text contains "45"'
  );
  assert(
    result.modified[0].after.text.includes('70'),
    'modified after text contains "70"'
  );
}

// ---------------------------------------------------------------------------
// Test 4 — Middle sentence deleted → first and third unchanged, middle removed
// ---------------------------------------------------------------------------
console.log('\nTest 4: middle sentence deleted → first+third unchanged, middle in removed');
{
  const prev = 'A normal fault dips 60 degrees east. A reverse fault dips 45 degrees west. The beds are tilted 20 degrees north.';
  const next = 'A normal fault dips 60 degrees east. The beds are tilted 20 degrees north.';
  const result = diffDescriptions(prev, next);

  assert(result.unchanged.length === 2,   'unchanged.length === 2 (first + third)');
  assert(result.removed.length === 1,     'removed.length === 1 (middle sentence)');
  assert(result.added.length === 0,       'added.length === 0');
  assert(result.modified.length === 0,    'modified.length === 0');

  assert(
    result.removed[0].text.includes('reverse fault'),
    'removed sentence is the reverse fault sentence'
  );
}

// ---------------------------------------------------------------------------
// Test 5 — All three sentences completely rewritten
//
// When the new sentences share almost no bigrams with the originals (Jaccard
// similarity <= 0.5), each old sentence lands in `removed` and each new sentence
// lands in `added`.  If the new text is *slightly* similar (similarity > 0.5)
// the pair is promoted to `modified`.  This test uses entirely unrelated geology
// vocabulary to stay firmly below the threshold.
// ---------------------------------------------------------------------------
console.log('\nTest 5: completely rewritten sentences — all removed (similarity below 0.5 threshold)');
{
  const prev = [
    'A normal fault dips 60 degrees east.',
    'A reverse fault dips 45 degrees west.',
    'The beds are tilted 20 degrees north.',
  ].join(' ');

  const next = [
    'Granite intrudes the surrounding schist.',
    'Horizontal chalk layers unconformably overlie folded mudstone.',
    'An anticline plunges 10 degrees southward.',
  ].join(' ');

  const result = diffDescriptions(prev, next);

  // The vocabulary is completely different — every pair should be well below
  // the 0.5 Jaccard bigram similarity threshold, so nothing is paired as modified.
  // Expected: 3 removed + 3 added, 0 modified, 0 unchanged.
  //
  // NOTE: if a particular pair happens to exceed 0.5 similarity it would be
  // reclassified as modified; this specific text was chosen to avoid that.
  assert(result.unchanged.length === 0, 'unchanged.length === 0');
  assert(result.removed.length + result.modified.length === 3,
    'removed+modified === 3 (all three original sentences accounted for)');
  assert(result.added.length + result.modified.length === 3,
    'added+modified === 3 (all three new sentences accounted for)');

  // For the chosen vocabulary we specifically expect 0 modified
  assert(result.modified.length === 0,
    'modified.length === 0 (texts are completely unrelated — below 0.5 similarity)');
  assert(result.removed.length === 3, 'removed.length === 3');
  assert(result.added.length === 3,   'added.length === 3');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed + failed} assertions: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('PASS: description-diff tests');
}
