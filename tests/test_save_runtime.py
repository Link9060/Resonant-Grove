"""Exercise Grove's real save() function with mocked browser storage and cloud sync.

Requires Node.js for behavioral execution; skipped when Node is unavailable.
"""
from pathlib import Path
import shutil
import subprocess
import unittest

APP = (Path(__file__).resolve().parents[1] / "app.js").read_text(encoding="utf-8")


class SaveRuntimeTests(unittest.TestCase):
    def test_storage_failure_does_not_schedule_cloud_sync(self):
        node = shutil.which("node")
        if not node:
            self.skipTest("Node.js is unavailable; behavioral save test not run")
        start = APP.index("function save() {")
        end = APP.index("  function log(", start)
        save_source = APP[start:end]
        script = """
const assert = require('node:assert/strict');
let writes = 0, scheduled = 0, renders = 0, errors = 0;
const db = {seeds: []};
const KEY = 'grove-test';
const window = {GroveCloud: {scheduleSave: () => scheduled++}};
let fail = true;
const localStorage = {setItem: () => {writes++; if (fail) throw Error('quota');}};
const toast = (_message, isError) => {if (isError) errors++;};
const render = () => renders++;
""" + save_source + """
assert.equal(save(), false, 'failed write must report failure');
assert.equal(scheduled, 0, 'failed write must not schedule cloud sync');
assert.equal(errors, 1, 'failed write must notify user');
fail = false;
assert.equal(save(), true, 'successful retry must report success');
assert.equal(scheduled, 1, 'successful write must schedule cloud sync once');
assert.equal(writes, 2);
assert.equal(renders, 2);
"""
        completed = subprocess.run(
            [node, "-e", script], text=True, capture_output=True, timeout=15
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)


if __name__ == "__main__":
    unittest.main()
