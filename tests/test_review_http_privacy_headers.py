"""Verify privacy headers on the loopback-only Grove review server."""
import importlib.util
import io
from pathlib import Path
import unittest
from unittest.mock import Mock

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "serve_review.py"
spec = importlib.util.spec_from_file_location("grove_review_server_headers", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReviewResponseHeadersTest(unittest.TestCase):
    def test_privacy_headers_are_sent(self):
        handler = module.ReviewHandler.__new__(module.ReviewHandler)
        handler.wfile = io.BytesIO()
        handler._headers_buffer = []
        handler.request_version = "HTTP/1.1"
        handler.protocol_version = "HTTP/1.0"
        handler.send_header = Mock()
        handler.end_headers()
        headers = dict(handler.send_header.call_args_list[i].args for i in range(handler.send_header.call_count))
        self.assertEqual(headers["Referrer-Policy"], "no-referrer")
        self.assertEqual(headers["Permissions-Policy"], "camera=(), microphone=(), geolocation=()")
        self.assertEqual(headers["X-Frame-Options"], "DENY")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(headers["Cache-Control"], "no-store, max-age=0")


if __name__ == "__main__":
    unittest.main()
