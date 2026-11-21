/** P2-QA-108: CLI requires an explicit destination and supports fresh nested local paths. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, existsSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeRestoreFixtures} from './restore-fixtures.mjs';

const cli = fileURLToPath(new URL('./restore-fixtures.mjs', import.meta.url));
const run = (args, cwd) => spawnSync(process.execPath, [cli, ...args], {
  cwd, encoding: 'utf8', timeout: 10000
});

test('P2-QA-108: missing output directory fails without creating fixtures', () => {
  const root = mkdtempSync(join(tmpdir(), 'grove-p2-cli-'));
  try {
    const result = run([], root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /explicit local output directory/);
    for (const name of Object.keys(makeRestoreFixtures())) {
      assert.equal(existsSync(join(root, name)), false);
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('P2-QA-108: fresh nested directory receives exact deterministic fixture bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'grove-p2-cli-'));
  const nested = join(root, 'qa', 'restore');
  try {
    const result = run([nested], root);
    assert.equal(result.status, 0, result.stderr);
    for (const [name, value] of Object.entries(makeRestoreFixtures())) {
      assert.equal(readFileSync(join(nested, name), 'utf8'), value);
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
