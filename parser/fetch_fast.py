"""Fast parallel fetcher for all remaining laws."""

import json
import concurrent.futures
import time
from pathlib import Path
from parse_law import process_law

def fetch_one(item):
    abbr = item["abbreviation"]
    url = item["xml_url"]
    out = Path("laws") / f"{abbr.lower()}.md"
    if out.exists():
        return None
    try:
        path = process_law(url, "laws")
        return f"✓ {abbr}" if path else None
    except:
        return f"✗ {abbr}"

def main():
    with open("parser/law_index.json", encoding="utf-8") as f:
        items = json.load(f)

    remaining = [i for i in items if not (Path("laws") / f"{i['abbreviation'].lower()}.md").exists()]
    print(f"{len(remaining)} laws remaining of {len(items)} total. Starting parallel fetch (10 workers)...")

    done = 0
    failed = 0
    t0 = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(fetch_one, item): item for item in remaining}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result and result.startswith("✓"):
                done += 1
            elif result and result.startswith("✗"):
                failed += 1
            if (done + failed) % 100 == 0:
                elapsed = time.time() - t0
                rate = (done + failed) / elapsed
                eta = (len(remaining) - done - failed) / rate if rate > 0 else 0
                print(f"  {done + failed}/{len(remaining)} ({done} ok, {failed} fail) — {rate:.0f}/s — ETA {eta:.0f}s")

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.0f}s: {done} saved, {failed} failed")
    print(f"Total laws: {len(list(Path('laws').glob('*.md')))}")

if __name__ == "__main__":
    main()
