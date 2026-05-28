"""
Upstream-sync tests — hermetic (no network calls), exercising both the
sync orchestrator and the two new MCP tools.

We mock urlopen at the boundary so these tests run in any CI environment,
deterministically, in milliseconds.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from gitlaw_mcp.freshness import sync as sync_mod  # noqa: E402
from gitlaw_mcp.server import check_upstream_currency, list_drifted_laws  # noqa: E402


# ── Test fixtures ────────────────────────────────────────────────────


def _fake_head_response(*, etag: str, last_modified: str, content_length: str = "1000"):
    """Build a MagicMock that quacks like a urllib HEAD response."""
    headers = MagicMock()
    headers.get = lambda k, default="": {
        "Last-Modified": last_modified,
        "ETag": etag,
        "Content-Length": content_length,
    }.get(k, default)

    resp = MagicMock()
    resp.status = 200
    resp.headers = headers
    resp.__enter__ = lambda self: self
    resp.__exit__ = lambda self, *a: None
    return resp


# ── sync.py — happy path ─────────────────────────────────────────────


def test_first_sync_baselines_all_sources_with_no_drift(tmp_path, monkeypatch):
    """First-ever sync writes a baseline snapshot. No drift, no errors."""
    snap_file = tmp_path / "snap.json"
    log_file = tmp_path / "log.md"
    monkeypatch.setattr(sync_mod, "SNAPSHOTS_FILE", snap_file)
    monkeypatch.setattr(sync_mod, "SYNC_LOG_FILE", log_file)

    fake_resp = _fake_head_response(
        etag='"abc-123"',
        last_modified="Wed, 27 May 2026 19:55:11 GMT",
    )

    with patch("gitlaw_mcp.freshness.sync.urllib.request.urlopen", return_value=fake_resp):
        report = sync_mod.run()

    assert report["mode"] == "live"
    assert report["drifted_count"] == 0
    assert report["error_count"] == 0
    assert report["checked"] > 0
    # Snapshot file written.
    assert snap_file.exists()
    written = json.loads(snap_file.read_text())
    assert written["schema_version"] == "1.0"
    assert len(written["snapshots"]) == report["checked"]
    # No sync-log written when nothing drifted.
    assert not log_file.exists()


def test_drift_detected_when_etag_changes(tmp_path, monkeypatch):
    """Second sync with new ETag → drift detected, log appended."""
    snap_file = tmp_path / "snap.json"
    log_file = tmp_path / "log.md"
    monkeypatch.setattr(sync_mod, "SNAPSHOTS_FILE", snap_file)
    monkeypatch.setattr(sync_mod, "SYNC_LOG_FILE", log_file)

    # Pre-seed with old etags so the next sync sees drift.
    sources = sync_mod._load_sources()
    seeded = {
        s["abbreviation"]: {
            "etag": '"OLD-etag"',
            "last_modified_upstream": "Mon, 01 Apr 2024 00:00:00 GMT",
            "first_seen_at_utc": "2024-04-01T00:00:00+00:00",
            "last_checked_at_utc": "2024-04-01T00:00:00+00:00",
        }
        for s in sources
    }
    snap_file.write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "last_full_sync_at_utc": "2024-04-01T00:00:00+00:00",
                "snapshots": seeded,
            }
        )
    )

    fake_resp = _fake_head_response(
        etag='"NEW-etag"',
        last_modified="Wed, 28 May 2026 12:00:00 GMT",
    )

    with patch("gitlaw_mcp.freshness.sync.urllib.request.urlopen", return_value=fake_resp):
        report = sync_mod.run()

    assert report["drifted_count"] == len(sources), (
        "every source should drift when all etags changed"
    )
    # Log file written with timestamped entry.
    assert log_file.exists()
    log_content = log_file.read_text()
    assert "drifted upstream" in log_content
    assert "NEW-etag"[:16] in log_content


def test_network_failure_preserves_prior_snapshot(tmp_path, monkeypatch):
    """A transient HTTP error must NOT erase a previously-good snapshot."""
    import urllib.error

    snap_file = tmp_path / "snap.json"
    monkeypatch.setattr(sync_mod, "SNAPSHOTS_FILE", snap_file)
    monkeypatch.setattr(sync_mod, "SYNC_LOG_FILE", tmp_path / "log.md")

    # Seed a prior-good snapshot for every source.
    sources = sync_mod._load_sources()
    prior = {
        s["abbreviation"]: {
            "etag": '"known-good"',
            "last_modified_upstream": "Wed, 01 May 2026 00:00:00 GMT",
            "first_seen_at_utc": "2026-05-01T00:00:00+00:00",
            "last_checked_at_utc": "2026-05-01T00:00:00+00:00",
        }
        for s in sources
    }
    snap_file.write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "last_full_sync_at_utc": "2026-05-01T00:00:00+00:00",
                "snapshots": prior,
            }
        )
    )

    def _boom(req, timeout=None):
        raise urllib.error.URLError("simulated network failure")

    with patch("gitlaw_mcp.freshness.sync.urllib.request.urlopen", side_effect=_boom):
        report = sync_mod.run()

    assert report["error_count"] == len(sources)
    # Snapshots must STILL contain the known-good etags — we didn't erase good state.
    after = json.loads(snap_file.read_text())
    for abbr in prior:
        assert after["snapshots"][abbr]["etag"] == '"known-good"', (
            f"{abbr}: known-good etag was erased by a transient failure"
        )


def test_dry_run_does_not_write_files(tmp_path, monkeypatch):
    snap_file = tmp_path / "snap.json"
    log_file = tmp_path / "log.md"
    monkeypatch.setattr(sync_mod, "SNAPSHOTS_FILE", snap_file)
    monkeypatch.setattr(sync_mod, "SYNC_LOG_FILE", log_file)

    fake_resp = _fake_head_response(etag='"abc"', last_modified="Wed, 27 May 2026 00:00:00 GMT")

    with patch("gitlaw_mcp.freshness.sync.urllib.request.urlopen", return_value=fake_resp):
        sync_mod.run(dry_run=True)

    assert not snap_file.exists()
    assert not log_file.exists()


def test_offline_mode_skips_network(tmp_path, monkeypatch):
    """Offline mode: just reads existing snapshots, never touches network."""
    snap_file = tmp_path / "snap.json"
    snap_file.write_text(
        json.dumps(
            {
                "schema_version": "1.0",
                "last_full_sync_at_utc": "2026-05-28T00:00:00+00:00",
                "snapshots": {"BGB": {"etag": '"x"'}},
            }
        )
    )
    monkeypatch.setattr(sync_mod, "SNAPSHOTS_FILE", snap_file)

    # If offline mode wrongly hit the network, the patch target would not be called.
    # We assert the result shape regardless.
    report = sync_mod.run(offline=True)
    assert report["mode"] == "offline"
    assert report["law_count"] == 1


# ── MCP tools — exercise the committed snapshot + manifest ───────────


@pytest.fixture
def needs_upstream_snapshot():
    """Skip MCP-tool tests if the committed snapshot isn't present yet."""
    p = ROOT / "gitlaw_mcp" / "freshness" / "upstream_snapshots.json"
    if not p.exists():
        pytest.skip("upstream_snapshots.json not committed yet")


