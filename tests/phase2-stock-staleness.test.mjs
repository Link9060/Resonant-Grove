import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html = readFileSync(new URL('../ventures/offline-inventory/index.html', import.meta.url), 'utf8');
test('P2-UI-013: rerender invalidates prior low-stock results before rendering rows', () => {
 const render = html.match(/function render\(\)\{([\s\S]*?)\n\}/)?.[1];
 assert.ok(render, 'render function exists');
 assert.match(render, /#stock-results'\)\.replaceChildren\(\)/);
 assert.match(render, /#stock-summary'\)\.textContent=/);
 assert.ok(render.indexOf("#stock-results") < render.indexOf('rows.replaceChildren()'));
});
