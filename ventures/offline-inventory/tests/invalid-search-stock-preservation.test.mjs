import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('P2-UI-018 invalid search cannot clear stock results before validation',()=>{
 const start=html.indexOf('function render(invalidateStock=true)');
 const end=html.indexOf("document.querySelector('#check-stock')",start);
 assert.ok(start>=0&&end>start,'render function exists');
 const render=html.slice(start,end);
 const validate=render.indexOf("const matches=searchItems(worksheet,document.querySelector('#search').value)");
 const stockClear=render.indexOf("document.querySelector('#stock-results').replaceChildren()");
 const rowClear=render.indexOf('rows.replaceChildren()');
 assert.ok(validate>=0&&stockClear>validate&&rowClear>validate,
  'search validation must precede stock and row DOM mutations');
});
