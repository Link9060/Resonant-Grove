/**
 * One internal weekly Seed issue from recent Scout scorecards. No model receives
 * credentials; no external selling, publishing, spending or ARRAY dispatch.
 */
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {weekKey,alreadyHasWeeklySeed,selectWeeklySeed,renderWeeklySeedIssue} from './grove-seed-keeper-core.mjs';

const REPO='Link9060/Resonant-Grove';
function gh(path,method,input){
  const args=['api','--header','Accept: application/vnd.github+json'];
  if(method)args.push('--method',method);
  args.push(path);
  const opts={encoding:'utf8',timeout:20000,maxBuffer:1500000,env:process.env};
  if(input!==undefined){args.push('--input','-');opts.input=JSON.stringify(input);}
  const result=execFileSync('gh',args,opts).trim();
  return result?JSON.parse(result):null;
}
function note(message){
  process.stdout.write(message+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,message+'\n');
}
export function runKeeper(){
  if(process.env.GITHUB_REPOSITORY!==REPO)throw Error('Unexpected repository');
  const now=new Date(),week=weekKey(now);
  const issues=gh('repos/'+REPO+'/issues?state=all&per_page=100');
  if(!Array.isArray(issues))throw Error('Could not read issue history, do not assume empty');
  if(alreadyHasWeeklySeed(issues,week)){
    note('## Grove Seed Keeper\nA plan for '+week+' is already recorded. No duplicate.');
    return {created:false,reason:'exists'};
  }
  const best=selectWeeklySeed(issues,now);
  if(!best){
    note('## Grove Seed Keeper\nNo eligible bot-authored, recently scored Scout research exists. Nothing to seed.');
    return {created:false,reason:'no-research'};
  }
  if(process.env.GROVE_SEED_DRY_RUN==='true'){
    note('## Grove Seed Keeper / observe only\nCandidate from Scout issue #'+best.issueNumber+
      ' could become the internal '+week+' Seed. No issue was created or model used.');
    return {created:false,reason:'dry-run'};
  }
  const labels=gh('repos/'+REPO+'/labels?per_page=100');
  if(!Array.isArray(labels))throw Error('Could not inspect labels');
  if(!labels.some(l=>l?.name==='grove-seed-draft')){
    gh('repos/'+REPO+'/labels','POST',{
      name:'grove-seed-draft',color:'738b71',
      description:'Unverified internal Seed evaluation awaiting human evidence; never a Builder instruction'
    });
  }
  // A second GET avoids ordinary run retries duplicating an issue.
  const recheck=gh('repos/'+REPO+'/issues?state=all&per_page=100');
  if(!Array.isArray(recheck))throw Error('Could not recheck weekly issue history');
  if(alreadyHasWeeklySeed(recheck,week)){
    note('Another run created the weekly plan while this run was checking. Skipping.');
    return {created:false,reason:'race'};
  }
  const created=gh('repos/'+REPO+'/issues','POST',{
    title:'[GROVE-SEED] '+week,
    body:renderWeeklySeedIssue(week,best),
    labels:['grove-seed-draft']
  });
  if(typeof created?.html_url!=='string'||!Number.isSafeInteger(created?.number))
    throw Error('GitHub did not acknowledge weekly Seed issue');
  note('### New internal Seed plan '+created.html_url+'\n'+
    '- Source: '+best.sourceUrl+'\n'+
    '- Internal readiness: '+best.draftReadiness+'/12, unverified\n'+
    '- No sale, spend, promotion, outward message, Builder dispatch or payout.');
  return {created:true,url:created.html_url,source:best.sourceUrl};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  try{runKeeper();}catch(e){console.error('Grove Seed Keeper:',e instanceof Error?e.message:String(e));process.exitCode=1;}
}
