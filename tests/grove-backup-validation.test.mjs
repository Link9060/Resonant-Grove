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

test('malformed backup identifiers and timestamps are rejected rather than stringified', () => {
  const invalid = [null, 12, false, {}, []];
  for (const value of invalid) {
    for (const field of ['id', 'created']) {
      assert.throws(() => normalize({...empty(), seeds:[{[field]:value}]}), /invalid records/);
      assert.throws(() => normalize({...empty(), transactions:[{type:'income',amount:1,[field]:value}]}), /invalid records/);
      assert.throws(() => normalize({...empty(), activity:[{[field]:value}]}), /invalid records/);
    }
    assert.throws(() => normalize({...empty(), seeds:[{steps:[{id:value}]}]}), /invalid records/);
    assert.throws(() => normalize({...empty(), transactions:[{type:'income',amount:1,seedId:value}]}), /invalid records/);
  }
  const restored=normalize({...empty(),seeds:[{id:'seed-1',created:'2026-11-07',steps:[{id:'task-1'}]}],transactions:[{id:'tx-1',type:'income',amount:1,seedId:'seed-1'}],activity:[{id:'journal-1'}]});
  assert.equal(restored.seeds[0].id,'seed-1');
  assert.equal(restored.seeds[0].steps[0].id,'task-1');
  assert.equal(restored.transactions[0].seedId,'seed-1');
  assert.equal(restored.activity[0].id,'journal-1');
});

test('duplicate explicit backup identifiers are rejected before records can be confused', () => {
  const cases = [
    {seeds:[{id:'same'},{id:'same'}]},
    {seeds:[{id:'seed',steps:[{id:'step'},{id:'step'}]}]},
    {transactions:[{id:'same',type:'income',amount:1},{id:'same',type:'expense',amount:2}]},
    {activity:[{id:'same'},{id:'same'}]}
  ];
  for (const patch of cases) {
    assert.throws(() => normalize({...empty(),...patch}), /duplicate identifiers/);
  }
  const valid = normalize({...empty(),seeds:[
    {id:'seed-1',steps:[{id:'task-1'}]},
    {id:'seed-2',steps:[{id:'task-1'}]}
  ],transactions:[{id:'tx-1',type:'income',amount:1}]});
  assert.equal(valid.seeds.length,2, 'step IDs are scoped to their Seed');
  assert.equal(normalize({...empty(),seeds:[{},{}]}).seeds.length,2, 'legacy missing IDs remain importable');
});


test('overlong identifiers cannot collide after import normalization', () => {
  const prefix = 'a'.repeat(90);
  const cases = [
    {seeds:[{id:prefix+'1'},{id:prefix+'2'}]},
    {seeds:[{steps:[{id:prefix+'1'},{id:prefix+'2'}]}]},
    {transactions:[{id:prefix+'1',type:'income',amount:1}]},
    {activity:[{id:prefix+'1'}]},
    {transactions:[{type:'income',amount:1,seedId:prefix+'1'}]}
  ];
  for (const patch of cases) {
    assert.throws(() => normalize({...empty(),...patch}), /invalid records/);
  }
  const maxLength = 'z'.repeat(90);
  assert.equal(normalize({...empty(),seeds:[{id:maxLength}]}).seeds[0].id,maxLength);
});

test('overlong imported text is rejected rather than silently truncated', () => {
  const cases = [
    {seeds:[{title:'x'.repeat(101)}]},
    {seeds:[{description:'x'.repeat(1001)}]},
    {seeds:[{category:'x'.repeat(61)}]},
    {seeds:[{steps:[{text:'x'.repeat(301)}]}]},
    {transactions:[{type:'income',amount:1,description:'x'.repeat(301)}]},
    {activity:[{title:'x'.repeat(151)}]},
    {activity:[{description:'x'.repeat(501)}]}
  ];
  for (const patch of cases) {
    assert.throws(() => normalize({...empty(),...patch}), /invalid records/);
  }
  const valid=normalize({...empty(),seeds:[{
    title:'x'.repeat(100),description:'x'.repeat(1000),category:'x'.repeat(60),
    steps:[{text:'x'.repeat(300)}]
  }],transactions:[{type:'income',amount:1,description:'x'.repeat(300)}],
  activity:[{title:'x'.repeat(150),description:'x'.repeat(500)}]});
  assert.equal(valid.seeds[0].description.length,1000);
  assert.equal(valid.seeds[0].steps[0].text.length,300);
  assert.equal(valid.transactions[0].description.length,300);
  assert.equal(valid.activity[0].description.length,500);
});


