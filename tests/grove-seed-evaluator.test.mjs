import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOPICS,curatedFallback} from '../scripts/grove-scout-core.mjs';
import {EVALUATION_VERSION,READINESS_MAX,evaluateScoutSeed,renderSeedEvaluation,renderSeedPlan} from '../scripts/grove-seed-evaluator.mjs';

const topic=TOPICS[0];
const draft=()=>curatedFallback(topic);
const fields=(i)=>({
  title:'An original resource idea for customers number '+i,
  audience:'People who may be interested in organizing activities',
  value:'A resource might make planning a little bit easier.',
  prototype:'Think about a small hypothetical resource to create.',
  validation:'Consider whether or not feedback might someday help.',
  caution:'Outcomes are unknown and may vary between individuals.'
});
test('ranks three internal drafts deterministically and preserves explicit no-business-evidence state',()=>{
  const ideas=[fields(1),{
    title:'One-page bike maintenance checklist for beginners',
    audience:'Beginning mountain bike riders who need a maintenance checklist',
    value:'An original, printable checklist may help prepare for trail rides.',
    prototype:'Draft a one-page original printable worksheet with clear checkbox items.',
    validation:'Ask a willing beginner rider for voluntary feedback on its clarity.',
    caution:'Demand, accuracy, originality and buyer interest are unverified.'
  },fields(3)];
  const input={topicId:topic.id,source:'local-model-unverified',ideas};
  const first=evaluateScoutSeed('2026-10-26',topic,input);
  assert.equal(first.selectedCandidate,2);
  assert.equal(first.schemaVersion,EVALUATION_VERSION);
  assert.equal(first.scores.length,3);
  assert.ok(first.scores.every(x=>x.score>=4&&x.score<=READINESS_MAX));
  assert.equal(first.verified.demand,false);
  assert.equal(first.verified.sales,false);
  assert.equal(first.permissions.spending,false);
  assert.equal(first.permissions.publishing,false);
  assert.equal(first.permissions.autoBuilderDispatch,false);
  assert.equal(first.stage,'internal-prototype-draft');
  assert.match(first.metric,/NOT business viability/);
  assert.deepEqual(evaluateScoutSeed('2026-10-26',topic,input),first);
});
test('stable score ties choose first candidate, not random or model-dependent output',()=>{
  const input=draft();
  input.ideas=[fields(1),fields(2),fields(3)];
  const result=evaluateScoutSeed('2026-10-26',topic,input);
  assert.equal(result.scores[0].score,result.scores[1].score);
  assert.equal(result.selectedCandidate,1);
});
test('rejects non-Scout concepts, malformed batches and incomplete fields',()=>{
  const input=draft();
  assert.throws(()=>evaluateScoutSeed('2026-10-26',{id:'banned'},input));
  assert.throws(()=>evaluateScoutSeed('2026-10-26',topic,{...input,source:'customer-verified'}));
  assert.throws(()=>evaluateScoutSeed('2026-10-26',topic,{...input,ideas:[]}));
  assert.throws(()=>evaluateScoutSeed('2026-10-26',topic,{...input,ideas:[{},input.ideas[1],input.ideas[2]]}));
  assert.throws(()=>evaluateScoutSeed('not a date',topic,input));
});
test('renders reviewable scorecard and internal draft plan without inventing facts',()=>{
  const input=draft(),result=evaluateScoutSeed('2026-10-26',topic,input);
  const brief=renderSeedEvaluation(topic,input,result);
  const plan=renderSeedPlan('2026-10-26',topic,input,result);
  assert.match(brief,/automated internal shortlist/i);
  assert.match(brief,/Score.*draft readiness|draft readiness ONLY/);
  assert.match(brief,/No verified customers/);
  assert.match(brief,/not an owner-approved ARRAY Builder task/);
  assert.equal((brief.match(/^\| [123] \|/gm)||[]).length,3);
  assert.match(plan,/INTERNAL DRAFT.*NOT LAUNCHED/);
  assert.match(plan,/voluntary feedback/);
  assert.match(plan,/No spending/);
  assert.match(plan,/stop|Stop|Stopping/);
  assert.match(plan,/No automatic ARRAY/);
  assert.throws(()=>renderSeedEvaluation(topic,input,{...result,selectedCandidate:10}));
});
test('scout CI includes evaluation and never silently enables spending or outreach',()=>{
  const workflow=readFileSync('.github/workflows/grove-scout.yml','utf8');
  const validate=readFileSync('.github/workflows/validate-autonomous.yml','utf8');
  const runner=readFileSync('scripts/grove-opportunity-scout.mjs','utf8');
  for(const s of [workflow,validate]){
    assert.match(s,/grove-seed-evaluator\.mjs/);
    assert.match(s,/grove-seed-evaluator\.test\.mjs/);
  }
  assert.match(runner,/evaluateScoutSeed\(date,topic,draft\)/);
  assert.match(runner,/renderSeedEvaluation\(topic,draft,evaluation\)/);
  assert.match(runner,/renderSeedPlan\(date,topic,draft,evaluation\)/);
  assert.match(runner,/prototypePrompt\(topic,selected\)/);
  assert.doesNotMatch(runner,/paypal|stripe|instagram\.com|\/transfers|\/payments|\/ads\b/i);
});
