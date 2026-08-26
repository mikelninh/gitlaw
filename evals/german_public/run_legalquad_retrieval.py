#!/usr/bin/env python3
"""Run a pinned German legal-document retrieval tournament on MTEB LegalQuAD.

Important provenance boundary:
- The MTEB mirror declares CC BY 4.0 for its processed dataset.
- The referenced original AIKE2021_Appendix GitHub repository exposes the data
  but, as checked by GitLaw, has no explicit LICENSE file at its repository root.
- Therefore this run is useful capability evidence, but MUST NOT satisfy the
  strict third-suite release gate until upstream redistribution/use rights are
  independently confirmed.

No dataset text is vendored into GitLaw. All source files are fetched from a
pinned Hugging Face dataset revision at runtime and checksummed in the result.
"""
from __future__ import annotations

import argparse
import hashlib
import json
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

DATASET_ID = "mteb/LegalQuAD"
DATASET_REVISION = "d9a3183ea8b7a592a5a0e008a50847377e719109"
RAW_BASE = f"https://huggingface.co/datasets/{DATASET_ID}/resolve/{DATASET_REVISION}"
CORPUS_PATH = "corpus.jsonl"
QUERIES_PATH = "queries.jsonl"
QRELS_PATH = "qrels/test.jsonl"
EXPECTED_CORPUS = 200
EXPECTED_QUERIES = 200
EXPECTED_QRELS = 200
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


def load_jsonl(path: str) -> tuple[list[dict[str, Any]], str]:
    raw = fetch_bytes(path)
    rows = [json.loads(line) for line in raw.decode("utf-8").splitlines() if line.strip()]
    return rows, hashlib.sha256(raw).hexdigest()


def tokenize(text: str) -> list[str]:
    return [m.group(0).lower() for m in TOKEN_RE.finditer(text)]


def resolve_model(model_id: str) -> tuple[str, str]:
    revision = str(HfApi().model_info(model_id).sha)
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise RuntimeError(f"model {model_id} did not resolve to immutable SHA: {revision}")
    return model_id, revision


def rank_bm25(corpus_texts: list[str], questions: list[str]) -> list[list[int]]:
    model = BM25Okapi([tokenize(t) for t in corpus_texts])
    return [np.argsort(model.get_scores(tokenize(q)), kind="stable")[::-1].tolist() for q in questions]


