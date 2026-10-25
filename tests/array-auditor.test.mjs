import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractObjective, inspectTinyCssChange, reviewBuilderPr } from '../scripts/array-auditor.mjs';

const base = '.seed-card{padding:22px}.new-seed-plus{background:#294632;border-radius:12px;display:grid;gap:13px}.new-seed-card{border:1px dashed #123456;gap:13px;text-align:center}';
const changed = base.replace('border-radius:12px', 'border-radius:13px');
const task = 'In styles.css, locate the .new-seed-plus rule and change only border-radius:12px to border-radius:13px. Leave everything else unchanged.';
const pr = {
  number: 18, state: 'open', draft: true, mergeable: true,
  user: { login: 'github-actions[bot]' },
  base: { ref: 'main', repo: { full_name: 'Link9060/Resonant-Grove' } },
  head: { ref: 'array/builder-40158690034', repo: { full_name: 'Link9060/Resonant-Grove' } },
  commits: 1, changed_files: 1,
  body: 'Review-only code proposal.\n\n**Objective:**\n\n' + task +
    '\n\n**Requested from:** issue #17.\n\n**Mode:** code\n\n**Checks:** passed.',
};
const run = {
  id: 40158690034, status: 'completed', conclusion: 'success',
  head_branch: 'main', event: 'issues', actor: { login: 'Link9060' },
  path: '.github/workflows/array-builder.yml',
};

test('independently approves exactly a 1px radius change to a permitted selector', () => {
  assert.deepEqual(inspectTinyCssChange(base, changed), {
    ok: true, selector: '.new-seed-plus', property: 'border-radius',
    oldValue: 12, newValue: 13, summary: '.new-seed-plus border-radius: 12px → 13px',
  });
  const report = reviewBuilderPr(pr, run, ['styles.css'], base, changed);
  assert.equal(report.verdict, 'low_risk_verified');
  assert.equal(report.autoMergeEligible, true);
  assert.match(report.summary, /border-radius/);
});

test('rejects unrelated style, JavaScript, and larger numeric changes', () => {
  assert.equal(inspectTinyCssChange(base, base.replace('padding:22px', 'padding:23px')).ok, false);
  assert.equal(inspectTinyCssChange(base, base.replace('border-radius:12px', 'border-radius:18px')).ok, false);
  assert.equal(inspectTinyCssChange(base, changed.replace('gap:13px', 'gap:14px')).ok, false);
  assert.equal(inspectTinyCssChange(base, base).ok, false);
  assert.equal(reviewBuilderPr(pr, run, ['styles.css', 'app.js'], base, changed).autoMergeEligible, false);
});

test('rejects model self-approval and unrelated source objectives', () => {
  assert.equal(reviewBuilderPr({ ...pr, user: { login: 'attacker' } }, run, ['styles.css'], base, changed).autoMergeEligible, false);
  assert.equal(reviewBuilderPr({ ...pr, draft: false }, run, ['styles.css'], base, changed).autoMergeEligible, false);
  assert.equal(reviewBuilderPr({ ...pr, head: { ...pr.head, ref: 'feature/change' } }, run, ['styles.css'], base, changed).autoMergeEligible, false);
  assert.equal(reviewBuilderPr({ ...pr, body: pr.body.replace('border-radius:13px', 'border-radius:14px') }, run, ['styles.css'], base, changed).autoMergeEligible, false);
  assert.equal(reviewBuilderPr({ ...pr, body: pr.body.replace('**Mode:** code', '**Mode:** copy') }, run, ['styles.css'], base, changed).autoMergeEligible, false);
});

test('rejects failed jobs, unexpected actors, and spoofed repositories', () => {
  assert.equal(reviewBuilderPr(pr, { ...run, conclusion: 'failure' }, ['styles.css'], base, changed).autoMergeEligible, false);
  assert.equal(reviewBuilderPr(pr, { ...run, actor: { login: 'another' } }, ['styles.css'], base, changed).autoMergeEligible, false);
  assert.equal(reviewBuilderPr(pr, { ...run, path: '.github/workflows/fake.yml' }, ['styles.css'], base, changed).autoMergeEligible, false);
  assert.equal(reviewBuilderPr({ ...pr, head: { ...pr.head, repo: { full_name: 'other/fork' } } }, run, ['styles.css'], base, changed).autoMergeEligible, false);
});

test('extractObjective refuses missing marker or unterminated section', () => {
  assert.equal(extractObjective(pr.body), task);
  assert.equal(extractObjective('There is no objective'), '');
  assert.equal(extractObjective('**Objective:**\n\nno terminating header'), '');
});
