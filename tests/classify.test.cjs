const assert = require('node:assert/strict');
const {classify} = require('../src/classify.js');
const mock = require('../fixtures/service-mock.json');

const U = mock.core_calendar_get_calendar_upcoming_view.events;
const A = new Set(mock.core_calendar_get_action_events_by_timesort.events.map(e => e.id));

// Live HUJI data: finished Quiz 3 is missing from A; "open" quiz events claim isactionevent: true.
assert.deepEqual(classify(U, A), {33794: 'info', 28754: 'done', 30587: 'todo', 33795: 'todo'});

// Overrides win in both directions, even over 'info'.
assert.deepEqual(classify(U, A, {28754: 'todo', 30587: 'done', 33794: 'done'}),
  {33794: 'done', 28754: 'todo', 30587: 'done', 33795: 'todo'});

// Non-action events are info; garbage overrides are ignored; empty input is empty.
assert.deepEqual(classify([{id: 1, eventtype: 'user', isactionevent: false}], new Set(), {1: 'bogus'}), {1: 'info'});
assert.deepEqual(classify([], new Set()), {});

// Same inputs, same output.
assert.deepEqual(classify(U, A), classify(U, A));
console.log('classify: ok');
