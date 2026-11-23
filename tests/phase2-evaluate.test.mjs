import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateVenture,CRITERIA} from '../phase2/evaluate.mjs';
const sample=()=>({id:'offline-inventory',title:'Offline inventory count worksheet',
 evidence:[{kind:'hypothesis',statement:'A local counter could help hobby sellers.'},{kind:'source',statement:'Browser storage reference, not market validation.',url:'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage',accessed:'2026-11-14'}],
 ratings:Object.fromEntries(CRITERIA.map(k=>[k,{score:2,rationale:'Plausible for a bounded offline prototype.',evidenceIds:[0]}]))});
test('deterministic rubric and hard gates',()=>{const a=evaluateVenture(sample());assert.deepEqual(evaluateVenture(sample()),a);assert.equal(a.total,14);assert.equal(a.max,21);assert.equal(a.demandVerified,false);assert.equal(a.permissions.publish,false);assert.equal(a.breakdown.demand.hasSource,false);});
test('source citation never becomes verified demand',()=>{const x=sample();x.ratings.demand.evidenceIds=[1];const a=evaluateVenture(x);assert.equal(a.breakdown.demand.hasSource,true);assert.equal(a.demandVerified,false);});
test('reject invalid evidence references and score bounds',()=>{const a=sample();a.ratings.risk.score=4;assert.throws(()=>evaluateVenture(a));const b=sample();b.ratings.demand.evidenceIds=[999];assert.throws(()=>evaluateVenture(b));const c=sample();c.evidence[1].accessed='2026-02-30';assert.throws(()=>evaluateVenture(c));});
test('reject incomplete rubric and hypothesis posing as source',()=>{const a=sample();delete a.ratings.risk;assert.throws(()=>evaluateVenture(a));const b=sample();b.evidence[0].url='https://example.com';assert.throws(()=>evaluateVenture(b));});
