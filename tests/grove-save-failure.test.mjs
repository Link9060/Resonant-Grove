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

function harness({ failStorage = false, failRender = false, failCloud = false, cloudUnavailable = false } = {}) {
  const events = [];
  const stored = new Map();
  const controls = { failStorage, failRender, failCloud };
  const workspace = { version: 1, seeds: [], transactions: [], activity: [] };
  const localStorage = {
    setItem(key, value) {
      events.push(['storage', key, value]);
      if (controls.failStorage) throw Error('Quota exceeded');
      stored.set(key, value);
    }
  };
  const window = { GroveCloud: { scheduleSave() {
    events.push(['cloud']);
    if (controls.failCloud) throw Error('Cloud scheduling failed');
  } } };
  if (cloudUnavailable) delete window.GroveCloud;
  const render = () => {
    events.push(['render']);
    if (controls.failRender) throw Error('Render failed');
  };
  const toast = (message, error) => events.push(['toast', message, error]);
  const save = runInNewContext(
    '(function(localStorage,window,render,toast,db){const KEY="grove-test";' +
    saveSource + ';return save;})'
  )(localStorage, window, render, toast, workspace);
  return { save, events, workspace, controls, stored };
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

test('unserializable workspace fails safely without cloud sync and can recover', () => {
  const { save, events, workspace } = harness();
  workspace.circular = workspace;
  assert.equal(save(), false);
  assert.deepEqual(events.map(e => e[0]), ['toast', 'render']);
  assert.match(events[0][1], /Could not save/);
  assert.equal(events[0][2], true);

  delete workspace.circular;
  events.length = 0;
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'cloud']);
});

test('storage failure remains authoritative even if error-screen rendering fails', () => {
  const { save, events } = harness({ failStorage: true, failRender: true });
  assert.equal(save(), false);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'toast', 'render']);
  assert.equal(events.some(e => e[0] === 'cloud'), false);
});

test('recovery on the same workspace after storage quota failure saves and schedules sync', () => {
  const { save, events, workspace, controls } = harness({ failStorage: true });
  assert.equal(save(), false);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'toast', 'render']);
  controls.failStorage = false;
  workspace.seeds.push({ id: 'recovered-seed' });
  events.length = 0;
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'cloud']);
  assert.deepEqual(JSON.parse(events[0][2]), workspace);
});


test('cloud scheduling failure recovers on the same workspace without losing local changes', () => {
  const { save, events, workspace, controls } = harness({ failCloud: true });
  workspace.seeds.push({ id: 'offline-seed' });
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'cloud', 'toast']);
  assert.deepEqual(JSON.parse(events[0][2]), workspace);
  assert.match(events[3][1], /Saved locally/);

  controls.failCloud = false;
  workspace.seeds.push({ id: 'synced-seed' });
  events.length = 0;
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'cloud']);
  assert.deepEqual(JSON.parse(events[0][2]), workspace);
});


test('BigInt serialization failure does not overwrite storage or schedule cloud sync', () => {
  const { save, events, workspace } = harness();
  workspace.seeds.push({ id: 'bad-seed', goal: 1n });
  assert.equal(save(), false);
  assert.deepEqual(events.map(e => e[0]), ['toast', 'render']);
  assert.match(events[0][1], /Could not save/);
  assert.equal(events.some(e => e[0] === 'storage' || e[0] === 'cloud'), false);

  workspace.seeds[0].goal = 1;
  events.length = 0;
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'cloud']);
  assert.deepEqual(JSON.parse(events[0][2]), workspace);
});


test('simultaneous render and cloud failures preserve successful local save', () => {
  const { save, events, workspace, controls } = harness({ failRender: true, failCloud: true });
  workspace.seeds.push({ id: 'saved-despite-ui-and-cloud-errors' });
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'toast', 'cloud', 'toast']);
  assert.deepEqual(JSON.parse(events[0][2]), workspace);
  assert.match(events[2][1], /Saved locally/);
  assert.match(events[4][1], /Saved locally/);

  controls.failRender = false;
  controls.failCloud = false;
  events.length = 0;
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'cloud']);
  assert.deepEqual(JSON.parse(events[0][2]), workspace);
});


test('local persistence works when optional Grove Cloud is unavailable', () => {
  const { save, events, workspace } = harness({ cloudUnavailable: true });
  workspace.seeds.push({ id: 'offline-only-seed' });
  assert.equal(save(), true);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render']);
  assert.deepEqual(JSON.parse(events[0][2]), workspace);
  assert.equal(events.some(e => e[0] === 'toast' || e[0] === 'cloud'), false);
});


test('failed serialization preserves the last successfully stored workspace snapshot', () => {
  const { save, workspace, stored, events } = harness();
  workspace.seeds.push({ id: 'last-good-seed' });
  assert.equal(save(), true);
  const lastGood = stored.get('grove-test');
  assert.ok(lastGood, 'baseline snapshot was written');

  workspace.seeds.push({ id: 'unserializable-seed', goal: 1n });
  events.length = 0;
  assert.equal(save(), false);
  assert.equal(stored.get('grove-test'), lastGood, 'failed save must not overwrite prior snapshot');
  assert.deepEqual(events.map(e => e[0]), ['toast', 'render']);
  assert.deepEqual(JSON.parse(stored.get('grove-test')).seeds.map(s => s.id), ['last-good-seed']);

  workspace.seeds[1].goal = 1;
  events.length = 0;
  assert.equal(save(), true);
  assert.deepEqual(JSON.parse(stored.get('grove-test')).seeds.map(s => s.id), ['last-good-seed', 'unserializable-seed']);
  assert.deepEqual(events.map(e => e[0]), ['storage', 'render', 'cloud']);
});
