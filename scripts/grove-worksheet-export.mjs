/**
 * Creates review-only printable worksheet files from a validated Grove Scout draft.
 * Never embeds scripts, network resources, price tags, customer claims or secrets.
 */
const DATE_PATTERN=/^\d{4}-\d{2}-\d{2}$/;
function required(value,name){
  if(typeof value!=='string'||!value.trim()||value.length>200)
    throw Error('Invalid worksheet '+name);
  return value.trim();
}
export function escapeHtml(input){
  return String(input).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
export function renderPrintableWorksheet(date,topic,idea,prototype){
  if(!DATE_PATTERN.test(date))throw Error('Expected a UTC date');
  const category=required(topic?.name,'category');
  const name=required(idea?.title,'name');
  const audience=required(idea?.audience,'audience');
  const purpose=required(idea?.value,'purpose');
  if(!prototype||!['local-model-unverified','curated-template-fallback'].includes(prototype.source)||
    !Array.isArray(prototype.sections)||prototype.sections.length!==3)
    throw Error('Invalid source or number of worksheet sections');
  const sections=prototype.sections.map((s,index)=>{
    const heading=required(s?.heading,'section heading '+index);
    if(!Array.isArray(s.items)||s.items.length!==3)
      throw Error('Each section must have exactly three instructions');
    return {heading,items:s.items.map((item,i)=>required(item,'item '+index+'.'+i))};
  });
  const source=prototype.source==='local-model-unverified'?'Unverified local model draft':'Curated planning-template fallback';
  const caution='INTERNAL DRAFT ONLY. Not fact-checked or tested with customers. Not for sale or public distribution without review.';
  const css=[
    '@page{size:letter;margin:.7in}',
    '*{box-sizing:border-box}',
    'body{font-family:Arial,Helvetica,sans-serif;color:#17251a;max-width:850px;margin:0 auto;padding:28px;background:#fff;line-height:1.5}',
    'header{border-bottom:3px solid #427a4d;padding-bottom:16px;margin-bottom:24px}',
    '.brand{font-size:12px;font-weight:700;letter-spacing:2px;color:#417447;text-transform:uppercase}',
    'h1{font-size:28px;line-height:1.15;margin:14px 0}',
    '.meta{color:#526456;font-size:12px}',
    '.warning{font-size:12px;border:1px solid #cad9c6;background:#f5f9f3;padding:12px 14px;margin-bottom:20px}',
    'h2{font-size:18px;margin-top:22px;color:#254c31}',
    'ul{list-style:none;padding:0;margin:10px 0 20px}',
    'li{padding:10px 0;border-bottom:1px solid #e2e9e0;display:flex;gap:11px;break-inside:avoid}',
    '.square{font-size:18px;color:#527357;line-height:1.15}',
    'footer{margin-top:26px;color:#5d6e60;font-size:11px}',
    '@media print{body{padding:0}h2{break-after:avoid}}'
  ].join('');
  const sectionHtml=sections.map(s=>'<section><h2>'+escapeHtml(s.heading)+'</h2><ul>'+
    s.items.map(item=>'<li><span class="square" aria-hidden="true">&#9633;</span><span>'+escapeHtml(item)+'</span></li>').join('')+
    '</ul></section>').join('\n');
  const html=[
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; form-action &#39;none&#39;">',
    '<title>'+escapeHtml(name)+' | Grove internal draft</title>',
    '<style>'+css+'</style></head><body>',
    '<header><div class="brand">Grove / Seed research</div><h1>'+escapeHtml(name)+'</h1>',
    '<div class="meta">'+escapeHtml(category)+' &middot; '+escapeHtml(date)+' &middot; '+escapeHtml(source)+'</div></header>',
    '<p class="warning"><strong>'+escapeHtml(caution)+'</strong></p>',
    '<p><strong>Suggested reader:</strong> '+escapeHtml(audience)+'</p>',
    '<p><strong>Hypothesized purpose:</strong> '+escapeHtml(purpose)+'</p>',
    sectionHtml,
    '<footer>Grove research · Originality, usefulness, accuracy and demand require independent review.</footer>',
    '</body></html>'
  ].join('\n');
  const markdown=[
    '# '+name,'','Grove internal worksheet draft · '+date,
    '', '**Category:** '+category,
    '**Suggested reader:** '+audience,
    '**Hypothesized purpose:** '+purpose,
    '**Source:** '+source,'','**'+caution+'**'
  ];
  for(const section of sections){
    markdown.push('','## '+section.heading,'',...section.items.map(i=>'- [ ] '+i));
  }
  markdown.push('','Verify originality, utility and accuracy before sharing or selling.');
  return {html,markdown:markdown.join('\n')+'\n',source};
}
