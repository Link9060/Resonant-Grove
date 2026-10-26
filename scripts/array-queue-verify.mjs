/**
 * Validate that a scheduled Builder job was authorized by the repo owner,
 * not merely requested by another GitHub Actions workflow or an issue bot.
 */
import { execFileSync } from 'node:child_process';

const OWNER='Link9060';
const REPO='Link9060/Resonant-Grove';
const has=(issue,label)=>Array.isArray(issue?.labels)&&issue.labels.some(l=>(typeof l==='string'?l:l?.name)===label);

export function verifyQueueAuthorization({issue,objective,mode}){
  if(!issue||issue.user?.login!==OWNER||issue.state!=='open'||
    !Number.isSafeInteger(issue.number)||issue.number<1||
    typeof issue.title!=='string'||!issue.title.startsWith('[ARRAY-QUEUE] ')||
    typeof issue.body!=='string'||issue.body!==objective||
    !has(issue,'array-ready')||!has(issue,'array-dispatched')||
    Buffer.byteLength(objective||'')>1200||(objective||'').trim().length<12)
    throw Error('Queue dispatch is not an exact, approved owner task.');
  if((mode==='code'&&has(issue,'array-code')&&!has(issue,'array-copy'))||
     (mode==='copy'&&has(issue,'array-copy')&&!has(issue,'array-code')))
    return true;
  throw Error('Queue dispatch mode does not match the approved issue mode.');
}

export function verifySupervisorDispatch({actor,issueNumber,objective,mode,loadIssue}){
  if(!issueNumber){
    if(actor==='github-actions[bot]')throw Error('GitHub bot cannot use an unapproved manual dispatch.');
    return false;
  }
  if(!/^[1-9]\d{0,7}$/.test(String(issueNumber)))throw Error('Invalid queue issue number.');
  const issue=loadIssue(Number(issueNumber));
  verifyQueueAuthorization({issue,objective,mode});
  return true;
}

function main(){
  const actor=process.env.ARRAY_TRIGGER_ACTOR||'';
  const number=process.env.ARRAY_SUPERVISOR_ISSUE||'';
  const objective=process.env.ARRAY_OBJECTIVE||'';
  const mode=process.env.ARRAY_MODE||'copy';
  const result=verifySupervisorDispatch({
    actor,issueNumber:number,objective,mode,
    loadIssue:n=>{
      if(process.env.GITHUB_REPOSITORY!==REPO)throw Error('Wrong repo.');
      const raw=execFileSync('gh',['api','repos/'+REPO+'/issues/'+n],{
        encoding:'utf8',timeout:15000,maxBuffer:400000,env:process.env
      });
      return JSON.parse(raw);
    }
  });
  console.log(result?'Owner-approved ARRAY Supervisor issue independently verified.':'Non-supervisor Builder dispatch validated by existing owner/event gate.');
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  try{main();}catch(e){console.error('ARRAY queue verification refused dispatch:',e.message);process.exitCode=1;}
}
