import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditPrototype,preferRevisedPrototype,revisionPrompt,renderQaSummary,renderFeedbackWorksheet}
  from '../scripts/grove-prototype-qa.mjs';
import {TOPICS,curatedFallback} from '../scripts/grove-scout-core.mjs';
import {validatePrototype,prototypeFallback} from '../scripts/grove-prototype.mjs';

const topic=TOPICS[0];
const idea=curatedFallback(topic).ideas[0];
function useful(){
  return validatePrototype({sections:[
    {heading:'Plan your mountain bike maintenance',items:[
      'Write down the bike parts you want to inspect before a normal ride.',
      'Record the date when you last checked the bike tires for visible wear.',
      'Identify any maintenance tasks that should be reviewed by a qualified mechanic.'
    ]},
    {heading:'Keep maintenance observations',items:[
      'Mark each task you completed during this bike maintenance session.',
      'Record any new mechanical noises you noticed before starting your next ride.',
      'List bike maintenance questions you want to ask a trusted bike shop.'
    ]},
    {heading:'Review and track your bike checks',items:[
      'Describe which maintenance checklist steps were confusing to use.',
      'Choose one bike care task to revisit with knowledgeable supervision.',
      'Note when you should consult the bicycle manufacturer instructions.'
    ]}
  ]});
}
test('structurally sound original topic-specific draft is still never marked verified',()=>{
  const qa=auditPrototype(topic,idea,useful());
  assert.equal(qa.readinessScore,5);
  assert.equal(qa.status,'needs-human-review');
  assert.equal(qa.warningIds.length,0);
  assert.equal(qa.humanVerified,false);
  assert.equal(qa.demandVerified,false);
  assert.equal(qa.salesVerified,false);
  assert.equal(qa.permissionChanges,'none');
  assert.match(renderQaSummary(qa),/Needs human review/);
  assert.match(renderQaSummary(qa),/No customer test was performed/);
});
test('generic fallback stays a review draft and may require revision',()=>{
  const qa=auditPrototype(topic,idea,prototypeFallback(idea));
  assert.equal(qa.humanVerified,false);
  assert.ok(['revise-before-review','needs-human-review'].includes(qa.status));
  assert.ok(qa.readinessScore<=5);
});
test('unrelated, vague and repeated items are flagged without pretending to fact check',()=>{
  const poor=validatePrototype({sections:[
    {heading:'Generic things to consider for readers',items:[
      'This resource has some things that could maybe be useful eventually.',
      'A generic worksheet can help people think about their resource.',
      'This resource has some things that could maybe be useful tomorrow.'
    ]},
    {heading:'Generic resource considerations',items:[
      'This resource has some things that could maybe be useful later.',
      'Some things are a good idea for this worksheet eventually.',
      'A generic worksheet can be a helpful thing for some users.'
    ]},
    {heading:'Generic planning material',items:[
      'This resource has some things that could maybe be useful today.',
      'People may find some things interesting inside their worksheet.',
      'The resource could become an interesting idea to think about.'
    ]}
  ]});
  const qa=auditPrototype(topic,idea,poor);
  assert.equal(qa.status,'revise-before-review');
  assert.ok(qa.warningIds.includes('actionability'));
  assert.ok(qa.warningIds.includes('topic-fit'));
  assert.ok(qa.warningIds.includes('repetition'));
  assert.match(revisionPrompt(topic,idea,poor,qa),/Improve/);
  assert.match(renderQaSummary(qa),/Needs revision/);
});
test('clearly promotional unverifiable claims flag revision',()=>{
  const item=useful(),copy=structuredClone(item);
  copy.sections[0].items[0]='Record how our proven system guarantees perfect results every time.';
  const qa=auditPrototype(topic,idea,copy);
  assert.ok(qa.warningIds.includes('unsupported-claims'));
  assert.equal(qa.status,'revise-before-review');
});
test('accept an improved revision only if fewer issues, without conferring approval',()=>{
  const old=prototypeFallback(idea),better=useful();
  const choice=preferRevisedPrototype(old,better,topic,idea);
  assert.ok(choice.qa.readinessScore>=auditPrototype(topic,idea,old).readinessScore);
  assert.equal(choice.qa.humanVerified,false);
  const reversed=preferRevisedPrototype(better,old,topic,idea);
  assert.equal(reversed.prototype,better);
  assert.equal(reversed.replaced,false);
  assert.throws(()=>revisionPrompt(topic,idea,better,auditPrototype(topic,idea,better)));
});
test('refuses unbounded or malformed untrusted prototype data',()=>{
  const good=useful();
  assert.throws(()=>auditPrototype(topic,idea,{source:'unknown',sections:good.sections}));
  assert.throws(()=>auditPrototype(topic,idea,{...good,sections:good.sections.slice(0,2)}));
  assert.throws(()=>auditPrototype(topic,idea,{...good,sections:[{...good.sections[0],items:['tiny']},good.sections[1],good.sections[2]]}));
});
test('blank evidence form never pretends anyone has been tested',()=>{
  const qa=auditPrototype(topic,idea,useful());
  const form=renderFeedbackWorksheet(topic,idea,qa);
  assert.match(form,/NO TESTING HAS BEEN PERFORMED/);
  assert.match(form,/real, consenting test/);
  assert.match(form,/What failed or was confusing/);
  assert.match(form,/Do not invent testimonials/);
  assert.match(form,/Do not share personal details/);
});
test('scheduled Scout includes QA report and at most one optional local rewrite',()=>{
  const workflow=readFileSync('.github/workflows/grove-scout.yml','utf8');
  const validation=readFileSync('.github/workflows/validate-autonomous.yml','utf8');
  const runner=readFileSync('scripts/grove-opportunity-scout.mjs','utf8');
  for(const file of [workflow,validation]){
    assert.match(file,/grove-prototype-qa\.mjs/);
    assert.match(file,/grove-prototype-qa\.test\.mjs/);
  }
  assert.match(runner,/auditPrototype\(topic,selected,prototype\)/);
  assert.match(runner,/preferRevisedPrototype\(prototype,revised,topic,selected\)/);
  assert.match(runner,/prototype-quality-audit\.json/);
  assert.match(runner,/evidence-and-feedback\.md/);
  assert.doesNotMatch(runner,/paypal|stripe|instagram\.com|\/transfers|\/payments|\/ads\b/i);
});
