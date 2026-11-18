import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, searchItems, toJson} from '../src/inventory.mjs';

test('P2-INV-038 rejects malformed UTF-16 search queries without changing worksheet', () => {
  const worksheet = createWorksheet([{id:'bolt',name:'🔩 Piñata',count:3}]);
  const before = toJson(worksheet);
  for (const query of ['\uD800', '\uDC00', 'bol\uD800t', '\uDC00bolt']) {
    assert.throws(() => searchItems(worksheet, query), /Invalid search/);
  }
  assert.deepEqual(searchItems(worksheet, 'PIÑATA'), worksheet.items);
  assert.deepEqual(searchItems(worksheet, '🔩'), worksheet.items);
  assert.equal(toJson(worksheet), before);
});
