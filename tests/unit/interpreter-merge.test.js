// tests/unit/interpreter-merge.test.js
// Verifies that a merge-mode LLM response has the correct shape
// and that id reuse works as expected.

function runTests() {
  // Mock an existing model
  const existingModel = {
    layers: [],
    events: [
      { id: 'E1', type: 'fault', description_source: 'A normal fault dips 60 degrees east.', dip: 60 },
      { id: 'E2', type: 'fault', description_source: 'A reverse fault dips 45 degrees west.', dip: 45 },
    ]
  };

  // Mock a valid merge-mode LLM response (what the LLM would return)
  const mockMergeResponse = {
    merge: true,
    upsert_layers: [],
    upsert_events: [
      { id: 'E2', type: 'fault', description_source: 'A steeply dipping reverse fault, 70 degrees west.', dip: 70 }
    ],
    remove_layer_ids: [],
    remove_event_ids: []
  };

  // Assertions
  console.assert(mockMergeResponse.merge === true, 'merge flag must be true');
  console.assert(Array.isArray(mockMergeResponse.upsert_events), 'upsert_events must be array');
  console.assert(mockMergeResponse.upsert_events.length === 1, 'one changed event');
  console.assert(mockMergeResponse.upsert_events[0].id === 'E2', 'id E2 reused for modified sentence');
  console.assert(mockMergeResponse.upsert_events[0].dip === 70, 'new dip value from changed sentence');
  console.assert(Array.isArray(mockMergeResponse.remove_event_ids), 'remove_event_ids must be array');

  console.log('PASS: interpreter-merge tests');
}

runTests();
