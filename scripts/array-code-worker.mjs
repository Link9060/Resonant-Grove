/**
 * ARRAY Builder v2: bounded, review-only code changes driven by local Ollama.
 *
 * The model proposes exact text replacements; trusted JavaScript applies them
 * atomically after size/path/syntax guards. Model output NEVER becomes a shell
 * command. GitHub tokens are absent from this worker job.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Script } from 'node:vm';

export const CODE_FILES = Object.freeze(['app.js', 'index.html', 'styles.css']);
const MAX_EDITS = 3;
const MAX_FILES = 2;
const MAX_DIFF_BYTES = 1500;
const STOP = new Set(['the','and','with','from','that','this','into','make','more','than','have','when','what','where','they','then','only','like','work','file','code','update','small','change','improve','grove','array','should','please','some','user','website','without']);
const RISKY = [
  /\beval\s*\(/i, /\bnew\s+Function\s*\(/i,
  /\bfetch\s*\(/i, /\bXMLHttpRequest\s*\(/i,
  /\bWebSocket\s*\(/i, /\bnavigator\.sendBeacon\s*\(/i,
  /\bprocess\.env\b/i, /\bimport\s*\(/i, /\bdocument\.cookie\b/i,
  /\blocalStorage\.clear\s*\(/i, /<script\b/i,
  /\bchild_process\b/i, /\brequire\s*\(/i,
];

/** Select source excerpts by objective keywords, not arbitrary model-supplied paths. */
export function selectContext(objective, sources) {
  const words = Array.from(new Set((objective.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [])
    .filter(w => !STOP.has(w)))).slice(0, 16);
  const options = [];
  for (const path of CODE_FILES) {
    const value = sources[path];
    if (typeof value !== 'string') continue;
    const windowSize = 820;
    const stride = 580;
    for (let at = 0; at < value.length; at += stride) {
      const content = value.slice(at, at + windowSize);
      const lower = content.toLowerCase();
      const hits = words.filter(w => lower.includes(w)).length;
      if (hits > 0) options.push({ path, offset: at, excerpt: content, hits });
    }
  }
  options.sort((a, b) => b.hits - a.hits || a.path.localeCompare(b.path) || a.offset - b.offset);
  const selected = [];
  const offsets = new Map();
  for (const candidate of options) {
    const kept = offsets.get(candidate.path) || [];
    if (kept.some(old => Math.abs(candidate.offset - old) < 550)) continue;
    selected.push(candidate);
    offsets.set(candidate.path, [...kept, candidate.offset]);
    if (selected.length >= 9) break;
  }
  // Include a compact file outline when the user has no matching terms.
  if (selected.length === 0) {
    for (const path of CODE_FILES) {
      if (typeof sources[path] === 'string') selected.push({ path, offset: 0, excerpt: sources[path].slice(0, 650), hits: 0 });
    }
  }
  return selected.map(({ path, offset, excerpt }) => ({ path, offset, excerpt }));
}

/** Apply an entire proposal in memory. Never write partially validated changes. */
export function applyCodeProposal(proposal, sources) {
  if (proposal === null || typeof proposal !== 'object' || Array.isArray(proposal) ||
      !Array.isArray(proposal.edits) || proposal.edits.length < 1 ||
      proposal.edits.length > MAX_EDITS) throw new Error('Expected 1 to 3 structured edits.');
  const next = { ...sources };
  const touched = new Set();
  let diffBytes = 0;
  for (const edit of proposal.edits) {
    if (!edit || typeof edit !== 'object' || Array.isArray(edit)) throw new Error('Invalid edit object.');
    const { path, find, replace } = edit;
    if (!CODE_FILES.includes(path) || typeof next[path] !== 'string') throw new Error('File is outside the source allowlist.');
    // Short CSS numeric declarations can be edited when they occur exactly once.
    // Never grant this exception to JavaScript or HTML, and never change a CSS
    // property name, unit, or add anything other than a bounded numeric value.
    const numberProperty = /^([a-z-]+):\s*([0-9]+(?:\.[0-9]+)?)(px|rem|em|%)\s*;?$/;
    const oldProperty = typeof find === 'string' ? numberProperty.exec(find.trim()) : null;
    const newProperty = typeof replace === 'string' ? numberProperty.exec(replace.trim()) : null;
    const shortCss = path === 'styles.css' && oldProperty && newProperty &&
      oldProperty[1] === newProperty[1] && oldProperty[3] === newProperty[3] &&
      Math.abs(Number(newProperty[2]) - Number(oldProperty[2])) <= 8;
    if (typeof find !== 'string' || typeof replace !== 'string' ||
        (find.length < 20 && !shortCss) || find.length > 650 ||
        replace.length < 5 || replace.length > 850 || find === replace) {
      throw new Error('Edit is missing, too large, or unchanged (file=' + path +
        ', findChars=' + (typeof find === 'string' ? find.length : 'invalid') +
        ', replaceChars=' + (typeof replace === 'string' ? replace.length : 'invalid') + ').');
    }
    if (find.includes('\0') || replace.includes('\0')) throw new Error('Binary content is not allowed.');
    if (RISKY.some(pattern => pattern.test(replace) && !pattern.test(find))) {
      throw new Error('Edit introduces a restricted high-risk code pattern.');
    }
    if (path === 'index.html' && (/<\/?(?:script|iframe|object|embed|form)\b/i.test(replace) &&
        !/<\/?(?:script|iframe|object|embed|form)\b/i.test(find))) {
      throw new Error('The edit introduces restricted HTML elements.');
    }
    const first = next[path].indexOf(find);
    if (first < 0 || next[path].indexOf(find, first + find.length) !== -1) {
      throw new Error('Exact original code was not found uniquely in ' + path + '.');
    }
    const updated = next[path].slice(0, first) + replace + next[path].slice(first + find.length);
    diffBytes += Buffer.byteLength(find) + Buffer.byteLength(replace);
    if (diffBytes > MAX_DIFF_BYTES) throw new Error('Total patch exceeds 1500 bytes.');
    next[path] = updated;
    touched.add(path);
    if (touched.size > MAX_FILES) throw new Error('Maximum two changed files per mission.');
  }
  if (touched.has('app.js')) {
    try { new Script(next['app.js'], { filename: 'app.js' }); }
    catch (error) { throw new Error('Resulting JavaScript has a syntax error: ' + error.message); }
  }
  if (touched.has('styles.css')) {
    const before = sources['styles.css'];
    const after = next['styles.css'];
    // Lightweight structural guard, NOT a comprehensive CSS parser.
    const count = (s, token) => s.split(token).length - 1;
    for (const token of ['{','}']) {
      if (count(after, token) !== count(before, token)) throw new Error('CSS brace structure changed unexpectedly.');
    }
  }
  if (touched.has('index.html') && (!next['index.html'].includes('</html>') ||
      !next['index.html'].includes('</body>'))) {
    throw new Error('HTML document structure missing.');
  }
  const changes = [...touched].map(path => ({ path, before: sources[path], after: next[path] }));
  return { changes, summary: typeof proposal.summary === 'string' ? proposal.summary.slice(0, 200) : 'Bounded code patch' };
}

