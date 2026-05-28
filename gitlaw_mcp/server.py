"""
GitLaw MCP Server — expose the GitLaw legal corpus as MCP tools.

Built on top of the existing FAISS vectorstore (rag/vectorstore/) and the
5,936 German law markdown files (laws/*.md).

Tools:
    search_laws       — semantic search across all paragraphs (RAG retrieval, no LLM)
    verify_citation   — parse a citation string and confirm it exists, return text
    lookup_paragraph  — exact lookup by abbreviation + paragraph number
    list_laws         — enumerate available laws (full list or filtered)

Resource:
    gitlaw://law/{abbr} — full markdown content of a law

Run locally:
    uv run python -m mcp.server
or:
    python -m mcp.server

Hook into Claude Desktop / Cursor / any MCP client via stdio — see README.
"""

from __future__ import annotations

import functools
import json as _json
import logging
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any, Callable

# Allow `python -m mcp.server` from repo root and `uv run`
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


# ─── Structured logging ───────────────────────────────────────────────
# JSON-per-line on stderr: each log entry is a single JSON object so it
# pipes cleanly into Datadog/Loki/Sentry/Axiom without a parser. Tool
# calls get latency, status and a request_id automatically via @_traced.
class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        # Merge anything attached via `extra={}`
        for k, v in record.__dict__.items():
            if k in (
                "msg",
                "args",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "exc_info",
                "exc_text",
                "stack_info",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "name",
                "message",
                "taskName",
                "asctime",
            ):
                continue
            try:
                _json.dumps(v)  # only include JSON-serialisable extras
                payload[k] = v
            except (TypeError, ValueError):
                payload[k] = repr(v)
        return _json.dumps(payload, ensure_ascii=False)


_logger = logging.getLogger("gitlaw_mcp")
if not _logger.handlers:
    _h = logging.StreamHandler(sys.stderr)
    _h.setFormatter(_JsonFormatter())
    _logger.addHandler(_h)
    _logger.setLevel(os.getenv("GITLAW_LOG_LEVEL", "INFO").upper())
    _logger.propagate = False


