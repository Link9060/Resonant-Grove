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
