/**
 * Explanation system — uses pre-generated JSON files (free, no API key needed).
 * Falls back to Groq free tier if available.
 *
 * How it works:
 * 1. Parser generates explanations offline → saves as JSON in public/explanations/
 * 2. Viewer loads the JSON → shows explanation instantly, no API call
 * 3. Cost to users: €0. Cost to us: €0 (Groq free tier for generation).
 */

export interface Explanations {
  law: string
  file: string
  explanations: Record<string, string>
}

// Cache loaded explanations
const cache: Record<string, Explanations> = {}
const PUBLIC_BASE = import.meta.env.BASE_URL || '/'

function publicPath(path: string) {
  return `${PUBLIC_BASE}${path}`.replace(/([^:]\/)\/+/g, '$1')
}

export async function loadExplanations(lawId: string): Promise<Explanations | null> {
  if (cache[lawId]) return cache[lawId]

  try {
    const resp = await fetch(publicPath(`explanations/${lawId}.json`))
    if (!resp.ok) return null
    const data = await resp.json()
    cache[lawId] = data
    return data
  } catch {
    return null
  }
}

export function getExplanation(explanations: Explanations | null, section: string): string | null {
  if (!explanations) return null
  return explanations.explanations[section] || null
}

// Reform diffs — these are static, no API needed
export interface ReformDiff {
  reform: string
  affectedLaw: string
  paragraph: string
  currentText: string
  proposedText: string
  explanation: string
  impact: string
}

export const reformDiffs: ReformDiff[] = [
  {
    reform: "Rentenreform — Beitragsjahre-Modell",
    affectedLaw: "SGB VI (Sozialgesetzbuch Sechstes Buch)",
    paragraph: "§ 36 — Altersrente für langjährig Versicherte",
    currentText: "Versicherte haben Anspruch auf Altersrente für langjährig Versicherte, wenn sie das 67. Lebensjahr vollendet und die Wartezeit von 35 Jahren erfüllt haben. Die vorzeitige Inanspruchnahme dieser Altersrente ist nach Vollendung des 63. Lebensjahres möglich.",
    proposedText: "Versicherte haben Anspruch auf Altersrente für langjährig Versicherte, wenn sie die Wartezeit von 35 Jahren erfüllt haben und das 63. Lebensjahr vollendet haben.\n\n(2) Nach 45 Beitragsjahren besteht Anspruch auf abschlagsfreie Altersrente, frühestens ab Vollendung des 63. Lebensjahres.\n\n(3) Nach 40 Beitragsjahren besteht Anspruch auf Altersrente mit reduziertem Abschlag von 0,2 Prozent pro Monat (statt 0,3 Prozent), frühestens ab Vollendung des 63. Lebensjahres.\n\n(4) Versicherte, die mindestens 20 Jahre in Berufen mit anerkannt hoher körperlicher Belastung beschäftigt waren, erhalten einen Zuschlag von 12 Monaten auf ihre Beitragsjahre.",
    explanation: "Statt eines starren Rentenalters (67) zählen die tatsächlichen Arbeitsjahre. Wer mit 18 anfängt, kann mit 63 aufhören — wer studiert hat, arbeitet länger. Fair statt willkürlich.",
    impact: "Stefan (44, Dachdecker): Fing mit 17 an → nach 45 Jahren mit 62 raus, abschlagsfrei + Schwerarbeiter-Bonus. Das ändert sein Leben.",
  },
  {
    reform: "Steuerreform — Splitting-Deckelung + Kinderbonus",
    affectedLaw: "EStG (Einkommensteuergesetz)",
    paragraph: "§ 32a Abs. 5 — Ehegattensplitting",
    currentText: "Das Splitting-Verfahren nach Absatz 5 ist anzuwenden, wenn Ehegatten die Voraussetzungen des § 26 Absatz 1 erfüllen. Dabei wird das gemeinsame zu versteuernde Einkommen halbiert, die Steuer auf die Hälfte berechnet und verdoppelt.",
    proposedText: "Das Splitting-Verfahren nach Absatz 5 ist anzuwenden, wenn Ehegatten die Voraussetzungen des § 26 Absatz 1 erfüllen. Der maximale Splitting-Vorteil wird auf 14.000 Euro pro Veranlagungszeitraum begrenzt.\n\n§ 66a (neu) — Kinderbonus: Für jedes Kind wird ein Kinderbonus von 2.000 Euro pro Kalenderjahr gewährt, einkommensunabhängig, monatlich mit dem Kindergeld ausgezahlt.",
    explanation: "Splitting wird gedeckelt bei €14.000 — betrifft nur Top-Verdiener. Dafür: €2.000/Kind/Jahr für ALLE Familien, egal ob arm oder reich.",
    impact: "Familie Yilmaz (er €50K, sie €35K, 2 Kinder): Splitting-Deckelung trifft sie nicht. Kinderbonus bringt +€4.000. Netto +€4.400/Jahr.",
  },
  {
    reform: "Tierschutz-Novelle — Würde des Tieres",
    affectedLaw: "Grundgesetz",
    paragraph: "Art. 20a — Staatsziel Tierschutz",
    currentText: "Der Staat schützt auch in Verantwortung für die künftigen Generationen die natürlichen Lebensgrundlagen und die Tiere im Rahmen der verfassungsmäßigen Ordnung.",
    proposedText: "Der Staat schützt auch in Verantwortung für die künftigen Generationen die natürlichen Lebensgrundlagen und achtet die Würde der Tiere im Rahmen der verfassungsmäßigen Ordnung.",
    explanation: "Ein Wort ändert alles: 'schützt die Tiere' → 'achtet die WÜRDE der Tiere'. Wie in der Schweiz seit 2005. Tiere haben nicht nur ein Recht auf Leben, sondern auf ein würdiges Leben.",
    impact: "Bauer Müller (55, Schweinemast): Massentierhaltung ist mit 'Würde' nicht vereinbar. ABER: 10 Jahre Übergang + 80% Förderung für Umstieg.",
  },
  {
    reform: "Gesellschaftsdienstgesetz",
    affectedLaw: "Grundgesetz",
    paragraph: "Art. 12a Abs. 1 — Wehr- und Dienstpflicht",
    currentText: "Männer können vom vollendeten achtzehnten Lebensjahr an zum Dienst in den Streitkräften, im Bundesgrenzschutz oder in einem Zivilschutzverband verpflichtet werden.",
    proposedText: "Männer und Frauen können vom vollendeten achtzehnten Lebensjahr an zur Teilnahme an einem Gesellschaftsdiensttag verpflichtet werden. Zum Dienst in den Streitkräften oder einem zivilen Gesellschaftsdienst können Männer und Frauen durch Gesetz verpflichtet werden, wenn der Bundestag mit Zweidrittelmehrheit einen Bedarf feststellt.",
    explanation: "Drei Änderungen: 1) Alle Geschlechter. 2) Nicht nur Militär — auch Pflege, THW, Bildung, Umwelt. 3) Pflicht nur wenn nötig (2/3-Mehrheit).",
    impact: "Jonas (18): Geht zum Infotag (Pflicht, 1 Tag). Entscheidet sich freiwillig für 6 Monate Pflege, €1.400/Monat, Führerschein gratis.",
  },
]
