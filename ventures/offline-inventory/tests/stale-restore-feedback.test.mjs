import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('P2-UI-022: superseded restore errors cannot replace newer selection feedback',()=>{
  const handler=html.slice(html.indexOf("document.querySelector('#import-json').addEventListener('change'"),html.indexOf("document.querySelector('#export-csv').addEventListener('click'"));
  assert.ok(handler.startsWith("document.querySelector('#import-json')"),'restore handler exists');
  assert.match(handler,/const selectionVersion=\+\+restoreSelectionVersion;/);
  assert.match(handler,/catch\(error\)\s*\{\s*\/\/ Superseded reads must not overwrite feedback from the currently selected backup\.\s*if\(selectionVersion===restoreSelectionVersion\)message\.textContent='JSON restore failed: '\+error\.message;/);
  assert.match(handler,/finally\s*\{[\s\S]*if\(selectionVersion===restoreSelectionVersion\)input\.value='';/);
});
