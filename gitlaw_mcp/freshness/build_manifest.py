"""
Build the corpus manifest — one row per law in /laws/, with:

  - SHA-256 of the markdown content (proves the bytes haven't drifted)
  - Byte size (sanity check)
  - Git-commit timestamp of last modification (when we last touched this file)
  - Source URL convention (gesetze-im-internet.de pattern based on abbreviation)

The output is a single sorted JSON file that becomes the public, version-controlled
record of *what's actually in our corpus right now*. Diffing two manifests across
time is how we detect drift and produce a changelog.

This script is the foundation of the trust layer. Every MCP tool that returns
a paragraph can be cross-checked against the manifest: "did the file you served
me have the hash you claim?"

Run:
    python -m gitlaw_mcp.freshness.build_manifest         # writes manifest.json
    python -m gitlaw_mcp.freshness.build_manifest --check # exit 1 if manifest is stale
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent.parent
LAWS_DIR = ROOT / "laws"
MANIFEST_PATH = Path(__file__).parent / "manifest.json"

# All federal laws are published at https://www.gesetze-im-internet.de/<abbr>/
# The slug is the abbreviation, lowercased, with the file extension stripped.
# This URL is the canonical source-of-truth the manifest points back to.
SOURCE_URL_BASE = "https://www.gesetze-im-internet.de"


def _sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _git_last_modified_iso(path: Path) -> str | None:
    """ISO timestamp of the last git commit touching this file, or None if untracked."""
    try:
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%cI", "--", str(path.relative_to(ROOT))],
            cwd=str(ROOT),
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        return out or None
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def _abbreviation_from_filename(filename: str) -> str:
    """laws/bgb.md → 'BGB'. laws/sgb_5.md → 'SGB V' (approximate)."""
    stem = filename.removesuffix(".md")
    # Approximate convention — the corpus is already loaded into the abbreviation
    # index at runtime; this is just a best-effort label for the manifest row.
    return stem.upper()


def _source_url_for_law(filename: str) -> str:
    """Map laws/bgb.md → https://www.gesetze-im-internet.de/bgb/"""
    stem = filename.removesuffix(".md")
    # Strip any internal-only suffixes our corpus added when parsing
    return f"{SOURCE_URL_BASE}/{stem}/"


def build_manifest() -> dict[str, Any]:
    if not LAWS_DIR.exists():
        raise SystemExit(f"laws/ directory not found at {LAWS_DIR}")

    files = sorted(LAWS_DIR.glob("*.md"))
    entries: list[dict[str, Any]] = []

    for path in files:
        entries.append(
            {
                "filename": path.name,
                "abbreviation": _abbreviation_from_filename(path.name),
                "source_url": _source_url_for_law(path.name),
                "corpus_path": f"laws/{path.name}",
                "corpus_sha256": _sha256_of_file(path),
                "corpus_bytes": path.stat().st_size,
                "git_last_modified_iso": _git_last_modified_iso(path),
            }
        )

    # A single hash over the sorted entry-hash list — one number that changes
    # iff any law in the corpus changes. Great for status badges and quick checks.
    aggregate_input = "".join(e["corpus_sha256"] for e in entries).encode("utf-8")
    aggregate_hash = hashlib.sha256(aggregate_input).hexdigest()

    return {
        "schema_version": "1.0",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": SOURCE_URL_BASE,
        "law_count": len(entries),
        "aggregate_sha256": aggregate_hash,
        "laws": entries,
    }


def write_manifest(manifest: dict[str, Any], path: Path = MANIFEST_PATH) -> None:
    path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Build a fresh manifest in memory and compare to the committed manifest.json. "
        "Exit 1 if they differ — used by CI to detect uncommitted corpus drift.",
    )
    args = parser.parse_args()

    fresh = build_manifest()

    if args.check:
        if not MANIFEST_PATH.exists():
            print("error: manifest.json not present — run without --check first", file=sys.stderr)
            return 1
        committed = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        # Compare the aggregate hash — the cheapest reliable signal.
        if fresh["aggregate_sha256"] != committed["aggregate_sha256"]:
            print("error: corpus drift detected.", file=sys.stderr)
            print(f"  committed aggregate: {committed['aggregate_sha256']}", file=sys.stderr)
            print(f"  fresh aggregate:     {fresh['aggregate_sha256']}", file=sys.stderr)
            print(f"  committed law_count: {committed['law_count']}", file=sys.stderr)
            print(f"  fresh law_count:     {fresh['law_count']}", file=sys.stderr)
            return 1
        print(
            f"ok — corpus matches manifest ({fresh['law_count']} laws, aggregate {fresh['aggregate_sha256'][:12]}…)"
        )
        return 0

    write_manifest(fresh)
    print(f"wrote {MANIFEST_PATH.relative_to(ROOT)}")
    print(f"  law_count: {fresh['law_count']}")
    print(f"  aggregate_sha256: {fresh['aggregate_sha256']}")
    print(f"  generated_at_utc: {fresh['generated_at_utc']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
