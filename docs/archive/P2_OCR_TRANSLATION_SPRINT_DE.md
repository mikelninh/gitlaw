# P2 Sprint Package – OCR & Translation

Stand: 2026-04-30

## Ziel
Dokumente aus Intake/Uploads in einen strukturierten Folgeprozess bringen:
- OCR anstossen,
- Fremdsprachen-Dokumente fuer DE-Arbeitsfassung markieren,
- spaeter an echte Pipeline anbinden.

## In diesem Paket umgesetzt
- `DocumentJob` Datenmodell pro Akte.
- Queue-Aktionen in der Dokument-Chronologie:
  - `OCR`
  - `Translate -> DE` fuer nicht-deutsche Dokumente
- Audit-Eintrag fuer Queue-Aktionen.
- API-Stub `/api/ocr` als spaeterer Server-Anker.

## Nächste Implementierungsschritte
1. Echter Datei-Upload statt nur Metadaten.
2. OCR-Provider in EU-geeigneter Umgebung anbinden.
3. Übersetzung mit Kennzeichnung `maschinell übersetzt`.
4. Review-UI: Original links, OCR/DE-Fassung rechts, Freigabe-Button.
