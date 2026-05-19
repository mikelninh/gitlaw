"""
Evaluate GitLaw's RAG: retrieval quality and answer quality.

Retrieval@k: how often any expected paragraph appears in the top-k retrieved chunks.
LLM-judge: gpt-4o-mini scores generated answers on faithfulness (grounded in sources)
and relevance (actually answers the question).

Usage:
    OPENAI_API_KEY=sk-... python3 evals/run_rag_eval.py
    OPENAI_API_KEY=sk-... python3 evals/run_rag_eval.py --limit 5
    OPENAI_API_KEY=sk-... python3 evals/run_rag_eval.py --no-judge
"""

import os
import re
import sys
import json
import time
import argparse
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from openai import OpenAI

from rag.query import hybrid_retrieve

VECTORSTORE_DIR = ROOT / "rag" / "vectorstore"

EVAL_SET = ROOT / "evals" / "gitlaw_qa_set.json"
RESULTS_DIR = ROOT / "evals" / "results"
JUDGE_MODEL = "gpt-4o-mini"
ANSWER_MODEL = "gpt-4o-mini"

ANSWER_PROMPT = """Du bist ein freundlicher Rechtsberater der Fragen zum deutschen Recht beantwortet.

REGELN:
- Antworte NUR basierend auf den bereitgestellten Gesetzestexten
- Wenn die Quellen die Frage nicht beantworten, sag ehrlich: "Dazu habe ich keine passenden Gesetzestexte."
- Nenne immer die relevanten Paragraphen (Gesetz + §)
- Erkläre einfach und verständlich
- Maximal 5-6 Sätze
- Dies ist KEINE Rechtsberatung

GESETZLICHE QUELLEN:
{context}

FRAGE: {question}

ANTWORT:"""

PARAGRAPH_RE = re.compile(r"§\s*([0-9]+[a-z]?)")


def normalize_paragraph(section: str) -> str | None:
    m = PARAGRAPH_RE.search(section or "")
    return m.group(1) if m else None


USE_HYBRID = os.environ.get("GITLAW_HYBRID", "0") != "0"


def retrieve(question: str, k: int):
    docs = hybrid_retrieve(question, k=k, use_hybrid=USE_HYBRID)
    return [
        {
            "abbr": d.metadata.get("abbreviation", ""),
            "section": d.metadata.get("section", ""),
            "paragraph": normalize_paragraph(d.metadata.get("section", "")),
            "law": d.metadata.get("law", ""),
            "content": d.page_content,
        }
        for d in docs
    ]


def hit_at_k(retrieved, expected, k):
    top = retrieved[:k]
    exp_set = {(e["abbr"].lower(), e["paragraph"]) for e in expected}
    for r in top:
        if r["paragraph"] is None:
            continue
        if (r["abbr"].lower(), r["paragraph"]) in exp_set:
            return 1
    return 0


JUDGE_SYSTEM = (
    "Du bist ein strenger Evaluator für deutsche Rechtsantworten aus einem RAG-System. "
    "Du bewertest auf Deutsch nur basierend auf den gegebenen Quellen."
)

JUDGE_USER_TEMPLATE = """Frage:
{question}

Retrieval-Quellen (vom RAG abgerufen):
{sources}

Generierte Antwort:
{answer}

Bewerte zwei Dimensionen mit Werten zwischen 0.0 und 1.0:
- faithfulness: Stützt sich die Antwort ausschließlich auf die Quellen, ohne erfundene Inhalte oder falsche Paragraphenzitate?
- relevance: Beantwortet die Antwort die konkrete Frage des Nutzers sinnvoll?

Gib eine kurze rationale (max. ein Satz).
Antworte ausschließlich als JSON mit den Feldern faithfulness, relevance, rationale."""


def judge(client: OpenAI, question: str, sources: list, answer: str) -> dict:
    src_text = "\n\n".join(
        f"[{s['abbr']}] {s['section']}\n{s['content'][:600]}" for s in sources
    )
    resp = client.chat.completions.create(
        model=JUDGE_MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": JUDGE_SYSTEM},
            {
                "role": "user",
                "content": JUDGE_USER_TEMPLATE.format(
                    question=question, sources=src_text, answer=answer
                ),
            },
        ],
    )
    raw = resp.choices[0].message.content
    try:
        data = json.loads(raw)
        return {
            "faithfulness": float(data.get("faithfulness", 0)),
            "relevance": float(data.get("relevance", 0)),
            "rationale": str(data.get("rationale", ""))[:300],
        }
    except Exception as e:
        return {
            "faithfulness": 0.0,
            "relevance": 0.0,
            "rationale": f"judge_parse_error: {e}",
        }


def generate_answer(client: OpenAI, question: str, sources: list) -> str:
    context = "\n\n".join(
        f"[{s['abbr']}] {s['section']}\n{s['content'][:1500]}" for s in sources
    )
    resp = client.chat.completions.create(
        model=ANSWER_MODEL,
        temperature=0.2,
        max_tokens=400,
        messages=[
            {
                "role": "user",
                "content": ANSWER_PROMPT.format(context=context, question=question),
            },
        ],
    )
    return resp.choices[0].message.content.strip()


