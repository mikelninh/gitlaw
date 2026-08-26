#!/usr/bin/env python3
"""Run a pinned German BGB paragraph-retrieval tournament on GerLayQA.

Ground truth comes from the public GerLayQA repository at a pinned Git commit.
The data is fetched at runtime and is NOT vendored into GitLaw. Per the upstream
README, the hosted data is restricted to non-commercial scientific research.

This runner measures retrieval capability only. It is not answer accuracy,
not current-law validation, not a lawyer-quality score, and not product gold.

Retrieval unit decision:
- GerLayQA's bgb.json already represents BGB paragraphs/documents by id.
- We keep one source document per id rather than copying the upstream baseline's
  long-document split loop, which can produce near-duplicate chunks.
- SentenceTransformer truncation is model-native and recorded in the output.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import time
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
from huggingface_hub import HfApi
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

UPSTREAM_REPO = "trusthlt/eacl24-german-legal-questions"
UPSTREAM_COMMIT = "cbc465942f0c1eab25ec8864bc358466e4d88e0e"
RAW_BASE = f"https://raw.githubusercontent.com/{UPSTREAM_REPO}/{UPSTREAM_COMMIT}"
CORPUS_PATH = "data/bgb.json"
EVAL_PATH = "data/bgb_eval.json"
EXPECTED_EVAL_QUESTIONS = 2154
TOKEN_RE = re.compile(r"\b\w+\b", re.UNICODE)
RRF_K = 60

MODEL_IDS = {
    "dense_general": "sentence-transformers/all-MiniLM-L6-v2",
    "dense_german": "PM-AI/bi-encoder_msmarco_bert-base_german",
}


def fetch_bytes(path: str, retries: int = 3) -> bytes:
    url = f"{RAW_BASE}/{path}"
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "GitLaw-Eval-Lab/1.0"})
            with urllib.request.urlopen(req, timeout=120) as response:
                return response.read()
        except Exception as exc:
            last_error = exc
            if attempt == retries:
                raise RuntimeError(f"failed to fetch pinned {path}: {exc}") from exc
            time.sleep(attempt * 2)
    raise RuntimeError(last_error)  # pragma: no cover


def load_json(path: str) -> tuple[Any, str]:
    raw = fetch_bytes(path)
    digest = hashlib.sha256(raw).hexdigest()
    return json.loads(raw.decode("utf-8")), digest


def tokenize(text: str) -> list[str]:
    return [m.group(0).lower() for m in TOKEN_RE.finditer(text)]


def normalize_id(value: Any) -> str:
    return str(value).strip()


def question_text(row: dict[str, Any]) -> str:
    return str(row.get("Question_text", "")).strip()


def gold_ids(row: dict[str, Any]) -> list[str]:
    vals = row.get("Paragraphs", [])
    if vals is None:
        return []
    if not isinstance(vals, list):
        vals = [vals]
    return list(dict.fromkeys(normalize_id(v) for v in vals if str(v).strip()))


def resolve_model(model_id: str) -> tuple[str, str]:
    info = HfApi().model_info(model_id)
    revision = str(info.sha)
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise RuntimeError(f"model {model_id} did not resolve to a 40-char commit SHA: {revision}")
    return model_id, revision


def rank_bm25(corpus_texts: list[str], questions: list[str]) -> list[list[int]]:
    model = BM25Okapi([tokenize(t) for t in corpus_texts])
    rankings: list[list[int]] = []
    for q in questions:
        scores = model.get_scores(tokenize(q))
        rankings.append(np.argsort(scores)[::-1].tolist())
    return rankings


def rank_dense(
    corpus_texts: list[str],
    questions: list[str],
    model_id: str,
    revision: str,
    batch_size: int,
) -> tuple[list[list[int]], dict[str, Any]]:
    started = time.perf_counter()
    model = SentenceTransformer(model_id, revision=revision, trust_remote_code=False)
    corpus_embeddings = model.encode(
        corpus_texts,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    query_embeddings = model.encode(
        questions,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    scores = np.matmul(query_embeddings, corpus_embeddings.T)
    rankings = np.argsort(scores, axis=1)[:, ::-1].tolist()
    elapsed = time.perf_counter() - started
    return rankings, {
        "model_id": model_id,
        "model_revision": revision,
        "normalize_embeddings": True,
        "seconds": elapsed,
        "seconds_per_question_including_corpus_embedding": elapsed / max(len(questions), 1),
    }


def rrf_rank(a: list[int], b: list[int], *, k: int = RRF_K, depth: int = 200) -> list[int]:
    scores: dict[int, float] = defaultdict(float)
    for ranking in (a[:depth], b[:depth]):
        for rank, idx in enumerate(ranking, start=1):
            scores[idx] += 1.0 / (k + rank)
    return [idx for idx, _ in sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))]


def precision_at_k(retrieved: list[str], expected: set[str], k: int) -> float:
    if k <= 0:
        return 0.0
    return len(set(retrieved[:k]) & expected) / k


def recall_at_k(retrieved: list[str], expected: set[str], k: int) -> float:
    if not expected:
        return 0.0
    return len(set(retrieved[:k]) & expected) / len(expected)


def average_precision_at_k(retrieved: list[str], expected: set[str], k: int) -> float:
    if not expected:
        return 0.0
    hits = 0
    total = 0.0
    seen: set[str] = set()
    for rank, doc_id in enumerate(retrieved[:k], start=1):
        if doc_id in expected and doc_id not in seen:
            hits += 1
            seen.add(doc_id)
            total += hits / rank
    return total / len(expected)


def evaluate_method(
    name: str,
    rankings: list[list[int]],
    corpus_ids: list[str],
    rows: list[dict[str, Any]],
    *,
    k: int = 10,
) -> dict[str, Any]:
    ps: list[float] = []
    rs: list[float] = []
    f1s: list[float] = []
    rrs: list[float] = []
    aps: list[float] = []
    hits = {1: 0, 5: 0, 10: 0}
    details: list[dict[str, Any]] = []

    for row, ranking in zip(rows, rankings):
        expected = set(gold_ids(row))
        retrieved = [corpus_ids[i] for i in ranking[:k]]
        p = precision_at_k(retrieved, expected, k)
        r = recall_at_k(retrieved, expected, k)
        f1 = 0.0 if p + r == 0 else 2 * p * r / (p + r)
        rr = 0.0
        for rank, doc_id in enumerate(retrieved, start=1):
            if doc_id in expected:
                rr = 1.0 / rank
                break
        ap = average_precision_at_k(retrieved, expected, k)
        for cutoff in hits:
            if set(retrieved[:cutoff]) & expected:
                hits[cutoff] += 1
        ps.append(p)
        rs.append(r)
        f1s.append(f1)
        rrs.append(rr)
        aps.append(ap)
        details.append({
            "question": question_text(row),
            "gold_paragraph_ids": sorted(expected),
            "top10_paragraph_ids": retrieved,
            "first_relevant_rank": int(round(1 / rr)) if rr else None,
        })

    n = len(rows)
    return {
        "name": name,
        "n_questions": n,
        "metrics": {
            "precision_at_10": float(np.mean(ps)),
            "recall_at_10": float(np.mean(rs)),
            "f1_at_10": float(np.mean(f1s)),
            "mrr_at_10": float(np.mean(rrs)),
            "map_at_10": float(np.mean(aps)),
            "hit_at_1": hits[1] / n,
            "hit_at_5": hits[5] / n,
            "hit_at_10": hits[10] / n,
        },
        "rows": details,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json-out", type=Path, required=True)
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument(
        "--methods",
        default="bm25,dense_general,dense_german,hybrid_german_rrf",
        help="comma-separated: bm25,dense_general,dense_german,hybrid_german_rrf",
    )
    args = ap.parse_args()
    selected = {m.strip() for m in args.methods.split(",") if m.strip()}
    allowed = {"bm25", "dense_general", "dense_german", "hybrid_german_rrf"}
    unknown = selected - allowed
    if unknown:
        raise SystemExit(f"unknown methods: {sorted(unknown)}")

    corpus, corpus_sha = load_json(CORPUS_PATH)
    eval_rows_raw, eval_sha = load_json(EVAL_PATH)
    if len(eval_rows_raw) != EXPECTED_EVAL_QUESTIONS:
        raise RuntimeError(f"expected {EXPECTED_EVAL_QUESTIONS} GerLayQA eval rows, got {len(eval_rows_raw)}")

    corpus_ids = [normalize_id(r["id"]) for r in corpus]
    corpus_texts = [str(r.get("content", "")) for r in corpus]
    if len(set(corpus_ids)) != len(corpus_ids):
        raise RuntimeError("bgb.json contains duplicate paragraph ids; retrieval unit contract must be reviewed")

    # Mirror the upstream baseline's explicit question-length exclusion while
    # reporting it, rather than silently dropping rows.
    excluded_long = [r for r in eval_rows_raw if len(question_text(r).split()) > 300]
    rows = [r for r in eval_rows_raw if len(question_text(r).split()) <= 300 and gold_ids(r)]
    excluded_no_gold = [r for r in eval_rows_raw if not gold_ids(r)]
    questions = [question_text(r) for r in rows]

    known_ids = set(corpus_ids)
    missing_gold = sorted({g for r in rows for g in gold_ids(r) if g not in known_ids})
    if missing_gold:
        raise RuntimeError(f"ground-truth paragraph ids absent from pinned BGB corpus: {missing_gold[:20]}")

    methods: dict[str, dict[str, Any]] = {}
    rankings: dict[str, list[list[int]]] = {}
    model_meta: dict[str, Any] = {}

    # BM25 is also required as the fusion leg for hybrid.
    need_bm25 = "bm25" in selected or "hybrid_german_rrf" in selected
    if need_bm25:
        started = time.perf_counter()
        rankings["bm25"] = rank_bm25(corpus_texts, questions)
        methods["bm25"] = evaluate_method("bm25", rankings["bm25"], corpus_ids, rows)
        methods["bm25"]["runtime"] = {"seconds": time.perf_counter() - started}

    for method in ("dense_general", "dense_german"):
        need = method in selected or (method == "dense_german" and "hybrid_german_rrf" in selected)
        if not need:
            continue
        model_id, revision = resolve_model(MODEL_IDS[method])
        ranked, meta = rank_dense(corpus_texts, questions, model_id, revision, args.batch_size)
        rankings[method] = ranked
        model_meta[method] = meta
        methods[method] = evaluate_method(method, ranked, corpus_ids, rows)
        methods[method]["runtime"] = meta

    if "hybrid_german_rrf" in selected:
        fused = [rrf_rank(a, b) for a, b in zip(rankings["bm25"], rankings["dense_german"])]
        rankings["hybrid_german_rrf"] = fused
        methods["hybrid_german_rrf"] = evaluate_method("hybrid_german_rrf", fused, corpus_ids, rows)
        methods["hybrid_german_rrf"]["fusion"] = {"type": "reciprocal_rank_fusion", "rrf_k": RRF_K, "depth": 200}

    scoreboard = sorted(
        (
            {
                "method": name,
                **payload["metrics"],
            }
            for name, payload in methods.items()
        ),
        key=lambda x: (x["mrr_at_10"], x["recall_at_10"], x["hit_at_10"]),
        reverse=True,
    )

    result = {
        "schema_version": "1.0",
        "status": "OBSERVED_GERMAN_PUBLIC_RETRIEVAL_EVIDENCE",
        "benchmark": "GerLayQA",
        "upstream_repo": UPSTREAM_REPO,
        "upstream_commit": UPSTREAM_COMMIT,
        "data_policy": "NON_COMMERCIAL_SCIENTIFIC_RESEARCH_ONLY_PER_UPSTREAM_README",
        "data_vendored": False,
        "source_files": {
            CORPUS_PATH: {"sha256": corpus_sha, "n_rows": len(corpus)},
            EVAL_PATH: {"sha256": eval_sha, "n_rows": len(eval_rows_raw)},
        },
        "retrieval_unit": "one pinned bgb.json document/paragraph id; no custom long-document duplication",
        "question_contract": {
            "raw_eval_questions": len(eval_rows_raw),
            "evaluated_questions": len(rows),
            "excluded_over_300_words": len(excluded_long),
            "excluded_without_gold": len(excluded_no_gold),
        },
        "models": model_meta,
        "scoreboard": scoreboard,
        "methods": methods,
        "claim_boundary": (
            "This is German BGB paragraph-retrieval capability on the pinned historical GerLayQA evaluation split. "
            "It is not answer accuracy, not current-law validation, not a lawyer-approval score, and not product readiness."
        ),
    }
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k != "methods"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
