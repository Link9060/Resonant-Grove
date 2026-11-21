import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet,searchItems,setCount} from '../src/inventory.mjs';

test('P2-INV-022 local search filters names and IDs without mutating worksheet', () => {
  const original=createWorksheet([
    {id:'hex-bolts',name:'Hex Bolts',count:3},
    {id:'washers',name:'Steel Washers',count:5},
    {id:'nuts',name:'Hex Nuts',count:2}
  ]);
  assert.deepEqual(searchItems(original,'HEX').map(x=>x.id),['hex-bolts','nuts']);
  assert.deepEqual(searchItems(original,'wash').map(x=>x.id),['washers']);
  assert.deepEqual(searchItems(original,'NUTS').map(x=>x.id),['nuts']);
  assert.deepEqual(searchItems(original,'  ').map(x=>x.id),['hex-bolts','washers','nuts']);
  assert.deepEqual(searchItems(original,'absent'),[]);
  assert.equal(original.total,10);
  assert.equal(setCount(original,'nuts',4).total,12);
  assert.equal(original.total,10);
  assert.throws(()=>searchItems(original,null),/Invalid search/);
  assert.throws(()=>searchItems(original,'x'.repeat(81)),/Invalid search/);
  assert.throws(()=>searchItems(original,'bad\nquery'),/Invalid search/);
});