def summarize(results: list, by_category: bool = True) -> dict:
    n = len(results)
    avg = lambda key: round(sum(r[key] for r in results) / n, 3) if n else 0.0

    summary = {
        "n_questions": n,
        "retrieval@1": avg("hit@1"),
        "retrieval@3": avg("hit@3"),
        "retrieval@5": avg("hit@5"),
        "avg_faithfulness": avg("faithfulness"),
        "avg_relevance": avg("relevance"),
    }

    if by_category:
        cats = defaultdict(list)
        for r in results:
            cats[r["category"]].append(r)
        summary["per_category"] = {
            c: {
                "n": len(rs),
                "retrieval@5": round(sum(r["hit@5"] for r in rs) / len(rs), 3),
                "avg_faithfulness": round(
                    sum(r["faithfulness"] for r in rs) / len(rs), 3
                ),
                "avg_relevance": round(sum(r["relevance"] for r in rs) / len(rs), 3),
            }
            for c, rs in sorted(cats.items())
        }
    return summary


def print_summary(summary: dict):
    print("\n" + "=" * 60)
    print(f"GitLaw RAG eval — {summary['n_questions']} questions")
    print("=" * 60)
    print(f"  Retrieval@1     : {summary['retrieval@1']:.3f}")
    print(f"  Retrieval@3     : {summary['retrieval@3']:.3f}")
    print(f"  Retrieval@5     : {summary['retrieval@5']:.3f}")
    print(f"  Faithfulness avg: {summary['avg_faithfulness']:.3f}")
    print(f"  Relevance avg   : {summary['avg_relevance']:.3f}")
    print("\nPer category (Retrieval@5 / faith / rel):")
    for cat, s in summary.get("per_category", {}).items():
        print(
            f"  {cat:22s} n={s['n']:2d}  r@5={s['retrieval@5']:.2f}  f={s['avg_faithfulness']:.2f}  r={s['avg_relevance']:.2f}"
        )
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--no-judge", action="store_true", help="Skip LLM-as-judge")
    parser.add_argument(
        "--no-answer",
        action="store_true",
        help="Skip answer generation (retrieval only)",
    )
    parser.add_argument("-k", type=int, default=5)
    args = parser.parse_args()

    if not os.environ.get("OPENAI_API_KEY"):
        print("ERROR: OPENAI_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    eval_data = json.loads(EVAL_SET.read_text(encoding="utf-8"))
    questions = eval_data["questions"]
    if args.limit:
        questions = questions[: args.limit]

    client = OpenAI() if not args.no_judge else None
    results = []

    for i, q in enumerate(questions, 1):
        print(f"[{i}/{len(questions)}] {q['id']}  {q['question'][:70]}")
        try:
            retrieved = retrieve(q["question"], k=max(args.k, 5))
        except Exception as e:
            print(f"  retrieval error: {e}")
            continue

        h1 = hit_at_k(retrieved, q["expected"], 1)
        h3 = hit_at_k(retrieved, q["expected"], 3)
        h5 = hit_at_k(retrieved, q["expected"], 5)

        answer_text = ""
        sources = retrieved[: args.k]
        if not args.no_answer:
            try:
                answer_text = generate_answer(
                    client or OpenAI(), q["question"], sources
                )
            except Exception as e:
                answer_text = f"[answer error: {e}]"

        faith, rel, rationale = 0.0, 0.0, ""
        if (
            not args.no_judge
            and answer_text
            and not answer_text.startswith("[answer error")
        ):
            try:
                j = judge(client, q["question"], sources, answer_text)
                faith, rel, rationale = (
                    j["faithfulness"],
                    j["relevance"],
                    j["rationale"],
                )
            except Exception as e:
                rationale = f"judge error: {e}"

        results.append(
            {
                "id": q["id"],
                "category": q["category"],
                "question": q["question"],
                "expected": q["expected"],
                "retrieved_top5": [
                    {"abbr": r["abbr"], "section": r["section"]} for r in retrieved[:5]
                ],
                "answer": answer_text,
                "hit@1": h1,
                "hit@3": h3,
                "hit@5": h5,
                "faithfulness": faith,
                "relevance": rel,
                "judge_rationale": rationale,
            }
        )
        print(f"   hit@1={h1} hit@3={h3} hit@5={h5}  faith={faith:.2f} rel={rel:.2f}")
        time.sleep(0.3)

    summary = summarize(results)
    print_summary(summary)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S")
    out = RESULTS_DIR / f"rag_eval_{ts}.json"
    out.write_text(
        json.dumps(
            {"summary": summary, "results": results}, ensure_ascii=False, indent=2
        ),
        encoding="utf-8",
    )
    print(f"\nResults written to {out}")


if __name__ == "__main__":
    main()
