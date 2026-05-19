/**
 * Lebenslagen reference data — curated, in-repo, no network lookup.
 *
 * This is intentionally small and hand-picked: the 12 most common Bürger
 * Lebenslagen, the 30-40 §§ that actually come up in 90% of citizen
 * questions, and 6 letter templates that match the highest-search-volume
 * scenarios.
 *
 * Why inline instead of FAISS/RAG: the Lebenslagen agent runs on Vercel
 * Functions. Loading a vector store on cold start would blow latency and
 * cost. The full 5,936-law corpus stays in the Python/MCP side; this
 * subset is the "fast path" the agent needs for narrow-but-deep advice.
 */

export type LebenslageId =
  | 'mietrecht'
  | 'arbeitsrecht'
  | 'familienrecht'
  | 'verbraucherrecht'
  | 'sozialrecht'
  | 'verkehrsrecht'
  | 'strafrecht'
  | 'asyl_aufenthalt'
  | 'erbrecht'
  | 'datenschutz'
  | 'gesundheit'
  | 'sonstiges'

export type ParagraphRef = {
  law: string // abbreviation, e.g. "BGB"
  section: string // e.g. "573", "574"
  title: string
  short: string // 1-2 sentence explainer in plain DE
  category: LebenslageId
}

export type LetterTemplate = {
  id: string
  title: string
  lebenslage: LebenslageId
  description: string
  body: string // contains [PLACEHOLDER] tokens
  default_frist_days?: number
}

// ── Lebenslagen catalogue ───────────────────────────────────────────────

export const LEBENSLAGEN: Array<{
  id: LebenslageId
  label_de: string
  examples_de: string
}> = [
  {
    id: 'mietrecht',
    label_de: 'Mietrecht',
    examples_de: 'Kündigung durch Vermieter, Mieterhöhung, Nebenkosten, Eigenbedarf',
  },
  {
    id: 'arbeitsrecht',
    label_de: 'Arbeitsrecht',
    examples_de: 'Kündigung, Abmahnung, Überstunden, Mobbing, Lohnabrechnung',
  },
  {
    id: 'familienrecht',
    label_de: 'Familienrecht',
    examples_de: 'Scheidung, Unterhalt, Sorgerecht, Umgangsrecht',
  },
  {
    id: 'verbraucherrecht',
    label_de: 'Verbraucherrecht',
    examples_de: 'Online-Kauf-Widerruf, Reklamation, Reisemängel, Garantie',
  },
  {
    id: 'sozialrecht',
    label_de: 'Sozialrecht',
    examples_de: 'Bürgergeld, Krankengeld, Rente, Erwerbsminderung, Bafög',
  },
  {
    id: 'verkehrsrecht',
    label_de: 'Verkehrsrecht',
    examples_de: 'Bußgeld, Fahrverbot, Punkte, Unfallregulierung',
  },
  {
    id: 'strafrecht',
    label_de: 'Strafrecht',
    examples_de: 'Strafanzeige, Ladungen, Aussageverweigerung, Strafbefehl',
  },
  {
    id: 'asyl_aufenthalt',
    label_de: 'Asyl- und Aufenthaltsrecht',
    examples_de: 'Asylantrag, Aufenthaltstitel, Familiennachzug, Einbürgerung',
  },
  {
    id: 'erbrecht',
    label_de: 'Erbrecht',
    examples_de: 'Pflichtteil, Testament, Erbschein, Ausschlagung',
  },
  {
    id: 'datenschutz',
    label_de: 'Datenschutz',
    examples_de: 'Auskunftsanspruch, Löschung, Schadenersatz § 82 DSGVO',
  },
  {
    id: 'gesundheit',
    label_de: 'Gesundheit',
    examples_de: 'Patientenrechte, Behandlungsfehler, Kassenleistungen',
  },
  {
    id: 'sonstiges',
    label_de: 'Sonstiges',
    examples_de: 'Wenn nichts anderes passt',
  },
]

