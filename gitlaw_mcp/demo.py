"""
Standalone demo — exercises the citation-verification logic without OpenAI.

Useful as:
  - a sanity check after install (`python -m gitlaw_mcp.demo`)
  - a portfolio walkthrough showing what the tools return
  - a fixture for the eval harness (extend the cases list)

Run from repo root:
    python -m gitlaw_mcp.demo
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow running from anywhere
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from gitlaw_mcp.server import (  # type: ignore
    find_related_paragraphs,
    list_laws,
    lookup_paragraph,
    verify_citation,
)


CASES: list[tuple[str, str, str | tuple[str, str]]] = [
    # (label, kind, args)
    ("Real citation — Beleidigung", "verify", "§ 185 StGB"),
    ("Real citation — Computerbetrug", "verify", "§ 263a StGB"),
    ("Real citation — Meinungsfreiheit", "verify", "Art. 5 GG"),
    ("Real citation with subsections", "verify", "Art 5 Abs. 1 S. 1 GG"),
    ("HALLUCINATION — paragraph", "verify", "§ 999 StGB"),
    ("HALLUCINATION — law abbr", "verify", "§ 185 XYZ"),
    ("Free text (not a citation)", "verify", "Mit freundlichen Grüßen"),
    ("Exact lookup", "lookup", ("BGB", "823")),
    ("Filter laws by 'bgb'", "list", "bgb"),
    ("Graph — Beleidigung neighbours", "related", "§ 185 StGB"),
    ("Graph — Computerbetrug neighbours", "related", "§ 263a StGB"),
]


def fmt(obj, max_chars: int = 280) -> str:
    s = json.dumps(obj, ensure_ascii=False, indent=2)
    if len(s) > max_chars:
        return s[:max_chars] + " ...}"
    return s


def main() -> None:
    print("─" * 72)
    print("GitLaw MCP — citation verification demo (no LLM, no API key needed)")
    print("─" * 72)

    for label, kind, args in CASES:
        print(f"\n▸ {label}")
        if kind == "verify":
            print(f"  verify_citation({args!r})")
            print(fmt(verify_citation(args)))
        elif kind == "lookup":
            assert isinstance(args, tuple), "lookup case requires a (abbr, para) tuple"
            abbr, para = args
            print(f"  lookup_paragraph({abbr!r}, {para!r})")
            print(fmt(lookup_paragraph(abbr, para)))
        elif kind == "list":
            print(f"  list_laws(filter={args!r})")
            print(fmt(list_laws(filter=args, limit=5)))
        elif kind == "related":
            print(f"  find_related_paragraphs({args!r})")
            print(fmt(find_related_paragraphs(args, limit=5)))

    print("\n" + "─" * 72)
    print("Note: search_laws requires OPENAI_API_KEY + rag/vectorstore/. Skipped here.")
    print("─" * 72)


if __name__ == "__main__":
    main()
