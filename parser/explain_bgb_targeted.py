"""
Generate explanations for top ~50 citizen-relevant BGB paragraphs.
Updates viewer/public/explanations/bgb.json in-place.

Run from repo root:
  python parser/explain_bgb_targeted.py
"""

import json
import time
import sys
import re
from pathlib import Path
from openai import OpenAI

client = OpenAI()  # Uses OPENAI_API_KEY from environment

TARGET_SECTIONS = {
    # Mietrecht
    "§ 535",
    "§ 536",
    "§ 538",
    "§ 543",
    "§ 549",
    "§ 555a",
    "§ 555b",
    "§ 555c",
    "§ 558",
    "§ 559",
    "§ 568",
    "§ 573",
    "§ 573a",
    "§ 573c",
    "§ 574",
    "§ 575",
    "§ 577",
    "§ 577a",
    "§ 580a",
    "§ 581",
    # Familienrecht
    "§ 1564",
    "§ 1565",
    "§ 1566",
    "§ 1568",
    "§ 1573",
    "§ 1601",
    "§ 1606",
    "§ 1612",
    "§ 1614",
    "§ 1684",
    "§ 1696",
    "§ 1748",
    # Erbrecht
    "§ 1922",
    "§ 1924",
    "§ 1925",
    "§ 1931",
    "§ 1937",
    "§ 2229",
    "§ 2247",
    "§ 2303",
    "§ 2317",
    # Kaufrecht / Verbraucher
    "§ 145",
    "§ 311",
    "§ 312",
    "§ 312g",
    "§ 320",
    "§ 433",
    "§ 434",
    "§ 437",
    "§ 439",
    "§ 447",
    "§ 477",
    "§ 651b",
    # Allgemeines / Verträge / AGB
    "§ 138",
    "§ 226",
    "§ 242",
    "§ 305",
    "§ 309",
    "§ 310",
    "§ 355",
    # Schuldrecht / Haftung
    "§ 280",
    "§ 286",
    "§ 823",
}


def section_key(heading: str) -> str:
    """Extract '§ 573' from '§ 573 — Ordentliche Kündigung des Vermieters'."""
    m = re.match(r"(§\s*\d+\w*)", heading)
    return m.group(1).strip() if m else ""


def explain_section(law_name: str, section: str, text: str) -> str:
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Du erklärst deutsche Gesetze in einfacher Sprache für Bürgerinnen und Bürger.\n"
                        "Regeln:\n"
                        "- Schreibe für jemanden ohne Jura-Studium, 3–5 Sätze\n"
                        "- Ein konkretes Alltagsbeispiel aus dem echten Leben\n"
                        "- Was bedeutet das Gesetz praktisch? Was sind die Folgen?\n"
                        "- Kein Juristendeutsch, keine lateinischen Begriffe\n"
                        "- Schreibe auf Deutsch"
                    ),
                },
                {
                    "role": "user",
                    "content": f"Erkläre bürgerfreundlich:\n\n{law_name} — {section}\n\n{text[:2000]}",
                },
            ],
            max_tokens=250,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        print(f"    Error on {section}: {e}", file=sys.stderr)
        time.sleep(5)
        return ""


def main():
    md_path = Path("laws/bgb.md")
    out_path = Path("viewer/public/explanations/bgb.json")

    if not md_path.exists():
        print("laws/bgb.md not found — run from repo root", file=sys.stderr)
        sys.exit(1)

    # Load existing output (keep existing explanations if any)
    if out_path.exists():
        with open(out_path, encoding="utf-8") as f:
            output = json.load(f)
    else:
        output = {
            "law": "Bürgerliches Gesetzbuch",
            "file": "bgb.md",
            "explanations": {},
        }

    existing = output.get("explanations", {})

    # Parse BGB into sections
    content = md_path.read_text(encoding="utf-8")
    sections: list[tuple[str, str]] = []
    cur_heading = ""
    cur_lines: list[str] = []
    law_name = "Bürgerliches Gesetzbuch"

    for line in content.split("\n"):
        if line.startswith("# ") and not law_name:
            law_name = line[2:].strip()
        elif line.startswith("### "):
            if cur_heading and cur_lines:
                sections.append((cur_heading, "\n".join(cur_lines)))
            cur_heading = line[4:].strip()
            cur_lines = []
        elif cur_heading:
            cur_lines.append(line)

    if cur_heading and cur_lines:
        sections.append((cur_heading, "\n".join(cur_lines)))

    print(f"BGB total sections parsed: {len(sections)}")

    # Filter to target sections
    to_explain = [
        (heading, text)
        for heading, text in sections
        if section_key(heading) in TARGET_SECTIONS and heading not in existing
    ]

    print(
        f"Target sections: {len(TARGET_SECTIONS)}, to generate: {len(to_explain)}, already done: {len(existing)}"
    )

    if not to_explain:
        print("Nothing to generate.")
        return

    # Estimate cost: ~250 input + 250 output tokens each, $0.15/$0.60 per 1M for gpt-4o-mini
    est_cost = len(to_explain) * (500 * 0.15 / 1_000_000 + 250 * 0.60 / 1_000_000)
    print(f"Estimated cost: ~${est_cost:.3f}")

    generated = 0
    for heading, text in to_explain:
        if len(text.strip()) < 30:
            print(f"  Skip (too short): {heading}")
            continue
        print(f"  Explaining: {heading} ...", end=" ", flush=True)
        exp = explain_section(law_name, heading, text)
        if exp:
            existing[heading] = exp
            generated += 1
            print("done")
        else:
            print("FAILED")
        time.sleep(0.4)

    output["explanations"] = existing
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nSaved {len(existing)} total explanations to {out_path} ({generated} new)")


if __name__ == "__main__":
    main()
