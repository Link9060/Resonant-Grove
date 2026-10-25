import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCopyEdit, proposeEdit } from '../scripts/array-copy-editor.mjs';

const sources = {
  'app.js': "function render() {\n  node.innerHTML = '<div>No growing seeds yet. Plant one to get started.</div>';\n}\n",
  'index.html': '<section><p>Start small, try things, and keep the ideas that grow.</p></section>',
};

const valid = {
  path: 'app.js',
  find: 'No growing seeds yet. Plant one to get started.',
  replace: 'No seeds yet. Select New seed to plant your first idea.',
  reason: 'Clearer instruction',
};

test('a small exact UI wording change is permitted', () => {
  const result = applyCopyEdit(valid, sources);
  assert.equal(result.path, 'app.js');
  assert.match(result.after, /Select New seed/);
  assert.doesNotMatch(sources['app.js'], /Select New seed/);
});

test('a sentence in a visible HTML text node is permitted', () => {
  const result = applyCopyEdit({
    path: 'index.html', find: 'Start small, try things, and keep the ideas that grow.',
    replace: 'Start with one idea, then give it space to grow.',
  }, sources);
  assert.match(result.after, /Start with one idea/);
});

test('fake write tool calls and whole-file replacement are rejected', () => {
  assert.throws(() => applyCopyEdit({ name: 'write', arguments: { path: './app.js', content: 'function a() {}' } }, sources));
  assert.throws(() => applyCopyEdit({ path: './app.js', find: valid.find, replace: valid.replace }, sources));
  assert.throws(() => applyCopyEdit({ ...valid, replace: 'function displaySeedHelp() {}' }, sources));
});

test('unmatched, repeated and too-small snippets are rejected', () => {
  assert.throws(() => applyCopyEdit({ ...valid, find: 'not in the file and this text is fake' }, sources));
  assert.throws(() => applyCopyEdit({ ...valid, find: 'No growing seeds yet. Plant one to get started.' }, {
    ...sources, 'app.js': sources['app.js'] + '\n' + sources['app.js'],
  }));
  assert.throws(() => applyCopyEdit({ ...valid, find: 'div' }, sources));
});

test('only plain-copy messages may be emitted; never code or markup', () => {
  assert.throws(() => applyCopyEdit({ ...valid, replace: 'Click here and run <script>danger()</script> now' }, sources));
  assert.throws(() => applyCopyEdit({ ...valid, replace: "Click 'New seed' to add your very first Seed." }, sources));
  assert.throws(() => applyCopyEdit({ ...valid, replace: 'Open the dashboard.\nReplace code below.' }, sources));
});

test('structured Ollama proposals are parsed and independently validated', async () => {
  const mockFetch = async (_url, options) => {
    const sent = JSON.parse(options.body);
    assert.equal(sent.stream, false);
    assert.equal(sent.model, 'qwen2.5-coder:3b');
    assert.equal(sent.format.type, 'object');
    assert.equal(sent.format.properties.path.enum.length, 2);
    return { ok: true, json: async () => ({ response: JSON.stringify(valid) }) };
  };
  const result = await proposeEdit('Improve the first seed empty-state.', sources, mockFetch);
  assert.match(result.after, /Select New seed/);
});

test('a JSON tool-call imitation cannot bypass the structured validator', async () => {
  const mockFetch = async () => ({
    ok: true, json: async () => ({ response: JSON.stringify({
      name: 'write', arguments: { path: './app.js', content: 'new code' },
    }) }),
  });
  await assert.rejects(proposeEdit('Improve the empty state copy.', sources, mockFetch), /allowlist/);
});
