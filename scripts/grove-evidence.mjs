/**
 * Owner-reported evidence receipt. Reads bounded GitHub issue fields, writes
 * one clearly unverified summary comment on the linked weekly Seed.
 * No contact details or arbitrary observation text is repeated.
 */
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {parseOwnerFeedback,validateSeedReference,receiptExists,renderReceipt} from './grove-evidence-core.mjs';
const REPO='Link9060/Resonant-Grove';
function api(path,method,input){
  const args=['api','--header','Accept: application/vnd.github+json'];
  if(method)args.push('--method',method);
  args.push(path);
  const options={encoding:'utf8',timeout:20000,maxBuffer:1500000,env:process.env};
  if(input!==undefined){args.push('--input','-');options.input=JSON.stringify(input);}
  const content=execFileSync('gh',args,options).trim();
  return content?JSON.parse(content):null;
}
function report(text){
  process.stdout.write(text+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,text+'\n');
}
export function runEvidence(){
  if(process.env.GITHUB_REPOSITORY!==REPO||process.env.GITHUB_EVENT_NAME!=='issues')
    throw Error('Evidence processor runs only for its trusted repository issue event');
  const number=Number(process.env.GROVE_FEEDBACK_NUMBER);
  if(!Number.isSafeInteger(number)||number<1)throw Error('Invalid originating report');
  const issue=api('repos/'+REPO+'/issues/'+number);
  if(!issue||issue.number!==number||issue.user?.login!=='Link9060')
    throw Error('Refusing non-owner evidence issue');
  const parsed=parseOwnerFeedback(issue);
  if(!parsed){
    report('This owner issue is not a well-formed Grove feedback submission. No Seed was changed.');
    return {created:false,reason:'invalid-format'};
  }
  const seed=api('repos/'+REPO+'/issues/'+parsed.seedIssueNumber);
  if(!validateSeedReference(seed,parsed)){
    report('The linked issue is not the expected bot-authored weekly Seed. No receipt written.');
    return {created:false,reason:'wrong-seed'};
  }
  const path='repos/'+REPO+'/issues/'+parsed.seedIssueNumber+'/comments?per_page=100';
  const existing=api(path);
  if(!Array.isArray(existing))throw Error('Cannot determine if evidence receipt already exists');
  if(receiptExists(existing,number)){
    report('This owner-reported observation was already linked. No duplicate created.');
    return {created:false,reason:'exists'};
  }
  const receipt=api('repos/'+REPO+'/issues/'+parsed.seedIssueNumber+'/comments','POST',{
    body:renderReceipt(parsed)
  });
  if(!Number.isSafeInteger(receipt?.id)||typeof receipt?.html_url!=='string')
    throw Error('GitHub did not confirm the evidence receipt');
  report('Recorded self-reported UNVERIFIED evidence receipt in the weekly Seed: '+receipt.html_url+
    '\nNo launch, verified customer result, spending, publication or other privileged action occurred.');
  return {created:true,url:receipt.html_url};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  try{runEvidence();}catch(e){console.error('Grove evidence:',e instanceof Error?e.message:String(e));process.exitCode=1;}
}
