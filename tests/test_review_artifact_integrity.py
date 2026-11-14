"""Regression coverage for strict Grove review artifact integrity verification."""
import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

VERIFIER = Path(__file__).resolve().parents[1] / "scripts" / "verify_review_artifact.py"
spec = importlib.util.spec_from_file_location("grove_review_verifier", VERIFIER)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReviewArtifactIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / ".nojekyll").write_bytes(b"")
        (self.root / "review.html").write_text("<html>test</html>", encoding="utf-8")
        self.write_manifest()

    def write_manifest(self):
        entries = []
        for path in sorted(self.root.rglob("*")):
            if path.is_file() and path.name != "SHA256SUMS.txt":
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                entries.append(f"{digest}  {path.relative_to(self.root).as_posix()}")
        (self.root / "SHA256SUMS.txt").write_text("\n".join(entries) + "\n", encoding="utf-8")

    def test_valid_artifact_passes(self):
        module.verify(self.root)

    def test_modified_file_is_rejected(self):
        (self.root / "review.html").write_text("tampered", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Checksum mismatch"):
            module.verify(self.root)

    def test_unlisted_file_is_rejected(self):
        (self.root / "unlisted.txt").write_text("extra", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Manifest coverage mismatch"):
            module.verify(self.root)

    def test_duplicate_manifest_entry_is_rejected(self):
        manifest = self.root / "SHA256SUMS.txt"
        first = manifest.read_text(encoding="utf-8").splitlines()[0]
        manifest.write_text(manifest.read_text(encoding="utf-8") + first + "\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Duplicate manifest entry"):
            module.verify(self.root)

    def test_manifest_path_traversal_is_rejected(self):
        manifest = self.root / "SHA256SUMS.txt"
        manifest.write_text(manifest.read_text(encoding="utf-8") +
                            ("0" * 64) + "  ../outside.txt\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Unsafe or missing file"):
            module.verify(self.root)

    def test_symlink_is_rejected(self):
        target = self.root / "review.html"
        (self.root / "alias.html").symlink_to(target)
        with self.assertRaisesRegex(ValueError, "Symlink not permitted"):
            module.verify(self.root)


if __name__ == "__main__":
    unittest.main()
