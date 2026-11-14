"""Regression check: failed local persistence must not enqueue cloud sync."""
from pathlib import Path
import unittest

APP = (Path(__file__).resolve().parents[1] / "app.js").read_text(encoding="utf-8")


class SaveFailureTests(unittest.TestCase):
    def test_failed_local_save_returns_before_cloud_sync(self):
        # Use stable function boundaries instead of a fragile regex with escaped braces.
        self.assertIn("function save() {", APP)
        self.assertIn("  function log(", APP)
        body = APP.split("function save() {", 1)[1].split("  function log(", 1)[0]
        self.assertIn("localStorage.setItem(KEY,JSON.stringify(db))", body)
        self.assertIn("catch (error) {", body)
        self.assertIn("return false;", body)
        self.assertLess(body.index("catch (error) {"), body.index("return false;"))
        self.assertLess(body.index("return false;"), body.index("scheduleSave"))
        self.assertIn("return true;", body)


if __name__ == "__main__":
    unittest.main()
