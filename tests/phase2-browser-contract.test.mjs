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
  assert.match(page, /import\s*\{\s*removeItem\s*,\s*toCsv\s*,\s*renameItem\s*,\s*searchItems\s*,\s*toJson\s*,\s*fromJson\s*\}\s*from\s*['"]\.\/src\/inventory\.mjs['"]/);
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
  assert.match(page, /import\s*\{\s*removeItem\s*,\s*toCsv\s*,\s*renameItem\s*,\s*searchItems\s*,\s*toJson\s*,\s*fromJson\s*\}\s*from/);
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
  assert.match(page, /import\s*\{\s*removeItem\s*,\s*toCsv\s*,\s*renameItem\s*,\s*searchItems\s*,\s*toJson\s*,\s*fromJson\s*\}\s*from/);
  assert.match(page, /rename\.setAttribute\('aria-label','Rename '\+item\.name\)/);
  assert.match(page, /rename\.addEventListener\('click'/);
  assert.match(page, /if\(nextName===null\)\{message\.textContent='Rename canceled; worksheet unchanged';return;\}/);
  assert.match(page, /worksheet=renameItem\(worksheet,item\.id,nextName\)/);
  assert.match(page, /td\.append\(button,rename,remove\)/);
});


test('P2-CONTRACT-009 removal requires explicit confirmation before mutation', () => {
  assert.match(page, /remove\.addEventListener\('click',\(\)=>\{/);
  assert.match(page, /if\(!confirm\('Remove '\+item\.name\+' from this worksheet\?'\)\)\{message\.textContent='Removal canceled; worksheet unchanged';return;\}/);
  const confirmIndex = page.indexOf("if(!confirm('Remove '+item.name+' from this worksheet?')){message.textContent='Removal canceled; worksheet unchanged';return;}");
  const removeIndex = page.indexOf('worksheet=removeItem(worksheet,item.id)');
  assert.ok(confirmIndex >= 0 && removeIndex > confirmIndex, 'confirmation must precede removal');
});


test('P2-CONTRACT-010 reset requires confirmation and restores original fixture', () => {
  assert.match(page, /id="reset-worksheet"/);
  assert.match(page, /const sampleRows=\[\{id:'bolts',name:'Bolts',count:3\},\{id:'nuts',name:'Nuts',count:5\}\]/);
  assert.match(page, /worksheet=createWorksheet\(sampleRows\)/);
  const resetHandler = page.slice(page.indexOf("querySelector('#reset-worksheet').addEventListener"));
  assert.match(resetHandler, /if\(!confirm\('Discard local changes and restore the sample worksheet\?'\)\)\{message\.textContent='Reset canceled; worksheet unchanged';return;\}/);
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


test('P2-CONTRACT-012 search input filters displayed rows only, not totals or CSV', () => {
  assert.match(page, /<input id="search" type="search"/);
  assert.match(page, /querySelector\('#search'\)\.addEventListener\('input',\(\)=>\{try\{render\(\);/);
  assert.match(page, /const matches=searchItems\(worksheet,document\.querySelector\('#search'\)\.value\)/);
  assert.match(page, /for\(const item of matches\)/);
  assert.match(page, /querySelector\('#total'\)\.textContent=String\(worksheet\.total\)/);
  assert.match(page, /const csv=toCsv\(worksheet\)/);
});


test('P2-CONTRACT-013 empty search results render an accessible table row without changing totals', () => {
  assert.match(page, /if\(matches\.length===0\)/);
  assert.match(page, /cell\.colSpan=4/);
  assert.match(page, /No matching items\. Clear the search to see all items\./);
  assert.match(page, /No items in this worksheet\./);
  assert.match(page, /empty\.append\(cell\);rows\.append\(empty\)/);
  assert.match(page, /querySelector\('#total'\)\.textContent=String\(worksheet\.total\)/);
});


test('P2-CONTRACT-014 search announces visible and total row counts accessibly', () => {
  assert.match(page, /id="search"[^>]+aria-describedby="search-count"/);
  assert.match(page, /id="search-count" role="status" aria-live="polite"/);
  assert.match(page, /querySelector\('#search-count'\)\.textContent=matches\.length\+' of '\+worksheet\.items\.length\+' items shown'/);
  assert.match(page, /querySelector\('#search'\)\.addEventListener\('input',\(\)=>\{try\{render\(\);/);
});

test('P2-CONTRACT-015 local JSON backup and confirmed restore are wired to validated core', () => {
  assert.match(page, /id="export-json"/);
  assert.match(page, /id="import-json" type="file"/);
  assert.match(page, /toJson\(worksheet\)/);
  assert.match(page, /fromJson\(await file\.text\(\)\)/);
  assert.match(page, /if\(file\.size>65536\)throw Error/);
  const restore = page.slice(page.indexOf("querySelector('#import-json').addEventListener"),page.indexOf("querySelector('#export-csv').addEventListener"));
  assert.ok(restore.indexOf("if(!confirm(")>=0 && restore.indexOf('worksheet=restored')>restore.indexOf("if(!confirm("));
  assert.match(restore, /input\.value=''/);
  assert.match(page, /link\.download='inventory-backup\.json'/);
});


test('P2-CONTRACT-016 canceled JSON restore announces no change and clears file input', () => {
  const restore = page.slice(page.indexOf("querySelector('#import-json').addEventListener"), page.indexOf("querySelector('#export-csv').addEventListener"));
  const cancel = restore.indexOf("message.textContent='JSON restore canceled; worksheet unchanged'");
  const assign = restore.indexOf('worksheet=restored');
  assert.ok(cancel >= 0 && cancel < assign, 'cancel feedback precedes worksheet mutation');
  assert.match(restore, /if\(!confirm\('Replace the current worksheet with this local backup\?'\)\)\{message\.textContent='JSON restore canceled; worksheet unchanged';return;\}/);
  assert.match(restore, /finally \{input\.value='';\}/);
});


test('P2-CONTRACT-017 canceled destructive actions announce unchanged worksheet', () => {
  const remove = page.slice(page.indexOf("remove.addEventListener('click'"), page.indexOf('td.append(button,rename,remove)'));
  const reset = page.slice(page.indexOf("querySelector('#reset-worksheet').addEventListener"), page.indexOf("querySelector('#export-json').addEventListener"));
  assert.ok(remove.indexOf("message.textContent='Removal canceled; worksheet unchanged'") >= 0);
  assert.ok(remove.indexOf('worksheet=removeItem') > remove.indexOf('Removal canceled; worksheet unchanged'));
  assert.ok(reset.indexOf("message.textContent='Reset canceled; worksheet unchanged'") >= 0);
  assert.ok(reset.indexOf('worksheet=createWorksheet(sampleRows)') > reset.indexOf('Reset canceled; worksheet unchanged'));
  assert.match(page, /id="message" role="status" aria-live="polite"/);
});

test('P2-CONTRACT-018 adding an item clears a stale search so the new row is visible', () => {
  const add = page.slice(page.indexOf("querySelector('#add').addEventListener"), page.indexOf("querySelector('#reset-worksheet').addEventListener"));
  const mutate = add.indexOf('worksheet=addItem(worksheet,');
  const clear = add.indexOf("document.querySelector('#search').value=''");
  const render = add.indexOf('render()');
  assert.ok(mutate >= 0 && clear > mutate && render > clear, 'clear filter after successful add, before rendering');
  assert.match(add, /message\.textContent='Item added; search cleared'/);
  assert.ok(add.indexOf("catch(error)") > clear, 'failed add must not clear active search');
});


test('P2-CONTRACT-019 canceled edit prompts announce unchanged worksheet', () => {
  const quantity = page.slice(page.indexOf("button.addEventListener('click'"), page.indexOf("const rename=document.createElement"));
  const rename = page.slice(page.indexOf("rename.addEventListener('click'"), page.indexOf("const remove=document.createElement"));
  assert.match(quantity, /if\(raw===null\)\{message\.textContent='Quantity edit canceled; worksheet unchanged';return;\}/);
  assert.match(rename, /if\(nextName===null\)\{message\.textContent='Rename canceled; worksheet unchanged';return;\}/);
  assert.ok(quantity.indexOf('Quantity edit canceled') < quantity.indexOf('worksheet=setCount'));
  assert.ok(rename.indexOf('Rename canceled') < rename.indexOf('worksheet=renameItem'));
});


test('P2-CONTRACT-020 confirmed removal restores keyboard focus to a stable search input', () => {
  const remove = page.slice(page.indexOf("remove.addEventListener('click'"), page.indexOf('td.append(button,rename,remove)'));
  const mutation = remove.indexOf('worksheet=removeItem(worksheet,item.id)');
  const render = remove.indexOf('render()', mutation);
  const focus = remove.indexOf("document.querySelector('#search').focus()", render);
  assert.ok(mutation >= 0 && render > mutation && focus > render, 'focus a persistent control after removing and rerendering the active row');
  assert.match(remove, /Item removed; focus moved to search/);
  assert.ok(remove.indexOf('Removal canceled; worksheet unchanged') < mutation, 'cancel must not remove or move focus');
});
