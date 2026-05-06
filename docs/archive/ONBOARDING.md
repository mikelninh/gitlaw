# White-Glove-Onboarding — Skript für 30-Min-Setup-Call

**Wer:** Mikel führt persönlich. Erste 20 zahlende Pro-Kund:innen.

**Warum:** Wer in den ersten 30 Minuten ein PDF auf ihrem eigenen Briefkopf in der Hand hat,
wird Power-User. Wer das nicht erlebt, churnt nach 14 Tagen.

**Format:** Video-Call (Zoom/Teams) mit Screen-Share. Mikel teilt Bildschirm und führt.
Anwält:in sitzt mit zweitem Bildschirm/Tab parallel mit.

---

## Vorbereitung (vor dem Call — 10 Min)

- [ ] **Logo der Kanzlei** googeln + lokal speichern (PNG, ≤ 200 KB)
- [ ] **Kanzlei-Anschrift + Kontakt** aus dem Impressum kopieren
- [ ] **3 Beispiel-Mandant:innen-Fälle** überlegen, die zu deren Praxis passen
  (z. B. Mietrechtler → 1× fristlose Kündigung, 1× Eigenbedarf, 1× Mietminderung)
- [ ] **Persönlichen Beta-Token** generieren (BETA-{INITIALEN}-{NUMMER})
- [ ] **In `viewer/src/pro/store.ts:VALID_INVITES`** eintragen + deployen
- [ ] **Calendly-/Notion-Notiz** mit dem Anwält:in-Profil offen halten

---

## Call-Skript (30 Min)

### Min 0-2 — Begrüßung + Erwartungs-Reset

> *„Wir machen heute zwei Dinge: (1) ich richte GitLaw Pro mit deinem Briefkopf ein,
> (2) wir generieren gemeinsam den ersten echten Brief für eine deiner Mandant:innen.
> Am Ende hast du etwas in der Hand, das du heute Nachmittag verschicken kannst.
> Klingt gut?"*

### Min 2-7 — Kanzlei-Profil einrichten

- [ ] Anwält:in öffnet `https://gitlaw-xi.vercel.app/#/pro?invite=BETA-XYZ`
- [ ] Auto-Login → Dashboard
- [ ] **Sidebar → Einstellungen**
- [ ] Mikel diktiert / Anwält:in tippt:
  - Kanzlei-Name
  - Anwält:in-Name (mit Titel: RAin Maria Müller)
  - Adresse (mehrere Zeilen)
  - Kontakt-Zeile (Tel · Email · Web)
  - Kammer-ID
- [ ] **Logo hochladen** (Mikel hat es vorab geschickt per Mail)
- [ ] Speichern → grüner Toast

### Min 7-10 — Erste Akte anlegen

- [ ] **Sidebar → Mandant:innen-Akten → + Neue Akte**
- [ ] Anwält:in nennt einen REALEN aktuellen Fall (anonymisierter Mandant)
- [ ] Felder ausfüllen:
  - Aktenzeichen (echtes oder pseudo)
  - Mandant:in-Name (echter Vorname, Nachname pseudonymisiert)
  - Beschreibung (1 Satz)
  - **Frist-Calc verwenden!** Bescheid-Datum + Frist-Typ → System rechnet
- [ ] Akte gespeichert → Detail-Seite

### Min 10-18 — Ersten echten Brief generieren

- [ ] **Button „Schreiben"** in Akten-Header
- [ ] Passende Vorlage auswählen (z. B. Widerspruch Bescheid, Mahnschreiben)
- [ ] Felder live ausfüllen (Mikel hilft mit Rechtsformulierungen)
- [ ] **Vorschau** rechts checken
- [ ] **„Per E-Mail senden"** ausprobieren (öffnet Mail-Client mit Text)
- [ ] **Speichern in Akte**
- [ ] **„Branded PDF"** klicken → PDF öffnet sich
- [ ] **Wow-Moment**: Sieht aus wie ihr eigener Briefkopf!

### Min 18-22 — Recherche-Demo

- [ ] **Sidebar → Recherche**
- [ ] Eine konkrete juristische Frage stellen, die für ihre Praxis relevant ist
  (z. B. „Welche Fristen für § 543 BGB?")
- [ ] Beispielfragen-Chips zeigen
- [ ] Antwort kommt mit verifizierten Zitaten
- [ ] **Auf Citation-Badge klicken** → Drawer öffnet mit Volltext
- [ ] **Persönliche Notiz** zum Paragraphen tippen
- [ ] Speichern + als geprüft markieren

### Min 22-26 — Daily Companion erklären

- [ ] **Sidebar → Übersicht**
- [ ] Heute-Block erklären: Fristen, Eingänge, heute erledigt
- [ ] Wochen-Stat („Diese Woche gespart") zeigen
- [ ] **Empfehlung verankern**:
  > *„Mein Tipp: morgen früh 5 Minuten hier öffnen, bevor du in dein
  > E-Mail-Programm gehst. Nur 5 Minuten. Wenn das nach 14 Tagen kein
  > Ritual ist — sag mir Bescheid, dann rufen wir nicht in 60 Tagen
  > die Geld-zurück-Garantie an, sondern jetzt."*

### Min 26-29 — Fragen + nächste Schritte

- [ ] **Fragen sammeln**
- [ ] Nächster Termin in 14 Tagen vereinbaren — kurzes Check-in
- [ ] Persönliche WhatsApp-/Signal-Nummer für direkten Bug-Report austauschen
- [ ] Versprechen: *„Jeden Bug, den du findest, fixe ich am selben Tag."*

### Min 29-30 — Abschluss

> *„Du hast jetzt: deinen Briefkopf eingerichtet, eine echte Akte angelegt, einen
> Brief generiert und exportiert, eine Recherche durchgeführt mit verifizierten
> Zitaten. Das war 25 Minuten. In 14 Tagen: schauen wir gemeinsam was du daraus
> gemacht hast. Wenn du nichts daraus machst — keine Rechnung. Keine Spielchen,
> versprochen."*

---

## Nach dem Call (Mikel — 10 Min)

- [ ] **Notiz im CRM** (Notion/Airtable): Beta-Tester-Profil + erster Eindruck
- [ ] **Personalisierte Follow-Up-Mail** (kurz!):
  - Danke für Zeit
  - Link zu ihrer Akte (für Kontext bei Rückfragen)
  - Zugang zu Bug-Report-Channel
- [ ] **14-Tage-Erinnerung** im eigenen Kalender setzen
- [ ] **Bug-Backlog** prüfen ob aus dem Call Wünsche kamen → priorisieren

---

## Skalierbarkeit

White-Glove geht bis ~20 Kund:innen / Monat. Danach:
- **Onboarding-Modal** in der App (Auto-Tour, gleiches Skript aber selbsterklärend)
- **Demo-Preset** auswählen lassen
- **30-Tage-Email-Sequenz** (Tag 1, 3, 7, 14, 21, 30) mit Tipps
- Nur Top-25%-Tier (€199+) bekommen weiterhin Live-Onboarding
