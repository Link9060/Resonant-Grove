/* Read-only public Grove prototype journal; no credentials or write operations. */
(()=>{
 'use strict';
 const list=document.getElementById('groveBuildEntries'),status=document.getElementById('groveBuildStatus');
 if(!list||!status)return;
 const repo='https://github.com/Link9060/Resonant-Grove';
 const url='https://api.github.com/repos/Link9060/Resonant-Grove/issues?state=all&labels=grove-prototype-draft&per_page=30';
 fetch(url,{credentials:'omit',headers:{Accept:'application/vnd.github+json'}})
  .then(r=>{if(!r.ok)throw Error('GitHub not reachable');return r.json();})
  .then(issues=>{
   if(!Array.isArray(issues))throw Error('Bad issue feed');
   const records=issues.filter(i=>i?.user?.login==='github-actions[bot]'&&
    /^\[GROVE-PROTOTYPE\] #\d+ \/ (?:[1-9]|1[0-2])$/.test(i.title||'')&&
    Number.isSafeInteger(i.number)&&i.number>0).slice(0,6);
   list.replaceChildren();
   if(!records.length){
    status.textContent='No automated approved-idea prototypes yet. Submit the prefilled owner batch issue to start.';
    return;
   }
   status.textContent='Recent offline drafts · review required · no public product launches or verified sales';
   for(const item of records){
    const li=document.createElement('li'),a=document.createElement('a');
    a.href=repo+'/issues/'+item.number;
    a.target='_blank';a.rel='noopener noreferrer';
    const match=(item.body||'').match(/^\*\*Idea:\*\* ([^\r\n]{1,120})$/m);
    a.textContent=match?match[1]:'Grove internal draft #'+item.number;
    const small=document.createElement('small');
    small.textContent='Build archive linked in issue · not reviewed or launched';
    li.append(a,small);list.append(li);
   }
  })
  .catch(()=>{status.textContent='Prototype journal could not load. Open the GitHub archive below.';});
})();
