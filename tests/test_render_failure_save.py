"""Behavioral regression: a rendering failure must not invalidate persisted data."""
from pathlib import Path
import shutil
import subprocess
import unittest

APP = (Path(__file__).resolve().parents[1] / "app.js").read_text(encoding="utf-8")


class RenderFailureSaveTests(unittest.TestCase):
    def test_render_failure_preserves_local_save_and_cloud_schedule(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js unavailable; behavioral test not run")
        start = APP.index("function save() {")
        end = APP.index("  function log(", start)
        source = APP[start:end]
        script = """
const assert = require('node:assert/strict');
const db = {seeds: [{id: 'render-failure'}]};
const KEY = 'grove-test';
let writes = 0, scheduled = 0, renders = 0, warnings = 0;
const localStorage = {setItem: (key, value) => {
  assert.equal(key, KEY);
  assert.deepEqual(JSON.parse(value), db);
  writes++;
}};
const window = {GroveCloud: {scheduleSave: () => scheduled++}};
const toast = (_message, isError) => {if (isError) warnings++;};
const render = () => {renders++; throw Error('render failure');};
""" + source + """
assert.equal(save(), true, 'persisted data should report save success');
assert.equal(writes, 1, 'workspace persisted exactly once');
assert.equal(renders, 1, 'render attempted');
assert.equal(scheduled, 1, 'cloud scheduling still attempted');
assert.equal(warnings, 1, 'render failure shown to user');
"""
        result = subprocess.run([node, "-e", script], text=True,
                                capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
