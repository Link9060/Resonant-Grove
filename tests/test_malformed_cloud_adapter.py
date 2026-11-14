"""Behavioral regression: malformed optional cloud adapter must not discard local saves."""
from pathlib import Path
import shutil
import subprocess
import unittest

APP = (Path(__file__).resolve().parents[1] / "app.js").read_text(encoding="utf-8")


class MalformedCloudAdapterTests(unittest.TestCase):
    def test_noncallable_cloud_scheduler_preserves_local_save(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js unavailable; behavioral test not run")
        start = APP.index("function save() {")
        end = APP.index("  function log(", start)
        source = APP[start:end]
        script = """
const assert = require('node:assert/strict');
let writes = 0, renders = 0, warnings = 0;
const db = {seeds: [{id: 'offline-safe'}]};
const KEY = 'grove-test';
const localStorage = {setItem: (key, value) => {
  assert.equal(key, KEY);
  assert.deepEqual(JSON.parse(value), db);
  writes++;
}};
const window = {GroveCloud: {scheduleSave: 'not-a-function'}};
const toast = (_message, isError) => {if (isError) warnings++;};
const render = () => renders++;
""" + source + """
assert.equal(save(), true, 'successful local write must remain successful');
assert.equal(writes, 1, 'workspace must be persisted once');
assert.equal(renders, 1, 'UI must render after local save');
assert.equal(warnings, 1, 'malformed cloud scheduler should warn');
"""
        result = subprocess.run([node, "-e", script], text=True,
                                capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
