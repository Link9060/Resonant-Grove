import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, addItem, renameItem, fromJson, toJson} from '../src/inventory.mjs';

test('P2-INV-037 rejects unpaired UTF-16 surrogates without changing worksheet', () => {
  const original = createWorksheet([{id:'part',name:'Valid',count:2}]);
  for (const name of ['bad\uD800', '\uDC00bad', 'x\uD800y', 'x\uDC00y']) {
    assert.throws(() => createWorksheet([{id:'part',name,count:2}]), /Invalid inventory row/);
    assert.throws(() => addItem(original,{id:'other',name,count:1}), /Invalid inventory row/);
    assert.throws(() => renameItem(original,'part',name), /Invalid item name/);
    const json = JSON.stringify({schemaVersion:1,items:[{id:'part',name,count:2}],total:2});
    assert.throws(() => fromJson(json), /Invalid inventory row/);
  }
  const unicode = createWorksheet([{id:'part',name:'🔩 Piñata',count:2}]);
  assert.deepEqual(fromJson(toJson(unicode)), unicode);
  assert.deepEqual(original.items,[{id:'part',name:'Valid',count:2}]);
});
