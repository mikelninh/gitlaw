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
  answer: string
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
    answer:
      'Kurz gesagt: Dein Vermieter kann dich nicht einfach sofort wegen Eigenbedarf herauswerfen. Er braucht eine schriftliche Kündigung mit nachvollziehbarer Begründung, warum die Wohnung für ihn oder enge Angehörige gebraucht wird. Prüfe besonders, ob der Eigenbedarf konkret erklärt ist und ob du wegen besonderer Härte widersprechen kannst, zum Beispiel bei Krankheit, hohem Alter oder fehlendem Ersatzwohnraum. Wichtig sind auch die Kündigungsfristen, die sich nach der Wohndauer richten können. Nächster Schritt: Kündigung und Begründung sichern, Frist notieren und möglichst früh rechtlich prüfen lassen.',
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
    answer:
      'Kurz gesagt: Eine Kündigung ist nicht automatisch wirksam. In vielen Fällen ist entscheidend, ob das Kündigungsschutzgesetz greift und ob die Kündigung sozial gerechtfertigt ist. Sehr wichtig: Gegen eine Kündigung muss man oft innerhalb von 3 Wochen vorgehen, sonst wird sie schnell bestandskräftig. Prüfe außerdem, ob Formfehler vorliegen, etwa fehlende Schriftform oder unklare Begründung. Nächster Schritt: Kündigungsschreiben sichern, Datum festhalten und die 3-Wochen-Frist sofort prüfen.',
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
    answer:
      'Kurz gesagt: Nach dem Tierschutzgesetz ist verboten, Tieren ohne vernünftigen Grund Schmerzen, Leiden oder Schäden zuzufügen. Schwere Fälle können sogar strafbar sein, besonders wenn ein Wirbeltier misshandelt oder ohne Grund getötet wird. Wenn du Tierquälerei beobachtest, sichere möglichst konkrete Informationen wie Ort, Zeit, Fotos oder Zeugen. Melden kannst du das in dringenden Fällen bei der Polizei, sonst auch beim Veterinäramt oder Ordnungsamt. Nächster Schritt: Beobachtung dokumentieren und die Meldung mit möglichst konkreten Angaben absetzen.',
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
    answer:
      'Kurz gesagt: Wenn du gesetzlich krankenversichert bist, müssen medizinisch notwendige Arzneimittel oft nicht komplett selbst bezahlt werden. Häufig gibt es nur eine Zuzahlung, und bei geringem Einkommen oder hoher Belastung kann eine Befreiung oder Entlastung möglich sein. Wichtig ist auch, ob es ein Kassenrezept gibt und ob die Krankenkasse die Leistung grundsätzlich abdeckt. Wenn du die Kosten gerade nicht tragen kannst, solltest du schnell mit Arztpraxis oder Krankenkasse klären, ob es eine günstigere oder erstattungsfähige Alternative gibt. Nächster Schritt: Rezept, Preis und Kassenstatus prüfen und direkt bei der Krankenkasse nach Zuzahlung, Befreiung oder Kostenübernahme fragen.',
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
    answer:
      'Kurz gesagt: Dein Vermieter darf die Miete nicht einfach beliebig erhöhen. Entscheidend ist, ob die Erhöhung formell richtig begründet ist und ob die gesetzlichen Grenzen eingehalten werden, etwa Vergleichsmiete und Sperrfristen. Du musst eine Mieterhöhung nicht sofort akzeptieren, sondern kannst sie prüfen. Nächster Schritt: Schreiben sichern, Datum notieren und die Begründung mit Vergleichsmiete und Fristen abgleichen.',
    sources: [{ law: 'BGB', section: '§ 558' }],
  },
  {
    id: 'rent-reduction',
    title: 'Mietminderung',
    category: 'Miete & Wohnen',
    terms: ['mietminderung', 'miete kuerzen', 'miete kürzen', 'heizung kaputt', 'schimmel'],
    sourceLawIds: ['bgb'],
    preferredSections: ['§ 536'],
    answer:
      'Kurz gesagt: Wenn deine Wohnung einen erheblichen Mangel hat, kommt eine Mietminderung in Betracht. Wichtig ist aber, dass du den Mangel dokumentierst und dem Vermieter meldest, bevor du einfach weniger zahlst. Die Höhe hängt vom Einzelfall ab, deshalb ist Vorsicht wichtig. Nächster Schritt: Mangel mit Fotos sichern, schriftlich melden und erst dann die weitere Prüfung angehen.',
    sources: [{ law: 'BGB', section: '§ 536' }],
  },
  {
    id: 'citizen-income',
    title: 'Bürgergeld',
    category: 'Geld & Steuern',
    terms: ['bürgergeld', 'jobcenter', 'regelsatz', 'sanktion', 'grundsicherung'],
    sourceLawIds: ['sgb_2'],
    preferredSections: ['§ 19', '§ 31'],
    answer:
      'Kurz gesagt: Beim Bürgergeld kommt es darauf an, ob du leistungsberechtigt bist und welche Bedarfe anerkannt werden. Streit gibt es oft bei Kürzungen, Anrechnung von Einkommen oder Pflichten gegenüber dem Jobcenter. Wichtig ist, Bescheide und Fristen ernst zu nehmen, weil gegen Fehler oft nur rechtzeitig vorgegangen werden kann. Nächster Schritt: Bescheid sichern, Datum notieren und prüfen, ob Widerspruch oder Nachweise nötig sind.',
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
