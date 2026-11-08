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

test('review artifact manifest hashes every file and verifies hashes before upload',()=>{
  assert.match(workflow,/find \. -type f ! -name SHA256SUMS\.txt -print0/);
  assert.match(workflow,/LC_ALL=C sort -z \| xargs -0 sha256sum > SHA256SUMS\.txt/);
  assert.match(workflow,/\(cd preview && sha256sum --check SHA256SUMS\.txt\)/);
  assert.match(workflow,/test -s preview\/SHA256SUMS\.txt/);
  // .nojekyll is hidden and included in the manifest; upload-artifact must preserve it.
  assert.match(workflow,/touch preview\/\.nojekyll/);
  assert.match(workflow,/include-hidden-files:\s*true/);

  const verify=workflow.indexOf('sha256sum --check SHA256SUMS.txt');
  const upload=workflow.indexOf('uses: actions/upload-artifact@v4');
  assert.ok(verify>=0 && upload>verify,'integrity verification must precede artifact upload');
});

test('CI downloads the uploaded artifact and verifies extracted hidden files and hashes',()=>{
  assert.match(workflow,/uses: actions\/download-artifact@v4/);
  assert.match(workflow,/path: restored-preview\//);
  assert.match(workflow,/test -f restored-preview\/\.nojekyll/);
  assert.match(workflow,/\(cd restored-preview && sha256sum --check SHA256SUMS\.txt\)/);
  assert.match(workflow,/python3 restored-preview\/scripts\/verify_review_artifact\.py restored-preview/);
  assert.match(workflow,/diff -u preview\/SHA256SUMS\.txt restored-preview\/SHA256SUMS\.txt/);
  assert.match(workflow,/find restored-preview -type f/);
  const upload=workflow.indexOf('uses: actions/upload-artifact@v4');
  const download=workflow.indexOf('uses: actions/download-artifact@v4');
  const verify=workflow.indexOf('cd restored-preview && sha256sum --check SHA256SUMS.txt');
  assert.ok(upload>=0 && download>upload && verify>download);
});

test('downloaded artifact includes a self-contained portable integrity verifier',()=>{
  const guide=readFileSync(new URL('../docs/PHASE1-ACCEPTANCE.md',import.meta.url),'utf8');
  assert.match(workflow,/mkdir -p preview\/docs preview\/scripts/);
  assert.match(workflow,/cp scripts\/verify_review_artifact\.py preview\/scripts\/verify_review_artifact\.py/);
  assert.match(workflow,/test -s preview\/scripts\/verify_review_artifact\.py/);
  assert.match(workflow,/python3 restored-preview\/scripts\/verify_review_artifact\.py restored-preview/);
  assert.match(guide,/python3 scripts\/verify_review_artifact\.py \./);
  assert.match(guide,/before serving/);
});
