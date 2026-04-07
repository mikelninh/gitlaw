"""Fetch the master index of all German federal laws from gesetze-im-internet.de"""

import requests
from lxml import etree
import json
import sys

TOC_URL = "https://www.gesetze-im-internet.de/gii-toc.xml"

def fetch_index():
    print(f"Fetching index from {TOC_URL}...")
    resp = requests.get(TOC_URL, timeout=30)
    resp.raise_for_status()

    tree = etree.fromstring(resp.content)
    items = []

    for item in tree.findall(".//item"):
        title = item.findtext("title", "").strip()
        link = item.findtext("link", "").strip()
        if title and link:
            # Extract law abbreviation from URL
            # https://www.gesetze-im-internet.de/stgb/xml.zip → stgb
            parts = link.rstrip("/").split("/")
            abbr = parts[-2] if parts[-1] == "xml.zip" else parts[-1].replace(".zip", "")
            items.append({"title": title, "abbreviation": abbr, "xml_url": link})

    print(f"Found {len(items)} laws.")

    with open("parser/law_index.json", "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"Saved to parser/law_index.json")
    return items

if __name__ == "__main__":
    items = fetch_index()

    # Print some stats
    print(f"\nExamples:")
    for i in items[:10]:
        print(f"  {i['abbreviation']:30s} → {i['title']}")
    print(f"  ... and {len(items) - 10} more")
