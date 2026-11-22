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
        with self.assertRaises(urllib.error.HTTPError):
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

    def test_unallowlisted_linked_image_fails(self):
        (self.root / "index.html").write_text(
            "<html><body><img src='logo.svg'><script src='app.js'></script></body></html>",
            encoding="utf-8",
        )
        (self.root / "logo.svg").write_text(
            "<svg xmlns='http://www.w3.org/2000/svg'></svg>", encoding="utf-8"
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_missing_srcset_candidate_fails(self):
        (self.root / "index.html").write_text(
            "<html><body><img srcset='missing-small.svg 1x, missing-large.svg 2x'>"
            "<script src='app.js'></script></body></html>", encoding="utf-8"
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_unallowlisted_srcset_candidates_fail(self):
        (self.root / "index.html").write_text(
            "<html><body><picture><source srcset='small.svg 1x, large.svg 2x'>"
            "<img src='small.svg'></picture><script src='app.js'></script></body></html>",
            encoding="utf-8",
        )
        for name in ("small.svg", "large.svg"):
            (self.root / name).write_text(
                "<svg xmlns='http://www.w3.org/2000/svg'></svg>", encoding="utf-8"
            )
        with self.assertRaises(urllib.error.HTTPError):
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

    def test_unallowlisted_video_and_audio_assets_fail(self):
        (self.root / "index.html").write_text(
            "<html><body><video src='clip.webm' poster='poster.svg'></video>"
            "<audio src='sound.wav'></audio><script src='app.js'></script></body></html>",
            encoding="utf-8"
        )
        for name in ("clip.webm", "poster.svg", "sound.wav"):
            (self.root / name).write_bytes(b"test fixture")
        with self.assertRaises(urllib.error.HTTPError):
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

    def test_unallowlisted_embedded_assets_fail(self):
        (self.root / "index.html").write_text(
            "<html><body><iframe src='frame.html'></iframe>"
            "<video><track src='captions.vtt'></video>"
            "<object data='diagram.svg'></object>"
            "<embed src='document.pdf'><script src='app.js'></script></body></html>",
            encoding="utf-8",
        )
        for name in ("frame.html", "captions.vtt", "diagram.svg", "document.pdf"):
            (self.root / name).write_bytes(b"test fixture")
        # Even present-on-disk assets must fail if they are outside the
        # explicitly packaged public-file allowlist.
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_missing_css_background_asset_fails(self):
        (self.root / "styles.css").write_text(
            "body { background-image: url('missing-background.svg?v=1'); }", encoding="utf-8"
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_unallowlisted_css_background_asset_fails(self):
        (self.root / "styles.css").write_text(
            "body { background-image: url(\"background.svg?v=1\"); }", encoding="utf-8"
        )
        (self.root / "background.svg").write_text(
            "<svg xmlns='http://www.w3.org/2000/svg'></svg>", encoding="utf-8"
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_missing_unquoted_css_font_fails(self):
        (self.root / "styles.css").write_text(
            "@font-face { src: url(missing-font.woff2?v=2) format('woff2'); }",
            encoding="utf-8",
        )
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_unallowlisted_css_font_fails(self):
        (self.root / "styles.css").write_text(
            "@font-face { src: url(font.woff2?v=2) format('woff2'); }",
            encoding="utf-8",
        )
        (self.root / "font.woff2").write_bytes(b"fixture font")
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_unallowlisted_css_font_html_fallback_is_denied(self):
        (self.root / "styles.css").write_text(
            "@font-face { src: url(font.woff2); }", encoding="utf-8"
        )
        (self.root / "font.woff2").write_text("<html>fallback</html>", encoding="utf-8")
        original_guess_type = module.http.server.SimpleHTTPRequestHandler.guess_type

        def html_fallback(handler, path):
            if path.endswith("font.woff2"):
                return "text/html"
            return original_guess_type(handler, path)

        with patch.object(module.http.server.SimpleHTTPRequestHandler, "guess_type", html_fallback):
            with self.assertRaises(urllib.error.HTTPError):
                module.smoke(self.root, SHA)

    def test_unallowlisted_css_image_html_fallback_is_denied(self):
        (self.root / "styles.css").write_text(
            "body { background: url(background.svg); }", encoding="utf-8"
        )
        (self.root / "background.svg").write_text("<html>fallback</html>", encoding="utf-8")
        original_guess_type = module.http.server.SimpleHTTPRequestHandler.guess_type

        def html_fallback(handler, path):
            if path.endswith("background.svg"):
                return "text/html"
            return original_guess_type(handler, path)

        with patch.object(module.http.server.SimpleHTTPRequestHandler, "guess_type", html_fallback):
            with self.assertRaises(urllib.error.HTTPError):
                module.smoke(self.root, SHA)

    def test_unallowlisted_css_raster_html_fallback_is_denied(self):
        original_guess_type = module.http.server.SimpleHTTPRequestHandler.guess_type
        for extension in ("png", "jpg", "jpeg", "webp", "gif"):
            with self.subTest(extension=extension):
                filename = "background." + extension
                (self.root / "styles.css").write_text(
                    "body { background: url(" + filename + "); }", encoding="utf-8"
                )
                (self.root / filename).write_text("<html>fallback</html>", encoding="utf-8")

                def html_fallback(handler, path):
                    if path.endswith(filename):
                        return "text/html"
                    return original_guess_type(handler, path)

                with patch.object(module.http.server.SimpleHTTPRequestHandler, "guess_type", html_fallback):
                    with self.assertRaises(urllib.error.HTTPError):
                        module.smoke(self.root, SHA)

    def test_unallowlisted_css_raster_image_fails(self):
        (self.root / "styles.css").write_text(
            "body { background: url(background.png?v=1); }", encoding="utf-8"
        )
        (self.root / "background.png").write_bytes(b"fixture image")
        with self.assertRaises(urllib.error.HTTPError):
            module.smoke(self.root, SHA)

    def test_private_repository_paths_are_rejected_for_get_and_head(self):
        # A broad-copy packaging regression must fail before artifact upload.
        for relative in (
            ".github/workflows/deploy.yml",
            "tests/grove-preview-workflow.test.mjs",
            ".git/config",
            "README.md",
            "SUPABASE.md",
        ):
            with self.subTest(path=relative):
                target = self.root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text("private fixture", encoding="utf-8")
                # The smoke runner now checks the private route is denied; presence
                # on disk alone is a packaging-integrity concern, not HTTP exposure.
                module.smoke(self.root, SHA)
                target.unlink()

    def test_review_handler_denies_private_files_directly(self):
        # Defense in depth if a private file appears after artifact verification.
        import functools
        import http.server
        import threading
        import urllib.request
        for name in (".git/config", ".env", ".env.local", ".ssh/id_rsa", ".nojekyll", ".github/workflows/deploy.yml",
                     "tests/private.txt", "README.md", "SUPABASE.md"):
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text("private fixture", encoding="utf-8")
        handler = functools.partial(module.ReviewHandler, directory=str(self.root))
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base = f"http://127.0.0.1:{server.server_port}"
            for path in ("/.git/config", "/.env", "/.env.local", "/.ssh/id_rsa", "/.nojekyll", "/%2eenv", "/.github/workflows/deploy.yml",
                         "/tests/private.txt", "/README.md", "/SUPABASE.md",
                         "/%2egit/config"):
                for method in ("GET", "HEAD"):
                    with self.subTest(path=path, method=method):
                        request = urllib.request.Request(base + path, method=method)
                        with self.assertRaises(urllib.error.HTTPError) as error:
                            urllib.request.urlopen(request, timeout=5)
                        self.assertEqual(error.exception.code, 403)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)

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

    def test_duplicate_review_marker_fails(self):
        (self.root / "REVIEW.txt").write_text(
            f"GROVE_PREVIEW_SHA={SHA}\nGROVE_PREVIEW_SHA={SHA}\n", encoding="utf-8"
        )
        with self.assertRaisesRegex(AssertionError, "duplicated"):
            module.smoke(self.root, SHA)

    def test_conflicting_review_marker_fails(self):
        (self.root / "REVIEW.txt").write_text(
            f"GROVE_PREVIEW_SHA={SHA}\nGROVE_PREVIEW_SHA={'b' * 40}\n", encoding="utf-8"
        )
        with self.assertRaisesRegex(AssertionError, "duplicated"):
            module.smoke(self.root, SHA)

    def test_tampered_review_marker_fails(self):
        (self.root / "REVIEW.txt").write_text("GROVE_PREVIEW_SHA=" + "b" * 40, encoding="utf-8")
        with self.assertRaises(AssertionError):
            module.smoke(self.root, SHA)


if __name__ == "__main__":
    unittest.main()
