export interface CitizenIntentSource {
  law: string
  section: string
}

export interface CitizenIntent {
  id: string
  title: string
  category: string
  terms: string[]
  sourceLawIds: string[]
  preferredSections: string[]
  summary: string
  legalCore: string
  nextSteps: string[]
  urgentNote?: string
  sources: CitizenIntentSource[]
}

export const citizenIntents: CitizenIntent[] = [
  {
    id: 'rent-eigenbedarf',
    title: 'Eigenbedarfskündigung',
    category: 'Miete & Wohnen',
    terms: ['eigenbedarf', 'vermieter', 'wohnung', 'rausschmei', 'kuendigung', 'kündigung'],
    sourceLawIds: ['bgb'],
    preferredSections: ['§ 573', '§ 574'],
    summary: 'Nein, dein Vermieter kann dich nicht einfach sofort wegen Eigenbedarf herauswerfen.',
    legalCore: 'Eine Eigenbedarfskündigung muss schriftlich sein und nachvollziehbar erklären, wer die Wohnung braucht und warum. Außerdem gelten Kündigungsfristen. In manchen Fällen kannst du wegen besonderer Härte widersprechen, zum Beispiel bei Krankheit, hohem Alter oder fehlendem Ersatzwohnraum.',
    nextSteps: [
      'Kündigungsschreiben und Begründung sichern.',
      'Datum notieren und Kündigungsfrist prüfen.',
      'Prüfen, ob der Eigenbedarf konkret erklärt ist.',
      'Bei besonderer Härte früh Widerspruch prüfen lassen.',
    ],
    sources: [
      { law: 'BGB', section: '§ 573' },
      { law: 'BGB', section: '§ 574' },
    ],
  },
  {
    id: 'job-termination',
    title: 'Kündigung im Job',
    category: 'Arbeit & Job',
    terms: ['chef', 'arbeitgeber', 'kuendig', 'kündig', 'rausschmei', 'arbeitsplatz'],
    sourceLawIds: ['kschg'],
    preferredSections: ['§ 1', '§ 4'],
    summary: 'Nein, eine Kündigung ist nicht automatisch wirksam.',
    legalCore: 'Wichtig ist vor allem, ob das Kündigungsschutzgesetz greift und ob die Kündigung sozial gerechtfertigt ist. Sehr oft zählt außerdem die 3-Wochen-Frist, innerhalb der man gegen die Kündigung vorgehen muss. Auch Formfehler können wichtig sein.',
    nextSteps: [
      'Kündigungsschreiben sichern.',
      'Zugangstag genau notieren.',
      'Sofort prüfen, ob die 3-Wochen-Frist läuft.',
      'Arbeitsvertrag und bisherige Schreiben bereitlegen.',
    ],
    urgentNote: 'Wenn du schon ein schriftliches Kündigungsschreiben hast, ist die Frist oft das Wichtigste.',
    sources: [
      { law: 'KSchG', section: '§ 1' },
      { law: 'KSchG', section: '§ 4' },
    ],
  },
  {
    id: 'animal-cruelty',
    title: 'Tierquälerei melden',
    category: 'Tierschutz',
    terms: ['tierquaelerei', 'tierquälerei', 'tierschutz', 'tier', 'hund', 'katze'],
    sourceLawIds: ['tierschg'],
    preferredSections: ['§ 3', '§ 17', '§ 18'],
    summary: 'Tierquälerei kann verboten und in schweren Fällen sogar strafbar sein.',
    legalCore: 'Nach dem Tierschutzgesetz darf niemand Tieren ohne vernünftigen Grund Schmerzen, Leiden oder Schäden zufügen. Besonders schwere Fälle mit Wirbeltieren können strafrechtlich relevant sein.',
    nextSteps: [
      'Ort, Zeit und Beobachtung notieren.',
      'Wenn möglich Fotos oder Zeugen sichern.',
      'In dringenden Fällen die Polizei kontaktieren.',
      'Sonst beim Veterinäramt oder Ordnungsamt melden.',
    ],
    sources: [
      { law: 'TierSchG', section: '§ 3' },
      { law: 'TierSchG', section: '§ 17' },
      { law: 'TierSchG', section: '§ 18' },
    ],
  },
  {
    id: 'medicine-costs',
    title: 'Medikamente zu teuer',
    category: 'Gesundheit',
    terms: ['medikament', 'arznei', 'krankenkasse', 'zuzahlung', 'nicht leisten', 'zu teuer', 'bezahlen'],
    sourceLawIds: ['sgb_5'],
    preferredSections: ['§ 27', '§ 31', '§ 61', '§ 62'],
    summary: 'Wenn du gesetzlich versichert bist, musst du Medikamente oft nicht komplett selbst zahlen.',
    legalCore: 'Häufig gibt es nur eine Zuzahlung. Bei geringerem Einkommen oder hoher Belastung kann auch eine Befreiung oder Entlastung in Betracht kommen. Entscheidend ist außerdem, ob es ein Kassenrezept gibt und ob die Krankenkasse die Leistung grundsätzlich übernimmt.',
    nextSteps: [
      'Rezept, Preis und Kassenstatus prüfen.',
      'Arztpraxis nach günstiger oder erstattungsfähiger Alternative fragen.',
      'Krankenkasse nach Zuzahlung, Befreiung oder Kostenübernahme fragen.',
    ],
    sources: [
      { law: 'SGB 5', section: '§ 27' },
      { law: 'SGB 5', section: '§ 61' },
    ],
  },
  {
    id: 'rent-increase',
    title: 'Mieterhöhung',
    category: 'Miete & Wohnen',
    terms: ['mieterhoehung', 'mieterhöhung', 'miete erhöhen', 'miete erhoehen'],
    sourceLawIds: ['bgb'],
    preferredSections: ['§ 558'],
    summary: 'Nein, dein Vermieter darf die Miete nicht einfach beliebig erhöhen.',
    legalCore: 'Wichtig ist, ob die Erhöhung formell richtig begründet ist und ob gesetzliche Grenzen eingehalten werden, zum Beispiel Vergleichsmiete und Sperrfristen. Du musst eine Erhöhung nicht ungeprüft sofort akzeptieren.',
    nextSteps: [
      'Schreiben sichern.',
      'Datum notieren.',
      'Begründung und Vergleichsmiete prüfen.',
      'Fristen für Zustimmung oder Reaktion prüfen.',
    ],
    sources: [{ law: 'BGB', section: '§ 558' }],
  },
  {
    id: 'rent-reduction',
    title: 'Mietminderung',
    category: 'Miete & Wohnen',
    terms: ['mietminderung', 'miete kuerzen', 'miete kürzen', 'heizung kaputt', 'schimmel'],
    sourceLawIds: ['bgb'],
    preferredSections: ['§ 536'],
    summary: 'Bei einem erheblichen Wohnungsmangel kann eine Mietminderung in Betracht kommen.',
    legalCore: 'Wichtig ist, den Mangel zuerst zu dokumentieren und dem Vermieter zu melden. Einfach sofort weniger zu zahlen ist riskant. Wie hoch eine Mietminderung sein kann, hängt vom Einzelfall ab.',
    nextSteps: [
      'Mangel mit Fotos oder Videos sichern.',
      'Vermieter schriftlich informieren.',
      'Datum und Reaktion dokumentieren.',
      'Erst danach die Höhe einer möglichen Minderung prüfen.',
    ],
    sources: [{ law: 'BGB', section: '§ 536' }],
  },
  {
    id: 'citizen-income',
    title: 'Bürgergeld',
    category: 'Geld & Steuern',
    terms: ['bürgergeld', 'jobcenter', 'regelsatz', 'sanktion', 'grundsicherung'],
    sourceLawIds: ['sgb_2'],
    preferredSections: ['§ 19', '§ 31'],
    summary: 'Beim Bürgergeld kommt es stark auf Bescheid, Fristen und anerkannte Bedarfe an.',
    legalCore: 'Streit entsteht oft bei Kürzungen, Anrechnung von Einkommen oder Pflichten gegenüber dem Jobcenter. Wichtig ist, Bescheide nicht liegen zu lassen, weil Fehler oft nur rechtzeitig angegriffen werden können.',
    nextSteps: [
      'Bescheid sichern.',
      'Zugangstag notieren.',
      'Prüfen, ob Einkommen oder Bedarf falsch angerechnet wurde.',
      'Frist für Widerspruch oder Nachweise prüfen.',
    ],
    sources: [
      { law: 'SGB 2', section: '§ 19' },
      { law: 'SGB 2', section: '§ 31' },
    ],
  },
]

export function detectCitizenIntent(question: string): CitizenIntent | null {
  const q = question.toLowerCase()
  const scored = citizenIntents
    .map(intent => ({
      intent,
      score: intent.terms.reduce((acc, term) => {
        if (!q.includes(term)) return acc
        const phraseWeight = term.includes(' ') ? 100 : 10
        return acc + phraseWeight + term.length
      }, 0),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.intent || null
}

export function renderCitizenIntentAnswer(intent: CitizenIntent): string {
  const steps = intent.nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')
  const urgent = intent.urgentNote ? `\n\nWann du schnell handeln solltest:\n${intent.urgentNote}` : ''

  return [
    'Kurz gesagt:',
    intent.summary,
    '',
    'Worauf es ankommt:',
    intent.legalCore,
    '',
    'Was du jetzt tun kannst:',
    steps,
    urgent,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
