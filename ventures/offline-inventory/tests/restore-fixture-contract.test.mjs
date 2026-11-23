/** P2-QA-151: fictional restore fixtures remain deterministic and semantically distinct. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRestoreFixtures} from './restore-fixtures.mjs';
import {fromJson} from '../src/inventory.mjs';

test('P2-QA-151 deterministic, isolated fictional restore fixtures', () => {
  const first = makeRestoreFixtures();
  const second = makeRestoreFixtures();
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first).sort(), ['invalid-total.json','oversized.json','restore-a.json','restore-b.json']);
  const a = fromJson(first['restore-a.json']);
  const b = fromJson(first['restore-b.json']);
  assert.equal(a.total, 3);
  assert.equal(b.total, 5);
  assert.notDeepEqual(a.items, b.items);
  assert.throws(() => fromJson(first['invalid-total.json']));
  assert.throws(() => fromJson(first['oversized.json']));
  assert.ok(Buffer.byteLength(first['oversized.json'], 'utf8') > 65536);
  assert.ok(Buffer.byteLength(first['restore-a.json'], 'utf8') <= 65536);
  assert.ok(Buffer.byteLength(first['restore-b.json'], 'utf8') <= 65536);
});
