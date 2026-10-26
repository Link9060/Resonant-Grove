/* Read-only public Grove weekly Seed plans; never transmits credentials. */
(() => {
  'use strict';
  const list=document.getElementById('groveWeeklySeedEntries');
  const status=document.getElementById('groveWeeklySeedStatus');
  if(!list||!status)return;
  const endpoint='https://api.github.com/repos/Link9060/Resonant-Grove/issues?state=all&labels=grove-seed-draft&per_page=12';
  fetch(endpoint,{headers:{Accept:'application/vnd.github+json'},credentials:'omit'})
    .then(resp=>{if(!resp.ok)throw Error('GitHub unavailable');return resp.json();})
    .then(data=>{
      if(!Array.isArray(data))throw Error('Invalid feed');
      const issues=data.filter(issue=>issue?.user?.login==='github-actions[bot]'&&
        /^\[GROVE-SEED\] \d{4}-W\d{2}$/.test(issue.title||'')&&
        Number.isSafeInteger(issue.number)&&issue.number>0
      ).slice(0,4);
      list.replaceChildren();
      if(!issues.length){
        status.textContent='No weekly Seed plans yet. Keeper waits for a valid Scout research batch.';
        return;
      }
      status.textContent='Internal experiment plans from recent unverified research · no sales or launches';
      for(const entry of issues){
        const li=document.createElement('li');
        const a=document.createElement('a');
        a.href='https://github.com/Link9060/Resonant-Grove/issues/'+entry.number;
        a.rel='noopener noreferrer';a.target='_blank';
        a.textContent='Internal Seed · '+entry.title.slice('[GROVE-SEED] '.length);
        li.append(a);
        const note=document.createElement('small');
        const body=typeof entry.body==='string'?entry.body:'';
        const title=body.match(/^\*\*Selected concept:\*\* ([^\r\n]{12,140})$/m);
        note.textContent=(title?title[1].slice(0,100)+' · ':'')+
          'review required · no verified demand';
        li.append(note);list.append(li);
      }
    })
    .catch(()=>{status.textContent='Weekly Seed journal unavailable. Check the GitHub experiment archive.';});
})();
