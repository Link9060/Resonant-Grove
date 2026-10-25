/**
 * ARRAY verified fast path. Only a uniquely targeted, numerically bounded
 * CSS property replacement may bypass expensive Ollama setup.
 * This is deterministic code, not AI-generated work, and draft-PR review remains.
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { recoverExplicitCssSpacing } from './array-css-recovery.mjs';
import { applyCodeProposal } from './array-code-worker.mjs';

export function planFastPatch(objective, css) {
  const proposal = recoverExplicitCssSpacing(objective, { 'styles.css': css });
  const result = applyCodeProposal(proposal, { 'styles.css': css });
  if (result.changes.length !== 1 || result.changes[0].path !== 'styles.css') {
    throw new Error('Fast path must change only one CSS file.');
  }
  return result.changes[0].after;
}

function main() {
  const mode = process.env.ARRAY_MODE;
  let applied = false;
  if (mode === 'code') {
    const css = readFileSync('styles.css', 'utf8');
    try {
      const after = planFastPatch(process.env.ARRAY_OBJECTIVE || '', css);
      writeFileSync('styles.css', after);
      applied = true;
      console.log('ARRAY verified CSS fast path: one guarded property change applied.');
    } catch {
      console.log('ARRAY fast path not applicable: continuing with bounded local-model code worker.');
    }
  }
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, 'ARRAY_DIRECT_APPLIED=' + applied + '\n');
  console.log('ARRAY_DIRECT_APPLIED=' + applied);
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  try { main(); }
  catch (error) {
    console.error('ARRAY fast path failed: ' + (error instanceof Error ? error.message : 'unknown error'));
    process.exitCode = 1;
  }
}
