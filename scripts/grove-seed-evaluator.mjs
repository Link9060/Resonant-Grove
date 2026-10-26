/**
 * Grove Seed Evaluator v1: deterministic ranking of three unverified ideas.
 * This measures draft readiness only, never demand, revenue or profitability.
 * Uses no AI model, network access, payments, publishing, or account access.
 */
import {TOPICS,dayKey} from './grove-scout-core.mjs';

export const EVALUATION_VERSION=1;
export const READINESS_MAX=12;
const rules=Object.freeze([
  {key:'audience',label:'Audience description',max:3},
  {key:'deliverable',label:'Zero-cost prototype description',max:3},
  {key:'feedback',label:'Consent-based feedback plan',max:3},
  {key:'uncertainty',label:'Uncertainty and accuracy disclosure',max:3}
]);
const has=(s,pattern)=>pattern.test(s.toLowerCase());
const clean=value=>{
  if(typeof value!=='string'||!value.trim()||value.length>170)throw Error('Invalid evaluated text');
  if(/[\r\n<>]/.test(value))throw Error('Disallowed evaluated text');
  return value.trim();
};
function evaluateCandidate(idea,index){
  const title=clean(idea.title),audience=clean(idea.audience),value=clean(idea.value),
    prototype=clean(idea.prototype),validation=clean(idea.validation),caution=clean(idea.caution);
  const a=1+
    Number(audience.split(/\s+/).length>=5)+
    Number(has(audience,/bike|seller|student|gardener|player|learner|organizer|volunteer|rider|creator|business|beginner|household|cyclist/));
  const p=1+
    Number(has(title+' '+prototype,/checklist|worksheet|tracker|template|planner|calendar|guide|journal|labels|spreadsheet|sheet|file|resource|outline/))+
    Number(has(prototype,/create|draft|write|make|design|draw|prepare|build|outline|sketch/));
  const f=1+
    Number(has(validation,/ask|interview|test|try|feedback|review|check/))+
    Number(has(validation,/willing|voluntary|volunteer|consent|interested|reader|tester/));
  const u=1+
    Number(has(caution,/unverified|unknown|not verified|remain|not confirmed|check|must|uncertain/))+
    Number(has(caution,/accuracy|originality|demand|market|buyer|commercial|viability|interest|outcome/));
  const criteria={audience:a,deliverable:p,feedback:f,uncertainty:u};
  const score=Object.values(criteria).reduce((sum,n)=>sum+n,0);
  if(score<4||score>READINESS_MAX)throw Error('Invalid calculated score');
  return {candidate:index+1,title,score,criteria,notes:[
    'Automated rubric based on draft wording only.',
    'No audience, demand, legal status, accuracy or originality has been independently verified.'
  ]};
}
export function evaluateScoutSeed(date,topic,draft){
  const key=dayKey(date);
  if(!TOPICS.some(t=>t.id===topic?.id)||draft?.topicId!==topic.id||
    !['local-model-unverified','curated-template-fallback'].includes(draft?.source)||
    !Array.isArray(draft.ideas)||draft.ideas.length!==3)
    throw Error('Expected one valid trusted Scout batch');
  const scores=draft.ideas.map(evaluateCandidate);
  const ranked=[...scores].sort((a,b)=>b.score-a.score||a.candidate-b.candidate);
  const selected=ranked[0];
  return {
    schemaVersion:EVALUATION_VERSION,date:key,topicId:topic.id,
    source:draft.source,metric:'Draft readiness, NOT business viability',
    criteria:rules.map(rule=>({...rule})),
    scores,selectedCandidate:selected.candidate,selectedScore:selected.score,
    stage:'internal-prototype-draft',
    verified:{demand:false,customers:false,sales:false,earnings:false,originality:false,accuracy:false},
    permissions:{spending:false,publishing:false,outreach:false,payments:false,payouts:false,autoBuilderDispatch:false},
    gate:'Owner or authorized reviewer must verify accuracy, originality, usefulness and provider eligibility before any public or commercial action.',
    stoppingRule:'If independent accuracy checks or genuine voluntary feedback show the draft is unusable, revise or retire it; never invent evidence.'
  };
}
export function renderSeedEvaluation(topic,draft,evaluation){
  if(evaluation?.schemaVersion!==1||evaluation?.topicId!==topic?.id||
    !Array.isArray(evaluation.scores)||evaluation.scores.length!==3||
    evaluation.selectedCandidate<1||evaluation.selectedCandidate>3)
    throw Error('Invalid Seed scorecard');
  const winner=draft?.ideas?.[evaluation.selectedCandidate-1];
  if(!winner)throw Error('Missing selected candidate');
  const lines=[
    '## Seed Evaluation · automated internal shortlist','',
    '**Decision:** Candidate '+evaluation.selectedCandidate+' selected for an offline prototype draft.',
    '**Selection:** '+winner.title,
    '**Scoring:** draft readiness ONLY; not estimated income, market demand, profitability or verified product quality.',
    '**Selected score:** '+evaluation.selectedScore+'/'+READINESS_MAX+' points (wording-based rubric).',
    '**Source:** '+(draft.source==='local-model-unverified'?'Unverified local model output.':'Curated fallback template, not AI output.'),'',
    '| Candidate | Audience /3 | Prototype /3 | Feedback /3 | Caution /3 | Total /12 |',
    '|---|---:|---:|---:|---:|---:|'
  ];
  for(const c of evaluation.scores){
    lines.push('| '+c.candidate+' | '+c.criteria.audience+' | '+c.criteria.deliverable+' | '+
      c.criteria.feedback+' | '+c.criteria.uncertainty+' | **'+c.score+'** |');
  }
  lines.push('',
    '**Next internal step:** Draft a printable checklist or worksheet for the chosen idea. Record a test plan, not test results.',
    '**Evidence status:** No verified customers, willingness to pay, revenue, accuracy, originality or independent demand data.',
    '**Approval boundary:** No spending, automatic public publishing, unsolicited contact, marketplace listing or payment actions.',
    '**Stop rule:** '+evaluation.stoppingRule,
    '','This scorecard is not an owner-approved ARRAY Builder task. Rankings are deterministic heuristics, not external research.'
  );
  return lines.join('\n');
}
export function renderSeedPlan(date,topic,draft,evaluation){
  const selected=draft.ideas[evaluation.selectedCandidate-1];
  const content=[
    '# Grove · Proposed Seed '+dayKey(date),
    '',
    '> INTERNAL DRAFT · NOT LAUNCHED · NO VERIFIED DEMAND OR REVENUE',
    '',
    '- Topic: '+topic.name,
    '- Selected idea: '+selected.title,
    '- Intended audience: '+selected.audience,
    '- Hypothesized benefit: '+selected.value,
    '- No-spend first prototype: '+selected.prototype,
    '- Consent-based feedback approach: '+selected.validation,
    '- Known uncertainty: '+selected.caution,
    '- Draft readiness score: '+evaluation.selectedScore+'/12 (NOT a market score)',
    '- Work stage: '+evaluation.stage,
    '',
    '## Internal experiment checklist',
    '',
    '- [x] Draft three original hypotheses.',
    '- [x] Apply transparent wording-based readiness rubric.',
    '- [x] Choose an offline prototype candidate.',
    '- [ ] Review accuracy and originality independently.',
    '- [ ] Check whether the artifact functions as described.',
    '- [ ] Obtain voluntary feedback from a real, consenting tester.',
    '- [ ] Record actual evidence, including negative feedback.',
    '- [ ] Decide to refine, retire or request separate authorized publication.',
    '',
    '## Hard safety limits',
    '',
    'No spending. No marketing, social posting, purchases, payouts, payments, customer contact, or secret/financial access.',
    'Do not fabricate testimonials, sales, feedback or positive outcomes.',
    'No automatic ARRAY queue labels or production deployments are permitted.',
    '',
    '**Stopping rule:** '+evaluation.stoppingRule,
    '**Gate:** '+evaluation.gate,
    '',
    'The printable artifact is a draft only and does not constitute a launched Seed.'
  ];
  return content.join('\n')+'\n';
}
