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

test('P2-INV-016 rejects corrupted rows even when the reported total matches', () => {
  const original = createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  const corrupt = [
    {...original,items:[{id:'bolts',name:'Bolts',count:'3'}]},
    {...original,items:[{id:'bolts',name:'Bolts',count:3},{id:'bolts',name:'Duplicate',count:0}]},
    {...original,items:[{id:123,name:'Bolts',count:3}]},
    {...original,items:[{id:'bolts',name:'<script>',count:3}]},
    {...original,items:[{id:'bolts',name:'Bolts',count:3.5}],total:3.5}
  ];
  for (const snapshot of corrupt) {
    for (const operation of [
      () => addItem(snapshot,{id:'nuts',name:'Nuts',count:1}),
      () => setCount(snapshot,'bolts',4),
      () => removeItem(snapshot,'bolts'),
      () => renameItem(snapshot,'bolts','Hex bolts'),
      () => toCsv(snapshot)
    ]) assert.throws(operation, /Invalid inventory row/);
  }
  assert.deepEqual(original,createWorksheet([{id:'bolts',name:'Bolts',count:3}]));
});
