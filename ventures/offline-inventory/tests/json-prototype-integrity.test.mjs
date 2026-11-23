import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorksheet, fromJson, toJson, toCsv} from '../src/inventory.mjs';

test('P2-INV-045 rejects prototype-shaped JSON metadata without altering global objects', () => {
  const fixture = createWorksheet([{id:'bolts',name:'Bolts',count:3}]);
  const backup = toJson(fixture);
  const payloads = [
    '{"schemaVersion":1,"items":[{"id":"bolts","name":"Bolts","count":3}],"total":3,"__proto__":{"polluted":true}}',
    '{"schemaVersion":1,"items":[{"id":"bolts","name":"Bolts","count":3,"__proto__":{"polluted":true}}],"total":3}',
    '{"schemaVersion":1,"items":[{"id":"bolts","name":"Bolts","count":3,"constructor":"bad"}],"total":3}',
    '{"schemaVersion":1,"items":[{"id":"bolts","name":"Bolts","count":3}],"total":3,"constructor":"bad"}'
  ];
  for (const payload of payloads) {
    assert.throws(() => fromJson(payload), /Invalid (worksheet|inventory row) metadata/);
    assert.equal(Object.prototype.polluted, undefined);
    assert.equal(toJson(fixture), backup);
    assert.equal(toCsv(fixture), 'id,name,count\r\n"bolts","Bolts","3"\r\n');
  }
  assert.deepEqual(fromJson(backup), fixture);
});
