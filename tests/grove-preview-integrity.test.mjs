import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/grove-preview.yml',import.meta.url),'utf8');
const production=readFileSync(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');

test('review workflow checks out and stamps the same exact PR-head revision',()=>{
  assert.match(workflow,/GROVE_SOURCE_SHA:\s*\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow,/ref:\s*\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow,/grove-review-\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow,/node --test tests\/\*\.test\.mjs/);
  assert.match(workflow,/actual_sha="\$\(git rev-parse HEAD\)"/);
  assert.match(workflow,/test "\$actual_sha" = "\$GROVE_SOURCE_SHA"/);
  assert.match(workflow,/grep -Fq "GROVE_PREVIEW_SHA=\$\{GROVE_SOURCE_SHA\}"/);
});

test('review artifacts are PR-only and never built from manual main-branch dispatch',()=>{
  assert.match(workflow,/pull_request:\s*\n\s*branches: \[main\]/);
  assert.doesNotMatch(workflow,/workflow_dispatch:/);
  assert.doesNotMatch(workflow,/github\.sha/);
});

test('review identity is build-stamped rather than accepted from a URL',()=>{
  assert.match(workflow,/<code id="revision">\$\{GROVE_SOURCE_SHA\}<\/code>/);
  assert.doesNotMatch(workflow,/location\.(hash|search)|URLSearchParams|window\.location/);
});

test('preview workflow only uploads a review artifact and cannot deploy production',()=>{
  assert.match(workflow,/permissions:\s*\n\s*contents: read/);
  assert.match(workflow,/uses: actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow,/deploy-pages|wrangler|pages: write|id-token: write|secrets\.|pull_request_target:/);
  assert.match(production,/branches: \[main\]/);
  assert.doesNotMatch(production,/grove\/release-platform-preview/);
});


test('acceptance guide changes rebuild the review package and guide ships with artifact',()=>{
  assert.match(workflow,/^\s*- 'docs\/PHASE1-ACCEPTANCE\.md'\s*$/m);
  assert.match(workflow,/mkdir -p preview\/docs/);
  assert.match(workflow,/cp docs\/PHASE1-ACCEPTANCE\.md preview\/docs\/PHASE1-ACCEPTANCE\.md/);
  assert.match(workflow,/test -s preview\/docs\/PHASE1-ACCEPTANCE\.md/);
});
