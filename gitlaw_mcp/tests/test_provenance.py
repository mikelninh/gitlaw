"""
Provenance + freshness coverage — tests for get_corpus_status and
verify_law_provenance, plus the build_manifest --check guard rail.

These tests deliberately depend on the committed manifest.json. If the corpus
drifts without the manifest being regenerated, this suite goes red — exactly
the signal we want.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from gitlaw_mcp.server import get_corpus_status, verify_law_provenance  # noqa: E402

MANIFEST_FILE = ROOT / "gitlaw_mcp" / "freshness" / "manifest.json"
manifest_required = pytest.mark.skipif(
    not MANIFEST_FILE.exists(),
    reason="manifest.json not built — run `python -m gitlaw_mcp.freshness.build_manifest`",
)


# ── get_corpus_status ────────────────────────────────────────────────


@manifest_required
def test_corpus_status_reports_all_expected_fields():
    status = get_corpus_status()
    assert status.get("manifest_present") is True
    assert isinstance(status["law_count"], int)
    assert status["law_count"] > 5000, f"corpus shrunk unexpectedly: {status['law_count']}"
    assert isinstance(status["aggregate_sha256"], str)
    assert len(status["aggregate_sha256"]) == 64
    assert "generated_at_utc" in status
    assert status["source"].startswith("https://www.gesetze-im-internet.de")


@manifest_required
def test_corpus_status_aggregate_matches_committed_manifest():
    """The status hash must match what's in manifest.json on disk."""
    status = get_corpus_status()
    committed = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    assert status["aggregate_sha256"] == committed["aggregate_sha256"]
    assert status["law_count"] == committed["law_count"]


# ── verify_law_provenance ───────────────────────────────────────────


@manifest_required
def test_provenance_for_bgb_returns_full_record():
    result = verify_law_provenance("BGB")
    assert result["found"] is True
    assert result["abbreviation"] == "BGB"
    assert result["source_url"] == "https://www.gesetze-im-internet.de/bgb/"
    assert result["corpus_path"] == "laws/bgb.md"
    assert len(result["corpus_sha256"]) == 64
    assert result["corpus_bytes"] > 100_000


@manifest_required
def test_provenance_is_case_insensitive():
    upper = verify_law_provenance("STGB")
    lower = verify_law_provenance("stgb")
    mixed = verify_law_provenance("StGB")
    assert upper["found"] and lower["found"] and mixed["found"]
    assert upper["corpus_sha256"] == lower["corpus_sha256"] == mixed["corpus_sha256"]


@manifest_required
def test_provenance_handles_unknown_abbreviation():
    result = verify_law_provenance("DEFINITELY_NOT_A_LAW")
    assert result["found"] is False
    assert result["reason"] == "abbreviation_not_in_manifest"


def test_provenance_works_even_without_manifest(tmp_path, monkeypatch):
    """When the manifest file is missing, both tools return a clean error envelope."""
    from gitlaw_mcp import server as server_module

    monkeypatch.setattr(server_module, "MANIFEST_FILE", tmp_path / "no_such_manifest.json")
    status = get_corpus_status()
    assert status.get("error") == "manifest_not_built"

    prov = verify_law_provenance("BGB")
    assert prov["found"] is False
    assert prov["reason"] == "manifest_not_built"


# ── Drift detection — the CI guardrail ──────────────────────────────


@manifest_required
def test_build_manifest_check_passes_against_committed():
    """`build_manifest --check` must exit 0 against the committed manifest.

    This test is the canary: if a law file is edited without rebuilding the
    manifest, this test fails — forcing the developer to update the manifest
    in the same commit.
    """
    result = subprocess.run(
        [sys.executable, "-m", "gitlaw_mcp.freshness.build_manifest", "--check"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"corpus drift detected — manifest needs rebuilding.\n"
        f"stdout: {result.stdout}\nstderr: {result.stderr}"
    )
