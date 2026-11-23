import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, fromJson, toJson} from '../src/inventory.mjs';

test('P2-INV-036 JSON restore size limit counts UTF-8 bytes, not JavaScript characters', () => {
  const original = createWorksheet([{id:'part',name:'Écrou',count:3}]);
  assert.deepEqual(fromJson(toJson(original)), original);
  // Each accented character uses two UTF-8 bytes, despite one JS code unit.
  const oversized = 'é'.repeat(32769);
  assert.ok(oversized.length < 65536);
  assert.ok(new TextEncoder().encode(oversized).byteLength > 65536);
  assert.throws(() => fromJson(oversized), /Invalid worksheet JSON/);
  assert.throws(() => fromJson('x'.repeat(65537)), /Invalid worksheet JSON/);
  assert.deepEqual(original, createWorksheet([{id:'part',name:'Écrou',count:3}]));
});
