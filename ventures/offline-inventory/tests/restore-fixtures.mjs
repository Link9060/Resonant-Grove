/** P2-QA-097: deterministic, fictional restore fixtures for controlled local browser QA.
 * Run: node ventures/offline-inventory/tests/restore-fixtures.mjs <output-directory>
 * Writes only to the explicitly supplied local directory. Never use real customer data.
 */
import {lstatSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWorksheet, toJson, fromJson} from '../src/inventory.mjs';

export function makeRestoreFixtures() {
  const a = toJson(createWorksheet([{id:'bolts',name:'Fictional bolts',count:3}]));
  const b = toJson(createWorksheet([{id:'nuts',name:'Fictional nuts',count:5}]));
  const invalid = JSON.stringify({schemaVersion:1,items:[{id:'bolts',name:'Fictional bolts',count:3}],total:99})+'\n';
  const oversized = ' '.repeat(65537);
  if (fromJson(a).total !== 3 || fromJson(b).total !== 5) throw Error('Fixture self-check failed');
  for (const sample of [invalid, oversized]) {
    let rejected = false;
    try { fromJson(sample); } catch { rejected = true; }
    if (!rejected) throw Error('Invalid fixture unexpectedly accepted');
  }
  return {'restore-a.json':a,'restore-b.json':b,'invalid-total.json':invalid,'oversized.json':oversized};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2];
  if (!directory) throw Error('Provide an explicit local output directory');
  const fixtures = makeRestoreFixtures();
  const targets = Object.entries(fixtures).map(([name, data]) => [resolve(directory, name), data]);
  // Preflight all paths so a rerun with a later existing file cannot create earlier partial fixtures.
  // lstat detects dangling symlinks too; existsSync follows them and misses these occupied paths.
  const occupied = target => {
    try { lstatSync(target); return true; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  };
  if (targets.some(([target]) => occupied(target))) throw Error('Fixture output already exists; refusing partial overwrite');
  mkdirSync(directory,{recursive:true});
  for (const [target,data] of targets) writeFileSync(target,data,{flag:'wx'});
  console.log('Wrote four fictional QA fixtures to '+resolve(directory));
}
