import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('unmerged review package uses read-only permissions and never persists checkout credentials', () => {
  const workflow = readFileSync('.github/workflows/grove-preview.yml', 'utf8');
  assert.ok(workflow.includes('permissions:\n  contents: read'));
  assert.ok(workflow.includes('uses: actions/checkout@v4\n        with:\n          ref:'));
  assert.ok(workflow.includes('persist-credentials: false'));
  for (const unsafe of ['permissions: write-all', 'secrets.GITHUB_TOKEN', 'GH_TOKEN:', 'GITHUB_TOKEN:']) {
    assert.equal(workflow.includes(unsafe), false, unsafe);
  }
});
