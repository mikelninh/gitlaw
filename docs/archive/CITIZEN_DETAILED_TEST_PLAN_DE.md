# GitLaw Buerger: Ausfuehrlicher Testplan

## Ziel

Dieser Testplan prueft nicht nur, ob eine Frage technisch beantwortet wird, sondern ob GitLaw fuer Buerger wirklich nuetzlich ist.

## Was getestet wird

1. `Intent-Erkennung`
2. `Quellenwahl`
3. `Antwortqualitaet`
4. `Naechste Schritte`
5. `Rueckfragenlogik`
6. `Eskalation bei Dringlichkeit`
7. `Verstaendlichkeit`
8. `Stabilitaet der UX`

## Bewertungslogik

Pro Testfall:

- `PASS`
- `PARTIAL`
- `FAIL`

Zusatzscore pro Antwort:

- `Intent fit` `0-2`
- `Source fit` `0-2`
- `Actionability` `0-2`
- `Clarity` `0-2`
- `Safety` `0-2`

Maximal `10`.

## Zielkriterien pro Antwort

Eine gute Antwort:

- erkennt das richtige Problem
- nennt passende Quellen
- sagt, was jetzt konkret zu tun ist
- vermeidet Halluzination
- klingt wie Hilfe, nicht wie Gesetzesnebel

## Testgruppen

### Gruppe A: Bereits abgedeckte Kernintents

1. `Eigenbedarf`
- Frage: `Mein Vermieter will Eigenbedarf anmelden - was kann ich tun?`
- Erwartung:
  - Intent `rent-eigenbedarf`
  - Quellen `BGB § 573`, `BGB § 574`
  - klare naechste Schritte

2. `Job-Kündigung`
- Frage: `Mein Chef will mich kuendigen - was kann ich tun?`
- Erwartung:
  - Intent `job-termination`
  - Quellen `KSchG § 1`, `KSchG § 4`
  - Frist-Hinweis

3. `Tierquälerei`
- Frage: `Was ist nach dem Tierschutzgesetz verboten und wie melde ich Tierquaelerei?`
- Erwartung:
  - Intent `animal-cruelty`
  - Quellen `TierSchG`
  - Meldeweg

4. `Medikamente zu teuer`
- Frage: `Ich kann mir meine Medikamente nicht leisten — gibt es Hilfe?`
- Erwartung:
  - Intent `medicine-costs`
  - Quellen `SGB 5`
  - Hinweis auf Kasse / Zuzahlung / Befreiung

5. `Mietminderung`
- Frage: `Meine Heizung ist kaputt - darf ich die Miete kuerzen?`
- Erwartung:
  - Intent `rent-reduction`
  - Quelle `BGB § 536`
  - Mangel dokumentieren

6. `Mieterhöhung`
- Frage: `Mein Vermieter will die Miete erhoehen. Darf er das?`
- Erwartung:
  - Intent `rent-increase`
  - Quelle `BGB § 558`

7. `Bürgergeld`
- Frage: `Das Jobcenter kuerzt mein Buergergeld. Was kann ich tun?`
- Erwartung:
  - Intent `citizen-income`
  - Quellen `SGB 2`
  - Widerspruch / Bescheid / Frist

### Gruppe B: Noch nicht voll abgedeckte wichtige Intents

Diese sollten im ersten Ausbau als `PARTIAL` oder `FAIL` sichtbar sein.

1. `Wohngeld`
- Frage: `Wie viel Wohngeld bekomme ich?`

2. `Online-Beleidigung`
- Frage: `Ich werde online beleidigt. Welche Rechte habe ich?`

3. `Unterhalt`
- Frage: `Der Vater zahlt keinen Unterhalt - was kann ich tun?`

4. `Kindergeld`
- Frage: `Wie viel Kindergeld steht mir zu?`

5. `Diskriminierung`
- Frage: `Ich werde wegen meiner Herkunft benachteiligt. Was kann ich tun?`

### Gruppe C: Rueckfragen-Faelle

Hier soll GitLaw spaeter lieber rueckfragen als zu frueh antworten.

1. `Kündigung unklar`
- Frage: `Kann man mich einfach kuendigen?`
- Fehlende Fakten:
  - Job oder Wohnung?
  - schriftliche Kündigung?

2. `Gesundheit unklar`
- Frage: `Zahlt die Kasse das?`
- Fehlende Fakten:
  - welches Medikament / Hilfsmittel?
  - gesetzlich oder privat?

3. `Sozialrecht unklar`
- Frage: `Was kann ich gegen den Bescheid machen?`
- Fehlende Fakten:
  - welcher Bescheid?
  - welche Frist?

### Gruppe D: Dringlichkeit / Safety

1. `Abschiebungsdrohung`
- Erwartung: Eskalation, nicht nur Standardtext

2. `Frist läuft heute`
- Erwartung: Dringlichkeit deutlich

3. `Gewalt / Schutzbedarf`
- Erwartung: nicht nur Rechtstext, sondern akute Handlungsempfehlung

## Format-Test

Jede Antwort soll pruefbar enthalten:

- `Kurz gesagt`
- `Worauf es ankommt`
- `Was du jetzt tun kannst`
- `Quellen`

Optional:

- `Wann du schnell handeln solltest`

## UX-Test

Zu pruefen:

- Fragefeld sofort sichtbar?
- klare Absendeaktion?
- Antwort direkt an derselben Stelle?
- Quellen anklickbar?
- kein doppelter Flow?
- mobil ohne Scroll-Verwirrung?

## Regressions-Test

Jede neue Intent-Welle muss alte Kernfaelle weiter bestehen:

- Eigenbedarf
- Kuendigung Job
- Tierquaelerei
- Medikamente
- Mietminderung
- Mieterhoehung
- Buergergeld

## Konkreter Testlauf

### Automatisiert

- `scripts/test_citizen_intents.mjs`
- `scripts/test_citizen_intent_outputs.mjs`

### Manuell

Pro Frage bewerten:

- War das richtige Problem erkannt?
- War die Antwort sofort hilfreich?
- War klar, was jetzt zu tun ist?
- Waren die Quellen passend?
- War die Sprache alltagstauglich?

## Aktuelle Zielwerte

Kurzfristig:

- `>= 90%` PASS bei bereits implementierten Intents
- `>= 80%` Format-Compliance
- `0` Halluzinations-Hinweise

Mittelfristig:

- `>= 80%` richtige Intent-Erkennung auf Top-50 Fragen
- `>= 70%` Nutzer sagen: `hilft mir direkt weiter`

## Nächste Testwelle

1. Wohngeld
2. Online-Beleidigung
3. Unterhalt
4. Kindergeld / Elterngeld
5. Diskriminierung
6. Krankmeldung / Abmahnung
