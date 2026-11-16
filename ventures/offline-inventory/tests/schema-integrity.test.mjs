import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, addItem, setCount, removeItem, renameItem, toCsv} from '../src/inventory.mjs';

test('P2-INV-015 rejects incompatible or corrupted worksheet snapshots', () => {
  const valid=createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  const invalid=[null, undefined, {}, {items:valid.items}, {...valid,schemaVersion:2}, {...valid,schemaVersion:'1'}, {...valid,total:4}, {...valid,total:'3'}, {...valid,items:null}];
  for(const snapshot of invalid){
    assert.throws(()=>addItem(snapshot,{id:'nuts',name:'Nuts',count:1}),/Invalid worksheet/);
    assert.throws(()=>setCount(snapshot,'bolts',4),/Invalid worksheet/);
    assert.throws(()=>removeItem(snapshot,'bolts'),/Invalid worksheet/);
    assert.throws(()=>renameItem(snapshot,'bolts','New'),/Invalid worksheet/);
    assert.throws(()=>toCsv(snapshot),/Invalid worksheet/);
  }
  assert.equal(setCount(valid,'bolts',4).total,4);
  assert.equal(renameItem(valid,'bolts','Hex bolts').items[0].name,'Hex bolts');
  assert.equal(valid.total,3);
});
