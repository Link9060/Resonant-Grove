/**
 * Trusted scheduled research worker. No model receives GitHub credentials.
 * A generated document is PUBLIC on GitHub and clearly labeled unverified.
 * The only write operation is creating one research issue per UTC calendar day.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import {renderPrintableWorksheet} from './grove-worksheet-export.mjs';
import {auditPrototype,preferRevisedPrototype,revisionPrompt,renderQaSummary,renderFeedbackWorksheet} from './grove-prototype-qa.mjs';
import {evaluateScoutSeed,renderSeedEvaluation,renderSeedPlan} from './grove-seed-evaluator.mjs';
import { dayKey, selectScoutTopic, scoutAlreadyRecorded, createScoutPrompt,
  validateScoutDraft, curatedFallback, makeScoutBrief, ISSUE_PREFIX } from './grove-scout-core.mjs';
import {prototypePrompt,validatePrototype,prototypeFallback,renderPrototype} from './grove-prototype.mjs';

const REPO='Link9060/Resonant-Grove';
const MODEL='qwen2.5:3b';
function api(path,method,payload){
  const args=['api','--header','Accept: application/vnd.github+json'];
  if(method)args.push('--method',method);
  args.push(path);
  const config={encoding:'utf8',timeout:20000,maxBuffer:1000000,env:process.env};
  if(payload!==undefined){args.push('--input','-');config.input=JSON.stringify(payload);}
  const result=execFileSync('gh',args,config).trim();
  return result?JSON.parse(result):null;
}
function note(message){
  process.stdout.write(message+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,message+'\n');
}
async function queryLocalModel(prompt){
  // Model setup is optional: scheduled research must still finish if it is unavailable.
  if(process.env.GROVE_MODEL_AVAILABLE==='false')throw Error('Local model unavailable; no model claims will be made');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),210000);
  try{
    const resp=await fetch('http://127.0.0.1:11434/api/generate',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({model:MODEL,prompt,stream:false,format:'json',
        options:{temperature:0.4,num_predict:1350}}),
      signal:controller.signal
    });
    if(!resp.ok)throw Error('Local model returned HTTP '+resp.status);
    const data=await resp.json();
    if(typeof data.response!=='string'||data.response.length>25000)throw Error('Invalid local model response');
    return data.response;
  }finally{clearTimeout(timer);}
}
export async function runScout(){
  if(process.env.GITHUB_REPOSITORY!==REPO)throw Error('Wrong GitHub repository.');
  const date=dayKey(new Date());
  const title=ISSUE_PREFIX+date;
  const history=api('repos/'+REPO+'/issues?state=all&per_page=100');
  if(!Array.isArray(history))throw Error('Could not load current GitHub issue history.');
  if(scoutAlreadyRecorded(history,date)){
    note('## Grove Opportunity Scout\nThe research journal entry for '+date+' already exists. No duplicate generated.');
    return {created:false,reason:'exists'};
  }
  const topic=selectScoutTopic(date);
  const dry=process.env.GROVE_SCOUT_DRY_RUN==='true';
  // On first push, prove GitHub access but do NOT incur any model time or write an issue.
  if(dry){
    note('## Grove Opportunity Scout / observe only\nReady to research: '+topic.name+
      '. No issue, product, marketing post, purchase or payout was created.');
    return {created:false,reason:'dry-run'};
  }
  let draft;
  try{
    draft=validateScoutDraft(await queryLocalModel(createScoutPrompt(topic)),topic);
    note('Local model generated three structurally validated, UNVERIFIED candidates.');
  }catch(e){
    note('Local model output unavailable or invalid: '+(e instanceof Error?e.message:'unknown')+'. Using explicitly labeled curated fallback.');
    draft=curatedFallback(topic);
  }
  const evaluation=evaluateScoutSeed(date,topic,draft);
  const selected=draft.ideas[evaluation.selectedCandidate-1];
  note('Ranked three unverified ideas on internal draft readiness; candidate '+evaluation.selectedCandidate+' selected.');
  let prototype;
  try {
    prototype=validatePrototype(await queryLocalModel(prototypePrompt(topic,selected)));
    note('Local model prepared a first original checklist draft for independent review.');
  } catch(e) {
    note('Original prototype generation invalid or unavailable: '+(e instanceof Error?e.message:'unknown')+'. Using a clearly labeled planning-template fallback.');
    prototype=prototypeFallback(selected);
  }
  // Quality evaluation only: it does not test real users or verify any facts.
  let qa=auditPrototype(topic,selected,prototype);
  if(qa.warningIds.length&&prototype.source==='local-model-unverified'&&process.env.GROVE_MODEL_AVAILABLE==='true'){
    try {
      const revised=validatePrototype(await queryLocalModel(revisionPrompt(topic,selected,prototype,qa)));
      const choice=preferRevisedPrototype(prototype,revised,topic,selected);
      prototype=choice.prototype;
      qa=choice.qa;
      note(choice.replaced?'One bounded local revision improved static checks.':'The original draft scored as well as the revision.');
    } catch(e) {
      note('Optional local revision was unavailable or invalid; keeping the original unverified draft.');
    }
  }
  note('Static prototype quality audit: '+qa.status+' ('+qa.readinessScore+'/'+qa.readinessMax+'). No facts or users verified.');
  const body=makeScoutBrief(date,topic,draft)+'\n\n'+
    renderSeedEvaluation(topic,draft,evaluation)+'\n\n'+
    renderPrototype(topic,selected,prototype)+'\n\n'+
    renderQaSummary(qa);
  // Turn the bounded prototype into review-only printable files. No site deploy,
  // commercial listing, customer contact or model-created executable code.
  const worksheet=renderPrintableWorksheet(date,topic,selected,prototype);
  const outputDir='grove-scout-artifact';
  mkdirSync(outputDir,{recursive:true});
  writeFileSync(outputDir+'/worksheet-draft.html',worksheet.html,'utf8');
  writeFileSync(outputDir+'/worksheet-draft.md',worksheet.markdown,'utf8');
  writeFileSync(outputDir+'/seed-evaluation.json',JSON.stringify(evaluation,null,2)+'\n','utf8');
  writeFileSync(outputDir+'/seed-plan.md',renderSeedPlan(date,topic,draft,evaluation),'utf8');
  writeFileSync(outputDir+'/prototype-quality-audit.json',JSON.stringify(qa,null,2)+'\n','utf8');
  writeFileSync(outputDir+'/evidence-and-feedback.md',renderFeedbackWorksheet(topic,selected,qa),'utf8');
  writeFileSync(outputDir+'/READ-ME-FIRST.txt',
    'GROVE INTERNAL RESEARCH DRAFT · '+date+'\n\n'+
    'Not reviewed for correctness, originality, customer demand or eligibility.\n'+
    'Not for sale, publication, bulk messaging or automatic distribution.\n'+
    'The HTML file is printable in a browser without internet access.\n'+
    'Research source: '+worksheet.source+'\n'+
    'Selected candidate: '+evaluation.selectedCandidate+' of 3\n'+
    'Draft readiness score: '+evaluation.selectedScore+'/12, not a market score\n'+
    'Static prototype quality: '+qa.status+', '+qa.readinessScore+'/'+qa.readinessMax+' limited checks\n'+
    'Human review is still required; no testers or market evidence have been verified.\n',
    'utf8');
  // Recheck after inference. A retry/race must not produce two issues.
  const again=api('repos/'+REPO+'/issues?state=all&per_page=100');
  if(!Array.isArray(again))throw Error('Could not recheck issue journal before publishing.');
  if(scoutAlreadyRecorded(again,date)){note('Another run already published this UTC day. Skipping.');return {created:false,reason:'race'};}
  const issue=api('repos/'+REPO+'/issues','POST',{title,body,labels:['grove-scout']});
  if(typeof issue?.html_url!=='string'||typeof issue?.number!=='number')throw Error('Github did not acknowledge the research journal issue.');
  note('### New research journal entry: '+issue.html_url+
    '\n- Research category: '+topic.name+
    '\n- Source: '+draft.source+
    '\n- Three candidate hypotheses, one internal Seed plan, one offline prototype and an automatic static QA report (not independently verified). No sales claims, spending, customer testing or external marketing.');
  return {created:true,url:issue.html_url};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  try{await runScout();}catch(e){console.error('Grove Scout:',e instanceof Error?e.message:String(e));process.exitCode=1;}
}
