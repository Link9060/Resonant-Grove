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

    def test_external_host_rejected_without_leaking_contents(self):
        for method in ("GET", "HEAD"):
            for host in ("attacker.example", "attacker.example:8765", "127.0.0.1.attacker.example"):
                with self.subTest(method=method, host=host):
                    status, cache = self.request(method, host)
                    self.assertEqual(status, 403)
                    self.assertEqual(cache, "no-store, max-age=0")


if __name__ == "__main__":
    unittest.main()
