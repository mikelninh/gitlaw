"""
Build a citation graph from the 5,936 German law markdown corpus.

For each paragraph (`### § N` heading), scan the body text for references to
other paragraphs — both intra-law ("§ 11 Absatz 3") and cross-law ("§ 185 StGB",
"Art. 5 GG"). Resulting graph is stored as one JSON file:

    gitlaw_mcp/data/citation_graph.json

Schema:
    {
      "stats": { ... },
      "nodes": [ { id, law, marker, number, title }, ... ],
      "edges": [ { from, to, type: "intra"|"cross", source_text }, ... ],
      "most_referenced": [ { id, in_degree }, ... 50 ]
    }

Run from repo root:
    python -m gitlaw_mcp.graph_builder           # build full graph (~30s)
    python -m gitlaw_mcp.graph_builder --top 30  # also write a focused viz subset
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from gitlaw_mcp.citations import get_abbr_index  # noqa: E402

LAWS_DIR = ROOT / "laws"
DATA_DIR = Path(__file__).parent / "data"
GRAPH_FILE = DATA_DIR / "citation_graph.json"
GRAPH_TOP_FILE = DATA_DIR / "citation_graph_top.json"
GRAPH_LAWS_FILE = DATA_DIR / "citation_graph_laws.json"
# Per-law shards for the Pro frontend — one file per active law,
# keyed by section, served from viewer/public/data/citation-graph/{lawId}.json
VIEWER_GRAPH_DIR = ROOT / "viewer" / "public" / "data" / "citation-graph"

# ─────────────────────────────────────────────────────────────────────────────
# Reference regex
# ─────────────────────────────────────────────────────────────────────────────
# Matches a paragraph reference INSIDE a paragraph body. The trailing abbreviation
# is optional — when missing, the reference is intra-law (resolved to the
# source law during extraction).
#
# Examples that match:
#   § 185
#   §§ 185, 186                       (we capture each separately on second pass)
#   § 11 Absatz 3
#   § 11 Abs. 3 StGB
#   Art. 5 GG
#   Art 5 Abs. 1 S. 1 GG
#
# Lookbehind avoids matching the heading itself ("### § 185 ...") — we strip
# headings before scanning anyway, so this is belt-and-braces.
REF_RE = re.compile(
    r"""
    (?<![#])                                 # not part of a markdown heading
    (?P<marker>§§?|Art\.?)                   # § or §§ or Art / Art.
    \s*
    (?P<number>\d+[a-z]?)                     # paragraph number, optional letter
    (?:                                       # subsection chain (consume but ignore)
        \s+(?:Abs\.?\s*\d+|Absatz\s*\d+|[IVX]+(?=[\s,.])|S\.?\s*\d+|Satz\s*\d+|\(\d+\)|Nr\.?\s*\d+|Nummer\s*\d+)
    )*
    (?:\s+(?P<abbr>[A-ZÄÖÜ][A-Za-zÄÖÜäöü\-]{1,30}))?   # optional law abbreviation
    """,
    re.VERBOSE,
)

# These tokens look like law abbreviations to the regex but are usually just
# random capitalised words inside paragraph text. Skip them.
ABBR_BLOCKLIST = {
    "Absatz",
    "Abs",
    "Satz",
    "Nummer",
    "Nr",
    "Halbsatz",
    "Buchstabe",
    "Anlage",
    "Anlagen",
    "Kapitel",
    "Abschnitt",
    "Bücher",
    "Buch",
    "Teil",
    "Teile",
    "Titel",
    "Untertitel",
    "Wenn",
    "Sofern",
    "Soweit",
    "Falls",
    "Insbesondere",
    "Die",
    "Der",
    "Das",
    "Den",
    "Dem",
    "Des",
    "Ein",
    "Eine",
    "Einer",
}


# ─────────────────────────────────────────────────────────────────────────────
# Parse one law file into nodes + outgoing edges
# ─────────────────────────────────────────────────────────────────────────────


def _node_id(abbr: str, marker: str, number: str) -> str:
    return f"{abbr.upper()}|{marker}{number}"


def parse_law_file(law_path: Path, abbr_index: dict[str, Path]) -> tuple[list[dict], list[dict]]:
    """
    Returns (nodes, edges) for one law file.

    Nodes: every paragraph in the file becomes a graph node.
    Edges: every reference inside a paragraph body becomes an outgoing edge.
    Cross-law edges are kept only when the target law's abbreviation is
    actually known to the corpus (drops false-positive caps inside text).
    """
    content = law_path.read_text(encoding="utf-8")
    lines = content.split("\n")

    # Source law metadata
    law_name = ""
    law_abbr = ""
    for line in lines[:30]:
        if line.startswith("# ") and not law_name:
            law_name = line[2:].strip()
        elif line.startswith("**Abkürzung:**"):
            law_abbr = line.replace("**Abkürzung:**", "").strip()
    if not law_abbr:
        return [], []

    # Walk paragraphs
    nodes: list[dict] = []
    edges: list[dict] = []
    cur_marker: str | None = None
    cur_number: str | None = None
    cur_title: str | None = None
    cur_body: list[str] = []

    def flush():
        nonlocal cur_body
        if cur_marker and cur_number:
            node_id = _node_id(law_abbr, cur_marker, cur_number)
            nodes.append(
                {
                    "id": node_id,
                    "law": law_abbr,
                    "law_name": law_name,
                    "marker": cur_marker,
                    "number": cur_number,
                    "title": cur_title,
                }
            )
            body = "\n".join(cur_body)
            for m in REF_RE.finditer(body):
                t_marker_raw = m.group("marker")
                t_marker = "Art" if t_marker_raw.startswith("Art") else "§"
                t_number = m.group("number")
                t_abbr = (m.group("abbr") or "").strip()

                if t_abbr and t_abbr in ABBR_BLOCKLIST:
                    t_abbr = ""

                if t_abbr:
                    if t_abbr.upper() not in abbr_index:
                        continue  # unknown abbr, drop
                    target = _node_id(t_abbr, t_marker, t_number)
                    edge_type = "intra" if t_abbr.upper() == law_abbr.upper() else "cross"
                else:
                    target = _node_id(law_abbr, t_marker, t_number)
                    edge_type = "intra"

                if target == node_id:
                    continue  # self-reference, skip

                edges.append(
                    {
                        "from": node_id,
                        "to": target,
                        "type": edge_type,
                    }
                )
        cur_body = []

    for line in lines:
        stripped = line.rstrip()
        if stripped.startswith("### "):
            flush()
            heading = stripped[4:].strip()
            # parse "§ 185 — Beleidigung" or "Art 5"
            heading_match = re.match(
                r"(?P<marker>§|Art)\s*(?P<number>\d+[a-z]?)(?:\s*[—–-]\s*(?P<title>.+))?",
                heading,
            )
            if heading_match:
                cur_marker = heading_match.group("marker")
                cur_number = heading_match.group("number")
                cur_title = (heading_match.group("title") or "").strip() or None
            else:
                cur_marker = cur_number = cur_title = None
        elif cur_marker:
            cur_body.append(line)
    flush()

    return nodes, edges


# ─────────────────────────────────────────────────────────────────────────────
# Build the full graph
# ─────────────────────────────────────────────────────────────────────────────


def build_graph() -> dict:
    print(f"Building citation graph from {LAWS_DIR}/...")
    abbr_index = get_abbr_index()
    print(f"  · {len(abbr_index)} law abbreviations indexed")

    all_nodes: list[dict] = []
    all_edges: list[dict] = []
    files = sorted(LAWS_DIR.glob("*.md"))
    print(f"  · {len(files)} law files to scan")

    t0 = time.time()
    for i, md in enumerate(files, 1):
        if i % 500 == 0:
            print(f"  · {i}/{len(files)}  ({time.time() - t0:.1f}s)")
        nodes, edges = parse_law_file(md, abbr_index)
        all_nodes.extend(nodes)
        all_edges.extend(edges)
    print(f"  · done in {time.time() - t0:.1f}s")

    # Stats
    Counter(e["from"] for e in all_edges)
    out_degree = Counter(e["to"] for e in all_edges)
    most_referenced = [
        {"id": node_id, "incoming_refs": cnt} for node_id, cnt in out_degree.most_common(50)
    ]
    cross_count = sum(1 for e in all_edges if e["type"] == "cross")
    intra_count = len(all_edges) - cross_count

    print(f"  · {len(all_nodes):,} paragraphs (nodes)")
    print(
        f"  · {len(all_edges):,} references (edges) — intra: {intra_count:,}, cross: {cross_count:,}"
    )
    print("  · top-10 most-referenced paragraphs:")
    for entry in most_referenced[:10]:
        print(f"      {entry['id']:30}  ←  {entry['incoming_refs']} refs")

    return {
        "stats": {
            "total_nodes": len(all_nodes),
            "total_edges": len(all_edges),
            "intra_law_edges": intra_count,
            "cross_law_edges": cross_count,
            "unique_laws": len({n["law"] for n in all_nodes}),
            "build_seconds": round(time.time() - t0, 2),
        },
        "nodes": all_nodes,
        "edges": all_edges,
        "most_referenced": most_referenced,
    }


def build_top_subset(graph: dict, top_n: int = 30) -> dict:
    """
    A focused subset for the visualisation: keep only nodes from the top-N
    most-connected laws + edges between them. Renders nicely in browser
    without choking on 300k nodes.
    """
    # Count degree per LAW (not paragraph)
    law_degree: Counter[str] = Counter()
    for e in graph["edges"]:
        from_law = e["from"].split("|", 1)[0]
        to_law = e["to"].split("|", 1)[0]
        law_degree[from_law] += 1
        law_degree[to_law] += 1

    top_laws = {law for law, _ in law_degree.most_common(top_n)}

    nodes = [n for n in graph["nodes"] if n["law"].upper() in top_laws]
    node_ids = {n["id"] for n in nodes}
    edges = [e for e in graph["edges"] if e["from"] in node_ids and e["to"] in node_ids]

    return {
        "stats": {
            "top_n": top_n,
            "laws": sorted(top_laws),
            "total_nodes": len(nodes),
            "total_edges": len(edges),
        },
        "nodes": nodes,
        "edges": edges,
    }


def build_law_level_graph(graph: dict) -> dict:
    """
    Aggregate the paragraph-level graph to a law-level graph: every law
    becomes one node, edges = sum of paragraph references between laws.

    Tiny enough to render as a force-directed viz in the browser
    (~200-500 laws, ~1k-3k edges). Used by graph_viewer.html.
    """
    # Per-law node = how many paragraphs that law has + how many cross-law refs in/out
    paragraphs_per_law: Counter[str] = Counter()
    for n in graph["nodes"]:
        paragraphs_per_law[n["law"]] += 1

    # Aggregate edges between laws (cross only — intra-law shows as self-loop, skip)
    pair_count: Counter[tuple[str, str]] = Counter()
    for e in graph["edges"]:
        if e["type"] != "cross":
            continue
        from_law = e["from"].split("|", 1)[0]
        to_law = e["to"].split("|", 1)[0]
        if from_law == to_law:
            continue
        pair_count[(from_law, to_law)] += 1

    # Filter to laws that participate in at least one cross-law edge — keeps the viz tight
    active_laws: set[str] = set()
    for a, b in pair_count:
        active_laws.add(a)
        active_laws.add(b)

    # Resolve display names from the abbreviation → file index
    get_abbr_index()
    name_lookup: dict[str, str] = {}
    for n in graph["nodes"]:
        if n["law"].upper() not in name_lookup:
            name_lookup[n["law"].upper()] = n.get("law_name") or n["law"]

    # In/out degree per law
    in_degree: Counter[str] = Counter()
    out_degree: Counter[str] = Counter()
    for (a, b), w in pair_count.items():
        out_degree[a] += w
        in_degree[b] += w

    nodes = []
    for law in sorted(active_laws):
        nodes.append(
            {
                "id": law,
                "name": name_lookup.get(law.upper(), law),
                "paragraph_count": paragraphs_per_law.get(law, 0),
                "in_degree": in_degree.get(law, 0),
                "out_degree": out_degree.get(law, 0),
            }
        )

    edges = [{"from": a, "to": b, "weight": w} for (a, b), w in pair_count.most_common()]

    # Headline ranking — laws other laws reference most
    most_cited = sorted(nodes, key=lambda n: int(n["in_degree"]), reverse=True)[:20]

    return {
        "stats": {
            "total_laws": len(nodes),
            "total_edges": len(edges),
            "total_paragraphs": sum(paragraphs_per_law.values()),
        },
        "nodes": nodes,
        "edges": edges,
        "most_cited_laws": [
            {"id": n["id"], "name": n["name"], "in_degree": n["in_degree"]} for n in most_cited
        ],
    }


def build_viewer_shards(graph: dict) -> tuple[int, int]:
    """
    One JSON file per law (keyed by lowercase abbreviation) for the Pro frontend.

    Format per file (e.g. viewer/public/data/citation-graph/stgb.json):
        {
          "by_section": {
            "185": {                                # bare paragraph number (no marker)
              "marker": "§",                        # "§" or "Art"
              "title": "Beleidigung",
              "referenced_by": [
                {"lawId": "stgb", "section": "188", "marker": "§", "title": "..."},
                ...
              ],
              "references": [
                {"lawId": "stgb", "section": "11", "marker": "§", "title": "Personen- und Sachbegriffe"},
                ...
              ]
            },
            "263a": {...}, ...
          },
          "law_abbr": "StGB"
        }

    The frontend fetches the shard once per law (cached by browser), then does
    O(1) lookups by section. Total payload across all 4,852 laws is ~30 MB
    aggregate, but each individual shard is small (StGB is ~80 KB, BGB ~150 KB).
    Most laws have empty graphs and are skipped.
    """
    VIEWER_GRAPH_DIR.mkdir(parents=True, exist_ok=True)

    # Index nodes by id and by law for quick joins
    nodes_by_id: dict[str, dict] = {n["id"]: n for n in graph["nodes"]}
    nodes_by_law: dict[str, list[dict]] = {}
    for n in graph["nodes"]:
        nodes_by_law.setdefault(n["law"].upper(), []).append(n)

    # Bucket edges by source-law and target-law for two-pass writes
    by_law_in: dict[str, dict[str, list[dict]]] = {}  # target_law → {section → [in-edges]}
    by_law_out: dict[str, dict[str, list[dict]]] = {}  # source_law → {section → [out-edges]}

    def _peer_descriptor(peer_id: str) -> dict:
        """Convert 'STGB|§188' to {lawId, section, marker, title}."""
        peer = nodes_by_id.get(peer_id)
        if peer is None:
            law, _, rest = peer_id.partition("|")
            marker = "Art" if rest.startswith("Art") else "§"
            section = rest.replace("Art", "").replace("§", "").strip()
            return {"lawId": law.lower(), "section": section, "marker": marker, "title": None}
        return {
            "lawId": peer["law"].lower(),
            "section": peer["number"],
            "marker": peer["marker"],
            "title": peer.get("title"),
        }

    for e in graph["edges"]:
        src = nodes_by_id.get(e["from"])
        tgt = nodes_by_id.get(e["to"])
        if src:
            by_law_out.setdefault(src["law"].upper(), {}).setdefault(src["number"], []).append(
                _peer_descriptor(e["to"])
            )
        if tgt:
            by_law_in.setdefault(tgt["law"].upper(), {}).setdefault(tgt["number"], []).append(
                _peer_descriptor(e["from"])
            )

    # Write one shard per law that has any in/out edges
    laws_with_edges = set(by_law_in.keys()) | set(by_law_out.keys())
    files_written = 0
    paragraphs_with_neighbours = 0

    for law_abbr_upper in sorted(laws_with_edges):
        in_map = by_law_in.get(law_abbr_upper, {})
        out_map = by_law_out.get(law_abbr_upper, {})
        sections = set(in_map) | set(out_map)
        if not sections:
            continue

        # Get one canonical node for marker + display abbreviation
        canonical = next(
            (n for n in nodes_by_law.get(law_abbr_upper, []) if n["number"] in sections), None
        )
        display_abbr = canonical["law"] if canonical else law_abbr_upper
        # Each paragraph keeps its own title from the canonical node
        title_lookup: dict[str, dict] = {
            n["number"]: {"marker": n["marker"], "title": n.get("title")}
            for n in nodes_by_law.get(law_abbr_upper, [])
        }

        by_section: dict[str, dict] = {}
        for section in sorted(sections, key=lambda s: (len(s), s)):
            meta = title_lookup.get(section, {"marker": "§", "title": None})
            by_section[section] = {
                "marker": meta["marker"],
                "title": meta["title"],
                "referenced_by": in_map.get(section, []),
                "references": out_map.get(section, []),
            }
            paragraphs_with_neighbours += 1

        shard = {
            "law_abbr": display_abbr,
            "by_section": by_section,
        }
        # Sanitize: some law abbreviations contain slashes/spaces (e.g. "ATPANL1/3ÄNDG", "SGB 5")
        safe_name = law_abbr_upper.lower().replace("/", "-").replace(" ", "-")
        out_path = VIEWER_GRAPH_DIR / f"{safe_name}.json"
        out_path.write_text(json.dumps(shard, ensure_ascii=False, separators=(",", ":")))
        files_written += 1

    return files_written, paragraphs_with_neighbours


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the GitLaw citation graph")
    parser.add_argument(
        "--top", type=int, default=30, help="Also write a top-N-laws subset for visualisation"
    )
    args = parser.parse_args()

    DATA_DIR.mkdir(exist_ok=True)
    graph = build_graph()
    GRAPH_FILE.write_text(json.dumps(graph, ensure_ascii=False, indent=None))
    size_mb = GRAPH_FILE.stat().st_size / (1024 * 1024)
    print(f"\n  ✓ Wrote {GRAPH_FILE.relative_to(ROOT)} — {size_mb:.1f} MB")

    if args.top:
        subset = build_top_subset(graph, top_n=args.top)
        GRAPH_TOP_FILE.write_text(json.dumps(subset, ensure_ascii=False, indent=2))
        print(f"  ✓ Wrote {GRAPH_TOP_FILE.relative_to(ROOT)} — top-{args.top} laws viz subset")
        print(
            f"      ({subset['stats']['total_nodes']:,} nodes, {subset['stats']['total_edges']:,} edges)"
        )

    laws_graph = build_law_level_graph(graph)
    GRAPH_LAWS_FILE.write_text(json.dumps(laws_graph, ensure_ascii=False, indent=2))
    print(f"  ✓ Wrote {GRAPH_LAWS_FILE.relative_to(ROOT)} — law-level network for viz")
    print(
        f"      ({laws_graph['stats']['total_laws']:,} laws, {laws_graph['stats']['total_edges']:,} cross-law edges)"
    )
    files, paragraphs = build_viewer_shards(graph)
    print(
        f"  ✓ Wrote {files:,} per-law shards to viewer/public/data/citation-graph/ "
        f"({paragraphs:,} paragraphs with neighbours)"
    )

    print("  Top-5 most-cited laws:")
    for entry in laws_graph["most_cited_laws"][:5]:
        print(f"      {entry['id']:14}  ←  {entry['in_degree']:4} refs   ({entry['name']})")


if __name__ == "__main__":
    main()
