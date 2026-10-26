/**
 * Trusted Grove prototype queue worker.
 * Prepare one owner-approved idea as downloadable offline files, then record
 * its review-only issue AFTER the artifact uploader succeeds.
 * No model executes issue text. No payments, sales or autonomous site changes.
 */
import {execFileSync} from 'node:child_process';
import {appendFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {CATALOG} from './grove-build-catalog.mjs';
import {parseBatch,selectPendingPrototype,prototypeIssueTitle,describePrototypeIssue}
  from './grove-build-queue-core.mjs';
import {buildOfflineFiles} from './grove-build-prototype.mjs';
const REPO='Link9060/Resonant-Grove';
const LABEL='grove-prototype-draft';
function gh(path,method,payload){
 const args=['api','--header','Accept: application/vnd.github+json'];
 if(method)args.push('--method',method);
 args.push(path);
 const opts={encoding:'utf8',timeout:25000,maxBuffer:2000000,env:process.env};
 if(payload!==undefined){args.push('--input','-');opts.input=JSON.stringify(payload);}
 const raw=execFileSync('gh',args,opts).trim();
 return raw?JSON.parse(raw):null;
}
function history(){
 // Conservatively refuse to operate when missing older items could lead to
 // repeat prototype issues. A paginated journal is a future scalability task.
 const issues=gh('repos/'+REPO+'/issues?state=all&per_page=100');
 if(!Array.isArray(issues)||issues.length>=100)
  throw Error('Issue history unavailable or has reached the first page: pause queue safely');
 return issues;
}
function note(s){
 process.stdout.write(s+'\n');
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,s+'\n');
}
function output(name,value){
 if(process.env.GITHUB_ENV)appendFileSync(process.env.GITHUB_ENV,name+'='+value+'\n');
}
function prepare(){
 const chosen=selectPendingPrototype(history());
 if(!chosen){note('## Grove Builder\nNo eligible unbuilt owner-submitted catalog idea found. Queue is idle.');return {status:'idle'};}
 if(process.env.GROVE_QUEUE_DRY_RUN==='true'){
  note('## Grove Builder / observe only\nNext: '+chosen.idea.title+
    ' from owner batch #'+chosen.batchNumber+'. No artifact or issue created.');
  return {status:'dry-run'};
 }
 const files=buildOfflineFiles(chosen.ideaId);
 const folder='grove-build-artifact';
 mkdirSync(folder,{recursive:true});
 for(const [name,body] of Object.entries(files))writeFileSync(folder+'/'+name,body,'utf8');
 writeFileSync(folder+'/build-request.json',JSON.stringify({
   batchNumber:chosen.batchNumber,ideaId:chosen.ideaId,
   catalogTitle:chosen.idea.title,stage:'internal-unverified-prototype'
 },null,2)+'\n','utf8');
 output('GROVE_QUEUE_READY','true');
 output('GROVE_QUEUE_SELECTED_BATCH',String(chosen.batchNumber));
 output('GROVE_QUEUE_SELECTED_ID',String(chosen.ideaId));
 note('### Prototype prepared: '+chosen.idea.title+
   '\n- Files: '+Object.keys(files).join(', ')+
   '\n- Next: upload internal draft files, then create an issue for review.'+
   '\n- Deterministic catalog template, NOT a generative AI model or launched venture.');
 return {status:'prepared',chosen};
}
function finalize(){
 if(process.env.GROVE_QUEUE_READY!=='true')throw Error('No verified prepared draft');
 const number=Number(process.env.GROVE_QUEUE_SELECTED_BATCH);
 const id=Number(process.env.GROVE_QUEUE_SELECTED_ID);
 const title=prototypeIssueTitle(number,id);
 // Revalidate owner approval immediately before making a public journal entry.
 const batch=gh('repos/'+REPO+'/issues/'+number);
 const parsed=parseBatch(batch);
 if(!parsed||!parsed.ids.includes(id))throw Error('Owner batch approval is missing or was withdrawn');
 if(history().some(x=>!x?.pull_request&&x.title===title&&
   x.user?.login==='github-actions[bot]'&&
   Array.isArray(x.labels)&&x.labels.some(l=>(typeof l==='string'?l:l?.name)===LABEL))){
   note('This prototype has already been recorded. No duplicate was created.');
   return {status:'already-recorded'};
 }
 const labels=gh('repos/'+REPO+'/labels?per_page=100');
 if(!Array.isArray(labels))throw Error('Cannot verify prototype label policy');
 if(!labels.some(x=>x?.name===LABEL))gh('repos/'+REPO+'/labels','POST',{
  name:LABEL,color:'6d9277',description:'Automated offline review-only prototype; not a public product'
 });
 const chosen={batchNumber:number,ideaId:id,idea:CATALOG[id-1]};
 const issue=gh('repos/'+REPO+'/issues','POST',{
  title,body:describePrototypeIssue(chosen,process.env.GITHUB_RUN_ID),labels:[LABEL]
 });
 if(typeof issue?.html_url!=='string'||!Number.isSafeInteger(issue?.number))
  throw Error('Could not confirm the generated prototype review issue');
 note('### Draft prototype journal: '+issue.html_url+
  '\nOwner batch: #'+number+
  '\nDownload build files from this Actions run. No customer, sale, external post or payment created.');
 return {status:'recorded',url:issue.html_url};
}
export function runQueue(mode){
 if(process.env.GITHUB_REPOSITORY!==REPO)throw Error('Wrong repository');
 if(mode==='prepare')return prepare();
 if(mode==='finalize')return finalize();
 throw Error('Choose prepare or finalize');
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{runQueue(process.argv[2]);}catch(e){console.error('Grove Builder:',e instanceof Error?e.message:String(e));process.exitCode=1;}
}
