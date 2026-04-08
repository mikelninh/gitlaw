"""
FastAPI server for GitLaw RAG queries.
Serves the FAISS vector store as an API for the frontend.

Run: uvicorn rag.server:app --port 8001
"""

import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

app = FastAPI(title="GitLaw RAG API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load vector store on startup
VECTORSTORE_DIR = Path("rag/vectorstore")
vectorstore = None
embeddings = None

PERSONAS = {
    "student": "Student/in, jung, wenig Einkommen, WG, eventuell BAföG",
    "arbeitnehmer": "Angestellt, Vollzeit, sozialversicherungspflichtig",
    "selbststaendig": "Selbstständig/Freelancer, keine automatische Absicherung",
    "elternteil": "Verheiratet mit Kindern",
    "alleinerziehend": "Alleinerziehend, ein Einkommen, Kind(er)",
    "rentner": "Im Ruhestand, 65+, lebt von Rente",
    "mieter": "Mieter/in einer Wohnung",
    "vermieter": "Vermieter/in, besitzt Immobilie(n)",
    "azubi": "In der Berufsausbildung",
    "migrant": "Nicht-deutsche Staatsangehörigkeit, lebt in Deutschland",
    "schwanger": "Schwanger oder Mutter, im Arbeitsverhältnis",
    "arbeitslos": "Arbeitsuchend, bezieht Bürgergeld oder ALG I",
}


@app.on_event("startup")
async def load_vectorstore():
    global vectorstore, embeddings
    if not VECTORSTORE_DIR.exists():
        print("WARNING: Vector store not found. Run: python rag/build_vectorstore.py")
        return
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    vectorstore = FAISS.load_local(str(VECTORSTORE_DIR), embeddings, allow_dangerous_deserialization=True)
    print(f"Loaded vector store: {vectorstore.index.ntotal} vectors")


class QuestionRequest(BaseModel):
    question: str
    persona: str | None = None
    history: list[dict] | None = None


class QuestionResponse(BaseModel):
    answer: str
    sources: list[dict]


@app.post("/ask", response_model=QuestionResponse)
async def ask_question(req: QuestionRequest):
    if not vectorstore:
        raise HTTPException(503, "Vector store not loaded")

    # Retrieve relevant chunks
    all_text = req.question
    if req.history:
        all_text += " " + " ".join(m.get("content", "") for m in req.history)

    docs = vectorstore.similarity_search(all_text, k=6)

    context = "\n\n---\n\n".join(
        f"[{d.metadata.get('law', '')} — {d.metadata.get('section', '')}]\n{d.page_content[:500]}"
        for d in docs
    )

    sources = [
        {"law": d.metadata.get("law", ""), "section": d.metadata.get("section", ""), "law_id": d.metadata.get("law_id", "")}
        for d in docs
    ]

    persona_text = ""
    if req.persona and req.persona in PERSONAS:
        persona_text = f"\n\nDie Person: {PERSONAS[req.persona]}. Beziehe dich auf ihre Situation."

    messages = [
        {"role": "system", "content": f"""Du bist ein freundlicher Rechtsberater.

REGELN:
- Antworte NUR basierend auf den Quellen
- Wenn keine passenden Quellen: sag es ehrlich
- Nenne Paragraphen (Gesetz + §)
- Einfach erklären, Alltagsbeispiel
- Max 5-6 Sätze
- Keine Rechtsberatung{persona_text}

QUELLEN:
{context}"""},
    ]

    if req.history:
        for m in req.history:
            messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})

    messages.append({"role": "user", "content": req.question})

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2, max_tokens=400)
    response = llm.invoke(messages)

    return QuestionResponse(
        answer=response.content,
        sources=sources,
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "vectors": vectorstore.index.ntotal if vectorstore else 0,
    }
