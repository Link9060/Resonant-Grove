/* Read-only public journal preview. Never sends credentials or issues writes. */
(() => {
  'use strict';
  const repo='https://github.com/Link9060/Resonant-Grove';
  const url='https://api.github.com/repos/Link9060/Resonant-Grove/issues?state=all&labels=grove-scout&per_page=12';
  const list=document.getElementById('groveScoutEntries');
  const status=document.getElementById('groveScoutStatus');
  if(!list||!status)return;
  function createLink(href,label){
    const a=document.createElement('a');
    a.href=href;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';
    return a;
  }
  async function read(){
    try{
      const resp=await fetch(url,{headers:{Accept:'application/vnd.github+json'},credentials:'omit'});
      if(!resp.ok)throw Error('GitHub returned '+resp.status);
      const data=await resp.json();
      if(!Array.isArray(data))throw Error('Unexpected response');
      const entries=data.filter(item=>item&&typeof item.title==='string'&&
        /^\[GROVE-SCOUT\] \d{4}-\d{2}-\d{2}$/.test(item.title)&&
        item.user?.login==='github-actions[bot]'&&
        typeof item.html_url==='string'&&
        /^https:\/\/github\.com\/Link9060\/Resonant-Grove\/issues\/[1-9]\d*$/.test(item.html_url)
      ).slice(0,5);
      list.replaceChildren();
      if(!entries.length){status.textContent='No autonomous research journal entries yet. The scout is scheduled daily.';return;}
      status.textContent='Latest '+entries.length+' research journal entries · unverified, no sales or marketing actions';
      for(const entry of entries){
        const item=document.createElement('li');
        const date=entry.title.slice('[GROVE-SCOUT] '.length);
        item.append(createLink(entry.html_url,'Research batch · '+date));
        const note=document.createElement('small');
        // New journal entries include a transparent scorecard. Keep all fetched
        // text inert: NEVER parse an issue body as HTML or executable instructions.
        const body=typeof entry.body==='string'?entry.body:'';
        const chosen=body.match(/^\*\*Decision:\*\* Candidate ([1-3]) selected for an offline prototype draft\.$/m);
        const selection=body.match(/^\*\*Selection:\*\* ([^\r\n]{1,140})$/m);
        const score=body.match(/^\*\*Selected score:\*\* (\d{1,2})\/12 points/m);
        if(chosen&&selection&&score&&Number(score[1])<=12){
          note.textContent='Internal Seed '+chosen[1]+': '+selection[1].slice(0,100)+
            ' · draft readiness '+score[1]+'/12 · unverified, not launched';
        }else{
          note.textContent='3 unverified hypotheses + 1 offline draft · no sales activity';
        }
        item.append(note);list.append(item);
      }
    }catch{
      status.textContent='The public GitHub journal is unavailable right now. Open the research archive directly.';
    }
  }
  read();
})();
