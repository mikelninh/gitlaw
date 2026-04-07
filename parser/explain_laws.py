"""Pre-generate AI explanations for all law sections. Uses Groq (free) with Llama 3."""

import json
import time
import os
import re
from pathlib import Path

try:
    from groq import Groq
except ImportError:
    print("Installing groq...")
    os.system("pip3 install groq")
    from groq import Groq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def explain_section(law_name: str, section: str, text: str) -> str:
    """Generate a simple explanation using Groq (free Llama 3)."""
    if not client:
        return ""

    try:
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """Du erklärst deutsche Gesetze in einfacher Sprache.

Regeln:
- Erkläre für einen 16-Jährigen
- Maximal 2-3 Sätze
- Ein konkretes Alltagsbeispiel
- Was passiert wenn man dagegen verstößt (falls relevant)
- Kein Juristendeutsch"""
                },
                {
                    "role": "user",
                    "content": f"Erkläre einfach:\n\nGesetz: {law_name}\nParagraph: {section}\n\nText:\n{text[:1500]}"
                }
            ],
            max_tokens=200,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"  Error: {e}")
        return ""


def explain_law_file(md_path: Path, output_dir: Path) -> int:
    """Parse a law markdown file and generate explanations for each section."""
    content = md_path.read_text(encoding="utf-8")
    lines = content.split("\n")

    law_name = ""
    sections = []
    current_section = ""
    current_text = []

    for line in lines:
        if line.startswith("# ") and not law_name:
            law_name = line[2:].strip()
        elif line.startswith("### "):
            if current_section and current_text:
                sections.append((current_section, "\n".join(current_text)))
            current_section = line[4:].strip()
            current_text = []
        elif current_section:
            current_text.append(line)

    if current_section and current_text:
        sections.append((current_section, "\n".join(current_text)))

    if not sections:
        return 0

    explanations = {}
    count = 0

    for section, text in sections:
        text = text.strip()
        if len(text) < 30:  # Skip empty/tiny sections
            continue

        explanation = explain_section(law_name, section, text)
        if explanation:
            explanations[section] = explanation
            count += 1

        # Groq free tier: 30 requests/minute
        time.sleep(2.1)

    if explanations:
        out_path = output_dir / f"{md_path.stem}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({
                "law": law_name,
                "file": md_path.name,
                "explanations": explanations,
            }, f, ensure_ascii=False, indent=2)

    return count


def main():
    if not GROQ_API_KEY:
        print("GROQ_API_KEY not set. Get a free key at https://console.groq.com")
        print("Then: export GROQ_API_KEY=gsk_...")
        return

    output_dir = Path("viewer/public/explanations")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Start with the most important laws
    priority_laws = [
        "gg", "stgb", "bgb", "sgb_5", "sgb_6", "netzdg", "tierschg",
        "estg", "aufenthg_2004", "ao_1977", "gg", "btmg_1981",
    ]

    laws_dir = Path("laws")

    for abbr in priority_laws:
        md_path = laws_dir / f"{abbr}.md"
        if not md_path.exists():
            print(f"  Skip {abbr} — not found")
            continue

        out_path = output_dir / f"{abbr}.json"
        if out_path.exists():
            print(f"  Skip {abbr} — already explained")
            continue

        print(f"  Explaining {abbr}...")
        count = explain_law_file(md_path, output_dir)
        print(f"    → {count} sections explained")


if __name__ == "__main__":
    main()
