"""Regression check: failed local persistence must not enqueue cloud sync."""
from pathlib import Path
import re
import unittest

APP = (Path(__file__).resolve().parents[1] / "app.js").read_text(encoding="utf-8")


class SaveFailureTests(unittest.TestCase):
    def test_failed_local_save_returns_before_cloud_sync(self):
        match = re.search(r"function save\\(\\)\\s*\\{([\\s\\S]*?)\\n  \\}\\n  function log", APP)
        self.assertIsNotNone(match)
        body = match.group(1)
        self.assertIn("localStorage.setItem(KEY,JSON.stringify(db))", body)
        self.assertRegex(body, r"catch \\(error\\) \\{[\\s\\S]*?return false;[\\s\\S]*?\\}")
        self.assertLess(body.index("return false;"), body.index("scheduleSave"))
        self.assertIn("return true;", body)


if __name__ == "__main__":
    unittest.main()
