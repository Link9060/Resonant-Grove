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

    def test_external_host_rejected_without_leaking_contents(self):
        for method in ("GET", "HEAD"):
            for host in ("attacker.example", "attacker.example:8765", "127.0.0.1.attacker.example"):
                with self.subTest(method=method, host=host):
                    status, cache = self.request(method, host)
                    self.assertEqual(status, 403)
                    self.assertEqual(cache, "no-store, max-age=0")


if __name__ == "__main__":
    unittest.main()
