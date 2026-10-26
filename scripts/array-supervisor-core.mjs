/**
 * ARRAY Supervisor v1: deterministic, auditable 15-minute mission controller.
 * Does NOT access a ChatGPT conversation, Codex cloud, or OpenAI subscription.
 * Only user-authored, explicitly labeled GitHub issues can be dispatched.
 */
const OWNER='Link9060';
const LABEL_READY='array-ready';
const LABEL_SENT='array-dispatched';
const isLabel=(issue,name)=>Array.isArray(issue.labels)&&issue.labels.some(l=>(typeof l==='string'?l:l?.name)===name);

export function classifyQueueIssue(issue){
  if(!issue||issue.state!=='open'||issue.user?.login!==OWNER||
    typeof issue.title!=='string'||!issue.title.startsWith('[ARRAY-QUEUE] ')||
    typeof issue.body!=='string'||issue.body.trim().length<12||
    Buffer.byteLength(issue.body)>1200||issue.pull_request||
    !Number.isSafeInteger(issue.number)||issue.number<1||
    !isLabel(issue,LABEL_READY)||isLabel(issue,LABEL_SENT))return null;
  const copy=isLabel(issue,'array-copy');
  const code=isLabel(issue,'array-code');
  if(copy===code)return null; // Exactly one mode label required.
  return {number:issue.number,objective:issue.body,mode:code?'code':'copy',title:issue.title};
}

const fromMs=v=>typeof v==='string'&&!Number.isNaN(Date.parse(v))?Date.parse(v):0;

export function decideSupervisor({issues=[],pulls=[],runs=[],now=Date.now(),enabled=false}){
  if(!Array.isArray(issues)||!Array.isArray(pulls)||!Array.isArray(runs))
    throw Error('GitHub API returned an invalid collection.');
  const builder=runs.filter(r=>r?.name==='ARRAY Builder (local Ollama, review-only)');
  const openBuilderPrs=pulls.filter(p=>p?.state==='open'&&
    typeof p?.head?.ref==='string'&&p.head.ref.startsWith('array/builder-'));
  const active=builder.filter(r=>r?.status==='queued'||r?.status==='in_progress'||r?.status==='waiting');
  const stalled=active.filter(r=>now-fromMs(r.run_started_at||r.created_at)>60*60*1000&&
    fromMs(r.run_started_at||r.created_at)>0);
  const recent=builder.filter(r=>fromMs(r.created_at)>now-24*60*60*1000);
  const ready=issues.map(classifyQueueIssue).filter(Boolean).sort((a,b)=>a.number-b.number);
  const state={enabled,active:active.map(r=>r.id),stalled:stalled.map(r=>r.id),
    reviewPrs:openBuilderPrs.map(p=>p.number),ready:ready.map(i=>i.number),
    runs24h:recent.length,dispatch:null,reason:'',action:'observe'};
  if(!enabled){state.reason='Automatic task dispatch is OFF. Monitoring only.';return state;}
  if(stalled.length){state.reason='A Builder run may be stalled; do not pile on new missions.';return state;}
  if(active.length){state.reason='Builder is already running.';return state;}
  if(openBuilderPrs.length){state.reason='Unreviewed Builder PRs exist. Pause dispatch to avoid a growing review backlog.';return state;}
  if(recent.length>=4){state.reason='Daily dispatch budget reached (4 Builder runs per 24 hours).';return state;}
  const latest=Math.max(0,...recent.map(r=>fromMs(r.created_at)));
  if(latest&&now-latest<60*60*1000){state.reason='One-hour cooldown between Builder missions.';return state;}
  if(!ready.length){state.reason='No owner-approved queue issue with array-ready and exactly one mode label.';return state;}
  state.dispatch=ready[0];state.action='dispatch';
  state.reason='One owner-approved task is ready; dispatch exactly once.';
  return state;
}

export const SUPERVISOR_LABELS=Object.freeze({LABEL_READY,LABEL_SENT});
