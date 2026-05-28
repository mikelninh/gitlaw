"""
Upstream sync — daily check whether gesetze-im-internet.de has updated any of
the laws we mirror, *without* downloading any XML.

How:

  For each entry in upstream_sources.json we do an HTTP HEAD to
  https://www.gesetze-im-internet.de/<slug>/xml.zip and read two response
  headers:
    - Last-Modified  (when the upstream file changed)
    - ETag           (content-identifier — single source of truth for drift)

  We compare these against upstream_snapshots.json — our committed record of
  what we last saw upstream. If the ETag differs, the upstream changed since
  our last snapshot; we update the snapshot and append a row to sync_log.md.

What this DOES NOT do (intentional, on the roadmap):
  - Download new XML and re-parse to markdown — that's Phase 2 (the
    upstream XML format differs from our markdown corpus, so a parser
    layer needs to be wired in)
  - Update /laws/*.md from upstream — same reason

What this DOES do:
  - Make upstream drift *visible* — the user (and any agent) can call
    `check_upstream_currency()` and learn that BGB upstream is 2 days newer
    than our markdown copy
  - Run unattended in CI on a daily cron, committing any state changes

Run:
    python -m gitlaw_mcp.freshness.sync               # network mode (live HEAD)
    python -m gitlaw_mcp.freshness.sync --dry-run     # don't write snapshots
    python -m gitlaw_mcp.freshness.sync --offline     # use cached snapshots only
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
SOURCES_FILE = HERE / "upstream_sources.json"
SNAPSHOTS_FILE = HERE / "upstream_snapshots.json"
SYNC_LOG_FILE = HERE / "sync_log.md"

DEFAULT_TIMEOUT_SECONDS = 8
USER_AGENT = (
    "gitlaw-mcp-freshness-sync/1.0 (+https://github.com/mikelninh/gitlaw - public-good civic infra)"
)


def _load_sources() -> list[dict[str, str]]:
    return json.loads(SOURCES_FILE.read_text(encoding="utf-8"))["sources"]


def _load_snapshots() -> dict[str, Any]:
    if not SNAPSHOTS_FILE.exists():
        return {
            "schema_version": "1.0",
            "last_full_sync_at_utc": None,
            "snapshots": {},
        }
    return json.loads(SNAPSHOTS_FILE.read_text(encoding="utf-8"))


def _write_snapshots(snap: dict[str, Any]) -> None:
    SNAPSHOTS_FILE.write_text(
        json.dumps(snap, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _head(url: str, timeout: int = DEFAULT_TIMEOUT_SECONDS) -> dict[str, str]:
    """HTTP HEAD — returns relevant headers or raises urllib errors."""
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return {
            "status": str(resp.status),
            "last_modified": resp.headers.get("Last-Modified", ""),
            "etag": resp.headers.get("ETag", ""),
            "content_length": resp.headers.get("Content-Length", ""),
        }


def _check_one(source: dict[str, str], prior: dict[str, Any] | None) -> dict[str, Any]:
    """Check one upstream source. Returns the result regardless of drift status."""
    url = f"https://www.gesetze-im-internet.de/{source['upstream_slug']}/xml.zip"
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    try:
        headers = _head(url)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        return {
            "abbreviation": source["abbreviation"],
            "upstream_url": url,
            "checked_at_utc": now,
            "status": "fetch_error",
            "error": f"{type(e).__name__}: {e}",
            # Preserve any prior snapshot data — don't erase what we know just
            # because today's check failed.
            "etag": (prior or {}).get("etag"),
            "last_modified_upstream": (prior or {}).get("last_modified_upstream"),
            "first_seen_at_utc": (prior or {}).get("first_seen_at_utc", now),
        }

    etag = headers.get("etag") or ""
    last_modified = headers.get("last_modified") or ""

    drifted = bool(prior and prior.get("etag") and etag and prior["etag"] != etag)
    first_seen = (prior or {}).get("first_seen_at_utc", now)

    return {
        "abbreviation": source["abbreviation"],
        "upstream_url": url,
        "checked_at_utc": now,
        "status": "drift_detected" if drifted else "no_change",
        "etag": etag,
        "last_modified_upstream": last_modified,
        "content_length": headers.get("content_length"),
        "first_seen_at_utc": first_seen,
        "prior_etag": (prior or {}).get("etag") if drifted else None,
    }


def _append_to_log(drifted: list[dict[str, Any]], now_iso: str) -> None:
    """Append a single timestamped row to sync_log.md when drift is detected."""
    if not drifted:
        return
    line = f"\n## {now_iso}\n\n{len(drifted)} laws drifted upstream since last sync:\n\n"
    for r in drifted:
        line += (
            f"- **{r['abbreviation']}** — "
            f"upstream `Last-Modified: {r['last_modified_upstream']}` "
            f"(ETag `{r['etag'][:16]}…`, was `{(r['prior_etag'] or 'none')[:16]}…`)\n"
        )
    if not SYNC_LOG_FILE.exists():
        SYNC_LOG_FILE.write_text(
            "# Upstream sync log\n\n"
            "Daily HEAD-check against gesetze-im-internet.de. Each section below "
            "lists laws that changed upstream since our previous snapshot. The "
            "GitHub Action `upstream-sync.yml` writes these rows automatically.\n",
            encoding="utf-8",
        )
    with SYNC_LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(line)


def run(*, dry_run: bool = False, offline: bool = False) -> dict[str, Any]:
    sources = _load_sources()
    snap = _load_snapshots()
    snapshots: dict[str, Any] = dict(snap.get("snapshots") or {})

    if offline:
        # Just summarise what we already have — no network.
        return {
            "mode": "offline",
            "law_count": len(snapshots),
            "snapshots": snapshots,
        }

    results: list[dict[str, Any]] = []
    drifted: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for source in sources:
        abbr = source["abbreviation"]
        prior = snapshots.get(abbr)
        result = _check_one(source, prior)
        results.append(result)

        if result["status"] == "drift_detected":
            drifted.append(result)
        elif result["status"] == "fetch_error":
            errors.append(result)

        # Update snapshot only when we got a useful response. Fetch errors
        # leave the prior snapshot untouched so transient failures don't
        # erase good state.
        if result["status"] in ("drift_detected", "no_change"):
            snapshots[abbr] = {
                "etag": result["etag"],
                "last_modified_upstream": result["last_modified_upstream"],
                "first_seen_at_utc": result["first_seen_at_utc"],
                "last_checked_at_utc": result["checked_at_utc"],
            }

    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")

    if not dry_run:
        _write_snapshots(
            {
                "schema_version": "1.0",
                "last_full_sync_at_utc": now_iso,
                "snapshots": snapshots,
            }
        )
        _append_to_log(drifted, now_iso)

    return {
        "mode": "live",
        "ran_at_utc": now_iso,
        "checked": len(results),
        "drifted_count": len(drifted),
        "error_count": len(errors),
        "drifted": [{"abbreviation": d["abbreviation"], "etag": d["etag"]} for d in drifted],
        "errors": [{"abbreviation": e["abbreviation"], "error": e["error"]} for e in errors],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="don't write snapshots / log")
    parser.add_argument("--offline", action="store_true", help="don't hit the network")
    args = parser.parse_args()

    report = run(dry_run=args.dry_run, offline=args.offline)

    print()
    print("─" * 60)
    if report["mode"] == "offline":
        print(f"offline mode: {report['law_count']} snapshots cached")
    else:
        print(f"sync at {report['ran_at_utc']}")
        print(f"  checked:  {report['checked']} laws")
        print(f"  drifted:  {report['drifted_count']}")
        print(f"  errors:   {report['error_count']}")
        if report["drifted"]:
            print()
            print("drifted laws:")
            for d in report["drifted"]:
                print(f"  - {d['abbreviation']}")
        if report["errors"]:
            print()
            print("errors (snapshot preserved):")
            for e in report["errors"]:
                print(f"  - {e['abbreviation']}: {e['error']}")
    print("─" * 60)
    return 0 if report.get("error_count", 0) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
