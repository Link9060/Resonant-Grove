// P2-QA-130: CLI must reject a regular file as the fixture output directory.
// Uses only fictional data and a temporary local sandbox.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('P2-QA-130 regular-file output path is rejected without modifying it', () => {
  const root = mkdtempSync(join(tmpdir(), 'grove-p2-file-destination-'));
  try {
    const destination = join(root, 'occupied');
    const sentinel = 'fictional fixture destination sentinel\n';
    writeFileSync(destination, sentinel);
    const script = fileURLToPath(new URL('./restore-fixtures.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, destination], {encoding: 'utf8'});
    assert.notEqual(result.status, 0, 'regular-file destination must fail');
    assert.equal(readFileSync(destination, 'utf8'), sentinel);
    assert.deepEqual(readdirSync(root), ['occupied'], 'no fixtures or extra directories created');
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
