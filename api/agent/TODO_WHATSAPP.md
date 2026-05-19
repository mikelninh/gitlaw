# TODO: WhatsApp-Bot für Mandant-Updates

Idee (parkiert — Email-Version ist v1):

Statt Sachstand-Email könnte das wöchentliche Update als WhatsApp-Nachricht
an die Mandant:in laufen. Bidirektional: Mandant:in kann zurück-schreiben.

## Warum WhatsApp für VI/TR/AR Mandanten matters
- VI/TR/AR-Communities lesen Email seltener, WhatsApp ist Daily-Driver.
- Sprach-Nachrichten ermöglichen Rückfragen ohne Tipp-Hürde
  (besonders wichtig bei niedriger Schrift-Alphabetisierung).
- Read-Receipts ersparen Refa das "Hat der Mandant gelesen?"-Nachfassen.

## Integration-Sketch
- WhatsApp Business Cloud API (Meta) → Vercel Webhook
- Inbound: Nachricht → klassifizieren (FAQ vs. komplexe Frage)
  - FAQ (Status-Anfrage, Termin, Dokumenten-Liste): auto-reply mit RAG
    über case_documents + case_status in mandant-Sprache
  - Komplex / juristisch: Queue für Anwält:in in /pro/whatsapp-inbox
- Outbound: Sachstand-Drafts (dieser Agent) → WA-Template-Message statt Email

## Was sich in DIESEM Agent ändert
- `draft_sachstand_email` → `draft_sachstand_message` (kürzer, WA-tauglich,
  max 1024 Zeichen, Links als Short-URLs ins Mandanten-Portal)
- `mandant_email`-Feld → `mandant_whatsapp` E.164
- Versand-Layer: nicht SMTP, sondern WA Cloud API Send
- DSGVO: AVV mit Meta nötig, US-Datentransfer prüfen
