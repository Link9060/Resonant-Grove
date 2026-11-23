import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, toJson, fromJson, toCsv} from '../src/inventory.mjs';

test('P2-INV-034 deterministic offline JSON roundtrip', () => {
  const source = createWorksheet([{id:'bolts',name:' Bolts ',count:3},{id:'nuts',name:'Nuts',count:5}]);
  const backup = toJson(source);
  assert.equal(backup, '{"schemaVersion":1,"items":[{"id":"bolts","name":"Bolts","count":3},{"id":"nuts","name":"Nuts","count":5}],"total":8}\n');
  const restored = fromJson(backup);
  assert.deepEqual(restored, source);
  assert.notStrictEqual(restored, source);
  assert.equal(toCsv(restored), toCsv(source));
  assert.equal(toJson(restored), backup);
});

test('P2-INV-035 reject malformed, oversized and tampered offline JSON backups', () => {
  const valid = createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  for (const input of [null, 7, '', '{', '[]', 'null', 'true', '{}', ' '.repeat(65537)]) {
    assert.throws(() => fromJson(input));
  }
  for (const mutation of [
    {...valid, total:4},
    {...valid, schemaVersion:2},
    {...valid, secret:'unexpected'},
    {...valid, items:[{...valid.items[0], customerEmail:'example@example.invalid'}]},
    {...valid, items:[{...valid.items[0], count:-1}]}
  ]) assert.throws(() => fromJson(JSON.stringify(mutation)));
  assert.deepEqual(fromJson(toJson(valid)),valid);
});