test('created timestamps preserve the 50-character storage boundary without silent truncation', () => {
  const valid = '2'.repeat(50);
  const tooLong = '2'.repeat(51);
  for (const section of ['seeds', 'transactions', 'activity']) {
    const item = section === 'seeds' ? {id:'s1',title:'Seed',steps:[]} :
      section === 'transactions' ? {id:'x1',type:'income',amount:1} : {id:'a1',type:'note'};
    const accepted = normalize({...empty(),[section]:[{...item,created:valid}]});
    assert.equal(accepted[section][0].created,valid);
    assert.throws(() => normalize({...empty(),[section]:[{...item,created:tooLong}]}),/invalid records/);
  }
});

test('late malformed records reject the complete backup without mutating the source', () => {
  const backup = {
    ...empty(),
    seeds:[{id:'seed-a',title:'Keep',steps:[{id:'step-a',text:'Plan',done:false}]}],
    transactions:[
      {id:'tx-a',type:'income',amount:25,seedId:'seed-a'},
      {id:'tx-b',type:'expense',amount:4,seedId:'seed-a',description:'Expense'}
    ],
    activity:[{id:'log-a',type:'note',title:'Keep log'}]
  };
  const snapshot = JSON.stringify(backup);
  assert.equal(normalize(backup).transactions.length,2);
  assert.equal(JSON.stringify(backup),snapshot,'successful normalization must not mutate input');
  const malformed = JSON.parse(snapshot);
  malformed.transactions[1].amount = '4';
  assert.throws(()=>normalize(malformed),/invalid records/);
  assert.equal(JSON.stringify(backup),snapshot,'failed import must not mutate the original backup');
  const malformedActivity = JSON.parse(snapshot);
  malformedActivity.activity.push({id:'log-b',type:'invalid'});
  assert.throws(()=>normalize(malformedActivity),/invalid records/);
  assert.equal(JSON.stringify(malformedActivity.activity[0]),JSON.stringify(backup.activity[0]));
});


test('explicit empty identifiers and timestamps reject instead of silently generating replacements', () => {
  for (const field of ['id','created']) {
    assert.throws(() => normalize({...empty(),seeds:[{[field]:''}]}),/invalid records/);
    assert.throws(() => normalize({...empty(),transactions:[{type:'income',amount:1,[field]:''}]}),/invalid records/);
    assert.throws(() => normalize({...empty(),activity:[{[field]:''}]}),/invalid records/);
  }
  assert.throws(() => normalize({...empty(),seeds:[{steps:[{id:''}]}]}),/invalid records/);
  // An empty transaction seedId means an unassigned/general transaction.
  assert.equal(normalize({...empty(),transactions:[{type:'income',amount:1,seedId:''}]}).transactions[0].seedId,'');
  // Missing legacy IDs and timestamps still receive generated defaults.
  const restored=normalize({...empty(),seeds:[{steps:[{}]}],transactions:[{type:'expense',amount:1}],activity:[{}]});
  assert.ok(restored.seeds[0].id);
  assert.ok(restored.seeds[0].created);
  assert.ok(restored.seeds[0].steps[0].id);
  assert.ok(restored.transactions[0].id);
  assert.ok(restored.activity[0].created);
});


test('whitespace-only identifiers and timestamps reject instead of creating unusable records', () => {
  for (const blank of [' ', '  ', '\t', '\n']) {
    for (const field of ['id','created']) {
      assert.throws(() => normalize({...empty(),seeds:[{[field]:blank}]}),/invalid records/);
      assert.throws(() => normalize({...empty(),transactions:[{type:'income',amount:1,[field]:blank}]}),/invalid records/);
      assert.throws(() => normalize({...empty(),activity:[{[field]:blank}]}),/invalid records/);
    }
    assert.throws(() => normalize({...empty(),seeds:[{steps:[{id:blank}]}]}),/invalid records/);
  }
  // Existing meaningful values with surrounding whitespace remain unchanged.
  const valid = normalize({...empty(),seeds:[{id:' seed-1 ',created:' 2026-11-07 '}],
    transactions:[{id:' tx-1 ',type:'income',amount:1,seedId:''}]});
  assert.equal(valid.seeds[0].id,' seed-1 ');
  assert.equal(valid.seeds[0].created,' 2026-11-07 ');
  assert.equal(valid.transactions[0].seedId,'');
});