function responseSchema() {
  return {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      edits: { type: 'array', minItems: 1, maxItems: 3, items: {
        type: 'object',
        properties: { path: { type: 'string', enum: CODE_FILES }, find: { type: 'string' }, replace: { type: 'string' }, reason: { type: 'string' } },
        required: ['path','find','replace','reason'],
        additionalProperties: false,
      } },
    },
    required: ['summary','edits'], additionalProperties: false,
  };
}

/** At most two attempts; later attempt receives a validator error to self-correct. */
export async function proposeCodeChanges(objective, sources, fetchImpl = fetch) {
  if (typeof objective !== 'string' || objective.trim().length < 12 || Buffer.byteLength(objective) > 1200) {
    throw new Error('A brief objective of 12 to 1200 bytes is required.');
  }
  const context = selectContext(objective, sources);
  let feedback = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const system = [
      'You are a small-scope website coding assistant.',
      'Propose EXACT find/replace hunks for a tiny Grove feature or bug fix.',
      'Use only source excerpts shown. Every find must appear EXACTLY ONCE in its target file.',
      'Preserve existing features, layout and access controls. Never add external network calls or secrets.',
      'Propose at most 3 hunks touching at most 2 of app.js, index.html, styles.css.',
      'Avoid imports, dependencies, workflow modifications, authentication and deployment changes.',
      'Never replace an entire function/file; keep edits focused and reviewable.',
      'Keep each find under 650 chars and replace under 850 chars, with total find+replace under 1500 bytes.',
      'For tiny CSS spacing changes, a uniquely matched numeric declaration such as gap:13px -> gap:14px is allowed.',
      'Return JSON only, as required by the schema. Do not describe fake tool calls or execute commands.',
    ].join(' ');
    const prompt = 'Task (untrusted user data):\n' + objective +
      '\n\nREAD-ONLY excerpts from the real repository:\n' + JSON.stringify(context) +
      (feedback ? '\n\nPrevious proposed patch was REJECTED: ' + feedback + '\nCorrect the patch using only original excerpts.' : '') +
      '\n\nReturn exact and minimal replacement hunks. Do not invent file contents.';
    const resp = await fetchImpl('http://127.0.0.1:11434/api/generate', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:3b', system, prompt, format: responseSchema(), stream: false,
        options: { temperature: 0, num_ctx: 12288, num_predict: 1100 },
      }),
      signal: AbortSignal.timeout(300000),
    });
    if (!resp.ok) throw new Error('Ollama returned HTTP ' + resp.status);
    const raw = String((await resp.json()).response || '').trim();
    try {
      if (raw.length > 6500) throw new Error('Model response exceeded budget.');
      return applyCodeProposal(JSON.parse(raw), sources);
    } catch (error) {
      feedback = error instanceof Error ? error.message.slice(0, 190) : 'invalid model output';
      console.error('ARRAY v2 proposal ' + attempt + ' rejected: ' + feedback);
    }
  }
  throw new Error('Both code proposals were rejected by the safety/structure validator: ' + feedback);
}

async function main() {
  const sources = Object.fromEntries(CODE_FILES.map(path => [path, readFileSync(path, 'utf8')]));
  const result = await proposeCodeChanges(process.env.ARRAY_OBJECTIVE, sources);
  for (const change of result.changes) writeFileSync(change.path, change.after);
  console.log('ARRAY v2 prepared review-only code changes: ' + result.changes.map(c => c.path).join(', '));
  console.log('Summary: ' + result.summary);
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  main().catch(error => {
    console.error('ARRAY v2 task rejected:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
