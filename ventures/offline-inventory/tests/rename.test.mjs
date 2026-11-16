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
