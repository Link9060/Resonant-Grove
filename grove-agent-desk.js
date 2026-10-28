/* Agent Desk: read-only public journals in Grove. Never executes source HTML. */
(() => {
'use strict';
const root=document.getElementById('groveAgentDesk');
if(!root)return;
const $=id=>document.getElementById(id);
const API='https://api.github.com/repos/Link9060/Resonant-Grove/issues?state=all&sort=updated&direction=desc&per_page=100';
const NOTE_KEY='grove-agent-desk-notes-v1';
const TYPES=['all','research','plans','prototypes'];
const LABELS={research:'Research',plans:'Seed plan',prototypes:'Prototype'};
const NEXT={research:'Review these hypotheses and verify claims before acting.',plans:'Run the suggested test and collect genuine voluntary feedback.',prototypes:'Test the offline files and check accuracy before any distribution.'};
let items=[],tab='all',selected=null,loaded=false,busy=false,notes={};
try {const value=JSON.parse(localStorage.getItem(NOTE_KEY)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))notes=value;}catch{}
const node=(tag,cls,value)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(value!==undefined)el.textContent=String(value);
 return el;
};
const hasLabel=(item,label)=>Array.isArray(item.labels)&&item.labels.some(x=>(typeof x==='string'?x:x?.name)===label);
function type(item){
 if(item?.user?.login!=='github-actions[bot]'||!Number.isSafeInteger(item.number)||item.number<1||item.pull_request)return null;
 const title=item.title||'';
 if(hasLabel(item,'grove-scout')&&/^\[GROVE-SCOUT\] \d{4}-\d{2}-\d{2}$/.test(title))return 'research';
 if(hasLabel(item,'grove-seed-draft')&&/^\[GROVE-SEED\] \d{4}-W\d{2}$/.test(title))return 'plans';
 if(hasLabel(item,'grove-prototype-draft')&&/^\[GROVE-PROTOTYPE\] #\d+ \/ (?:[1-9]|1[0-2])$/.test(title))return 'prototypes';
 return null;
}
function field(body,key){
 const prefix='**'+key+':**';
 const line=String(body||'').split(/\r?\n/).find(s=>s.trim().toLowerCase().startsWith(prefix.toLowerCase()));
 return line?line.trim().slice(prefix.length).trim().slice(0,140):'';
}
function heading(item){
 if(item.kind==='prototypes')return field(item.body,'Idea')||'Offline prototype #'+item.number;
 if(item.kind==='plans')return field(item.body,'Selected concept')||item.title.replace('[GROVE-SEED] ','Weekly Seed ');
 return field(item.body,'Scope')||item.title.replace('[GROVE-SCOUT] ','Research · ');
}
function date(value){
 const parsed=new Date(value);
 return Number.isNaN(parsed.getTime())?'Undated':parsed.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
}
const statusLabel=item=>item.kind==='research'?'Unverified research':item.kind==='plans'?'Needs evidence':'Draft · needs review';
function status(message,error=false){
 $('deskStatus').textContent=message;
 $('deskStatus').classList.toggle('desk-error',error);
}
function report(body,target){
 target.replaceChildren();
 const source=String(body||'');
 let seen=0;
 for(const raw of source.slice(0,25000).split(/\r?\n/)){
  if(seen>=220)break;
  const line=raw.trim();
  if(!line||/^\|[\s:|-]+\|?$/.test(line))continue;
  let cls='desk-report-line',text=line;
  if(/^#{1,4}\s/.test(line)){cls='desk-report-heading';text=line.replace(/^#{1,4}\s+/,'');}
  else if(/^[-*]\s+\[[ xX]\]\s/.test(line)){cls='desk-report-check';text=(/\[[xX]\]/.test(line)?'☑ ':'☐ ')+line.replace(/^[-*]\s+\[[ xX]\]\s+/,'');}
  else if(/^[-*]\s/.test(line)){cls='desk-report-bullet';text='• '+line.replace(/^[-*]\s+/,'');}
  else if(/^\|/.test(line))cls='desk-report-table';
  text=text.replace(/\*\*/g,'').replace(/\x60/g,'');
  target.append(node(cls==='desk-report-heading'?'h4':'p',cls,text));
  seen++;
 }
 if(!seen)target.append(node('p','desk-empty','No report text was provided.'));
 if(source.length>25000)target.append(node('p','desk-report-line','Long report shortened. See the source archive for the remainder.'));
}
function details(){
 const panel=$('deskDetail');panel.replaceChildren();
 const item=items.find(i=>i.number===selected);
 if(!item){panel.append(node('p','desk-empty',loaded?'Choose a report to see the full text here.':'Loading recent reports…'));return;}
 const meta=node('div','desk-detail-meta');
 meta.append(node('span','desk-detail-tag',LABELS[item.kind]+' / #'+item.number),node('span','desk-detail-date',date(item.created_at)));
 panel.append(meta,node('h3','desk-detail-title',heading(item)),node('p','desk-detail-description',statusLabel(item)+'. Not evidence of earnings, demand, deployment, or approval.'));
 const next=node('div','desk-next');next.append(node('strong','', 'Next useful step'),node('p','',NEXT[item.kind]));panel.append(next);
 const reader=node('section','desk-report');
 reader.append(node('span','desk-report-label','FULL JOURNAL ENTRY'));
 const text=node('div','desk-report-content');report(item.body,text);reader.append(text);panel.append(reader);
 const link=node('a','desk-source-link','View source or download archive ↗');
 link.href='https://github.com/Link9060/Resonant-Grove/issues/'+item.number;
 link.rel='noopener noreferrer';link.target='_blank';panel.append(link);
 const notesBox=node('section','desk-note');
 const label=node('label','desk-note-title','My review note (this device only)');
 label.htmlFor='deskReviewNote';notesBox.append(label);
 notesBox.append(node('p','desk-note-help','Keep observations here without leaving Grove. Saving a note does not approve, publish, or trigger any agent.'));
 const input=node('textarea','desk-note-input');input.id='deskReviewNote';input.rows=3;input.maxLength=1000;
 input.placeholder='What should change? What did you actually test?';
 input.value=typeof notes[item.number]==='string'?notes[item.number].slice(0,1000):'';
 notesBox.append(input);
 const save=node('button','desk-note-save','Save note');
 save.type='button';save.dataset.deskSave=String(item.number);notesBox.append(save);
 const hint=node('span','desk-note-saved','');hint.id='deskNoteFeedback';hint.setAttribute('role','status');notesBox.append(hint);
 panel.append(notesBox);
}
function render(){
 const counts={all:items.length,research:0,plans:0,prototypes:0};
 items.forEach(i=>counts[i.kind]++);
 $('deskResearchCount').textContent=String(counts.research);
 $('deskPlanCount').textContent=String(counts.plans);
 $('deskPrototypeCount').textContent=String(counts.prototypes);
 $('deskNeedsReview').textContent=String(counts.plans+counts.prototypes);
 for(const button of root.querySelectorAll('[data-desk-tab]')){
  const active=button.dataset.deskTab===tab;
  button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));
  button.tabIndex=active?0:-1;
  const count=button.querySelector('.desk-tab-count');if(count)count.textContent=String(counts[button.dataset.deskTab]||0);
 }
 const search=$('deskSearch').value.trim().toLocaleLowerCase().slice(0,120);
 const visible=items.filter(i=>(tab==='all'||i.kind===tab)&&(!search||(heading(i)+' '+i.title+' '+(i.body||'')).toLocaleLowerCase().includes(search)));
 if(!visible.some(i=>i.number===selected))selected=visible[0]?.number??null;
 const list=$('deskItems');list.replaceChildren();
 if(!visible.length)list.append(node('p','desk-empty',!loaded?'Loading…':search?'No reports match your search.':'No reports in this category yet.'));
 for(const item of visible){
  const button=node('button','desk-entry'+(item.number===selected?' selected':''));button.type='button';
  button.dataset.deskIssue=String(item.number);button.setAttribute('aria-pressed',String(item.number===selected));
  button.append(node('span','desk-entry-meta',LABELS[item.kind]+' · '+date(item.created_at)),
   node('strong','desk-entry-title',heading(item)),node('small','desk-entry-status',statusLabel(item)));
  list.append(button);
 }
 details();
}
async function load(){
 if(busy)return;
 busy=true;$('deskRefresh').disabled=true;status('Refreshing public agent journals…');
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),13000);
  let response;
  try{response=await fetch(API,{credentials:'omit',headers:{Accept:'application/vnd.github+json'},signal:controller.signal,cache:'no-store'});}
  finally{clearTimeout(timeout);}
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();if(!Array.isArray(data))throw Error('Unexpected response');
  items=data.filter(i=>type(i)).map(i=>({...i,kind:type(i)})).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  loaded=true;status('Public reports updated · '+new Date().toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+' · read-only');
 }catch(error){
  loaded=true;status('Could not refresh reports. '+(items.length?'Showing last loaded results.':'No live reports available.')+' Check your connection or GitHub API limits.',true);
 }finally{busy=false;$('deskRefresh').disabled=false;render();}
}
root.addEventListener('click',event=>{
 const tabButton=event.target.closest('[data-desk-tab]');
 if(tabButton){const next=tabButton.dataset.deskTab;if(TYPES.includes(next)){tab=next;render();}return;}
 const entry=event.target.closest('[data-desk-issue]');
 if(entry){selected=Number(entry.dataset.deskIssue);render();return;}
 const save=event.target.closest('[data-desk-save]');
 if(save){
  const id=save.dataset.deskSave;
  if(!items.some(i=>String(i.number)===id))return;
  notes[id]=$('deskReviewNote').value.slice(0,1000);
  try{localStorage.setItem(NOTE_KEY,JSON.stringify(notes));$('deskNoteFeedback').textContent='Saved locally.';}
  catch{$('deskNoteFeedback').textContent='Could not save to this browser.';}
 }
});
root.querySelector('[role=tablist]').addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
 const direction=event.key==='ArrowRight'?1:-1;
 const next=TYPES[(TYPES.indexOf(tab)+direction+TYPES.length)%TYPES.length];
 event.preventDefault();root.querySelector('[data-desk-tab="'+next+'"]').focus();tab=next;render();
});
$('deskSearch').addEventListener('input',render);
$('deskRefresh').addEventListener('click',load);
$('deskOpenWorkbench').addEventListener('click',()=>{
 const advanced=$('groveAdvanced');advanced.open=true;advanced.scrollIntoView({behavior:'smooth',block:'start'});
});
render();void load();
})();
