"""Regression tests for the integrity-gated loopback review launcher."""
import contextlib
import importlib.util
import io
import functools
import http.client
import http.server
import threading
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "serve_review.py"
spec = importlib.util.spec_from_file_location("grove_serve_review", SCRIPT)
serve_review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(serve_review)
SHA = "a" * 40


class ServeReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "scripts").mkdir()
        (self.root / "scripts" / "verify_review_artifact.py").write_text("# verifier\n")
        (self.root / "REVIEW.txt").write_text(f"GROVE_PREVIEW_SHA={SHA}\n")
        (self.root / "review.html").write_text(f'<code id="revision">{SHA}</code>')

    def invoke(self, *args):
        with mock.patch.object(sys, "argv", ["serve_review.py", str(self.root), *args]), contextlib.redirect_stderr(io.StringIO()):
            return serve_review.main()

    def test_missing_marker_refuses_to_start(self):
        (self.root / "REVIEW.txt").unlink()
        with mock.patch.object(serve_review.subprocess, "run") as verify, mock.patch.object(
            serve_review.http.server, "ThreadingHTTPServer"
        ) as server:
            with self.assertRaises(SystemExit):
                self.invoke()
            verify.assert_not_called()
            server.assert_not_called()

    def test_duplicate_revision_markers_refuse_to_start(self):
        # Ambiguous metadata must never select an arbitrary build revision.
        with mock.patch.object(serve_review.subprocess, "run") as verify, mock.patch.object(
            serve_review.http.server, "ThreadingHTTPServer"
        ) as server:
            for extra in (SHA, "b" * 40):
                with self.subTest(extra=extra):
                    (self.root / "REVIEW.txt").write_text(
                        f"GROVE_PREVIEW_SHA={SHA}\nGROVE_PREVIEW_SHA={extra}\n"
                    )
                    with self.assertRaises(SystemExit):
                        self.invoke("--expected-sha", SHA)
            verify.assert_not_called()
            server.assert_not_called()

    def test_malformed_or_extra_sha_metadata_refuses_to_start(self):
        # Invalid duplicates cannot be ignored when a valid SHA also exists.
        with mock.patch.object(serve_review.subprocess, "run") as verify, mock.patch.object(
            serve_review.http.server, "ThreadingHTTPServer"
        ) as server:
            for marker in (
                f"GROVE_PREVIEW_SHA={SHA}\nGROVE_PREVIEW_SHA=invalid\n",
                f"GROVE_PREVIEW_SHA=invalid\nGROVE_PREVIEW_SHA={SHA}\n",
                f"GROVE_PREVIEW_SHA={SHA}\nGROVE_PREVIEW_SHA={SHA.upper()}\n",
                "GROVE_PREVIEW_SHA=invalid\n",
            ):
                with self.subTest(marker=marker):
                    (self.root / "REVIEW.txt").write_text(marker)
                    with self.assertRaises(SystemExit):
                        self.invoke("--expected-sha", SHA)
            verify.assert_not_called()
            server.assert_not_called()

    def test_invalid_port_refuses_before_verification(self):
        with mock.patch.object(serve_review.subprocess, "run") as verify, mock.patch.object(
            serve_review.http.server, "ThreadingHTTPServer"
        ) as server:
            for port in ("0", "65536", "-1"):
                with self.subTest(port=port), self.assertRaises(SystemExit):
                    self.invoke("--port", port)
            verify.assert_not_called()
            server.assert_not_called()

    def test_mismatched_revision_refuses_to_start(self):
        (self.root / "review.html").write_text('<code id="revision">wrong</code>')
        with mock.patch.object(serve_review.subprocess, "run") as verify, mock.patch.object(
            serve_review.http.server, "ThreadingHTTPServer"
        ) as server:
            with self.assertRaises(SystemExit):
                self.invoke()
            verify.assert_not_called()
            server.assert_not_called()

    def test_failed_integrity_verification_refuses_to_start(self):
        with mock.patch.object(serve_review.subprocess, "run", return_value=mock.Mock(returncode=1)), mock.patch.object(
            serve_review.http.server, "ThreadingHTTPServer"
        ) as server:
            with self.assertRaises(SystemExit):
                self.invoke()
            server.assert_not_called()

    def test_review_response_disables_caching_and_framing(self):
        handler = object.__new__(serve_review.ReviewHandler)
        with mock.patch.object(handler, "send_header") as header, mock.patch.object(
            serve_review.http.server.SimpleHTTPRequestHandler, "end_headers"
        ) as parent:
            handler.end_headers()
        self.assertEqual(header.call_args_list, [
            mock.call("Cache-Control", "no-store, max-age=0"),
            mock.call("X-Content-Type-Options", "nosniff"),
            mock.call("X-Frame-Options", "DENY"),
            mock.call("Referrer-Policy", "no-referrer"),
            mock.call("Permissions-Policy", "camera=(), microphone=(), geolocation=()"),
        ])
        parent.assert_called_once_with()

    def test_real_http_response_has_privacy_headers_and_no_cache(self):
        # Exercise an actual loopback HTTP response, not just a mocked handler.
        (self.root / "index.html").write_text("<title>Grove review</title>")
        handler = functools.partial(serve_review.ReviewHandler, directory=str(self.root))
        with http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                try:
                    connection.request("GET", "/index.html")
                    response = connection.getresponse()
                    self.assertEqual(response.status, 200)
                    self.assertIn(b"Grove review", response.read())
                    self.assertEqual(response.getheader("Cache-Control"), "no-store, max-age=0")
                    self.assertEqual(response.getheader("X-Content-Type-Options"), "nosniff")
                    self.assertEqual(response.getheader("X-Frame-Options"), "DENY")
                    self.assertEqual(response.getheader("Referrer-Policy"), "no-referrer")
                    self.assertEqual(response.getheader("Permissions-Policy"), "camera=(), microphone=(), geolocation=()")
                finally:
                    connection.close()
            finally:
                server.shutdown()
                thread.join(timeout=3)

    def test_directory_listing_is_denied_but_assets_still_load(self):
        (self.root / "assets").mkdir()
        (self.root / "assets" / "sample.css").write_text("body { color: black; }")
        handler = functools.partial(serve_review.ReviewHandler, directory=str(self.root))
        with http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                try:
                    connection.request("GET", "/assets/")
                    response = connection.getresponse()
                    self.assertEqual(response.status, 403)
                    self.assertNotIn(b"sample.css", response.read())
                    connection.request("GET", "/assets/sample.css")
                    response = connection.getresponse()
                    self.assertEqual(response.status, 200)
                    self.assertIn(b"color: black", response.read())
                finally:
                    connection.close()
            finally:
                server.shutdown()
                thread.join(timeout=3)

    def test_http_encoded_traversal_cannot_read_outside_artifact(self):
        # Even a verified artifact should not expose neighboring local files.
        outside = self.root.parent / "private-review-neighbor.txt"
        outside.write_text("never expose neighboring files")
        self.addCleanup(lambda: outside.unlink(missing_ok=True))
        handler = functools.partial(serve_review.ReviewHandler, directory=str(self.root))
        with http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                for path in (
                    "/../private-review-neighbor.txt",
                    "/%2e%2e/private-review-neighbor.txt",
                    "/%2e%2e%2fprivate-review-neighbor.txt",
                ):
                    with self.subTest(path=path):
                        connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                        try:
                            connection.request("GET", path)
                            response = connection.getresponse()
                            body = response.read()
                            self.assertNotEqual(response.status, 200)
                            self.assertNotIn(b"never expose neighboring files", body)
                        finally:
                            connection.close()
            finally:
                server.shutdown()
                thread.join(timeout=3)

    def test_expected_sha_rejects_stale_artifact(self):
        with mock.patch.object(serve_review.subprocess, "run") as verify, mock.patch.object(
            serve_review.http.server, "ThreadingHTTPServer"
        ) as server:
            with self.assertRaises(SystemExit):
                self.invoke("--expected-sha", "b" * 40)
            verify.assert_not_called()
            server.assert_not_called()

    def test_expected_sha_rejects_short_or_invalid_hash(self):
        with mock.patch.object(serve_review.subprocess, "run") as verify, mock.patch.object(
            serve_review.http.server, "ThreadingHTTPServer"
        ) as server:
            for bad_sha in ("abc1234", "A" * 40, "g" * 40):
                with self.subTest(bad_sha=bad_sha), self.assertRaises(SystemExit):
                    self.invoke("--expected-sha", bad_sha)
            verify.assert_not_called()
            server.assert_not_called()

    def test_matching_expected_sha_still_verifies_and_serves(self):
        with mock.patch.object(serve_review.subprocess, "run", return_value=mock.Mock(returncode=0)) as verify, mock.patch.object(
            serve_review.http.server, "ThreadingHTTPServer"
        ) as server, contextlib.redirect_stdout(io.StringIO()):
            self.invoke("--expected-sha", SHA)
            verify.assert_called_once()
            server.return_value.__enter__.return_value.serve_forever.assert_called_once_with()

    def test_verified_artifact_binds_loopback_only(self):
        with mock.patch.object(serve_review.subprocess, "run", return_value=mock.Mock(returncode=0)) as verify, mock.patch.object(
            serve_review.http.server, "ThreadingHTTPServer"
        ) as server, contextlib.redirect_stdout(io.StringIO()):
            self.invoke()
            self.assertEqual(server.call_args.args[0], ("127.0.0.1", 8765))
            server.return_value.__enter__.return_value.serve_forever.assert_called_once_with()
            verify.assert_called_once()


if __name__ == "__main__":
    unittest.main()
