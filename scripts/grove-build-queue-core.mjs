/**
 * Grove approval queue policy: only exact owner-authored catalog batches.
 * Local browser shortlists are NOT approvals to build until owner submits a
 * Github issue with this bounded, public, unambiguous batch payload.
 */
import {CATALOG} from './grove-build-catalog.mjs';
const OWNER='Link9060';
const BOT='github-actions[bot]';
export const BATCH_TITLE='[GROVE-BATCH] Approved idea prototypes';
export const MARKER='GROVE-APPROVAL-BATCH-V1';
const hasLabel=(issue, label)=>Array.isArray(issue?.labels)&&
  issue.labels.some(x=>(typeof x==='string'?x:x?.name)===label);

export function batchBody(ids){
  if(!Array.isArray(ids)||!ids.length||ids.length>CATALOG.length||
     !ids.every(n=>Number.isInteger(n)&&n>=1&&n<=CATALOG.length)||
     new Set(ids).size!==ids.length)throw Error('Invalid catalog selection');
  const clean=[...ids].sort((a,b)=>a-b);
  return MARKER+'\nCatalog IDs: '+clean.join(',')+'\nInternal drafts only: YES';
}
export function parseBatch(issue){
  if(!issue||issue.pull_request||issue.state!=='open'||
    issue.user?.login!==OWNER||issue.title!==BATCH_TITLE||
    !Number.isSafeInteger(issue.number)||issue.number<1||
    typeof issue.body!=='string'||issue.body.length>250)return null;
  const m=issue.body.match(/^GROVE-APPROVAL-BATCH-V1\nCatalog IDs: (\d{1,2}(?:,\d{1,2}){0,11})\nInternal drafts only: YES$/);
  if(!m)return null;
  const ids=m[1].split(',').map(Number);
  try{if(batchBody(ids)!==issue.body)return null;}catch{return null;}
  return {number:issue.number,ids};
}
export function prototypeIssueTitle(batchNumber,ideaId){
  if(!Number.isSafeInteger(batchNumber)||batchNumber<1||
     !Number.isInteger(ideaId)||ideaId<1||ideaId>CATALOG.length)
    throw Error('Invalid prototype issue identity');
  return '[GROVE-PROTOTYPE] #'+batchNumber+' / '+ideaId;
}
export function selectPendingPrototype(issues){
  if(!Array.isArray(issues))throw Error('GitHub issue history unavailable');
  const batches=issues.map(parseBatch).filter(Boolean).sort((a,b)=>a.number-b.number);
  for(const batch of batches){
    for(const ideaId of batch.ids){
      const title=prototypeIssueTitle(batch.number,ideaId);
      const exists=issues.some(issue=>!issue?.pull_request&&issue?.title===title&&
        issue?.user?.login===BOT&&hasLabel(issue,'grove-prototype-draft'));
      if(!exists)return {batchNumber:batch.number,ideaId,idea:CATALOG[ideaId-1]};
    }
  }
  return null;
}
export function describePrototypeIssue(item,runId){
  if(!item||!Number.isSafeInteger(Number(runId))||Number(runId)<1||
     CATALOG[item.ideaId-1]!==item.idea)throw Error('Invalid prototype source');
  return [
    '# Grove · offline starter prototype', '',
    '**INTERNAL REVIEW ONLY. NOT LAUNCHED, NOT TESTED, NOT FOR SALE.**','',
    '**Idea:** '+item.idea.title,
    '**Requested in owner batch:** https://github.com/Link9060/Resonant-Grove/issues/'+item.batchNumber,
    '**Build run (download artifact ZIP):** https://github.com/Link9060/Resonant-Grove/actions/runs/'+runId,
    '**Output:** Local HTML draft plus a README, manifest, limited QA report and optional extra files.',
    '**Builder type:** Deterministic original template generator (NOT AI model output).','',
    '## Review gates','',
    '- [x] Generate one offline draft and a documented artifact.',
    '- [ ] Open the actual draft and check it functions correctly.',
    '- [ ] Independently verify content, formula behavior and originality.',
    '- [ ] Ask a willing tester for feedback and record actual observations.',
    '- [ ] Decide whether to revise or retire the idea.',
    '- [ ] Obtain separate authorization before public distribution or sales.','',
    '**Hard limits:** No posting to social media, unsolicited contact, payments, spending, API keys, automatic ARRAY dispatch, site deployment or revenue claims.',
    'Generated automatically from a previously submitted owner-approved catalog selection. The owner remains responsible for review.'
  ].join('\n');
}
