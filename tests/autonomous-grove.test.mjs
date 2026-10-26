import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync('index.html','utf8');
const app=readFileSync('app.js','utf8');
const logic=readFileSync('autonomous-grove.js','utf8');
const css=readFileSync('autonomous-grove.css','utf8');
const deploy=readFileSync('.github/workflows/deploy.yml','utf8');

test('venture lab navigation and scripts are connected to Grove',()=>{
  assert.match(html,/data-view="autonomous"/);
  assert.match(html,/id="view-autonomous"/);
  assert.match(app,/autonomous:'Autonomous Grove'/);
  assert.match(html,/src="autonomous-grove\.js" defer/);
  assert.match(html,/href="autonomous-grove\.css"/);
  for(const id of ['autoToggle','autoGenerate','autoIdeas','autoIdeaCount','autoCandidateCount','autoSelectedCount','autoNotice','autoActivity','autoExport']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
});
test('no phantom funds or outbound financial capability',()=>{
  assert.match(html,/Verified earnings/);
  assert.match(html,/No payment provider connected/);
  assert.match(html,/disabled title="Requires eligible payment account/);
  assert.match(html,/NOT CONNECTED/);
  assert.match(logic,/No AI model, accounts, or public actions were used/);
  assert.doesNotMatch(logic,/\bfetch\s*\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon|paypal\.com|stripe\.com|instagram\.com|payment_intent|transfer\(/i);
});
test('strict spending, approval and truthfulness charter remains non-editable',()=>{
  assert.match(logic,/spendingCents:0/);
  assert.match(logic,/publicPosting:false,outboundMessages:false,paymentAccess:false/);
  assert.match(logic,/truthfulness:true,approvalRequired:true/);
  assert.match(logic,/Permission charter intentionally not read from local storage/);
  assert.match(html,/No fake reviews, misleading claims, scams, or artificial engagement/);
});
test('ideas are accurately labeled local drafts without automatic external actions',()=>{
  assert.match(html,/not<\/strong> AI-generated ventures/);
  assert.match(html,/Nothing runs in the background/);
  assert.match(logic,/status:'candidate'/);
  assert.match(logic,/Local idea explorer/);
  assert.match(logic,/Unverified concepts|UNTESTED/);
  assert.match(logic,/status==='selected'/);
});
test('GitHub Pages ships and syntax-checks the venture lab',()=>{
  assert.match(deploy,/autonomous-grove\.js autonomous-grove\.css grove-scout-feed\.js _site/);
  assert.match(deploy,/node --check _site\/autonomous-grove\.js/);
  assert.match(css,/@media\(max-width:660px\)/);
});

test('autonomous research journal is read-only and externally sourced',()=>{
  const feed=readFileSync('grove-scout-feed.js','utf8');
  assert.match(html,/id="groveScoutEntries"/);
  assert.match(html,/id="groveScoutStatus"/);
  assert.match(html,/src="grove-scout-feed\.js" defer/);
  assert.match(feed,/api\.github\.com\/repos\/Link9060\/Resonant-Grove\/issues/);
  assert.match(feed,/labels=grove-scout/);
  assert.match(feed,/credentials:'omit'/);
  assert.doesNotMatch(feed,/\bPOST\b|\bPUT\b|\bDELETE\b|authorization\s*:/i);
  assert.match(deploy,/grove-scout-feed\.js _site/);
});
