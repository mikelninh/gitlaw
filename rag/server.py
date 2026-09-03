"""FastAPI surface for the canonical GitLaw RAG pipeline.

All retrieval flows through ``rag.retrieval`` so the API cannot silently drift
from the CLI/evaluation path. Hybrid retrieval is enabled by default.

Run: uvicorn rag.server:app --port 8001
"""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from rag.query import PERSONAS
from rag.retrieval import retrieve, vector_count

app = FastAPI(title="GitLaw RAG API", version="1.1")

_DEFAULT_ORIGINS = (
    "https://mikelninh.github.io,"
    "http://localhost:3000,"
    "http://localhost:5173"
)
_raw_origins = os.getenv("GITLAW_CORS_ORIGINS", _DEFAULT_ORIGINS)
allowed_origins = [origin.strip() for origin in _raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
    allow_credentials=False,
)

startup_error: str | None = None


@app.on_event("startup")
async def warm_retrieval():
    """Warm the canonical vector index and expose startup failures via /health."""
    global startup_error
    try:
        vector_count()
        startup_error = None
    except Exception as exc:  # keep server inspectable even when dependencies are absent
        startup_error = f"{type(exc).__name__}: {exc}"


class QuestionRequest(BaseModel):
    question: str
    persona: str | None = None
    history: list[dict] | None = None


class QuestionResponse(BaseModel):
    answer: str
    sources: list[dict]


@app.post("/ask", response_model=QuestionResponse)
async def ask_question(req: QuestionRequest):
    all_text = req.question
    if req.history:
        all_text += " " + " ".join(m.get("content", "") for m in req.history)

    try:
        docs = retrieve(all_text, k=6, hybrid=True)
    except Exception as exc:
        raise HTTPException(503, f"Retrieval unavailable: {type(exc).__name__}") from exc

    context = "\n\n---\n\n".join(
        f"[{d.metadata.get('abbreviation', '')} — {d.metadata.get('section', '')}]\n"
        f"{d.page_content[:1500]}"
        for d in docs
    )

    sources = [
        {
            "law": d.metadata.get("law", ""),
            "abbreviation": d.metadata.get("abbreviation", ""),
            "section": d.metadata.get("section", ""),
            "law_id": d.metadata.get("law_id", ""),
        }
        for d in docs
    ]

    persona_text = ""
    if req.persona and req.persona in PERSONAS:
        persona_text = f"\n\nDie Person: {PERSONAS[req.persona]}. Beziehe dich auf ihre Situation."

    messages = [
        {
            "role": "system",
            "content": f"""Du bist ein freundlicher Rechtsberater.

REGELN:
- Antworte NUR basierend auf den Quellen
- Wenn keine passenden Quellen: sag es ehrlich
- Nenne Paragraphen (Gesetz + §)
- Einfach erklären, Alltagsbeispiel
- Max 5-6 Sätze
- Keine Rechtsberatung{persona_text}

QUELLEN:
{context}""",
        }
    ]

    if req.history:
        for message in req.history:
            messages.append(
                {
                    "role": message.get("role", "user"),
                    "content": message.get("content", ""),
                }
            )

    messages.append({"role": "user", "content": req.question})

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2, max_tokens=400)
    response = llm.invoke(messages)
    return QuestionResponse(answer=response.content, sources=sources)


@app.get("/health")
async def health():
    if startup_error:
        return {
            "status": "degraded",
            "retrieval": "hybrid",
            "error": startup_error,
        }
    return {
        "status": "ok",
        "retrieval": "hybrid",
        "vectors": vector_count(),
    }
