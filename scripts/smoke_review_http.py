#!/usr/bin/env python3
"""Smoke-test a downloaded Grove review artifact over loopback HTTP.

Uses only Python's standard library. Does not contact external hosts or deploy.
"""
import argparse
import functools
import http.server
from pathlib import Path
import re
import threading
import urllib.request


def smoke(directory: Path, expected_sha: str) -> None:
    if not re.fullmatch(r"[0-9a-f]{40}", expected_sha):
        raise ValueError("Expected SHA must be a full lowercase 40-character commit SHA")
    directory = directory.resolve(strict=True)
    if not directory.is_dir():
        raise ValueError("Artifact directory does not exist")
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = f"http://127.0.0.1:{server.server_port}"
        for path, expected in (
            ("/review.html", f'<code id="revision">{expected_sha}</code>'),
            ("/REVIEW.txt", f"GROVE_PREVIEW_SHA={expected_sha}"),
            ("/index.html", "<html"),
            ("/app.js", None),
            ("/styles.css", None),
        ):
            with urllib.request.urlopen(base + path, timeout=5) as response:
                if response.status != 200:
                    raise AssertionError(f"{path}: HTTP {response.status}")
                data = response.read()
                if not data:
                    raise AssertionError(f"{path}: empty response")
                if expected and expected.lower().encode() not in data.lower():
                    raise AssertionError(f"{path}: expected content missing or wrong SHA")
        print(f"PASS: loopback HTTP serves review build for {expected_sha}")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path, help="Extracted artifact root")
    parser.add_argument("sha", help="Expected exact PR head commit SHA")
    args = parser.parse_args()
    smoke(args.directory, args.sha)
