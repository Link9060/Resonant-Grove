import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../grove-agent-desk.js',import.meta.url),'utf8');
const issue=(number,title,labels,body,user='github-actions[bot]')=>({
 number,title,body,labels:labels.map(name=>({name})),
 user:{login:user},created_at:'2026-10-28T12:00:00Z'
});
const fixtures=[
 issue(11,'[GROVE-SCOUT] 2026-10-28',['grove-scout'],
   '# Scout report\n**Scope:** Bike maintenance\n<script>window.hacked = true</script>\n- Candidate worksheet'),
 issue(12,'[GROVE-SEED] 2026-W44',['grove-seed-draft'],
   '**Selected concept:** Maintenance planner\n- [ ] Try it with a volunteer'),
 issue(13,'[GROVE-PROTOTYPE] #9 / 1',['grove-prototype-draft'],
   '**Idea:** Original bike checklist\n**Output:** offline draft'),
 issue(14,'[GROVE-PROTOTYPE] #9 / 2',['grove-prototype-draft'],
   '**Idea:** Forged record','other-user')
];

class Element{
 constructor(tag='div'){
   this.tagName=tag;this.children=[];this.handlers=new Map();this.attributes={};
   this.dataset={};this.value='';this.textContent='';this.className='';
   this.classList={toggle:()=>{},add:()=>{}};
 }
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 addEventListener(type,cb){this.handlers.set(type,cb);}
 setAttribute(name,value){this.attributes[name]=value;}
 querySelector(selector){if(selector==='.desk-tab-count')return this.counter;return null;}
 querySelectorAll(){return [];}
 focus(){}
 scrollIntoView(){}
}
function walk(el){
 return [el,...el.children.flatMap(walk)];
}
function setup(){
 const dom=new Map();
 for(const id of ['groveAgentDesk','deskStatus','deskResearchCount','deskPlanCount','deskPrototypeCount',
  'deskNeedsReview','deskRefresh','deskSearch','deskItems','deskDetail','deskOpenWorkbench','groveAdvanced']){
   dom.set(id,new Element());
 }
 const root=dom.get('groveAgentDesk');
 const tabs=['all','research','plans','prototypes'].map(key=>{
   const tab=new Element('button');tab.dataset.deskTab=key;tab.counter=new Element('span');return tab;
 });
 const tablist=new Element();
 root.querySelectorAll=selector=>selector==='[data-desk-tab]'?tabs:[];
 root.querySelector=selector=>selector==='[role=tablist]'?tablist:
   tabs.find(t=>selector==='[data-desk-tab="'+t.dataset.deskTab+'"]')||null;
 let writes=0,requested='';
 const localStorage={getItem:()=>null,setItem:()=>{writes++;}};
 const context={
  document:{
    getElementById:id=>dom.get(id)||null,
    createElement:tag=>new Element(tag)
  },
  localStorage,
  AbortController,Date,JSON,Number,String,Array,Set,Error,Promise,
  setTimeout,clearTimeout,
  fetch:async (url,options)=>{
   requested=url;
   assert.equal(options.credentials,'omit');
   return {ok:true,json:async()=>fixtures};
  }
 };
 return {dom,root,context,walk,tabs,get writes(){return writes;},get requested(){return requested;}};
}
test('renders trusted-origin journal and untrusted body as literal text',async()=>{
 const env=setup();
 vm.runInNewContext(source,env.context,{filename:'grove-agent-desk.js'});
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.match(env.requested,/api\.github\.com/);
 assert.equal(env.dom.get('deskResearchCount').textContent,'1');
 assert.equal(env.dom.get('deskPlanCount').textContent,'1');
 assert.equal(env.dom.get('deskPrototypeCount').textContent,'1');
 assert.equal(env.dom.get('deskNeedsReview').textContent,'2');
 assert.equal(env.dom.get('deskItems').children.length,3);
 const texts=env.walk(env.dom.get('deskDetail')).map(e=>e.textContent);
 assert.ok(texts.some(t=>t.includes('Bike maintenance')));
 assert.equal(env.writes,0);
 const research=env.dom.get('deskItems').children.find(e=>e.dataset.deskIssue==='11');
 const click=env.root.handlers.get('click');
 click({target:{closest:selector=>selector==='[data-desk-issue]'?research:null}});
 const report=env.walk(env.dom.get('deskDetail')).map(e=>e.textContent);
 assert.ok(report.some(t=>t.includes('<script>window.hacked = true</script>')));
 assert.equal(env.context.window?.hacked,undefined);
});
test('review notes save locally only and never trigger a remote write',async()=>{
 const env=setup();
 vm.runInNewContext(source,env.context);
 await new Promise(resolve=>setTimeout(resolve,15));
 const input=env.dom.get('deskDetail').children.at(-1).children.find(x=>x.id==='deskReviewNote');
 // The dynamic input has an id property and is not registered in getElementById by our tiny DOM.
 // Register it to emulate the browser's standard ID lookup.
 env.dom.set('deskReviewNote',input);
 env.dom.set('deskNoteFeedback',env.dom.get('deskDetail').children.at(-1).children.at(-1));
 input.value='Check geometry accuracy with a tester.';
 env.root.handlers.get('click')({target:{closest:selector=>selector==='[data-desk-save]'?{dataset:{deskSave:'11'}}:null}});
 assert.equal(env.writes,1);
});
