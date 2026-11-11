import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the actual persistence function with isolated browser dependencies.
const source = readFileSync('app.js', 'utf8');
const start = source.indexOf('  function save() {');
const end = source.indexOf('\n  function log(type,title,description)', start);
assert.ok(start >= 0 && end > start, 'real Grove save function must exist');
const saveSource = source.slice(start, end);

function harness({ failStorage = false, failRender = false, failCloud = false } = {}) {
  const events = [];
  const workspace = { version: 1, seeds: [], transactions: [], activity: [] };
  const localStorage = {
    setItem(key, value) {
      events.push(['storage', key, value]);
      if (failStorage) throw Error('Quota exceeded');
    }
  };
  const window = { GroveCloud: { scheduleSave() {
    events.push(['cloud']);
    if (failCloud) throw Error('Cloud scheduling failed');
  } } };
  const render = () => {
    events.push(['render']);
    if (failRender) throw Error('Render failed');
  };
  const toast = (message, error) => events.push(['toast', message, error]);
  const save = runInNewContext(
    '(function(localStorage,window,render,toast,db){const KEY="grove-test";' +
    saveSource + ';return save;})'
  )(localStorage, window, render, toast, workspace);
  return { save, events, workspace };
}

test('successful local save renders and schedules cloud synchronization', () => {
  const { save, events, workspace } = harness();
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'cloud']);
  assert.deepEqual(JSON.parse(events[0][2]), workspace);
});

test('failed local persistence never schedules cloud synchronization', () => {
  const { save, events } = harness({ failStorage: true });
  assert.equal(save(), false);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'toast', 'render']);
  assert.match(events[1][1], /Could not save/);
  assert.equal(events[1][2], true);
});

test('render failure after successful persistence still schedules cloud save', () => {
  const { save, events } = harness({ failRender: true });
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'toast', 'cloud']);
  assert.match(events[2][1], /Saved locally/);
});

test('cloud scheduling failure does not falsely report failed local persistence', () => {
  const { save, events } = harness({ failCloud: true });
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'cloud', 'toast']);
  assert.match(events[3][1], /Saved locally/);
});
