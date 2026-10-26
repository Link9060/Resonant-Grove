import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyQueueIssue, decideSupervisor } from '../scripts/array-supervisor-core.mjs';

const issue={
  number:24,state:'open',user:{login:'Link9060'},title:'[ARRAY-QUEUE] Tiny copy task',
  body:'Improve the clarity of an existing short helper sentence.',
  labels:[{name:'array-ready'},{name:'array-copy'}],
};
const base={issues:[issue],pulls:[],runs:[],enabled:true,now:Date.parse('2026-10-25T14:00:00Z')};

test('only explicitly labeled owner-created issues enter the task queue',()=>{
  assert.deepEqual(classifyQueueIssue(issue),{
    number:24,objective:issue.body,mode:'copy',title:issue.title,
  });
  const variants=[
    {...issue,user:{login:'someone-else'}},
    {...issue,title:'[ARRAY] Unsafe auto-start'},
    {...issue,labels:[]},
    {...issue,labels:[...issue.labels,{name:'array-dispatched'}]},
    {...issue,labels:[...issue.labels,{name:'array-code'}]},
    {...issue,labels:[{name:'array-ready'}]},
    {...issue,body:'too short'},
    {...issue,body:'x'.repeat(1201)},
    {...issue,pull_request:{url:'fake'}},
  ];
  for(const variant of variants)assert.equal(classifyQueueIssue(variant),null);
});

test('observes only until explicit queue selection',()=>{
  const report=decideSupervisor({...base,enabled:false});
  assert.equal(report.action,'observe');
  assert.equal(report.dispatch,null);
  assert.deepEqual(report.ready,[24]);
});

test('picks one task deterministically with the smallest issue number',()=>{
  const alternate={...issue,number:30,labels:[{name:'array-ready'},{name:'array-code'}]};
  const report=decideSupervisor({...base,issues:[alternate,issue]});
  assert.equal(report.action,'dispatch');
  assert.equal(report.dispatch.number,24);
  assert.equal(report.dispatch.mode,'copy');
});

test('never dispatches while open code PRs remain',()=>{
  const report=decideSupervisor({...base,pulls:[{state:'open',number:18,head:{ref:'array/builder-40158690034'}}]});
  assert.equal(report.action,'observe');
  assert.deepEqual(report.reviewPrs,[18]);
});

test('never launches parallel or stalled Builder runs',()=>{
  const run={id:1,name:'ARRAY Builder (local Ollama, review-only)',status:'in_progress',
    created_at:'2026-10-25T12:00:00Z',run_started_at:'2026-10-25T12:00:00Z'};
  const report=decideSupervisor({...base,runs:[run]});
  assert.equal(report.action,'observe');
  assert.deepEqual(report.stalled,[1]);
});

test('limits missions to four per 24h and separates by one hour',()=>{
  const at=base.now;
  const runs=Array.from({length:4},(_,i)=>({
    id:i+1,name:'ARRAY Builder (local Ollama, review-only)',status:'completed',
    created_at:new Date(at-(i+1)*90*60*1000).toISOString()
  }));
  assert.equal(decideSupervisor({...base,runs}).action,'observe');
  assert.match(decideSupervisor({...base,runs}).reason,/budget/);
  assert.equal(decideSupervisor({...base,runs:runs.slice(0,1)}).action,'dispatch');
  const soon=[{...runs[0],created_at:new Date(at-30*60*1000).toISOString()}];
  assert.match(decideSupervisor({...base,runs:soon}).reason,/cooldown/);
});

test('cannot dispatch once marked and never dispatches invalid GitHub responses',()=>{
  const marked={...issue,labels:[...issue.labels,{name:'array-dispatched'}]};
  assert.equal(decideSupervisor({...base,issues:[marked]}).action,'observe');
  assert.throws(()=>decideSupervisor({...base,runs:{}}));
});
