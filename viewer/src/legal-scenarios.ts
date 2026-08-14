export interface LegalSource {
  label: string
  url: string
  why: string
}

export interface LegalScenario {
  id: string
  title: string
  category: string
  terms: string[]
  summary: string
  legalCore: string
  urgency?: string
  nextSteps: string[]
  avoid: string
  missingFacts: string[]
  documents: string[]
  sources: LegalSource[]
  deepLink?: string
}

export const legalScenarios: LegalScenario[] = [
  {
    id: 'job-termination',
    title: 'Kündigung im Arbeitsverhältnis',
    category: 'Arbeit',
    terms: ['arbeitgeber hat mir gekündigt', 'arbeitgeber hat mir gekuendigt', 'chef hat mich gekündigt', 'chef hat mich gekuendigt', 'kündigung im job', 'kuendigung im job', 'arbeitsplatz gekündigt', 'arbeitsplatz gekuendigt', 'schriftlich gekündigt', 'schriftlich gekuendigt', 'arbeitgeber', 'arbeitsplatz'],
    summary: 'Eine schriftliche Kündigung sollte sofort nach Zugang geprüft werden. Ob sie wirksam ist, lässt sich ohne Arbeitsvertrag, Betriebsgröße, Beschäftigungsdauer und Kündigungsgrund noch nicht beurteilen.',
    legalCore: 'Bei einer Kündigung können sehr kurze Reaktionsfristen entscheidend sein. GitLaw trennt deshalb zuerst Zugang, Form und mögliche Frist von der späteren inhaltlichen Prüfung.',
    urgency: 'Zeitkritisch: Zugangstag sichern und mögliche Klagefrist sofort prüfen.',
    nextSteps: [
      'Kündigungsschreiben sichern und den genauen Zugangstag notieren.',
      'Arbeitsvertrag, letzte Abrechnungen und vorherige Schreiben bereitlegen.',
      'Prüfen lassen, ob und bis wann eine Kündigungsschutzklage möglich ist.',
    ],
    avoid: 'Nichts unterschreiben und keine Frist verstreichen lassen, nur weil ein Gespräch mit dem Arbeitgeber angekündigt wurde.',
    missingFacts: [
      'Wann und wie ist die schriftliche Kündigung zugegangen?',
      'Seit wann besteht das Arbeitsverhältnis?',
      'Wie viele Menschen arbeiten ungefähr im Betrieb?',
      'Ist ein Kündigungsgrund genannt und gibt es besonderen Kündigungsschutz?',
    ],
    documents: ['Kündigungsschreiben', 'Arbeitsvertrag', 'Abmahnungen oder vorherige Schreiben', 'Letzte Gehaltsabrechnung'],
    sources: [
      { label: '§ 4 KSchG', url: 'https://www.gesetze-im-internet.de/kschg/__4.html', why: 'Frist zur Anrufung des Arbeitsgerichts' },
      { label: '§ 1 KSchG', url: 'https://www.gesetze-im-internet.de/kschg/__1.html', why: 'Ausgangspunkt für den allgemeinen Kündigungsschutz' },
    ],
  },
  {
    id: 'defective-purchase',
    title: 'Defekter Kauf oder verweigerte Reparatur',
    category: 'Verbraucherrecht',
    terms: ['defekter laptop', 'defekten laptop', 'laptop ist defekt', 'gerät ist defekt', 'geraet ist defekt', 'händler repariert nicht', 'haendler repariert nicht', 'gewährleistung', 'gewaehrleistung', 'ware kaputt', 'produkt kaputt', 'händler', 'haendler', 'reparieren'],
    summary: 'Bei einem mangelhaften Kauf kommen gesetzliche Gewährleistungsrechte in Betracht. Welche Forderung sinnvoll ist, hängt unter anderem von Kaufdatum, Mangel, Verkäufer und bisherigen Reparaturversuchen ab.',
    legalCore: 'GitLaw unterscheidet gesetzliche Gewährleistung von einer freiwilligen Garantie und prüft zuerst, ob Reparatur oder Ersatz verlangt werden kann.',
    nextSteps: [
      'Kaufbeleg und genaue Produktbeschreibung sichern.',
      'Mangel mit Fotos, Video oder Fehlermeldung dokumentieren.',
      'Den Verkäufer schriftlich zur Nacherfüllung auffordern und Kommunikation sichern.',
    ],
    avoid: 'Nicht nur an den Hersteller verweisen lassen, ohne zu prüfen, welche Ansprüche direkt gegen den Verkäufer bestehen.',
    missingFacts: [
      'Wann und bei wem wurde die Sache gekauft?',
      'Was genau funktioniert nicht und seit wann?',
      'Wurde bereits Reparatur oder Ersatz verlangt?',
      'Handelt es sich um Neuware, Gebrauchtware oder einen Privatkauf?',
    ],
    documents: ['Kaufbeleg', 'Produktbeschreibung', 'Fotos oder Fehlermeldungen', 'Schriftverkehr mit Verkäufer oder Hersteller'],
    sources: [
      { label: '§ 437 BGB', url: 'https://www.gesetze-im-internet.de/bgb/__437.html', why: 'Rechte bei Mängeln' },
      { label: '§ 439 BGB', url: 'https://www.gesetze-im-internet.de/bgb/__439.html', why: 'Nacherfüllung durch Reparatur oder Ersatz' },
    ],
  },
  {
    id: 'benefit-decision',
    title: 'Ablehnender Bescheid einer Sozialbehörde',
    category: 'Sozialrecht',
    terms: ['jobcenter hat abgelehnt', 'jobcenter lehnt ab', 'bürgergeld abgelehnt', 'buergergeld abgelehnt', 'bescheid vom jobcenter', 'widerspruch jobcenter', 'sozialleistung abgelehnt', 'grundsicherung abgelehnt', 'jobcenter', 'bürgergeld', 'buergergeld'],
    summary: 'Bei einem ablehnenden Bescheid zählen zuerst Zugangstag, Rechtsbehelfsbelehrung und die konkrete Berechnung. Erst danach lässt sich beurteilen, ob ein Widerspruch sinnvoll begründet werden kann.',
    legalCore: 'GitLaw behandelt einen Bescheid nicht als allgemeine Beschwerde, sondern als prüfbares Dokument mit Entscheidung, Begründung, Berechnung und möglicher Rechtsbehelfsfrist.',
    urgency: 'Frist prüfen: Die Rechtsbehelfsbelehrung und der Zugangstag können entscheidend sein.',
    nextSteps: [
      'Vollständigen Bescheid einschließlich Rechtsbehelfsbelehrung sichern.',
      'Zugangstag notieren und Berechnung mit den eingereichten Angaben vergleichen.',
      'Fehlende Nachweise oder offensichtliche Rechenfehler markieren.',
    ],
    avoid: 'Nicht nur telefonisch widersprechen und nicht davon ausgehen, dass Nachfragen eine laufende Frist automatisch stoppen.',
    missingFacts: [
      'Welche Behörde hat welchen Antrag abgelehnt?',
      'Wann ist der Bescheid zugegangen?',
      'Welche Begründung und Rechtsbehelfsbelehrung enthält er?',
      'Welche Angaben oder Nachweise wurden möglicherweise nicht berücksichtigt?',
    ],
    documents: ['Vollständiger Bescheid', 'Ursprünglicher Antrag', 'Eingereichte Nachweise', 'Berechnungsunterlagen und Schriftverkehr'],
    sources: [
      { label: '§ 84 SGG', url: 'https://www.gesetze-im-internet.de/sgg/__84.html', why: 'Widerspruchsfrist im sozialgerichtlichen Verfahren' },
      { label: '§ 35 SGB X', url: 'https://www.gesetze-im-internet.de/sgb_10/__35.html', why: 'Begründung eines Verwaltungsakts' },
    ],
  },
  {
    id: 'online-abuse',
    title: 'Beleidigung oder Bedrohung im Internet',
    category: 'Digitales Recht',
    terms: ['online beleidigt', 'im internet beleidigt', 'auf instagram beleidigt', 'auf tiktok beleidigt', 'online bedroht', 'im internet bedroht', 'hassnachricht', 'drohnachricht', 'instagram', 'tiktok', 'beleidigt', 'bedroht'],
    summary: 'Online-Beleidigungen oder Bedrohungen können rechtlich relevant sein. Der wichtigste erste Schritt ist meist, Beweise vollständig und nachvollziehbar zu sichern.',
    legalCore: 'GitLaw trennt akute Gefahr, Plattform-Meldung, strafrechtliche Prüfung und mögliche zivilrechtliche Schritte, statt alles als ein einziges Problem zu behandeln.',
    urgency: 'Bei konkreter oder akuter Gefahr sofort Polizei oder Notruf kontaktieren.',
    nextSteps: [
      'Screenshots mit Profil, URL, Datum und Kontext sichern.',
      'Nachrichten nicht löschen und mögliche Zeugen notieren.',
      'Plattform-Meldung, Strafanzeige oder Beratung je nach Inhalt und Gefahr prüfen.',
    ],
    avoid: 'Nicht nur einen zugeschnittenen Screenshot speichern; Kontext, Account und Zeitpunkt können später wichtig sein.',
    missingFacts: [
      'Was wurde genau geschrieben oder veröffentlicht?',
      'Ist die Person identifizierbar?',
      'Gibt es eine konkrete Drohung oder akute Gefahr?',
      'Sind URL, Account, Datum und Kontext gesichert?',
    ],
    documents: ['Screenshots mit Kontext', 'Links und Accountdaten', 'Nachrichtenverlauf', 'Namen möglicher Zeugen'],
    sources: [
      { label: '§ 185 StGB', url: 'https://www.gesetze-im-internet.de/stgb/__185.html', why: 'Beleidigung' },
      { label: '§ 241 StGB', url: 'https://www.gesetze-im-internet.de/stgb/__241.html', why: 'Bedrohung' },
    ],
  },
  {
    id: 'medicine-rejected',
    title: 'Krankenkasse lehnt Medikament oder Leistung ab',
    category: 'Gesundheit',
    terms: ['krankenkasse übernimmt nicht', 'krankenkasse uebernimmt nicht', 'medikament abgelehnt', 'behandlung abgelehnt', 'krankenkasse zahlt nicht', 'rezept zu teuer', 'krankenkasse', 'medikament'],
    summary: 'Eine Ablehnung sollte anhand des schriftlichen Bescheids, der ärztlichen Verordnung und der Begründung geprüft werden. Ohne diese Unterlagen wäre eine Aussage über die Kostenübernahme zu unsicher.',
    legalCore: 'GitLaw unterscheidet Leistungsanspruch, Zuzahlung, mögliche Befreiung und das Verfahren gegen eine ablehnende Entscheidung.',
    urgency: 'Bei medizinischer Dringlichkeit zuerst die behandelnde Praxis und Krankenkasse kontaktieren.',
    nextSteps: [
      'Schriftlichen Bescheid oder die konkrete Ablehnungsbegründung sichern.',
      'Verordnung, Diagnosebezug und ärztliche Begründung bereitlegen.',
      'Frist und Möglichkeiten für Widerspruch oder erneute Prüfung klären.',
    ],
    avoid: 'Die Behandlung nicht eigenmächtig verändern oder abbrechen; medizinische Entscheidungen gehören zur behandelnden Fachperson.',
    missingFacts: [
      'Was genau wurde beantragt oder verordnet?',
      'Liegt ein schriftlicher Bescheid mit Rechtsbehelfsbelehrung vor?',
      'Wie begründet die Krankenkasse die Ablehnung?',
      'Gibt es eine ärztliche Begründung zur Notwendigkeit?',
    ],
    documents: ['Bescheid der Krankenkasse', 'Verordnung oder Rezept', 'Ärztliche Begründung', 'Bisheriger Schriftverkehr'],
    sources: [
      { label: '§ 31 SGB V', url: 'https://www.gesetze-im-internet.de/sgb_5/__31.html', why: 'Arznei- und Verbandmittel' },
      { label: '§ 62 SGB V', url: 'https://www.gesetze-im-internet.de/sgb_5/__62.html', why: 'Belastungsgrenze bei Zuzahlungen' },
    ],
  },
  {
    id: 'parental-leave',
    title: 'Elternzeit planen oder durchsetzen',
    category: 'Familie',
    terms: ['elternzeit beantragen', 'elternzeit nehmen', 'arbeitgeber lehnt elternzeit', 'elternzeit abgelehnt', 'nach der geburt zuhause bleiben', 'nach der geburt zu hause bleiben', 'elternzeit', 'elterngeld'],
    summary: 'Bei Elternzeit sind Zeitraum, rechtzeitige Erklärung gegenüber dem Arbeitgeber und die gewünschte Verteilung entscheidend.',
    legalCore: 'GitLaw trennt den arbeitsrechtlichen Anspruch auf Elternzeit vom finanziellen Elterngeld und fragt deshalb zuerst, worum es konkret geht.',
    nextSteps: [
      'Gewünschten Beginn und Zeitraum der Elternzeit festlegen.',
      'Geburtsdatum beziehungsweise voraussichtlichen Termin und Arbeitsverhältnis klären.',
      'Mitteilung an den Arbeitgeber nachweisbar vorbereiten.',
    ],
    avoid: 'Elternzeit und Elterngeld nicht gleichsetzen; es gelten unterschiedliche Voraussetzungen und Verfahren.',
    missingFacts: [
      'Geht es um Elternzeit, Elterngeld oder beides?',
      'Wann wurde oder wird das Kind geboren?',
      'Für welchen Zeitraum soll die Elternzeit gelten?',
      'Wurde dem Arbeitgeber bereits etwas mitgeteilt?',
    ],
    documents: ['Arbeitsvertrag', 'Geburtsnachweis oder voraussichtlicher Termin', 'Bisherige Mitteilungen', 'Gewünschte Zeitplanung'],
    sources: [
      { label: '§ 15 BEEG', url: 'https://www.gesetze-im-internet.de/beeg/__15.html', why: 'Anspruch auf Elternzeit' },
      { label: '§ 16 BEEG', url: 'https://www.gesetze-im-internet.de/beeg/__16.html', why: 'Inanspruchnahme der Elternzeit' },
    ],
  },
  {
    id: 'rent-check',
    title: 'Miete möglicherweise zu hoch',
    category: 'Miete',
    terms: ['miete zu teuer', 'miete ist zu teuer', 'zu hohe miete', 'mietpreisbremse', 'euro für', 'euro fuer', 'nettokaltmiete', 'friedrichshain miete'],
    summary: 'Die Miethöhe ist prüfenswert, aber ein Betrag allein beweist noch keinen Verstoß. Entscheidend sind Nettokaltmiete, Wohnfläche, Mietbeginn, Lage, Mietspiegel und mögliche Ausnahmen.',
    legalCore: 'GitLaw berechnet erkennbare Werte, trennt Warm- von Nettokaltmiete und startet danach den vertieften Mietrechts-Check.',
    nextSteps: [
      'Klären, ob der genannte Betrag die Nettokalt- oder Warmmiete ist.',
      'Mietbeginn, Wohnfläche, Adresse beziehungsweise Mietspiegellage und Baujahr bereitlegen.',
      'Möblierung, Neubau, umfassende Modernisierung und Vormiete prüfen.',
    ],
    avoid: 'Warmmiete nicht direkt mit Mietspiegelwerten vergleichen und aus einem hohen Quadratmeterpreis allein keine rechtliche Schlussfolgerung ziehen.',
    missingFacts: [
      'Ist der Betrag Warmmiete oder Nettokaltmiete?',
      'Wann begann das Mietverhältnis?',
      'Wie groß ist die Wohnung und wo liegt sie genau?',
      'Ist sie möbliert, ein Neubau oder umfassend modernisiert?',
      'Ist die Vormiete bekannt?',
    ],
    documents: ['Mietvertrag', 'Aufschlüsselung der Miete', 'Angaben zu Wohnfläche und Baujahr', 'Informationen zur Vormiete'],
    sources: [
      { label: '§ 556d BGB', url: 'https://www.gesetze-im-internet.de/bgb/__556d.html', why: 'Zulässige Miethöhe bei Mietbeginn' },
      { label: '§ 556f BGB', url: 'https://www.gesetze-im-internet.de/bgb/__556f.html', why: 'Ausnahmen für Neubau und Modernisierung' },
    ],
    deepLink: '#/mietrecht',
  },
]

