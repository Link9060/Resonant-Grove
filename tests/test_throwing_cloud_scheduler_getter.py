"""Behavioral regression: a throwing cloud adapter getter cannot undo a local save."""
from pathlib import Path
import shutil
import subprocess
import unittest

APP = (Path(__file__).resolve().parents[1] / "app.js").read_text(encoding="utf-8")


class CloudGetterFailureTests(unittest.TestCase):
    def test_throwing_cloud_scheduler_getter_preserves_local_save(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js unavailable; behavioral test not run")
        start = APP.index("function save() {")
        end = APP.index("  function log(", start)
        source = APP[start:end]
        script = """
const assert = require('node:assert/strict');
let writes = 0, renders = 0, warnings = 0;
const db = {seeds: [{id: 'local-first'}]};
const KEY = 'grove-test';
const localStorage = {setItem: (key, value) => {
  assert.equal(key, KEY);
  assert.deepEqual(JSON.parse(value), db);
  writes++;
}};
const window = {GroveCloud: Object.defineProperty({}, 'scheduleSave', {
  get() { throw Error('cloud adapter unavailable'); }
})};
const toast = (_message, isError) => { if (isError) warnings++; };
const render = () => { renders++; };
""" + source + """
assert.equal(save(), true, 'cloud getter failure must not undo successful local write');
assert.equal(writes, 1);
assert.equal(renders, 1);
assert.equal(warnings, 1, 'cloud error should be reported');
"""
        result = subprocess.run([node, "-e", script], text=True,
                                capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
