import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, addItem, setCount, fromJson, toJson} from '../src/inventory.mjs';

test('P2-INV-046 restored backups and subsequent edits remain independent snapshots', () => {
  const source = createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  const backup = toJson(source);
  const restored = fromJson(backup);
  assert.deepEqual(restored, source);
  assert.notStrictEqual(restored, source);
  assert.notStrictEqual(restored.items, source.items);
  assert.notStrictEqual(restored.items[0], source.items[0]);

  const edited = addItem(setCount(restored,'bolts',7), {id:'nuts',name:'Nuts',count:2});
  assert.equal(edited.total, 9);
  assert.equal(restored.total, 3);
  assert.equal(source.total, 3);
  assert.equal(toJson(source), backup);
  assert.equal(toJson(restored), backup);
  assert.deepEqual(fromJson(backup), source);

  edited.items[0].name = 'Changed in edited snapshot';
  assert.equal(source.items[0].name, 'Bolts');
  assert.equal(restored.items[0].name, 'Bolts');
  assert.equal(toJson(restored), backup);
});
