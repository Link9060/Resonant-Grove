/* Autonomous Grove v0.1: local ideation cockpit, NOT a live money-making agent.
   Deliberately no network requests, account connections, posting, spending or payout APIs. */
(() => {
  'use strict';
  const STORAGE = 'resonant-grove-autonomy-v1';
  const $ = id => document.getElementById(id);
  const now = () => new Date().toISOString();
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
  const ideas = Object.freeze([
    {title:'Printable maintenance checklist',category:'Digital resource',audience:'People maintaining bicycles',offer:'A clear, useful checklist customers can print or save.',trial:'Outline the checklist and ask three people whether it would be useful.',channel:'Organic educational post'},
    {title:'Simple project planning sheet',category:'Digital template',audience:'Students building their first project',offer:'A free example plus an optional, clearly described editable template.',trial:'Sketch one page and test whether someone can understand it.',channel:'Helpful walkthrough'},
    {title:'Mountain-bike trail prep guide',category:'Educational resource',audience:'New local trail riders',offer:'A practical gear and trail-etiquette guide with accurate sourcing.',trial:'Research publicly available guidance and ask riders for corrections.',channel:'Educational carousel'},
    {title:'Small-business inventory tracker',category:'Digital tool',audience:'Very small local sellers',offer:'An uncomplicated spreadsheet for tracking items and restocking.',trial:'Interview one seller about the fields they actually need.',channel:'Short demo post'},
    {title:'Piano practice journal',category:'Printable template',audience:'Beginner piano learners',offer:'A daily practice tracker with editable weekly targets.',trial:'Draft a sample week and collect honest feedback.',channel:'Free teaching tip'},
    {title:'Yard project material estimator',category:'Simple calculator',audience:'People planning a garden project',offer:'A clearly explained, approximate volume estimator.',trial:'Cross-check formulas and disclose that supplier quantities may differ.',channel:'How-it-works tutorial'},
    {title:'Volunteer event planning pack',category:'Digital template',audience:'Small community groups',offer:'A checklist and schedule to organize an event.',trial:'Get feedback on which parts are missing before publishing.',channel:'Community example'},
    {title:'Beginner CAD parts library',category:'Digital file collection',audience:'Students learning 3D modeling',offer:'Original practice objects with clear dimensions and licenses.',trial:'Create a few original examples and check export quality.',channel:'Process video'},
    {title:'Study session planner',category:'Digital template',audience:'Students organizing assignments',offer:'A customizable weekly layout rather than promises of better grades.',trial:'Test whether instructions make sense without explanation.',channel:'Practical tips'},
    {title:'Budget-free business experiment worksheet',category:'Digital resource',audience:'New entrepreneurs',offer:'A worksheet for testing demand without pretending results are guaranteed.',trial:'Use the worksheet with one idea and document what failed.',channel:'Transparent experiment recap'},
    {title:'Home organization labels',category:'Printable files',audience:'Households organizing storage',offer:'Simple labels made from original graphics with a clear preview.',trial:'Test sizing on ordinary home printers.',channel:'Before/after organization tips'},
    {title:'Open-source project changelog template',category:'Digital template',audience:'Hobby software builders',offer:'A clean, license-respecting way to publish progress.',trial:'Try it on a small sample repository.',channel:'Step-by-step tutorial'}
  ]);
  const defaults = () => ({
    version:1,explorerEnabled:false,sequence:0,proposals:[],activity:[],
    charter:{
      spendingCents:0,publicPosting:false,outboundMessages:false,paymentAccess:false,
      truthfulness:true,approvalRequired:true
    }
  });
  function normalize(obj) {
    const state=defaults();
    if(!obj||typeof obj!=='object')return state;
    state.explorerEnabled=obj.explorerEnabled===true;
    state.sequence=Number.isSafeInteger(obj.sequence) ? Math.max(0,Math.min(100000,obj.sequence)):0;
    state.proposals=Array.isArray(obj.proposals)?obj.proposals.slice(-200).filter(p=>p&&typeof p.id==='string'&&typeof p.title==='string').map(p=>({
      id:p.id.slice(0,80),title:p.title.slice(0,120),category:String(p.category||'').slice(0,80),
      audience:String(p.audience||'').slice(0,150),offer:String(p.offer||'').slice(0,300),
      trial:String(p.trial||'').slice(0,300),channel:String(p.channel||'').slice(0,100),
      status:['candidate','selected','rejected'].includes(p.status)?p.status:'candidate',
      created:String(p.created||now()).slice(0,40)
    })):[];
    state.activity=Array.isArray(obj.activity)?obj.activity.slice(-120).filter(x=>x&&typeof x.title==='string').map(x=>({title:x.title.slice(0,160),created:String(x.created||now()).slice(0,40)})):[];
    // Permission charter intentionally not read from local storage. User cannot
    // grant payment, spending, posting or messaging authority via this UI.
    return state;
  }
  let state;
  try { state=normalize(JSON.parse(localStorage.getItem(STORAGE)||'null')); }
  catch { state=defaults(); }
  function persist() {
    try { localStorage.setItem(STORAGE,JSON.stringify(state)); }
    catch { showMessage('Browser storage unavailable. Export any drafts you want to keep.',true); }
    render();
  }
  function activity(title) {
    state.activity.push({title,created:now()});
    state.activity=state.activity.slice(-120);
  }
  function showMessage(message,isError=false) {
    const node=$('autoNotice');
    if(node){node.textContent=message;node.classList.toggle('is-error',isError);}
  }
  function ideaId() {
    if(typeof crypto!=='undefined'&&crypto.randomUUID)return crypto.randomUUID();
    return 'local-'+Date.now()+'-'+state.sequence+'-'+Math.random().toString(36).slice(2);
  }
  function createCandidates() {
    if(!state.explorerEnabled)return showMessage('Enable the local idea explorer first.',true);
    const existing=new Set(state.proposals.map(p=>p.title));
    const available=ideas.filter(i=>!existing.has(i.title));
    if(!available.length)return showMessage('All 12 starter concepts have been explored. Keep or reject ideas before testing a new batch.');
    const batch=available.slice(0,Math.min(4,available.length));
    batch.forEach(t=>state.proposals.push({...t,id:ideaId(),status:'candidate',created:now()}));
    state.sequence+=batch.length;
    activity('Created '+batch.length+' offline idea sketches for review.');
    persist();showMessage(batch.length+' idea sketches prepared. No AI model, accounts, or public actions were used.');
  }
  function changeStatus(id,status) {
    const item=state.proposals.find(p=>p.id===id);
    if(!item||!['candidate','selected','rejected'].includes(status))return;
    item.status=status;
    activity((status==='selected'?'Selected for manual validation: ':status==='rejected'?'Set aside: ':'Returned to ideas: ')+item.title);
    persist();showMessage(status==='selected'?'Added to research shortlist. This does not publish or launch a venture.':'Idea updated locally.');
  }
  function render() {
    const selected=state.proposals.filter(p=>p.status==='selected').length;
    const candidates=state.proposals.filter(p=>p.status==='candidate').length;
    $('autoIdeaCount').textContent=String(state.proposals.length);
    $('autoCandidateCount').textContent=String(candidates);
    $('autoSelectedCount').textContent=String(selected);
    $('autoModeText').textContent=state.explorerEnabled?'Idea explorer enabled':'Idea explorer paused';
    $('autoToggle').textContent=state.explorerEnabled?'Pause explorer':'Enable local explorer';
    $('autoGenerate').disabled=!state.explorerEnabled||state.proposals.length>=200;
    $('autoGenerate').textContent='Explore 4 candidate ideas';
    const list=$('autoIdeas');
    const visible=state.proposals.slice().reverse().filter(p=>p.status!=='rejected');
    list.innerHTML=visible.length?visible.map(p=>(
      '<article class="auto-idea"><div class="auto-idea-meta"><span>'+escape(p.category)+'</span><span class="auto-tag '+p.status+'">'+(p.status==='selected'?'RESEARCH SHORTLIST':'UNTESTED')+'</span></div>'+
      '<h3>'+escape(p.title)+'</h3><p>'+escape(p.offer)+'</p>'+
      '<div class="auto-idea-detail"><strong>For</strong> '+escape(p.audience)+'</div>'+
      '<div class="auto-idea-detail"><strong>First validation</strong> '+escape(p.trial)+'</div>'+
      '<div class="auto-idea-actions">'+
      (p.status==='candidate'?'<button class="auto-small primary" data-auto-action="select" data-id="'+escape(p.id)+'">Shortlist</button>':'<button class="auto-small" data-auto-action="restore" data-id="'+escape(p.id)+'">Back to ideas</button>')+
      '<button class="auto-small" data-auto-action="reject" data-id="'+escape(p.id)+'">Set aside</button></div></article>'
    )).join(''):'<div class="auto-empty"><i data-lucide="lightbulb"></i><strong>Your experiment pipeline starts here.</strong><p>Enable the explorer to create offline idea sketches. No offers are published and no accounts are contacted.</p></div>';
    const activities=state.activity.slice(-5).reverse();
    $('autoActivity').innerHTML=activities.length?activities.map(x=>'<li><span>'+escape(x.title)+'</span><small>'+escape(new Date(x.created).toLocaleDateString())+'</small></li>').join(''):'<li><span>No research actions yet.</span></li>';
    if(window.lucide&&typeof window.lucide.createIcons==='function')window.lucide.createIcons();
  }
  $('autoToggle').addEventListener('click',()=>{
    state.explorerEnabled=!state.explorerEnabled;
    activity(state.explorerEnabled?'Local idea explorer enabled.':'Local idea explorer paused.');
    persist();
    showMessage(state.explorerEnabled?'Local idea exploration is ready. This is not a background AI worker.':'Idea explorer paused. All public and financial permissions remain off.');
  });
  $('autoGenerate').addEventListener('click',createCandidates);
  $('autoIdeas').addEventListener('click',e=>{
    const btn=e.target.closest('[data-auto-action]');
    if(!btn)return;
    const action=btn.dataset.autoAction;
    if(action==='select')changeStatus(btn.dataset.id,'selected');
    if(action==='reject')changeStatus(btn.dataset.id,'rejected');
    if(action==='restore')changeStatus(btn.dataset.id,'candidate');
  });
  $('autoExport').addEventListener('click',()=>{
    const json=JSON.stringify(state,null,2),blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='grove-autonomy-ideas-'+new Date().toISOString().slice(0,10)+'.json';
    a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    showMessage('Exported local idea drafts. This file contains no earnings or payout credentials.');
  });
  render();
})();
