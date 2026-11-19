import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('P2-UI-015 search filtering preserves the existing low-stock snapshot', () => {
  assert.match(html, /function render\(invalidateStock=true\)/);
  assert.match(html, /if\(invalidateStock\)\s*\{\s*document\.querySelector\('#stock-results'\)\.replaceChildren\(\)/);
  assert.match(html, /querySelector\('#search'\)\.addEventListener\('input',\(\)=>\{try\{render\(false\)/);
});

test('P2-UI-015 worksheet mutations still invalidate low-stock results', () => {
  const mutationHandlers = [
    "worksheet=setCount(worksheet,item.id,Number(raw))",
    "worksheet=renameItem(worksheet,item.id,nextName)",
    "worksheet=removeItem(worksheet,item.id)",
    "worksheet=addItem(worksheet,",
    "worksheet=createWorksheet(sampleRows)",
    "worksheet=restored"
  ];
  for (const mutation of mutationHandlers) {
    const start = html.indexOf(mutation);
    assert.notEqual(start, -1, 'Missing mutation handler: ' + mutation);
    const nextRender = html.indexOf('render();', start);
    assert.ok(nextRender !== -1 && nextRender - start < 550,
      'Mutation must invalidate low-stock results: ' + mutation);
  }
});
