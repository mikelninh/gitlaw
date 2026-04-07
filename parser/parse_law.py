"""Download and parse a single German law XML into clean Markdown."""

import requests
import zipfile
import io
import re
from lxml import etree
from pathlib import Path


def download_xml(xml_url: str) -> bytes:
    """Download and unzip a law XML from gesetze-im-internet.de"""
    resp = requests.get(xml_url, timeout=30)
    resp.raise_for_status()
    z = zipfile.ZipFile(io.BytesIO(resp.content))
    xml_filename = z.namelist()[0]
    return z.read(xml_filename)


def _get_la_text(dd_node) -> str:
    """Extract text from LA elements inside a DD, joining them."""
    texts = []
    for la in dd_node.findall(".//LA"):
        t = "".join(la.itertext()).strip()
        if t:
            texts.append(t)
    if texts:
        return " ".join(texts)
    # Fallback: get all text from DD
    return "".join(dd_node.itertext()).strip()


def extract_text(content_node) -> str:
    """Extract text from a <Content> node, handling DL/DT/DD/LA structures."""
    if content_node is None:
        return ""

    parts = []

    for elem in content_node.iter():
        tag = elem.tag if isinstance(elem.tag, str) else ""

        if tag == "P":
            # Check if P contains a DL (definition list)
            dl = elem.find(".//DL")
            if dl is not None:
                # Get intro text before the DL
                intro = (elem.text or "").strip()
                if intro:
                    parts.append(intro)
                # Process DT/DD pairs
                dts = dl.findall("DT")
                dds = dl.findall("DD")
                for i, dt in enumerate(dts):
                    num = "".join(dt.itertext()).strip()
                    if i < len(dds):
                        content = _get_la_text(dds[i])
                        # Check for nested DLs in DD
                        sub_dl = dds[i].find(".//DL")
                        if sub_dl is not None and not content:
                            content = _get_la_text(dds[i])
                        if num and content:
                            parts.append(f"{num} {content}")
                        elif num:
                            parts.append(num)
                    elif num:
                        parts.append(num)
            elif not list(elem):
                # Simple P without children
                text = "".join(elem.itertext()).strip()
                if text:
                    parts.append(text)

    # Deduplicate consecutive identical lines
    result = []
    for p in parts:
        line = " ".join(p.split()).strip()
        if line and (not result or line != result[-1]):
            result.append(line)

    return "\n\n".join(result)


def parse_law(xml_content: bytes) -> dict:
    """Parse a law XML into structured data."""
    tree = etree.fromstring(xml_content)
    norms = tree.findall(".//norm")

    if not norms:
        return None

    # First norm contains law-level metadata
    first = norms[0]
    meta = first.find("metadaten")
    law_abbr = meta.findtext("jurabk", "").strip()
    law_name = meta.findtext("langue", "").strip()
    law_date = ""
    date_el = meta.find("ausfertigung-datum")
    if date_el is not None:
        law_date = date_el.text or ""

    stand = ""
    stand_el = meta.find(".//standkommentar")
    if stand_el is not None:
        stand = stand_el.text or ""

    sections = []
    current_chapter = ""

    for norm in norms[1:]:  # Skip first (law-level) norm
        nm = norm.find("metadaten")
        if nm is None:
            continue

        enbez = nm.findtext("enbez", "").strip()
        titel_el = nm.find("titel")
        titel = titel_el.text.strip() if titel_el is not None and titel_el.text else ""

        # Check for structural element (Teil, Abschnitt, Kapitel)
        gl = nm.find("gliederungseinheit")
        if gl is not None:
            gl_bez = gl.findtext("gliederungsbez", "")
            gl_titel = gl.findtext("gliederungstitel", "")
            if gl_bez and gl_titel:
                current_chapter = f"{gl_bez}: {gl_titel}"

        # Get text content
        text_node = norm.find(".//textdaten/text/Content")
        text = extract_text(text_node)

        # Get footnotes
        fn_node = norm.find(".//textdaten/fussnoten/Content")
        footnotes = extract_text(fn_node)

        if enbez or titel or text:
            sections.append({
                "enbez": enbez,
                "titel": titel,
                "chapter": current_chapter,
                "text": text,
                "footnotes": footnotes,
            })

    return {
        "abbreviation": law_abbr,
        "name": law_name,
        "date": law_date,
        "stand": stand,
        "sections": sections,
    }


def law_to_markdown(law: dict) -> str:
    """Convert parsed law data to clean Markdown."""
    lines = []
    lines.append(f"# {law['name']}")
    lines.append("")
    lines.append(f"**Abkürzung:** {law['abbreviation']}")
    if law['date']:
        lines.append(f"**Ausfertigungsdatum:** {law['date']}")
    if law['stand']:
        lines.append(f"**Stand:** {law['stand']}")
    lines.append("")
    lines.append("---")
    lines.append("")

    current_chapter = ""
    for section in law["sections"]:
        # Chapter heading
        if section["chapter"] and section["chapter"] != current_chapter:
            current_chapter = section["chapter"]
            lines.append(f"## {current_chapter}")
            lines.append("")

        # Section heading
        if section["enbez"]:
            heading = section["enbez"]
            if section["titel"]:
                heading += f" — {section['titel']}"
            lines.append(f"### {heading}")
        elif section["titel"]:
            lines.append(f"### {section['titel']}")

        lines.append("")

        # Body text
        if section["text"]:
            lines.append(section["text"])
            lines.append("")

        # Footnotes
        if section["footnotes"]:
            lines.append(f"> {section['footnotes']}")
            lines.append("")

    return "\n".join(lines)


def process_law(xml_url: str, output_dir: str = "laws") -> str:
    """Download, parse, and save a single law as Markdown."""
    xml_content = download_xml(xml_url)
    law = parse_law(xml_content)

    if not law or not law["sections"]:
        return None

    # Clean filename
    abbr = re.sub(r'[^\w\-]', '_', law["abbreviation"].lower())
    out_path = Path(output_dir) / f"{abbr}.md"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    md = law_to_markdown(law)
    out_path.write_text(md, encoding="utf-8")

    return str(out_path)


if __name__ == "__main__":
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.gesetze-im-internet.de/gg/xml.zip"
    print(f"Processing {url}...")
    path = process_law(url)
    if path:
        print(f"Saved to {path}")
    else:
        print("No content found.")
