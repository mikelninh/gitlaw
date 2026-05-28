"""
Direct coverage for the MCP tools that the original eval suite doesn't touch.

Before this file, three of the six exposed tools (list_laws, hybrid_search, and
the gitlaw://law/{abbreviation} resource) had zero direct tests — the test
badge was misleading. Plus find_related_paragraphs only had its happy path
covered.

These tests close that gap. They're deliberately small and per-tool, so a
failure tells you exactly which tool regressed.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from gitlaw_mcp.server import (  # noqa: E402
    find_related_paragraphs,
    get_law_text,
    hybrid_search,
    list_laws,
)

VECTORSTORE = ROOT / "rag" / "vectorstore"
SEMANTIC_AVAILABLE = bool(os.getenv("OPENAI_API_KEY")) and VECTORSTORE.exists()
semantic_only = pytest.mark.skipif(
    not SEMANTIC_AVAILABLE,
    reason="semantic search needs OPENAI_API_KEY + rag/vectorstore/",
)


# ─── list_laws ─────────────────────────────────────────────────────────


def test_list_laws_returns_full_index_unfiltered():
    result = list_laws(limit=10)
    assert result["total"] > 5000, f"corpus shrunk unexpectedly: {result['total']}"
    assert result["returned"] == 10
    assert result["matched"] == result["total"]
    assert all("abbreviation" in law and "file" in law for law in result["laws"])


def test_list_laws_filter_case_insensitive():
    lower = list_laws(filter="bgb", limit=500)
    upper = list_laws(filter="BGB", limit=500)
    assert lower["matched"] == upper["matched"]
    assert lower["matched"] > 0


def test_list_laws_filter_no_match():
    result = list_laws(filter="zzz_nonexistent_xyz", limit=10)
    assert result["matched"] == 0
    assert result["returned"] == 0
    assert result["laws"] == []


def test_list_laws_limit_is_bounded():
    # Server clamps the limit; assert it never blows up and stays in a sane range.
    small = list_laws(limit=0)
    huge = list_laws(limit=99_999)
    assert small["returned"] >= 1
    assert huge["returned"] <= 500


# ─── hybrid_search ─────────────────────────────────────────────────────


@semantic_only
def test_hybrid_search_returns_semantic_plus_graph():
    result = hybrid_search("Beleidigung im Internet", limit=5, expand=2)
    assert result["query"] == "Beleidigung im Internet"
    assert len(result["semantic_hits"]) > 0
    assert "stats" in result
    assert result["stats"]["semantic_count"] == len(result["semantic_hits"])
    # graph_neighbours may be empty if no hit maps cleanly to a graph node — the key must still exist.
    assert "graph_neighbours" in result


def test_hybrid_search_empty_query_degrades_gracefully():
    result = hybrid_search("", limit=5)
    assert result["semantic_hits"] == []
    assert result["graph_neighbours"] == []


@semantic_only
def test_hybrid_search_limit_respected():
    """The limit parameter clamps semantic_hits — graph expansion is independent."""
    result = hybrid_search("Beleidigung", limit=3, expand=2)
    assert len(result["semantic_hits"]) <= 3
    assert result["stats"]["semantic_count"] == len(result["semantic_hits"])


# ─── Resource: gitlaw://law/{abbreviation} ────────────────────────────


def test_resource_returns_full_law_markdown():
    text = get_law_text("StGB")
    assert "§ 185" in text
    assert "Beleidigung" in text
    assert len(text) > 100_000


def test_resource_unknown_law_returns_not_found_string():
    text = get_law_text("DEFINITELY_NOT_A_LAW_XYZ")
    assert "not found" in text.lower()
    assert "DEFINITELY_NOT_A_LAW_XYZ" in text


# ─── find_related_paragraphs error paths ──────────────────────────────


def test_find_related_unparseable_returns_clean_error():
    result = find_related_paragraphs("not a citation at all 🦄")
    assert result["found"] is False
    assert result.get("reason") in (
        "could_not_parse",
        "law_not_found",
        "paragraph_not_in_graph",
        "paragraph_not_found",
    )


def test_find_related_unknown_law_returns_clean_error():
    result = find_related_paragraphs("§ 185 XYZNONEXISTENT")
    assert result["found"] is False
    assert result.get("reason") in ("law_not_found", "could_not_parse")


def test_find_related_paragraph_not_in_graph():
    # A real law abbreviation but a paragraph number that doesn't exist — must not crash.
    result = find_related_paragraphs("§ 9999 StGB")
    assert result["found"] is False
    assert result.get("reason") in (
        "paragraph_not_in_graph",
        "paragraph_not_found",
        "law_not_found",
    )
