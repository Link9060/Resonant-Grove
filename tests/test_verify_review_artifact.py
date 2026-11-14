"""Regression tests for the downloadable Grove review artifact verifier."""
import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "verify_review_artifact.py"
spec = importlib.util.spec_from_file_location("grove_artifact_verifier", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ArtifactVerificationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / ".nojekyll").write_bytes(b"")
        (self.root / "review.html").write_text("<h1>Review</h1>", encoding="utf-8")
        (self.root / "docs").mkdir()
        (self.root / "docs" / "guide.txt").write_text("test", encoding="utf-8")
        self.write_manifest()

    def write_manifest(self):
        lines = []
        for file in sorted(self.root.rglob("*")):
            if file.is_file() and file.name != "SHA256SUMS.txt":
                name = file.relative_to(self.root).as_posix()
                lines.append(f"{hashlib.sha256(file.read_bytes()).hexdigest()}  {name}")
        (self.root / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    def assert_rejected(self):
        with self.assertRaises(ValueError):
            module.verify(self.root)

    def test_valid_artifact(self):
        module.verify(self.root)

    def test_modified_file(self):
        (self.root / "review.html").write_text("tampered", encoding="utf-8")
        self.assert_rejected()

    def test_unlisted_file(self):
        (self.root / "extra.txt").write_text("unlisted", encoding="utf-8")
        self.assert_rejected()

    def test_missing_hidden_file(self):
        (self.root / ".nojekyll").unlink()
        self.assert_rejected()

    def test_duplicate_manifest_entry(self):
        manifest = self.root / "SHA256SUMS.txt"
        first = manifest.read_text(encoding="utf-8").splitlines()[0]
        with manifest.open("a", encoding="utf-8") as out:
            out.write(first + "\n")
        self.assert_rejected()

    def test_path_traversal(self):
        manifest = self.root / "SHA256SUMS.txt"
        manifest.write_text("0" * 64 + "  ../outside.txt\n", encoding="utf-8")
        self.assert_rejected()

    def test_symlink(self):
        (self.root / "link.txt").symlink_to(self.root / "review.html")
        self.assert_rejected()


if __name__ == "__main__":
    unittest.main()
