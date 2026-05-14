// tests/unit/merge-into-model.test.js
// Unit tests for mergeIntoModel logic.
//
// mergeIntoModel is a module-level function inside the IIFE in workspace.jsx.
// We copy its logic here as a local function (acceptable for unit-testing a
// non-exported pure function) and test four key behaviours:
//
//   1. Unchanged events preserve manual edits (including the manually-edited dip).
//   2. A modified originating sentence clears manual edits.
//   3. A removed originating sentence drops the event entirely.
//   4. Preserve path restores hand-tuned field values when the LLM returns a
//      different value for an unchanged event.

'use strict';

// ---------------------------------------------------------------------------
// fingerprintSentence — mirrors description-diff.js
// ---------------------------------------------------------------------------
function fingerprintSentence(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// mergeIntoModel — verbatim copy of the function from workspace.jsx
// (with window.GeoDiff.fingerprintSentence replaced by local fingerprintSentence,
//  and applyDefaults replaced by a no-op since we test the merge logic only)
// ---------------------------------------------------------------------------
function mergeIntoModel(existingModel, mergeResp, diff) {
  const next = JSON.parse(JSON.stringify(existingModel));

  const modifiedFingerprints = new Set(diff.modified.map(m => m.before.fingerprint));
  const removedFingerprints = new Set(diff.removed.map(r => r.fingerprint));

  // Remove events whose originating sentence was removed
  next.events = (next.events || []).filter(e => {
    const fp = fingerprintSentence(e.description_source || '');
    return !removedFingerprints.has(fp);
  });

  // Remove layers by id
  (mergeResp.remove_layer_ids || []).forEach(id => {
    next.layers = (next.layers || []).filter(l => l.id !== id);
  });

  // Upsert events
  (mergeResp.upsert_events || []).forEach(upsertEvt => {
    const existingIdx = (next.events || []).findIndex(e => e.id === upsertEvt.id);
    if (existingIdx >= 0) {
      const existing = next.events[existingIdx];
      const fp = fingerprintSentence(existing.description_source || '');
      if (modifiedFingerprints.has(fp)) {
        // Originating sentence was edited — new interpretation wins, clear manual edits
        next.events[existingIdx] = upsertEvt;
      } else {
        // Preserve manually_edited fields whose values are unchanged
        const merged = Object.assign({}, upsertEvt);
        if (existing.manually_edited) {
          merged.manually_edited = true;
          // Restore the values of manually-edited fields from the existing event
          const fieldOrigin = existing.field_origin || {};
          Object.keys(fieldOrigin).forEach(field => {
            if (fieldOrigin[field] === 'stated' && existing.manually_edited) {
              merged[field] = existing[field];
              if (!merged.field_origin) merged.field_origin = {};
              merged.field_origin[field] = 'stated';
            }
          });
        }
        next.events[existingIdx] = merged;
      }
    } else {
      next.events = next.events || [];
      next.events.push(upsertEvt);
    }
  });

  // Upsert layers
  (mergeResp.upsert_layers || []).forEach(upsertLayer => {
    const existingIdx = (next.layers || []).findIndex(l => l.id === upsertLayer.id);
    if (existingIdx >= 0) {
      next.layers[existingIdx] = upsertLayer;
    } else {
      next.layers = next.layers || [];
      next.layers.push(upsertLayer);
    }
  });

  // applyDefaults not exercised here (no window.GD in Node.js)
  return next;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failed++;
  } else {
    passed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`  FAIL: ${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
    failed++;
  } else {
    passed++;
  }
}

function test(name, fn) {
  console.log(`\nTest: ${name}`);
  try {
    fn();
  } catch (err) {
    console.error(`  EXCEPTION: ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Test 1 — unchanged events preserve manual edits
// ---------------------------------------------------------------------------
// Sentences:
//   A = "A normal fault dips 60 degrees east."   → E1 (unchanged)
//   B = "A reverse fault dips 45 degrees west."  → E2 (unchanged; dip manually edited to 70)
//   C = "A thrust fault dips 25 degrees."        → E3 (modified → C')
//
// Diff: A unchanged, B unchanged, C modified → C'
// Merge response: upsert E3 with new dip from C'
// Expected: E1 untouched, E2 keeps dip=70 and manually_edited=true, E3 replaced
// ---------------------------------------------------------------------------
test('unchanged events preserve manual edits', () => {
  const sentA = 'A normal fault dips 60 degrees east.';
  const sentB = 'A reverse fault dips 45 degrees west.';
  const sentC = 'A thrust fault dips 25 degrees.';
  const sentCprime = 'A thrust fault dips 30 degrees.';

  const existingModel = {
    meta: {},
    layers: [],
    events: [
      {
        id: 'E1', type: 'fault', subtype: 'normal', dip: 60,
        description_source: sentA,
        field_origin: { dip: 'stated' },
        manually_edited: false,
      },
      {
        id: 'E2', type: 'fault', subtype: 'reverse', dip: 70, // manually edited from 45 → 70
        description_source: sentB,
        field_origin: { dip: 'stated' },
        manually_edited: true,
      },
      {
        id: 'E3', type: 'fault', subtype: 'thrust', dip: 25,
        description_source: sentC,
        field_origin: { dip: 'stated' },
        manually_edited: false,
      },
    ],
  };

  const diff = {
    unchanged: [
      { fingerprint: fingerprintSentence(sentA), text: sentA },
      { fingerprint: fingerprintSentence(sentB), text: sentB },
    ],
    added: [],
    removed: [],
    modified: [
      {
        before: { fingerprint: fingerprintSentence(sentC), text: sentC },
        after:  { fingerprint: fingerprintSentence(sentCprime), text: sentCprime },
      },
    ],
  };

  const mergeResp = {
    merge: true,
    upsert_layers: [],
    upsert_events: [
      {
        id: 'E3', type: 'fault', subtype: 'thrust', dip: 30,
        description_source: sentCprime,
        field_origin: { dip: 'stated' },
      },
    ],
    remove_layer_ids: [],
    remove_event_ids: [],
  };

  const result = mergeIntoModel(existingModel, mergeResp, diff);

  assert(result.events.length === 3, 'still 3 events');

  const e1 = result.events.find(e => e.id === 'E1');
  const e2 = result.events.find(e => e.id === 'E2');
  const e3 = result.events.find(e => e.id === 'E3');

  // E1: completely untouched (no merge response touched it)
  assert(e1 !== undefined, 'E1 exists');
  assert(e1.dip === 60, 'E1 dip unchanged');
  assert(!e1.manually_edited, 'E1 not manually_edited');

  // E2: unchanged sentence — manually-edited dip should survive
  assert(e2 !== undefined, 'E2 exists');
  assert(e2.dip === 70, 'E2 manually-edited dip preserved (70, not 45)');
  assert(e2.manually_edited === true, 'E2 manually_edited flag preserved');

  // E3: modified sentence — replaced entirely
  assert(e3 !== undefined, 'E3 exists');
  assert(e3.dip === 30, 'E3 dip updated to 30 from changed sentence');
  assert(!e3.manually_edited, 'E3 manually_edited cleared');

  console.log('  PASS');
});

// ---------------------------------------------------------------------------
// Test 2 — modified originating sentence clears manual edits
// ---------------------------------------------------------------------------
// E1 (sentence A, dip manually edited to 70)
// Diff: A modified → A'
// Expected: E1 replaced; dip is whatever the merge response says; manually_edited gone
// ---------------------------------------------------------------------------
test('modified originating sentence clears manual edits', () => {
  const sentA = 'A normal fault dips 60 degrees east.';
  const sentAprime = 'A normal fault dips 50 degrees east.';

  const existingModel = {
    meta: {},
    layers: [],
    events: [
      {
        id: 'E1', type: 'fault', subtype: 'normal', dip: 70,
        description_source: sentA,
        field_origin: { dip: 'stated' },
        manually_edited: true,
      },
    ],
  };

  const diff = {
    unchanged: [],
    added: [],
    removed: [],
    modified: [
      {
        before: { fingerprint: fingerprintSentence(sentA), text: sentA },
        after:  { fingerprint: fingerprintSentence(sentAprime), text: sentAprime },
      },
    ],
  };

  const mergeResp = {
    merge: true,
    upsert_layers: [],
    upsert_events: [
      {
        id: 'E1', type: 'fault', subtype: 'normal', dip: 50,
        description_source: sentAprime,
        field_origin: { dip: 'stated' },
      },
    ],
    remove_layer_ids: [],
    remove_event_ids: [],
  };

  const result = mergeIntoModel(existingModel, mergeResp, diff);

  assert(result.events.length === 1, 'still 1 event');
  const e1 = result.events[0];
  assert(e1.id === 'E1', 'E1 still present');
  assert(e1.dip === 50, 'E1 dip replaced to 50 (new interpretation)');
  assert(!e1.manually_edited, 'E1 manually_edited cleared because originating sentence changed');

  console.log('  PASS');
});

// ---------------------------------------------------------------------------
// Test 3 — removed sentence drops event
// ---------------------------------------------------------------------------
// E1 (sentence A, unchanged), E2 (sentence B, removed)
// Diff: A unchanged, B removed
// Expected: E1 kept, E2 dropped
// ---------------------------------------------------------------------------
test('removed sentence drops event', () => {
  const sentA = 'A normal fault dips 60 degrees east.';
  const sentB = 'A reverse fault dips 45 degrees west.';

  const existingModel = {
    meta: {},
    layers: [],
    events: [
      {
        id: 'E1', type: 'fault', subtype: 'normal', dip: 60,
        description_source: sentA,
        field_origin: { dip: 'stated' },
        manually_edited: false,
      },
      {
        id: 'E2', type: 'fault', subtype: 'reverse', dip: 45,
        description_source: sentB,
        field_origin: { dip: 'stated' },
        manually_edited: false,
      },
    ],
  };

  const diff = {
    unchanged: [
      { fingerprint: fingerprintSentence(sentA), text: sentA },
    ],
    added: [],
    removed: [
      { fingerprint: fingerprintSentence(sentB), text: sentB },
    ],
    modified: [],
  };

  const mergeResp = {
    merge: true,
    upsert_layers: [],
    upsert_events: [],
    remove_layer_ids: [],
    remove_event_ids: ['E2'],
  };

  const result = mergeIntoModel(existingModel, mergeResp, diff);

  assert(result.events.length === 1, 'only 1 event remains (E2 dropped)');
  const e1 = result.events[0];
  assert(e1.id === 'E1', 'remaining event is E1');
  assert(e1.dip === 60, 'E1 dip unchanged');
  assert(!result.events.find(e => e.id === 'E2'), 'E2 is gone');

  console.log('  PASS');
});

// ---------------------------------------------------------------------------
// Test 4 — preserve path restores manually-edited field value over LLM value
// ---------------------------------------------------------------------------
// E1 (sentence A, dip manually edited to 60 with field_origin.dip = 'stated')
// Diff: A unchanged (in unchanged list)
// Merge response: LLM mistakenly returns E1 in upsert_events with dip=45
// Expected: E1's dip stays 60 (hand-tuned value restored); manually_edited=true preserved
// ---------------------------------------------------------------------------
test('preserve path restores manually-edited field value over LLM value', () => {
  const sentA = 'A normal fault dips 60 degrees east.';

  const existingModel = {
    meta: {},
    layers: [],
    events: [
      {
        id: 'E1', type: 'fault', subtype: 'normal', dip: 60,
        description_source: sentA,
        field_origin: { dip: 'stated' },
        manually_edited: true,
      },
    ],
  };

  const diff = {
    unchanged: [
      { fingerprint: fingerprintSentence(sentA), text: sentA },
    ],
    added: [],
    removed: [],
    modified: [],
  };

  // Simulate LLM mistakenly returning E1 in upsert_events with a different dip
  const mergeResp = {
    merge: true,
    upsert_events: [
      {
        id: 'E1', type: 'fault', subtype: 'normal', dip: 45,
        description_source: sentA,
        field_origin: { dip: 'inferred' },
      },
    ],
    upsert_layers: [],
    remove_layer_ids: [],
    remove_event_ids: [],
  };

  const result = mergeIntoModel(existingModel, mergeResp, diff);

  assert(result.events.length === 1, 'Test 4: still 1 event');
  // The manually-edited dip (60) should be restored over the LLM's value (45)
  assertEqual(result.events[0].dip, 60, 'Test 4: manually-edited dip should be preserved');
  assertEqual(result.events[0].manually_edited, true, 'Test 4: manually_edited flag preserved');

  console.log('  PASS');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed} assertions passed, ${failed} failed.`);
if (failed > 0) {
  console.error('FAIL: some assertions failed');
  process.exit(1);
} else {
  console.log('PASS: all merge-into-model tests');
}
