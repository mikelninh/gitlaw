"""
Query the GitLaw vector store with natural language questions.

LCEL-based RAG chain (LangChain 1.x compatible). Hybrid retrieval:
FAISS dense + BM25 keyword, fused with Reciprocal Rank Fusion.

CLI: python3 rag/query.py "Darf ich dazuverdienen?"
"""

import pickle
from pathlib import Path
from typing import Iterable

from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from rag.build_bm25 import BM25_PATH, tokenize

VECTORSTORE_DIR = Path("rag/vectorstore")

PERSONAS = {
    "student": "Student/in, jung, wenig Einkommen, WG, eventuell BAföG",
    "arbeitnehmer": "Angestellt, Vollzeit, sozialversicherungspflichtig",
    "selbststaendig": "Selbstständig/Freelancer, keine automatische Absicherung",
    "elternteil": "Verheiratet mit Kindern, Doppelverdiener oder Alleinverdiener",
    "alleinerziehend": "Alleinerziehend, ein Einkommen, Kind(er) im Haushalt",
    "rentner": "Im Ruhestand, 65+, lebt von Rente",
    "mieter": "Mieter/in einer Wohnung",
    "vermieter": "Vermieter/in, besitzt vermietete Immobilie(n)",
    "azubi": "In der Berufsausbildung, geringes Einkommen",
    "migrant": "Nicht-deutsche Staatsangehörigkeit, lebt in Deutschland",
    "schwanger": "Schwanger oder gerade Mutter geworden, im Arbeitsverhältnis",
    "arbeitslos": "Arbeitsuchend, bezieht Bürgergeld oder ALG I",
}

PROMPT_TEMPLATE = """Du bist ein freundlicher Rechtsberater der Fragen zum deutschen Recht beantwortet.

REGELN:
- Antworte NUR basierend auf den bereitgestellten Gesetzestexten
- Wenn die Quellen die Frage nicht beantworten, sag ehrlich: "Dazu habe ich keine passenden Gesetzestexte."
- Nenne immer die relevanten Paragraphen (Gesetz + §)
- Erkläre einfach und verständlich (für einen 16-Jährigen)
- Gib ein konkretes Alltagsbeispiel
- Maximal 5-6 Sätze
- Dies ist KEINE Rechtsberatung{persona_text}

GESETZLICHE QUELLEN:
{context}

FRAGE: {question}

ANTWORT:"""

RRF_K = 60

# Gauntlet champion 2026-08-09: stable post-retrieval prior. It never injects
# sources or reads gold labels; it only reorders documents already retrieved.
# Frozen replay improved hit@1 0.25 -> 0.40 and MRR@5 0.406 -> 0.496 while
# preserving hit@5 at 0.65.
CORE_CITIZEN_LAWS = {"BGB", "StGB", "KSchG", "ArbZG", "StVG", "BDSG"}
LEGACY_SOURCE_PENALTIES = {"AGB DDR"}

_FAISS = None
_BM25 = None


def _faiss() -> FAISS:
    global _FAISS
    if _FAISS is None:
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        _FAISS = FAISS.load_local(
            str(VECTORSTORE_DIR), embeddings, allow_dangerous_deserialization=True
        )
    return _FAISS


def _bm25() -> dict:
    global _BM25
    if _BM25 is None:
        if not BM25_PATH.exists():
            raise FileNotFoundError(
                f"BM25 index not found at {BM25_PATH}. Run: python3 -m rag.build_bm25"
            )
        with open(BM25_PATH, "rb") as f:
            _BM25 = pickle.load(f)
    return _BM25


def _doc_key(d: Document) -> tuple[str, str]:
    return (d.metadata.get("law_id", ""), d.metadata.get("section", ""))


def _core_law_rerank(docs: list[Document]) -> list[Document]:
    """Stable rerank of an existing candidate set; never adds/removes sources."""
    def priority(item: tuple[int, Document]) -> tuple[float, int]:
        idx, doc = item
        abbr = str(doc.metadata.get("abbreviation", ""))
        boost = 1.0 if abbr in CORE_CITIZEN_LAWS else 0.0
        penalty = 1.0 if abbr in LEGACY_SOURCE_PENALTIES else 0.0
        return (boost - penalty, -idx)

    return [doc for _, doc in sorted(enumerate(docs), key=priority, reverse=True)]


