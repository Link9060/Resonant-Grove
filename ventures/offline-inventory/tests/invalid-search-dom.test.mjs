import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('P2-UI-017 invalid search validates before clearing visible rows', () => {
  const render = html.slice(html.indexOf('function render('), html.indexOf("document.querySelector('#check-stock')"));
  const validation = render.indexOf("const matches=searchItems(worksheet,document.querySelector('#search').value);");
  const clear = render.indexOf('rows.replaceChildren();');
  assert.ok(validation >= 0 && clear > validation, 'search validation must precede row clearing');
  assert.match(html, /addEventListener\('input',\(\)=>\{try\{render\(false\);message\.textContent='';\}catch\(error\)\{message\.textContent=error\.message;\}\}\)/);
});
