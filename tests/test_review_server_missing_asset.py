"""HTTP regression: missing review assets must not disclose directory contents."""
import functools
import http.client
import importlib.util
from pathlib import Path
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "serve_review.py"
spec = importlib.util.spec_from_file_location("grove_review_server_missing", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MissingAssetTests(unittest.TestCase):
    def test_missing_asset_is_404_with_privacy_headers(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "index.html").write_text("Grove test fixture", encoding="utf-8")
            handler = functools.partial(module.ReviewHandler, directory=directory)
            server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                for method in ("GET", "HEAD"):
                    with self.subTest(method=method):
                        conn = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=3)
                        try:
                            conn.request(method, "/missing-review-file.txt")
                            response = conn.getresponse()
                            body = response.read()
                            self.assertEqual(response.status, 404)
                            self.assertEqual(response.getheader("Cache-Control"), "no-store, max-age=0")
                            self.assertEqual(response.getheader("X-Content-Type-Options"), "nosniff")
                            self.assertEqual(response.getheader("X-Frame-Options"), "DENY")
                            self.assertEqual(response.getheader("Referrer-Policy"), "no-referrer")
                            self.assertEqual(response.getheader("Permissions-Policy"),
                                             "camera=(), microphone=(), geolocation=()")
                            self.assertNotIn(b"Grove test fixture", body)
                            if method == "HEAD":
                                self.assertEqual(body, b"")
                        finally:
                            conn.close()
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=3)


if __name__ == "__main__":
    unittest.main()
