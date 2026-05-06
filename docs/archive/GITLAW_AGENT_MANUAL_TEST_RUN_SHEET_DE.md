# GitLaw Agent Manual Test Run Sheet

## Zweck

Dieses Blatt ist fuer manuelle Testlaeufe mit echten Menschen gedacht:

- Bao
- du selbst
- spaetere Pilotkanzleien

Es beantwortet nicht nur "funktioniert es?", sondern:

- war der Input klar
- war der Output nuetzlich
- fuehlte sich der Schritt natuerlich an
- wuerde man damit im Alltag weiterarbeiten

## Bewertung

Pro Schritt:

- `0` = unklar / kaputt / nicht brauchbar
- `1` = brauchbar, aber sichtbar holprig
- `2` = gut genug fuer Pilotalltag

Zusatz:

- `Zeit gespart?`
- `Wuerde ich weitermachen?`
- `Groesster Einwand?`

---

## Testlauf-Metadaten

- `Tester:`
- `Datum:`
- `Praxis / Rechtsgebiet:`
- `Persona:` Bao / intern / andere
- `Dauer insgesamt:`

---

## 1. Intake Agent

- `Input`
  - Formular in echter Mandant:innen-Sprache ausfuellen
- `Erwarteter Output`
  - strukturierter Eingang mit Name, Anliegen, Dringlichkeit, Fristsignal
- `Prueffragen`
  - Ist sofort klar, was aufgenommen wurde?
  - Wuerde daraus eine Anwaltshandlung folgen koennen?
- `Score 0-2:`
- `Zeit gespart / Nutzen:`
- `Notizen:`

## 2. Document Agent

- `Input`
  - Datei hochladen
- `Erwarteter Output`
  - interner Dateiname, Zuordnung zur Akte, Vault-Metadaten, Checksumme
- `Prueffragen`
  - Landet das Dokument sauber und vertrauenswuerdig in der Akte?
  - Wuerde ich spaeter wiederfinden, was ich brauche?
- `Score 0-2:`
- `Zeit gespart / Nutzen:`
- `Notizen:`

## 3. OCR Agent

- `Input`
  - Textdatei, Bild oder PDF mit Textlayer
- `Erwarteter Output`
  - lesbarer OCR-/Textauszug
- `Prueffragen`
  - Ist der Text hinreichend brauchbar fuer Recherche oder Entwurf?
  - Wo zerfaellt die Qualitaet?
- `Score 0-2:`
- `Zeit gespart / Nutzen:`
- `Notizen:`

## 4. Translation Agent

- `Input`
  - nicht-deutscher Text oder OCR-Auszug
- `Erwarteter Output`
  - DE-Arbeitsfassung
- `Prueffragen`
  - Ist die Fassung hilfreich genug fuer den anwaltlichen Alltag?
  - Wo waeren groessere Missverstaendnisse gefaehrlich?
- `Score 0-2:`
- `Zeit gespart / Nutzen:`
- `Notizen:`

## 5. Research Agent

- `Input`
  - 1 Hauptfrage + 1 Folgefrage
- `Erwarteter Output`
  - strukturierte Antwort mit Zitaten
- `Prueffragen`
  - Ist die Antwort wirklich nuetzlich oder nur plausibel klingend?
  - Wuerde ich darauf weiterarbeiten?
- `Score 0-2:`
- `Zeit gespart / Nutzen:`
- `Notizen:`

## 6. Drafting Agent

- `Input`
  - Vorlage + ggf. Dokumentkontext + ggf. Recherche
- `Erwarteter Output`
  - erster Entwurf / E-Mail / PDF-Basis
- `Prueffragen`
  - Fuehlt sich der Weg Dokument -> Recherche -> Schreiben natuerlich an?
  - Wie viel Nacharbeit bleibt?
- `Score 0-2:`
- `Zeit gespart / Nutzen:`
- `Notizen:`

## 7. Memory Agent

- `Input`
  - Recherche freigeben, dann aehnliche Folgefrage
- `Erwarteter Output`
  - vernuenftiger Reuse ohne Stoerung
- `Prueffragen`
  - Hilft das Kanzlei-Gedaechtnis merklich?
  - Oder ist es noch zu schwach/sporadisch?
- `Score 0-2:`
- `Zeit gespart / Nutzen:`
- `Notizen:`

## 8. Workflow Recommendation Agent

- `Input`
  - Akte mit Dokument-, OCR-, Uebersetzungs-, Recherche- oder Fristluecke
- `Erwarteter Output`
  - sinnvoller naechster Schritt mit direktem Link
- `Prueffragen`
  - Ist die Empfehlung offensichtlich richtig?
  - Wuerde ich diesen Schritt jetzt wirklich als Naechstes tun?
- `Score 0-2:`
- `Zeit gespart / Nutzen:`
- `Notizen:`

---

## Gesamturteil

- `Gesamtscore /16:`
- `Wuerde ich es in einem Pilot aktiv testen?`
- `Wuerde ich es Assistenz/Mitarbeiter:innen geben?`
- `Was spart sofort Zeit?`
- `Was fuehlt sich noch riskant oder langsam an?`
- `Welche 1-2 Dinge muessen als Naechstes gebaut werden?`
