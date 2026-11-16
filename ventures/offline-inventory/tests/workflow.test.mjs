import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, addItem, setCount, renameItem, removeItem, toCsv} from '../src/inventory.mjs';

test('P2-INV-017 multi-step offline inventory workflow preserves prior snapshots', () => {
  const initial = createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  const added = addItem(initial,{id:'nuts',name:'Nuts',count:5});
  const counted = setCount(added,'bolts',7);
  const renamed = renameItem(counted,'nuts','Hex nuts');
  const removed = removeItem(renamed,'bolts');
  assert.deepEqual(
    [initial.total,added.total,counted.total,renamed.total,removed.total],
    [3,8,12,12,5]
  );
  assert.deepEqual(initial.items,[{id:'bolts',name:'Bolts',count:3}]);
  assert.deepEqual(added.items,[{id:'bolts',name:'Bolts',count:3},{id:'nuts',name:'Nuts',count:5}]);
  assert.deepEqual(counted.items,[{id:'bolts',name:'Bolts',count:7},{id:'nuts',name:'Nuts',count:5}]);
  assert.deepEqual(renamed.items,[{id:'bolts',name:'Bolts',count:7},{id:'nuts',name:'Hex nuts',count:5}]);
  assert.deepEqual(removed.items,[{id:'nuts',name:'Hex nuts',count:5}]);
  assert.equal(toCsv(removed),'id,name,count\r\n"nuts","Hex nuts","5"\r\n');
  assert.equal(toCsv(removed),toCsv(removed));
  assert.throws(()=>removeItem(removed,'bolts'),/Unknown item/);
  assert.deepEqual(removed.items,[{id:'nuts',name:'Hex nuts',count:5}]);
});