def _bm25_search(question: str, k: int) -> list[Document]:
    payload = _bm25()
    bm25 = payload["bm25"]
    chunks = payload["chunks"]
    scores = bm25.get_scores(tokenize(question))
    top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
    return [
        Document(page_content=chunks[i]["page_content"], metadata=chunks[i]["metadata"])
        for i in top_idx
    ]


def _rrf(
    rankings: Iterable[tuple[list[Document], float]], k_top: int
) -> list[Document]:
    scores: dict[tuple[str, str], float] = {}
    keep: dict[tuple[str, str], Document] = {}
    for ranking, weight in rankings:
        for rank, doc in enumerate(ranking):
            key = _doc_key(doc)
            scores[key] = scores.get(key, 0.0) + weight / (RRF_K + rank + 1)
            if key not in keep:
                keep[key] = doc
    ordered = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    return [keep[key] for key, _ in ordered[:k_top]]


def hybrid_retrieve(
    question: str, k: int = 6, use_hybrid: bool = False, use_core_law_prior: bool = True
) -> list[Document]:
    """Retrieve top-k chunks, then apply the current Gauntlet champion reranker."""
    dense = _faiss().similarity_search(question, k=k * 3 if use_hybrid else k)
    if not use_hybrid:
        result = dense[:k]
    else:
        sparse = _bm25_search(question, k=k * 3)
        result = _rrf([(dense, 1.0), (sparse, 0.5)], k_top=k)
    return _core_law_rerank(result) if use_core_law_prior else result


def get_chain(persona: str | None = None, use_hybrid: bool = False, k: int = 6):
    """Build an LCEL RAG chain returning {answer, sources}."""
    persona_text = ""
    if persona and persona in PERSONAS:
        persona_text = (
            f"\n\nDie Person die fragt: {PERSONAS[persona]}. "
            "Beziehe dich konkret auf ihre Situation."
        )

    prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE).partial(
        persona_text=persona_text
    )
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2, max_tokens=400)

    def _format_context(docs: list[Document]) -> str:
        return "\n\n---\n\n".join(
            f"[{d.metadata.get('abbreviation', '')}] {d.metadata.get('section', '')}\n"
            f"{d.page_content[:1500]}"
            for d in docs
        )

    retrieve = RunnableLambda(lambda q: hybrid_retrieve(q, k=k, use_hybrid=use_hybrid))

    answer_chain = (
        {
            "context": lambda x: _format_context(x["docs"]),
            "question": lambda x: x["question"],
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    chain = {
        "question": RunnablePassthrough(),
        "docs": retrieve,
    } | RunnablePassthrough.assign(answer=answer_chain)
    return chain


def ask(question: str, persona: str | None = None, use_hybrid: bool = False) -> dict:
    """Ask a legal question and get a RAG-powered answer."""
    chain = get_chain(persona=persona, use_hybrid=use_hybrid)
    result = chain.invoke(question)
    sources = [
        {
            "law": d.metadata.get("law", ""),
            "abbreviation": d.metadata.get("abbreviation", ""),
            "section": d.metadata.get("section", ""),
            "law_id": d.metadata.get("law_id", ""),
        }
        for d in result["docs"]
    ]
    return {"answer": result["answer"], "sources": sources}


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 rag/query.py 'Deine Frage' [persona]")
        print("Personas:", ", ".join(PERSONAS.keys()))
        sys.exit(1)

    question = sys.argv[1]
    persona = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"Frage: {question}")
    if persona:
        print(f"Persona: {persona} ({PERSONAS.get(persona, '?')})")
    print()

    result = ask(question, persona)
    print(f"Antwort:\n{result['answer']}")
    print("\nQuellen:")
    for s in result["sources"]:
        print(f"  [{s['abbreviation']}] {s['section']}")
