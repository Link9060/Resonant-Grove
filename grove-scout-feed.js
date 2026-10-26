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
        const note=document.createElement('small');note.textContent='3 candidate hypotheses · GitHub verified';
        item.append(note);list.append(item);
      }
    }catch{
      status.textContent='The public GitHub journal is unavailable right now. Open the research archive directly.';
    }
  }
  read();
})();