test('transaction Seed references reject whitespace-only values while preserving unassigned and meaningful IDs', () => {
  for (const seedId of [' ', '\t', '\n', '   ']) {
    assert.throws(() => normalize({...empty(),transactions:[{type:'income',amount:1,seedId}]}),/invalid records/);
  }
  assert.equal(normalize({...empty(),transactions:[{type:'income',amount:1,seedId:''}]}).transactions[0].seedId,'');
  assert.equal(normalize({...empty(),transactions:[{type:'income',amount:1,seedId:' seed-a '}]}).transactions[0].seedId,' seed-a ');
  assert.equal(normalize({...empty(),transactions:[{type:'income',amount:1}]}).transactions[0].seedId,'');
});


test('workspace collection boundaries accept the maximum without silently dropping records', () => {
  const seeds = Array.from({length:500},(_,i)=>({id:'seed-'+i,title:'Seed '+i,steps:[]}));
  const transactions = Array.from({length:10000},(_,i)=>({id:'tx-'+i,type:'income',amount:1,seedId:''}));
  const activity = Array.from({length:1000},(_,i)=>({id:'activity-'+i,type:'note',title:'Entry '+i}));
  const atLimit = normalize({...empty(),seeds,transactions,activity});
  assert.equal(atLimit.seeds.length,500);
  assert.equal(atLimit.transactions.length,10000);
  assert.equal(atLimit.activity.length,1000);
  for (const section of ['seeds','transactions','activity']) {
    const overLimit = {...empty(),[section]:[...atLimit[section],atLimit[section][0]]};
    assert.throws(()=>normalize(overLimit),/workspace limits/);
  }
  const steps = Array.from({length:100},(_,i)=>({id:'step-'+i,text:'Step '+i,done:false}));
  assert.equal(normalize({...empty(),seeds:[{id:'seed-steps',steps}]}).seeds[0].steps.length,100);
  assert.throws(()=>normalize({...empty(),seeds:[{id:'seed-steps',steps:[...steps,{id:'step-101',text:'Extra'}]}]}),/invalid records/);
});


test('activity logging retains newest 1000 entries without making backups unrestorable', () => {
  const logStart = source.indexOf('  function log(type,title,description) {');
  const logEnd = source.indexOf('\n  function total(type)', logStart);
  assert.ok(logStart >= 0 && logEnd > logStart, 'real activity logger must be present');
  const createLogger = runInNewContext(
    '(function(db){const uid=(()=>{let n=0;return ()=>\'log-\'+(++n)})();' +
    'const now=()=>\'2026-11-10T00:00:00Z\';' +
    source.slice(logStart, logEnd) + ';return log;})'
  );
  const workspace = empty();
  const log = createLogger(workspace);
  for (let i=0;i<1002;i++) log('note','Entry '+i,'Recorded');
  assert.equal(workspace.activity.length,1000);
  assert.equal(workspace.activity[0].title,'Entry 1001');
  assert.equal(workspace.activity.at(-1).title,'Entry 2');
  const restored = normalize(workspace);
  assert.equal(restored.activity.length,1000);
  assert.equal(restored.activity[0].title,'Entry 1001');
});


test('activity rollover retains existing journal entries until the 1000-entry boundary', () => {
  const logStart = source.indexOf('  function log(type,title,description) {');
  const logEnd = source.indexOf('\n  function total(type)', logStart);
  assert.ok(logStart >= 0 && logEnd > logStart, 'real activity logger must be present');
  const createLogger = runInNewContext(
    '(function(db){let nextId=0;const uid=()=>\'new-entry-\'+(++nextId);const now=()=>\'2026-11-11T00:00:00Z\';' +
    source.slice(logStart,logEnd) + ';return log;})'
  );
  const workspace = {...empty(), activity:Array.from({length:999},(_,i)=>({id:'old-'+i,type:'note',title:'Old '+i}))};
  const log = createLogger(workspace);
  log('note','Newest','First new entry');
  assert.equal(workspace.activity.length,1000);
  assert.equal(workspace.activity[0].title,'Newest');
  assert.equal(workspace.activity.at(-1).title,'Old 998');
  assert.equal(normalize(workspace).activity.length,1000);
  log('note','Newest again','Second new entry');
  assert.equal(workspace.activity.length,1000);
  assert.equal(workspace.activity[0].title,'Newest again');
  assert.equal(workspace.activity.at(-1).title,'Old 997');
  assert.equal(normalize(workspace).activity.length,1000);
});
