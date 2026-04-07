import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true,
})

export async function explainParagraph(lawTitle: string, section: string, text: string): Promise<string> {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    return '⚠️ OpenAI API Key nicht konfiguriert. Setze VITE_OPENAI_API_KEY in .env'
  }

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Du bist ein Rechtsexperte der Gesetze in einfacher Sprache erklärt.

Regeln:
- Erkläre für einen 16-Jährigen verständlich
- Maximal 3-4 Sätze
- Gib ein konkretes Alltagsbeispiel
- Erwähne die Konsequenzen (was passiert wenn man dagegen verstößt)
- Kein Juristendeutsch
- Sei freundlich und klar`
      },
      {
        role: 'user',
        content: `Erkläre diesen Paragraphen in einfacher Sprache:

Gesetz: ${lawTitle}
Paragraph: ${section}

Text:
${text.slice(0, 2000)}`
      }
    ],
    max_tokens: 300,
    temperature: 0.3,
  })

  return resp.choices[0]?.message?.content || 'Keine Erklärung verfügbar.'
}

export async function explainForPersona(lawTitle: string, section: string, text: string, persona: string): Promise<string> {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    return '⚠️ OpenAI API Key nicht konfiguriert.'
  }

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Du bist ein Berater der Gesetze für spezifische Lebenssituationen erklärt.

Regeln:
- Erkläre aus der Perspektive der genannten Person
- Was bedeutet dieses Gesetz KONKRET für diese Person?
- Gib ein praktisches Beispiel aus ihrem Alltag
- 3-4 Sätze maximal
- Freundlich, direkt, hilfreich`
      },
      {
        role: 'user',
        content: `Erkläre diesen Paragraphen für folgende Person:

Person: ${persona}

Gesetz: ${lawTitle}
Paragraph: ${section}
Text: ${text.slice(0, 2000)}`
      }
    ],
    max_tokens: 300,
    temperature: 0.4,
  })

  return resp.choices[0]?.message?.content || 'Keine Erklärung verfügbar.'
}

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
    proposedText: "Das Splitting-Verfahren nach Absatz 5 ist anzuwenden, wenn Ehegatten die Voraussetzungen des § 26 Absatz 1 erfüllen. Der maximale Splitting-Vorteil wird auf 14.000 Euro pro Veranlagungszeitraum begrenzt.\n\n§ 66a (neu) — Kinderbonus: Für jedes Kind wird ein Kinderbonus von 2.000 Euro pro Kalenderjahr gewährt, einkommensunabhängig, monatlich mit dem Kindergeld ausgezahlt. Bei Wahl des Realsplittings nach Absatz 6 erhöht sich der Kinderbonus auf 2.800 Euro.",
    explanation: "Splitting wird gedeckelt bei €14.000 — betrifft nur Top-Verdiener. Dafür: €2.000/Kind/Jahr für ALLE Familien, egal ob arm oder reich. Geld geht dahin wo Kinder sind, nicht wo Einkommensunterschiede sind.",
    impact: "Familie Yilmaz (er €50K, sie €35K, 2 Kinder): Splitting-Deckelung trifft sie nicht (Vorteil war nur ~€3.000). Kinderbonus bringt +€4.000. Netto +€4.400/Jahr.",
  },
  {
    reform: "Tierschutz-Novelle — Würde des Tieres",
    affectedLaw: "Grundgesetz",
    paragraph: "Art. 20a — Staatsziel Tierschutz",
    currentText: "Der Staat schützt auch in Verantwortung für die künftigen Generationen die natürlichen Lebensgrundlagen und die Tiere im Rahmen der verfassungsmäßigen Ordnung durch die Gesetzgebung und nach Maßgabe von Gesetz und Recht durch die vollziehende Gewalt und die Rechtsprechung.",
    proposedText: "Der Staat schützt auch in Verantwortung für die künftigen Generationen die natürlichen Lebensgrundlagen und achtet die Würde der Tiere im Rahmen der verfassungsmäßigen Ordnung durch die Gesetzgebung und nach Maßgabe von Gesetz und Recht durch die vollziehende Gewalt und die Rechtsprechung.",
    explanation: "Ein Wort ändert alles: 'schützt die Tiere' → 'achtet die WÜRDE der Tiere'. Wie in der Schweiz seit 2005. Aus Schutz wird Achtung — Tiere haben nicht nur ein Recht auf Leben, sondern auf ein würdiges Leben.",
    impact: "Bauer Müller (55, Schweinemast): Das Wort 'Würde' bedeutet: Massentierhaltung wie heute ist mit der Verfassung nicht mehr vereinbar. ABER: 10 Jahre Übergang + 80% Förderung für Umstieg.",
  },
  {
    reform: "Gesellschaftsdienstgesetz — Grundgesetzänderung",
    affectedLaw: "Grundgesetz",
    paragraph: "Art. 12a Abs. 1 — Wehr- und Dienstpflicht",
    currentText: "Männer können vom vollendeten achtzehnten Lebensjahr an zum Dienst in den Streitkräften, im Bundesgrenzschutz oder in einem Zivilschutzverband verpflichtet werden.",
    proposedText: "Männer und Frauen können vom vollendeten achtzehnten Lebensjahr an zur Teilnahme an einem Gesellschaftsdiensttag verpflichtet werden. Zum Dienst in den Streitkräften oder einem zivilen Gesellschaftsdienst können Männer und Frauen vom vollendeten achtzehnten Lebensjahr an durch Gesetz verpflichtet werden, wenn der Bundestag mit Zweidrittelmehrheit einen Bedarf feststellt.",
    explanation: "Drei Änderungen: 1) Nicht nur Männer — alle Geschlechter. 2) Nicht nur Militär — auch Pflege, THW, Bildung, Umwelt. 3) Pflicht nur wenn wirklich nötig (2/3-Mehrheit). Der eine Pflichttag ist Info, nicht Zwang.",
    impact: "Jonas (18, nach Abi): Geht zum Infotag (Pflicht, 1 Tag). Erfährt von 200.000 Plätzen, €1.400/Monat, Führerschein gratis. Entscheidet sich freiwillig für 6 Monate Pflege. Keine Wehrpflicht.",
  },
]
