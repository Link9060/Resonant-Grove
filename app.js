/* Resonant Grove • Local-first prototype • No backend or payment integrations */
(function () {
  'use strict';
  const KEY = 'resonant-grove-workspace-v1';
  const allowedStatuses = ['active', 'idea', 'retired'];
  const $ = (id) => document.getElementById(id);
  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  const now = () => new Date().toISOString();
  const h = (input) => String(input == null ? '' : input).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (n) => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', minimumFractionDigits: Number(n) % 1 === 0 ? 0 : 2, maximumFractionDigits:2}).format(Number(n) || 0);
  const fullMoney = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
  const icon = (name) => '<i data-lucide="' + name + '"></i>';
  const dateLabel = (d) => {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  };
  const relativeDate = (d) => {
    const days = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));
    if (!Number.isFinite(days)) return 'Recently';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + ' days ago';
    return dateLabel(d);
  };
  const starter = () => {
    const created = now();
    const seedId = uid();
    return {
      version:1,
      seeds:[{id:seedId, title:'The First Dollar', description:'A simple experiment to turn a useful idea into the first real dollar earned by Grove.', category:'First experiment', status:'active', goal:1, created, steps:[
        {id:uid(),text:'Choose one small thing someone would pay for',done:false},
        {id:uid(),text:'Make a simple offer and share it',done:false},
        {id:uid(),text:'Deliver value and record the first earning',done:false}
      ]}],
      transactions:[],
      activity:[
        {id:uid(),type:'seed',title:'Seed 001 planted',description:'The First Dollar is ready to grow.',created},
        {id:uid(),type:'start',title:'Your Grove took root',description:'A new home for the ventures ahead.',created}
      ]
    };
  };
  const safeString = (s, max=400) => String(s == null ? '' : s).slice(0,max);
  function normalize(raw) {
    if (!raw || !Array.isArray(raw.seeds) || !Array.isArray(raw.transactions) || !Array.isArray(raw.activity)) throw Error('Unrecognized Grove backup');
    return {
      version:1,
      seeds:raw.seeds.slice(0,500).map(s => ({
        id:safeString(s.id || uid(),90),title:safeString(s.title,100)||'Untitled seed',description:safeString(s.description,1000),
        category:safeString(s.category,60)||'Experiment',status:allowedStatuses.includes(s.status)?s.status:'idea',
        goal:Math.max(0,Math.min(999999999,Number(s.goal)||0)),created:safeString(s.created||now(),50),
        steps:(Array.isArray(s.steps)?s.steps:[]).slice(0,100).map(t=>({id:safeString(t.id||uid(),90),text:safeString(t.text,300),done:Boolean(t.done)}))
      })),
      transactions:raw.transactions.slice(0,10000).map(t=>({
        id:safeString(t.id||uid(),90),type:t.type==='expense'?'expense':'income',amount:Math.max(0,Math.min(999999999,Number(t.amount)||0)),
        description:safeString(t.description,300),seedId:safeString(t.seedId,90),created:safeString(t.created||now(),50)
      })).filter(t=>t.amount>0),
      activity:raw.activity.slice(0,1000).map(a=>({
        id:safeString(a.id||uid(),90),type:['seed','finance','note','start','task','update'].includes(a.type)?a.type:'note',
        title:safeString(a.title,150),description:safeString(a.description,500),created:safeString(a.created||now(),50)
      }))
    };
  }
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : starter();
    } catch (error) {
      console.warn('Grove: could not restore local data',error);
      return starter();
    }
  }
  let db = read(), view = 'overview', filter = 'all';
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify(db)); }
    catch (error) { toast('Could not save. Check browser storage.',true); }
    render();
  }
  function log(type,title,description) {
    db.activity.unshift({id:uid(),type,title,description,created:now()});
    db.activity=db.activity.slice(0,1000);
  }
  function total(type) { return db.transactions.filter(t=>t.type===type).reduce((sum,t)=>sum+t.amount,0); }
  function seedIncome(seedId) { return db.transactions.filter(t=>t.type==='income' && t.seedId===seedId).reduce((a,t)=>a+t.amount,0); }
  function seedCost(seedId) { return db.transactions.filter(t=>t.type==='expense' && t.seedId===seedId).reduce((a,t)=>a+t.amount,0); }
  function statusChip(status) {
    const s = allowedStatuses.includes(status)?status:'idea';
    return '<span class="status-chip '+s+'">'+({active:'Growing',idea:'Idea',retired:'Archived'}[s])+'</span>';
  }
  function progress(seed) {
    if (!seed.steps.length) return 0;
    return Math.round(seed.steps.filter(s=>s.done).length / seed.steps.length * 100);
  }
  function refreshIcons() { if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons(); }
  function renderMetrics() {
    const earned=total('income'), spent=total('expense'), net=earned-spent, active=db.seeds.filter(s=>s.status==='active').length;
    const metric = (title,value,foot,ic) => '<div class="metric-card"><div class="metric-top"><span>'+title+'</span><span class="metric-icon">'+icon(ic)+'</span></div><div class="metric-value">'+value+'</div><div class="metric-foot">'+foot+'</div></div>';
    $('metrics').innerHTML=[
      metric('Total earned',money(earned),'Recorded income · all time','arrow-down-left'),
      metric('Total spent',money(spent),'Recorded expenses · all time','arrow-up-right'),
      metric('Available balance',money(net),net<0?'Expenses exceed income':'Income minus expenses','wallet'),
      metric('Active seeds',String(active).padStart(2,'0'),db.seeds.length+' seeds in your collection','sprout')
    ].join('');
    $('treasuryMetrics').innerHTML=[
      metric('Total revenue',money(earned),'From all your seeds','arrow-down-left'),
      metric('Total expenses',money(spent),'What you invested or spent','arrow-up-right'),
      metric('Net available',money(net),'Revenue less expenses','landmark')
    ].join('');
    $('navSeedCount').textContent=db.seeds.length;
    const pct=Math.max(0,Math.min(100,Math.round(earned*100)));
    $('milestoneRing').style.setProperty('--pct',pct+'%');
    $('firstDollarBar').style.width=pct+'%';
    $('milestonePercent').textContent=pct+'%';
    $('firstDollarCurrent').textContent=money(Math.min(1,earned));
    $('todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'short',month:'long',day:'numeric'});
  }
  function renderOverviewSeeds() {
    const chosen=db.seeds.filter(s=>s.status!=='retired').slice(0,3);
    $('overviewSeeds').innerHTML=chosen.length?chosen.map(s=>'<button class="overview-seed" type="button" data-action="open-seed" data-id="'+h(s.id)+'"><span class="seed-icon">'+icon('sprout')+'</span><span class="seed-text"><strong>'+h(s.title)+'</strong><small>'+h(s.category)+' · '+progress(s)+'% of tasks complete</small></span><span class="seed-side">'+statusChip(s.status)+icon('arrow-up-right')+'</span></button>').join(''):'<div class="overview-empty">No growing seeds yet. Use New seed to plant one.</div>';
  }
  function eventIcon(type) {return ({seed:'sprout',finance:'wallet',note:'notebook-pen',start:'sparkles',task:'check-circle-2',update:'refresh-cw'})[type]||'activity';}
  function activityMarkup(items) {
    return items.map(a=>'<div class="activity-event"><div class="activity-glyph">'+icon(eventIcon(a.type))+'</div><div class="activity-content"><strong>'+h(a.title)+'</strong><p>'+h(a.description)+'</p></div><time datetime="'+h(a.created)+'">'+relativeDate(a.created)+'</time></div>').join('');
  }
  function renderActivities() {
    const sorted=[...db.activity].sort((a,b)=>new Date(b.created)-new Date(a.created));
    $('overviewActivity').innerHTML=sorted.length?activityMarkup(sorted.slice(0,3)):'<div class="empty-state">No activity yet.</div>';
    $('fullActivity').innerHTML=sorted.length?activityMarkup(sorted):'<div class="empty-state">Your first steps will appear here.</div>';
  }
  function renderKeeper() {
    const first=db.seeds.find(s=>s.title==='The First Dollar'), earned=total('income');
    const active=db.seeds.filter(s=>s.status==='active');
    let heading,detail,ic='lightbulb';
    if (earned>=1) {heading='Your first dollar has arrived.';detail='You proved that an idea can earn. Look back at what worked, then decide what deserves another experiment.';ic='party-popper';}
    else if (!active.length) {heading='Give an idea a place to grow.';detail='Plant or activate one low-cost experiment. Focus on something you can test this week.';}
    else {
      const next=active.flatMap(s=>s.steps.filter(t=>!t.done).map(t=>({seed:s,task:t})))[0];
      if (next) {heading=next.task.text;detail='A suggested next action from '+next.seed.title+'. Open the seed to mark it complete when it is done.';ic='arrow-up-right';}
      else {heading='Take the next step toward your first earning.';detail='Your checklist is complete. Test an offer with real people and record what happens.';ic='target';}
    }
    $('keeperAdvice').innerHTML='<div class="keeper-suggestion">'+icon(ic)+'<div><strong>'+h(heading)+'</strong><p>'+h(detail)+'</p></div></div>';
  }
  function renderSeeds() {
    document.querySelectorAll('.filter-tab').forEach(el=>el.classList.toggle('active',el.dataset.filter===filter));
    const list=db.seeds.filter(s=>filter==='all'||s.status===filter);
    $('seedGrid').innerHTML=list.map(s=>'<button type="button" class="seed-card" data-action="open-seed" data-id="'+h(s.id)+'"><div class="seed-card-top"><span class="seed-icon">'+icon(s.status==='retired'?'archive':'sprout')+'</span>'+statusChip(s.status)+'</div><h3>'+h(s.title)+'</h3><p>'+h(s.description||'This seed is ready for its next step.')+'</p><div class="seed-card-footer"><span>'+h(s.category)+' · '+progress(s)+'% done</span>'+icon('arrow-up-right')+'</div></button>').join('')+(filter!=='retired'?'<button type="button" class="seed-card new-seed-card" data-action="new-seed"><span class="new-seed-plus">'+icon('plus')+'</span><strong>Plant something new</strong><p>Have an idea? Select this card to plant a new Seed.</p></button>':'');
    if (!list.length && filter==='retired') $('seedGrid').innerHTML='<div class="empty-state">No archived seeds yet. Ideas you retire will live here.</div>';
  }
  function renderTransactions() {
    const sorted=[...db.transactions].sort((a,b)=>new Date(b.created)-new Date(a.created));
    $('transactionList').innerHTML=sorted.length?sorted.map(t=>{
      const seed=db.seeds.find(s=>s.id===t.seedId);
      const expense=t.type==='expense';
      return '<div class="transaction-row"><div class="transaction-icon '+(expense?'expense':'')+'">'+icon(expense?'arrow-up-right':'arrow-down-left')+'</div><div class="transaction-description"><strong>'+h(t.description|| (expense?'Expense':'Income'))+'</strong><small>'+dateLabel(t.created)+(seed?' · '+h(seed.title):' · General')+'</small></div><strong class="transaction-value '+(expense?'expense':'')+'">'+(expense?'−':'+')+fullMoney(t.amount)+'</strong><button class="delete-tx" data-action="delete-transaction" data-id="'+h(t.id)+'" aria-label="Delete transaction" title="Delete transaction">'+icon('trash-2')+'</button></div>';
    }).join(''):'<div class="empty-state">'+icon('wallet')+'<strong>No transactions yet</strong><p>When you earn your first dollar or make a project expense, record it here. Your numbers will update automatically.</p></div>';
  }
  function renderChart() {
    const months=[];
    const current=new Date();
    for(let i=5;i>=0;i--) {const d=new Date(current.getFullYear(),current.getMonth()-i,1);months.push({key:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),label:d.toLocaleDateString(undefined,{month:'short'}),income:0,expense:0});}
    db.transactions.forEach(t=>{
      const d=new Date(t.created);
      if (Number.isNaN(d.getTime())) return;
      const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      const m=months.find(x=>x.key===key);if(m) m[t.type]+=t.amount;
    });
    const top=Math.max(1,...months.flatMap(m=>[m.income,m.expense]));
    $('cashflowChart').innerHTML=months.map(m=>{
      const income=Math.max(0,Math.round(m.income/top*170));
      const expense=Math.max(0,Math.round(m.expense/top*170));
      return '<div class="month-stack"><div class="month-bars"><div class="bar income-bar" style="height:'+income+'px" title="'+h(m.label)+': '+h(fullMoney(m.income))+' earned"></div><div class="bar expense-bar" style="height:'+expense+'px" title="'+h(m.label)+': '+h(fullMoney(m.expense))+' spent"></div></div><span class="month-name">'+h(m.label)+'</span></div>';
    }).join('');
  }
  function render() {
    renderMetrics();renderOverviewSeeds();renderActivities();renderKeeper();renderSeeds();renderTransactions();renderChart();refreshIcons();
  }
  const viewNames={overview:'Overview',seeds:'My Seeds',treasury:'Treasury',activity:'Activity',settings:'Settings'};
  function closeMenu() {$('sidebar').classList.remove('open');$('mobileShade').classList.remove('show');}
  function navigate(target) {
    if(!viewNames[target]) target='overview';
    view=target;
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+target));
    document.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('active',v.classList.contains('nav-link')&&v.dataset.view===target));
    $('breadcrumb').textContent=viewNames[target];
    if (location.hash.slice(1)!==target) history.replaceState(null,'','#'+target);
    closeMenu();window.scrollTo({top:0,behavior:'instant'});refreshIcons();
  }
  function modal(markup) {
    $('modalContent').innerHTML=markup;
    $('modalBackdrop').classList.add('open');
    $('modalBackdrop').setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    refreshIcons();
    const focus=$('modalContent').querySelector('input:not([type=hidden]),textarea,select,button');
    if(focus)focus.focus({preventScroll:true});
  }
  function closeModal() {
    $('modalBackdrop').classList.remove('open');
    $('modalBackdrop').setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    $('modalContent').innerHTML='';
  }
  function modalHeading(kicker,title) {
    return '<div class="modal-header"><div><div class="modal-eyebrow">'+h(kicker)+'</div><h2 id="modalTitle">'+h(title)+'</h2></div><button type="button" class="modal-close" data-action="close-modal" aria-label="Close">'+icon('x')+'</button></div>';
  }
  function showSeedForm(id) {
    const s=db.seeds.find(x=>x.id===id);const edit=Boolean(s);
    modal(modalHeading(edit?'EDIT YOUR EXPERIMENT':'A NEW BEGINNING',edit?'Edit this seed':'Plant a new seed')+
      '<form id="seedForm" class="modal-body"><input type="hidden" name="seedId" value="'+h(s?s.id:'')+'">'+
      '<div class="form-group"><label for="seedName">Seed name *</label><input id="seedName" name="title" required maxlength="100" placeholder="An idea worth testing" value="'+h(s?s.title:'')+'"></div>'+
      '<div class="form-group"><label for="seedDescription">What are you trying to make happen?</label><textarea id="seedDescription" name="description" maxlength="1000" placeholder="Describe the idea and what success might look like...">'+h(s?s.description:'')+'</textarea></div>'+
      '<div class="form-row"><div class="form-group"><label for="seedCategory">Category</label><input id="seedCategory" name="category" maxlength="60" placeholder="Micro-business, digital product..." value="'+h(s?s.category:'Experiment')+'"></div><div class="form-group"><label for="seedStatus">Stage</label><select name="status" id="seedStatus">'+allowedStatuses.map(st=>'<option value="'+st+'" '+((s?s.status:'idea')===st?'selected':'')+'>'+({active:'Growing',idea:'Idea',retired:'Archived'})[st]+'</option>').join('')+'</select></div></div>'+
      '<div class="form-group"><label for="seedGoal">Revenue goal (USD)</label><input id="seedGoal" name="goal" type="number" min="0" max="999999999" step="0.01" value="'+(s?s.goal:1)+'"><div class="form-help">An optional goal. Only recorded earnings count toward it.</div></div>'+
      '<div class="modal-actions"><button class="button button-ghost" type="button" data-action="close-modal">Cancel</button><button class="button button-green" type="submit">'+(edit?'Save changes':'Plant this seed')+' '+icon('arrow-right')+'</button></div></form>');
  }
  function showSeedDetail(id) {
    const s=db.seeds.find(x=>x.id===id);if(!s)return;
    const goal=s.goal||0, earned=seedIncome(s.id), spent=seedCost(s.id);
    modal(modalHeading(h(s.category).toUpperCase(),s.title)+
      '<div class="modal-body"><div style="display:flex;align-items:center;gap:10px;margin:0 0 12px">'+statusChip(s.status)+'<span style="font-size:10px;color:#829982">Planted '+dateLabel(s.created)+'</span></div><p class="detail-description">'+h(s.description||'This seed is ready for its next experiment.')+'</p>'+
      '<div class="detail-stat-row"><div class="detail-stat"><small>Income</small><strong>'+money(earned)+'</strong></div><div class="detail-stat"><small>Expenses</small><strong>'+money(spent)+'</strong></div><div class="detail-stat"><small>Goal progress</small><strong>'+(goal?Math.min(100,Math.round(earned/goal*100))+'%':'Not set')+'</strong></div></div>'+
      '<div class="detail-task-header"><strong>Next steps <span style="color:#78937c">('+s.steps.filter(t=>t.done).length+'/'+s.steps.length+')</span></strong></div>'+
      (s.steps.length?s.steps.map(t=>'<label class="task-row '+(t.done?'done':'')+'"><input type="checkbox" data-action="toggle-task" data-seed="'+h(s.id)+'" data-id="'+h(t.id)+'" '+(t.done?'checked':'')+'><span>'+h(t.text)+'</span><button type="button" class="task-delete" data-action="delete-task" data-seed="'+h(s.id)+'" data-id="'+h(t.id)+'" aria-label="Delete step">'+icon('x')+'</button></label>').join(''):'<p class="form-help">No steps yet. Start with one small action.</p>')+
      '<form id="taskForm" class="form-row" style="grid-template-columns:1fr auto;align-items:end;gap:8px;margin-top:14px"><input type="hidden" name="seedId" value="'+h(s.id)+'"><div class="form-group" style="margin:0"><input name="text" aria-label="New task" required maxlength="300" placeholder="One small next step..."></div><button class="button button-green" type="submit" style="height:41px;padding:0 14px">'+icon('plus')+'</button></form>'+
      '<div class="detail-buttons"><button class="outline-small" data-action="edit-seed" data-id="'+h(s.id)+'">'+icon('pencil')+' Edit seed</button><button class="outline-small" data-action="transaction-for-seed" data-id="'+h(s.id)+'">'+icon('plus')+' Record income</button><button class="outline-small" data-action="toggle-archive" data-id="'+h(s.id)+'">'+icon(s.status==='retired'?'rotate-ccw':'archive')+' '+(s.status==='retired'?'Restore':'Archive')+'</button><button class="danger-button" data-action="delete-seed" data-id="'+h(s.id)+'">Delete</button></div></div>');
  }
  function showTransactionForm(type,seedId) {
    const expense=type==='expense';
    modal(modalHeading('THE GROVE TREASURY',expense?'Record an expense':'Record income')+
      '<form id="transactionForm" class="modal-body"><input type="hidden" name="type" value="'+(expense?'expense':'income')+'">'+
      '<div class="form-group"><label for="txAmount">Amount (USD) *</label><input id="txAmount" name="amount" type="number" inputmode="decimal" step="0.01" min="0.01" max="999999999" required placeholder="0.00"></div>'+
      '<div class="form-group"><label for="txDescription">What was it for? *</label><input id="txDescription" name="description" required maxlength="300" placeholder="'+(expense?'Domain, supplies, software...':'First sale, digital download, service...')+'"></div>'+
      '<div class="form-group"><label for="txSeed">Related seed</label><select name="seedId" id="txSeed"><option value="">General / no seed</option>'+db.seeds.map(s=>'<option value="'+h(s.id)+'" '+(s.id===seedId?'selected':'')+'>'+h(s.title)+'</option>').join('')+'</select></div>'+
      '<div class="form-help" style="margin-bottom:19px">This is a manual record, not a payment or bank transaction.</div>'+
      '<div class="modal-actions"><button type="button" class="button button-ghost" data-action="close-modal">Cancel</button><button type="submit" class="button button-green">Save '+(expense?'expense':'income')+' '+icon('check')+'</button></div></form>');
  }
  function showNoteForm() {
    modal(modalHeading('YOUR GROWTH JOURNAL','Write a quick note')+
    '<form id="noteForm" class="modal-body"><div class="form-group"><label for="noteTitle">Headline *</label><input id="noteTitle" name="title" maxlength="150" required placeholder="What happened today?"></div><div class="form-group"><label for="noteDescription">Details</label><textarea id="noteDescription" name="description" maxlength="500" placeholder="A lesson, a win, or a thought worth keeping..."></textarea></div><div class="modal-actions"><button class="button button-ghost" type="button" data-action="close-modal">Cancel</button><button class="button button-green" type="submit">Save note '+icon('check')+'</button></div></form>');
  }
  function toast(message,error=false) {
    const el=document.createElement('div');
    el.className='toast'+(error?' error':''); el.innerHTML=icon(error?'alert-circle':'check-circle-2')+'<span>'+h(message)+'</span>';
    $('toastArea').append(el);refreshIcons();
    setTimeout(()=>el.remove(),3300);
  }
  document.addEventListener('click',(e)=>{
    const route=e.target.closest('[data-view]');
    if(route){navigate(route.dataset.view);return;}
    const f=e.target.closest('[data-filter]');
    if(f){filter=f.dataset.filter;renderSeeds();refreshIcons();return;}
    const btn=e.target.closest('[data-action]');if(!btn)return;
    const action=btn.dataset.action,id=btn.dataset.id;
    if(action==='new-seed')showSeedForm();
    else if(action==='close-modal')closeModal();
    else if(action==='open-seed')showSeedDetail(id);
    else if(action==='edit-seed')showSeedForm(id);
    else if(action==='revenue')showTransactionForm('income');
    else if(action==='expense')showTransactionForm('expense');
    else if(action==='transaction-for-seed')showTransactionForm('income',id);
    else if(action==='new-note')showNoteForm();
    else if(action==='toggle-archive') {
      const s=db.seeds.find(x=>x.id===id);if(!s)return;
      s.status=s.status==='retired'?'active':'retired';
      log('update',s.status==='retired'?'Seed archived':'Seed restored',s.title);
      save();closeModal();toast(s.status==='retired'?'Seed archived':'Seed restored');
    }
    else if(action==='delete-seed') {
      const s=db.seeds.find(x=>x.id===id);if(!s||!confirm('Permanently delete "'+s.title+'"? Existing transaction records will remain.'))return;
      db.seeds=db.seeds.filter(x=>x.id!==id);log('update','Seed removed',s.title);save();closeModal();toast('Seed deleted');
    }
    else if(action==='delete-transaction') {
      const t=db.transactions.find(x=>x.id===id);if(!t||!confirm('Remove this '+t.type+' record?'))return;
      db.transactions=db.transactions.filter(x=>x.id!==id);log('finance','Transaction removed',t.description);save();toast('Transaction deleted');
    }
    else if(action==='delete-task') {
      e.preventDefault(); const s=db.seeds.find(x=>x.id===btn.dataset.seed);if(!s)return;
      s.steps=s.steps.filter(x=>x.id!==id);save();showSeedDetail(s.id);
    }
    else if(action==='export') {
      const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='resonant-grove-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup downloaded');
    }
    else if(action==='import')$('importFile').click();
    else if(action==='reset') {
      if(!confirm('Reset this Grove? All locally saved seeds, records and journal entries will be erased. Export a backup first if needed.'))return;
      db=starter();save();navigate('overview');toast('Workspace reset');
    }
  });
  document.addEventListener('change',(e)=>{
    if(e.target.matches('[data-action="toggle-task"]')) {
      const s=db.seeds.find(x=>x.id===e.target.dataset.seed), t=s&&s.steps.find(x=>x.id===e.target.dataset.id);
      if(!t)return;
      t.done=e.target.checked;log('task',t.done?'Step completed':'Step reopened',t.text);
      save();showSeedDetail(s.id);
    }
  });
  document.addEventListener('submit',(e)=>{
    const form=e.target;if(!['seedForm','transactionForm','taskForm','noteForm'].includes(form.id))return;
    e.preventDefault();
    if(!form.reportValidity())return;
    const data=new FormData(form);
    if(form.id==='seedForm') {
      const id=String(data.get('seedId')||'');
      const title=safeString(data.get('title'),100).trim();
      if(!title)return toast('A seed needs a name.',true);
      const payload={title,description:safeString(data.get('description'),1000).trim(),category:safeString(data.get('category'),60).trim()||'Experiment',status:allowedStatuses.includes(data.get('status'))?data.get('status'):'idea',goal:Math.max(0,Number(data.get('goal'))||0)};
      if(id){const s=db.seeds.find(x=>x.id===id);if(!s)return;Object.assign(s,payload);log('update','Seed updated',s.title);}
      else {const s={id:uid(),...payload,created:now(),steps:[]};db.seeds.unshift(s);log('seed','A new seed was planted',s.title);}
      save();closeModal();navigate('seeds');toast(id?'Seed updated':'Seed planted');
    } else if(form.id==='transactionForm') {
      const amount=Math.round(Number(data.get('amount'))*100)/100;
      if(!Number.isFinite(amount)||amount<=0||amount>999999999)return toast('Enter a valid positive amount.',true);
      const type=data.get('type')==='expense'?'expense':'income';
      const description=safeString(data.get('description'),300).trim();if(!description)return;
      const seedId=String(data.get('seedId')||'');
      db.transactions.unshift({id:uid(),type,amount,description,seedId:db.seeds.some(s=>s.id===seedId)?seedId:'',created:now()});
      log('finance',type==='income'?'Income recorded':'Expense recorded',money(amount)+' · '+description);
      save();closeModal();toast(type==='income'?'Income added':'Expense added');
    } else if(form.id==='taskForm') {
      const s=db.seeds.find(x=>x.id===String(data.get('seedId')));if(!s)return;
      const step=safeString(data.get('text'),300).trim();if(!step)return;
      s.steps.push({id:uid(),text:step,done:false});log('task','New step added',step);
      save();showSeedDetail(s.id);toast('Step added');
    } else if(form.id==='noteForm') {
      const title=safeString(data.get('title'),150).trim();if(!title)return;
      log('note',title,safeString(data.get('description'),500).trim());
      save();closeModal();toast('Journal note saved');
    }
  });
  $('importFile').addEventListener('change',async(e)=>{
    const file=e.target.files && e.target.files[0];if(!file)return;
    try {
      if(file.size>4000000)throw Error('File is too large');
      const parsed=normalize(JSON.parse(await file.text()));
      if(!confirm('Import this backup? It will replace the data in this browser.'))return;
      db=parsed;save();navigate('overview');toast('Grove restored from backup');
    }catch(err){toast('Could not import this backup: '+err.message,true);}
    finally{e.target.value='';}
  });
  $('menuButton').addEventListener('click',()=>{$('sidebar').classList.toggle('open');$('mobileShade').classList.toggle('show');});
  $('mobileShade').addEventListener('click',closeMenu);
  $('modalBackdrop').addEventListener('click',(e)=>{if(e.target===$('modalBackdrop'))closeModal();});
  document.addEventListener('keydown',(e)=>{if(e.key==='Escape'){closeModal();closeMenu();}});
  window.addEventListener('hashchange',()=>navigate(location.hash.replace('#','')));
  render();navigate(location.hash.replace('#','')||'overview');
  // Ensure prototype starter is persistently stored only after rendering successfully.
  try{if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(db));}catch(e){}
})();
