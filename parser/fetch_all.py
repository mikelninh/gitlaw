"""Fetch and parse ALL German federal laws into Markdown files."""

import json
import time
import sys
from pathlib import Path
from parse_law import process_law
from fetch_index import fetch_index


def fetch_all(limit: int = 0, output_dir: str = "laws"):
    """Download and parse all laws from the index."""
    index_path = Path("parser/law_index.json")

    if not index_path.exists():
        print("Index not found, fetching...")
        items = fetch_index()
    else:
        with open(index_path, encoding="utf-8") as f:
            items = json.load(f)

    total = len(items)
    if limit > 0:
        items = items[:limit]
        print(f"Processing {limit} of {total} laws (limited)...")
    else:
        print(f"Processing all {total} laws...")

    success = 0
    failed = 0
    skipped = 0

    for i, item in enumerate(items):
        abbr = item["abbreviation"]
        url = item["xml_url"]

        # Check if already processed
        out_path = Path(output_dir) / f"{abbr.lower()}.md"
        if out_path.exists():
            skipped += 1
            continue

        try:
            path = process_law(url, output_dir)
            if path:
                success += 1
                print(f"  [{i+1}/{len(items)}] ✓ {abbr} → {path}")
            else:
                skipped += 1
                print(f"  [{i+1}/{len(items)}] ○ {abbr} — no content")
        except Exception as e:
            failed += 1
            print(f"  [{i+1}/{len(items)}] ✗ {abbr} — {e}")

        # Be nice to the server
        time.sleep(0.3)

    print(f"\nDone: {success} saved, {skipped} skipped, {failed} failed")
    print(f"Laws directory: {output_dir}/")


if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    fetch_all(limit=limit)
