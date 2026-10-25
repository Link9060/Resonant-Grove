import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planFastPatch } from '../scripts/array-direct-patch.mjs';
import { readFileSync } from 'node:fs';

const css = '.new-seed-card{border:1px dashed #3b5740;gap:13px;text-align:center}.new-seed-card:hover{color:#fff}';

test('fast path makes one exact, reviewable numeric CSS change', () => {
  const after = planFastPatch('In styles.css change .new-seed-card gap:13px to gap:14px only.', css);
  assert.equal(after, css.replace('gap:13px', 'gap:14px'));
});

test('fast path rejects broad requests, unknown selectors, and unsafe jumps', () => {
  assert.throws(() => planFastPatch('Improve all styling', css));
  assert.throws(() => planFastPatch('In .missing change gap:13px to gap:14px.', css));
  assert.throws(() => planFastPatch('In .new-seed-card change gap:13px to gap:99px.', css));
  assert.throws(() => planFastPatch('In .new-seed-card change gap:13px to color:14px.', css));
});

test('workflow gates expensive local-model boot on fast-path success', () => {
  const source = readFileSync('.github/workflows/array-builder.yml', 'utf8');
  assert.match(source, /node scripts\/array-direct-patch\.mjs/);
  const skips = source.match(/if: \$\{\{ env\.ARRAY_DIRECT_APPLIED != 'true' \}\}/g) || [];
  assert.equal(skips.length, 2);
  assert.match(source, /git diff --cached --check/);
  assert.match(source, /gh pr create --draft/);
});