// ── Curated paragraph lookup ────────────────────────────────────────────

// Hand-picked from the top-30 §§ in citizen search volume + lawyer pilot
// feedback. Texts are short summaries, NOT the full statute (which lives
// in the law-corpus markdown files). Goal: the agent has enough grounding
// to draft a correct letter without hallucinating.

export const PARAGRAPHS: Record<string, ParagraphRef> = {
  'BGB:573': {
    law: 'BGB',
    section: '573',
    title: 'Ordentliche Kündigung des Vermieters',
    short:
      'Vermieter kann nur bei berechtigtem Interesse kündigen — Eigenbedarf (Abs. 2 Nr. 2), erhebliche Vertragsverletzung des Mieters (Abs. 2 Nr. 1), oder wirtschaftliche Verwertung (Abs. 2 Nr. 3). Begründung muss im Kündigungsschreiben stehen.',
    category: 'mietrecht',
  },
  'BGB:573a': {
    law: 'BGB',
    section: '573a',
    title: 'Kündigung in Wohnungen mit zwei Wohnungen (Privileg)',
    short:
      'Wohnt der Vermieter selbst im Haus und gibt es nur zwei Wohnungen, kann er ohne Begründung kündigen — Kündigungsfrist verlängert sich aber um 3 Monate.',
    category: 'mietrecht',
  },
  'BGB:574': {
    law: 'BGB',
    section: '574',
    title: 'Widerspruch des Mieters wegen Härte (Sozialklausel)',
    short:
      'Mieter kann der Kündigung widersprechen, wenn die Beendigung eine Härte bedeutet (Alter, Krankheit, Verwurzelung, Schwangerschaft, Schulpflichtige Kinder, kein Ersatzwohnraum). Frist: 2 Monate vor Ablauf der Kündigungsfrist, schriftlich.',
    category: 'mietrecht',
  },
  'BGB:568': {
    law: 'BGB',
    section: '568',
    title: 'Form und Inhalt der Kündigung',
    short:
      'Kündigung des Mietverhältnisses bedarf der schriftlichen Form. Mündliche Kündigung ist unwirksam.',
    category: 'mietrecht',
  },
  'BGB:558': {
    law: 'BGB',
    section: '558',
    title: 'Mieterhöhung bis zur ortsüblichen Vergleichsmiete',
    short:
      'Mieter muss zustimmen, wenn Miete seit 15 Monaten unverändert ist und die Erhöhung ortsüblich ist. Kappungsgrenze: 20% in 3 Jahren (in vielen Städten 15%).',
    category: 'mietrecht',
  },
  'BGB:556': {
    law: 'BGB',
    section: '556',
    title: 'Betriebskostenabrechnung',
    short:
      'Vermieter muss spätestens 12 Monate nach Ende des Abrechnungszeitraums abrechnen. Mieter hat 12 Monate Zeit zum Widerspruch nach Erhalt der Abrechnung.',
    category: 'mietrecht',
  },
  'BGB:626': {
    law: 'BGB',
    section: '626',
    title: 'Fristlose Kündigung des Arbeitsverhältnisses',
    short:
      'Fristlose Kündigung nur bei wichtigem Grund — innerhalb 2 Wochen nach Kenntnis. Übliche Gründe: Diebstahl, schwere Beleidigung, Tätlichkeit, unentschuldigtes Fehlen.',
    category: 'arbeitsrecht',
  },
  'KSchG:1': {
    law: 'KSchG',
    section: '1',
    title: 'Sozial ungerechtfertigte Kündigung',
    short:
      'Kündigung in Betrieben mit mehr als 10 Mitarbeitern braucht sozialen Grund (personen-, verhaltens-, betriebsbedingt). Greift erst nach 6 Monaten Beschäftigung.',
    category: 'arbeitsrecht',
  },
  'KSchG:4': {
    law: 'KSchG',
    section: '4',
    title: 'Kündigungsschutzklage',
    short:
      'Klage auf Unwirksamkeit der Kündigung muss innerhalb 3 Wochen ab Zugang der Kündigung beim Arbeitsgericht erhoben werden — sonst gilt die Kündigung als rechtmäßig.',
    category: 'arbeitsrecht',
  },
  'BGB:312g': {
    law: 'BGB',
    section: '312g',
    title: 'Widerrufsrecht bei Fernabsatzverträgen',
    short:
      '14 Tage Widerrufsrecht bei Online-Käufen. Frist beginnt mit Erhalt der Ware. Keine Begründung nötig. Verkäufer muss innerhalb 14 Tagen erstatten.',
    category: 'verbraucherrecht',
  },
  'BGB:355': {
    law: 'BGB',
    section: '355',
    title: 'Form und Fristen des Widerrufs',
    short:
      'Widerruf in Textform (Email reicht). Frist 14 Tage ab Erhalt der Ware. Bei fehlender Belehrung verlängert sich Frist auf 12 Monate + 14 Tage.',
    category: 'verbraucherrecht',
  },
  'BGB:434': {
    law: 'BGB',
    section: '434',
    title: 'Sachmangel beim Kauf',
    short:
      'Käufer hat 2 Jahre Gewährleistung. In den ersten 12 Monaten Beweislastumkehr: Verkäufer muss beweisen, dass die Sache nicht mangelhaft war.',
    category: 'verbraucherrecht',
  },
  'BGB:1626': {
    law: 'BGB',
    section: '1626',
    title: 'Elterliche Sorge — Grundsatz',
    short:
      'Eltern haben das gemeinsame Sorgerecht, sofern verheiratet oder Sorgeerklärung abgegeben. Umfasst Personensorge + Vermögenssorge.',
    category: 'familienrecht',
  },
  'BGB:1571': {
    law: 'BGB',
    section: '1571',
    title: 'Unterhalt wegen Alters',
    short:
      'Geschiedener Ehegatte kann Unterhalt verlangen, wenn er wegen Alters keine Erwerbstätigkeit aufnehmen kann.',
    category: 'familienrecht',
  },
  'SGB_II:7': {
    law: 'SGB II',
    section: '7',
    title: 'Anspruchsberechtigte beim Bürgergeld',
    short:
      'Bürgergeld bekommen Erwerbsfähige (15-67), hilfebedürftig, gewöhnlicher Aufenthalt in Deutschland.',
    category: 'sozialrecht',
  },
  'SGG:84': {
    law: 'SGG',
    section: '84',
    title: 'Widerspruchsfrist bei Sozialbehörden',
    short:
      'Widerspruch gegen Bescheid einer Sozialbehörde (Jobcenter, Krankenkasse, Rentenversicherung) innerhalb 1 Monat ab Bekanntgabe. Schriftlich oder zur Niederschrift.',
    category: 'sozialrecht',
  },
  'StVG:25': {
    law: 'StVG',
    section: '25',
    title: 'Fahrverbot',
    short:
      'Fahrverbot 1-3 Monate bei groben oder beharrlichen Verstößen. Beginnt mit Rechtskraft des Bescheids oder freiwilliger Abgabe des Führerscheins.',
    category: 'verkehrsrecht',
  },
  'OWiG:67': {
    law: 'OWiG',
    section: '67',
    title: 'Einspruch gegen Bußgeldbescheid',
    short:
      'Einspruch innerhalb 2 Wochen nach Zustellung — schriftlich an die ausstellende Behörde. Kein Anwaltszwang.',
    category: 'verkehrsrecht',
  },
  'AufenthG:25': {
    law: 'AufenthG',
    section: '25',
    title: 'Aufenthalt aus humanitären Gründen',
    short:
      'Aufenthaltstitel bei Flüchtlingsschutz, subsidiärem Schutz, oder Abschiebungsverbot (§ 60 AufenthG).',
    category: 'asyl_aufenthalt',
  },
  'VwVfG:75': {
    law: 'VwVfG',
    section: '75',
    title: 'Untätigkeit der Behörde',
    short:
      'Wenn Behörde 3 Monate nicht entscheidet, kann Untätigkeitsklage erhoben werden (§ 75 VwGO). Wichtig im Asyl- und Migrationsrecht gegen LEA/BAMF.',
    category: 'asyl_aufenthalt',
  },
  'BGB:2303': {
    law: 'BGB',
    section: '2303',
    title: 'Pflichtteil',
    short:
      'Wer enterbt wurde, hat Anspruch auf Pflichtteil = halber gesetzlicher Erbteil. Gilt für Abkömmlinge, Eltern, Ehegatten.',
    category: 'erbrecht',
  },
  'DSGVO:15': {
    law: 'DSGVO',
    section: '15',
    title: 'Auskunftsanspruch',
    short:
      'Jeder hat Anspruch auf Auskunft, welche personenbezogenen Daten ein Unternehmen über ihn gespeichert hat. Antwort innerhalb 1 Monat, kostenlos.',
    category: 'datenschutz',
  },
  'DSGVO:17': {
    law: 'DSGVO',
    section: '17',
    title: 'Recht auf Löschung',
    short:
      'Personenbezogene Daten müssen gelöscht werden, wenn sie für den Zweck nicht mehr nötig sind oder die Verarbeitung unrechtmäßig war.',
    category: 'datenschutz',
  },
  'DSGVO:82': {
    law: 'DSGVO',
    section: '82',
    title: 'Schadenersatzanspruch',
    short:
      'Bei Verstoß gegen DSGVO hat Betroffene/r Anspruch auf materiellen + immateriellen Schadenersatz vom Verantwortlichen.',
    category: 'datenschutz',
  },
}