def _traced(fn: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator: emit a structured JSON log around every tool invocation.
    Tool name is derived from the function name."""
    tool_name = fn.__name__

    @functools.wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        req_id = uuid.uuid4().hex[:12]
        t0 = time.perf_counter()
        status = "ok"
        err: str | None = None
        try:
            return fn(*args, **kwargs)
        except Exception as e:  # noqa: BLE001
            status = "error"
            err = f"{type(e).__name__}: {e}"
            raise
        finally:
            latency_ms = round((time.perf_counter() - t0) * 1000, 2)
            _logger.info(
                f"tool.{tool_name}",
                extra={
                    "request_id": req_id,
                    "tool": tool_name,
                    "latency_ms": latency_ms,
                    "status": status,
                    "error": err,
                },
            )

    return wrapper


from mcp.server.fastmcp import FastMCP  # type: ignore

from gitlaw_mcp.citations import (  # type: ignore
    extract_paragraph,
    find_law_file,
    get_abbr_index,
    get_law_metadata,
    parse_citation,
)

LAWS_DIR = ROOT / "laws"
VECTORSTORE_DIR = ROOT / "rag" / "vectorstore"
GRAPH_FILE = Path(__file__).parent / "data" / "citation_graph.json"

mcp = FastMCP(
    "gitlaw",
    # Bind 0.0.0.0 by default so health checks from outside the container
    # can reach us in SSE/HTTP mode. Honour explicit env override.
    host=os.getenv("FASTMCP_HOST", "0.0.0.0"),
    port=int(os.getenv("FASTMCP_PORT", os.getenv("PORT", "8000"))),
)


# ---------------------------------------------------------------------------
# Plain HTTP health probe — kept separate from the MCP /sse stream because
# Fly's / Railway's TCP health checks expect a fast 200 on GET, while /sse
# is a long-lived event-stream that never returns "done".
# ---------------------------------------------------------------------------
try:
    from starlette.responses import JSONResponse  # type: ignore

    @mcp.custom_route("/health", methods=["GET"])
    async def _health(_request):  # noqa: ANN001
        return JSONResponse({"status": "ok", "service": "gitlaw-mcp"})
except Exception:  # pragma: no cover — only matters when FastMCP supports it
    pass

# ---------------------------------------------------------------------------
# Lazy vectorstore (only loaded when search_laws is first called)
# ---------------------------------------------------------------------------

_vectorstore = None


def _get_vectorstore():
    global _vectorstore
    if _vectorstore is not None:
        return _vectorstore

    if not VECTORSTORE_DIR.exists():
        raise RuntimeError(
            f"Vector store not found at {VECTORSTORE_DIR}. Run: python rag/build_vectorstore.py"
        )
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY env var is required for semantic search "
            "(text-embedding-3-small embeddings)."
        )

    # Lazy imports — keep CLI tools (verify_citation, lookup_paragraph, list_laws)
    # working without OpenAI dependency installed.
    from langchain_community.vectorstores import FAISS
    from langchain_openai import OpenAIEmbeddings

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    _vectorstore = FAISS.load_local(
        str(VECTORSTORE_DIR), embeddings, allow_dangerous_deserialization=True
    )
    return _vectorstore


# ---------------------------------------------------------------------------
# Lazy citation graph (loaded on first find_related_paragraphs call)
# ---------------------------------------------------------------------------

_graph_indexes: dict[str, Any] | None = None


def _get_graph_indexes() -> dict[str, Any]:
    """Lazy-build the in-memory edge indexes from data/citation_graph.json."""
    global _graph_indexes
    if _graph_indexes is not None:
        return _graph_indexes

    if not GRAPH_FILE.exists():
        raise RuntimeError(
            f"Citation graph not found at {GRAPH_FILE.relative_to(ROOT)}. "
            f"Run: python -m gitlaw_mcp.graph_builder"
        )
    import json
    from collections import defaultdict

    raw = json.loads(GRAPH_FILE.read_text(encoding="utf-8"))
    nodes_by_id: dict[str, dict[str, Any]] = {n["id"]: n for n in raw["nodes"]}
    outgoing: dict[str, list[dict[str, Any]]] = defaultdict(list)
    incoming: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for e in raw["edges"]:
        outgoing[e["from"]].append(e)
        incoming[e["to"]].append(e)

    _graph_indexes = {
        "nodes_by_id": nodes_by_id,
        "outgoing": outgoing,
        "incoming": incoming,
        "stats": raw.get("stats", {}),
    }
    return _graph_indexes


def _node_id(abbr: str, marker: str, number: str) -> str:
    """Match the format produced by graph_builder._node_id: 'STGB|§185'."""
    return f"{abbr.upper()}|{marker}{number}"


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------


@mcp.tool()
@_traced
def search_laws(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """
    Semantic search across all 5,936 German laws (paragraph-level).

    Returns the most relevant paragraphs for a natural-language query, with
    metadata (law name, abbreviation, section, source file) — useful as
    grounding context for downstream reasoning. Embeddings: OpenAI
    text-embedding-3-small. Retrieval only — no LLM call.

    Args:
        query: Natural-language question or topic, e.g. "Beleidigung im Internet"
        limit: How many top matches to return (default 5, max 20)

    Returns:
        List of {law, abbreviation, section, chapter, text, file} dicts.
    """
    if not query or not query.strip():
        return []
    limit = max(1, min(20, int(limit)))
    vs = _get_vectorstore()
    docs = vs.similarity_search(query, k=limit)
    return [
        {
            "law": d.metadata.get("law", ""),
            "abbreviation": d.metadata.get("abbreviation", ""),
            "section": d.metadata.get("section", ""),
            "chapter": d.metadata.get("chapter", ""),
            "text": d.page_content,
            "file": d.metadata.get("file", ""),
        }
        for d in docs
    ]


@mcp.tool()
@_traced
def verify_citation(citation: str) -> dict[str, Any]:
    """
    Verify whether a German legal citation exists and return its actual text.

    The point of this tool is anti-hallucination: an LLM can claim "§ 999 StGB
    says X" — this tool will return verified=False for the made-up paragraph,
    or verified=True with the real text for genuine citations.

    Accepted formats:
        § 185 StGB
        § 185 Abs. 1 StGB
        Art. 5 GG
        Art 5 Abs. 1 S. 1 GG

    Args:
        citation: Citation string

    Returns:
        Dict with:
          verified (bool), citation_parsed, law (name+abbr), paragraph
          (number, title, text), source (file). On failure: reason +
          best-effort suggestions.
    """
    parsed = parse_citation(citation)
    if not parsed:
        return {
            "verified": False,
            "reason": "could_not_parse",
            "input": citation,
            "hint": "Expected format: '§ 185 StGB' or 'Art. 5 GG'.",
        }

    law_path = find_law_file(parsed.abbreviation)
    if not law_path:
        return {
            "verified": False,
            "reason": "law_not_found",
            "input": citation,
            "law_abbreviation_searched": parsed.abbreviation,
            "available_count": len(get_abbr_index()),
        }

    paragraph = extract_paragraph(law_path, parsed.marker, parsed.number)
    if not paragraph:
        return {
            "verified": False,
            "reason": "paragraph_not_found",
            "input": citation,
            "law": get_law_metadata(law_path),
            "source": law_path.name,
            "hint": (
                f"{parsed.abbreviation} exists, but '{parsed.marker} {parsed.number}' "
                "was not found in the corpus. The paragraph may have been repealed, "
                "renumbered, or the citation may be wrong."
            ),
        }

    return {
        "verified": True,
        "citation_parsed": {
            "marker": parsed.marker,
            "number": parsed.number,
            "subsection": parsed.subsection,
            "abbreviation": parsed.abbreviation,
        },
        "law": get_law_metadata(law_path),
        "paragraph": {
            "number": paragraph.number,
            "title": paragraph.title,
            "text": paragraph.text,
        },
        "source": f"laws/{law_path.name}",
    }


@mcp.tool()
@_traced
def lookup_paragraph(abbreviation: str, paragraph: str) -> dict[str, Any]:
    """
    Exact lookup by law abbreviation and paragraph number — faster than
    verify_citation when you already have structured input.

    Args:
        abbreviation: Law abbreviation, e.g. "StGB", "GG", "BGB"
        paragraph: Paragraph number, e.g. "§ 185", "185", "Art 5", "5"

    Returns:
        Same shape as verify_citation on success.
    """
    law_path = find_law_file(abbreviation)
    if not law_path:
        return {
            "verified": False,
            "reason": "law_not_found",
            "law_abbreviation_searched": abbreviation,
        }

    # Normalise paragraph input — accept "§ 185", "185", "Art 5", "5"
    p = paragraph.strip()
    marker = "§"
    if p.lower().startswith("art"):
        marker = "Art"
        p = p[3:].lstrip(". ").strip()
    elif p.startswith("§"):
        p = p[1:].strip()

    found = extract_paragraph(law_path, marker, p)
    if not found:
        return {
            "verified": False,
            "reason": "paragraph_not_found",
            "law": get_law_metadata(law_path),
            "source": law_path.name,
        }
    return {
        "verified": True,
        "law": get_law_metadata(law_path),
        "paragraph": {
            "number": found.number,
            "title": found.title,
            "text": found.text,
        },
        "source": f"laws/{law_path.name}",
    }


@mcp.tool()
@_traced
def list_laws(filter: str | None = None, limit: int = 50) -> dict[str, Any]:
    """
    List laws available in the GitLaw corpus.

    Args:
        filter: Optional substring (case-insensitive) to filter by abbreviation
                or filename, e.g. "stgb" matches StGB, StGB-EG, etc.
        limit: Max results to return (default 50, the corpus has ~5,936 laws total)

    Returns:
        {total: int, returned: int, laws: [{abbreviation, file}]}
    """
    index = get_abbr_index()
    items = sorted(index.items())  # [(abbr, Path), ...]
    if filter:
        f = filter.lower()
        items = [(a, p) for a, p in items if f in a.lower() or f in p.name.lower()]
    limited = items[: max(1, min(500, int(limit)))]
    return {
        "total": len(index),
        "matched": len(items),
        "returned": len(limited),
        "laws": [{"abbreviation": a, "file": p.name} for a, p in limited],
    }


@mcp.tool()
@_traced
def find_related_paragraphs(citation: str, limit: int = 20) -> dict[str, Any]:
    """
    Find paragraphs that reference, or are referenced by, a given paragraph.

    Walks the GitLaw citation graph (94K paragraphs, 200K extracted references
    across 5,936 laws). Returns both directions:
      - referenced_by: paragraphs that cite the given one (in-edges)
      - references:    paragraphs cited from the given one (out-edges)

    Useful for: building agentic legal research workflows that need to
    traverse statutory cross-references, finding "what else is relevant",
    and explaining a paragraph in context of its surrounding statute.

    Args:
        citation: Citation string, e.g. "§ 185 StGB", "Art. 5 GG"
        limit: Max results per direction (default 20, max 100)

    Returns:
        Dict with: input, node_id, found, in_degree, out_degree,
        referenced_by [{id, law, marker, number, title, type}],
        references    [{id, law, marker, number, title, type}].
    """
    parsed = parse_citation(citation)
    if not parsed:
        return {"found": False, "reason": "could_not_parse", "input": citation}

    abbr_index = get_abbr_index()
    if parsed.abbreviation.upper() not in abbr_index:
        return {
            "found": False,
            "reason": "law_not_found",
            "input": citation,
            "law_abbreviation_searched": parsed.abbreviation,
        }

    indexes = _get_graph_indexes()
    nid = _node_id(parsed.abbreviation, parsed.marker, parsed.number)

    if nid not in indexes["nodes_by_id"]:
        return {
            "found": False,
            "reason": "paragraph_not_in_graph",
            "input": citation,
            "node_id": nid,
            "hint": "Paragraph may exist in the corpus but had no parseable cross-references.",
        }

    limit = max(1, min(100, int(limit)))

    def _hydrate(edges: list[dict[str, Any]], peer_field: str) -> list[dict[str, Any]]:
        out = []
        for e in edges[:limit]:
            peer_id = e[peer_field]
            peer = indexes["nodes_by_id"].get(peer_id)
            if peer is None:
                # Edge target wasn't in our parsed nodes (rare — orphan citation)
                law, _, num = peer_id.partition("|")
                out.append(
                    {
                        "id": peer_id,
                        "law": law,
                        "marker": num[:3].strip("§Art"),
                        "number": num.lstrip("§Art"),
                        "title": None,
                        "type": e["type"],
                    }
                )
            else:
                out.append(
                    {
                        "id": peer_id,
                        "law": peer["law"],
                        "marker": peer["marker"],
                        "number": peer["number"],
                        "title": peer.get("title"),
                        "type": e["type"],
                    }
                )
        return out

    in_edges = indexes["incoming"].get(nid, [])
    out_edges = indexes["outgoing"].get(nid, [])

    return {
        "found": True,
        "input": citation,
        "node_id": nid,
        "law": indexes["nodes_by_id"][nid]["law"],
        "title": indexes["nodes_by_id"][nid].get("title"),
        "in_degree": len(in_edges),
        "out_degree": len(out_edges),
        "referenced_by": _hydrate(in_edges, "from"),
        "references": _hydrate(out_edges, "to"),
    }


@mcp.tool()
@_traced
def hybrid_search(query: str, limit: int = 5, expand: int = 2) -> dict[str, Any]:
    """
    Hybrid retrieval: semantic search via FAISS PLUS graph expansion via the
    citation network. Closes the loop between vector search (which finds
    *similar* paragraphs) and the citation graph (which finds *related* ones
    via legal-dogmatic cross-references).

    Algorithm:
      1. Run search_laws (FAISS) for `limit` semantic hits
      2. For each hit, fetch its in-edges + out-edges from the citation graph
         and expand by up to `expand` peers
      3. Deduplicate, score peers by 1/(1+rank) of their semantic source
      4. Return both groups separately so the caller can render hierarchy

    Useful for: "I want everything that's *semantically* near this query AND
    everything *legally* connected to those hits". Closes the gap between
    'similar' and 'cited together'.

    Args:
        query: Natural-language search, e.g. "Beleidigung im Internet"
        limit: How many semantic hits (default 5, max 15)
        expand: How many graph peers to add per semantic hit (default 2, max 5)

    Returns:
        {
          "query": "...",
          "semantic_hits": [...],      # FAISS top-k with metadata
          "graph_neighbours": [...],   # 1-hop graph expansion of those hits
          "stats": {...}
        }
    """
    if not query or not query.strip():
        return {"query": query, "semantic_hits": [], "graph_neighbours": [], "stats": {}}

    limit = max(1, min(15, int(limit)))
    expand = max(0, min(5, int(expand)))

    semantic = search_laws(query, limit=limit)
    if not semantic:
        return {"query": query, "semantic_hits": [], "graph_neighbours": [], "stats": {}}

    # Try graph expansion. If the graph file isn't there, return semantic-only
    # gracefully — keeps the tool useful even on a fresh deploy.
    try:
        indexes = _get_graph_indexes()
    except RuntimeError:
        return {
            "query": query,
            "semantic_hits": semantic,
            "graph_neighbours": [],
            "stats": {"semantic_count": len(semantic), "graph_skipped": "no_graph_data"},
        }

    seen: set[str] = set()
    neighbours: list[dict[str, Any]] = []

    for rank, hit in enumerate(semantic):
        # Map FAISS hit metadata to our graph-id format. We need (lawAbbr.upper())|(marker)(number)
        # The hit.section field is like "§ 185 — Beleidigung". Parse just the marker+number.
        section_str = hit.get("section", "").strip()
        abbr = hit.get("abbreviation", "").strip().upper()
        if not section_str or not abbr:
            continue
        marker = "Art" if section_str.lower().startswith("art") else "§"
        # Extract first numeric token (with optional letter suffix)
        import re as _re

        m = _re.search(r"(\d+[a-z]?)", section_str)
        if not m:
            continue
        nid = f"{abbr}|{marker}{m.group(1)}"
        seen.add(nid)

        # Pull peers — combine in + out, dedupe, take up to `expand`
        peer_edges = indexes["incoming"].get(nid, []) + indexes["outgoing"].get(nid, [])
        peer_ids = []
        for e in peer_edges:
            pid = e["from"] if e["to"] == nid else e["to"]
            if pid not in peer_ids:
                peer_ids.append(pid)
            if len(peer_ids) >= expand:
                break

        for pid in peer_ids:
            if pid in seen:
                continue
            seen.add(pid)
            peer = indexes["nodes_by_id"].get(pid)
            if peer is None:
                continue
            neighbours.append(
                {
                    "id": pid,
                    "law": peer["law"],
                    "marker": peer["marker"],
                    "number": peer["number"],
                    "title": peer.get("title"),
                    "source_rank": rank,  # which semantic hit pulled it in
                    "score": round(1.0 / (1 + rank), 3),  # heuristic boost
                }
            )

    return {
        "query": query,
        "semantic_hits": semantic,
        "graph_neighbours": neighbours,
        "stats": {
            "semantic_count": len(semantic),
            "graph_count": len(neighbours),
            "total_unique_paragraphs": len(seen),
        },
    }


# ---------------------------------------------------------------------------
# Resource — full law text by abbreviation
# ---------------------------------------------------------------------------


@mcp.resource("gitlaw://law/{abbreviation}")
def get_law_text(abbreviation: str) -> str:
    """Return the full markdown content of a law by its abbreviation."""
    law_path = find_law_file(abbreviation)
    if not law_path:
        return f"# Law not found\n\nNo law with abbreviation '{abbreviation}'."
    return law_path.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Provenance / freshness — answer the user's question "how do you know it's real?"
# ---------------------------------------------------------------------------


MANIFEST_FILE = Path(__file__).parent / "freshness" / "manifest.json"


def _load_manifest() -> dict[str, Any] | None:
    """Return the committed corpus manifest, or None if not built yet."""
    if not MANIFEST_FILE.exists():
        return None
    try:
        return _json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))
    except (OSError, _json.JSONDecodeError):
        return None


@mcp.tool()
@_traced
def get_corpus_status() -> dict[str, Any]:
    """
    Return the public provenance snapshot of the law corpus the server is serving.

    Use this whenever you (or your user) want to answer "where does this answer
    come from, when was it last checked, and is it the same corpus everyone else
    is seeing?" Every field is verifiable against the public manifest.json in
    the repo.

    Returns:
      {
        "law_count":         <int — number of laws in the indexed corpus>
        "aggregate_sha256":  <single hash over all law hashes — changes iff any law changes>
        "generated_at_utc":  <when the manifest was last regenerated>
        "source":            <upstream we point back to (gesetze-im-internet.de)>
        "manifest_present":  true | false
      }

      Or { "error": "manifest_not_built", "hint": "..." } when the corpus has not
      been hashed yet — that itself is a useful signal of incomplete provenance.
    """
    m = _load_manifest()
    if m is None:
        return {
            "error": "manifest_not_built",
            "hint": "Run `python -m gitlaw_mcp.freshness.build_manifest` to generate. "
            "See gitlaw_mcp/freshness/TRUST.md for the current trust statement.",
        }
    return {
        "law_count": m["law_count"],
        "aggregate_sha256": m["aggregate_sha256"],
        "generated_at_utc": m["generated_at_utc"],
        "source": m["source"],
        "manifest_present": True,
    }


@mcp.tool()
@_traced
def verify_law_provenance(abbreviation: str) -> dict[str, Any]:
    """
    Return the provenance record for a single law: where we got it from, when
    it was last touched in our corpus, and the SHA-256 hash a user can verify
    against the committed manifest.

    This is the "show your work" tool. When an LLM cites § 573 BGB, the user
    (or another agent) can call verify_law_provenance("BGB") to get a structured
    answer to "okay, but where does your BGB text come from?"

    Args:
      abbreviation: case-insensitive law abbreviation, e.g. "BGB", "StGB", "GG".

    Returns:
      {
        "found": true,
        "abbreviation": "BGB",
        "source_url": "https://www.gesetze-im-internet.de/bgb/",
        "corpus_path": "laws/bgb.md",
        "corpus_sha256": "<hex>",
        "corpus_bytes": <int>,
        "git_last_modified_iso": "<ISO timestamp of last edit in git>"
      }

      Or { "found": false, "reason": "manifest_not_built" | "abbreviation_not_in_manifest" }.
    """
    m = _load_manifest()
    if m is None:
        return {"found": False, "reason": "manifest_not_built"}

    needle = abbreviation.strip().upper()
    for entry in m["laws"]:
        if entry["abbreviation"].upper() == needle:
            return {
                "found": True,
                "abbreviation": entry["abbreviation"],
                "source_url": entry["source_url"],
                "corpus_path": entry["corpus_path"],
                "corpus_sha256": entry["corpus_sha256"],
                "corpus_bytes": entry["corpus_bytes"],
                "git_last_modified_iso": entry["git_last_modified_iso"],
            }
    return {
        "found": False,
        "reason": "abbreviation_not_in_manifest",
        "searched_for": needle,
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    """
    Entry point for the GitLaw MCP server.

    Transport selection via environment:
        MCP_TRANSPORT=stdio  (default) — for Claude Desktop, Cursor, local clients
        MCP_TRANSPORT=sse              — for hosted clients (HTTP+Server-Sent Events)
        MCP_TRANSPORT=streamable-http  — newer HTTP transport (FastMCP ≥ 1.2)

    SSE mode binds to 0.0.0.0:$PORT (default 8000), suitable for Fly.io / Railway
    / Cloud Run / Fargate where a port-bound process is required.
    """
    transport = os.getenv("MCP_TRANSPORT", "stdio").lower()
    if transport in ("sse", "streamable-http"):
        # host/port already wired into the FastMCP instance above.
        mcp.run(transport=transport)
    else:
        mcp.run()


if __name__ == "__main__":
    main()
