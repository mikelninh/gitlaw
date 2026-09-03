"""Canonical GitLaw retrieval service.

All application surfaces should use this module rather than loading FAISS or
BM25 directly. Hybrid retrieval is the default: dense FAISS + BM25, fused with
Reciprocal Rank Fusion (RRF).
"""

from __future__ import annotations

import pickle
from pathlib import Path
from typing import Iterable

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

from rag.build_bm25 import tokenize

BASE_DIR = Path(__file__).resolve().parent
VECTORSTORE_DIR = BASE_DIR / "vectorstore"
BM25_PATH = VECTORSTORE_DIR / "bm25.pkl"
RRF_K = 60

_FAISS: FAISS | None = None
_BM25: dict | None = None


def _faiss() -> FAISS:
    global _FAISS
    if _FAISS is None:
        if not VECTORSTORE_DIR.exists():
            raise FileNotFoundError(
                f"Vector store not found at {VECTORSTORE_DIR}. "
                "Run: python3 rag/build_vectorstore.py"
            )
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        # The checked-in/local index is a trusted project artifact. Never point
        # this loader at an untrusted user-supplied FAISS directory.
        _FAISS = FAISS.load_local(
            str(VECTORSTORE_DIR), embeddings, allow_dangerous_deserialization=True
        )
    return _FAISS


def _bm25() -> dict:
    global _BM25
    if _BM25 is None:
        if not BM25_PATH.exists():
            raise FileNotFoundError(
                f"BM25 index not found at {BM25_PATH}. "
                "Run: python3 -m rag.build_bm25"
            )
        with BM25_PATH.open("rb") as handle:
            _BM25 = pickle.load(handle)
    return _BM25


def _doc_key(doc: Document) -> tuple[str, str]:
    return (doc.metadata.get("law_id", ""), doc.metadata.get("section", ""))


def _bm25_search(question: str, k: int) -> list[Document]:
    payload = _bm25()
    scores = payload["bm25"].get_scores(tokenize(question))
    chunks = payload["chunks"]
    top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
    return [
        Document(page_content=chunks[i]["page_content"], metadata=chunks[i]["metadata"])
        for i in top_idx
    ]


def reciprocal_rank_fusion(
    rankings: Iterable[tuple[list[Document], float]], k_top: int
) -> list[Document]:
    """Fuse ranked lists while deduplicating by law + section."""
    scores: dict[tuple[str, str], float] = {}
    keep: dict[tuple[str, str], Document] = {}
    for ranking, weight in rankings:
        for rank, doc in enumerate(ranking):
            key = _doc_key(doc)
            scores[key] = scores.get(key, 0.0) + weight / (RRF_K + rank + 1)
            keep.setdefault(key, doc)
    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return [keep[key] for key, _ in ordered[:k_top]]


def retrieve(question: str, k: int = 6, *, hybrid: bool = True) -> list[Document]:
    """Retrieve top-k law chunks. Hybrid retrieval is the canonical default."""
    if not question or not question.strip():
        return []
    k = max(1, min(20, int(k)))
    dense = _faiss().similarity_search(question, k=k * 3 if hybrid else k)
    if not hybrid:
        return dense[:k]
    sparse = _bm25_search(question, k=k * 3)
    return reciprocal_rank_fusion([(dense, 1.0), (sparse, 0.5)], k_top=k)


def vector_count() -> int:
    """Expose index size for health/readiness endpoints."""
    return int(_faiss().index.ntotal)