function normalize(text: string) {
  return text
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

export function detectLegalScenario(question: string): LegalScenario | null {
  const normalizedQuestion = normalize(question)
  const scored = legalScenarios
    .map(scenario => ({
      scenario,
      score: scenario.terms.reduce((total, term) => {
        const normalizedTerm = normalize(term)
        if (!normalizedQuestion.includes(normalizedTerm)) return total
        return total + (normalizedTerm.includes(' ') ? 100 : 20) + normalizedTerm.length
      }, 0),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.scenario ?? null
}

export function extractRecognizedFacts(question: string, scenario: LegalScenario) {
  const facts: string[] = []
  const normalizedQuestion = normalize(question)
  const amountMatch = question.match(/(\d[\d.\s]*(?:,\d{1,2})?)\s*(?:€|euro)/i)
  const areaMatch = question.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:m²|qm2?|m2)/i)

  if (scenario.id === 'rent-check' && amountMatch && areaMatch) {
    const amount = Number(amountMatch[1].replace(/[.\s]/g, '').replace(',', '.'))
    const area = Number(areaMatch[1].replace(',', '.'))
    if (Number.isFinite(amount) && Number.isFinite(area) && area > 0) {
      facts.push(`${amount.toLocaleString('de-DE')} € ÷ ${area.toLocaleString('de-DE')} m² = ${(amount / area).toLocaleString('de-DE', { maximumFractionDigits: 2 })} €/m²`)
    }
  }

  if (normalizedQuestion.includes('heute')) facts.push('Zeitangabe erkannt: heute')
  if (normalizedQuestion.includes('gestern')) facts.push('Zeitangabe erkannt: gestern')
  if (normalizedQuestion.includes('schriftlich')) facts.push('Schriftliches Dokument erwähnt')
  if (normalizedQuestion.includes('friedrichshain')) facts.push('Ort erkannt: Berlin-Friedrichshain')

  return facts
}
