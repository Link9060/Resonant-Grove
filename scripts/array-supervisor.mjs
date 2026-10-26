/**
 * Trusted GitHub Actions heartbeat. Runs on main with a scoped GitHub token.
 * Writes to GitHub only for explicitly owner-approved queue issues.
 * No model, paid key, browser/session automation, or untrusted code execution.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { decideSupervisor } from './array-supervisor-core.mjs';

const REPO='Link9060/Resonant-Grove';
if(process.env.GITHUB_REPOSITORY!==REPO)throw Error('Unexpected repository.');
const gh=(path,method,input)=>{
  const args=['api','--header','Accept: application/vnd.github+json'];
  if(method)args.push('--method',method);
  args.push(path);
  const opts={encoding:'utf8',timeout:20000,maxBuffer:3000000,env:process.env};
  if(input!==undefined){args.push('--input','-');opts.input=JSON.stringify(input);}
  const raw=execFileSync('gh',args,opts).trim();
  return raw?JSON.parse(raw):null;
};
function summary(lines){
  const text=lines.join('\n')+'\n';
  process.stdout.write(text);
  if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,text);
}
export function run(){
  // Provision labels idempotently from trusted main; GitHub does not permit
  // attaching labels that have never been created.
  const labels=gh('repos/'+REPO+'/labels?per_page=100')||[];
  if(!Array.isArray(labels))throw Error('GitHub labels API returned malformed data.');
  const needed=[
    ['array-ready','User-approved for one bounded supervisor dispatch','70ab76'],
    ['array-dispatched','Already launched by the scheduled supervisor','8d9aa2'],
    ['array-copy','Bounded copy-editor mission','7288d5'],
    ['array-code','Bounded code-worker mission','bd9e70'],
  ];
  for(const [name,description,color] of needed){
    if(!labels.some(l=>l?.name===name)){
      gh('repos/'+REPO+'/labels','POST',{name,description,color});
      console.log('ARRAY Supervisor registered GitHub label: '+name);
    }
  }
  const issues=gh('repos/'+REPO+'/issues?state=open&per_page=100')||[];
  const pulls=gh('repos/'+REPO+'/pulls?state=open&per_page=100')||[];
  const data=gh('repos/'+REPO+'/actions/workflows/array-builder.yml/runs?per_page=30');
  if(!Array.isArray(data?.workflow_runs))throw Error('Could not read Builder run history.');
  const enabled=process.env.ARRAY_DISPATCH_ENABLED==='true';
  const decision=decideSupervisor({issues,pulls,runs:data.workflow_runs,enabled});
  const lines=[
    '## ARRAY Supervisor / 15-minute heartbeat',
    '',
    '- Mode: '+(enabled?'owner-approved mission dispatch':'observe only'),
    '- Active Builder runs: '+(decision.active.join(', ')||'none'),
    '- Potentially stalled runs (60+ min): '+(decision.stalled.join(', ')||'none'),
    '- Draft/open Builder PRs awaiting review: '+(decision.reviewPrs.join(', ')||'none'),
    '- Owner-approved queue issues: '+(decision.ready.join(', ')||'none'),
    '- Builder runs in past 24 hours: '+decision.runs24h,
    '- Decision: **'+decision.reason+'**',
  ];
  if(decision.action!=='dispatch'){summary(lines);return decision;}
  const task=decision.dispatch;
  // Put a durable marker FIRST; this prevents the next heartbeat from
  // duplicating a task if a dispatch request fails in an ambiguous way.
  gh('repos/'+REPO+'/issues/'+task.number+'/labels','POST',{labels:['array-dispatched']});
  try{
    gh('repos/'+REPO+'/actions/workflows/array-builder.yml/dispatches','POST',{
      ref:'main',inputs:{objective:task.objective,mode:task.mode,supervisor_issue:String(task.number)},
    });
    lines.push('- Dispatched issue #'+task.number+' to ARRAY Builder in '+task.mode+' mode.');
    lines.push('- Follow-up: Builder and Auditor handle the draft PR. No automatic GPT subscription request or unrestricted merge.');
  }catch(error){
    // Preserve the marker on an uncertain result to avoid accidental repeats.
    // Owner can inspect and remove array-dispatched to retry intentionally.
    lines.push('- Dispatch may have failed after issue #'+task.number+' was marked. Inspect the Actions tab before re-queuing.');
    summary(lines);
    throw error;
  }
  summary(lines);
  return decision;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  try{run();}catch(error){
    console.error('ARRAY Supervisor:',error instanceof Error?error.message:String(error));
    process.exitCode=1;
  }
}
