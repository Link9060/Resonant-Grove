/**
 * ARRAY Safe Copy Editor
 *
 * Local Ollama suggests a single find/replace of public UI copy.
 * No model-generated shell commands, arbitrary code writes, or fake tool calls.
 * This is intentionally NOT a general purpose autonomous coding agent.
 */
import { readFileSync, writeFileSync } from 'node:fs';

export const EDITABLE = ['app.js', 'index.html'];
const PLAIN_COPY = /^[A-Za-z0-9 ,.!?:;()&/+–\-]+$/;
const PATTERNS = [
  /No growing seeds yet/ig, /Plant something new/ig, /Have another idea/ig,
  /empty.state/ig, /seedGrid/ig, /view-seeds/ig, /new-seed/ig,
  /first seed/ig, /Start small/ig,
];

export function applyCopyEdit(edit, sources) {
  if (edit === null || typeof edit !== 'object' || Array.isArray(edit)) {
    throw new Error('No structured edit was returned.');
  }
  const { path, find, replace } = edit;
  if (!EDITABLE.includes(path)) {
    throw new Error('Model selected a file outside the text-edit allowlist.');
  }
  if (typeof find !== 'string' || typeof replace !== 'string' ||
      find.length < 22 || find.length > 240 ||
      replace.length < 22 || replace.length > 300 ||
      !PLAIN_COPY.test(find) || !PLAIN_COPY.test(replace) ||
      find.split(/\s+/).length < 5 || replace.split(/\s+/).length < 5 ||
      find === replace) {
    throw new Error('Model edit failed strict plain-copy validation.');
  }
  const before = sources[path];
  if (typeof before !== 'string') throw new Error('Source file missing.');
  const first = before.indexOf(find);
  if (first < 0 || before.indexOf(find, first + find.length) !== -1) {
    throw new Error('Original wording not found exactly once. No edit applied.');
  }

  // Only replace within a single-quoted JavaScript literal or user-visible HTML text.
  // JS: the entire original snippet must sit inside one string with unchanged delimiters.
  if (path === 'app.js') {
    const lineStart = before.lastIndexOf('\n', first - 1) + 1;
    const prior = before.slice(lineStart, first);
    const quoteCount = (prior.match(/'/g) || []).length;
    if (quoteCount % 2 !== 1) {
      throw new Error('Edit is not inside a single-quoted UI text string.');
    }
  } else {
    const prior = before.slice(0, first);
    if (prior.lastIndexOf('>') <= prior.lastIndexOf('<')) {
      throw new Error('HTML edit is not in a text node.');
    }
  }

  const after = before.slice(0, first) + replace + before.slice(first + find.length);
  if (after === before || Math.abs(after.length - before.length) > 290) {
    throw new Error('Proposed change is ineffective or too large.');
  }
  return { path, after, summary: 'Replaced one verified existing user-facing text snippet.' };
}

function snippets(sources) {
  const items = [];
  for (const path of EDITABLE) {
    const input = sources[path];
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      let match;
      let count = 0;
      while ((match = re.exec(input)) && count++ < 2 && items.length < 24) {
        const from = Math.max(0, match.index - 170);
        const to = Math.min(input.length, match.index + 340);
        items.push({ path, excerpt: input.slice(from, to).replace(/\r/g, '') });
      }
    }
  }
  // Repeated snippets intentionally stay small to fit a CPU model's context budget.
  return items.slice(0, 19);
}

function schema() {
  return {
    type: 'object',
    properties: {
      path: { type: 'string', enum: EDITABLE },
      find: { type: 'string' },
      replace: { type: 'string' },
      reason: { type: 'string' },
    },
    required: ['path', 'find', 'replace', 'reason'],
    additionalProperties: false,
  };
}

export async function proposeEdit(objective, sources, fetchImpl = fetch) {
  if (typeof objective !== 'string' || !objective.trim() || objective.length > 1200) {
    throw new Error('A brief objective is required.');
  }
  const passages = snippets(sources);
  const system = [
    'You are a UI copy editor. Suggest ONE very small wording change.',
    'Return a JSON object with path, find, replace and reason.',
    'Copy the find text EXACTLY from provided source, including punctuation.',
    'Both find and replace must be plain user-facing ENGLISH SENTENCES, not code.',
    'Choose a single literal message in app.js or a text node in index.html.',
    'Do NOT include quote characters, apostrophes, HTML, JavaScript, escapes or newlines.',
    'Do not attempt to write files or call tools. A trusted validator applies your proposal.',
    'The replace sentence should be clear, natural and make the UI more understandable.',
    'Do not invent button names. For adding a Seed, the existing interface calls the action "Plant a seed" or "New seed".',
    'If the objective is unrelated to these source excerpts, pick the closest relevant existing user-facing message.',
  ].join(' ');
  const prompt = 'Objective:\n' + objective +
    '\n\nHere are READ-ONLY original site excerpts. Make a literal find/replace of a user-facing sentence from them:\n' +
    JSON.stringify(passages) +
    '\n\nAnswer ONLY the structured JSON object. Never output code.';
  const response = await fetchImpl('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5-coder:3b',
      system,
      prompt,
      stream: false,
      format: schema(),
      options: { temperature: 0, num_ctx: 8192, num_predict: 220 },
    }),
    signal: AbortSignal.timeout(240000),
  });
  if (!response.ok) throw new Error('Ollama generation failed: HTTP ' + response.status);
  const payload = await response.json();
  const raw = String(payload.response || '').trim();
  if (raw.length > 2400) throw new Error('Model output exceeded the proposal budget.');
  let edit;
  try { edit = JSON.parse(raw); }
  catch { throw new Error('Ollama did not return valid JSON.'); }
  return applyCopyEdit(edit, sources);
}

async function main() {
  const sources = Object.fromEntries(EDITABLE.map(p => [p, readFileSync(p, 'utf8')]));
  const result = await proposeEdit(process.env.ARRAY_OBJECTIVE, sources);
  writeFileSync(result.path, result.after);
  console.log('ARRAY Safe Copy Editor changed: ' + result.path);
  console.log(result.summary);
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  main().catch(error => {
    console.error('ARRAY Builder refused proposal:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
