"""Build a JSON index of all parsed law files for the web viewer."""

import json
import re
from pathlib import Path

def build_index(laws_dir: str = "laws", output: str = "viewer/public/law-index.json"):
    laws = []
    for md_file in sorted(Path(laws_dir).glob("*.md")):
        content = md_file.read_text(encoding="utf-8")
        lines = content.split("\n")

        # Extract metadata from first lines
        title = ""
        abbr = ""
        date = ""
        stand = ""
        section_count = 0

        for line in lines:
            if line.startswith("# "):
                title = line[2:].strip()
            elif line.startswith("**Abkürzung:**"):
                abbr = line.replace("**Abkürzung:**", "").strip()
            elif line.startswith("**Ausfertigungsdatum:**"):
                date = line.replace("**Ausfertigungsdatum:**", "").strip()
            elif line.startswith("**Stand:**"):
                stand = line.replace("**Stand:**", "").strip()
            elif line.startswith("### "):
                section_count += 1

        if title:
            laws.append({
                "id": md_file.stem,
                "title": title,
                "abbreviation": abbr,
                "date": date,
                "stand": stand,
                "sections": section_count,
                "lines": len(lines),
                "file": md_file.name,
            })

    # Sort by title
    laws.sort(key=lambda x: x["title"].lower())

    Path(output).parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(laws, f, ensure_ascii=False, indent=2)

    print(f"Index built: {len(laws)} laws → {output}")
    return laws

if __name__ == "__main__":
    laws = build_index()
    # Print some stats
    total_lines = sum(l["lines"] for l in laws)
    total_sections = sum(l["sections"] for l in laws)
    print(f"Total: {len(laws)} laws, {total_sections} sections, {total_lines} lines")
    # Top 10 biggest
    biggest = sorted(laws, key=lambda x: x["lines"], reverse=True)[:10]
    print("\nBiggest laws:")
    for l in biggest:
        print(f"  {l['abbreviation']:20s} {l['lines']:>6} lines  {l['title'][:60]}")
