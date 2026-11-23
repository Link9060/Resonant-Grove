import {evaluateVenture} from './evaluate.mjs';

const clean = (s, label) => {
  if (typeof s !== 'string' || s.trim().length < 12 || s.length > 1000 || /[<>\u0000-\u001f]/.test(s)) throw Error(`Invalid ${label}`);
  return s.trim();
};
const unique = (items, label, min = 1, max = 12) => {
  if (!Array.isArray(items) || items.length < min || items.length > max) throw Error(`Invalid ${label} list`);
  const normalized = items.map((x, i) => clean(x, `${label}[${i}]`));
  if (new Set(normalized.map(x => x.toLowerCase())).size !== normalized.length) throw Error(`Duplicate ${label}`);
  return normalized;
};
/** Create an offline, review-only requirements contract; never infer approval from score. */
export function createVentureSpec(idea, requirements) {
  const evaluation = evaluateVenture(idea);
  if (!requirements || typeof requirements !== 'object') throw Error('Missing requirements');
  const userProblem = clean(requirements.userProblem, 'userProblem');
  const targetUser = clean(requirements.targetUser, 'targetUser');
  const coreWorkflow = unique(requirements.coreWorkflow, 'coreWorkflow', 2, 10);
  const acceptanceCriteria = unique(requirements.acceptanceCriteria, 'acceptanceCriteria', 2, 12);
  const limitations = unique(requirements.limitations, 'limitations');
  const testPlan = unique(requirements.testPlan, 'testPlan', 2, 12);
  if (requirements.dataMode !== 'local-fixtures-only') throw Error('Only local fixtures are authorized');
  return {
    schemaVersion: 1,
    id: evaluation.id,
    title: evaluation.title,
    stage: 'requirements-review-only',
    evaluation,
    requirements: {userProblem, targetUser, coreWorkflow, acceptanceCriteria, limitations, testPlan, dataMode: 'local-fixtures-only'},
    verification: {prototypeBuilt: false, testsPassed: false, manualQA: false, demandVerified: false},
    permissions: {...evaluation.permissions},
    nextStep: 'Build a local-only prototype and verify each acceptance criterion before handoff.'
  };
}
