import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, searchItems, toCsv} from '../src/inventory.mjs';

test('P2-INV-023 rejects invisible and bidirectional search controls without mutation', () => {
  const sheet = createWorksheet([{id:'bolts',name:'Bolts',count:3},{id:'nuts',name:'Nuts',count:5}]);
  const before = structuredClone(sheet);
  const csv = toCsv(sheet);
  for (const code of [0x00,0x1f,0x7f,0x85,0x61c,0x200e,0x200f,0x2028,0x2029,0x202a,0x202e,0x2066,0x2069]) {
    assert.throws(() => searchItems(sheet, 'bolt' + String.fromCodePoint(code)), /Invalid search/, 'U+' + code.toString(16));
  }
  assert.deepEqual(searchItems(sheet, ' BOL ' ).map(item => item.id), ['bolts']);
  assert.deepEqual(sheet, before);
  assert.equal(toCsv(sheet), csv);
});
