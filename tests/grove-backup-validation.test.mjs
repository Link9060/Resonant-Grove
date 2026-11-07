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

test('invalid Seed revenue goals reject the whole backup instead of silently changing targets', () => {
  for (const goal of [-1, NaN, Infinity, '25', 1000000000]) {
    assert.throws(() => normalize({...empty(),seeds:[{id:'s1',title:'Goal test',goal,steps:[]}]}), /invalid records/);
  }
  const result=normalize({...empty(),seeds:[{id:'s1',title:'Goal test',goal:25.5,steps:[]}]});
  assert.equal(result.seeds[0].goal,25.5);
  assert.equal(normalize({...empty(),seeds:[{goal:0}]}).seeds[0].goal,0);
});

test('Seed step completion flags must be booleans to avoid silent progress changes', () => {
  for (const done of ['false', 'true', 0, 1, null, {}, []]) {
    assert.throws(() => normalize({...empty(),seeds:[{steps:[{id:'step',text:'Test',done}]}]}), /invalid records/);
  }
  const result = normalize({...empty(),seeds:[{steps:[{done:false},{done:true},{}]}]});
  assert.equal(result.seeds[0].steps[0].done, false);
  assert.equal(result.seeds[0].steps[1].done, true);
  assert.equal(result.seeds[0].steps[2].done, false);
});

test('activity categories must be recognized to prevent silent journal rewrites', () => {
  for (const type of ['unknown', '', null, 12, {}, []]) {
    assert.throws(() => normalize({...empty(),activity:[{id:'a1',type,title:'Original entry'}]}), /invalid records/);
  }
  for (const type of ['seed','finance','note','start','task','update']) {
    const result=normalize({...empty(),activity:[{id:'a1',type,title:'Original entry'}]});
    assert.equal(result.activity[0].type,type);
    assert.equal(result.activity[0].title,'Original entry');
  }
  assert.equal(normalize({...empty(),activity:[{title:'Legacy entry'}]}).activity[0].type,'note');
});


test('Seed status values must be recognized to avoid silent lifecycle changes', () => {
  for (const status of ['unknown', '', null, 12, {}, []]) {
    assert.throws(() => normalize({...empty(), seeds:[{id:'s1',status,steps:[]}]}), /invalid records/);
  }
  for (const status of ['active','idea','retired']) {
    const result=normalize({...empty(),seeds:[{id:'s1',status,steps:[]}]});
    assert.equal(result.seeds[0].status,status);
  }
  assert.equal(normalize({...empty(),seeds:[{id:'legacy',steps:[]}]}).seeds[0].status,'idea');
});


test('Seed task text must not be silently converted from non-string values', () => {
  for (const text of [null, 12, false, {}, []]) {
    assert.throws(() => normalize({...empty(),seeds:[{steps:[{id:'task',text,done:false}]}]}), /invalid records/);
  }
  const result=normalize({...empty(),seeds:[{steps:[{text:'Keep original',done:false},{}]}]});
  assert.equal(result.seeds[0].steps[0].text,'Keep original');
  assert.equal(result.seeds[0].steps[1].text,'');
});


test('Seed titles must not be silently converted from malformed values', () => {
  for (const title of [null, 42, false, {}, []]) {
    assert.throws(() => normalize({...empty(),seeds:[{id:'seed',title,steps:[]}]}), /invalid records/);
  }
  const restored=normalize({...empty(),seeds:[{title:'Original title',steps:[]}, {steps:[]}]});
  assert.equal(restored.seeds[0].title,'Original title');
  assert.equal(restored.seeds[1].title,'Untitled seed');
});

test('descriptive backup fields must remain strings, not coerced values', () => {
  const cases = [
    {seeds:[{description:{unexpected:'object'}}]},
    {seeds:[{category:42}]},
    {transactions:[{type:'income',amount:10,description:false}]},
    {activity:[{title:[]} ]},
    {activity:[{description:null}]}
  ];
  for (const patch of cases) {
    assert.throws(() => normalize({...empty(),...patch}), /invalid records/);
  }
  const valid = normalize({
    ...empty(),
    seeds:[{description:'Keep seed description',category:'Experiment'}],
    transactions:[{type:'expense',amount:3,description:'Keep transaction memo'}],
    activity:[{title:'Keep journal title',description:'Keep journal description'}]
  });
  assert.equal(valid.seeds[0].description,'Keep seed description');
  assert.equal(valid.seeds[0].category,'Experiment');
  assert.equal(valid.transactions[0].description,'Keep transaction memo');
  assert.equal(valid.activity[0].title,'Keep journal title');
  assert.equal(valid.activity[0].description,'Keep journal description');
});
