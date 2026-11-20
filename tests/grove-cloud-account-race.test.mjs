import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../grove-cloud.js', import.meta.url), 'utf8');

test('cloud uploads capture owner identity before awaiting network', () => {
  assert.match(source, /const ownerId = user\.id;/);
  assert.match(source, /owner_id: ownerId, \.\.\.snapshot/);
});

test('stale account uploads cannot mutate current sync state', () => {
  assert.match(source, /const epoch = accountEpoch;/);
  assert.match(source, /if \(epoch !== accountEpoch \|\| ownerId !== currentUserId\) return;/);
  assert.match(source, /accountEpoch \+= 1;/);
  assert.match(source, /dirty = false; inFlight = false;/);
});

test('rejected network uploads release the active in-flight lock', () => {
  assert.match(source, /catch \(failure\) \{\s*error = failure;/);
  assert.match(source, /if \(epoch !== accountEpoch \|\| ownerId !== currentUserId\) return;\s*inFlight = false;/);
});

test('rejected workspace fetches are handled after account isolation check', () => {
  assert.match(source, /try \{\s*\(\{ data, error \} = await client\.from\('grove_workspaces'\)/);
  assert.match(source, /catch \(failure\) \{\s*error = failure;\s*\}\s*if \(scopedId !== currentUserId\) return;/);
  assert.match(source, /if \(error\) \{ message\('Could not load cloud workspace:/);
});
