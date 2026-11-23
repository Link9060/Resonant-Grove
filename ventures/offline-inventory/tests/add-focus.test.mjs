import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// P2-CONTRACT-023: source-level browser contract; manual keyboard QA still required.
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('P2-CONTRACT-023 successful add clears search, rerenders, and focuses search',()=>{
  assert.match(html,/worksheet=addItem\(worksheet,/);
  assert.match(html,/document\.querySelector\('#search'\)\.value='';\s*message\.textContent='Item added; search cleared; focus moved to search';event\.target\.reset\(\);render\(\);document\.querySelector\('#search'\)\.focus\(\);/);
  assert.match(html,/\}catch\(error\)\{message\.textContent=error\.message;\}/);
});
