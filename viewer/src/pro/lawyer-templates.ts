/**
 * 5 lawyer-grade letter templates for GitLaw Pro.
 *
 * Different from the citizen `templates.ts` (which generates Widerruf,
 * Kündigung Mietvertrag, etc.). These are templates an Anwält:in fills
 * out on behalf of a client.
 *
 * Format: each template has fields the lawyer fills in, then `render()`
 * builds the final letter body that goes into the branded PDF.
 *
 * IMPORTANT: These are starting points, NOT verified by a lawyer. Each
 * template carries a "bitte vor Verwendung gegenprüfen" note in the
 * generated PDF (handled in `pdf.ts`).
 */

export interface LawyerField {
  id: string
  label: string
  /** Hint shown below the input. */
  hint?: string
  type: 'text' | 'textarea' | 'date'
  required?: boolean
  placeholder?: string
}

export interface LawyerTemplate {
  id: string
  title: string
  /** Short description for the picker. */
  description: string
  /** Use-case context — when an Anwält:in would reach for this. */
  useCase: string
  fields: LawyerField[]
  /** Render the final letter body from filled fields. */
  render: (fields: Record<string, string>) => string
}

const SIGN_OFF = `Mit freundlichen kollegialen Grüßen`

export const LAWYER_TEMPLATES: LawyerTemplate[] = [
  // ---------------------------------------------------------------------
  {
    id: 'strafanzeige',
    title: 'Strafanzeige',
    description: 'Anzeige bei Polizei oder Staatsanwaltschaft.',
    useCase: 'Mandant:in ist Geschädigte:r einer Straftat (Bedrohung, Stalking, Beleidigung, Betrug).',
    fields: [
      { id: 'recipient', label: 'Empfänger:in (Polizei / StA)', type: 'text', required: true, placeholder: 'Polizeipräsidium Berlin – ZAC' },
      { id: 'mandant', label: 'Mandant:in (Geschädigte:r)', type: 'text', required: true },
      { id: 'beschuldigt', label: 'Beschuldigte:r (Name oder „unbekannt")', type: 'text', required: true },
      { id: 'tatort', label: 'Tatort / Plattform', type: 'text', placeholder: 'Instagram, Direktnachricht' },
      { id: 'tatzeit', label: 'Tatzeit (Datum oder Zeitraum)', type: 'text', required: true },
      { id: 'sachverhalt', label: 'Sachverhalt', type: 'textarea', required: true, hint: 'Chronologisch, nüchtern. 1–2 Absätze reichen.' },
      { id: 'paragraphen', label: 'Verdacht (rechtliche Würdigung)', type: 'textarea', placeholder: 'Verdacht der Bedrohung gem. § 241 StGB sowie Nachstellung gem. § 238 StGB.' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Screenshots, Hash-Liste, Zeugenliste' },
    ],
    render: f => `An ${f.recipient || '[Empfänger:in]'}

Strafanzeige
in der Strafsache gegen ${f.beschuldigt || '[Beschuldigte:r]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, Frau/Herr ${f.mandant || '[Mandant:in]'}, erstatte ich hiermit

S t r a f a n z e i g e

und stelle Strafantrag wegen aller in Betracht kommenden Delikte.

I. Sachverhalt

Tatort/Plattform: ${f.tatort || '—'}
Tatzeit: ${f.tatzeit || '[Datum]'}

${f.sachverhalt || '[Sachverhalt einfügen]'}

II. Rechtliche Würdigung

${f.paragraphen || 'Es besteht der Verdacht von Straftaten zu Lasten meiner Mandantschaft. Eine vertiefte rechtliche Würdigung bleibt der Ermittlungsbehörde vorbehalten.'}

III. Anlagen

${f.anlagen || '—'}

Ich bitte um Übersendung des Aktenzeichens sowie um Akteneinsicht nach § 406e StPO, sobald Erkenntnisse vorliegen.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'widerspruch_bescheid',
    title: 'Widerspruch gegen Bescheid',
    description: 'Allgemeiner Widerspruch gegen Verwaltungsbescheid (Sozialamt, Jobcenter, Bauamt, …).',
    useCase: 'Mandant:in hat einen ungünstigen Verwaltungsbescheid erhalten. Frist meist 1 Monat (§ 70 VwGO / § 84 SGG).',
    fields: [
      { id: 'recipient', label: 'Empfänger:in (Behörde)', type: 'text', required: true },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'mandantAdresse', label: 'Anschrift Mandant:in', type: 'textarea' },
      { id: 'aktenzeichen', label: 'Aktenzeichen der Behörde', type: 'text', required: true },
      { id: 'bescheidDatum', label: 'Datum des Bescheids', type: 'date', required: true },
      { id: 'begruendung', label: 'Widerspruchsbegründung', type: 'textarea', required: true },
    ],
    render: f => `An ${f.recipient || '[Behörde]'}

Widerspruch

in der Sache ${f.mandant || '[Mandant:in]'}
gegen den Bescheid vom ${f.bescheidDatum || '[Datum]'}, Az. ${f.aktenzeichen || '[Aktenzeichen]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, Frau/Herr ${f.mandant || '[Mandant:in]'}${f.mandantAdresse ? `, wohnhaft ${f.mandantAdresse.replace(/\n/g, ', ')}` : ''}, lege ich gegen den oben bezeichneten Bescheid

W i d e r s p r u c h

ein.

Begründung

${f.begruendung || '[Begründung einfügen]'}

Ich beantrage, den angefochtenen Bescheid aufzuheben.

Vorsorglich beantrage ich, die aufschiebende Wirkung anzuordnen, soweit gesetzlich erforderlich.

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert; sie wird auf Verlangen nachgereicht.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'mahnschreiben',
    title: 'Anwaltliches Mahnschreiben',
    description: 'Letzte außergerichtliche Aufforderung zur Zahlung mit Fristsetzung.',
    useCase: 'Mandant:in hat eine fällige Forderung, Schuldner:in zahlt trotz Mahnung nicht. Vor Mahnverfahren / Klage.',
    fields: [
      { id: 'schuldner', label: 'Schuldner:in', type: 'text', required: true },
      { id: 'mandant', label: 'Mandant:in (Gläubiger:in)', type: 'text', required: true },
      { id: 'betrag', label: 'Forderungsbetrag (€)', type: 'text', required: true, placeholder: '1.234,56' },
      { id: 'rechnung', label: 'Rechnung / Vertrag (Bezug)', type: 'text', placeholder: 'Rechnung Nr. 2025-042 vom 12.01.2025' },
      { id: 'faelligkeit', label: 'Ursprüngliche Fälligkeit', type: 'date' },
      { id: 'frist', label: 'Zahlungsfrist (z. B. „14 Tage")', type: 'text', required: true, placeholder: '14 Tage' },
      { id: 'verzugszinsen', label: 'Verzugszinsen-Hinweis aufnehmen?', type: 'text', placeholder: 'ja / nein' },
    ],
    render: f => `An ${f.schuldner || '[Schuldner:in]'}

Mahnschreiben
in der Sache ${f.mandant || '[Mandant:in]'} ./. ${f.schuldner || '[Schuldner:in]'}

Sehr geehrte Damen und Herren,

ich zeige an, dass mich Frau/Herr ${f.mandant || '[Mandant:in]'} mit der Wahrnehmung ihrer/seiner Interessen beauftragt hat. Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

Bezug: ${f.rechnung || '[Rechnung/Vertrag]'}
Ursprüngliche Fälligkeit: ${f.faelligkeit || '—'}
Offener Betrag: € ${f.betrag || '[Betrag]'}

Trotz Fälligkeit ist die o. g. Forderung bislang nicht ausgeglichen. Ich fordere Sie hiermit letztmalig auf, den ausstehenden Betrag

binnen ${f.frist || '14 Tagen'} ab Zugang dieses Schreibens

auf das nachstehende Konto meiner Mandantschaft zu zahlen.

${(f.verzugszinsen || '').toLowerCase().startsWith('ja') ? 'Auf den Anfall von Verzugszinsen gem. § 288 BGB sowie auf die Pflicht zur Übernahme der durch den Verzug entstandenen Rechtsverfolgungskosten weise ich vorsorglich hin.\n\n' : ''}Sollte die Zahlung nicht fristgerecht eingehen, werden ohne weitere Ankündigung gerichtliche Schritte eingeleitet — insbesondere Antrag auf Erlass eines Mahnbescheids gem. §§ 688 ff. ZPO, andernfalls Klageerhebung.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'mandatsanzeige',
    title: 'Mandatsanzeige (Bestellungsanzeige)',
    description: 'Anzeige der eigenen Mandatsübernahme gegenüber Behörde / Gegenseite.',
    useCase: 'Erste Kommunikation an Gegenseite — „ich vertrete jetzt diese Person, schreiben Sie an mich".',
    fields: [
      { id: 'recipient', label: 'Empfänger:in', type: 'text', required: true },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'aktenzeichen', label: 'Aktenzeichen Gegenseite (sofern bekannt)', type: 'text' },
      { id: 'sache', label: 'In der Sache (kurz)', type: 'text', required: true, placeholder: 'wegen Räumungsklage' },
    ],
    render: f => `An ${f.recipient || '[Empfänger:in]'}

Mandatsanzeige
in der Sache ${f.mandant || '[Mandant:in]'}${f.sache ? ` ${f.sache}` : ''}${f.aktenzeichen ? `\nIhr Az.: ${f.aktenzeichen}` : ''}

Sehr geehrte Damen und Herren,

namens und im Auftrag von Frau/Herr ${f.mandant || '[Mandant:in]'} zeige ich an, dass mich diese mit der Wahrnehmung ihrer/seiner rechtlichen Interessen beauftragt hat. Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert; sie wird auf Verlangen nachgereicht.

Ich bitte, jeglichen weiteren Schriftwechsel ausschließlich mit mir zu führen und mir Akteneinsicht zu gewähren, soweit dies verfahrensrechtlich vorgesehen ist.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'akteneinsicht',
    title: 'Antrag auf Akteneinsicht',
    description: 'Nach § 147 StPO (Strafverfahren) oder § 29 VwVfG (Verwaltung).',
    useCase: 'Mandant:in ist Beschuldigte:r oder Beteiligte:r — Aktenstand muss geprüft werden.',
    fields: [
      { id: 'recipient', label: 'Empfänger:in (Gericht / StA / Behörde)', type: 'text', required: true },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'aktenzeichen', label: 'Aktenzeichen der Behörde', type: 'text', required: true },
      { id: 'rolle', label: 'Rolle der Mandantschaft', type: 'text', required: true, placeholder: 'Beschuldigte:r / Geschädigte:r / Beteiligte:r' },
      { id: 'rechtsgrundlage', label: 'Rechtsgrundlage', type: 'text', placeholder: '§ 147 StPO / § 406e StPO / § 29 VwVfG' },
    ],
    render: f => `An ${f.recipient || '[Empfänger:in]'}

Antrag auf Akteneinsicht
in der Sache ${f.mandant || '[Mandant:in]'}, Az. ${f.aktenzeichen || '[Aktenzeichen]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag von Frau/Herr ${f.mandant || '[Mandant:in]'} (${f.rolle || '[Rolle]'}) beantrage ich

A k t e n e i n s i c h t

gem. ${f.rechtsgrundlage || '§ 147 StPO ggf. § 406e StPO bzw. § 29 VwVfG'}.

Ich bitte um Übersendung der vollständigen Akte in elektronischer Form an mich oder hilfsweise um Mitteilung eines Termins für Einsicht in den Räumlichkeiten der Behörde.

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },
]

export function getLawyerTemplate(id: string): LawyerTemplate | undefined {
  return LAWYER_TEMPLATES.find(t => t.id === id)
}
