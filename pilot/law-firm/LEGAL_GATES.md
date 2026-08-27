# GitLaw Pro · Kanzlei-Pilot — Legal / Privacy / Berufsrecht Gates

> **Operational checklist, kein Rechtsgutachten.** Die Software darf nur dokumentieren und technisch erzwingen, dass eine zuständige Person geprüft/freigegeben hat. Ob ein konkretes Kanzlei-Setup rechtlich zulässig ist, entscheidet die Kanzlei eigenverantwortlich nach Prüfung des Einzelfalls.

## V1-Sicherheitsgrenze

Der Standardpilot nutzt ausschließlich **synthetische oder von der Kanzlei als wirklich anonymisiert/de-identifiziert bestätigte historische Fälle**. Pseudonymisierung (z. B. „Mandant 123“) wird nicht automatisch als Anonymisierung behandelt.

Der technische Identifier-Scan ist nur ein zusätzliches Safety-Netz. Er kann eine fachliche/rechtliche Anonymisierungsprüfung **nicht beweisen**.

## Harte Freigaben vor STARTEN

Die Operations Console verlangt für jeden Kanzlei-Pilot:

- `anonymisation_confirmed_by_firm`
- `legal_setup_approved_by_lawyer`
- `professional_secrecy_review_confirmed`
- `provider_terms_reviewed`
- `client_consent_requirement_assessed`
- falls als erforderlich bewertet: `client_consent_confirmed`
- `lawyer_final_authority_confirmed`
- `retention_confirmed` (Standard: 7 Tage Rohdaten)
- keine produktiven Kanzleizugänge
- keine Execution-Tools

Fehlt eine berufsrechtliche/Privacy-Freigabe: **STOPP**. Die Assistenz darf sie nicht selbst ersetzen.

## Warum diese Gates existieren

### Anwaltliche Verschwiegenheit / Dienstleister

- **§ 43a Abs. 2 BRAO**: anwaltliche Verschwiegenheit.
- **§ 43e BRAO**: regelt den Zugang von Dienstleistern zu Tatsachen, die der Verschwiegenheit unterliegen. Die Vorschrift verlangt u. a. sorgfältige Auswahl und eine Vereinbarung in Textform mit Verschwiegenheits-/Zugriffsvorgaben; bei Dienstleistungen, die unmittelbar einem einzelnen Mandat dienen und Zugang zu fremden Geheimnissen eröffnen, enthält § 43e Abs. 5 eine Einwilligungsanforderung. Die Kanzlei muss beurteilen, ob und wie dies im konkreten Setup greift.
- **§ 203 StGB**: strafrechtlicher Schutz fremder Geheimnisse und Regeln für mitwirkende Personen.

Primärquellen:
- https://www.gesetze-im-internet.de/brao/__43a.html
- https://www.gesetze-im-internet.de/brao/__43e.html
- https://www.gesetze-im-internet.de/stgb/__203.html

### Datenschutz

Wenn trotz Pilotdesign personenbezogene oder pseudonymisierte Daten verarbeitet werden sollen, ist der Standardpfad beendet. Vor einer solchen Verarbeitung sind insbesondere Rollen, Rechtsgrundlage, Weisungen, Auftragsverarbeitung, Unterauftragsverarbeiter, Transfers/Residency, Retention und ggf. besondere Datenkategorien konkret zu prüfen.

**Art. 28 DSGVO** verlangt bei Auftragsverarbeitung u. a. geeignete Garantien und einen bindenden Vertrag/Rechtsakt mit den vorgeschriebenen Inhalten.

Primärquelle:
- https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04/deu

### KI-Einsatz in Kanzleien

Die BRAK weist in ihren Handlungshinweisen zum KI-Einsatz auf Halluzinations-, Verschwiegenheits- und Haftungsrisiken hin und betont die eigenverantwortliche anwaltliche Überprüfung/Endkontrolle von KI-Output. Das Pilotdesign setzt deshalb auf historischen Replay, deterministische Citation Verification und zwingendes Lawyer Review.

Quelle:
- https://www.brak.de/anwaltschaft/tipps-und-leitfaeden/
- https://www.brak.de/newsroom/newsletter/nachrichten-aus-berlin/2025/ausgabe-1-2025-v-812025/kuenstliche-intelligenz-in-anwaltskanzleien-brak-veroeffentlicht-leitfaden/

Die Kanzlei sollte außerdem dokumentieren, wie sie die jeweils anwendbaren Anforderungen der EU-KI-Verordnung einschließlich angemessener KI-Kompetenz/Schulung erfüllt. Die Software trifft keine automatische Einstufung des konkreten Einsatzes nach dem AI Act.

## Provider-Review (OpenAI API, Stand August 2026)

Für den aktuell vorgesehenen OpenAI-API-Pfad dokumentiert OpenAI:

- Business-/API-Ein- und Ausgaben werden standardmäßig nicht zum Training verwendet, sofern kein Opt-in erfolgt.
- API-Ein- und Ausgaben können bei den üblichen API-Konfigurationen für bis zu 30 Tage für Service-/Missbrauchszwecke aufbewahrt werden, soweit nicht eine andere berechtigte Konfiguration greift.
- Zero Data Retention ist für berechtigte API-Kunden/Endpunkte als gesonderte Option verfügbar.

Quellen:
- https://openai.com/business-data/
- https://openai.com/de-DE/enterprise-privacy/
- https://openai.com/de-DE/index/offering-zero-data-retention-for-frontier-models/

**Kommunikationsregel:** Nie pauschal „ZDR“, „EU-only“ oder „DSGVO-konform“ behaupten, solange die konkrete Account-/Endpoint-/Vertragskonfiguration nicht geprüft und dokumentiert wurde.

## Mandanteneinwilligung

Die Software entscheidet **nicht**, ob Einwilligung erforderlich ist. Sie erzwingt stattdessen:

1. `client_consent_requirement_assessed = true`
2. wenn die zuständige Person `client_consent_required = true` setzt, bleibt der Pilot blockiert, bis `client_consent_confirmed = true` dokumentiert ist.

## Output-/Haftungsgrenze

Im Standardpilot verboten:

- automatischer Versand an Mandant, Gegner, Gericht, Behörde
- Einreichung von Schriftsätzen/Klagen/Anträgen
- verbindliche Fristsetzung/-änderung
- Zahlung/Abrechnung
- Mandatsannahme/-ablehnung
- finale Interessenkollisionsentscheidung
- ungeprüfte externe Rechtsberatung

Der Anwalt/die Anwältin bleibt für jede fachliche Freigabe Endinstanz.

## Vor erstem externen Pilot zusätzlich einmal administrativ prüfen

- Kanzlei-/Dienstleistervereinbarung in passender Textform
- ggf. AVV/DPA und Subprocessor-Liste
- konkrete Provider-/Region-/Retention-Konfiguration
- Rollen- und Least-Privilege-Zugänge für Operations
- Service-Token rotiert und nur lokal/als Secret gespeichert
- Datenübertragungskanal vereinbart
- 7-Tage-Retention und Löschprozess verstanden
- kurzer AI-Literacy-/Bedienhinweis für Reviewer und Operations dokumentiert

Erst wenn die Kanzlei diese Punkte für ihr konkretes Setup freigibt, darf der Assistant `STARTEN` sehen.
