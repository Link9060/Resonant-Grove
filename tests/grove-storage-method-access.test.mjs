import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise Grove's real save function, not a rewritten copy.
const source = readFileSync('app.js', 'utf8');
const start = source.indexOf('  function save() {');
const end = source.indexOf('\n  function log(type,title,description)', start);
assert.ok(start >= 0 && end > start, 'save implementation must be found');
const saveSource = source.slice(start, end);

test('storage setItem getter failure preserves last-good data and later recovers', () => {
  const stored = new Map();
  const events = [];
  const db = { version: 1, seeds: [{ id: 'baseline' }], transactions: [], activity: [] };
  const storage = {};
  Object.defineProperty(storage, 'setItem', {
    configurable: true,
    value(key, value) { events.push('storage'); stored.set(key, value); }
  });
  const context = {
    localStorage: storage,
    db,
    window: { GroveCloud: { scheduleSave() { events.push('cloud'); } } },
    render() { events.push('render'); },
    toast(message, isError) { events.push(['toast', message, isError]); }
  };
  const save = runInNewContext(
    '(function(){const KEY="grove-test";' + saveSource + ';return save;})()',
    context
  );
  assert.equal(save(), true);
  const baseline = stored.get('grove-test');

  Object.defineProperty(storage, 'setItem', {
    configurable: true,
    get() { throw Error('SecurityError: write method inaccessible'); }
  });
  db.seeds.push({ id: 'pending' });
  events.length = 0;
  assert.equal(save(), false);
  assert.equal(stored.get('grove-test'), baseline);
  assert.deepEqual(events.map(e => Array.isArray(e) ? e[0] : e), ['toast', 'render']);
  assert.match(events[0][1], /Could not save/);
  assert.equal(events[0][2], true);

  Object.defineProperty(storage, 'setItem', {
    configurable: true,
    value(key, value) { events.push('storage'); stored.set(key, value); }
  });
  events.length = 0;
  assert.equal(save(), true);
  assert.deepEqual(events, ['storage', 'render', 'cloud']);
  assert.deepEqual(JSON.parse(stored.get('grove-test')).seeds.map(s => s.id), ['baseline', 'pending']);
});
