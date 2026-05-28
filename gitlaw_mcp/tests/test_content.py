"""
Content-correctness eval — beyond citation parsing.

The existing test_eval.py validates that verify_citation() parses citations
correctly and rejects hallucinations. That's necessary but not sufficient.
This file pushes the *content* layer:

  - lookup_paragraph: returned text actually contains the expected legal terms
  - find_related_paragraphs: known citation-graph edges are present
  - search_laws: real Lebenslagen queries surface the canonical paragraph
  - adversarial: tools degrade gracefully on injection / unicode / extreme inputs
  - latency budget: verify_citation stays cheap (no embedding call path)

Semantic-search tests require OPENAI_API_KEY and the FAISS vectorstore at
rag/vectorstore/. They are skipped automatically when either is missing so
CI without secrets still passes the rest.

Run:
    pytest gitlaw_mcp/tests/test_content.py -v
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from gitlaw_mcp.server import (  # noqa: E402
    find_related_paragraphs,
    lookup_paragraph,
    verify_citation,
)

VECTORSTORE = ROOT / "rag" / "vectorstore"
SEMANTIC_AVAILABLE = bool(os.getenv("OPENAI_API_KEY")) and VECTORSTORE.exists()
semantic_only = pytest.mark.skipif(
    not SEMANTIC_AVAILABLE,
    reason="semantic search needs OPENAI_API_KEY + rag/vectorstore/",
)


# ─── Lookup content correctness ────────────────────────────────────────
#
# Each case asserts the returned paragraph has the right title fragment and
# the text body mentions a domain-specific keyword that any human lawyer
# would recognise as belonging to that paragraph. This catches accidental
# index drift (wrong text under right number) which citation tests can't.


LOOKUP_CASES = [
    # (abbr, paragraph, title_contains, text_contains_any_of)
    ("BGB", "823", "Schadensersatz", ["vorsätzlich", "fahrlässig", "Schaden"]),
    ("BGB", "433", "Kaufvertrag", ["Verkäufer", "Käufer", "Sache"]),
    ("BGB", "573", "Kündigung", ["berechtigtes Interesse", "Vermieter"]),
    ("BGB", "1922", "Gesamtrechtsnachfolge", ["Erbe", "Tod", "Vermögen"]),
    ("StGB", "185", "Beleidigung", ["Freiheitsstrafe", "Geldstrafe"]),
    ("StGB", "263", "Betrug", ["Vermögensvorteil", "Täuschung", "Irrtum"]),
    ("StGB", "238", "Nachstellung", ["Lebensgestaltung", "wiederholt", "räumliche Nähe"]),
    ("StGB", "241", "Bedrohung", ["Verbrechen", "drohen", "begehen"]),
]


@pytest.mark.parametrize(
    "abbr,paragraph,title_part,terms",
    LOOKUP_CASES,
    ids=[f"{c[0]}-{c[1]}-{c[2][:12]}" for c in LOOKUP_CASES],
)
def test_lookup_returns_correct_content(abbr, paragraph, title_part, terms):
    """The text under the right § actually matches what a lawyer expects."""
    result = lookup_paragraph(abbr, paragraph)
    assert result.get("verified") is True, f"{abbr} § {paragraph}: not verified — {result}"
    para = result["paragraph"]
    assert title_part.lower() in para["title"].lower(), (
        f"{abbr} § {paragraph}: title {para['title']!r} missing {title_part!r}"
    )
    text_lower = para["text"].lower()
    assert any(term.lower() in text_lower for term in terms), (
        f"{abbr} § {paragraph}: text body missing all of {terms} — "
        f"first 200 chars: {para['text'][:200]!r}"
    )


# ─── Citation-graph correctness ────────────────────────────────────────
#
# Known cross-references in StGB and BGB that any first-semester law student
# would expect. If the graph builder regresses on these, the eval flags it.


GRAPH_CASES = [
    # (citation, must_appear_in_referenced_by, must_appear_in_references)
    (
        "§ 185 StGB",
        ["§188", "§192"],
        ["§11"],
    ),  # Beleidigung ↔ pol. Personen / Wahrheit / Personenbegriff
    ("§ 263a StGB", [], ["§263"]),  # Computerbetrug verweist auf Betrug
]


@pytest.mark.parametrize(
    "citation,refd_by,refs",
    GRAPH_CASES,
    ids=[c[0] for c in GRAPH_CASES],
)
def test_graph_edges(citation, refd_by, refs):
    """Known citation-graph relationships are preserved."""
    result = find_related_paragraphs(citation)
    assert result.get("found") is True, f"{citation}: not found in graph — {result}"

    refd_by_nums = {f"§{e['number']}" for e in result.get("referenced_by", [])}
    refs_nums = {f"§{e['number']}" for e in result.get("references", [])}

    for expected in refd_by:
        assert expected in refd_by_nums, (
            f"{citation}: expected referenced_by to contain {expected}, got {sorted(refd_by_nums)}"
        )
    for expected in refs:
        assert expected in refs_nums, (
            f"{citation}: expected references to contain {expected}, got {sorted(refs_nums)}"
        )


# ─── Semantic search — real Lebenslagen ────────────────────────────────
#
# Each case is a plain-language question a Berlin tenant / employee /
# crime victim would actually type. The expected paragraph must appear
# in the top-N results from FAISS. Top-5 is the assertion budget — that
# matches what citizen-tier RAG returns in production.


SEMANTIC_CASES = [
    # (query, expected_law, expected_paragraph_number, top_n)
    ("Mieterhöhung Zustimmung", "BGB", "558", 5),
    ("Eigenbedarfskündigung Wohnung", "BGB", "573", 5),
    ("Mietminderung Schimmel", "BGB", "536", 5),
    ("Kündigungsschutz Arbeitnehmer", "KSchG", "1", 5),
    ("Beleidigung im Internet", "StGB", "185", 5),
    ("Cyberstalking Nachstellung", "StGB", "238", 5),
    ("Erbschaft annehmen ablehnen Frist", "BGB", "1943", 7),
    ("Schmerzensgeld Verkehrsunfall", "StVG", "11", 5),
    ("Meinungsfreiheit Grundgesetz", "GG", "5", 5),
    ("Notwehr Strafrecht", "StGB", "32", 5),
]


@semantic_only
@pytest.mark.parametrize(
    "query,expected_law,expected_para,top_n",
    SEMANTIC_CASES,
    ids=[c[0][:40].replace(" ", "_") for c in SEMANTIC_CASES],
)
def test_semantic_search_finds_canonical(query, expected_law, expected_para, top_n):
    """Plain-language Lebenslage query surfaces the canonical paragraph in top-N."""
    from gitlaw_mcp.server import search_laws

    results = search_laws(query, limit=top_n)
    assert isinstance(results, list), f"{query}: search_laws returned non-list: {type(results)}"
    assert len(results) > 0, f"{query}: zero results"

    hits = [(r.get("abbreviation"), r.get("section", "")) for r in results]
    # GG uses "Art" markers, every other code uses "§" — accept either.
    matched = any(
        abbr == expected_law
        and (f"§ {expected_para}" in section or f"Art {expected_para}" in section)
        for abbr, section in hits
    )
    assert matched, (
        f"{query!r}: expected {expected_law} § {expected_para} in top-{top_n}, got {hits}"
    )


# ─── Adversarial inputs — degrade gracefully ───────────────────────────
#
# These ensure no crash / no exception leak on weird input. Either return
# a sensible result or a clean "could_not_parse" / "not verified".


ADVERSARIAL_CASES = [
    "",  # empty
    "   ",  # whitespace
    "\n\n\n",  # newlines
    "X" * 10_000,  # 10k chars
    "DROP TABLE laws; --",  # sqli-ish
    "{{prompt}} {{injection}}",  # template injection
    "<script>alert(1)</script>",  # xss-ish
    "🦄🌈💜",  # pure emoji
    "ÄäÖöÜüß€",  # umlauts
    "§§§§§§",  # marker spam
    "../../../etc/passwd",  # path traversal
    "${env.OPENAI_API_KEY}",  # env interpolation
    "https://evil.example.com/§ 185 StGB",  # URL prefix
    "Lorem ipsum dolor sit amet " * 200,  # long prose
]


@pytest.mark.parametrize("payload", ADVERSARIAL_CASES, ids=lambda p: f"len{len(p)}")
def test_adversarial_does_not_crash(payload):
    """verify_citation must return a dict for any input — never raise."""
    try:
        result = verify_citation(payload)
    except Exception as e:  # pragma: no cover — the assertion is the test
        pytest.fail(f"verify_citation raised on adversarial input: {type(e).__name__}: {e}")

    assert isinstance(result, dict)
    assert "verified" in result
    # On these inputs we don't care about the value — only that the shape is honest.
    assert isinstance(result["verified"], bool)


# ─── Latency budget ────────────────────────────────────────────────────
#
# verify_citation must stay cheap — it's the tool an agent will call dozens
# of times per session. No embedding API path involved.


def test_verify_citation_is_fast():
    """After warmup, verify_citation < 50ms per call on a real citation."""
    # Warmup — first call loads the laws cache.
    verify_citation("§ 185 StGB")

    t0 = time.perf_counter()
    for _ in range(20):
        verify_citation("§ 263 StGB")
    elapsed_ms = (time.perf_counter() - t0) * 1000 / 20

    assert elapsed_ms < 50, (
        f"verify_citation averaged {elapsed_ms:.1f}ms over 20 calls — "
        f"budget is 50ms. Index or regex regression likely."
    )


def test_lookup_is_fast_after_warmup():
    """lookup_paragraph < 100ms after first load (cache hit)."""
    lookup_paragraph("BGB", "823")  # warmup

    t0 = time.perf_counter()
    for _ in range(10):
        lookup_paragraph("BGB", "433")
    elapsed_ms = (time.perf_counter() - t0) * 1000 / 10

    assert elapsed_ms < 100, (
        f"lookup_paragraph averaged {elapsed_ms:.1f}ms after warmup — "
        f"budget is 100ms. Cache miss likely."
    )
