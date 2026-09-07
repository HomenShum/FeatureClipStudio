#!/usr/bin/env python3
"""Check selected evidence bytes and optional source identities; standard library only."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def safe_path(root, relative):
    parts = PurePosixPath(relative)
    if not relative or "\\" in relative or ":" in relative or parts.is_absolute() or ".." in parts.parts:
        raise ValueError("Unsafe manifest path")
    candidate = root.joinpath(*parts.parts)
    if root not in candidate.resolve().parents:
        raise ValueError("Manifest path escapes its root")
    return candidate


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, help="Optionally verify only the selected source files")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    rows = read(root / "manifest.json")["files"]
    expected = {row["path"] for row in rows}
    if len(expected) != len(rows):
        raise ValueError("Duplicate packet paths")
    actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file() and p != root / "manifest.json"}
    if actual != expected:
        raise ValueError("Packet file set differs from manifest")
    for row in rows:
        data = safe_path(root, row["path"]).read_bytes()
        if len(data) != row["bytes"] or digest(data) != row["sha256"]:
            raise ValueError("Packet bytes differ: " + row["path"])
    checked = 0
    if args.source_root is not None:
        source = args.source_root.resolve(strict=True)
        for row in read(root / "source-bindings.json")["files"]:
            data = safe_path(source, row["path"]).read_bytes()
            if row["checkoutNormalization"] == "crlf-to-lf":
                data = data.replace(b"\r\n", b"\n")
            elif row["checkoutNormalization"] != "exact":
                raise ValueError("Unknown source byte policy")
            if len(data) != row["canonicalBytes"] or digest(data) != row["canonicalSHA256"]:
                raise ValueError("Selected source differs: " + row["path"])
            checked += 1
    print(json.dumps({"status": "PASS", "packetFiles": len(rows), "selectedSourceFiles": checked,
                      "scope": "Selected bytes only; no runtime, current CI, full repository or full grade certification."}))


if __name__ == "__main__":
    main()
