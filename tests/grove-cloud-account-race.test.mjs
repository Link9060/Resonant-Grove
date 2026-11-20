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
  assert.match(source, /if \(epoch !== accountEpoch \|\| ownerId !== currentUserId\) return false;/);
  assert.match(source, /accountEpoch \+= 1;/);
  assert.match(source, /dirty = false; inFlight = false;/);
});

test('rejected network uploads release the active in-flight lock', () => {
  assert.match(source, /catch \(failure\) \{\s*error = failure;/);
  assert.match(source, /if \(epoch !== accountEpoch \|\| ownerId !== currentUserId\) return false;\s*inFlight = false;/);
});

test('rejected workspace fetches are handled after account isolation check', () => {
  assert.match(source, /try \{\s*\(\{ data, error \} = await client\.from\('grove_workspaces'\)/);
  assert.match(source, /const readEpoch = accountEpoch;/);
  assert.match(source, /if \(readEpoch !== accountEpoch \|\| scopedId !== currentUserId\) return;/);
  assert.match(source, /if \(error\) \{ message\('Could not load cloud workspace:/);
});

test('rejected sign-out requests preserve local state and report a failure', () => {
  assert.match(source, /try \{\s*const \{ error \} = await client\.auth\.signOut\(\);/);
  assert.match(source, /catch \(failure\) \{\s*message\('Sign out failed:/);
  assert.match(source, /Your local copy remains saved/);
});

test('rejected password and registration requests are caught without clearing local data', () => {
  assert.match(source, /async function authenticate\(register\) \{[\s\S]*?try \{[\s\S]*?await client\.auth\.signUp\([\s\S]*?await client\.auth\.signInWithPassword\(/);
  assert.match(source, /catch \(failure\) \{\s*message\('Authentication failed:/);
  assert.match(source, /Your local data remains saved/);
});

test('rejected OAuth requests are caught and reported', () => {
  assert.match(source, /groveCloudGoogle'[\s\S]*?try \{\s*const \{ error \} = await client\.auth\.signInWithOAuth/);
  assert.match(source, /catch \(failure\) \{\s*message\('Google sign-in failed:/);
});

test('same-account sign-out and re-login invalidates older cloud reads', () => {
  assert.match(source, /accountEpoch \+= 1;[\s\S]*?const readEpoch = accountEpoch;/);
  assert.match(source, /if \(readEpoch !== accountEpoch \|\| scopedId !== currentUserId\) return;/);
});


test('non-Error network rejections display a safe fallback message', () => {
  assert.match(source, /Cloud save failed: ' \+ \(error\?\.message \|\| 'Network error'\)/);
  assert.match(source, /Could not load cloud workspace: ' \+ \(error\?\.message \|\| 'Network error'\)/);
});

test('sign-out is blocked while an earlier upload remains in flight', () => {
  const signout = source.slice(source.indexOf("el('groveCloudSignout').addEventListener"));
  assert.match(signout, /if \(inFlight\) \{\s*message\('Cloud save is still in progress\.[^']*'\);\s*return;\s*\}/);
  assert.ok(signout.indexOf('if (inFlight)') < signout.indexOf('client.auth.signOut()'));
});


test('failed pending cloud save prevents sign-out while preserving local copy', () => {
  assert.match(source, /if \(dirty && !\(await upload\(\)\)\) \{/);
  assert.match(source, /Cloud save did not finish successfully\. Your local copy is safe/);
  assert.match(source, /if \(dirty && !\(await upload\(\)\)\) \{[\s\S]*?return;[\s\S]*?client\.auth\.signOut\(\)/);
  assert.match(source, /return !error;/);
});


test('failed cloud upload remains dirty so a later sign-out retries persistence', () => {
  const upload = source.slice(source.indexOf('async function upload()'), source.indexOf('function scheduleSave()'));
  assert.match(upload, /if \(error\) \{\s*\/\/[^\n]*\n\s*dirty = true;/);
  assert.match(upload, /else \{[\s\S]*?if \(dirty\) scheduleSave\(\);/);
  assert.match(source, /if \(dirty && !\(await upload\(\)\)\) \{/);
});


test('duplicate sign-out clicks cannot issue concurrent auth requests', () => {
  const signout = source.slice(source.indexOf("el('groveCloudSignout').addEventListener"));
  assert.match(signout, /if \(signingOut\) return;/);
  assert.match(signout, /signingOut = true;[\s\S]*?await client\.auth\.signOut\(\)/);
  assert.match(signout, /finally \{\s*signingOut = false;\s*el\('groveCloudSignout'\)\.disabled = false;/);
});
