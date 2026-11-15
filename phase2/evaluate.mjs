/** Deterministic, offline, evidence-aware Phase 2 idea evaluation. */
export const CRITERIA=Object.freeze(['problem','demand','differentiation','feasibility','maintenance','discovery','risk']);
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const textOK=s=>typeof s==='string'&&s.trim().length>=12&&s.length<=600&&!/[<>\u0000-\u001f]/.test(s);
export function evaluateVenture(input){
  if(!input||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.id??'')||!textOK(input.title))throw Error('Invalid venture identity');
  if(!Array.isArray(input.evidence)||input.evidence.length>30)throw Error('Invalid evidence list');
  const evidence=input.evidence.map((e,i)=>{
    if(!e||!['source','hypothesis'].includes(e.kind)||!textOK(e.statement))throw Error('Invalid evidence '+i);
    if(e.kind==='hypothesis'){
      if(e.url!=null||e.accessed!=null||e.published!=null)throw Error('Hypothesis cannot impersonate a source');
      return {kind:e.kind,statement:e.statement.trim()};
    }
    if(typeof e.url!=='string'||!/^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(e.url)||e.url.length>400||!dateOK(e.accessed)||(e.published!=null&&!dateOK(e.published)))throw Error('Invalid source link or date');
    return {kind:e.kind,statement:e.statement.trim(),url:e.url,accessed:e.accessed,...(e.published?{published:e.published}:{})};
  });
  if(!input.ratings||typeof input.ratings!=='object'||Object.keys(input.ratings).length!==CRITERIA.length||Object.keys(input.ratings).some(k=>!CRITERIA.includes(k)))throw Error('Ratings must include exactly seven criteria');
  let total=0;const breakdown={};
  for(const key of CRITERIA){
    const r=input.ratings[key];
    if(!r||!Number.isInteger(r.score)||r.score<0||r.score>3||!textOK(r.rationale)||!Array.isArray(r.evidenceIds)||r.evidenceIds.length>30||!r.evidenceIds.every(i=>Number.isInteger(i)&&i>=0&&i<evidence.length))throw Error('Invalid '+key+' rating');
    const evidenceIds=[...new Set(r.evidenceIds)];
    breakdown[key]={score:r.score,max:3,rationale:r.rationale.trim(),evidenceIds,hasSource:evidenceIds.some(i=>evidence[i].kind==='source')};
    total+=r.score;
  }
  return {schemaVersion:1,id:input.id,title:input.title.trim(),total,max:21,breakdown,evidence,
    sourceLinked:evidence.some(e=>e.kind==='source'),demandVerified:false,customersVerified:false,revenueVerified:false,
    stage:'internal-development-only',
    warning:'Human-entered rubric scores and source links do not verify demand, accuracy, safety, legality or viability.',
    permissions:{launch:false,publish:false,sell:false,outreach:false,spend:false,collectPersonalData:false}};
}
