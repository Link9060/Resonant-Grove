/**
 * Creates one original, offline printable starter from a tightly bounded catalog.
 * No generated text is executed. No networking, sales, payment or publication.
 */
import {CATALOG} from './grove-build-catalog.mjs';
const escapeHtml=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const styles=[
 '*{box-sizing:border-box}body{font-family:system-ui,Arial,sans-serif;color:#233c2e;max-width:960px;margin:32px auto;padding:32px;background:#fff;border:1px solid #d8e4da;border-radius:16px}',
 'h1{letter-spacing:-.04em;font-size:2rem}h2{font-size:1.1rem;color:#275b3d}.sub{color:#66796a}',
 '.notice{padding:14px 17px;background:#f1f6ec;border-left:4px solid #5b9162;margin:22px 0}',
 '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:15px}',
 '.panel{padding:17px;border:1px solid #d5e2d7;border-radius:11px;break-inside:avoid}',
 '.task{display:flex;gap:8px;align-items:start;margin:15px 0;font-size:.92rem;line-height:1.5}',
 'input[type=checkbox]{accent-color:#217043;margin-top:4px}.write{min-height:25px;border-bottom:1px dashed #abbcaf;margin:8px 0 13px;display:block}',
 'table{width:100%;border-collapse:collapse}td,th{padding:9px;border:1px solid #b9caba;text-align:left}th{background:#eef4ee}',
 'input[type=number]{width:100%;padding:9px;border:1px solid #a8baa8;border-radius:6px}',
 'button{padding:9px 16px;border:0;border-radius:7px;background:#285e43;color:#fff;cursor:pointer}',
 '@media print{body{border:0;margin:0;max-width:none;padding:0}button{display:none}.panel{break-inside:avoid}}',
 '@media(max-width:600px){body{margin:0;border:0;padding:17px}}'
].join('\n');
function customPart(idea){
 if(idea.type==='inventory'){
  return '<section class="panel"><h2>Stock-count workspace</h2><table><thead><tr><th>Item ID</th><th>Name</th><th>Quantity</th><th>Restock at</th></tr></thead><tbody>'+
    Array.from({length:6},()=>'<tr>'+Array.from({length:4},()=>'<td><span class="write"></span></td>').join('')+'</tr>').join('')+
    '</tbody></table><p>The downloadable CSV contains editable column headers.</p></section>';
 }
 if(idea.type==='yard-calculator'){
  const js=[
   '(()=>{"use strict";const get=id=>document.getElementById(id);',
   'const run=()=>{const nums=["length","width","depth"].map(id=>Number(get(id).value));',
   'if(nums.some(x=>!Number.isFinite(x)||x<=0||x>100000)||nums[2]>120){get("result").textContent="Enter positive, reasonable measurements.";return;}',
   'const cubicFeet=nums[0]*nums[1]*nums[2]/12;',
   'get("result").textContent=cubicFeet.toFixed(2)+" cubic feet ≈ "+(cubicFeet/27).toFixed(3)+" cubic yards. Confirm actual ordering quantities with a supplier.";};',
   'get("calc").addEventListener("click",run);run();})();'
  ].join('');
  return '<section class="panel"><h2>Interactive rectangular area estimate</h2><p>Enter actual measured feet and inches. Compaction and irregular shape adjustments are NOT included.</p>'+
   '<div class="grid"><label>Length (feet)<input id="length" type="number" min="0" step="any" value="12"></label>'+
   '<label>Width (feet)<input id="width" type="number" min="0" step="any" value="6"></label>'+
   '<label>Depth (inches)<input id="depth" type="number" min="0" step="any" value="3"></label></div>'+
   '<p><button type="button" id="calc">Calculate volume</button></p><output id="result" role="status"></output><script>'+js+'</script></section>';
 }
 if(idea.type==='labels'){
  return '<section class="panel"><h2>Printable example labels</h2><div class="grid">'+
   ['Tools','Cables','Documents','Supplies','Spare parts','Seasonal','Crafts','Other'].map(x=>
    '<div style="border:2px solid #42694d;border-radius:9px;min-height:70px;padding:18px;text-align:center;font-weight:700">'+escapeHtml(x)+'</div>').join('')+
   '</div><p>Test scale and readability before printing a full batch.</p></section>';
 }
 if(idea.type==='cad'){
  return '<section class="panel"><h2>Learning sketches in millimeters</h2>'+
   '<svg viewBox="0 0 520 160" role="img" aria-label="Rectangular plate with centered hole and example L sketch" style="max-width:100%">'+
   '<rect x="45" y="24" width="160" height="96" fill="#e5eee4" stroke="#255f3a" stroke-width="3"/>'+
   '<circle cx="125" cy="72" r="24" fill="#fff" stroke="#255f3a" stroke-width="3"/>'+
   '<path d="M310 24 H390 V55 H344 V120 H310 Z" fill="#e5eee4" stroke="#255f3a" stroke-width="3"/>'+
   '<text x="45" y="144" font-size="12">Plate 80×48, hole Ø24</text><text x="300" y="144" font-size="12">Practice L sketch</text></svg>'+
   '<p>Practice dimensions are not a load rating or a verified manufacturing design.</p></section>';
 }
 if(idea.type==='changelog'){
  return '<section class="panel"><h2>Release-notes worksheet</h2>'+
   ['Version number','Release date','Added','Changed','Fixed','Known limitations'].map(x=>'<label><strong>'+escapeHtml(x)+'</strong><span class="write"></span></label>').join('')+'</section>';
 }
 return '<section class="panel"><h2>Session details</h2>'+
  ['Date or time frame','Project or focus','What was actually completed','Next revision'].map(x=>'<label><strong>'+escapeHtml(x)+'</strong><span class="write"></span></label>').join('')+'</section>';
}
export function buildOfflineFiles(ideaId){
 if(!Number.isInteger(ideaId)||ideaId<1||ideaId>CATALOG.length)throw Error('Invalid catalog ID');
 const idea=CATALOG[ideaId-1];
 if(idea.sections.length!==3||idea.sections.some(s=>s.length!==4||s.some(x=>typeof x!=='string'||x.length<12)))throw Error('Invalid recipe');
 const sections=idea.sections.map(([heading,...items])=>
  '<section class="panel"><h2>'+escapeHtml(heading)+'</h2>'+
  items.map(x=>'<label class="task"><input type="checkbox"><span>'+escapeHtml(x)+'</span></label>').join('')+'</section>'
 ).join('');
 const html=[
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>'+escapeHtml(idea.title)+' · Grove draft</title><style>'+styles+'</style></head><body>',
  '<header><small>GROVE · STARTER '+String(ideaId).padStart(2,'0')+'</small><h1>'+escapeHtml(idea.title)+'</h1>',
  '<p class="sub">A printable, original working template for '+escapeHtml(idea.audience)+'. Usable offline.</p></header>',
  '<div class="notice"><strong>Unverified internal draft.</strong> Not reviewed for accuracy, originality, usefulness, demand or suitability for sale.</div>',
  customPart(idea),'<main class="grid">'+sections+'</main>',
  '<p class="sub">Review independently, including negative feedback, before any public distribution.</p></body></html>'
 ].join('\n');
 const readme=[
  '# Grove · '+idea.title,'',
  '**Internal-only prototype. Deterministic templates, NOT generated by an AI model.**','',
  'Open prototype.html in a browser to use or print this starter resource. No external accounts, downloads or network calls are required.',
  'Audience hypothesis: '+idea.audience,'',
  '## Before release','',
  '- [ ] Check all content independently for correctness and originality.',
  '- [ ] Test the file without internet access; check printing, layout, accessibility and any calculations.',
  '- [ ] Obtain and accurately document any real, voluntary and privacy-safe feedback.',
  '- [ ] Revise or retire when checks fail.',
  '- [ ] Request separate authorization for any public, commercial, messaging or financial action.','',
  'This draft is not an actual sale, verified demand, customer test, published offering or an AI-model result.'
 ].join('\n')+'\n';
 const manifest={version:1,catalogId:ideaId,title:idea.title,kind:idea.type,
   stage:'internal-draft',generator:'deterministic-template-not-AI',
   verified:{demand:false,accuracy:false,originality:false,customers:false,earnings:false},
   permissions:{spending:false,publicPosting:false,outreach:false,payments:false,payouts:false,autoBuilderDispatch:false}};
 const qa={version:1,status:'needs-human-review',preflightChecks:{
   completeCatalogRecipe:idea.sections.length===3,
   nineBoundedPrompts:idea.sections.every(s=>s.length===4),
   selfContainedHTML:html.includes('<!doctype html>')&&!/src=["']https?:|href=["']https?:/i.test(html),
   honestDisclosure:html.includes('Unverified internal draft.')},
   humanVerified:false,originalityVerified:false,accuracyVerified:false,realTestPerformed:false};
 const files={'prototype.html':html,'README.md':readme,
   'manifest.json':JSON.stringify(manifest,null,2)+'\n',
   'quality-report.json':JSON.stringify(qa,null,2)+'\n'};
 if(idea.type==='inventory')files['inventory-blank.csv']='Item ID,Item name,Count,Restock threshold,Last counted,Notes\n';
 if(idea.type==='changelog')files['CHANGELOG-DRAFT.md']='# Changelog\n\n## [Unreleased]\n\n### Added\n- Record actual features here.\n\n### Changed\n- Record actual changes here.\n\n### Fixed\n- Record verified fixes here.\n\n### Known limitations\n- Record unresolved issues here.\n';
 if(idea.type==='cad')files['CAD-practice-dimensions.txt']='UNVERIFIED PRACTICE DIMENSIONS, NOT A STRUCTURAL DESIGN\nPlate: 80 mm × 48 mm, centered hole Ø24 mm.\nL bracket: illustrative shape; determine and constrain actual dimensions yourself.\n';
 return files;
}
