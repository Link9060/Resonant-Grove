import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyQueueAuthorization, verifySupervisorDispatch } from '../scripts/array-queue-verify.mjs';
import { readFileSync } from 'node:fs';

const issue={
  number:24,state:'open',title:'[ARRAY-QUEUE] Improve a small visible message',
  user:{login:'Link9060'},body:'Improve the clarity of an existing short helper sentence.',
  labels:[{name:'array-ready'},{name:'array-dispatched'},{name:'array-copy'}],
};
const params={issue,objective:issue.body,mode:'copy'};
test('independently verifies exact owner task objective and mode',()=>{
  assert.equal(verifyQueueAuthorization(params),true);
  const authorized=verifySupervisorDispatch({
    actor:'github-actions[bot]',issueNumber:'24',objective:issue.body,
    mode:'copy',loadIssue:n=>{assert.equal(n,24);return issue;}
  });
  assert.equal(authorized,true);
});
test('rejects forged or revoked supervisor dispatch',()=>{
  for(const variant of [
    {...issue,user:{login:'attacker'}},
    {...issue,labels:issue.labels.filter(x=>x.name!=='array-ready')},
    {...issue,labels:issue.labels.filter(x=>x.name!=='array-dispatched')},
    {...issue,title:'[ARRAY] Injected task'},
    {...issue,state:'closed'},
  ])assert.throws(()=>verifyQueueAuthorization({...params,issue:variant}),/not an exact/);
  assert.throws(()=>verifyQueueAuthorization({...params,objective:'Altered objective'}),/not an exact/);
  assert.throws(()=>verifyQueueAuthorization({...params,mode:'code'}),/mode/);
  assert.throws(()=>verifySupervisorDispatch({actor:'github-actions[bot]',issueNumber:'',objective:issue.body,mode:'copy',loadIssue:()=>issue}),/unapproved/);
  assert.throws(()=>verifySupervisorDispatch({actor:'github-actions[bot]',issueNumber:'../../x',objective:issue.body,mode:'copy',loadIssue:()=>issue}),/Invalid/);
});
test('existing manual owner workflow dispatch remains supported',()=>{
  assert.equal(verifySupervisorDispatch({actor:'Link9060',issueNumber:'',objective:'Small improvement',mode:'copy',loadIssue:()=>{throw Error('unexpected query');}}),false);
});
test('workflow has a 15-minute cadence and separate worker and publication verification',()=>{
  const heartbeat=readFileSync('.github/workflows/array-supervisor.yml','utf8');
  const builder=readFileSync('.github/workflows/array-builder.yml','utf8');
  assert.match(heartbeat,/cron:\s*"7,22,37,52 \* \* \* \*"/);
  assert.match(heartbeat,/array-supervisor-v1/);
  assert.match(heartbeat,/actions: write/);
  assert.match(heartbeat,/node scripts\/array-supervisor\.mjs/);
  assert.match(builder,/supervisor_issue:/);
  assert.match(builder,/github.actor == 'github-actions\[bot\]'/);
  assert.equal((builder.match(/node scripts\/array-queue-verify\.mjs/g)||[]).length,2);
  assert.match(builder,/GH_TOKEN: \$\{\{ secrets.GITHUB_TOKEN \}\}/);
  assert.match(builder,/gh pr create --draft/);
  assert.doesNotMatch(builder,/gh pr merge/);
});
