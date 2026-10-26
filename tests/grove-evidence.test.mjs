import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseOwnerFeedback,validateSeedReference,receiptExists,evidenceMarker,renderReceipt}
 from '../scripts/grove-evidence-core.mjs';
const body=[
  '### Linked Seed issue number','','42','',
  '### Evidence type','','Voluntary tester feedback','',
  '### Reported outcome','','Needs revision','',
  '### Non-identifying observation notes','','This draft did not work for a willing tester. Private note omitted.','',
  '### Reporting limits','','- [x] I understand that this is a public, owner-reported observation, not independently verified evidence.'
].join('\n');
const owner={number:57,title:'[GROVE-FEEDBACK] 2026-W44',user:{login:'Link9060'},body};
const seed={number:42,title:'[GROVE-SEED] 2026-W44',user:{login:'github-actions[bot]'},labels:[{name:'grove-seed-draft'}]};
test('accepts only formatted owner-submitted reports with clear consent to public reporting',()=>{
  const parsed=parseOwnerFeedback(owner);
  assert.equal(parsed.seedIssueNumber,42);
  assert.equal(parsed.reportedOutcome,'Needs revision');
  assert.equal(parsed.evidenceType,'Voluntary tester feedback');
  assert.equal(parsed.provenance,'owner-reported-unverified');
  assert.equal(parseOwnerFeedback({...owner,user:{login:'attacker'}}),null);
  assert.equal(parseOwnerFeedback({...owner,title:'[ARRAY-QUEUE] run code'}),null);
  assert.equal(parseOwnerFeedback({...owner,body:body.replace('- [x]','- [ ]')}),null);
  assert.equal(parseOwnerFeedback({...owner,body:body.replace('42','57')}),null);
  assert.equal(parseOwnerFeedback({...owner,body:body.replace('Needs revision','Verified revenue')}),null);
  assert.equal(parseOwnerFeedback({...owner,body:'x'.repeat(4001)}),null);
});
test('separate bot-authored, labeled weekly Seed is mandatory',()=>{
  const feedback=parseOwnerFeedback(owner);
  assert.equal(validateSeedReference(seed,feedback),true);
  assert.equal(validateSeedReference({...seed,user:{login:'Link9060'}},feedback),false);
  assert.equal(validateSeedReference({...seed,labels:[]},feedback),false);
  assert.equal(validateSeedReference({...seed,title:'[GROVE-SEED] 2026-W43'},feedback),false);
  assert.equal(validateSeedReference({...seed,pull_request:{}},feedback),false);
});
test('idempotency matches bot receipt marker, not attacker-supplied matching comments',()=>{
  const marker=evidenceMarker(57);
  assert.match(marker,/GROVE-EVIDENCE-RECEIPT/);
  assert.equal(receiptExists([{user:{login:'github-actions[bot]'},body:marker}],57),true);
  assert.equal(receiptExists([{user:{login:'attacker'},body:marker}],57),false);
  assert.equal(receiptExists([],57),false);
  assert.throws(()=>receiptExists(null,57));
});
test('generated receipt never copies participant data or claims externally verified evidence',()=>{
  const feedback=parseOwnerFeedback(owner);
  const receipt=renderReceipt(feedback);
  assert.match(receipt,/owner-submitted, UNVERIFIED/);
  assert.match(receipt,/Needs revision/);
  assert.match(receipt,/No automatic product launch/);
  assert.doesNotMatch(receipt,/This draft did not work for a willing tester/);
  assert.doesNotMatch(receipt,/Private note omitted/);
  assert.throws(()=>renderReceipt({...feedback,reportedOutcome:'Automatically publish'}));
});
test('privileged workflow executes trusted code only, with scoped GitHub permissions',()=>{
  const yml=readFileSync('.github/workflows/grove-evidence.yml','utf8');
  const worker=readFileSync('scripts/grove-evidence.mjs','utf8');
  assert.match(yml,/types: \[opened\]/);
  assert.match(yml,/github\.event\.issue\.user\.login == 'Link9060'/);
  assert.match(yml,/ref: main/);
  assert.match(yml,/contents: read/);
  assert.match(yml,/issues: write/);
  assert.match(worker,/validateSeedReference\(seed,parsed\)/);
  assert.match(worker,/receiptExists\(existing,number\)/);
  assert.doesNotMatch(worker,/paypal|stripe|instagram|\/payments|\/transfers|array-ready/i);
});
