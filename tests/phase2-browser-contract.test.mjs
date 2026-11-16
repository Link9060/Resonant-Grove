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
  assert.match(page, /import\s*\{\s*removeItem\s*,\s*toCsv\s*,\s*renameItem\s*,\s*searchItems\s*\}\s*from\s*['"]\.\/src\/inventory\.mjs['"]/);
  assert.match(page, /remove\.addEventListener\(['"]click['"]/);
  assert.match(page, /worksheet\s*=\s*removeItem\(worksheet,\s*item\.id\)/);
  assert.match(page, /remove\.setAttribute\(['"]aria-label['"],\s*['"]Remove /);
  assert.match(page, /td\.append\(button,\s*rename,\s*remove\)/);
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

test('P2-CONTRACT-006 CSV export stays local and uses tested serializer', () => {
  assert.match(page, /import\s*\{\s*removeItem\s*,\s*toCsv\s*,\s*renameItem\s*\}\s*from/);
  assert.match(page, /id="export-csv"/);
  assert.match(page, /querySelector\('#export-csv'\)\.addEventListener\('click'/);
  assert.match(page, /toCsv\(worksheet\)/);
  assert.match(page, /new Blob\(\[csv\]/);
  assert.match(page, /URL\.createObjectURL\(blob\)/);
  assert.match(page, /link\.download='inventory-snapshot\.csv'/);
  assert.match(page, /URL\.revokeObjectURL\(url\)/);
  assert.doesNotMatch(page, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/i);
});

test('P2-CONTRACT-007 add-item quantity rejects blank and noncanonical numeric text before coercion', () => {
  assert.match(page, /const rawCount=document\.querySelector\('#count'\)\.value/);
  assert.match(page, /if\(!\/\^\(0\|\[1-9\]\[0-9\]\*\)\$\/\.test\(rawCount\)\)throw Error/);
  assert.match(page, /count:Number\(rawCount\)/);
  for (const invalid of ['', ' ', '1e2', '1.5', '-1', '+2', '01', 'Infinity']) {
    assert.equal(/^(0|[1-9][0-9]*)$/.test(invalid), false, invalid);
  }
  for (const valid of ['0', '1', '1000000']) assert.equal(/^(0|[1-9][0-9]*)$/.test(valid), true, valid);
});


test('P2-CONTRACT-008 rename control uses local immutable core and accessible labeling', () => {
  assert.match(page, /import\s*\{\s*removeItem\s*,\s*toCsv\s*,\s*renameItem\s*\}\s*from/);
  assert.match(page, /rename\.setAttribute\('aria-label','Rename '\+item\.name\)/);
  assert.match(page, /rename\.addEventListener\('click'/);
  assert.match(page, /if\(nextName===null\)return/);
  assert.match(page, /worksheet=renameItem\(worksheet,item\.id,nextName\)/);
  assert.match(page, /td\.append\(button,rename,remove\)/);
});


test('P2-CONTRACT-009 removal requires explicit confirmation before mutation', () => {
  assert.match(page, /remove\.addEventListener\('click',\(\)=>\{/);
  assert.match(page, /if\(!confirm\('Remove '\+item\.name\+' from this worksheet\?'\)\)return;/);
  const confirmIndex = page.indexOf("if(!confirm('Remove '+item.name+' from this worksheet?'))return;");
  const removeIndex = page.indexOf('worksheet=removeItem(worksheet,item.id)');
  assert.ok(confirmIndex >= 0 && removeIndex > confirmIndex, 'confirmation must precede removal');
});


test('P2-CONTRACT-010 reset requires confirmation and restores original fixture', () => {
  assert.match(page, /id="reset-worksheet"/);
  assert.match(page, /const sampleRows=\[\{id:'bolts',name:'Bolts',count:3\},\{id:'nuts',name:'Nuts',count:5\}\]/);
  assert.match(page, /worksheet=createWorksheet\(sampleRows\)/);
  const resetHandler = page.slice(page.indexOf("querySelector('#reset-worksheet').addEventListener"));
  assert.match(resetHandler, /if\(!confirm\('Discard local changes and restore the sample worksheet\?'\)\)return;/);
  assert.ok(resetHandler.indexOf("if(!confirm(") < resetHandler.indexOf('worksheet=createWorksheet(sampleRows)'), 'confirmation precedes mutation');
  assert.match(resetHandler, /message.textContent='Sample worksheet restored; search cleared';\s*render\(\)/);
});


test('P2-CONTRACT-011 confirmed reset clears active search before rendering fixtures', () => {
  const handler = page.slice(page.indexOf("querySelector('#reset-worksheet').addEventListener"), page.indexOf("querySelector('#export-csv').addEventListener"));
  const confirmation = handler.indexOf("if(!confirm(");
  const reset = handler.indexOf('worksheet=createWorksheet(sampleRows)');
  const clear = handler.indexOf("document.querySelector('#search').value=''");
  const render = handler.indexOf('render()');
  assert.ok(confirmation >= 0 && reset > confirmation && clear > reset && render > clear);
});
