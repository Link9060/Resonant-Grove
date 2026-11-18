import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('unmerged review package uses read-only GitHub permissions and never persists checkout credentials', () => {
  const workflow = readFileSync('.github/workflows/grove-preview.yml', 'utf8');
  assert.match(workflow, /permissions:\\s*\\n\\s*contents: read/);
  assert.match(workflow, /uses: actions\\/checkout@v4\\s*\\n\\s*with:\\s*\\n\\s*ref: \\$\\{\\{ github\\.event\\.pull_request\\.head\\.sha \\}\\}\\s*\\n\\s*persist-credentials: false/);
  assert.doesNotMatch(workflow, /permissions:\\s*write-all|secrets\\.GITHUB_TOKEN|GH_TOKEN\\s*:|GITHUB_TOKEN\\s*:/);
});
