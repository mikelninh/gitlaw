"""
Query GitLaw with natural-language questions.

The query layer delegates retrieval to ``rag.retrieval`` so CLI, API and tests
share one canonical retrieval implementation. Hybrid retrieval (FAISS + BM25
fused with RRF) is the default.

CLI: python3 rag/query.py "Darf ich dazuverdienen?"
"""

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_openai import ChatOpenAI

from rag.retrieval import retrieve

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


def get_chain(persona: str | None = None, use_hybrid: bool = True, k: int = 6):
    """Build an LCEL RAG chain returning the answer plus retrieved sources."""
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

    def _format_context(docs) -> str:
        return "\n\n---\n\n".join(
            f"[{d.metadata.get('abbreviation', '')}] {d.metadata.get('section', '')}\n"
            f"{d.page_content[:1500]}"
            for d in docs
        )

    retrieval = RunnableLambda(lambda q: retrieve(q, k=k, hybrid=use_hybrid))

    answer_chain = (
        {
            "context": lambda x: _format_context(x["docs"]),
            "question": lambda x: x["question"],
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return {
        "question": RunnablePassthrough(),
        "docs": retrieval,
    } | RunnablePassthrough.assign(answer=answer_chain)


def ask(question: str, persona: str | None = None, use_hybrid: bool = True) -> dict:
    """Ask a legal question; hybrid retrieval is on unless explicitly disabled."""
    result = get_chain(persona=persona, use_hybrid=use_hybrid).invoke(question)
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
    for source in result["sources"]:
        print(f"  [{source['abbreviation']}] {source['section']}")
