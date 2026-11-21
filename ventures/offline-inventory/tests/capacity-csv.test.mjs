import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, addItem, removeItem, toCsv} from '../src/inventory.mjs';

test('P2-INV-012 full-capacity CSV snapshot stays deterministic after replacement', () => {
  const initial = createWorksheet(Array.from({length:100}, (_, i) => ({
    id: 'part-' + i, name: 'Part ' + i, count: i
  })));
  const originalCsv = toCsv(initial);
  assert.equal(originalCsv.split('\r\n').length, 102);
  assert.equal(originalCsv.split('\r\n')[0], 'id,name,count');
  assert.equal(originalCsv.split('\r\n')[1], '"part-0","Part 0","0"');
  assert.equal(originalCsv.split('\r\n')[100], '"part-99","Part 99","99"');
  assert.equal(toCsv(initial), originalCsv);
  assert.throws(() => addItem(initial, {id:'extra',name:'Extra',count:1}), /Invalid inventory rows/);
  const updated = addItem(removeItem(initial,'part-0'), {id:'replacement',name:'New, "part"',count:1000000});
  const updatedCsv = toCsv(updated);
  assert.equal(updated.items.length,100);
  assert.equal(updated.total,1004950);
  assert.match(updatedCsv, /"replacement","New, ""part""","1000000"\r\n$/);
  assert.doesNotMatch(updatedCsv, /"part-0",/);
  assert.equal(toCsv(initial), originalCsv);
  assert.equal(initial.total,4950);
});
