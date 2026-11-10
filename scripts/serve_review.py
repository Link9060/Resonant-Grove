#!/usr/bin/env python3
"""Verify an extracted Grove review artifact before serving it on loopback only."""
import argparse
import functools
import http.server
from pathlib import Path
import re
import subprocess
import sys

class ReviewHandler(http.server.SimpleHTTPRequestHandler):
    """Keep review pages uncached and limit browser content sniffing."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", default=".", type=Path)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--expected-sha", help="Require this exact 40-character PR head SHA")
    args = parser.parse_args()
    root = args.directory.resolve(strict=True)
    if not root.is_dir() or not 1 <= args.port <= 65535:
        parser.error("provide an existing directory and a port between 1 and 65535")
    marker = root / "REVIEW.txt"
    if not marker.is_file():
        parser.error("REVIEW.txt missing: not a Grove review artifact")
    marker_lines = marker.read_text().splitlines()
    sha_lines = [line for line in marker_lines if line.startswith("GROVE_PREVIEW_SHA=")]
    matches = [line.split("=", 1)[1] for line in sha_lines]
    if len(matches) != 1 or not re.fullmatch(r"[0-9a-f]{40}", matches[0]):
        parser.error("missing or ambiguous full review SHA")
    if args.expected_sha is not None:
        if not re.fullmatch(r"[0-9a-f]{40}", args.expected_sha):
            parser.error("--expected-sha must be a full lowercase 40-character commit SHA")
        if matches[0] != args.expected_sha:
            parser.error("review artifact SHA differs from --expected-sha; refusing stale build")
    revision = root / "review.html"
    if not revision.is_file() or f'<code id="revision">{matches[0]}</code>' not in revision.read_text():
        parser.error("review.html SHA mismatch")
    verifier = root / "scripts" / "verify_review_artifact.py"
    if not verifier.is_file():
        parser.error("integrity verifier missing")
    completed = subprocess.run([sys.executable, str(verifier), str(root)], check=False)
    if completed.returncode:
        parser.error("artifact integrity verification failed; refusing to serve")
    handler = functools.partial(ReviewHandler, directory=str(root))
    with http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Verified Grove review SHA {matches[0]}", flush=True)
        print(f"Open http://127.0.0.1:{args.port}/review.html (local only)", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    main()
