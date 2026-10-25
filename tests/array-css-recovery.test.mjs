import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recoverExplicitCssSpacing } from '../scripts/array-css-recovery.mjs';
import { applyCodeProposal, proposeCodeChanges } from '../scripts/array-code-worker.mjs';

const css = '.seed-card{padding:22px}.new-seed-card{border:1px dashed #3b5740;background:#111c14;align-items:center;justify-content:center;gap:13px;text-align:center}.new-seed-card:hover{background:#1a2c1e}';
const sources = {
  'app.js': 'const seeds = [];\n',
  'index.html': '<!doctype html><html><body>Test</body></html>',
  'styles.css': css,
};
const objective = 'In styles.css, locate the .new-seed-card rule and change only gap:13px to gap:14px.';

test('recovers an explicit, unique CSS property edit without touching adjacent selectors', () => {
  const proposal = recoverExplicitCssSpacing(objective, sources);
  const result = applyCodeProposal(proposal, sources);
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].path, 'styles.css');
  assert.match(result.changes[0].after, /justify-content:center;gap:14px;text-align:center/);
  assert.match(result.changes[0].after, /\.seed-card\{padding:22px\}/);
  assert.match(result.changes[0].after, /\.new-seed-card:hover\{background:#1a2c1e\}/);
});

test('refuses broad or ambiguous CSS changes', () => {
  assert.throws(() => recoverExplicitCssSpacing('Increase the spacing in the layout', sources), /selector/);
  assert.throws(() => recoverExplicitCssSpacing('Change .new-seed-card gap:13px to gap:100px', sources), /budget/);
  assert.throws(() => recoverExplicitCssSpacing('Change .new-seed-card gap:13px to padding:14px', sources), /old-to-new/);
  assert.throws(() => recoverExplicitCssSpacing('Change .new-seed-card and .seed-card gap:13px to gap:14px', sources), /selector/);
  assert.throws(() => recoverExplicitCssSpacing('Change .missing gap:13px to gap:14px', sources), /missing/);
  assert.throws(() => recoverExplicitCssSpacing(objective, { ...sources, 'styles.css': css + '.new-seed-card{gap:13px}' }), /ambiguous/);
});

test('model failure can trigger bounded deterministic recovery', async () => {
  let attempts = 0;
  const alwaysInvalid = async () => {
    attempts++;
    return { ok: true, json: async () => ({ response: JSON.stringify({ summary: 'bad', edits: [] }) }) };
  };
  const result = await proposeCodeChanges(objective, sources, alwaysInvalid);
  assert.equal(attempts, 2);
  assert.equal(result.changes.length, 1);
  assert.match(result.changes[0].after, /gap:14px/);
});

test('model failure does not bypass validator for unrelated or unsafe objectives', async () => {
  const bad = async () => ({ ok: true, json: async () => ({ response: '{"edits":[]}' }) });
  await assert.rejects(proposeCodeChanges('Add full account authentication securely', sources, bad), /recovery unavailable/);
  await assert.rejects(proposeCodeChanges('In .new-seed-card change gap:13px to gap:55px', sources, bad), /recovery unavailable/);
});
