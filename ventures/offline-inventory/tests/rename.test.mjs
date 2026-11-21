import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, renameItem, toCsv} from '../src/inventory.mjs';

test('P2-INV-013 rename preserves ID, quantity, totals and original snapshot', () => {
  const original=createWorksheet([{id:'bolts',name:'Bolts',count:3},{id:'nuts',name:'Nuts',count:5}]);
  const renamed=renameItem(original,'bolts','  Hex bolts  ');
  assert.deepEqual(renamed.items,[{id:'bolts',name:'Hex bolts',count:3},{id:'nuts',name:'Nuts',count:5}]);
  assert.equal(renamed.total,8);
  assert.equal(original.items[0].name,'Bolts');
  assert.equal(original.total,8);
  assert.match(toCsv(renamed), /"bolts","Hex bolts","3"/);
  assert.match(toCsv(original), /"bolts","Bolts","3"/);
});
test('P2-INV-013 rejects invalid names and missing IDs without mutation', () => {
  const original=createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  for(const name of ['', '  ', '<script>', 'x'.repeat(81), null, 42]) {
    assert.throws(()=>renameItem(original,'bolts',name), /Invalid item name/);
  }
  assert.throws(()=>renameItem(original,'unknown','Valid'), /Unknown item/);
  assert.deepEqual(original.items,[{id:'bolts',name:'Bolts',count:3}]);
});

// P2-INV-014: reject invisible directional formatting and DEL in user-visible labels.
test('P2-INV-014 names reject bidi controls and DEL across creation and rename', () => {
  const sheet=createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  for(const character of ['\\u007f','\\u202a','\\u202e','\\u2066','\\u2069'].map(value=>JSON.parse('"'+value+'"'))) {
    assert.throws(()=>createWorksheet([{id:'bad',name:'Visible'+character+'Label',count:1}]), /Invalid inventory row/);
    assert.throws(()=>renameItem(sheet,'bolts','Visible'+character+'Label'), /Invalid item name/);
  }
  assert.deepEqual(sheet.items,[{id:'bolts',name:'Bolts',count:3}]);
  assert.equal(renameItem(sheet,'bolts','Écrous').items[0].name,'Écrous');
});
