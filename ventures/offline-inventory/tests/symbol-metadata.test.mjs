import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, addItem, setCount, toCsv} from '../src/inventory.mjs';

test('P2-INV-032 symbol-keyed metadata cannot disappear during normalization', () => {
  const marker = Symbol('unexpected metadata');
  const row = {id:'bolts', name:'Bolts', count:3, [marker]:'private'};
  assert.throws(() => createWorksheet([row]), /Invalid inventory row/);
  const array = [{id:'bolts', name:'Bolts', count:3}];
  array[marker] = 'private';
  assert.throws(() => createWorksheet(array), /Invalid inventory rows/);
  const sheet = createWorksheet([{id:'bolts', name:'Bolts', count:3}]);
  const marked = {...sheet, [marker]:'private'};
  assert.throws(() => setCount(marked, 'bolts', 4), /Invalid worksheet metadata/);
  assert.throws(() => toCsv(marked), /Invalid worksheet metadata/);
  assert.throws(() => addItem(sheet, row), /Invalid inventory row/);
  assert.deepEqual(sheet, {schemaVersion:1, items:[{id:'bolts',name:'Bolts',count:3}],total:3});
  assert.equal(toCsv(sheet), 'id,name,count\r\n"bolts","Bolts","3"\r\n');
});
