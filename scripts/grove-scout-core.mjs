/**
 * Autonomous Grove Opportunity Scout: trusted policy engine.
 * AI drafts are unverified INTERNAL RESEARCH, never ads, offers or financial records.
 * No account creation, payment, spending, posting, or customer contact permissions.
 */
export const TOPICS=Object.freeze([
  {id:'bike-care',name:'Original mountain-bike maintenance checklist',audience:'beginner mountain bikers'},
  {id:'inventory',name:'Simple inventory tracker for tiny businesses',audience:'small local sellers'},
  {id:'piano',name:'Beginner piano practice journal',audience:'beginner piano learners'},
  {id:'cad',name:'Original beginner 3D/CAD learning templates',audience:'students learning CAD'},
  {id:'yard',name:'Basic garden material planning worksheets',audience:'home gardeners'},
  {id:'study',name:'Printable study and assignment planners',audience:'students'},
  {id:'open-source',name:'Clear project changelog and roadmap templates',audience:'open-source hobby projects'},
  {id:'events',name:'Community volunteer event planning pack',audience:'small volunteer groups'},
  {id:'organize',name:'Original printable home organization labels',audience:'home organizers'},
  {id:'freelance',name:'Independent project scope and checklist template',audience:'new independent creators'},
  {id:'cycling',name:'Bicycle trip packing worksheet',audience:'recreational cyclists'},
  {id:'garden',name:'Seasonal garden task calendar template',audience:'beginning gardeners'}
]);
export const ISSUE_PREFIX='[GROVE-SCOUT] ';
export function dayKey(input){
  const ms=input instanceof Date?input.getTime():typeof input==='number'?input:Date.parse(String(input));
  if(!Number.isFinite(ms))throw Error('Invalid date');
  return new Date(ms).toISOString().slice(0,10);
}
export function selectScoutTopic(date){
  const key=dayKey(date);
  const day=Math.floor(Date.parse(key+'T00:00:00.000Z')/86400000);
  return TOPICS[((day%TOPICS.length)+TOPICS.length)%TOPICS.length];
}
export function scoutAlreadyRecorded(issues,date){
  if(!Array.isArray(issues))throw Error('Invalid history');
  const label=ISSUE_PREFIX+dayKey(date);
  return issues.some(x=>x?.title===label && x?.pull_request==null);
}
export function createScoutPrompt(topic){
  if(!TOPICS.some(t=>t.id===topic?.id))throw Error('Unapproved topic');
  return [
    'You are a small ethical digital-product research assistant.',
    'Brainstorm exactly 3 DIFFERENT feasible ways to build a useful original digital resource in this niche: '+topic.name,
    'Audience: '+topic.audience+'. Aim for zero upfront cash expense.',
    'Think critically. These are unverified hypotheses, NOT established customer demand, profitable ventures or financial advice.',
    'Do not propose ads, buying services, unsolicited messages, fake testimonials, misleading claims, account signups, or copying others.',
    'Do not make pricing, earnings, follower, customer, legal compliance, or success guarantees.',
    'Each idea must be an original helpful resource one person could prototype locally, with a no-cost validation approach.',
    'Only return valid JSON in exactly this schema:',
    '{"ideas":[{"title":"...","audience":"...","value":"...","prototype":"...","validation":"...","caution":"..."}]}',
    'Each field: one ordinary English sentence, fewer than 160 characters, no URLs, no HTML. Exactly three entries.'
  ].join('\n');
}
const textOK=v=>typeof v==='string'&&v.trim().length>=12&&v.length<=160&&
  !/[<>[\]{}]/.test(v)&&!/https?:|www\.|@|\$|€|£|\bguarantee(?:d|s)?\b|\bget rich\b|\bpassive income\b|\b100%\b/i.test(v);
