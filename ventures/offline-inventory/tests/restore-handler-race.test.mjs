// P2-UI-022 automated handler-level race regression. No browser acceptance claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start="document.querySelector('#import-json').addEventListener('change',async event=>{";
const end="document.querySelector('#export-csv').addEventListener";
const a=html.indexOf(start), b=html.indexOf(end,a);
assert.ok(a>=0 && b>a,'restore handler must exist');

function deferred(){
 let resolve,reject;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
function harness(){
 const handlers=[];
 const input={files:[],value:'',addEventListener:(name,fn)=>{assert.equal(name,'change');handlers.push(fn);}};
 const message={textContent:''};
 const search={value:'',focus(){}};
 const nodes={'#import-json':input,'#message':message,'#search':search};
 let confirms=0, renders=0, allowRestore=true;
 const context={
  document:{querySelector:selector=>{assert.ok(nodes[selector],selector);return nodes[selector];}},
  message,
  worksheet:{items:[{id:'initial'}]},
  restoreSelectionVersion:0,
  fromJson:JSON.parse,
  confirm:()=>{confirms++;return allowRestore;},
  render:()=>{renders++;}
 };
 runInNewContext(html.slice(a,b),context);
 return {
  context,input,message,
  setConfirm(value){allowRestore=value;},
  get confirms(){return confirms;},
  get renders(){return renders;},
  select(file){
   input.files=[file];input.value=file.name;
   return handlers[0]({target:input});
  }
 };
}
function backup(name,d){return {name,size:20,text:()=>d.promise};}
test('P2-UI-022 newer successful restore ignores older late resolution',async()=>{
 const h=harness(),a=deferred(),b=deferred();
 const pendingA=h.select(backup('A.json',a));
 const pendingB=h.select(backup('B.json',b));
 b.resolve('{"id":"B"}');await pendingB;
 assert.equal(h.context.worksheet.id,'B');
 assert.equal(h.confirms,1);
 const status=h.message.textContent;
 a.resolve('{"id":"A"}');await pendingA;
 assert.equal(h.context.worksheet.id,'B');
 assert.equal(h.confirms,1);
 assert.equal(h.message.textContent,status);
 assert.equal(h.renders,1);
});
test('P2-UI-022 older rejection cannot overwrite newer success',async()=>{
 const h=harness(),a=deferred(),b=deferred();
 const pendingA=h.select(backup('A.json',a));
 const pendingB=h.select(backup('B.json',b));
 b.resolve('{"id":"B"}');await pendingB;
 const status=h.message.textContent;
 a.reject(Error('old read failed'));await pendingA;
 assert.equal(h.message.textContent,status);
 assert.equal(h.context.worksheet.id,'B');
 assert.equal(h.confirms,1);
});
test('P2-UI-020 older completion before newer does not clear input',async()=>{
 const h=harness(),a=deferred(),b=deferred();
 const pendingA=h.select(backup('A.json',a));
 const pendingB=h.select(backup('B.json',b));
 a.resolve('{"id":"A"}');await pendingA;
 assert.equal(h.input.value,'B.json');
 assert.equal(h.confirms,0);
 b.resolve('{"id":"B"}');await pendingB;
 assert.equal(h.context.worksheet.id,'B');
 assert.equal(h.confirms,1);
});

test('P2-UI-022 newer canceled restore still supersedes an older pending read',async()=>{
 const h=harness(),a=deferred(),b=deferred();
 const pendingA=h.select(backup('A.json',a));
 const pendingB=h.select(backup('B.json',b));
 h.setConfirm(false);
 b.resolve('{"id":"B"}');await pendingB;
 assert.equal(h.context.worksheet.items[0].id,'initial');
 assert.equal(h.confirms,1);
 const status=h.message.textContent;
 assert.match(status,/canceled/);
 a.resolve('{"id":"A"}');await pendingA;
 assert.equal(h.context.worksheet.items[0].id,'initial');
 assert.equal(h.confirms,1);
 assert.equal(h.message.textContent,status);
 assert.equal(h.renders,0);
});

test('P2-UI-022 newer invalid backup error survives older late success',async()=>{
 const h=harness(),a=deferred(),b=deferred();
 const pendingA=h.select(backup('A.json',a));
 const pendingB=h.select(backup('invalid-B.json',b));
 b.resolve('{not valid JSON');await pendingB;
 const status=h.message.textContent;
 assert.match(status,/JSON restore failed:/);
 assert.equal(h.confirms,0);
 assert.equal(h.context.worksheet.items[0].id,'initial');
 a.resolve('{"id":"A"}');await pendingA;
 assert.equal(h.message.textContent,status);
 assert.equal(h.confirms,0);
 assert.equal(h.renders,0);
 assert.equal(h.context.worksheet.items[0].id,'initial');
});

test('P2-UI-021 stale rejected read does not clear newer pending selection',async()=>{
 const h=harness(),a=deferred(),b=deferred();
 const pendingA=h.select(backup('A.json',a));
 const pendingB=h.select(backup('B.json',b));
 a.reject(Error('stale file read failed'));await pendingA;
 assert.equal(h.input.value,'B.json');
 assert.equal(h.message.textContent,'');
 assert.equal(h.confirms,0);
 b.resolve('{"id":"B"}');await pendingB;
 assert.equal(h.context.worksheet.id,'B');
 assert.equal(h.confirms,1);
 assert.equal(h.input.value,'');
});

test('P2-UI-022 newer oversized backup error supersedes older pending restore',async()=>{
 const h=harness(),a=deferred();
 const pendingA=h.select(backup('A.json',a));
 const pendingB=h.select({name:'oversized-B.json',size:65537,text:()=>{throw Error('oversized file must not be read');}});
 await pendingB;
 const status=h.message.textContent;
 assert.match(status,/exceeds 64 KiB/);
 assert.equal(h.confirms,0);
 assert.equal(h.input.value,'');
 a.resolve('{"id":"A"}');await pendingA;
 assert.equal(h.message.textContent,status);
 assert.equal(h.context.worksheet.items[0].id,'initial');
 assert.equal(h.confirms,0);
 assert.equal(h.renders,0);
});
