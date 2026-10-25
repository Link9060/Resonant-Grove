/**
 * ARRAY Auditor v1
 *
 * Independently inspect a Builder PR. The model cannot approve itself.
 * No code from the PR head is executed. No PRs are merged from this module.
 * Only two narrowly allowlisted Grove CSS selectors may qualify for hands-free merging.
 */
import { recoverExplicitCssSpacing } from './array-css-recovery.mjs';
import { applyCodeProposal } from './array-code-worker.mjs';

const REPO = 'Link9060/Resonant-Grove';
const AUTO_SELECTORS = Object.freeze(['.new-seed-card', '.new-seed-plus']);
const AUTO_PROPERTIES = new Set(['gap', 'row-gap', 'column-gap', 'padding', 'margin', 'border-radius']);

export function extractObjective(body) {
  if (typeof body !== 'string') return '';
  const startText = '**Objective:**';
  const start = body.indexOf(startText);
  if (start < 0) return '';
  const end = body.indexOf('\n\n**', start + startText.length);
  if (end < 0) return '';
  return body.slice(start + startText.length, end).trim();
}

export function inspectTinyCssChange(baseCss, proposedCss) {
  if (typeof baseCss !== 'string' || typeof proposedCss !== 'string' ||
      baseCss === proposedCss || proposedCss.length > 100000 || baseCss.length > 100000) {
    return { ok: false, reason: 'CSS must be a real, bounded, nonempty change.' };
  }
  for (const selector of AUTO_SELECTORS) {
    const escaped = selector.replace('.', '\\.');
    const rule = new RegExp('(?:^|\\})\\s*' + escaped + '\\{([^{}]*)\\}', 'g');
    const matches = [...baseCss.matchAll(rule)];
    if (matches.length !== 1) continue;
    const entireRule = matches[0][0];
    const body = matches[0][1];
    const token = /(^|;)\s*(gap|row-gap|column-gap|padding|margin|border-radius)\s*:\s*(\d{1,3})px(?=;|$)/g;
    for (const match of body.matchAll(token)) {
      const property = match[2];
      const oldValue = Number(match[3]);
      if (!AUTO_PROPERTIES.has(property) || oldValue > 64) continue;
      const matchPosition = match.index + match[0].lastIndexOf(match[3]);
      for (const delta of [-2, -1, 1, 2]) {
        const newValue = oldValue + delta;
        if (newValue < 0 || newValue > 64) continue;
        const changedRule = entireRule.replace(
          body, body.slice(0, matchPosition) + newValue + body.slice(matchPosition + match[3].length)
        );
        const expected = baseCss.replace(entireRule, changedRule);
        if (expected === proposedCss) {
          return { ok: true, selector, property, oldValue, newValue, summary: selector + ' ' + property + ': ' + oldValue + 'px → ' + newValue + 'px' };
        }
      }
    }
  }
  return { ok: false, reason: 'Not exactly one allowlisted, 1–2px CSS spacing/radius change.' };
}

export function reviewBuilderPr(pr, run, changedPaths, baseCss, headCss) {
  const reject = reason => ({ verdict: 'manual_review', reason, autoMergeEligible: false });
  if (!pr || !run || !Array.isArray(changedPaths) ||
      pr.state !== 'open' || pr.draft !== true || pr.mergeable !== true ||
      pr.user?.login !== 'github-actions[bot]' ||
      pr.base?.ref !== 'main' || pr.base?.repo?.full_name !== REPO ||
      pr.head?.repo?.full_name !== REPO ||
      pr.commits !== 1 || pr.changed_files !== 1 ||
      changedPaths.length !== 1 || changedPaths[0] !== 'styles.css') {
    return reject('Metadata or file scope failed strict safety checks.');
  }
  if (typeof pr.head?.ref !== 'string' ||
      !/^array\/builder-[1-9]\d{7,}$/.test(pr.head.ref) ||
      String(run.id) !== pr.head.ref.slice('array/builder-'.length)) {
    return reject('PR branch is not linked to the verified originating run.');
  }
  if (run.status !== 'completed' || run.conclusion !== 'success' ||
      run.head_branch !== 'main' ||
      !['issues', 'workflow_dispatch'].includes(run.event) ||
      run.actor?.login !== 'Link9060' ||
      typeof run.path !== 'string' || run.path !== '.github/workflows/array-builder.yml') {
    return reject('Originating Builder workflow was not verified as owner-run and successful.');
  }
  if (typeof pr.body !== 'string' || !pr.body.includes('**Mode:** code')) return reject('Only code-mode Builder PRs can qualify.');
  const objective = extractObjective(pr.body);
  if (!objective || Buffer.byteLength(objective) > 1200) return reject('Missing or oversized original task objective.');
  const analysis = inspectTinyCssChange(baseCss, headCss);
  if (!analysis.ok) return reject(analysis.reason);
  try {
    // Independently confirm the final code exactly matches the owner's explicit
    // selector + old/new CSS instruction, not simply another harmless-looking edit.
    const expected = applyCodeProposal(recoverExplicitCssSpacing(objective, { 'styles.css': baseCss }), {
      'styles.css': baseCss,
    });
    if (expected.changes.length !== 1 || expected.changes[0].after !== headCss) {
      return reject('Patch does not exactly implement the recorded owner objective.');
    }
  } catch {
    return reject('Task is not an explicit exact-selector old/new CSS request.');
  }
  return {
    verdict: 'low_risk_verified',
    autoMergeEligible: true,
    reason: 'Independent checks passed: trusted task, successful worker, allowlisted 1–2px CSS-only diff.',
    summary: analysis.summary,
  };
}
