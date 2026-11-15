import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createWorksheet, addItem, setCount} from '../ventures/offline-inventory/src/inventory.mjs';

const page = readFileSync(fileURLToPath(new URL('../ventures/offline-inventory/index.html', import.meta.url)), 'utf8');

test('P2-CONTRACT-001 browser demo imports the tested inventory core', () => {
  assert.match(page, /import\s*\{\s*createWorksheet\s*,\s*addItem\s*,\s*setCount\s*\}\s*from\s*['"]\.\/src\/inventory\.mjs['"]/);
  assert.match(page, /addEventListener\(['"]submit['"]/);
  assert.match(page, /addEventListener\(['"]click['"]/);
});
test('P2-CONTRACT-005 removal control is wired to immutable inventory core', () => {
  assert.match(page, /import\s*\{\s*removeItem\s*\}\s*from\s*['"]\.\/src\/inventory\.mjs['"]/);
  assert.match(page, /remove\.addEventListener\(['"]click['"]/);
  assert.match(page, /worksheet\s*=\s*removeItem\(worksheet,\s*item\.id\)/);
  assert.match(page, /remove\.setAttribute\(['"]aria-label['"],\s*['"]Remove /);
  assert.match(page, /td\.append\(button,\s*remove\)/);
});
test('P2-CONTRACT-002 local-only page contains no remote scripts or external actions', () => {
  assert.doesNotMatch(page, /<script[^>]+src\s*=|<form[^>]+action\s*=|https?:\/\/|\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/i);
  assert.match(page, /Refresh resets the sample worksheet/);
});
test('P2-CONTRACT-003 page exposes labeled inputs and accessible update feedback', () => {
  for (const id of ['id','name','count']) assert.match(page, new RegExp('<input id="'+id+'"'));
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /<th scope="col">/);
});
test('P2-CONTRACT-004 boundary totals and max row limit', () => {
  const rows = Array.from({length:100},(_,i)=>({id:'item-'+i,name:'Item '+i,count:1000000}));
  const sheet = createWorksheet(rows);
  assert.equal(sheet.total,100000000);
  assert.throws(()=>addItem(sheet,{id:'extra',name:'Extra',count:0}),/Invalid inventory rows/);
  assert.equal(setCount(sheet,'item-0',0).total,99000000);
  assert.equal(sheet.total,100000000);
});
