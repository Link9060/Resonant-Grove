import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateVenture, CRITERIA} from '../phase2/evaluate.mjs';

// P2-EVAL-154: a caller may edit the original proposal or returned report
// without retroactively changing any independently evaluated report.
const proposal = () => ({
  id: 'fictional-counting-tool',
  title: 'Fictional local supply counting worksheet',
  evidence: [
    {kind: 'hypothesis', statement: 'An offline worksheet might help a volunteer team.'},
    {kind: 'source', statement: 'Documentation describes browser-side JavaScript modules, not customer demand.',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules', accessed: '2026-11-23'}
  ],
  ratings: Object.fromEntries(CRITERIA.map(key => [key, {
    score: 2, rationale: 'A provisional internal estimate, not validated traction.', evidenceIds: [0, 1]
  }]))
});

test('P2-EVAL-154: evidence and score reports are independent snapshots', () => {
  const input = proposal();
  const first = evaluateVenture(input);
  const expected = evaluateVenture(proposal());
  input.evidence[0].statement = 'Modified original proposal after evaluation.';
  input.ratings.demand.score = 0;
  input.ratings.problem.evidenceIds.push(99);
  assert.deepEqual(first, expected);
  first.evidence[0].statement = 'Modified returned evidence.';
  first.breakdown.demand.score = 3;
  first.breakdown.problem.evidenceIds.push(99);
  assert.deepEqual(evaluateVenture(proposal()), expected);
  assert.equal(expected.demandVerified, false);
  assert.equal(expected.customersVerified, false);
  assert.equal(expected.revenueVerified, false);
  assert.ok(Object.values(expected.permissions).every(value => value === false));
});