def rank_dense(
    corpus_texts: list[str],
    questions: list[str],
    model_id: str,
    revision: str,
    batch_size: int,
) -> tuple[list[list[int]], dict[str, Any]]:
    started = time.perf_counter()
    model = SentenceTransformer(model_id, revision=revision, trust_remote_code=False, device="cpu")
    docs = model.encode(
        corpus_texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=True,
    )
    queries = model.encode(
        questions,
        batch_size=batch_size,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    rankings = np.argsort(-(np.asarray(queries, dtype=np.float32) @ np.asarray(docs, dtype=np.float32).T), axis=1, kind="stable").tolist()
    return rankings, {
        "model_id": model_id,
        "model_revision": revision,
        "normalize_embeddings": True,
        "max_seq_length": int(getattr(model, "max_seq_length", 0) or 0),
        "seconds_including_model_load": time.perf_counter() - started,
    }


def rrf_rank(a: list[int], b: list[int], *, k: int = RRF_K) -> list[int]:
    score: dict[int, float] = defaultdict(float)
    for ranking in (a, b):
        for rank, idx in enumerate(ranking, start=1):
            score[idx] += 1.0 / (k + rank)
    return [idx for idx, _ in sorted(score.items(), key=lambda kv: (-kv[1], kv[0]))]


def evaluate(rankings: list[list[int]], corpus_ids: list[str], gold: list[set[str]]) -> dict[str, Any]:
    hits = {1: 0, 5: 0, 10: 0}
    rr = 0.0
    recall10 = 0.0
    rows: list[dict[str, Any]] = []
    for qi, ranking in enumerate(rankings):
        retrieved = [corpus_ids[i] for i in ranking[:10]]
        expected = gold[qi]
        first = next((r for r, doc in enumerate(retrieved, start=1) if doc in expected), None)
        if first is not None:
            rr += 1.0 / first
        for k in hits:
            if set(retrieved[:k]) & expected:
                hits[k] += 1
        recall10 += len(set(retrieved) & expected) / max(len(expected), 1)
        rows.append({"query_index": qi, "gold_ids": sorted(expected), "top10_ids": retrieved, "first_relevant_rank": first})
    n = len(rankings)
    return {
        "hit_at_1": hits[1] / n,
        "hit_at_5": hits[5] / n,
        "hit_at_10": hits[10] / n,
        "recall_at_10": recall10 / n,
        "mrr_at_10": rr / n,
        "rows": rows,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json-out", required=True, type=Path)
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument("--methods", default="bm25,dense_general,dense_german,hybrid_german_rrf")
    args = ap.parse_args()
    selected = {x.strip() for x in args.methods.split(",") if x.strip()}
    allowed = {"bm25", "dense_general", "dense_german", "hybrid_german_rrf"}
    if selected - allowed:
        raise SystemExit(f"unknown methods: {sorted(selected - allowed)}")

    corpus, corpus_sha = load_jsonl(CORPUS_PATH)
    queries, queries_sha = load_jsonl(QUERIES_PATH)
    qrels, qrels_sha = load_jsonl(QRELS_PATH)
    counts = {"corpus": len(corpus), "queries": len(queries), "qrels": len(qrels)}
    expected = {"corpus": EXPECTED_CORPUS, "queries": EXPECTED_QUERIES, "qrels": EXPECTED_QRELS}
    if counts != expected:
        raise RuntimeError(f"pinned LegalQuAD cardinality drift: expected={expected}, actual={counts}")

    corpus_ids = [str(row["_id"]) for row in corpus]
    corpus_texts = ["\n".join(x for x in (str(row.get("title", "")).strip(), str(row.get("text", "")).strip()) if x) for row in corpus]
    query_ids = [str(row["_id"]) for row in queries]
    questions = [str(row["text"]) for row in queries]
    if len(set(corpus_ids)) != len(corpus_ids) or len(set(query_ids)) != len(query_ids):
        raise RuntimeError("duplicate LegalQuAD corpus/query ids")

    gold_by_query: dict[str, set[str]] = defaultdict(set)
    for row in qrels:
        if float(row.get("score", 0)) > 0:
            gold_by_query[str(row["query-id"])].add(str(row["corpus-id"]))
    missing_qrels = [qid for qid in query_ids if not gold_by_query[qid]]
    known_corpus = set(corpus_ids)
    unknown_gold = sorted({doc for docs in gold_by_query.values() for doc in docs if doc not in known_corpus})
    if missing_qrels or unknown_gold:
        raise RuntimeError(f"LegalQuAD integrity failure: missing_qrels={missing_qrels[:5]} unknown_gold={unknown_gold[:5]}")
    gold = [gold_by_query[qid] for qid in query_ids]

    rankings: dict[str, list[list[int]]] = {}
    methods: dict[str, dict[str, Any]] = {}
    model_meta: dict[str, Any] = {}
    if "bm25" in selected or "hybrid_german_rrf" in selected:
        started = time.perf_counter()
        rankings["bm25"] = rank_bm25(corpus_texts, questions)
        methods["bm25"] = {**evaluate(rankings["bm25"], corpus_ids, gold), "runtime": {"seconds": time.perf_counter() - started}}

    for method in ("dense_general", "dense_german"):
        if method not in selected and not (method == "dense_german" and "hybrid_german_rrf" in selected):
            continue
        model_id, revision = resolve_model(MODEL_IDS[method])
        rankings[method], meta = rank_dense(corpus_texts, questions, model_id, revision, args.batch_size)
        methods[method] = {**evaluate(rankings[method], corpus_ids, gold), "runtime": meta}
        model_meta[method] = meta

    if "hybrid_german_rrf" in selected:
        rankings["hybrid_german_rrf"] = [rrf_rank(a, b) for a, b in zip(rankings["bm25"], rankings["dense_german"])]
        methods["hybrid_german_rrf"] = {
            **evaluate(rankings["hybrid_german_rrf"], corpus_ids, gold),
            "fusion": {"type": "reciprocal_rank_fusion", "rrf_k": RRF_K},
        }

    scoreboard = sorted(
        ({"method": name, **{k: v for k, v in payload.items() if k != "rows" and k not in ("runtime", "fusion")}} for name, payload in methods.items()),
        key=lambda x: (x["hit_at_10"], x["mrr_at_10"]),
        reverse=True,
    )
    result = {
        "schema_version": "1.0",
        "status": "OBSERVED_GERMAN_LEGAL_RETRIEVAL_CANDIDATE",
        "benchmark": "LegalQuAD",
        "dataset_id": DATASET_ID,
        "dataset_revision": DATASET_REVISION,
        "source_files": {
            CORPUS_PATH: {"sha256": corpus_sha, "rows": len(corpus)},
            QUERIES_PATH: {"sha256": queries_sha, "rows": len(queries)},
            QRELS_PATH: {"sha256": qrels_sha, "rows": len(qrels)},
        },
        "license_provenance": {
            "mteb_mirror_declared_license": "CC-BY-4.0",
            "original_reference_repo": "Christoph911/AIKE2021_Appendix",
            "original_repo_license_file_observed": False,
            "status": "UPSTREAM_RIGHTS_CONFIRMATION_REQUIRED_BEFORE_STRICT_GATE",
        },
        "counts_as_strict_third_german_suite": False,
        "counts_as_lawyer_approved_product_gold": False,
        "models": model_meta,
        "scoreboard": scoreboard,
        "methods": methods,
        "claim_boundary": (
            "This is German legal-document retrieval capability on a pinned MTEB LegalQuAD mirror. "
            "Because the original referenced repository does not expose an explicit license file, GitLaw does not count this run toward the strict third-suite gate until rights provenance is independently confirmed. "
            "It is not current German-law accuracy, lawyer approval, or production readiness."
        ),
    }
    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    printable = dict(result)
    printable["methods"] = {name: {k: v for k, v in payload.items() if k != "rows"} for name, payload in methods.items()}
    print(json.dumps(printable, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
