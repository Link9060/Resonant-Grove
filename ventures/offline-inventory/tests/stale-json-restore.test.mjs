import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('P2-UI-019 JSON restore rejects stale file reads before confirmation or worksheet replacement',()=>{
 const start=html.indexOf("document.querySelector('#import-json').addEventListener('change',async event=>{");
 const end=html.indexOf("document.querySelector('#export-csv').addEventListener",start);
 assert.ok(start>=0&&end>start,'restore handler exists');
 const handler=html.slice(start,end);
 const snapshot=handler.indexOf('const worksheetAtSelection=worksheet;');
 const awaitRead=handler.indexOf('await file.text()');
 const guard=handler.indexOf('if(worksheet!==worksheetAtSelection)throw Error(');
 const confirm=handler.indexOf("if(!confirm(");
 const assignment=handler.indexOf('worksheet=restored;');
 assert.ok(snapshot>=0&&snapshot<awaitRead,'capture state before async read');
 assert.ok(awaitRead<guard&&guard<confirm&&confirm<assignment,
  'reject stale restore before confirmation and any worksheet replacement');
 assert.match(handler,/finally\s*\{[\s\S]*?if\(selectionVersion===restoreSelectionVersion\)input\.value='';[\s\S]*?\}/,'only the latest selection clears its file input');
});