export function validateScoutDraft(raw,topic){
  if(!TOPICS.some(x=>x.id===topic?.id))throw Error('Unknown topic');
  const obj=typeof raw==='string'?JSON.parse(raw):raw;
  if(!obj||!Array.isArray(obj.ideas)||obj.ideas.length!==3)throw Error('Expected exactly three draft ideas');
  const titles=new Set();
  const ideas=obj.ideas.map(i=>{
    if(!i||typeof i!=='object')throw Error('Malformed idea');
    for(const key of ['title','audience','value','prototype','validation','caution'])
      if(!textOK(i[key]))throw Error('Invalid field: '+key);
    const title=i.title.trim().toLowerCase();
    if(titles.has(title))throw Error('Duplicate idea');
    titles.add(title);
    return Object.fromEntries(['title','audience','value','prototype','validation','caution'].map(k=>[k,i[k].trim()]));
  });
  return {topicId:topic.id,source:'local-model-unverified',ideas};
}
export function curatedFallback(topic){
  if(!TOPICS.some(x=>x.id===topic?.id))throw Error('Unknown topic');
  const t=topic.name.toLowerCase();
  return {topicId:topic.id,source:'curated-template-fallback',ideas:[
    {title:'One-page '+t+' primer',audience:topic.audience,value:'A concise original reference sheet could help people approach this task.',prototype:'Create a single-page original worksheet using only basic editing tools.',validation:'Ask an interested volunteer for specific feedback without promising results.',caution:'Demand, accuracy, utility and commercial viability have not been verified.'},
    {title:'Weekly '+t+' tracker',audience:topic.audience,value:'A reusable activity tracker could reduce the effort required to stay organized.',prototype:'Draft a one-week printable tracker with clear labels and examples.',validation:'Check with a consenting tester whether the template is understandable.',caution:'This is a concept only; no users, sales or outcomes have been confirmed.'},
    {title:'Starter '+t+' checklist',audience:topic.audience,value:'A beginner-friendly checklist could provide straightforward practical value.',prototype:'Write and proofread a minimal checklist using original wording.',validation:'Ask a relevant volunteer to note confusing or missing steps.',caution:'Accuracy and buyer interest must be checked before any public offer.'}
  ]};
}
function safe(v){return String(v).replace(/\r?\n/g,' ').trim();}
export function makeScoutBrief(date,topic,draft){
  if(!draft||draft.topicId!==topic.id||draft.ideas?.length!==3)throw Error('Invalid scout brief');
  const key=dayKey(date);
  const lines=[
    '# Autonomous Grove · opportunity research · '+key,
    '',
    '**UNVERIFIED INTERNAL RESEARCH.** No sale, customer demand, revenue, earnings, or market research has been confirmed.',
    '**Permissions:** $0 spending, no subscriptions or paid advertising, no Instagram/social publishing, no mass messaging, no payments or payout access.',
    '**Research source:** '+(draft.source==='local-model-unverified'?'Free local Ollama language-model drafts (not fact-checked).':'Curated fallback templates (no model output accepted).'),
    '**Scope:** '+topic.name+' / '+topic.audience+'.',
    '',
    'These are candidate experiments. They are not claims of profitability, and nothing has been offered for sale.',
  ];
  draft.ideas.forEach((i,n)=>{
    lines.push('', '## Candidate '+(n+1)+': '+safe(i.title),
      '- Hypothetical audience: '+safe(i.audience),
      '- Possible customer benefit: '+safe(i.value),
      '- Zero-spend prototype: '+safe(i.prototype),
      '- Ethical validation: '+safe(i.validation),
      '- What remains unverified: '+safe(i.caution)
    );
  });
  lines.push('','## Safe next action','Prepare one original offline prototype and seek voluntary feedback. Any public promotion, third-party account access, financial transaction, contract or payment-provider setup needs separate appropriate authorization.',
    '', 'Generated by a bounded scheduled workflow. This issue is a research journal entry, not a Builder queue instruction.');
  return lines.join('\n').slice(0,7000);
}
