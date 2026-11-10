#!/usr/bin/env python3
"""Smoke-test a downloaded Grove review artifact over loopback HTTP.

Uses only Python's standard library. Does not contact external hosts or deploy.
"""
import argparse
import functools
import http.server
from html.parser import HTMLParser
from pathlib import Path
import re
import threading
import urllib.request
from urllib.parse import urlsplit, unquote

class LocalAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        path = (attributes.get("src") if tag in ("script", "img", "source", "audio", "video", "iframe", "track", "embed")
                else attributes.get("href") if tag == "link" else None)
        candidates = [path] if path else []
        # Embedded documents and media object payloads are also required assets.
        if tag == "object" and attributes.get("data"):
            candidates.append(attributes["data"])
        # Video poster files are visible assets even without a <source> element.
        if tag == "video" and attributes.get("poster"):
            candidates.append(attributes["poster"])
        # Responsive images may use srcset without src; check every local candidate.
        if tag in ("img", "source") and attributes.get("srcset"):
            candidates.extend(
                candidate.strip().split()[0]
                for candidate in attributes["srcset"].split(",")
                if candidate.strip()
            )
        for candidate in candidates:
            if not candidate.startswith(("https://", "http://", "//", "data:", "#")):
                self.paths.add(candidate.split("?", 1)[0].split("#", 1)[0])


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
        # A 200 response for index.html does not prove its linked assets exist.
        with urllib.request.urlopen(base + "/index.html", timeout=5) as response:
            parser = LocalAssets()
            parser.feed(response.read().decode("utf-8"))
        if not parser.paths:
            raise AssertionError("index.html references no local assets")
        for asset in sorted(parser.paths):
            if asset.startswith("/") or ".." in Path(asset).parts:
                raise AssertionError(f"Unsafe local asset reference: {asset}")
            with urllib.request.urlopen(base + "/" + asset, timeout=5) as response:
                payload = response.read()
                if response.status != 200 or not payload:
                    raise AssertionError(f"Missing or empty referenced asset: {asset}")
                # A 200 HTML fallback is not a usable JavaScript or CSS asset.
                suffix = Path(asset).suffix.lower()
                mime = response.headers.get_content_type()
                expected_mime = {
                    ".js": ("text/javascript", "application/javascript"),
                    ".css": ("text/css",),
                    ".svg": ("image/svg+xml",),
                }.get(suffix)
                if expected_mime and mime not in expected_mime:
                    raise AssertionError(
                        f"Wrong content type for {asset}: {mime} (expected {expected_mime})"
                    )
        # CSS may reference fonts and images not visible to the HTML parser.
        # Check local url(...) resources, including quoted URLs and query strings.
        css_assets = set()
        for css_path in (p for p in parser.paths if Path(p).suffix.lower() == ".css"):
            css_text = (directory / css_path).read_text(encoding="utf-8")
            for raw in re.findall(r"url\(\s*(['\"]?)(.*?)\1\s*\)", css_text, re.I):
                reference = raw[1].strip()
                if not reference or reference.startswith(("data:", "#", "//")):
                    continue
                parsed = urlsplit(reference)
                if parsed.scheme or parsed.netloc:
                    continue
                decoded = unquote(parsed.path)
                if not decoded:
                    continue
                asset_path = (Path(css_path).parent / decoded)
                if decoded.startswith("/") or ".." in asset_path.parts:
                    raise AssertionError(f"Unsafe CSS asset reference: {reference}")
                css_assets.add(asset_path.as_posix())
        for asset in sorted(css_assets):
            with urllib.request.urlopen(base + "/" + asset, timeout=5) as response:
                if response.status != 200 or not response.read():
                    raise AssertionError(f"Missing or empty CSS asset: {asset}")
        print(f"PASS: loopback HTTP serves review build for {expected_sha} ({len(parser.paths) + len(css_assets)} linked assets)")
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
