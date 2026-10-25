/**
 * ARRAY CSS recovery: deterministic fallback for explicitly requested
 * numerical spacing changes. Never executes model output or edits files.
 */
const ALLOWED = new Set(['gap', 'row-gap', 'column-gap', 'padding', 'margin', 'border-radius']);
const FILE_NAMES = new Set(['.css', '.js', '.html', '.md', '.json']);

function escapeRegexp(value) {
  return value.replace(/[.]/g, '\\.');
}

export function recoverExplicitCssSpacing(objective, sources) {
  if (typeof objective !== 'string' || Buffer.byteLength(objective) > 1200 ||
      !sources || typeof sources['styles.css'] !== 'string') {
    throw new Error('Recovery requires a bounded task and CSS source.');
  }
  const clean = objective.split(String.fromCharCode(96)).join('').replace(/["'“”]/g, '');
  const matches = [...clean.matchAll(/(?:^|[^\w-])(\.[a-z][a-z0-9-]{2,})/gi)]
    .map(match => match[1]).filter(selector => !FILE_NAMES.has(selector.toLowerCase()));
  const selectors = [...new Set(matches)];
  if (selectors.length !== 1) throw new Error('CSS recovery requires exactly one explicit class selector.');
  const selector = selectors[0];

  // Require same explicit property name and unit before and after.
  const transform = /\b([a-z-]+)\s*:\s*(\d{1,3}(?:\.\d{1,2})?)(px|rem|em|%)\s*(?:to|->|→)\s*\1\s*:\s*(\d{1,3}(?:\.\d{1,2})?)\3\b/i.exec(clean);
  if (!transform) throw new Error('CSS recovery requires an explicit old-to-new declaration.');
  const [, rawProperty, oldNumber, rawUnit, newNumber] = transform;
  const property = rawProperty.toLowerCase();
  if (!ALLOWED.has(property)) throw new Error('CSS recovery is limited to spacing and radius properties.');
  if (Number(oldNumber) === Number(newNumber) ||
      Math.abs(Number(newNumber) - Number(oldNumber)) > 8 ||
      Number(oldNumber) > 128 || Number(newNumber) > 128) {
    throw new Error('CSS value change is outside the small-edit budget.');
  }

  const sheet = sources['styles.css'];
  const ruleRegex = new RegExp('(?:^|\\})\\s*' + escapeRegexp(selector) + '\\s*\\{([^{}]*)\\}', 'g');
  const matchesInCss = [...sheet.matchAll(ruleRegex)];
  if (matchesInCss.length !== 1) throw new Error('CSS selector is missing or ambiguous.');
  const full = matchesInCss[0][0];
  const brace = full.indexOf('{');
  const body = full.slice(brace + 1, -1);
  const declaration = new RegExp('(^|;)\\s*' + property + '\\s*:\\s*' +
    escapeRegexp(oldNumber + rawUnit) + '(?=\\s*(?:;|$))', 'g');
  const found = [...body.matchAll(declaration)];
  if (found.length !== 1) throw new Error('Exact original CSS property is missing or ambiguous.');
  const updated = body.replace(declaration, hit => hit.replace(oldNumber + rawUnit, newNumber + rawUnit));
  const replace = full.slice(0, brace + 1) + updated + '}';
  if (full === replace || full.length > 650 || replace.length > 850) {
    throw new Error('Recovered patch exceeds strict code-worker hunk limits.');
  }
  return {
    summary: 'Verified CSS spacing update requested explicitly in task',
    edits: [{
      path: 'styles.css',
      find: full,
      replace,
      reason: 'Deterministic unique-selector fallback after AI proposal failed validation',
    }],
  };
}
