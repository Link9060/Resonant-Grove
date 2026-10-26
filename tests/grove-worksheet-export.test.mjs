import {test} from 'node:test';
import assert from 'node:assert/strict';
import {escapeHtml,renderPrintableWorksheet} from '../scripts/grove-worksheet-export.mjs';

const topic={name:'Original bike-care checklist'};
const idea={
  title:'My first reusable maintenance worksheet',
  audience:'Beginning mountain-bike riders',
  value:'An original checklist may help organize bicycle maintenance tasks.'
};
const sections=[0,1,2].map(n=>({
  heading:'Maintenance planning section '+(n+1),
  items:[0,1,2].map(i=>'Record the original maintenance note '+(n+1)+'-'+(i+1)+'.')
}));
const draft={source:'local-model-unverified',sections};

test('creates offline printer-friendly HTML and matching Markdown with no commercial claims',()=>{
  const result=renderPrintableWorksheet('2026-10-26',topic,idea,draft);
  assert.match(result.html,/<!doctype html>/);
  assert.match(result.html,/@page\{size:letter/);
  assert.match(result.html,/Content-Security-Policy/);
  assert.equal((result.html.match(/<li>/g)||[]).length,9);
  assert.equal((result.markdown.match(/^- \[ \]/gm)||[]).length,9);
  assert.match(result.html,/INTERNAL DRAFT ONLY/);
  assert.match(result.html,/Not for sale/);
  assert.match(result.markdown,/Unverified local model draft/);
  assert.doesNotMatch(result.html,/<script|<iframe|https?:\/\//i);
});

test('escapes untrusted model text independently of upstream validation',()=>{
  const unsafe={...idea,title:'<img src=x onerror="alert(1)"> & helpful guide'};
  const result=renderPrintableWorksheet('2026-10-26',topic,unsafe,draft);
  assert.match(result.html,/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(result.html,/<img /);
  assert.equal(escapeHtml('"<>&\''),'&quot;&lt;&gt;&amp;&#39;');
});

test('rejects malformed inputs and labels curated fallback truthfully',()=>{
  assert.throws(()=>renderPrintableWorksheet('tomorrow',topic,idea,draft));
  assert.throws(()=>renderPrintableWorksheet('2026-10-26',topic,idea,{...draft,sections:[]}));
  assert.throws(()=>renderPrintableWorksheet('2026-10-26',topic,idea,{...draft,sections:[{heading:'Wrong',items:['one']}]}));
  const result=renderPrintableWorksheet('2026-10-26',topic,idea,{...draft,source:'curated-template-fallback'});
  assert.match(result.html,/Curated planning-template fallback/);
  assert.match(result.markdown,/Not fact-checked or tested/);
});
