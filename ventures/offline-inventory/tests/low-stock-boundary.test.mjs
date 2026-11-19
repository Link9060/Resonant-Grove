import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, lowStockItems, setCount} from '../src/inventory.mjs';

test('P2-INV-050 low-stock boundary and full-capacity order', () => {
  const source = createWorksheet(Array.from({length:100}, (_, i) => ({
    id: 'part-'+i, name: 'Part '+i, count: i === 0 ? 0 : i === 99 ? 1000000 : 4
  })));
  assert.deepEqual(lowStockItems(source,0).map(x => x.id), ['part-0']);
  assert.deepEqual(lowStockItems(source,3).map(x => x.id), ['part-0']);
  assert.equal(lowStockItems(source,4).length,99);
  assert.equal(lowStockItems(source,1000000).length,100);
  assert.deepEqual(lowStockItems(source,4).map(x => x.id),
    Array.from({length:99}, (_, i) => 'part-'+i));
  const updated = setCount(source,'part-1',5);
  assert.equal(lowStockItems(updated,4).length,98);
  assert.equal(lowStockItems(source,4).length,99);
  assert.equal(source.total,1000388);
});

test('P2-INV-050 low-stock lookup rejects corrupted snapshots atomically', () => {
  const sheet = createWorksheet([{id:'a',name:'A',count:1}]);
  const corrupted = {...sheet, total:2};
  assert.throws(() => lowStockItems(corrupted,1), /Invalid worksheet total/);
  assert.throws(() => lowStockItems({...sheet, extra:true},1), /Invalid worksheet metadata/);
  assert.deepEqual(lowStockItems(sheet,1), [{id:'a',name:'A',count:1}]);
  assert.equal(sheet.total,1);
});