// ── Letter templates ────────────────────────────────────────────────────

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: 'widerspruch-eigenbedarfskuendigung',
    title: 'Widerspruch Eigenbedarfskündigung',
    lebenslage: 'mietrecht',
    description:
      'Widerspruch gegen eine Kündigung wegen Eigenbedarfs — mit Härteklausel-Argument (§ 574 BGB).',
    body: `Sehr geehrte Damen und Herren,

hiermit widerspreche ich der Kündigung des Mietverhältnisses zur Wohnung [ADRESSE] vom [KUENDIGUNGSDATUM] gemäß § 574 BGB.

Die Beendigung des Mietverhältnisses würde für mich eine Härte bedeuten, weil:
[HAERTE_GRUND]

Ich beantrage, das Mietverhältnis nach § 574a BGB auf unbestimmte Zeit fortzusetzen.

Mit freundlichen Grüßen
[ABSENDER]
[DATUM]`,
    default_frist_days: 60,
  },
  {
    id: 'widerspruch-mieterhoehung',
    title: 'Widerspruch Mieterhöhung',
    lebenslage: 'mietrecht',
    description: 'Verweigerung der Zustimmung zur Mieterhöhung (§ 558 BGB).',
    body: `Sehr geehrte Damen und Herren,

der Mieterhöhung vom [DATUM_ERHOEHUNG] auf monatlich [NEUER_BETRAG] € stimme ich nicht zu.

Begründung: [BEGRUENDUNG — z.B. fehlende Begründung, Kappungsgrenze, ortsübliche Vergleichsmiete nicht belegt]

Mit freundlichen Grüßen
[ABSENDER]
[DATUM]`,
  },
  {
    id: 'kuendigungsschutzklage',
    title: 'Kündigungsschutzklage (Vorlage)',
    lebenslage: 'arbeitsrecht',
    description:
      'Klage gegen eine Arbeitgeber-Kündigung — Frist 3 Wochen (§ 4 KSchG). Anwaltliche Beratung dringend empfohlen.',
    body: `An das Arbeitsgericht [ORT]

Kündigungsschutzklage

[KLAEGER_NAME], [KLAEGER_ADRESSE]
— Kläger —

gegen

[BEKLAGTE_FIRMA], [BEKLAGTE_ADRESSE]
— Beklagte —

wegen Kündigungsschutz

Hiermit erhebe ich Klage und beantrage:

1. Es wird festgestellt, dass das Arbeitsverhältnis zwischen den Parteien durch die Kündigung der Beklagten vom [KUENDIGUNGSDATUM] nicht beendet wurde.

[ABSENDER]
[DATUM]

Hinweis: Diese Klage muss spätestens 3 Wochen nach Zugang der Kündigung beim Arbeitsgericht eingegangen sein.`,
    default_frist_days: 21,
  },
  {
    id: 'widerruf-online-kauf',
    title: 'Widerruf Online-Kauf',
    lebenslage: 'verbraucherrecht',
    description: 'Widerrufserklärung für Fernabsatzverträge (§ 312g BGB).',
    body: `Sehr geehrte Damen und Herren,

hiermit widerrufe ich den von mir abgeschlossenen Vertrag über folgenden Artikel:

[ARTIKEL_BEZEICHNUNG]
Bestellt am: [BESTELLDATUM]
Bestellnummer: [BESTELLNUMMER]

Ich bitte um Rückerstattung des Kaufpreises auf das Konto, von dem die Zahlung erfolgte, innerhalb der gesetzlichen Frist von 14 Tagen.

Mit freundlichen Grüßen
[ABSENDER]
[DATUM]`,
    default_frist_days: 14,
  },
  {
    id: 'widerspruch-bescheid',
    title: 'Widerspruch gegen Bescheid (Sozial)',
    lebenslage: 'sozialrecht',
    description:
      'Widerspruch gegen Bescheid einer Sozialbehörde (§ 84 SGG) — Frist 1 Monat.',
    body: `Sehr geehrte Damen und Herren,

gegen Ihren Bescheid vom [BESCHEIDDATUM], Aktenzeichen [AKTENZEICHEN], lege ich hiermit Widerspruch ein.

Begründung: [BEGRUENDUNG]

Die ausführliche Begründung wird nachgereicht.

Mit freundlichen Grüßen
[ABSENDER]
[DATUM]`,
    default_frist_days: 30,
  },
  {
    id: 'einspruch-bussgeld',
    title: 'Einspruch Bußgeldbescheid',
    lebenslage: 'verkehrsrecht',
    description: 'Einspruch gegen Bußgeldbescheid (§ 67 OWiG) — Frist 2 Wochen.',
    body: `Sehr geehrte Damen und Herren,

gegen den Bußgeldbescheid vom [BESCHEIDDATUM], Aktenzeichen [AKTENZEICHEN], lege ich hiermit Einspruch ein.

Begründung: [BEGRUENDUNG]

Bitte teilen Sie mir mit, ob eine Akteneinsicht möglich ist.

Mit freundlichen Grüßen
[ABSENDER]
[DATUM]`,
    default_frist_days: 14,
  },
  {
    id: 'dsgvo-auskunft',
    title: 'DSGVO-Auskunftsanfrage',
    lebenslage: 'datenschutz',
    description: 'Auskunftsanspruch nach Art. 15 DSGVO.',
    body: `Sehr geehrte Damen und Herren,

gestützt auf Art. 15 DSGVO bitte ich um Auskunft über alle bei Ihnen über mich gespeicherten personenbezogenen Daten.

Bitte teilen Sie mir mit:
- Welche Daten Sie über mich verarbeiten
- Zu welchem Zweck
- Wie lange diese gespeichert werden
- An wen Sie diese ggf. weitergegeben haben

Ich bitte um Antwort innerhalb der gesetzlichen Frist von einem Monat.

Mit freundlichen Grüßen
[ABSENDER]
[DATUM]`,
    default_frist_days: 30,
  },
]
