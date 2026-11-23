import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, addItem, setCount, removeItem, renameItem, lowStockItems} from '../src/inventory.mjs';

test('P2-INV-051 low-stock reflects edits without mutating earlier snapshots', () => {
  const initial = createWorksheet([{id:'a',name:'Bolts',count:0},{id:'b',name:'Nuts',count:4}]);
  const added = addItem(initial,{id:'c',name:'Washers',count:2});
  const increased = setCount(added,'a',5);
  const renamed = renameItem(increased,'c','Small washers');
  const removed = removeItem(renamed,'b');
  assert.deepEqual(lowStockItems(initial,2).map(x=>x.id), ['a']);
  assert.deepEqual(lowStockItems(added,2).map(x=>x.id), ['a','c']);
  assert.deepEqual(lowStockItems(increased,2).map(x=>x.id), ['c']);
  assert.deepEqual(lowStockItems(renamed,2).map(x=>x.name), ['Small washers']);
  assert.deepEqual(lowStockItems(removed,2).map(x=>x.id), ['c']);
  assert.equal(removed.total,7);
  const rows = lowStockItems(removed,2);
  rows[0].name = 'Tampered';
  rows.push({id:'fake',name:'Fake',count:0});
  assert.deepEqual(lowStockItems(removed,2), [{id:'c',name:'Small washers',count:2}]);
});

test('P2-INV-052 low-stock validates schema even when no rows match', () => {
  const valid = createWorksheet([{id:'a',name:'Bolts',count:3}]);
  assert.deepEqual(lowStockItems(valid,0), []);
  for (const broken of [
    {...valid,total:0},
    {...valid,schemaVersion:2},
    {...valid,items:[{id:'a',name:'Bolts',count:-1}]},
    {...valid,extra:'unexpected'}
  ]) assert.throws(()=>lowStockItems(broken,0));
  assert.deepEqual(lowStockItems(valid,3), [{id:'a',name:'Bolts',count:3}]);
});
