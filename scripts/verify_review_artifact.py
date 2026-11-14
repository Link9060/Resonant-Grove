#!/usr/bin/env python3
"""Verify a downloaded Grove development review artifact before serving it."""
import hashlib
import re
import sys
from pathlib import Path


def verify(root: Path) -> None:
    root = root.resolve()
    manifest = root / "SHA256SUMS.txt"
    if not manifest.is_file() or manifest.is_symlink():
        raise ValueError("Missing or unsafe SHA256SUMS.txt")
    expected = set()
    for file in root.rglob("*"):
        if file.is_symlink():
            raise ValueError(f"Symlink not permitted: {file}")
        if file.is_file() and file != manifest:
            expected.add(file.relative_to(root).as_posix())
    seen = set()
    for line in manifest.read_text(encoding="utf-8").splitlines():
        match = re.fullmatch(r"([0-9a-f]{64})  (.+)", line)
        if not match:
            raise ValueError("Malformed checksum manifest line")
        digest, name = match.groups()
        path = (root / name).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError(f"Unsafe or missing file: {name}")
        normalized = path.relative_to(root).as_posix()
        if normalized in seen:
            raise ValueError(f"Duplicate manifest entry: {name}")
        seen.add(normalized)
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError(f"Checksum mismatch: {name}")
    if seen != expected:
        raise ValueError(f"Manifest coverage mismatch: missing={sorted(expected-seen)} extra={sorted(seen-expected)}")
    if ".nojekyll" not in seen or "review.html" not in seen:
        raise ValueError("Required review files missing")
    print(f"PASS: {len(seen)} files verified")


if __name__ == "__main__":
    try:
        verify(Path(sys.argv[1] if len(sys.argv) > 1 else "."))
    except (ValueError, OSError, UnicodeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
