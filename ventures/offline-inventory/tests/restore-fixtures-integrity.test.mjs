// P2-QA-101: verify generated fictional restore fixtures, not interactive browser behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRestoreFixtures} from './restore-fixtures.mjs';
import {fromJson} from '../src/inventory.mjs';

test('P2-QA-101 fixtures are deterministic, distinct, and safe', () => {
  const first = makeRestoreFixtures();
  const second = makeRestoreFixtures();
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first), [
    'restore-a.json', 'restore-b.json', 'invalid-total.json', 'oversized.json'
  ]);
  const a = fromJson(first['restore-a.json']);
  const b = fromJson(first['restore-b.json']);
  assert.equal(a.total, 3);
  assert.equal(b.total, 5);
  assert.notDeepEqual(a, b);
  assert.match(first['restore-a.json'], /Fictional bolts/);
  assert.match(first['restore-b.json'], /Fictional nuts/);
  assert.throws(() => fromJson(first['invalid-total.json']));
  assert.equal(Buffer.byteLength(first['oversized.json'], 'utf8'), 65537);
  assert.throws(() => fromJson(first['oversized.json']));
  for (const value of Object.values(first)) {
    assert.equal(typeof value, 'string');
    assert.ok(value.length > 0);
  }
});
