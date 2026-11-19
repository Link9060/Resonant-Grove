"""Regression: a storage failure remains a failed save even if error-state rendering fails."""
from pathlib import Path
import shutil
import subprocess
import unittest

APP = (Path(__file__).resolve().parents[1] / "app.js").read_text(encoding="utf-8")


class FailedSaveRenderTests(unittest.TestCase):
    def test_storage_and_render_failures_do_not_escape_or_sync(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js unavailable; behavioral test not run")
        start = APP.index("function save() {")
        end = APP.index("  function log(", start)
        source = APP[start:end]
        script = """
const assert = require('node:assert/strict');
let writes = 0, renders = 0, errors = 0, scheduled = 0;
const db = {seeds: [{id: 'unsaved'}]};
const KEY = 'grove-test';
const localStorage = {setItem: () => {writes++; throw Error('quota exceeded');}};
const render = () => {renders++; throw Error('render failed');};
const toast = (_message, isError) => {if (isError) errors++;};
const window = {GroveCloud: {scheduleSave: () => scheduled++}};
""" + source + """
assert.equal(save(), false, 'storage failure must return false even when render fails');
assert.equal(writes, 1);
assert.equal(renders, 1);
assert.equal(errors, 1);
assert.equal(scheduled, 0, 'never schedule cloud sync after failed storage write');
"""
        result = subprocess.run([node, "-e", script], text=True,
                                capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
