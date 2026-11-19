import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWorksheet,lowStockItems} from '../src/inventory.mjs';

test('P2-INV-053 low-stock UI has labeled offline controls and safe text rendering', async () => {
 const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
 for (const token of ['id="stock-threshold"', 'id="check-stock"', 'id="stock-summary"', 'id="stock-results"', 'lowStockItems(worksheet,Number(raw))', "li.textContent=item.name"]) {
  assert.ok(html.includes(token), 'Missing low-stock UI contract: '+token);
 }
 assert.match(html, /id="stock-summary"[^>]*aria-live="polite"/);
 assert.ok(!html.includes('li.innerHTML'), 'Untrusted inventory names must not be parsed as HTML');
 const sheet=createWorksheet([{id:'bolts',name:'Bolts',count:3},{id:'nuts',name:'Nuts',count:0},{id:'washers',name:'Washers',count:5}]);
 assert.deepEqual(lowStockItems(sheet,3).map(item=>item.id),['bolts','nuts']);
 assert.equal(sheet.total,8);
});
