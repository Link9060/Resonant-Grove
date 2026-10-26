/**
 * Offline original resource draft. Not a product listing or verified advice.
 * Only validated, bounded, printable text is included in a Scout issue.
 */
const safeText=v=>typeof v==='string'&&v.trim().length>=12&&v.length<=170&&
  !/[<>[\]{}]/.test(v)&&
  !/https?:|www\.|@|\$|£|€|\bguarantee(?:d|s)?\b|\b100%\b|\bproven\b|\bcertif(?:ied|ication)\b/i.test(v);

export function prototypePrompt(topic,idea){
  if(typeof topic?.name!=='string'||typeof idea?.title!=='string')throw Error('Missing bounded scout concept');
  return [
    'Draft one ORIGINAL, useful, printable worksheet or checklist as a first offline prototype.',
    'Category: '+topic.name+'. Concept: '+idea.title+'. Intended reader: '+idea.audience+'.',
    'Build a practical resource, not a sales pitch or advertisement.',
    'No costs, prices, purchases, subscriptions, account signups, claims of results, unverifiable facts, plagiarized writing, URLs or contact details.',
    'Each item should be an actionable instruction or fill-in question a beginner can use.',
    'No medical/legal/financial advice. Never pretend it is proven, tested, for sale or already profitable.',
    'JSON ONLY: {"sections":[{"heading":"...","items":["...","...","..."]},{"heading":"...","items":["...","...","..."]},{"heading":"...","items":["...","...","..."]}]}',
    'Exactly three sections with exactly three distinct items each; each heading and item between 12 and 170 characters.',
  ].join('\n');
}
export function validatePrototype(raw){
  const data=typeof raw==='string'?JSON.parse(raw):raw;
  if(!data||!Array.isArray(data.sections)||data.sections.length!==3)throw Error('Prototype needs three sections');
  const unique=new Set();
  const sections=data.sections.map(s=>{
    if(!s||!safeText(s.heading)||!Array.isArray(s.items)||s.items.length!==3)throw Error('Invalid section structure');
    const items=s.items.map(x=>{
      if(!safeText(x))throw Error('Invalid checklist item');
      const norm=x.trim().toLowerCase();
      if(unique.has(norm))throw Error('Repeated checklist item');
      unique.add(norm);return x.trim();
    });
    return {heading:s.heading.trim(),items};
  });
  return {source:'local-model-unverified',sections};
}
export function prototypeFallback(idea){
  if(typeof idea?.title!=='string'||typeof idea?.prototype!=='string')throw Error('Missing idea');
  return {source:'curated-template-fallback',sections:[
    {heading:'Prepare an original working draft',items:[
      'Write down the exact reader problem this original resource is supposed to help solve.',
      'Create a one-page outline with spaces for a person to record their own information.',
      'Use the proposal as an initial sketch only, and remove any unsupported claims.'
    ]},
    {heading:'Try the worksheet yourself',items:[
      'Complete the worksheet from beginning to end using imaginary example details.',
      'Identify questions or steps that are confusing without further explanation.',
      'Revise the wording and check the readability of the printed or saved page.'
    ]},
    {heading:'Validate carefully before releasing',items:[
      'Ask a willing relevant reader to try the draft and describe confusing sections.',
      'Record feedback and possible revisions without assuming market demand exists.',
      'Check accuracy, originality, platform eligibility, and honest descriptions before any offering.'
    ]}
  ]};
}
export function renderPrototype(topic,idea,result){
  if(!result||!Array.isArray(result.sections)||result.sections.length!==3)throw Error('Unverified prototype');
  const lines=[
    '## Prototype 001 · offline worksheet draft',
    '',
    '**UNVERIFIED DRAFT ONLY.** Not checked for accuracy, demand, originality or suitability for sale. No publication or selling was performed.',
    '**Concept:** '+idea.title,
    '**Suggested reader:** '+idea.audience,
    '**Potential purpose:** '+idea.value,
    '**Draft source:** '+(result.source==='local-model-unverified'?'Local Ollama model, unreviewed':'Curated template fallback, not AI generated'),
  ];
  for(const s of result.sections){
    lines.push('','### '+s.heading);
    for(const item of s.items)lines.push('- [ ] '+item);
  }
  lines.push('','**Next gate:** Check substance, accuracy, originality and genuine user feedback before distribution or any commercial claim.');
  return lines.join('\n').slice(0,4000);
}
