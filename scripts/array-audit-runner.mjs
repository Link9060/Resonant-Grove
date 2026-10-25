/**
 * ARRAY Auditor GitHub runner.
 *
 * Always loads trusted code from Grove main. Pull request HEAD is DATA only.
 * NEVER checks out or executes proposed code.
 *
 * Auto-merging is DISABLED unless ARRAY_AUTO_MERGE == "true" is explicitly
 * set in Actions variables and the triggered event is a successful workflow_run.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { reviewBuilderPr } from './array-auditor.mjs';

const REPO = 'Link9060/Resonant-Grove';
const hostRepo = process.env.GITHUB_REPOSITORY;
if (hostRepo !== REPO) throw new Error('ARRAY Auditor may operate only on ' + REPO + '.');

function ghApi(path, method = null, fields = []) {
  const args = ['api', '--header', 'Accept: application/vnd.github+json'];
  if (method) args.push('--method', method);
  args.push(path, ...fields);
  const raw = execFileSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 2_000_000,
    timeout: 15000,
    env: process.env,
  });
  return JSON.parse(raw);
}
function getContents(commitSha, file) {
  if (!/^[0-9a-f]{40}$/.test(commitSha) || file !== 'styles.css') throw new Error('Invalid source locator.');
  const result = ghApi('repos/' + REPO + '/contents/' + file + '?ref=' + commitSha);
  if (result.encoding !== 'base64' || typeof result.content !== 'string' ||
      result.size > 100000 || result.type !== 'file') {
    throw new Error('Unexpected GitHub source response.');
  }
  return Buffer.from(result.content.replace(/\s/g, ''), 'base64').toString('utf8');
}
function note(message) {
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, message + '\n');
}
function findPR(runId) {
  const list = ghApi('repos/' + REPO + '/pulls?state=open&per_page=100');
  if (!Array.isArray(list)) throw new Error('Unable to read PR list.');
  const matched = list.filter(item => item?.head?.ref === 'array/builder-' + runId);
  if (matched.length !== 1) return null;
  return ghApi('repos/' + REPO + '/pulls/' + matched[0].number);
}
function reportReview(pr, verdict, sha) {
  if (!pr || verdict.verdict !== 'low_risk_verified') return;
  const marker = '<!-- array-auditor:' + sha + ' -->';
  const list = ghApi('repos/' + REPO + '/issues/' + pr.number + '/comments?per_page=100');
  if (!Array.isArray(list)) return;
  if (list.some(x => typeof x.body === 'string' && x.body.includes(marker))) return;
  const body = marker + '\n**ARRAY Auditor: low-risk change verified.**\n\n' +
    '- **Change:** ' + verdict.summary + '\n' +
    '- **Check:** original owner task, trusted Builder run, exact one-property CSS diff, untouched JS/HTML, and independent source validation.\n' +
    '- **Automatic merge:** ' + (process.env.ARRAY_AUTO_MERGE === 'true' && process.env.ARRAY_TRIGGER === 'workflow_run' ? 'enabled for this verified class' : 'not enabled; manual approval remains required') + '.\n\n' +
    'These static checks cannot guarantee every possible visual or behavioral outcome.';
  // PR comment contains only known provenance and deterministic audit fields.
  const file = '/tmp/array-audit-comment.txt';
  writeFileSync(file, body);
  execFileSync('gh', ['pr', 'comment', String(pr.number), '--repo', REPO, '--body-file', file], {
    stdio: 'pipe', timeout: 15000, env: process.env,
  });
}

export function runAudit() {
  const runId = Number(process.env.ARRAY_TARGET_RUN_ID);
  if (!Number.isSafeInteger(runId) || runId < 1) throw new Error('Missing a valid Builder run ID.');
  const run = ghApi('repos/' + REPO + '/actions/runs/' + runId);
  if (run.id !== runId) throw new Error('GitHub returned an unexpected run.');
  const pr = findPR(runId);
  if (!pr) {
    note('### ARRAY Auditor\nNo open matching draft PR for completed Builder run ' + runId + '. Nothing was merged.');
    return { verdict: 'no_pr', autoMergeEligible: false };
  }
  const prFiles = ghApi('repos/' + REPO + '/pulls/' + pr.number + '/files?per_page=100');
  if (!Array.isArray(prFiles)) throw new Error('Invalid changed-file list.');
  let verdict;
  if (prFiles.length !== 1 || prFiles[0]?.filename !== 'styles.css') {
    verdict = { verdict: 'manual_review', autoMergeEligible: false, reason: 'Only a single styles.css file may qualify.' };
  } else {
    const baseCss = getContents(pr.base.sha, 'styles.css');
    const headCss = getContents(pr.head.sha, 'styles.css');
    verdict = reviewBuilderPr(pr, run, prFiles.map(x => x.filename), baseCss, headCss);
  }
  note('### ARRAY Auditor for PR #' + pr.number + '\n' +
    '- Review: **' + verdict.verdict + '**\n' +
    '- Reason: ' + verdict.reason + '\n' +
    '- PR: ' + pr.html_url + '\n' +
    '- Repository auto-merge toggle: **' + (process.env.ARRAY_AUTO_MERGE === 'true' ? 'enabled' : 'disabled') + '**');
  reportReview(pr, verdict, pr.head.sha);
  if (!verdict.autoMergeEligible || process.env.ARRAY_AUTO_MERGE !== 'true' ||
      process.env.ARRAY_TRIGGER !== 'workflow_run') {
    note('No merge performed.');
    return verdict;
  }

  // Refresh metadata directly before the merge. GitHub merge endpoint checks
  // the exact head SHA, preventing merging a subsequently modified PR.
  const fresh = ghApi('repos/' + REPO + '/pulls/' + pr.number);
  if (fresh.head?.sha !== pr.head.sha || fresh.base?.sha !== pr.base.sha ||
      fresh.mergeable !== true || fresh.draft !== true || fresh.state !== 'open') {
    throw new Error('The reviewed PR changed before merging. Refusing to merge.');
  }
  execFileSync('gh', ['pr', 'ready', String(pr.number), '--repo', REPO], {
    timeout: 15000, env: process.env, stdio: 'pipe',
  });
  const merge = ghApi('repos/' + REPO + '/pulls/' + pr.number + '/merge', 'PUT', [
    '-f', 'merge_method=squash', '-f', 'sha=' + pr.head.sha,
    '-f', 'commit_title=ARRAY Auditor: approved tiny CSS change',
  ]);
  if (merge.merged !== true) throw new Error('Merge request was not confirmed by GitHub.');
  note('**Merged:** ' + pr.html_url + ' at ' + merge.sha + '. GitHub Pages deploy follows the normal push workflow.');
  return { ...verdict, merged: true, mergeCommitSha: merge.sha };
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  try { runAudit(); }
  catch (error) {
    console.error('ARRAY Auditor error:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
