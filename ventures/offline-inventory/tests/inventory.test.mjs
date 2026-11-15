import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, addItem, setCount, removeItem} from '../src/inventory.mjs';
test('P2-INV-001 deterministic local totals', () => {
  const a = createWorksheet([{id:'bolts',name:'Bolts',count:3},{id:'nuts',name:'Nuts',count:5}]);
  assert.equal(a.total,8); assert.deepEqual(createWorksheet(a.items),a);
});
test('P2-INV-002 adding and updating items leaves input unchanged', () => {
  const original = createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  const added = addItem(original,{id:'nuts',name:'Nuts',count:4});
  assert.equal(added.total,7); assert.equal(original.total,3);
  assert.equal(setCount(added,'nuts',0).total,3);
});
test('P2-INV-003 reject malformed, duplicate, unsafe and excessive data', () => {
  assert.throws(()=>createWorksheet([{id:'a',name:'A',count:1},{id:'a',name:'B',count:2}]));
  assert.throws(()=>createWorksheet([{id:'a',name:'<script>',count:1}]));
  assert.throws(()=>createWorksheet([{id:'a',name:'A',count:-1}]));
  assert.throws(()=>createWorksheet([{id:'a',name:'A',count:1.5}]));
  assert.throws(()=>createWorksheet(Array.from({length:101},(_,i)=>({id:'x'+i,name:'Item',count:1}))));
});
test('P2-INV-004 invalid updates never mutate worksheet', () => {
  const a=createWorksheet([{id:'a',name:'Item',count:2}]);
  assert.throws(()=>setCount(a,'missing',4)); assert.throws(()=>setCount(a,'a',Infinity));
  assert.equal(a.total,2);
});
test('P2-INV-005 removal updates totals without mutating source', () => {
  const original = createWorksheet([{id:'bolts',name:'Bolts',count:3},{id:'nuts',name:'Nuts',count:5}]);
  const updated = removeItem(original,'bolts');
  assert.deepEqual(updated.items.map(row => row.id), ['nuts']);
  assert.equal(updated.total,5);
  assert.equal(original.total,8);
  assert.throws(() => removeItem(original,'missing'), /Unknown item/);
  assert.equal(removeItem(updated,'nuts').total,0);
});

test('P2-INV-006 worksheet snapshots do not retain caller-owned row objects', () => {
  const source = [{id:'bolts',name:' Bolts ',count:3}];
  const worksheet = createWorksheet(source);
  source[0].count = 999;
  source[0].name = 'Changed';
  source.push({id:'nuts',name:'Nuts',count:5});
  assert.deepEqual(worksheet.items, [{id:'bolts',name:'Bolts',count:3}]);
  assert.equal(worksheet.total,3);
  const updated = setCount(worksheet,'bolts',4);
  assert.equal(worksheet.items[0].count,3);
  assert.equal(updated.items[0].count,4);
});

test('P2-INV-007 rejects unsafe numeric coercion and keeps previous state', () => {
  const original = createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  for (const value of ['4', NaN, Infinity, -1, 1.5, 1000001, Number.MAX_SAFE_INTEGER, null]) {
    assert.throws(() => setCount(original,'bolts',value), /Invalid count/);
    assert.throws(() => addItem(original,{id:'extra',name:'Extra',count:value}));
  }
  assert.deepEqual(original, {schemaVersion:1,items:[{id:'bolts',name:'Bolts',count:3}],total:3});
  assert.equal(setCount(original,'bolts',1000000).total,1000000);
  assert.equal(setCount(original,'bolts',0).total,0);
});

test('P2-INV-008 removal frees capacity and preserves independent snapshots', () => {
  const source = createWorksheet(Array.from({length:100}, (_, i) => ({
    id:'part-'+i, name:'Part '+i, count:1000000
  })));
  const reduced = removeItem(source,'part-0');
  assert.equal(reduced.items.length,99);
  assert.equal(reduced.total,99000000);
  const restored = addItem(reduced,{id:'replacement',name:'Replacement',count:2});
  assert.equal(restored.items.length,100);
  assert.equal(restored.total,99000002);
  assert.equal(source.items.length,100);
  assert.equal(source.total,100000000);
  assert.equal(reduced.items.length,99);
  assert.throws(() => removeItem(reduced,'part-0'), /Unknown item/);
});

