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
            "index.html": "<!doctype html><html lang='en'><head><link rel='stylesheet' href='styles.css'></head><body><script src='app.js'></script></body></html>",
            "app.js": "console.log('ready')",
            "styles.css": "body { color: black; }",
        }.items():
            (self.root / filename).write_text(body, encoding="utf-8")

    def test_complete_artifact_passes(self):
        module.smoke(self.root, SHA)

    def test_missing_linked_asset_fails(self):
        (self.root / "index.html").write_text(
            "<html><head><link rel='stylesheet' href='missing.css'></head>"
            "<body><script src='app.js'></script></body></html>", encoding="utf-8")
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_linked_asset_empty_fails(self):
        (self.root / "index.html").write_text(
            "<html><body><script src='empty.js'></script></body></html>", encoding="utf-8")
        (self.root / "empty.js").write_text("", encoding="utf-8")
        with self.assertRaises(AssertionError):
            module.smoke(self.root, SHA)

    def test_linked_script_wrong_mime_fails(self):
        # Simulate a host returning a 200 HTML fallback for a JavaScript URL.
        original_guess_type = module.http.server.SimpleHTTPRequestHandler.guess_type

        def wrong_mime(handler, path):
            if path.endswith("app.js"):
                return "text/html"
            return original_guess_type(handler, path)

        with patch.object(module.http.server.SimpleHTTPRequestHandler, "guess_type", wrong_mime):
            with self.assertRaisesRegex(AssertionError, "Wrong content type for app.js"):
                module.smoke(self.root, SHA)

    def test_linked_stylesheet_wrong_mime_fails(self):
        original_guess_type = module.http.server.SimpleHTTPRequestHandler.guess_type

        def wrong_mime(handler, path):
            if path.endswith("styles.css"):
                return "text/html"
            return original_guess_type(handler, path)

        with patch.object(module.http.server.SimpleHTTPRequestHandler, "guess_type", wrong_mime):
            with self.assertRaisesRegex(AssertionError, "Wrong content type for styles.css"):
                module.smoke(self.root, SHA)

    def test_missing_linked_image_fails(self):
        (self.root / "index.html").write_text(
            "<html><body><img src='missing.svg'><script src='app.js'></script></body></html>",
            encoding="utf-8",
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_existing_linked_image_passes(self):
        (self.root / "index.html").write_text(
            "<html><body><img src='logo.svg'><script src='app.js'></script></body></html>",
            encoding="utf-8",
        )
        (self.root / "logo.svg").write_text(
            "<svg xmlns='http://www.w3.org/2000/svg'></svg>", encoding="utf-8"
        )
        module.smoke(self.root, SHA)

    def test_missing_srcset_candidate_fails(self):
        (self.root / "index.html").write_text(
            "<html><body><img srcset='missing-small.svg 1x, missing-large.svg 2x'>"
            "<script src='app.js'></script></body></html>", encoding="utf-8"
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_existing_srcset_candidates_pass(self):
        (self.root / "index.html").write_text(
            "<html><body><picture><source srcset='small.svg 1x, large.svg 2x'>"
            "<img src='small.svg'></picture><script src='app.js'></script></body></html>",
            encoding="utf-8",
        )
        for name in ("small.svg", "large.svg"):
            (self.root / name).write_text(
                "<svg xmlns='http://www.w3.org/2000/svg'></svg>", encoding="utf-8"
            )
        module.smoke(self.root, SHA)

    def test_missing_video_poster_fails(self):
        (self.root / "index.html").write_text(
            "<html><body><video poster='missing-poster.svg'></video>"
            "<script src='app.js'></script></body></html>", encoding="utf-8"
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_missing_direct_audio_source_fails(self):
        (self.root / "index.html").write_text(
            "<html><body><audio src='missing-audio.wav'></audio>"
            "<script src='app.js'></script></body></html>", encoding="utf-8"
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_present_video_and_audio_assets_pass(self):
        (self.root / "index.html").write_text(
            "<html><body><video src='clip.webm' poster='poster.svg'></video>"
            "<audio src='sound.wav'></audio><script src='app.js'></script></body></html>",
            encoding="utf-8"
        )
        for name in ("clip.webm", "poster.svg", "sound.wav"):
            (self.root / name).write_bytes(b"test fixture")
        module.smoke(self.root, SHA)

    def test_missing_embedded_assets_fail(self):
        cases = (
            "<iframe src='missing-frame.html'></iframe>",
            "<video><track src='missing-captions.vtt'></video>",
            "<object data='missing-diagram.svg'></object>",
            "<embed src='missing-document.pdf'>",
        )
        for markup in cases:
            with self.subTest(markup=markup):
                (self.root / "index.html").write_text(
                    "<html><body>" + markup + "<script src='app.js'></script></body></html>",
                    encoding="utf-8",
                )
                with self.assertRaises(urllib.error.HTTPError):
                    module.smoke(self.root, SHA)

    def test_existing_embedded_assets_pass(self):
        (self.root / "index.html").write_text(
            "<html><body><iframe src='frame.html'></iframe>"
            "<video><track src='captions.vtt'></video>"
            "<object data='diagram.svg'></object>"
            "<embed src='document.pdf'><script src='app.js'></script></body></html>",
            encoding="utf-8",
        )
        for name in ("frame.html", "captions.vtt", "diagram.svg", "document.pdf"):
            (self.root / name).write_bytes(b"test fixture")
        module.smoke(self.root, SHA)

    def test_missing_css_background_asset_fails(self):
        (self.root / "styles.css").write_text(
            "body { background-image: url('missing-background.svg?v=1'); }", encoding="utf-8"
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_existing_css_background_asset_passes(self):
        (self.root / "styles.css").write_text(
            "body { background-image: url(\"background.svg?v=1\"); }", encoding="utf-8"
        )
        (self.root / "background.svg").write_text(
            "<svg xmlns='http://www.w3.org/2000/svg'></svg>", encoding="utf-8"
        )
        module.smoke(self.root, SHA)

    def test_missing_unquoted_css_font_fails(self):
        (self.root / "styles.css").write_text(
            "@font-face { src: url(missing-font.woff2?v=2) format('woff2'); }",
            encoding="utf-8",
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_existing_unquoted_css_font_passes(self):
        (self.root / "styles.css").write_text(
            "@font-face { src: url(font.woff2?v=2) format('woff2'); }",
            encoding="utf-8",
        )
        (self.root / "font.woff2").write_bytes(b"fixture font")
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
