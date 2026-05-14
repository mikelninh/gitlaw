# Triage demo samples

Synthetic German legal documents for the `/pro/triage` MVP demo. Filenames
are intentionally unhelpful (`IMG_4711`, `scan_001`, `document.txt`) — that's
the whole point. The classifier should produce sensible names and metadata.

| File | Expected doc_type | Expected sender |
| --- | --- | --- |
| `IMG_4711.txt` | Bescheid (Vollstreckungsbescheid) | Amtsgericht München |
| `scan_001.txt` | Mahnung | Inkasso Service Nord GmbH |
| `foto-vom-kunden.txt` | Email | Markus Hofer |
| `document.txt` | Vertrag (Stromlieferungsvertrag) | Stadtwerke München GmbH |
| `screenshot_2024-09-04.txt` | Screenshot (WhatsApp) | (Chat-Verlauf) |
| `Schreiben.txt` | Bescheid | Bundesagentur für Arbeit |
| `unbekannt.txt` | Rechnung | Praxis Dr. Kraus |

Two distinct cases live in this dump:
- **Hofer ./. Stadtwerke München** — files 1, 2, 3, 4, 5
- **Schwarz ./. BA / Praxis Kraus** — files 6, 7

For the MVP demo, classification + rename is the deliverable. Manual case
grouping happens in the lawyer's head; auto-grouping ships in v2.
