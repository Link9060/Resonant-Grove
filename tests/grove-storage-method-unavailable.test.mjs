import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Test the real save implementation when a browser storage shim is malformed.
const source = readFileSync('app.js', 'utf8');
const start = source.indexOf('  function save() {');
const end = source.indexOf('\n  function log(type,title,description)', start);
assert.ok(start >= 0 && end > start, 'save implementation must exist');
const saveSource = source.slice(start, end);

test('non-callable storage write method fails closed and recovers without cloud writes', () => {
  const stored = new Map();
  const events = [];
  const db = { version: 1, seeds: [{ id: 'baseline' }], transactions: [], activity: [] };
  const storage = {
    setItem(key, value) { stored.set(key, value); events.push('storage'); }
  };
  const save = runInNewContext(
    '(function(){const KEY="grove-test";' + saveSource + ';return save;})()',
    {
      localStorage: storage, db,
      window: { GroveCloud: { scheduleSave() { events.push('cloud'); } } },
      render() { events.push('render'); },
      toast(message, error) { events.push(['toast', message, error]); }
    }
  );
  assert.equal(save(), true);
  const baseline = stored.get('grove-test');
  db.seeds.push({ id: 'pending' });
  storage.setItem = undefined;
  events.length = 0;
  assert.equal(save(), false);
  assert.equal(stored.get('grove-test'), baseline);
  assert.deepEqual(events.map(e => Array.isArray(e) ? e[0] : e), ['toast', 'render']);
  assert.match(events[0][1], /Could not save/);
  assert.equal(events[0][2], true);
  storage.setItem = (key, value) => { stored.set(key, value); events.push('storage'); };
  events.length = 0;
  assert.equal(save(), true);
  assert.deepEqual(events, ['storage', 'render', 'cloud']);
  assert.deepEqual(JSON.parse(stored.get('grove-test')).seeds.map(s => s.id), ['baseline', 'pending']);
});
