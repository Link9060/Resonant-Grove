/** P2-QA-108: CLI requires an explicit destination and supports fresh nested local paths. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, existsSync, readFileSync, rmSync, symlinkSync, lstatSync, writeFileSync} from 'node:fs';
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

test('P2-QA-113: dangling symlink at last fixture path blocks all output atomically', () => {
  const root = mkdtempSync(join(tmpdir(), 'grove-p2-cli-'));
  try {
    const last = join(root, 'oversized.json');
    symlinkSync(join(root, 'missing-target.json'), last);
    const result = run([root], root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /refusing partial overwrite/);
    assert.equal(lstatSync(last).isSymbolicLink(), true);
    for (const name of ['restore-a.json', 'restore-b.json', 'invalid-total.json']) {
      assert.equal(existsSync(join(root, name)), false, name + ' should not be created');
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('P2-QA-116: symlinked destination and parent directories refuse writes', () => {
  const root = mkdtempSync(join(tmpdir(), 'grove-p2-cli-'));
  try {
    const actual = join(root, 'actual');
    const alias = join(root, 'alias');
    const nested = join(alias, 'nested');
    mkdirSync(actual);
    symlinkSync(actual, alias, 'dir');
    for (const destination of [alias, nested]) {
      const result = run([destination], root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Symlinked fixture output directory is not allowed/);
    }
    for (const name of Object.keys(makeRestoreFixtures())) {
      assert.equal(existsSync(join(actual, name)), false);
      assert.equal(existsSync(join(actual, 'nested', name)), false);
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('P2-QA-122: dangling symlinked output directory refuses writes', () => {
  const root = mkdtempSync(join(tmpdir(), 'grove-p2-cli-'));
  try {
    const missing = join(root, 'not-created');
    const alias = join(root, 'dangling-alias');
    symlinkSync(missing, alias, 'dir');
    const result = run([alias], root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Symlinked fixture output directory is not allowed/);
    assert.equal(lstatSync(alias).isSymbolicLink(), true);
    assert.equal(existsSync(missing), false);
    for (const name of Object.keys(makeRestoreFixtures())) {
      assert.equal(existsSync(join(root, name)), false);
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('P2-QA-128: existing final fixture prevents partial writes and preserves original bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'grove-p2-cli-'));
  try {
    const last = join(root, 'oversized.json');
    const original = 'reviewer-owned file: do not replace';
    writeFileSync(last, original);
    const result = run([root], root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /refusing partial overwrite/);
    assert.equal(readFileSync(last, 'utf8'), original);
    for (const name of ['restore-a.json', 'restore-b.json', 'invalid-total.json']) {
      assert.equal(existsSync(join(root, name)), false, name + ' must not be created');
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('P2-QA-133: regular-file parent rejects nested output without altering parent', () => {
  const root = mkdtempSync(join(tmpdir(), 'grove-p2-cli-'));
  try {
    const parent = join(root, 'occupied-parent');
    const original = 'fictional reviewer file: preserve these bytes';
    writeFileSync(parent, original);
    const result = run([join(parent, 'nested')], root);
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync(parent, 'utf8'), original);
    assert.equal(lstatSync(parent).isFile(), true);
    for (const name of Object.keys(makeRestoreFixtures())) {
      assert.equal(existsSync(join(root, name)), false);
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
