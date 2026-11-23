import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, toJson, fromJson} from '../src/inventory.mjs';

test('P2-INV-041 JSON backup accepts exactly 64 KiB UTF-8 and rejects the next byte', () => {
  const original = createWorksheet([{id:'part', name:'Café 🔩', count:2}]);
  const backup = toJson(original);
  const encoder = new TextEncoder();
  const remaining = 65536 - encoder.encode(backup).byteLength;
  assert.ok(remaining > 0);
  const atLimit = backup + ' '.repeat(remaining);
  assert.equal(encoder.encode(atLimit).byteLength, 65536);
  assert.deepEqual(fromJson(atLimit), original);
  assert.throws(() => fromJson(atLimit + ' '), /Invalid worksheet JSON/);
  assert.equal(toJson(original), backup);
});

test('P2-INV-042 multibyte padding over limit is rejected by bytes, not code units', () => {
  const original = createWorksheet([{id:'part', name:'Part', count:1}]);
  const backup = toJson(original);
  const room = 65536 - new TextEncoder().encode(backup).byteLength;
  const padding = ' '.repeat(room - 1);
  assert.deepEqual(fromJson(backup + padding), original);
  assert.throws(() => fromJson(backup + padding + 'é'), /Invalid worksheet JSON/);
});
