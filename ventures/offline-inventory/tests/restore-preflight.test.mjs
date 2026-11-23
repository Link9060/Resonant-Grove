/** P2-QA-105: fixture CLI must not partially write when a later output exists. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli = fileURLToPath(new URL('./restore-fixtures.mjs', import.meta.url));
const expected = ['invalid-total.json','oversized.json','restore-a.json','restore-b.json'];
function run(dir) { return spawnSync(process.execPath,[cli,dir],{encoding:'utf8',timeout:10000}); }
test('P2-QA-105: later existing fixture prevents all partial writes',()=>{
  const dir=mkdtempSync(join(tmpdir(),'grove-p2-fixture-'));
  try {
    writeFileSync(join(dir,'oversized.json'),'existing marker');
    const result=run(dir);
    assert.notEqual(result.status,0,result.stdout);
    assert.deepEqual(readdirSync(dir),['oversized.json']);
    assert.equal(readFileSync(join(dir,'oversized.json'),'utf8'),'existing marker');
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('P2-QA-105: fresh fixture generation succeeds and rerun preserves all files',()=>{
  const dir=mkdtempSync(join(tmpdir(),'grove-p2-fixture-'));
  try {
    const first=run(dir);
    assert.equal(first.status,0,first.stderr);
    assert.deepEqual(readdirSync(dir),expected);
    const before=expected.map(name=>readFileSync(join(dir,name)));
    const second=run(dir);
    assert.notEqual(second.status,0,second.stdout);
    assert.deepEqual(expected.map(name=>readFileSync(join(dir,name))),before);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
