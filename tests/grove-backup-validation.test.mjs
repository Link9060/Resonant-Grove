import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the real workspace normalizer without a browser or external services.
const source = readFileSync('app.js', 'utf8');
const start = source.indexOf('  function normalize(raw) {');
const end = source.indexOf('\n  function read() {', start);
assert.ok(start >= 0 && end > start, 'workspace normalizer must be present');
const normalize = runInNewContext(
  '(function(){const allowedStatuses=[\'active\',\'idea\',\'retired\'];' +
  'const safeString=(s,max=400)=>String(s==null?\'\':s).slice(0,max);' +
  'const uid=()=>\'generated-id\';const now=()=>\'2026-11-06T00:00:00Z\';' +
  source.slice(start,end) + ';return normalize;})()'
);
const empty = () => ({version:1,seeds:[],transactions:[],activity:[]});

test('valid Grove v1 backup remains importable', () => {
  const data = empty();
  data.seeds.push({id:'s1',title:'Test',steps:[{id:'t1',text:'Ship',done:false}]});
  data.transactions.push({id:'x1',type:'income',amount:10,description:'Test'});
  const result=normalize(data);
  assert.equal(result.seeds[0].title,'Test');
  assert.equal(result.transactions[0].amount,10);
});

test('unsupported or malformed backups fail before replacing workspace', () => {
  assert.throws(()=>normalize({...empty(),version:2}),/Unsupported Grove backup version/);
  assert.throws(()=>normalize({...empty(),seeds:[null]}),/invalid records/);
  assert.throws(()=>normalize({...empty(),transactions:[null]}),/invalid records/);
  assert.throws(()=>normalize({...empty(),activity:[42]}),/invalid records/);
  assert.throws(()=>normalize({...empty(),seeds:[{steps:[null]}]}),/invalid records/);
});

test('oversized backups fail rather than silently losing records', () => {
  assert.throws(()=>normalize({...empty(),seeds:Array(501).fill({steps:[]})}),/workspace limits/);
  assert.throws(()=>normalize({...empty(),transactions:Array(10001).fill({})}),/workspace limits/);
  assert.throws(()=>normalize({...empty(),activity:Array(1001).fill({})}),/workspace limits/);
  assert.throws(()=>normalize({...empty(),seeds:[{steps:Array(101).fill({})}]}),/invalid records/);
});

test('invalid financial records are rejected instead of silently discarded or altered', () => {
  for (const amount of [0,-1,NaN,Infinity,'10',1000000000]) {
    assert.throws(()=>normalize({...empty(),transactions:[{type:'income',amount}]}),/invalid records/);
  }
  assert.throws(()=>normalize({...empty(),transactions:[{type:'unknown',amount:10}]}),/invalid records/);
  const transactions=[{id:'a',type:'income',amount:12.5},{id:'b',type:'expense',amount:3}];
  const result=normalize({...empty(),transactions});
  assert.equal(result.transactions.length,2);
  assert.equal(result.transactions[0].amount,12.5);
  assert.equal(result.transactions[1].type,'expense');
});
