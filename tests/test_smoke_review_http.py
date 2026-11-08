"""Regression coverage for the loopback review artifact smoke test."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "smoke_review_http.py"
spec = importlib.util.spec_from_file_location("grove_smoke_review_http", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SHA = "a" * 40


class ReviewHttpSmokeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for filename, body in {
            "review.html": f'<code id="revision">{SHA}</code>',
            "REVIEW.txt": f"GROVE_PREVIEW_SHA={SHA}\n",
            "index.html": "<!doctype html><html lang='en'></html>",
            "app.js": "console.log('ready')",
            "styles.css": "body { color: black; }",
        }.items():
            (self.root / filename).write_text(body, encoding="utf-8")

    def test_complete_artifact_passes(self):
        module.smoke(self.root, SHA)

    def test_wrong_expected_sha_fails(self):
        with self.assertRaises(AssertionError):
            module.smoke(self.root, "b" * 40)

    def test_malformed_sha_fails_before_serving(self):
        with self.assertRaises(ValueError):
            module.smoke(self.root, "not-a-commit")

    def test_missing_asset_fails(self):
        (self.root / "app.js").unlink()
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_empty_asset_fails(self):
        (self.root / "styles.css").write_text("", encoding="utf-8")
        with self.assertRaises(AssertionError):
            module.smoke(self.root, SHA)

    def test_tampered_review_marker_fails(self):
        (self.root / "REVIEW.txt").write_text("GROVE_PREVIEW_SHA=" + "b" * 40, encoding="utf-8")
        with self.assertRaises(AssertionError):
            module.smoke(self.root, SHA)


if __name__ == "__main__":
    unittest.main()
