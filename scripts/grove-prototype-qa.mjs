/**
 * Review-only static checks for unverified Scout worksheet drafts.
 * Not a fact checker, originality test, customer test or release approval.
 * Never uses external APIs, credentials, payments or untrusted executable code.
 */
export const QA_VERSION=1;

const ACTION=/^(?:write|record|check|identify|note|list|choose|mark|draw|describe|plan|compare|review|test|try|draft|create|fill|measure|sketch|outline|ask|verify|track|organize|consider|summarize|add|enter|select|label|reflect|explain|set|decide)\b/i;
const UNSUPPORTED=/\b(?:guaranteed?|proven|certified|clinically tested|always works|100% effective|customers (?:say|love)|users (?:report|prefer)|verified demand|confirmed earnings|make money fast)\b/i;
const HYPE=/\b(?:effortlessly|perfect results|ultimate solution|instant success|everyone needs|best on the market)\b/i;
const STOPS=new Set('original beginner basic simple clear printable digital resources resource worksheet worksheets checklist checklists sheet sheets guide guides starter first tasks with from that this your into what when how where for and the you readers users these those more local project template templates business beginners an of to on a in by as or is are'.split(' '));
const tokens=value=>String(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(t=>t.length>=4&&!STOPS.has(t));
function required(v){
  if(typeof v!=='string'||v.trim().length<12||v.length>170||/[\r\n<>]/.test(v))
    throw Error('Invalid or unbounded prototype text');
  return v.trim();
}
export function auditPrototype(topic,idea,prototype){
  if(typeof topic?.name!=='string'||typeof idea?.title!=='string'||
    !prototype||!['local-model-unverified','curated-template-fallback'].includes(prototype.source)||
    !Array.isArray(prototype.sections)||prototype.sections.length!==3)
    throw Error('Expected bounded Scout prototype');
  const headings=[],items=[];
  for(const section of prototype.sections){
    headings.push(required(section?.heading));
    if(!Array.isArray(section.items)||section.items.length!==3)
      throw Error('Each section needs three instructions');
    for(const item of section.items)items.push(required(item));
  }
  const subjectTerms=new Set([...tokens(topic.name),...tokens(idea.title)]);
  const text=[...headings,...items].join(' ').toLowerCase();
  const repeatedStarts=new Map();
  for(const item of items){
    const key=tokens(item).slice(0,3).join(' ');
    repeatedStarts.set(key,(repeatedStarts.get(key)||0)+1);
  }
  const nActions=items.filter(item=>ACTION.test(item)||item.includes('?')||item.includes('_____')).length;
  const hits=[...subjectTerms].filter(term=>text.includes(term)).length;
  const warnings=[];
  const checks=[
    {id:'bounded-structure',label:'3 sections and 9 bounded checklist items',passed:true,
      detail:'All three sections contain three bounded instructions. This does not establish factual accuracy.'},
    {id:'actionability',label:'Actionable worksheet instructions',passed:nActions>=6,
      detail:nActions+' of 9 items begin with an action or provide a fill-in question.'},
    {id:'topic-fit',label:'Matches stated subject',passed:hits>=1,
      detail:hits+' topic-related words appear in the draft. Keyword overlap is only a rough signal.'},
    {id:'repetition',label:'No excessive repeated openings',passed:![...repeatedStarts.values()].some(n=>n>3),
      detail:'Checks for repeatedly recycled opening phrases; it cannot detect all semantic duplicates.'},
    {id:'unsupported-claims',label:'No obvious unverified promotional claims',passed:!UNSUPPORTED.test(text)&&!HYPE.test(text),
      detail:'A limited phrase screen; passing does NOT validate claims or originality.'}
  ];
  for(const c of checks)if(!c.passed)warnings.push(c.id);
  const status=warnings.length?'revise-before-review':'needs-human-review';
  return {
    schemaVersion:QA_VERSION,
    status,
    source:prototype.source,
    checks,
    warningIds:warnings,
    readinessScore:checks.filter(c=>c.passed).length,
    readinessMax:checks.length,
    humanVerified:false,
    externalTestsPerformed:false,
    demandVerified:false,
    salesVerified:false,
    gate:'Human review of factual accuracy, originality, usefulness, eligibility and real, consent-based feedback is still required.',
    permissionChanges:'none'
  };
}
export function preferRevisedPrototype(original,revision,topic,idea){
  const oldAudit=auditPrototype(topic,idea,original);
  const newAudit=auditPrototype(topic,idea,revision);
  // Never replace a stronger draft with a weaker one and never treat either as verified.
  const improved=newAudit.warningIds.length<oldAudit.warningIds.length;
  return {prototype:improved?revision:original,qa:improved?newAudit:oldAudit,replaced:improved};
}
export function revisionPrompt(topic,idea,prototype,qa){
  if(!qa||!Array.isArray(qa.warningIds)||qa.warningIds.length===0)
    throw Error('No reason to request revision');
  const headings=prototype.sections.map(s=>s.heading);
  return [
    'Improve a previously drafted ORIGINAL offline printable worksheet. Do not market or publish it.',
    'Subject: '+topic.name+'. Candidate: '+idea.title+'.',
    'Current section headings: '+headings.join(' | ')+'.',
    'Automated warnings (not fact-check findings): '+qa.warningIds.join(', ')+'.',
    'Make it more closely related to the stated topic and more actionable and specific without asserting unverified facts.',
    'Avoid repeated wording, sales pitches, claims of success, prices, links, contact details, account signups, legal, financial or medical advice.',
    'Return only valid JSON matching exactly this schema:',
    '{"sections":[{"heading":"...","items":["...","...","..."]},{"heading":"...","items":["...","...","..."]},{"heading":"...","items":["...","...","..."]}]}',
    'Exactly three sections, three distinct tasks in each, ordinary English text of 12 to 170 characters per field.'
  ].join('\n');
}
export function renderQaSummary(qa){
  if(!qa||qa.schemaVersion!==QA_VERSION||!Array.isArray(qa.checks)||qa.checks.length!==5||
    !['revise-before-review','needs-human-review'].includes(qa.status))
    throw Error('Invalid QA report');
  const lines=[
    '## Prototype Quality Audit · automated, limited checks','',
    '**Prototype QA:** '+(qa.status==='revise-before-review'?'Needs revision':'Needs human review')+' (not approved for distribution).',
    '**Static check score:** '+qa.readinessScore+'/'+qa.readinessMax+' (NOT a customer, business, accuracy or originality rating).',
    '**AI/customer evidence:** None independently verified. No customer test was performed.','',
    '| Automated check | Result |',
    '|---|---|'
  ];
  for(const check of qa.checks)lines.push('| '+check.label+' | '+(check.passed?'Pass (limited check)':'Needs attention')+' |');
  lines.push('','**Next gate:** '+qa.gate,
    'This automatic check cannot grant publication or commercial authorization.');
  return lines.join('\n');
}
export function renderFeedbackWorksheet(topic,idea,qa){
  if(qa?.schemaVersion!==QA_VERSION)throw Error('Missing QA result');
  const title=required(idea.title),name=required(topic.name);
  return [
    '# Grove · Evidence and Feedback Worksheet','',
    '**PUBLICATION WARNING:** Do not share personal details, contact information or private participant responses in public GitHub issues.',
    '**Status:** NO TESTING HAS BEEN PERFORMED by this automated system. This page is a blank form.',
    '**Experiment:** '+title,
    '**Category:** '+name,
    '**Automated precheck:** '+qa.status+' (not approval)','',
    '## Independent review','',
    '- [ ] I reviewed the draft for factual accuracy and documented corrections.',
    '- [ ] I checked that the wording and any assets are original or appropriately licensed.',
    '- [ ] I confirmed the file opens, prints and can actually be used.',
    '- [ ] I reviewed platform rules and eligibility before any proposed public distribution.','',
    '## Voluntary feedback (fill in ONLY after a real, consenting test)','',
    '- Date of test (optional): __________',
    '- Type of consent obtained, without participant identity: __________',
    '- What task did the person actually try? __________',
    '- What worked or was useful? __________',
    '- What failed or was confusing? __________',
    '- What evidence can I personally verify? __________',
    '- Limitations and negative observations: __________','',
    '## Decision after review','',
    '- [ ] Revise prototype (record precise change).',
    '- [ ] Retire experiment (record evidence and reason).',
    '- [ ] Keep internal and collect additional voluntary feedback.',
    '- [ ] Request separate appropriate approval for any proposed public release.','',
    'Do not invent testimonials, revenue, demand or positive feedback. An AI cannot substitute for a real tester.',
    'No advertising, customer messaging, buying, transfers or payment access has been authorized.'
  ].join('\n')+'\n';
}
