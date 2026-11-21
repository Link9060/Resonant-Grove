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


test('sign-out lock starts before waiting for a pending workspace upload', () => {
  const signout = source.slice(source.indexOf("el('groveCloudSignout').addEventListener"));
  assert.ok(signout.indexOf('signingOut = true;') < signout.indexOf('await upload()'));
  assert.ok(signout.indexOf("el('groveCloudSignout').disabled = true;") < signout.indexOf('await upload()'));
  assert.match(signout, /try \{[\s\S]*?if \(dirty && !\(await upload\(\)\)\)/);
});


test('cloud toggle reflects unsaved workspace changes until upload settles', () => {
  assert.match(source, /ready \? \(\(dirty \|\| inFlight\) \? 'Cloud changes pending' : 'Cloud connected'\)/);
  const upload = source.slice(source.indexOf('async function upload()'), source.indexOf('function scheduleSave()'));
  assert.match(upload, /if \(error\) \{[\s\S]*?dirty = true;[\s\S]*?\}\s*else \{[\s\S]*?\}\s*ui\(\);\s*return !error;/);
  const schedule = source.slice(source.indexOf('function scheduleSave()'), source.indexOf('window.GroveCloud'));
  assert.match(schedule, /dirty = true;\s*ui\(\);/);
});


test('local save indicator does not claim cloud sync during dirty or in-flight uploads', () => {
  assert.match(source, /indicator\.lastChild\.textContent = ready && !dirty && !inFlight \? 'Synced with cloud'/);
  assert.match(source, /'Saved on this device' \+ \(ready \? ' · Cloud changes pending' : ''\)/);
});


test('cloud toggle remains pending while upload is active and refreshes at upload start', () => {
  assert.match(source, /ready \? \(\(dirty \|\| inFlight\) \? 'Cloud changes pending' : 'Cloud connected'\)/);
  const upload = source.slice(source.indexOf('async function upload()'), source.indexOf('function scheduleSave()'));
  assert.match(upload, /inFlight = true; dirty = false;\s*ui\(\);/);
});

test('cloud account panel exposes expansion state and restores keyboard focus', () => {
  assert.match(source, /button\.setAttribute\('aria-controls', panel\.id\)/);
  assert.match(source, /button\.setAttribute\('aria-expanded', 'false'\)/);
  assert.match(source, /function setPanelOpen\(open, restoreFocus = false\)/);
  assert.match(source, /button\.setAttribute\('aria-expanded', String\(open\)\)/);
  assert.match(source, /if \(open\) el\('groveCloudClose'\)\.focus\(\)/);
  assert.match(source, /else if \(restoreFocus\) button\.focus\(\)/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /setPanelOpen\(false, true\)/);
});

test('snapshot failures share the upload error path and release the lock', () => {
  const upload = source.slice(source.indexOf('async function upload()'), source.indexOf('function scheduleSave()'));
  assert.match(upload, /try \{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*const snapshot = localCopy\(\);/);
  assert.ok(upload.indexOf('const snapshot = localCopy();') > upload.indexOf('try {'));
  assert.ok(upload.indexOf('const snapshot = localCopy();') < upload.indexOf('catch (failure)'));
  assert.match(upload, /catch \(failure\) \{\s*error = failure;/);
  assert.match(upload, /inFlight = false;\s*if \(error\) \{[\s\S]*?dirty = true;/);
});
