import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, addItem, setCount, renameItem, removeItem, searchItems, toJson, fromJson} from '../src/inventory.mjs';

test('P2-INV-043 rejected operations cannot mutate the prior worksheet or its backup', () => {
  const original = createWorksheet([{id:'bolts', name:'Bolts', count:3}]);
  const before = toJson(original);
  const rejected = [
    () => addItem(original, {id:'bolts', name:'Duplicate', count:2}),
    () => addItem(original, {id:'nuts', name:'Nuts', count:-1}),
    () => setCount(original, 'bolts', Number.NaN),
    () => setCount(original, 'missing', 1),
    () => renameItem(original, 'bolts', '<script>'),
    () => removeItem(original, 'missing'),
    () => searchItems(original, '\u202e')
  ];
  for (const operation of rejected) {
    assert.throws(operation, Error);
    assert.equal(toJson(original), before);
    assert.deepEqual(fromJson(before), original);
  }
});

test('P2-INV-044 restored backup is independent of subsequent edits', () => {
  const original = createWorksheet([{id:'bolts', name:'Bolts', count:3}]);
  const backup = toJson(original);
  const restored = fromJson(backup);
  const edited = renameItem(setCount(restored, 'bolts', 8), 'bolts', 'Hex bolts');
  assert.deepEqual(restored, original);
  assert.equal(toJson(original), backup);
  assert.equal(toJson(restored), backup);
  assert.deepEqual(edited.items, [{id:'bolts', name:'Hex bolts', count:8}]);
  assert.equal(edited.total, 8);
});
