import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/grove-preview.yml', 'utf8');

test('preview packages only an exact pull-request head without write credentials', () => {
  assert.match(workflow, /pull_request:\s*\n\s*branches:\s*\[main\]/);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.doesNotMatch(workflow, /permissions:\s*write-all|(?:issues|contents|deployments|pages):\s*write/);
  assert.match(workflow, /GROVE_SOURCE_SHA:\s*\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /ref:\s*\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /test "\$actual_sha" = "\$GROVE_SOURCE_SHA"/);
});

test('preview remains an integrity-checked offline artifact, not a production deployment', () => {
  assert.match(workflow, /python3 scripts\/verify_review_artifact\.py preview/);
  assert.match(workflow, /python3 scripts\/smoke_review_http\.py preview "\$GROVE_SOURCE_SHA"/);
  assert.match(workflow, /sha256sum --check SHA256SUMS\.txt/);
  assert.match(workflow, /GROVE_PREVIEW_SHA=\$\{GROVE_SOURCE_SHA\}/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /actions\/deploy-pages|cloudflare\/wrangler-action|wrangler pages deploy|gh-pages|actions\/upload-pages-artifact/);
});

test('preview copies an explicit public asset allowlist, never the repository tree', () => {
  assert.match(workflow, /for file in index\.html styles\.css app\.js favicon\.svg/);
  assert.match(workflow, /cp "\$file" preview\//);
  assert.doesNotMatch(workflow, /cp\s+-[a-zA-Z]*[rR][a-zA-Z]*\s+\.\s+preview|rsync\s+[^\n]*\.\/?\s+preview/);
  assert.doesNotMatch(workflow, /(?:cp|rsync)\s+[^\n]*(?:\.env|\.git\/|\.github\/|node_modules\/|secrets\.)/);
  assert.match(workflow, /retention-days:\s*14/);
});

test('changes to the packaged favicon trigger a fresh review artifact', () => {
  assert.match(workflow, /- 'favicon\.svg'/);
  assert.match(workflow, /for file in index\.html styles\.css app\.js favicon\.svg/);
});

test('validation workflow edits retrigger preview packaging', () => {
  assert.match(workflow, /- '\.github\/workflows\/validate-autonomous\.yml'/);
});

test('preview and validation both execute all Phase 1 suites, excluding Phase 2', () => {
  const validation = readFileSync('.github/workflows/validate-autonomous.yml', 'utf8');
  const expected = 'node --test tests/grove-*.test.mjs tests/autonomous-grove.test.mjs';
  assert.ok(workflow.includes(expected), 'preview must run the full Phase 1 Node suite');
  assert.ok(validation.includes(expected), 'validation must run the full Phase 1 Node suite');
  for (const source of [workflow, validation]) {
    assert.match(source, /python3 -m unittest discover -s tests -p 'test_\*\.py'/);
    assert.doesNotMatch(source, /node --test[^\n]*phase2-/);
  }
});

test('validation checks the immutable PR head, not only a synthetic merge commit', () => {
  const validation = readFileSync('.github/workflows/validate-autonomous.yml', 'utf8');
  assert.match(validation, /GROVE_VALIDATED_SHA:\s*\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(validation, /ref:\s*\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(validation, /test "\$\(git rev-parse HEAD\)" = "\$GROVE_VALIDATED_SHA"/);
  assert.match(validation, /persist-credentials:\s*false/);
});

test('preview and validation pin the same Node 22 runtime', () => {
  const validation = readFileSync('.github/workflows/validate-autonomous.yml', 'utf8');
  for (const source of [workflow, validation]) {
    assert.ok(source.includes('uses: actions/setup-node@v4'), 'Node setup must be explicit');
    assert.ok(source.includes("node-version: '22'"), 'Node major version must match');
  }
});
