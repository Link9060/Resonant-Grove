/**
 * Grove Seed Keeper policy engine: select a weekly internal plan from genuine
 * bot-authored Scout issues. Issue bodies remain untrusted DATA, not commands.
 * Never makes model calls or purchases or publishes a business offer.
 */
const SCOUT_PREFIX='[GROVE-SCOUT] ';
const SEED_PREFIX='[GROVE-SEED] ';
const REPO='Link9060/Resonant-Grove';
const BOT='github-actions[bot]';
const WEEK_MS=7*86400000;
const boundedLine=value=>typeof value==='string'&&value.trim().length>=12&&
  value.length<=140&&!/[\[\]{}<>\\\x60\r\n]/.test(value)?value.trim():null;
function dateMs(date){
  const ms=Date.parse(date+'T00:00:00.000Z');
  return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===date?ms:null;
}
export function weekKey(input){
  const date=new Date(input);
  if(Number.isNaN(date.getTime()))throw Error('Invalid week reference date');
  const day=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
  const weekday=day.getUTCDay()||7;
  day.setUTCDate(day.getUTCDate()+4-weekday);
  const year=day.getUTCFullYear();
  const week=Math.ceil((((day.getTime()-Date.UTC(year,0,1))/86400000)+1)/7);
  return year+'-W'+String(week).padStart(2,'0');
}
export function alreadyHasWeeklySeed(issues,week){
  if(!Array.isArray(issues)||!/^\d{4}-W\d{2}$/.test(week))throw Error('Invalid weekly issue history');
  return issues.some(i=>i?.state!=='deleted'&&!i?.pull_request&&i?.title===SEED_PREFIX+week);
}
export function parseScoutIssue(issue,now){
  if(!issue||issue.pull_request||issue.user?.login!==BOT||
    !Number.isSafeInteger(issue.number)||issue.number<1||
    typeof issue.title!=='string'||!issue.title.startsWith(SCOUT_PREFIX)||
    !Array.isArray(issue.labels)||!issue.labels.some(l=>(typeof l==='string'?l:l?.name)==='grove-scout')||
    typeof issue.body!=='string'||issue.body.length>15000||
    typeof issue.created_at!=='string')return null;
  const issueDate=issue.title.slice(SCOUT_PREFIX.length);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(issueDate))return null;
  const day=dateMs(issueDate),created=Date.parse(issue.created_at),current=new Date(now).getTime();
  if(day===null||!Number.isFinite(created)||!Number.isFinite(current)||
    new Date(created).toISOString().slice(0,10)!==issueDate||
    created>current||current-created>=WEEK_MS)return null;
  const decision=issue.body.match(/^\*\*Decision:\*\* Candidate ([1-3]) selected for an offline prototype draft\.$/m);
  const title=issue.body.match(/^\*\*Selection:\*\* ([^\r\n]{12,140})$/m);
  const score=issue.body.match(/^\*\*Selected score:\*\* (\d{1,2})\/12 points \(wording-based rubric\)\.$/m);
  const source=issue.body.match(/^\*\*Source:\*\* (Unverified local model output\.|Curated fallback template, not AI output\.)$/m);
  if(!decision||!title||!score||!source)return null;
  const safeTitle=boundedLine(title[1]),n=Number(score[1]);
  if(!safeTitle||n<4||n>12)return null;
  return {
    issueNumber:issue.number,date:issueDate,
    sourceUrl:'https://github.com/'+REPO+'/issues/'+issue.number,
    candidate:Number(decision[1]),title:safeTitle,
    draftReadiness:n,source:source[1].startsWith('Curated')?'curated-template-fallback':'local-model-unverified'
  };
}
export function selectWeeklySeed(issues,now){
  if(!Array.isArray(issues))throw Error('Invalid scout feed');
  const parsed=issues.map(i=>parseScoutIssue(i,now)).filter(Boolean);
  if(!parsed.length)return null;
  // Highest draft readiness wins, ties favor newest research.
  // This is NOT a commercial attractiveness rating.
  parsed.sort((a,b)=>b.draftReadiness-a.draftReadiness||
    b.date.localeCompare(a.date)||a.issueNumber-b.issueNumber);
  return parsed[0];
}
export function renderWeeklySeedIssue(week,seed){
  if(!/^\d{4}-W\d{2}$/.test(week)||!seed||
    !Number.isSafeInteger(seed.issueNumber)||seed.issueNumber<1||
    !boundedLine(seed.title)||!Number.isInteger(seed.candidate)||
    seed.candidate<1||seed.candidate>3||
    !Number.isInteger(seed.draftReadiness)||seed.draftReadiness<4||seed.draftReadiness>12||
    !/^https:\/\/github\.com\/Link9060\/Resonant-Grove\/issues\/\d+$/.test(seed.sourceUrl))
    throw Error('Invalid weekly Seed source');
  return [
    '# Grove Seed Keeper · '+week,'',
    '**INTERNAL EXPERIMENT DRAFT. NOT LAUNCHED, NOT SOLD, NOT VERIFIED.**','',
    '**Selected concept:** '+seed.title,
    '**Research source:** '+seed.sourceUrl,
    '**Source date:** '+seed.date,
    '**Source candidate:** #'+seed.candidate,
    '**Readiness rubric:** '+seed.draftReadiness+'/12, based on wording. Not revenue, demand, quality, risk, or profit potential.',
    '**Generation source:** '+(seed.source==='curated-template-fallback'?'Curated fallback, not an AI-generated original research finding.':'Unverified local model research draft.'),'',
    '## Internal stages','',
    '- [x] Find recent bounded Grove Scout research.',
    '- [x] Apply the documented draft-readiness rubric.',
    '- [x] Record the leading hypothesis and source provenance.',
    '- [ ] Review the associated offline printable draft.',
    '- [ ] Verify basic accuracy and originality, with independent sources where appropriate.',
    '- [ ] Confirm whether this solves an actual problem for a consenting tester; document negative findings too.',
    '- [ ] Revise or retire the idea based on genuine, recorded evidence.',
    '- [ ] Request separate review and appropriate authorization before any publication, customer outreach or commercial activity.','',
    '## Hard permissions','',
    '**$0 agent discretionary spending.** No orders, paid advertising, social publishing, unsolicited messages, customer lists, marketplace offers, subscriptions, payment/payout access, transfers or refunds.',
    'No automatic ARRAY Builder issue or array-ready label. No agent may approve its own release.',
    'Do not treat this issue as a verified Seed, storefront, investor report, payout balance or business-performance claim.','',
    '**Stopping rule:** Retire or revise when accuracy checks fail or genuine volunteer feedback shows insufficient utility. Do not fabricate verification.','',
    'Created by deterministic, rate-limited automation. The source issue is public research and may contain unverified model text. Human review remains required.'
  ].join('\n');
}
