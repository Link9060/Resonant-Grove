import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cloud = readFileSync(new URL('../grove-cloud.js', import.meta.url), 'utf8');

test('first cloud connection requires explicit local upload consent', () => {
  const noRemote = cloud.match(/if \(!data\) \{([\s\S]*?)\n    \} else \{/);
  assert.ok(noRemote, 'missing first-connection branch');
  assert.match(noRemote[1], /pending\s*=\s*\{\s*workspace:\s*null,\s*explorer:\s*null\s*\}/);
  assert.doesNotMatch(noRemote[1], /await\s+upload\s*\(|void\s+upload\s*\(|ready\s*=\s*true/);
  assert.match(cloud, /groveCloudUseLocal'\)\.addEventListener\('click'/);
  assert.match(cloud, /if \(!pending\) return;[\s\S]*?message\('Uploading this device as the cloud copy\.\.\.'\);\s*void upload\(\)/);
});

test('missing cloud copy cannot be selected as a remote workspace', () => {
  assert.match(cloud, /groveCloudUseRemote'\)\.hidden\s*=\s*!!pending\s*&&\s*!pending\.workspace/);
  assert.match(cloud, /groveCloudUseRemote'\)\.disabled\s*=\s*!!pending\s*&&\s*!pending\.workspace/);
});

test('account changes invalidate pending sync and reject stale fetch results', () => {
  assert.match(cloud, /currentUserId\s*=\s*nextId;\s*user\s*=\s*nextUser;\s*ready\s*=\s*false;\s*pending\s*=\s*null/);
  assert.match(cloud, /if \(readEpoch !== accountEpoch \|\| scopedId !== currentUserId\) return;/);
});
