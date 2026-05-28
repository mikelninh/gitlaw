"""
Outcome eval — measures whether GitLaw MCP reduces hallucinations and improves
citation accuracy on real legal questions.

How it works:

  For each question in questions.json, we ask the same LLM (gpt-4o-mini, the
  cheapest production-grade Anthropic-API alternative people actually use)
  the same question under two conditions:

    BASELINE    — no tools, model answers from its training-only knowledge
    TREATMENT   — model has access to GitLaw tools (verify_citation,
                  lookup_paragraph, search_laws) via OpenAI function-calling,
                  which is functionally equivalent to how an MCP client would
                  expose the same tools.

  We then parse the cited paragraphs out of each answer and score:

    hallucination_rate      — fraction of cited § that DON'T exist in the corpus
    expected_hit_rate       — fraction of questions where ≥ 1 expected § was cited
    cited_per_question      — mean # of statutes per answer (sanity check on
                              completeness — too few = under-answer, too many = padding)

  The headline number for the tweet/blogpost: hallucination_rate.
  BASELINE typically lands around 25–35% (gpt-4o-mini casually invents §
  numbers when asked about specific German law).
  TREATMENT should land near 0% — the model has no reason to invent when
  verify_citation is one tool call away.

Run:
    cd /Users/mikel/gitlaw
    source .env.local                                  # need OPENAI_API_KEY
    python -m gitlaw_mcp.eval.run                       # uses all 25 questions
    python -m gitlaw_mcp.eval.run --limit 5             # smoke test, cheap
    python -m gitlaw_mcp.eval.run --model gpt-4o        # bigger model

Output:
    eval_report_<timestamp>.json   — full per-question results
    eval_summary.md                — markdown summary, the headline numbers
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from openai import OpenAI  # noqa: E402  — must follow sys.path setup above

from gitlaw_mcp.server import (  # noqa: E402  — same reason
    lookup_paragraph as _lookup_paragraph,
    search_laws as _search_laws,
    verify_citation as _verify_citation,
)


QUESTIONS_FILE = Path(__file__).parent / "questions.json"

DEFAULT_MODEL = "gpt-4o-mini"

# Standard prompt — identical in both conditions. The only diff is whether the
# model has tools available.
SYSTEM_PROMPT = (
    "Du bist ein juristischer Assistent für deutsches Recht. "
    "Beantworte die Frage des Nutzers präzise. "
    "Nenne immer die einschlägigen Paragraphen oder Artikel im Format '§ 123 ABBR' "
    "oder 'Art. 5 GG'. "
    "Wenn du dir nicht sicher bist, sage es."
)

# Regex that catches the citation forms our corpus uses. Intentionally permissive
# — we want to count every "§ 999 XYZ" the model produces as a cited paragraph,
# even (especially) ones that turn out to be hallucinations.
CITATION_RE = re.compile(
    r"(?:§§?|Art\.?)\s*\d+[a-z]?(?:\s+(?:Abs\.?|Absatz)\s*\d+)?\s+[A-ZÄÖÜß][A-Za-zÄÖÜäöüß0-9 ]{1,30}",
    re.UNICODE,
)


# ── Tool definitions for the TREATMENT condition ──────────────────────


TOOL_SPECS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "verify_citation",
            "description": (
                "Verify a German statute citation against the official corpus. "
                "Returns the actual paragraph text if it exists, or "
                "{verified: false, reason: ...} if not. Use this whenever you "
                "want to cite a § or Article — it's how you avoid hallucinating."
            ),
            "parameters": {
                "type": "object",
                "properties": {"citation": {"type": "string", "description": "e.g. '§ 573 BGB'"}},
                "required": ["citation"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_laws",
            "description": (
                "Semantic search across 5,936 German federal statutes. "
                "Use plain-language queries — returns the most relevant paragraphs "
                "with their text. Use this when you don't know the § number yet."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "plain-language query"},
                    "limit": {"type": "integer", "default": 5},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_paragraph",
            "description": (
                "Exact lookup of a paragraph when you already know the law abbreviation "
                "and paragraph number. Faster than verify_citation when you have "
                "structured input."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "abbreviation": {"type": "string", "description": "e.g. 'BGB'"},
                    "paragraph": {"type": "string", "description": "e.g. '573'"},
                },
                "required": ["abbreviation", "paragraph"],
            },
        },
    },
]


def _dispatch_tool(name: str, args: dict) -> Any:
    """Route tool-call invocations to the real GitLaw functions."""
    if name == "verify_citation":
        return _verify_citation(args["citation"])
    if name == "search_laws":
        return _search_laws(args["query"], limit=args.get("limit", 5))
    if name == "lookup_paragraph":
        return _lookup_paragraph(args["abbreviation"], args["paragraph"])
    return {"error": f"unknown tool {name}"}


# ── Per-question evaluation ───────────────────────────────────────────


def _ask_baseline(client: OpenAI, model: str, question: str) -> str:
    """Ask the model with NO tools available — model answers from training-only knowledge."""
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
        temperature=0.0,
    )
    return resp.choices[0].message.content or ""


def _ask_treatment(client: OpenAI, model: str, question: str) -> tuple[str, int]:
    """Ask with GitLaw tools available via function-calling. Returns (answer, n_tool_calls)."""
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]

    n_tool_calls = 0
    for _ in range(6):  # safety cap — most questions resolve in 1–3 calls
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=TOOL_SPECS,
            tool_choice="auto",
            temperature=0.0,
        )
        msg = resp.choices[0].message
        if not msg.tool_calls:
            return (msg.content or "", n_tool_calls)

        # The model wants to call one or more tools — execute, then loop.
        messages.append(
            {
                "role": "assistant",
                "content": msg.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in msg.tool_calls
                ],
            }
        )
        for tc in msg.tool_calls:
            n_tool_calls += 1
            args = json.loads(tc.function.arguments)
            result = _dispatch_tool(tc.function.name, args)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result, ensure_ascii=False)[:4000],
                }
            )

    # Safety: if we exceed the cap, return what we have (rare).
    return ("(tool loop cap exceeded)", n_tool_calls)


def _extract_citations(text: str) -> list[str]:
    """Normalise whitespace and dedupe — we count each citation once per answer."""
    hits = CITATION_RE.findall(text)
    seen, out = set(), []
    for h in hits:
        normalised = re.sub(r"\s+", " ", h.strip())
        if normalised not in seen:
            seen.add(normalised)
            out.append(normalised)
    return out


def _score_answer(answer: str, expected: list[str]) -> dict[str, Any]:
    """Score a single answer against ground truth + corpus-verify each cited §."""
    cited = _extract_citations(answer)

    # Per-citation: is it real? Use verify_citation against the corpus.
    cite_results = []
    hallucinated = 0
    for c in cited:
        verified = _verify_citation(c)
        is_real = bool(verified.get("verified"))
        if not is_real:
            hallucinated += 1
        cite_results.append(
            {
                "citation": c,
                "real": is_real,
                "reason": verified.get("reason"),
            }
        )

    # Did the answer cover any of the expected paragraphs? Match loosely on §-number.
    expected_hit = False
    for exp in expected:
        # Tolerant match: strip whitespace, lowercase, compare core "§ NNN ABBR" shape.
        exp_norm = re.sub(r"\s+", " ", exp.strip()).lower()
        for c in cited:
            c_norm = re.sub(r"\s+", " ", c.strip()).lower()
            if exp_norm in c_norm or c_norm in exp_norm:
                expected_hit = True
                break
        if expected_hit:
            break

    return {
        "cited": cited,
        "cite_results": cite_results,
        "hallucinated_count": hallucinated,
        "cited_count": len(cited),
        "expected_hit": expected_hit,
    }


def run(questions_path: Path, model: str, limit: int | None = None) -> dict[str, Any]:
    with questions_path.open(encoding="utf-8") as f:
        questions = json.load(f)["questions"]
    if limit:
        questions = questions[:limit]

    client = OpenAI()
    per_q = []
    t0 = time.time()

    for i, q in enumerate(questions, 1):
        print(f"[{i:2d}/{len(questions)}] {q['id']} — {q['question'][:60]}…", flush=True)

        baseline_answer = _ask_baseline(client, model, q["question"])
        treatment_answer, n_tool_calls = _ask_treatment(client, model, q["question"])

        baseline_score = _score_answer(baseline_answer, q["expected_paragraphs"])
        treatment_score = _score_answer(treatment_answer, q["expected_paragraphs"])

        per_q.append(
            {
                "id": q["id"],
                "category": q["category"],
                "question": q["question"],
                "expected_paragraphs": q["expected_paragraphs"],
                "baseline": {**baseline_score, "answer": baseline_answer},
                "treatment": {
                    **treatment_score,
                    "answer": treatment_answer,
                    "tool_calls": n_tool_calls,
                },
            }
        )

    # Aggregate.
    def _agg(rows, key):
        return sum(r[key] for r in rows)

    baselines = [r["baseline"] for r in per_q]
    treatments = [r["treatment"] for r in per_q]

    n = len(per_q)
    b_total_cited = _agg(baselines, "cited_count")
    t_total_cited = _agg(treatments, "cited_count")
    b_total_hallucinated = _agg(baselines, "hallucinated_count")
    t_total_hallucinated = _agg(treatments, "hallucinated_count")

    summary = {
        "model": model,
        "questions_evaluated": n,
        "duration_seconds": round(time.time() - t0, 1),
        "ran_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "baseline": {
            "hallucination_rate": round(b_total_hallucinated / max(b_total_cited, 1), 4),
            "expected_hit_rate": round(sum(r["expected_hit"] for r in baselines) / n, 4),
            "cited_per_question": round(b_total_cited / n, 2),
            "total_citations": b_total_cited,
            "hallucinated": b_total_hallucinated,
        },
        "treatment": {
            "hallucination_rate": round(t_total_hallucinated / max(t_total_cited, 1), 4),
            "expected_hit_rate": round(sum(r["expected_hit"] for r in treatments) / n, 4),
            "cited_per_question": round(t_total_cited / n, 2),
            "total_citations": t_total_cited,
            "hallucinated": t_total_hallucinated,
            "avg_tool_calls": round(sum(r["tool_calls"] for r in treatments) / n, 2),
        },
    }

    return {"summary": summary, "per_question": per_q}


# ── Reporting ─────────────────────────────────────────────────────────


def write_markdown_summary(report: dict[str, Any], out_path: Path) -> None:
    s = report["summary"]
    b = s["baseline"]
    t = s["treatment"]

    halluc_drop = b["hallucination_rate"] - t["hallucination_rate"]
    coverage_lift = t["expected_hit_rate"] - b["expected_hit_rate"]

    lines = [
        "# GitLaw MCP — outcome eval",
        "",
        f"_Run at {s['ran_at_utc']} · model `{s['model']}` · {s['questions_evaluated']} questions · {s['duration_seconds']}s_",
        "",
        "## Headline",
        "",
        f"- **Hallucination rate**: `{b['hallucination_rate']:.1%}` → `{t['hallucination_rate']:.1%}` ({halluc_drop:+.1%})",
        f"- **Expected-citation hit rate**: `{b['expected_hit_rate']:.1%}` → `{t['expected_hit_rate']:.1%}` ({coverage_lift:+.1%})",
        f"- Mean tool calls per question (treatment): **{t['avg_tool_calls']}**",
        "",
        "## Per-condition stats",
        "",
        "| Metric | Baseline | Treatment (+GitLaw MCP) |",
        "|---|---:|---:|",
        f"| Hallucination rate | {b['hallucination_rate']:.1%} | {t['hallucination_rate']:.1%} |",
        f"| Expected hit rate | {b['expected_hit_rate']:.1%} | {t['expected_hit_rate']:.1%} |",
        f"| Citations per question | {b['cited_per_question']} | {t['cited_per_question']} |",
        f"| Total citations | {b['total_citations']} | {t['total_citations']} |",
        f"| Hallucinated citations | {b['hallucinated']} | {t['hallucinated']} |",
        "",
        "## Per-question results",
        "",
        "| # | Category | Question | Baseline hit | Treatment hit | Halluc B→T |",
        "|---|---|---|:-:|:-:|:-:|",
    ]
    for r in report["per_question"]:
        bh = "✓" if r["baseline"]["expected_hit"] else "✗"
        th = "✓" if r["treatment"]["expected_hit"] else "✗"
        bhc = r["baseline"]["hallucinated_count"]
        thc = r["treatment"]["hallucinated_count"]
        q = r["question"][:55] + ("…" if len(r["question"]) > 55 else "")
        lines.append(f"| {r['id']} | {r['category']} | {q} | {bh} | {th} | {bhc} → {thc} |")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--limit", type=int, default=None, help="cap question count (cheap smoke run)")
    p.add_argument("--questions", default=str(QUESTIONS_FILE))
    args = p.parse_args()

    if not os.getenv("OPENAI_API_KEY"):
        print("error: OPENAI_API_KEY not set", file=sys.stderr)
        return 2

    report = run(Path(args.questions), args.model, args.limit)

    out_dir = Path(__file__).parent
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = out_dir / f"eval_report_{ts}.json"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    write_markdown_summary(report, out_dir / "eval_summary.md")

    s = report["summary"]
    print()
    print("─" * 60)
    print(
        f"BASELINE   halluc {s['baseline']['hallucination_rate']:.1%}   hit {s['baseline']['expected_hit_rate']:.1%}"
    )
    print(
        f"TREATMENT  halluc {s['treatment']['hallucination_rate']:.1%}   hit {s['treatment']['expected_hit_rate']:.1%}"
    )
    print("─" * 60)
    print(f"report: {json_path}")
    print(f"summary: {out_dir / 'eval_summary.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
