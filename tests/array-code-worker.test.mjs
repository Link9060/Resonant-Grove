import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCodeProposal, proposeCodeChanges, selectContext } from '../scripts/array-code-worker.mjs';

const base = {
  'app.js': "(() => {\n const getCount = (items) => items.length;\n const nextCount = getCount([1,2,3]);\n console.log(nextCount);\n})();\n",
  'index.html': "<!doctype html><html><body><main><h1>Build your next Seed.</h1><p>Add your first project below.</p></main></body></html>",
  'styles.css': ".header { display: flex; color: #fff; }\n.seed-card { padding: 12px; background: #eee; }\n",
};
const patch = {
  summary: 'Tweak presentation and count computation',
  edits: [
    { path: 'app.js', find: 'const getCount = (items) => items.length;', replace: 'const getCount = (items) => items.filter(Boolean).length;', reason: 'Skip absent items' },
    { path: 'styles.css', find: '.seed-card { padding: 12px; background: #eee; }', replace: '.seed-card { padding: 14px; background: #eee; }', reason: 'Space cards' },
  ],
};

test('allows small, validated changes across two files', () => {
  const out = applyCodeProposal(patch, base);
  assert.deepEqual(out.changes.map(change => change.path), ['app.js', 'styles.css']);
  assert.match(out.changes[0].after, /filter\(Boolean\)/);
  assert.match(out.changes[1].after, /padding: 14px/);
  assert.equal(base['app.js'].includes('filter(Boolean)'), false);
});

test('rejects source files outside strict allowlist and fake tools', () => {
  assert.throws(() => applyCodeProposal({ edits: [{ path: '.github/workflows/deploy.yml', find: 'hello world repeated a lot', replace: 'goodbye world repeated a lot' }] }, base), /allowlist/);
  assert.throws(() => applyCodeProposal({ name: 'write', arguments: { path: 'app.js', content: 'rewrite' } }, base), /structured edits/);
});

test('stops whole-file replacements or absent/ambiguous hunks', () => {
  assert.throws(() => applyCodeProposal({ edits: [{ path: 'app.js', find: 'short', replace: 'some new code for this file' }] }, base), /too large/);
  assert.throws(() => applyCodeProposal({ edits: [{ path: 'app.js', find: 'Missing identifier appears nowhere', replace: 'another long identifying string' }] }, base), /not found uniquely/);
  assert.throws(() => applyCodeProposal({ edits: [{ path: 'styles.css', find: '.seed-card { padding: 12px; background: #eee; }', replace: '.seed-card { padding: 12px; background: #eee; }' }] }, base), /unchanged/);
});

test('rejects generated dangerous external calls and syntax errors', () => {
  const source = 'const getCount = (items) => items.length;';
  assert.throws(() => applyCodeProposal({ edits: [{ path: 'app.js', find: source, replace: 'const getCount = (items) => fetch("https://example.com");' }] }, base), /restricted high-risk/);
  assert.throws(() => applyCodeProposal({ edits: [{ path: 'app.js', find: source, replace: 'const getCount = (items) => (items.length;' }] }, base), /syntax error/);
  assert.throws(() => applyCodeProposal({ edits: [{ path: 'index.html', find: 'Add your first project below.', replace: '<script>alert("evil")</script>' }] }, base), /high-risk|restricted HTML/);
});

test('does not allow three distinct edited source files', () => {
  const edits = [
    patch.edits[0], patch.edits[1],
    { path: 'index.html', find: 'Add your first project below.', replace: 'Add your first Grove project here.' },
  ];
  assert.throws(() => applyCodeProposal({ edits }, base), /Maximum two changed files/);
});

test('does not allow unbalanced CSS braces', () => {
  assert.throws(() => applyCodeProposal({ edits: [{
    path: 'styles.css', find: '.header { display: flex; color: #fff; }',
    replace: '.header { display: flex; color: #fff; ',
  }] }, base), /brace structure/);
});

test('keyword context selection targets the right source window', () => {
  const chunks = selectContext('Improve seed card padding and count logic', base);
  assert.ok(chunks.length >= 1);
  assert.ok(chunks.some(chunk => chunk.path === 'styles.css'));
  assert.ok(chunks.every(chunk => typeof chunk.excerpt === 'string' && chunk.excerpt.length <= 820));
});

test('two-attempt correction loop validates before returning changes', async () => {
  let calls = 0;
  const mockFetch = async (_url, init) => {
    calls++;
    const payload = JSON.parse(init.body);
    assert.equal(payload.model, 'qwen2.5-coder:3b');
    assert.equal(payload.format.properties.edits.maxItems, 3);
    return {
      ok: true, json: async () => ({
        response: calls === 1 ? 'not json' : JSON.stringify(patch),
      }),
    };
  };
  const r = await proposeCodeChanges('Improve the card padding and seed count behavior', base, mockFetch);
  assert.equal(calls, 2);
  assert.equal(r.changes.length, 2);
});

test('refuses all-failed proposals without writing files', async () => {
  const mockFetch = async () => ({ ok: true, json: async () => ({ response: '{"edits":[]}' }) });
  await assert.rejects(proposeCodeChanges('Fix the card count behavior please', base, mockFetch), /Both code proposals/);
});


test('a uniquely occurring short CSS numeric declaration may be safely changed', () => {
  const result = applyCodeProposal({
    summary: 'Refine spacing',
    edits: [{ path: 'styles.css', find: 'padding: 12px', replace: 'padding: 14px', reason: 'Small spacing improvement' }],
  }, base);
  assert.equal(result.changes.length, 1);
  assert.match(result.changes[0].after, /padding: 14px/);
});

test('short CSS exception rejects high-impact or ambiguous changes', () => {
  assert.throws(() => applyCodeProposal({
    edits: [{ path: 'styles.css', find: 'padding: 12px', replace: 'padding: 40px' }],
  }, base), /missing, too large/);
  assert.throws(() => applyCodeProposal({
    edits: [{ path: 'styles.css', find: 'padding: 12px', replace: 'margin: 12px' }],
  }, base), /missing, too large/);
  assert.throws(() => applyCodeProposal({
    edits: [{ path: 'app.js', find: 'items.length', replace: 'items.filter(Boolean).length' }],
  }, base), /missing, too large/);
  assert.throws(() => applyCodeProposal({
    edits: [{ path: 'styles.css', find: 'padding: 12px', replace: 'padding: 13px' }],
  }, { ...base, 'styles.css': base['styles.css'] + '\n.another{padding: 12px;}' }), /not found uniquely/);
});
