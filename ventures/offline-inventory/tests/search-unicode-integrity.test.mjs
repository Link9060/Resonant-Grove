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

test('P2-INV-047 search results are detached snapshots and cannot mutate source inventory', () => {
  const worksheet = createWorksheet([
    {id:'bolts',name:'Bolts',count:3},
    {id:'nuts',name:'Nuts',count:5}
  ]);
  const before = toJson(worksheet);
  const matches = searchItems(worksheet, 'bol');
  assert.equal(matches.length, 1);
  matches[0].name = 'Altered';
  matches[0].count = 999;
  matches.push({id:'fake',name:'Fake',count:1});
  assert.equal(toJson(worksheet), before);
  assert.deepEqual(searchItems(worksheet, 'bol'), [{id:'bolts',name:'Bolts',count:3}]);
  assert.equal(searchItems(worksheet, 'fake').length, 0);
});


test('P2-INV-048 empty and ID-only searches return independent snapshots', () => {
  const worksheet = createWorksheet([{id:'spare-bolt',name:'Fastener',count:7}]);
  const before = toJson(worksheet);
  const all = searchItems(worksheet, '   ');
  const byId = searchItems(worksheet, 'SPARE-BOLT');
  assert.deepEqual(all, [{id:'spare-bolt',name:'Fastener',count:7}]);
  assert.deepEqual(byId, all);
  assert.notStrictEqual(all[0], byId[0]);
  all[0].count = 0;
  byId[0].name = 'Changed';
  assert.equal(toJson(worksheet), before);
  assert.deepEqual(searchItems(worksheet, ''), [{id:'spare-bolt',name:'Fastener',count:7}]);
});
