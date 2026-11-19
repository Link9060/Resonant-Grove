"""Real HTTP regression for local review server Host-header restrictions."""
import functools
import http.client
import importlib.util
from pathlib import Path
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "serve_review.py"
spec = importlib.util.spec_from_file_location("grove_review_server_host", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class HostHeaderTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        (root / "index.html").write_text("review test", encoding="utf-8")
        handler = functools.partial(module.ReviewHandler, directory=str(root))
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)

    def request(self, method, host):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        try:
            conn.request(method, "/index.html", headers={"Host": host})
            response = conn.getresponse()
            status = response.status
            response.read()
            return status, response.getheader("Cache-Control")
        finally:
            conn.close()

    def test_loopback_host_allowed(self):
        for method in ("GET", "HEAD"):
            for host in ("localhost", "127.0.0.1", f"127.0.0.1:{self.server.server_port}"):
                with self.subTest(method=method, host=host):
                    self.assertEqual(self.request(method, host)[0], 200)

    def test_wrong_port_and_noncanonical_host_rejected(self):
        for method in ("GET", "HEAD"):
            for host in (
                f"localhost:{self.server.server_port + 1}",
                f"127.0.0.1:{self.server.server_port + 1}",
                "localhost.",
                "LOCALHOST",
                "127.0.0.2",
                "[::1]",
            ):
                with self.subTest(method=method, host=host):
                    status, cache = self.request(method, host)
                    self.assertEqual(status, 403)
                    self.assertEqual(cache, "no-store, max-age=0")

    def test_missing_and_duplicate_host_headers_rejected(self):
        # Raw HTTP/1.1 permits exercising duplicate Host fields that high-level
        # clients normally normalize before sending.
        import socket
        for method in ("GET", "HEAD"):
            for headers in (
                "",
                "Host: localhost\r\nHost: attacker.example\r\n",
                "Host: attacker.example\r\nHost: localhost\r\n",
                "Host: localhost\r\nHost: localhost\r\n",
            ):
                with self.subTest(method=method, headers=headers):
                    with socket.create_connection(("127.0.0.1", self.server.server_port), timeout=3) as sock:
                        sock.sendall((f"{method} /index.html HTTP/1.1\r\n"
                                      + headers + "Connection: close\r\n\r\n").encode("ascii"))
                        sock.settimeout(3)
                        response = b""
                        while True:
                            chunk = sock.recv(4096)
                            if not chunk:
                                break
                            response += chunk
                    self.assertIn(b" 403 ", response.split(b"\r\n", 1)[0])
                    self.assertNotIn(b"review test", response)

    def test_directory_listing_is_disabled(self):
        # A directory without index.html must not disclose artifact filenames.
        (Path(self.tmp.name) / "private").mkdir()
        (Path(self.tmp.name) / "private" / "secret.txt").write_text("not listed", encoding="utf-8")
        for method in ("GET", "HEAD"):
            with self.subTest(method=method):
                conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
                try:
                    conn.request(method, "/private/", headers={"Host": "localhost"})
                    response = conn.getresponse()
                    body = response.read()
                    self.assertEqual(response.status, 403)
                    self.assertNotIn(b"secret.txt", body)
                    self.assertEqual(response.getheader("X-Content-Type-Options"), "nosniff")
                    self.assertEqual(response.getheader("X-Frame-Options"), "DENY")
                    self.assertEqual(response.getheader("Referrer-Policy"), "no-referrer")
                    self.assertEqual(response.getheader("Cache-Control"), "no-store, max-age=0")
                finally:
                    conn.close()

    def test_symlink_escape_is_rejected(self):
        # SimpleHTTPRequestHandler follows symlinks unless explicitly restricted.
        outside = tempfile.TemporaryDirectory()
        self.addCleanup(outside.cleanup)
        secret = Path(outside.name) / "outside-secret.txt"
        secret.write_text("outside review root", encoding="utf-8")
        link = Path(self.tmp.name) / "escape.txt"
        try:
            link.symlink_to(secret)
        except (OSError, NotImplementedError):
            self.skipTest("symlink creation unavailable on this platform")
        for method in ("GET", "HEAD"):
            with self.subTest(method=method):
                conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
                try:
                    conn.request(method, "/escape.txt", headers={"Host": "localhost"})
                    response = conn.getresponse()
                    body = response.read()
                    self.assertEqual(response.status, 403)
                    self.assertNotIn(b"outside review root", body)
                    self.assertEqual(response.getheader("Cache-Control"), "no-store, max-age=0")
                finally:
                    conn.close()

    def test_directory_symlink_escape_is_rejected(self):
        # Directory symlinks with an index must not expose external content.
        outside = tempfile.TemporaryDirectory()
        self.addCleanup(outside.cleanup)
        external = Path(outside.name)
        (external / "index.html").write_text("external directory secret", encoding="utf-8")
        link = Path(self.tmp.name) / "external-dir"
        try:
            link.symlink_to(external, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("directory symlink creation unavailable on this platform")
        for method in ("GET", "HEAD"):
            with self.subTest(method=method):
                conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
                try:
                    conn.request(method, "/external-dir/", headers={"Host": "localhost"})
                    response = conn.getresponse()
                    body = response.read()
                    self.assertEqual(response.status, 403)
                    self.assertNotIn(b"external directory secret", body)
                    self.assertEqual(response.getheader("Cache-Control"), "no-store, max-age=0")
                finally:
                    conn.close()

    def test_directory_index_symlink_escape_is_rejected(self):
        outside = tempfile.TemporaryDirectory()
        self.addCleanup(outside.cleanup)
        secret = Path(outside.name) / "outside-index.html"
        secret.write_text("external index secret", encoding="utf-8")
        directory = Path(self.tmp.name) / "linked-index"
        directory.mkdir()
        try:
            (directory / "index.html").symlink_to(secret)
        except (OSError, NotImplementedError):
            self.skipTest("symlink creation unavailable on this platform")
        for method in ("GET", "HEAD"):
            with self.subTest(method=method):
                conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
                try:
                    conn.request(method, "/linked-index/", headers={"Host": "localhost"})
                    response = conn.getresponse()
                    body = response.read()
                    self.assertEqual(response.status, 403)
                    self.assertNotIn(b"external index secret", body)
                    self.assertEqual(response.getheader("Cache-Control"), "no-store, max-age=0")
                finally:
                    conn.close()

    def test_index_htm_symlink_escape_is_rejected(self):
        # The fallback index.htm path must receive the same containment check.
        outside = tempfile.TemporaryDirectory()
        self.addCleanup(outside.cleanup)
        secret = Path(outside.name) / "outside-index.htm"
        secret.write_text("external fallback index secret", encoding="utf-8")
        directory = Path(self.tmp.name) / "linked-fallback-index"
        directory.mkdir()
        try:
            (directory / "index.htm").symlink_to(secret)
        except (OSError, NotImplementedError):
            self.skipTest("symlink creation unavailable on this platform")
        for method in ("GET", "HEAD"):
            with self.subTest(method=method):
                conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
                try:
                    conn.request(method, "/linked-fallback-index/", headers={"Host": "localhost"})
                    response = conn.getresponse()
                    body = response.read()
                    self.assertEqual(response.status, 403)
                    self.assertNotIn(b"external fallback index secret", body)
                    self.assertEqual(response.getheader("Cache-Control"), "no-store, max-age=0")
                finally:
                    conn.close()

    def test_encoded_symlink_escape_is_rejected(self):
        # Percent-encoded URLs must not bypass the artifact-root restriction.
        outside = tempfile.TemporaryDirectory()
        self.addCleanup(outside.cleanup)
        secret = Path(outside.name) / "outside-secret.txt"
        secret.write_text("encoded external secret", encoding="utf-8")
        link = Path(self.tmp.name) / "encoded escape.txt"
        try:
            link.symlink_to(secret)
        except (OSError, NotImplementedError):
            self.skipTest("symlink creation unavailable on this platform")
        for method in ("GET", "HEAD"):
            for path in ("/encoded%20escape.txt", "/encoded%20escape.txt?download=1"):
                with self.subTest(method=method, path=path):
                    conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
                    try:
                        conn.request(method, path, headers={"Host": "localhost"})
                        response = conn.getresponse()
                        body = response.read()
                        self.assertEqual(response.status, 403)
                        self.assertNotIn(b"encoded external secret", body)
                        self.assertEqual(response.getheader("Cache-Control"), "no-store, max-age=0")
                    finally:
                        conn.close()

    def test_external_host_rejected_without_leaking_contents(self):
        for method in ("GET", "HEAD"):
            for host in ("attacker.example", "attacker.example:8765", "127.0.0.1.attacker.example"):
                with self.subTest(method=method, host=host):
                    status, cache = self.request(method, host)
                    self.assertEqual(status, 403)
                    self.assertEqual(cache, "no-store, max-age=0")


if __name__ == "__main__":
    unittest.main()
