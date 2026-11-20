import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// P2-UI-020: contract guard for overlapping asynchronous JSON selections.
// Browser acceptance must separately exercise deferred file reads.
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('P2-UI-020 newer JSON selection invalidates older pending restore',()=>{
  assert.match(page,/let restoreSelectionVersion=0;/);
  assert.match(page,/const selectionVersion=\+\+restoreSelectionVersion;/);
  const handler=page.slice(page.indexOf("document.querySelector('#import-json').addEventListener"));
  const read=handler.indexOf('await file.text()');
  const stale=handler.indexOf('selectionVersion!==restoreSelectionVersion');
  const confirmation=handler.indexOf("confirm('Replace the current worksheet");
  const assignment=handler.indexOf('worksheet=restored');
  assert.ok(read>=0 && stale>read && confirmation>stale && assignment>confirmation);
  assert.match(handler,/worksheet!==worksheetAtSelection/);
});
