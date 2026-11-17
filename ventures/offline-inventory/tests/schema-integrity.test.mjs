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

test('P2-INV-018 rejects invisible directional marks without blocking ordinary Unicode', () => {
  const original = createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  for (const mark of ['\u061c','\u200e','\u200f']) {
    assert.throws(() => createWorksheet([{id:'bad',name:'Part'+mark+'A',count:1}]), /Invalid inventory row/);
    assert.throws(() => renameItem(original,'bolts','Part'+mark+'A'), /Invalid item name/);
    assert.throws(() => addItem(original,{id:'bad',name:'Part'+mark+'A',count:1}), /Invalid inventory row/);
  }
  assert.equal(renameItem(original,'bolts','Pièces').items[0].name,'Pièces');
  assert.deepEqual(original,createWorksheet([{id:'bolts',name:'Bolts',count:3}]));
});

test('P2-INV-019 rejects Unicode line separators in labels and preserves original snapshot', () => {
  const original = createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  for (const separator of ['\u0085','\u2028','\u2029']) {
    assert.throws(() => createWorksheet([{id:'bad',name:'Part'+separator+'A',count:1}]), /Invalid inventory row/);
    assert.throws(() => addItem(original,{id:'bad',name:'Part'+separator+'A',count:1}), /Invalid inventory row/);
    assert.throws(() => renameItem(original,'bolts','Part'+separator+'A'), /Invalid item name/);
  }
  assert.equal(renameItem(original,'bolts','Pièces').items[0].name,'Pièces');
  assert.deepEqual(original,createWorksheet([{id:'bolts',name:'Bolts',count:3}]));
});


test('P2-INV-024 rejects unexpected snapshot and row metadata without mutating fixtures', () => {
  const original = createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  const snapshots = [
    {...original, customerEmail:'fictional@example.invalid'},
    {...original, items:[{...original.items[0], notes:'untracked'}]},
    {...original, items:[{...original.items[0], extra:undefined}]}
  ];
  for (const snapshot of snapshots) {
    for (const operation of [
      () => addItem(snapshot,{id:'nuts',name:'Nuts',count:1}),
      () => setCount(snapshot,'bolts',4),
      () => removeItem(snapshot,'bolts'),
      () => renameItem(snapshot,'bolts','New'),
      () => toCsv(snapshot)
    ]) assert.throws(operation, /Invalid (worksheet|inventory row) metadata/);
  }
  assert.deepEqual(original,createWorksheet([{id:'bolts',name:'Bolts',count:3}]));
  assert.match(toCsv(original), /"bolts","Bolts","3"/);
});

test('P2-INV-025 rejects unexpected metadata on creation and addition', () => {
  const fixture = {id:'bolts',name:'Bolts',count:3};
  const original = createWorksheet([fixture]);
  const extras = [
    {...fixture, notes:'fictional internal note'},
    {...fixture, customerEmail:'nobody@example.invalid'},
    {...fixture, extra:undefined}
  ];
  for (const row of extras) {
    assert.throws(() => createWorksheet([row]), /Invalid inventory row/);
    assert.throws(() => addItem(createWorksheet([]), row), /Invalid inventory row/);
  }
  assert.deepEqual(original, createWorksheet([fixture]));
  assert.deepEqual(fixture, {id:'bolts',name:'Bolts',count:3});
  assert.equal(toCsv(original), 'id,name,count\\r\\n"bolts","Bolts","3"\\r\\n');
});
