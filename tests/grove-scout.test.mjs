import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TOPICS,dayKey,selectScoutTopic,scoutAlreadyRecorded,
  createScoutPrompt,validateScoutDraft,curatedFallback,makeScoutBrief,ISSUE_PREFIX} from '../scripts/grove-scout-core.mjs';
import {readFileSync} from 'node:fs';

const today='2026-10-25';
const topic=selectScoutTopic(today);
const item=(i)=>({
  title:'Original starter template idea '+i,
  audience:'People interested in simple projects',
  value:'Provides a clear original printable worksheet for beginners.',
  prototype:'Draft an original worksheet using free editing tools.',
  validation:'Get voluntary feedback from a consenting interested tester.',
  caution:'Demand, accuracy and willingness to pay remain unverified.'
});

test('rotates through bounded ethical topic catalog without repeats within cycle',()=>{
  assert.equal(dayKey('2026-10-25T18:03:00Z'),today);
  assert.ok(TOPICS.length>=10);
  assert.notEqual(selectScoutTopic('2026-10-25').id,selectScoutTopic('2026-10-26').id);
  assert.deepEqual(selectScoutTopic(today),selectScoutTopic(today));
  assert.throws(()=>dayKey('not a date'));
});
test('daily durable issue guard resists rerun attempts',()=>{
  const issue={title:ISSUE_PREFIX+today,number:55};
  assert.equal(scoutAlreadyRecorded([issue],today),true);
  assert.equal(scoutAlreadyRecorded([{...issue,title:'Something else'}],today),false);
  assert.throws(()=>scoutAlreadyRecorded({},today));
});
test('model request is constrained to original zero-spend unverified drafts',()=>{
  const prompt=createScoutPrompt(topic);
  assert.match(prompt,/zero upfront cash/);
  assert.match(prompt,/not established customer demand/i);
  assert.match(prompt,/no.*guarantees/i);
  assert.match(prompt,/JSON/);
  assert.throws(()=>createScoutPrompt({id:'gambling'}));
});
test('accepts three bounded candidates and rejects suspicious or malformed content',()=>{
  const good={ideas:[item(1),item(2),item(3)]};
  const result=validateScoutDraft(JSON.stringify(good),topic);
  assert.equal(result.ideas.length,3);
  assert.equal(result.source,'local-model-unverified');
  assert.throws(()=>validateScoutDraft('not-json',topic));
  assert.throws(()=>validateScoutDraft({ideas:[item(1)]},topic));
  assert.throws(()=>validateScoutDraft({ideas:[item(1),item(1),item(3)]},topic));
  assert.throws(()=>validateScoutDraft({ideas:[item(1),{...item(2),value:'Guaranteed $100 per day'},item(3)]},topic));
  assert.throws(()=>validateScoutDraft({ideas:[item(1),{...item(2),value:'Message me at me@example.com'},item(3)]},topic));
  assert.throws(()=>validateScoutDraft({ideas:[item(1),{...item(2),value:'Follow https://example.com now'},item(3)]},topic));
  assert.throws(()=>validateScoutDraft({ideas:[item(1),{...item(2),value:'<script>alert(1)</script>'},item(3)]},topic));
});
test('fallback never misrepresents curated content as AI work',()=>{
  const fallback=curatedFallback(topic);
  assert.equal(fallback.source,'curated-template-fallback');
  assert.equal(fallback.ideas.length,3);
  assert.match(makeScoutBrief(today,topic,fallback),/Curated fallback templates/);
});
test('research journal explicitly disclaims revenue, demand, external actions and claims',()=>{
  const md=makeScoutBrief(today,topic,validateScoutDraft({ideas:[item(1),item(2),item(3)]},topic));
  assert.match(md,/UNVERIFIED INTERNAL RESEARCH/);
  assert.match(md,/no Instagram\/social publishing/);
  assert.match(md,/No sale, customer demand, revenue, earnings/);
  assert.match(md,/needs separate appropriate authorization/);
  assert.equal((md.match(/^## Candidate/gm)||[]).length,3);
  assert.ok(md.length<7000);
});
test('scheduled workflow has trusted main, tight quota and no payments or publishing',()=>{
  const workflow=readFileSync('.github/workflows/grove-scout.yml','utf8');
  const runner=readFileSync('scripts/grove-opportunity-scout.mjs','utf8');
  assert.match(workflow,/cron: '23 14 \* \* \*'/);
  assert.match(workflow,/ref: main/);
  assert.match(workflow,/contents: read/);
  assert.match(workflow,/issues: write/);
  assert.match(workflow,/concurrency:/);
  assert.match(workflow,/node --test tests\/grove-scout\.test\.mjs/);
  assert.match(runner,/scoutAlreadyRecorded\(history,date\)/);
  assert.match(runner,/scoutAlreadyRecorded\(again,date\)/);
  assert.match(runner,/GROVE_SCOUT_DRY_RUN/);
  assert.doesNotMatch(runner,/paypal|stripe|instagram\.com|\/transfers|\/payments|\/ads\b/i);
});

test('daily Scout retries safely and preserves a no-model fallback',()=>{
  const workflow=readFileSync('.github/workflows/grove-scout.yml','utf8');
  const runner=readFileSync('scripts/grove-opportunity-scout.mjs','utf8');
  assert.match(workflow,/cron: '23 20 \* \* \*'/);
  assert.match(workflow,/Check for an existing UTC research journal before model setup/);
  assert.match(workflow,/GROVE_SCOUT_ALREADY_DONE=true/);
  assert.match(workflow,/GROVE_MODEL_AVAILABLE: 'false'/);
  assert.match(workflow,/continue-on-error: true/);
  assert.match(workflow,/timeout 270s ollama pull qwen2\.5:3b/);
  assert.match(runner,/GROVE_MODEL_AVAILABLE==='false'/);
  assert.match(runner,/curatedFallback\(topic\)/);
  assert.match(runner,/prototypeFallback\(selected\)/);
  assert.match(runner,/evaluateScoutSeed\(date,topic,draft\)/);
  assert.ok(runner.includes('seed-evaluation.json'));
  assert.match(runner,/renderSeedPlan\(date,topic,draft,evaluation\)/);
});
