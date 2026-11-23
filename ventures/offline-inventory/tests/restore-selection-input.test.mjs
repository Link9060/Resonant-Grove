import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('P2-UI-021: superseded restore does not clear the active file input',()=>{
 const handler=html.slice(html.indexOf("document.querySelector('#import-json').addEventListener"),html.indexOf("document.querySelector('#export-csv').addEventListener"));
 assert.ok(handler.includes('const selectionVersion=++restoreSelectionVersion;'));
 assert.match(handler,/if\(selectionVersion!==restoreSelectionVersion\)throw Error/);
 assert.match(handler,/finally\s*\{\s*\/\/[^\n]*\n\s*if\(selectionVersion===restoreSelectionVersion\)input\.value='';/);
 assert.doesNotMatch(handler,/finally\s*\{\s*input\.value='';/);
});
