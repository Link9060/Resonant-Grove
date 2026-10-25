import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/array-builder.yml', 'utf8');

test('owner-created issues can dispatch review-only Builder tasks', () => {
  assert.match(workflow, /issues:\s*\n\s*types:\s*\[opened\]/);
  const guards = workflow.match(/github\.event\.issue\.user\.login == 'Link9060'/g) || [];
  assert.equal(guards.length, 2, 'both Builder and publisher must independently enforce owner');
  const prefixes = workflow.match(/startsWith\(github\.event\.issue\.title, '\[ARRAY\] '\)/g) || [];
  assert.equal(prefixes.length, 2);
});

test('the objective enters commands via environment, not shell interpolation', () => {
  assert.match(workflow, /ARRAY_OBJECTIVE: \$\{\{ github\.event_name == 'issues' && github\.event\.issue\.body \|\| inputs\.objective \}\}/);
  assert.doesNotMatch(workflow, /run:[^\n]*\$\{\{ github\.event\.issue\.body \}\}/);
  assert.match(workflow, /1200 bytes/);
});

test('the AI and publisher have separate permissions', () => {
  assert.match(workflow, /build-proposal:[\s\S]*?permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /publish-draft:[\s\S]*?permissions:\s*\n\s*contents: write\s*\n\s*pull-requests: write/);
  assert.match(workflow, /gh pr create --draft/);
  assert.doesNotMatch(workflow, /gh pr merge/);
});

test('the proposal cannot publish arbitrary repository files', () => {
  assert.match(workflow, /git add -A -- app\.js index\.html/);
  assert.match(workflow, /node --check app\.js/);
  assert.match(workflow, /ARRAY_ISSUE_NUMBER/);
});