test('P2-INV-009 deterministic spreadsheet-safe CSV with no worksheet mutation', async () => {
  const {toCsv} = await import('../src/inventory.mjs');
  const worksheet = createWorksheet([
    {id:'a',name:'=SUM(1,2)',count:3},
    {id:'b',name:'Nuts, "large"',count:0},
    {id:'c',name:'+formula',count:1}
  ]);
  const csv = toCsv(worksheet);
  assert.equal(csv, 'id,name,count\r\n"a","\'=SUM(1,2)","3"\r\n"b","Nuts, ""large""","0"\r\n"c","\'+formula","1"\r\n');
  assert.equal(toCsv(worksheet),csv);
  assert.equal(worksheet.total,4);
  assert.equal(toCsv(createWorksheet([])), 'id,name,count\r\n');
  assert.throws(() => toCsv({items:[{id:'bad',name:'X',count:-1}]}));
});

test('P2-INV-010 CSV formula-prefix boundary cases remain inert text', async () => {
  const {toCsv} = await import('../src/inventory.mjs');
  const names = ['=1+1', '+SUM(1,2)', '-2+3', '@SUM(1,2)', '  =1+1', 'Ordinary', "O'Brien"];
  const sheet = createWorksheet(names.map((name, i) => ({id:'row-'+i,name,count:i})));
  const csv = toCsv(sheet);
  const lines = csv.trimEnd().split('\r\n');
  assert.equal(lines.length, names.length + 1);
  for (let i=0; i<names.length; i++) {
    // createWorksheet normalizes surrounding whitespace before CSV serialization.
    const normalized = names[i].trim();
    const expected = i < 5 ? "'" + normalized : normalized;
    const escaped = expected.replaceAll('"', '""');
    assert.equal(lines[i+1], '"row-'+i+'","'+escaped+'","'+i+'"');
  }
  assert.equal(sheet.items[0].name, '=1+1');
  assert.equal(sheet.items[4].name, '=1+1'); // whitespace normalized by schema
  assert.equal(toCsv(sheet), csv);
});


test('P2-INV-011 rejects non-string identifiers instead of regex-coercing them', () => {
  for (const id of [123, 0, 12n, ['abc'], {toString: () => 'abc'}, null, undefined]) {
    assert.throws(() => createWorksheet([{id, name:'Part', count:1}]), /Invalid inventory row/);
    assert.throws(() => addItem(createWorksheet([]), {id, name:'Part', count:1}), /Invalid inventory row/);
  }
  const sheet = createWorksheet([{id:'123', name:'Part', count:1}]);
  assert.equal(sheet.items[0].id, '123');
  assert.equal(typeof sheet.items[0].id, 'string');
});

test('P2-INV-012 full-capacity CSV export remains deterministic after replacement', async () => {
  const {toCsv} = await import('../src/inventory.mjs');
  const original = createWorksheet(Array.from({length:100}, (_, i) => ({
    id:'part-'+i, name:'Part '+i, count:1000000
  })));
  const originalCsv = toCsv(original);
  assert.equal(originalCsv.split('\r\n').length,102);
  assert.equal(originalCsv.split('\r\n')[1],'"part-0","Part 0","1000000"');
  const changed = addItem(removeItem(original,'part-0'), {
    id:'replacement', name:'Nuts, "large"', count:7
  });
  const csv = toCsv(changed);
  assert.equal(changed.items.length,100);
  assert.equal(changed.total,99000007);
  assert.equal(csv.split('\r\n').length,102);
  assert.ok(csv.includes('"replacement","Nuts, ""large""","7"\r\n'));
  assert.equal(toCsv(changed),csv);
  assert.equal(toCsv(original),originalCsv);
  assert.equal(original.total,100000000);
});