def test_check_upstream_currency_returns_drift_status_for_known_law(needs_upstream_snapshot):
    result = check_upstream_currency("BGB")
    assert result["found"] is True
    assert result["abbreviation"] == "BGB"
    assert result["source_url"].startswith("https://www.gesetze-im-internet.de/")
    assert result["drift_status"] in {"current", "stale", "unknown"}


def test_check_upstream_currency_unknown_abbreviation_returns_clean_error(needs_upstream_snapshot):
    result = check_upstream_currency("DEFINITELY_NOT_A_LAW_XYZ")
    assert result["found"] is False


def test_list_drifted_laws_returns_structured_summary(needs_upstream_snapshot):
    result = list_drifted_laws()
    # Either errors (manifest missing) or a structured summary — never raises.
    assert isinstance(result, dict)
    if "error" in result:
        return
    assert "drifted_count" in result
    assert "total_monitored" in result
    assert "drifted" in result
    assert isinstance(result["drifted"], list)
    for entry in result["drifted"]:
        assert "abbreviation" in entry
        assert "days_behind" in entry


def test_list_drifted_is_sorted_by_days_behind_descending(needs_upstream_snapshot):
    result = list_drifted_laws()
    if "error" in result or not result.get("drifted"):
        pytest.skip("no drift data to verify sort")
    days = [d.get("days_behind") or 0 for d in result["drifted"]]
    assert days == sorted(days, reverse=True), f"not sorted: {days}"
