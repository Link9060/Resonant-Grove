import { test } from 'node:test';
import assert from 'node:assert/strict';
import {prototypePrompt,validatePrototype,prototypeFallback,renderPrototype} from '../scripts/grove-prototype.mjs';

const topic={name:'Original beginner bike checklist'};
const idea={title:'Printable bike inspection worksheet',audience:'Beginner bike owners',
  value:'Could help new riders check common readiness questions.',prototype:'Draft an inspection worksheet.'};
const sections=[
  {heading:'Before starting the inspection',items:[
    'Write the bicycle model and the date of this inspection.',
    'Check whether the bicycle is stable and ready for a simple visual inspection.',
    'Identify any unusual condition that needs attention from a qualified mechanic.'
  ]},
  {heading:'Check the essentials carefully',items:[
    'Write down observations about tire condition and other visible parts.',
    'Record unusual squeaks or other concerns without assuming a diagnosis.',
    'Make a list of maintenance questions to ask an experienced technician.'
  ]},
  {heading:'Record follow-up questions',items:[
    'Summarize any parts that should receive a professional inspection.',
    'Note which observations could not be checked during this session.',
    'Keep your worksheet for reference when planning a future check.'
  ]},
];
test('prototype prompt asks for an actual original printable resource without monetization',()=>{
  const p=prototypePrompt(topic,idea);
  assert.match(p,/original/i);
  assert.match(p,/No costs, prices, purchases/);
  assert.match(p,/three sections/i);
  assert.throws(()=>prototypePrompt({},idea));
});
test('validates sections and guards against unsafe claims or links',()=>{
  assert.equal(validatePrototype(JSON.stringify({sections})).sections.length,3);
  assert.throws(()=>validatePrototype({sections:sections.slice(0,2)}));
  assert.throws(()=>validatePrototype({sections:[sections[0],sections[0],sections[2]]}),/Repeated/);
  const bad=structuredClone(sections);bad[0].items[0]='Get guaranteed profits at https://spam.example';
  assert.throws(()=>validatePrototype({sections:bad}));
});
test('fallback is clearly labeled curated, and output is a useable checklist draft',()=>{
  const result=prototypeFallback(idea);
  assert.equal(result.source,'curated-template-fallback');
  const out=renderPrototype(topic,idea,result);
  assert.match(out,/UNVERIFIED DRAFT ONLY/);
  assert.match(out,/Curated template fallback, not AI generated/);
  assert.equal((out.match(/^- \[ \]/gm)||[]).length,9);
  assert.match(out,/accuracy, originality/i);
  assert.ok(out.length<4000);
});
