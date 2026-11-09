#!/usr/bin/env python3
"""Verify an extracted Grove review artifact before serving it on loopback only."""
import argparse
import functools
import http.server
from pathlib import Path
import re
import subprocess
import sys

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", default=".", type=Path)
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    root = args.directory.resolve(strict=True)
    if not root.is_dir() or not 1 <= args.port <= 65535:
        parser.error("provide an existing directory and a port between 1 and 65535")
    marker = root / "REVIEW.txt"
    if not marker.is_file():
        parser.error("REVIEW.txt missing: not a Grove review artifact")
    matches = re.findall(r"^GROVE_PREVIEW_SHA=([0-9a-f]{40})$", marker.read_text(), re.MULTILINE)
    if len(matches) != 1:
        parser.error("missing or ambiguous full review SHA")
    revision = root / "review.html"
    if not revision.is_file() or f'<code id="revision">{matches[0]}</code>' not in revision.read_text():
        parser.error("review.html SHA mismatch")
    verifier = root / "scripts" / "verify_review_artifact.py"
    if not verifier.is_file():
        parser.error("integrity verifier missing")
    completed = subprocess.run([sys.executable, str(verifier), str(root)], check=False)
    if completed.returncode:
        parser.error("artifact integrity verification failed; refusing to serve")
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    with http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Verified Grove review SHA {matches[0]}", flush=True)
        print(f"Open http://127.0.0.1:{args.port}/review.html (local only)", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    main()
