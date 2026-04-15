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

/**
 * Notariats-Vorlagen (für Werner Gniosdorz & ähnliche Erbrecht/Immobilien-Schwerpunkte).
 *
 * Hinweis: Diese sind ENTWURFSVORLAGEN, keine geprüften Formulare. Vollmachten
 * und Erbausschlagungen sind formal heikel — zur echten Beurkundung braucht
 * es weiterhin das Notariat. Diese Templates sparen nur die Entwurfsphase.
 */
export const NOTAR_TEMPLATES: LawyerTemplate[] = [
  {
    id: 'vollmacht_allgemein',
    title: 'Vorsorgevollmacht (Entwurf)',
    description: 'Allgemeine Vorsorgevollmacht für gesundheitliche/vermögensrechtliche Angelegenheiten.',
    useCase: 'Mandant:in möchte eine bevollmächtigte Person für den Fall von Geschäftsunfähigkeit bestimmen. ENTWURF — Beurkundung erforderlich bei Grundstücksbezug.',
    fields: [
      { id: 'vollmachtgeber', label: 'Vollmachtgeber:in (Name)', type: 'text', required: true },
      { id: 'geboren', label: 'Geburtsdatum Vollmachtgeber:in', type: 'date', required: true },
      { id: 'anschrift', label: 'Anschrift Vollmachtgeber:in', type: 'textarea', required: true },
      { id: 'bevollmaechtigter', label: 'Bevollmächtigte:r (Name)', type: 'text', required: true },
      { id: 'bevGeboren', label: 'Geburtsdatum Bevollmächtigte:r', type: 'date' },
      { id: 'bevAnschrift', label: 'Anschrift Bevollmächtigte:r', type: 'textarea' },
      { id: 'umfang', label: 'Umfang', type: 'textarea', placeholder: 'z. B. Vermögenssorge, Gesundheitssorge, Aufenthaltsbestimmung' },
    ],
    render: f => `Vorsorgevollmacht

Ich, ${f.vollmachtgeber || '[Name]'}, geboren am ${f.geboren || '[Datum]'}, wohnhaft${f.anschrift ? ` ${f.anschrift.replace(/\n/g, ', ')}` : ' [Anschrift]'},

erteile hiermit

Vollmacht

an ${f.bevollmaechtigter || '[Bevollmächtigte:r]'}${f.bevGeboren ? `, geboren am ${f.bevGeboren}` : ''}${f.bevAnschrift ? `, wohnhaft ${f.bevAnschrift.replace(/\n/g, ', ')}` : ''},

mich in allen Angelegenheiten zu vertreten, und zwar insbesondere in folgenden Bereichen:

${f.umfang || '— Gesundheitssorge (Einwilligung in ärztliche Maßnahmen inklusive freiheitsentziehender Maßnahmen nach § 1906 BGB)\n— Vermögenssorge (Bankgeschäfte, Verwaltung von Vermögen, Abschluss und Auflösung von Verträgen)\n— Aufenthaltsbestimmung (Wohnen, Heimunterbringung)\n— Behördengänge und Korrespondenz'}

Die Vollmacht soll auch über den Tod hinaus gelten. Die bevollmächtigte Person ist von den Beschränkungen des § 181 BGB befreit.

Diese Vollmacht ist mit sofortiger Wirkung anzuwenden, ungeachtet meiner Geschäftsfähigkeit.

____________________________
Ort, Datum

____________________________
Unterschrift Vollmachtgeber:in

Hinweis: Für Grundstücks- und Handelsregister-Sachen ist notarielle Beurkundung (§ 29 GBO, § 12 HGB) erforderlich.
`,
  },

  {
    id: 'erbausschlagung',
    title: 'Erbausschlagungserklärung (Entwurf)',
    description: 'Gegenüber dem Nachlassgericht. 6-Wochen-Frist ab Kenntnis vom Erbfall beachten!',
    useCase: 'Mandant:in möchte die Erbschaft ausschlagen (z. B. wegen Überschuldung). Frist § 1944 BGB streng!',
    fields: [
      { id: 'nachlassgericht', label: 'Nachlassgericht', type: 'text', required: true, placeholder: 'Amtsgericht Berlin-Schöneberg, Nachlassabteilung' },
      { id: 'erklaerender', label: 'Erklärende:r (Name)', type: 'text', required: true },
      { id: 'erklaerAnschrift', label: 'Anschrift Erklärende:r', type: 'textarea' },
      { id: 'erblasser', label: 'Erblasser:in (Name)', type: 'text', required: true },
      { id: 'erbGeboren', label: 'Geburtsdatum Erblasser:in', type: 'date' },
      { id: 'sterbeDatum', label: 'Sterbedatum', type: 'date', required: true },
      { id: 'sterbeOrt', label: 'Sterbeort', type: 'text' },
      { id: 'kenntnisDatum', label: 'Kenntnis vom Erbfall (Fristbeginn)', type: 'date', required: true },
      { id: 'verwandtschaft', label: 'Verwandtschaftsverhältnis', type: 'text', required: true, placeholder: 'z. B. „als Tochter (§ 1924 BGB)"' },
      { id: 'grund', label: 'Kurzbegründung (optional)', type: 'textarea', placeholder: 'z. B. Überschuldung' },
    ],
    render: f => `An ${f.nachlassgericht || '[Nachlassgericht]'}

Erbausschlagungserklärung
in der Nachlasssache ${f.erblasser || '[Erblasser:in]'}${f.erbGeboren ? `, geboren am ${f.erbGeboren}` : ''}, verstorben am ${f.sterbeDatum || '[Sterbedatum]'}${f.sterbeOrt ? ` in ${f.sterbeOrt}` : ''}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.erklaerender || '[Erklärende:r]'}${f.erklaerAnschrift ? `, wohnhaft ${f.erklaerAnschrift.replace(/\n/g, ', ')}` : ''} — ${f.verwandtschaft || '[Verwandtschaftsverhältnis]'} —

erkläre ich hiermit gegenüber dem Nachlassgericht die

A u s s c h l a g u n g

der Erbschaft nach der/dem o.g. Erblasser:in gem. § 1942 BGB. Die Ausschlagung erfolgt vorsorglich auch für meine Mandantschaft als Erbe:Erbin jeglicher Berufungsgründe.

Von dem Anfall der Erbschaft hat meine Mandantschaft erstmals am ${f.kenntnisDatum || '[Datum]'} Kenntnis erlangt; die Sechs-Wochen-Frist des § 1944 Abs. 1 BGB ist gewahrt.

${f.grund ? `Begründung:\n${f.grund}\n\n` : ''}Eine anwaltliche Vollmacht wird anwaltlich versichert und auf Verlangen vorgelegt.

Ich bitte um schriftliche Bestätigung der Entgegennahme.

Mit freundlichen kollegialen Grüßen

Hinweis: Die Ausschlagung bedarf für Minderjährige ggf. familiengerichtlicher Genehmigung (§ 1643 Abs. 2 BGB). Prüfung im Einzelfall!
`,
  },

  {
    id: 'pflichtteil_geltendmachung',
    title: 'Pflichtteilsgeltendmachung',
    description: 'Außergerichtliche Geltendmachung des Pflichtteilsanspruchs gegenüber dem Erben.',
    useCase: 'Mandant:in ist pflichtteilsberechtigt (§ 2303 BGB), aber nicht Erbe. Erster Schritt: Auskunft + Zahlung vom Erben fordern.',
    fields: [
      { id: 'erbe', label: 'Erbe:Erbin (Empfänger:in)', type: 'text', required: true },
      { id: 'erbeAnschrift', label: 'Anschrift Erbe:Erbin', type: 'textarea' },
      { id: 'mandant', label: 'Mandant:in (Pflichtteilsberechtigt)', type: 'text', required: true },
      { id: 'erblasser', label: 'Erblasser:in', type: 'text', required: true },
      { id: 'sterbeDatum', label: 'Sterbedatum', type: 'date', required: true },
      { id: 'verhaeltnis', label: 'Verwandtschaftsverhältnis zur Erblasser:in', type: 'text', required: true, placeholder: 'z. B. „Sohn"' },
      { id: 'frist', label: 'Frist für Auskunft (Tage)', type: 'text', placeholder: '4 Wochen' },
    ],
    render: f => `An ${f.erbe || '[Erbe:Erbin]'}${f.erbeAnschrift ? `\n${f.erbeAnschrift}` : ''}

Pflichtteilsgeltendmachung
in der Nachlasssache ${f.erblasser || '[Erblasser:in]'}, verstorben am ${f.sterbeDatum || '[Datum]'}

Sehr geehrte:r,

ich zeige an, dass mich ${f.mandant || '[Mandant:in]'} — ${f.verhaeltnis || '[Verhältnis]'} der verstorbenen Person — mit der Wahrnehmung ihrer:seiner erbrechtlichen Interessen beauftragt hat.

Meine Mandantschaft ist gesetzlich pflichtteilsberechtigt (§ 2303 BGB). Ich mache hiermit ihre:seine Ansprüche aus §§ 2303 ff. BGB Ihnen gegenüber geltend und bitte um:

1. Auskunft über den Bestand des Nachlasses (§ 2314 Abs. 1 S. 1 BGB) durch Vorlage eines vollständigen und geordneten Bestandsverzeichnisses,
2. Auskunft über unentgeltliche Zuwendungen der Erblasser:in in den letzten 10 Jahren vor dem Erbfall (§ 2325 BGB),
3. sofern streitig: Vorlage durch notarielle Urkunde auf Kosten des Nachlasses (§ 2314 Abs. 1 S. 3 BGB).

Die Auskunft bitte ich mir binnen ${f.frist || '4 Wochen'} ab Zugang dieses Schreibens zu erteilen.

Nach Erteilung der Auskunft werde ich den Pflichtteilszahlungsanspruch beziffern und gesondert geltend machen. Bereits jetzt weise ich vorsorglich auf die Verjährungshemmung durch Verhandlungen (§ 203 BGB) hin.

Eine anwaltliche Vollmacht wird anwaltlich versichert.

Mit freundlichen Grüßen
`,
  },
// ---------------------------------
  {
    id: 'erbschein_antrag',
    title: 'Antrag auf Erbschein',
    description: 'Antrag auf Erteilung eines Erbscheins gem. §§ 2353 ff. BGB beim Nachlassgericht.',
    useCase: 'Mandantschaft benötigt Legitimationsnachweis für Banken, Grundbuch oder Versicherungen. Gesetzliche oder testamentarische Erbfolge.',
    fields: [
      { id: 'nachlassgericht', label: 'Nachlassgericht', type: 'text', required: true, placeholder: 'Amtsgericht Berlin-Schöneberg, Nachlassabteilung' },
      { id: 'antragsteller', label: 'Antragsteller:in (Name)', type: 'text', required: true },
      { id: 'antragstellerAnschrift', label: 'Anschrift Antragsteller:in', type: 'textarea' },
      { id: 'erblasser', label: 'Erblasser:in (Name)', type: 'text', required: true },
      { id: 'sterbeDatum', label: 'Sterbedatum', type: 'date', required: true },
      { id: 'letzterWohnsitz', label: 'Letzter gewöhnlicher Aufenthalt', type: 'text', required: true, placeholder: 'Berlin-Charlottenburg' },
      { id: 'erbfolgeArt', label: 'Erbfolge', type: 'text', required: true, placeholder: 'gesetzlich / testamentarisch (Testament v. ...)' },
      { id: 'erbquote', label: 'Beantragte Erbquote', type: 'text', required: true, hint: 'z. B. „1/2 als überlebende Ehegattin (§ 1931 i. V. m. § 1371 BGB)"' },
    ],
    render: f => `An ${f.nachlassgericht || '[Nachlassgericht]'}

Antrag auf Erteilung eines Erbscheins
in der Nachlasssache ${f.erblasser || '[Erblasser:in]'}, verstorben am ${f.sterbeDatum || '[Sterbedatum]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.antragsteller || '[Antragsteller:in]'}${f.antragstellerAnschrift ? `, wohnhaft ${f.antragstellerAnschrift.replace(/\n/g, ', ')}` : ''}, beantrage ich

die Erteilung eines Erbscheins

gem. §§ 2353 ff. BGB des Inhalts, dass meine Mandantschaft die/den o. g. Erblasser:in zu ${f.erbquote || '[Quote]'} beerbt hat.

I. Angaben zum Erblasser

Letzter gewöhnlicher Aufenthalt: ${f.letzterWohnsitz || '[Wohnsitz]'}
Sterbedatum: ${f.sterbeDatum || '[Datum]'}

Die Zuständigkeit des angerufenen Nachlassgerichts ergibt sich aus § 343 Abs. 1 FamFG.

II. Erbfolge

Die Erbfolge beruht auf ${f.erbfolgeArt || '[gesetzlicher/testamentarischer Grundlage]'}. Eine andere Verfügung von Todes wegen, die der beantragten Erbfolge entgegensteht, ist meiner Mandantschaft nicht bekannt.

III. Eidesstattliche Versicherung

Meine Mandantschaft ist bereit, die nach § 352 Abs. 3 FamFG, § 2356 Abs. 2 BGB erforderliche eidesstattliche Versicherung vor dem Nachlassgericht oder einem Notar abzugeben. Ich rege an, einen entsprechenden Termin anzuberaumen bzw. die Verweisung an ein Notariat nach Wahl der Mandantschaft zuzulassen.

IV. Anlagen

— Sterbeurkunde (beglaubigte Abschrift)
— Personenstandsurkunden zum Nachweis der Verwandtschaftsverhältnisse
— ggf. Eröffnungsprotokoll und letztwillige Verfügung

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'patientenverfuegung',
    title: 'Patientenverfügung (Entwurf)',
    description: 'Schriftliche Patientenverfügung gem. § 1827 BGB für medizinische Behandlungssituationen.',
    useCase: 'Mandantschaft möchte für den Fall der Einwilligungsunfähigkeit verbindliche Behandlungswünsche festlegen. Schriftform genügt; notarielle Beurkundung empfohlen, aber nicht zwingend.',
    fields: [
      { id: 'verfasser', label: 'Verfasser:in (Name)', type: 'text', required: true },
      { id: 'geboren', label: 'Geburtsdatum', type: 'date', required: true },
      { id: 'anschrift', label: 'Anschrift', type: 'textarea', required: true },
      { id: 'situationen', label: 'Anwendungs-Situationen', type: 'textarea', required: true, hint: 'z. B. unmittelbarer Sterbeprozess, Endstadium unheilbarer Erkrankung, schwerer Hirnschaden' },
      { id: 'massnahmen', label: 'Gewünschte / abgelehnte Maßnahmen', type: 'textarea', required: true, hint: 'künstliche Ernährung, Beatmung, Wiederbelebung, Antibiotika' },
      { id: 'schmerz', label: 'Schmerz- und Symptombehandlung', type: 'textarea', placeholder: 'Schmerzlinderung auch bei lebensverkürzender Nebenwirkung erwünscht' },
      { id: 'bevollmaechtigter', label: 'Bevollmächtigte:r / Vertrauensperson', type: 'text' },
    ],
    render: f => `Patientenverfügung
gem. § 1827 BGB

Ich, ${f.verfasser || '[Name]'}, geboren am ${f.geboren || '[Geburtsdatum]'}, wohnhaft${f.anschrift ? ` ${f.anschrift.replace(/\n/g, ', ')}` : ' [Anschrift]'},

bestimme hiermit für den Fall, dass ich meinen Willen nicht mehr wirksam erklären kann, im Voraus folgende Festlegungen zu meiner ärztlichen Behandlung:

I. Anwendungsbereich

Diese Verfügung gilt in folgenden Situationen:

${f.situationen || '[Situationen]'}

II. Behandlungswünsche

${f.massnahmen || '[Maßnahmen]'}

III. Schmerz- und Symptombehandlung

${f.schmerz || 'Ich wünsche eine fachgerechte Schmerz- und Symptomlinderung; eine möglicherweise lebensverkürzende Nebenwirkung gebräuchlicher Schmerz- und Symptommittel nehme ich in Kauf.'}

IV. Verbindlichkeit

Diese Verfügung gibt meinen ausdrücklichen Willen wieder. Die Festlegungen sind gem. § 1827 Abs. 1 S. 2 BGB unmittelbar bindend, sofern sie auf die konkrete Lebens- und Behandlungssituation zutreffen. Ich erwarte von den behandelnden Ärzt:innen und ggf. dem Betreuungsgericht, dass mein Wille beachtet wird.

V. Vertrauensperson

${f.bevollmaechtigter ? `Als Vertrauensperson, die meinem Willen Geltung verschaffen soll, benenne ich: ${f.bevollmaechtigter}. Eine gesonderte Vorsorgevollmacht wird/wurde erteilt.` : 'Eine gesonderte Vorsorgevollmacht wird empfohlen.'}

Mir ist bewusst, dass ich diese Verfügung jederzeit formlos widerrufen kann (§ 1827 Abs. 1 S. 1 BGB).

____________________________
Ort, Datum

____________________________
Unterschrift

Hinweis: Die Schriftform genügt (§ 1827 Abs. 1 BGB). Eine notarielle Beurkundung ist nicht erforderlich, aber zur Beweissicherung sinnvoll. Regelmäßige Aktualisierung (alle 1–2 Jahre) wird empfohlen.
`,
  },

  // ---------------------------------
  {
    id: 'testamentseroeffnung_antrag',
    title: 'Antrag auf Testamentseröffnung',
    description: 'Anregung der Eröffnung einer letztwilligen Verfügung gem. §§ 348 ff. FamFG.',
    useCase: 'Eine letztwillige Verfügung ist im Besitz der Mandantschaft oder bei Dritten und muss dem Nachlassgericht zur Eröffnung vorgelegt werden.',
    fields: [
      { id: 'nachlassgericht', label: 'Nachlassgericht', type: 'text', required: true, placeholder: 'Amtsgericht Berlin-Schöneberg, Nachlassabteilung' },
      { id: 'einreicher', label: 'Einreicher:in (Mandantschaft)', type: 'text', required: true },
      { id: 'verhaeltnis', label: 'Verhältnis zur Erblasserin / zum Erblasser', type: 'text', placeholder: 'Tochter / Testamentsvollstrecker / Verwahrer' },
      { id: 'erblasser', label: 'Erblasser:in', type: 'text', required: true },
      { id: 'sterbeDatum', label: 'Sterbedatum', type: 'date', required: true },
      { id: 'letzterWohnsitz', label: 'Letzter gewöhnlicher Aufenthalt', type: 'text', required: true },
      { id: 'urkundenArt', label: 'Art der Verfügung', type: 'text', required: true, placeholder: 'eigenhändiges Testament v. ... / Erbvertrag URNr. ...' },
      { id: 'verwahrung', label: 'Bisherige Verwahrung', type: 'textarea', placeholder: 'in den persönlichen Unterlagen der Erblasserin aufgefunden' },
    ],
    render: f => `An ${f.nachlassgericht || '[Nachlassgericht]'}

Vorlage einer letztwilligen Verfügung — Anregung der Eröffnung
in der Nachlasssache ${f.erblasser || '[Erblasser:in]'}, verstorben am ${f.sterbeDatum || '[Sterbedatum]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.einreicher || '[Einreicher:in]'}${f.verhaeltnis ? ` (${f.verhaeltnis})` : ''}, überreiche ich anliegend in Erfüllung der Ablieferungspflicht gem. § 2259 Abs. 1 BGB die nachfolgend bezeichnete Urkunde mit der Bitte um Eröffnung gem. §§ 348 ff. FamFG.

I. Angaben zum Erblasser

Letzter gewöhnlicher Aufenthalt: ${f.letzterWohnsitz || '[Wohnsitz]'}
Sterbedatum: ${f.sterbeDatum || '[Datum]'}

Die Zuständigkeit ergibt sich aus § 343 Abs. 1 FamFG.

II. Vorgelegte Urkunde

${f.urkundenArt || '[Art der Verfügung]'}

Bisherige Verwahrung: ${f.verwahrung || '—'}

III. Anträge

Ich rege an,
1. die vorgelegte Verfügung zu eröffnen (§§ 348, 349 FamFG),
2. den gesetzlichen und ggf. testamentarisch berufenen Beteiligten beglaubigte Abschriften des Eröffnungsprotokolls und der Verfügung gem. § 348 Abs. 3 FamFG zu übersenden,
3. mir als Bevollmächtigter eine Mehrfertigung zu meinen Akten zukommen zu lassen.

Anlagen:
— Sterbeurkunde (beglaubigte Abschrift)
— Letztwillige Verfügung im Original
— Vollmacht wird anwaltlich versichert

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'beurkundungs_vorbereitung',
    title: 'Anschreiben Beurkundungstermin',
    description: 'Vorbereitendes Anschreiben mit Ankündigung des Beurkundungs-Gegenstands und der Beteiligten.',
    useCase: 'Zur Vorbereitung eines Beurkundungstermins (§§ 6 ff. BeurkG) — Bestätigung des Termins, Übersendung des Entwurfs und Belehrung über die 14-Tage-Frist bei Verbraucherbeteiligung (§ 17 Abs. 2a BeurkG).',
    fields: [
      { id: 'empfaenger', label: 'Empfänger:in (Beteiligte:r)', type: 'text', required: true },
      { id: 'empfAnschrift', label: 'Anschrift Empfänger:in', type: 'textarea' },
      { id: 'gegenstand', label: 'Beurkundungs-Gegenstand', type: 'text', required: true, placeholder: 'Grundstückskaufvertrag / Übergabevertrag / Eheversprechen' },
      { id: 'weitereBeteiligte', label: 'Weitere Beteiligte', type: 'textarea', placeholder: 'Name, Rolle (Verkäufer:in / Käufer:in / Gläubiger:in)' },
      { id: 'terminDatum', label: 'Vorgeschlagener Termin (Datum)', type: 'date', required: true },
      { id: 'terminUhrzeit', label: 'Uhrzeit', type: 'text', placeholder: '10:30 Uhr' },
      { id: 'unterlagen', label: 'Mitzubringende Unterlagen', type: 'textarea', placeholder: 'Personalausweis, Steuer-ID, Grundbuchauszug' },
    ],
    render: f => `An ${f.empfaenger || '[Empfänger:in]'}${f.empfAnschrift ? `\n${f.empfAnschrift}` : ''}

Vorbereitung Beurkundungstermin
${f.gegenstand ? `Gegenstand: ${f.gegenstand}` : ''}

Sehr geehrte:r ${f.empfaenger || '[Empfänger:in]'},

ich darf den vorgesehenen Beurkundungstermin in der oben bezeichneten Sache wie folgt bestätigen:

Termin: ${f.terminDatum || '[Datum]'}${f.terminUhrzeit ? `, ${f.terminUhrzeit}` : ''}
Ort: in den Geschäftsräumen des Notariats

Beteiligte:
${f.weitereBeteiligte || '— wie gesondert mitgeteilt —'}

I. Übersendung des Entwurfs

Anliegend übersende ich Ihnen den vollständigen Entwurf der zu beurkundenden Urkunde zur Vorprüfung. Ich bitte, den Entwurf in Ruhe durchzusehen und Rückfragen vorab — gern fernmündlich oder per E-Mail — an mich zu richten.

II. Hinweis auf die Regelfrist (§ 17 Abs. 2a BeurkG)

Sofern auf Seiten eines Beteiligten Verbrauchereigenschaft vorliegt, soll der Entwurf in der Regel zwei Wochen vor der Beurkundung zur Verfügung stehen. Diese Frist dient dem Schutz der ausreichenden Vorbereitung; auf eine Verkürzung kann nur in begründeten Einzelfällen verzichtet werden.

III. Mitzubringende Unterlagen

${f.unterlagen || '— Personalausweis oder Reisepass\n— Steuer-Identifikationsnummer\n— ggf. weitere Urkunden nach gesonderter Anforderung'}

IV. Belehrung

Auf die notarielle Belehrungs- und Hinweispflicht (§ 17 Abs. 1 BeurkG) wird im Termin selbst eingegangen. Die Beurkundung erfolgt durch Verlesung, Genehmigung und Unterzeichnung gem. § 13 BeurkG.

Bei Verhinderung bitte ich um umgehende Mitteilung, damit ein Ersatztermin abgestimmt werden kann.

Mit freundlichen Grüßen
`,
  },

  // ---------------------------------
  {
    id: 'grundschuld_bestellung',
    title: 'Grundschuldbestellung (Entwurf)',
    description: 'Entwurf einer Grundschuldbestellungsurkunde mit Unterwerfungsklausel zur notariellen Beurkundung.',
    useCase: 'Mandantschaft (Eigentümer:in) bestellt zugunsten einer Bank eine Grundschuld zur Besicherung eines Darlehens. Beurkundung gem. § 873 BGB i. V. m. § 29 GBO erforderlich.',
    fields: [
      { id: 'eigentuemer', label: 'Eigentümer:in / Besteller:in', type: 'text', required: true },
      { id: 'eigentuemerAnschrift', label: 'Anschrift Eigentümer:in', type: 'textarea' },
      { id: 'glaeubiger', label: 'Gläubigerin (Bank)', type: 'text', required: true, placeholder: 'Berliner Sparkasse, NL der LBB AöR' },
      { id: 'grundbuch', label: 'Grundbuch (Amtsgericht, Bezirk, Blatt)', type: 'text', required: true, placeholder: 'AG Charlottenburg, Grundbuch von Wilmersdorf, Blatt 12345' },
      { id: 'flurstueck', label: 'Flurstück / lfd. Nr. BV', type: 'text', required: true },
      { id: 'betrag', label: 'Grundschuldbetrag (€)', type: 'text', required: true, placeholder: '350.000,00' },
      { id: 'zinssatz', label: 'Grundschuldzinssatz (% p. a.)', type: 'text', placeholder: '15' },
      { id: 'nebenleistung', label: 'Einmalige Nebenleistung (%)', type: 'text', placeholder: '5' },
    ],
    render: f => `Grundschuldbestellung
— Entwurf zur notariellen Beurkundung —

Beteiligte:
Besteller:in: ${f.eigentuemer || '[Eigentümer:in]'}${f.eigentuemerAnschrift ? `, wohnhaft ${f.eigentuemerAnschrift.replace(/\n/g, ', ')}` : ''}
Gläubigerin: ${f.glaeubiger || '[Bank]'}

I. Grundbesitz

Im Grundbuch ${f.grundbuch || '[Grundbuchstelle]'}, BV-Nr. ${f.flurstueck || '[Flurstück]'}, ist die Besteller:in als Eigentümer:in eingetragen.

II. Grundschuldbestellung

Die Besteller:in bestellt hiermit zugunsten der o. g. Gläubigerin an dem vorbezeichneten Grundbesitz eine

Buchgrundschuld

ohne Brief in Höhe von € ${f.betrag || '[Betrag]'} (in Worten: [Betrag in Worten] Euro), verzinslich mit ${f.zinssatz || '15'} % jährlich seit Bestellung, zuzüglich einer einmaligen Nebenleistung von ${f.nebenleistung || '5'} % des Grundschuldkapitals.

Die Grundschuld ist sofort fällig und kann ohne vorherige Kündigung in Anspruch genommen werden.

III. Rangbestimmung

Die Grundschuld soll im Grundbuch an nächstoffener Rangstelle eingetragen werden. Vorgehende oder gleichrangige Eintragungen werden ausgeschlossen, soweit sie nicht in dieser Urkunde ausdrücklich bewilligt sind.

IV. Zwangsvollstreckungsunterwerfung (§ 794 Abs. 1 Nr. 5 ZPO)

Die Besteller:in unterwirft sich wegen des Grundschuldkapitals nebst Zinsen und Nebenleistung der sofortigen Zwangsvollstreckung in den belasteten Grundbesitz dergestalt, dass die Zwangsvollstreckung aus dieser Urkunde gegen den jeweiligen Eigentümer zulässig ist.

Persönliche Schuldhaftung wird in gesonderter Urkunde übernommen.

V. Bewilligung und Antrag

Die Besteller:in bewilligt und beantragt die Eintragung der vorstehenden Grundschuld nebst Vollstreckungsklausel im Grundbuch.

VI. Vollzugsvollmacht

Die Besteller:in bevollmächtigt die Notariatsangestellten, alle zur Eintragung erforderlichen Erklärungen abzugeben und entgegenzunehmen, insbesondere Rangänderungen zu erklären, Anträge zu stellen und zurückzunehmen.

____________________________
Ort, Datum — Beurkundung erforderlich (§ 873 BGB, § 29 GBO)

Hinweis: Dieser Entwurf bedarf der notariellen Beurkundung. Verbraucherbeteiligung: Regelfrist von zwei Wochen gem. § 17 Abs. 2a BeurkG beachten.
`,
  },

  // ---------------------------------
  {
    id: 'schenkungsvertrag_entwurf',
    title: 'Schenkungsvertrag (Entwurf)',
    description: 'Entwurf eines Schenkungsvertrags, insbesondere für Generationenübergang Immobilie mit Pflichtteilsanrechnung.',
    useCase: 'Mandantschaft möchte zu Lebzeiten Vermögen (typisch: Immobilie) an Kinder übertragen. Bei Grundstücken zwingend notarielle Beurkundung gem. § 311b Abs. 1 BGB; Schenkungsversprechen gem. § 518 BGB ebenfalls beurkundungsbedürftig.',
    fields: [
      { id: 'schenker', label: 'Schenker:in', type: 'text', required: true },
      { id: 'schenkerAnschrift', label: 'Anschrift Schenker:in', type: 'textarea' },
      { id: 'beschenkter', label: 'Beschenkte:r', type: 'text', required: true },
      { id: 'beschenkterAnschrift', label: 'Anschrift Beschenkte:r', type: 'textarea' },
      { id: 'gegenstand', label: 'Schenkungsgegenstand', type: 'textarea', required: true, placeholder: 'Grundbesitz Berlin-Pankow, Grundbuch ..., Blatt ...' },
      { id: 'gegenleistung', label: 'Auflagen / Gegenleistungen', type: 'textarea', placeholder: 'Wohnungsrecht, Pflegeleistung, Leibrente' },
      { id: 'pflichtteilAnrechnung', label: 'Pflichtteilsanrechnung gewünscht?', type: 'text', placeholder: 'ja / nein' },
      { id: 'rueckforderung', label: 'Rückforderungsrechte', type: 'textarea', placeholder: 'Vorversterben, Insolvenz, Scheidung der/des Beschenkten' },
    ],
    render: f => `Schenkungsvertrag
— Entwurf zur notariellen Beurkundung —

zwischen

${f.schenker || '[Schenker:in]'}${f.schenkerAnschrift ? `, ${f.schenkerAnschrift.replace(/\n/g, ', ')}` : ''}
— nachfolgend „Schenker:in" —

und

${f.beschenkter || '[Beschenkte:r]'}${f.beschenkterAnschrift ? `, ${f.beschenkterAnschrift.replace(/\n/g, ', ')}` : ''}
— nachfolgend „Beschenkte:r" —

§ 1 Schenkungsgegenstand

Die Schenker:in überträgt der/dem Beschenkten unentgeltlich aus dem Stamm ihres Vermögens:

${f.gegenstand || '[Schenkungsgegenstand]'}

§ 2 Übertragung / Auflassung

${/(grund|immob|haus|wohnung|flurstück)/i.test(f.gegenstand || '') ? 'Die Vertragsparteien sind sich über den Eigentumsübergang einig (Auflassung, § 925 BGB). Sie bewilligen und beantragen die Eintragung des Eigentumswechsels im Grundbuch. Der Übergang von Besitz, Nutzungen, Lasten und Gefahr erfolgt mit Beurkundung dieses Vertrages, soweit nicht abweichend geregelt.' : 'Die Übertragung erfolgt mit Annahme der Schenkung; Übergabe ist erfolgt bzw. erfolgt mit Beurkundung dieser Urkunde.'}

§ 3 Auflagen / Gegenleistungen

${f.gegenleistung || 'Die Schenkung erfolgt ohne Auflagen.'}

§ 4 Pflichtteilsanrechnung (§ 2315 BGB)

${(f.pflichtteilAnrechnung || '').toLowerCase().startsWith('ja')
  ? 'Die Schenker:in bestimmt hiermit, dass die/der Beschenkte sich den Wert der vorstehenden Zuwendung auf einen ihm/ihr etwa zustehenden Pflichtteil nach der Schenker:in anrechnen lassen muss (§ 2315 BGB). Maßgeblich ist der Wert im Zeitpunkt der Schenkung.'
  : 'Eine Pflichtteilsanrechnung gem. § 2315 BGB wird nicht angeordnet. Auf die Folge, dass die Schenkung gem. § 2325 BGB nur abschmelzend pflichtteilsergänzungsrelevant ist (Zehnjahresfrist, beginnend mit Vollzug nach § 2325 Abs. 3 BGB), wird hingewiesen.'}

§ 5 Rückforderungsrechte

${f.rueckforderung || 'Die Schenker:in behält sich Rückforderungsrechte für die Fälle des Vorversterbens der/des Beschenkten, der Eröffnung des Insolvenzverfahrens über deren/dessen Vermögen sowie der Einleitung der Zwangsvollstreckung in den Schenkungsgegenstand vor.'}

§ 6 Steuern, Kosten

Die Beschenkte:r trägt die Kosten dieser Urkunde sowie etwaige Schenkungsteuer (ErbStG). Die Schenker:in wird auf die Anzeigepflicht nach § 30 ErbStG hingewiesen.

§ 7 Hinweise

Auf die Beurkundungsbedürftigkeit (§ 311b Abs. 1 BGB für Grundstücke; § 518 Abs. 1 BGB für das Schenkungsversprechen) wird hingewiesen. Die Belehrung über die Folgen des Vertrages erfolgt im Beurkundungstermin (§ 17 Abs. 1 BeurkG).

____________________________
Ort, Datum — Beurkundung erforderlich

Hinweis: Bei Grundstücksschenkung zwingend notarielle Beurkundung. Heilung formloser Schenkungen erst durch Vollzug (§ 518 Abs. 2 BGB).
`,
  },

  // ---------------------------------
  {
    id: 'eheaufhebung_antrag',
    title: 'Antrag auf Eheaufhebung',
    description: 'Antrag auf Aufhebung der Ehe gem. §§ 1313 ff. BGB (Aufhebungsgründe nach § 1314 BGB).',
    useCase: 'Spezialisierter Antrag, wenn die Ehe an einem Aufhebungsgrund leidet (z. B. Geschäftsunfähigkeit bei Eheschließung, arglistige Täuschung, Drohung, Scheinehe). Abzugrenzen von der Scheidung (§ 1565 BGB).',
    fields: [
      { id: 'familiengericht', label: 'Familiengericht', type: 'text', required: true, placeholder: 'Amtsgericht — Familiengericht — Berlin-Pankow' },
      { id: 'antragsteller', label: 'Antragsteller:in', type: 'text', required: true },
      { id: 'antragsgegner', label: 'Antragsgegner:in', type: 'text', required: true },
      { id: 'eheschliessungDatum', label: 'Eheschließung (Datum)', type: 'date', required: true },
      { id: 'eheschliessungOrt', label: 'Eheschließung (Standesamt / Ort)', type: 'text', required: true },
      { id: 'aufhebungsgrund', label: 'Aufhebungsgrund (§ 1314 BGB)', type: 'text', required: true, placeholder: '§ 1314 Abs. 2 Nr. 3 BGB — arglistige Täuschung' },
      { id: 'sachverhalt', label: 'Sachverhalt', type: 'textarea', required: true, hint: 'Knappe, prozessuale Schilderung mit Tatzeitpunkt und Kenntnis (Jahresfrist § 1317 BGB!)' },
    ],
    render: f => `An ${f.familiengericht || '[Familiengericht]'}

Antrag auf Eheaufhebung
in der Familiensache ${f.antragsteller || '[Antragsteller:in]'} ./. ${f.antragsgegner || '[Antragsgegner:in]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.antragsteller || '[Antragsteller:in]'} — Antragsteller:in —, beantrage ich,

die zwischen den Beteiligten am ${f.eheschliessungDatum || '[Datum]'} vor dem ${f.eheschliessungOrt || '[Standesamt]'} geschlossene Ehe gem. §§ 1313, 1314 BGB aufzuheben.

Hilfsweise rege ich die Verfahrensverbindung mit einem etwaigen Scheidungsverfahren an.

I. Verfahrensrechtliches

Die Zuständigkeit des angerufenen Gerichts ergibt sich aus § 122 FamFG. Die Anwaltspflicht (§ 114 FamFG) ist gewahrt.

II. Aufhebungsgrund

${f.aufhebungsgrund || '[Aufhebungsgrund]'}

III. Sachverhalt

${f.sachverhalt || '[Sachverhalt]'}

Die Jahresfrist des § 1317 Abs. 1 BGB ist gewahrt; meine Mandantschaft hat erstmals zu dem im Sachverhalt genannten Zeitpunkt von dem Aufhebungsgrund Kenntnis erlangt. Eine Bestätigung der Ehe i. S. d. § 1315 Abs. 1 BGB ist nicht erfolgt.

IV. Rechtsfolgen

Auf die Rechtsfolgenverweisung des § 1318 BGB (Modifikation der Scheidungsfolgenvorschriften) wird hingewiesen. Die Regelung zum Versorgungsausgleich, Unterhalt und Güterrecht bleibt ggf. gesondertem Antrag vorbehalten.

V. Anträge

1. Die zwischen den Beteiligten geschlossene Ehe wird aufgehoben.
2. Die Kosten des Verfahrens werden der Antragsgegner:in auferlegt.

Anlagen:
— Eheurkunde (beglaubigte Abschrift)
— Nachweise zum Aufhebungsgrund

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'generalvollmacht',
    title: 'General- und Vorsorgevollmacht (Entwurf)',
    description: 'Umfassende Generalvollmacht mit Vorsorgekomponente — über die einfache Vorsorgevollmacht hinausgehend.',
    useCase: 'Mandantschaft möchte einer Vertrauensperson eine umfassende Vertretungsmacht in allen vermögens-, gesundheits- und persönlichen Angelegenheiten erteilen. Für Grundstücks- und Handelsregistersachen ist notarielle Beglaubigung/Beurkundung erforderlich.',
    fields: [
      { id: 'vollmachtgeber', label: 'Vollmachtgeber:in', type: 'text', required: true },
      { id: 'geboren', label: 'Geburtsdatum', type: 'date', required: true },
      { id: 'anschrift', label: 'Anschrift Vollmachtgeber:in', type: 'textarea', required: true },
      { id: 'bevollmaechtigter', label: 'Bevollmächtigte:r', type: 'text', required: true },
      { id: 'bevAnschrift', label: 'Anschrift Bevollmächtigte:r', type: 'textarea' },
      { id: 'ersatz', label: 'Ersatzbevollmächtigte:r', type: 'text', placeholder: 'für den Fall der Verhinderung' },
      { id: 'ausnahmen', label: 'Ausnahmen vom Vollmachtsumfang', type: 'textarea', placeholder: 'z. B. keine Schenkungen über 5.000 €' },
    ],
    render: f => `General- und Vorsorgevollmacht

Ich, ${f.vollmachtgeber || '[Vollmachtgeber:in]'}, geboren am ${f.geboren || '[Datum]'}, wohnhaft${f.anschrift ? ` ${f.anschrift.replace(/\n/g, ', ')}` : ' [Anschrift]'},

erteile hiermit

${f.bevollmaechtigter || '[Bevollmächtigte:r]'}${f.bevAnschrift ? `, ${f.bevAnschrift.replace(/\n/g, ', ')}` : ''},

— nachfolgend „Bevollmächtigte:r" —

uneingeschränkte General- und Vorsorgevollmacht, mich in allen persönlichen, gesundheitlichen und vermögensrechtlichen Angelegenheiten gerichtlich und außergerichtlich umfassend zu vertreten.

I. Umfang der Vermögenssorge

Die Vollmacht umfasst insbesondere:
— Verwaltung und Verfügung über Vermögensgegenstände jeder Art, einschließlich Grundbesitz und Gesellschaftsbeteiligungen,
— Vornahme aller Bankgeschäfte und Verfügung über Kontoguthaben,
— Eingehung und Beendigung von Verbindlichkeiten und Verträgen aller Art,
— Vertretung gegenüber Behörden, Gerichten, Versicherungen und sonstigen Dritten,
— Annahme und Ausschlagung von Erbschaften (§§ 1942 ff. BGB),
— Erklärungen im Grundbuchverfahren (§ 29 GBO) und Handelsregisterverfahren (§ 12 HGB).

II. Umfang der Gesundheitssorge / Personensorge

Die Vollmacht umfasst:
— Einwilligung, Nichteinwilligung und Widerruf der Einwilligung in alle ärztlichen Maßnahmen, einschließlich solcher mit erheblichem Risiko (§ 1829 BGB),
— Entscheidung über freiheitsentziehende Maßnahmen i. S. d. § 1831 BGB,
— Entscheidung über Aufenthalt, Wohnung und ggf. Heimunterbringung,
— Vertretung gegenüber Ärzt:innen, Pflegeeinrichtungen, Krankenkassen, Sozialversicherungsträgern.

Eine etwaige Patientenverfügung gem. § 1827 BGB ist gesondert zu beachten und geht den Entscheidungen der/des Bevollmächtigten vor.

III. Innenverhältnis und Befreiungen

Die Bevollmächtigte:r ist von den Beschränkungen des § 181 BGB befreit. Die Vollmacht gilt mit sofortiger Wirkung, ungeachtet der Geschäftsfähigkeit der Vollmachtgeber:in, und über deren Tod hinaus (transmortale Vollmacht).

${f.ausnahmen ? `IV. Ausnahmen / Beschränkungen\n\n${f.ausnahmen}\n\n` : ''}${f.ersatz ? `V. Ersatzbevollmächtigte:r\n\nFür den Fall, dass die vorgenannte Bevollmächtigte:r nicht erreichbar oder verhindert ist, wird ${f.ersatz} mit denselben Befugnissen ersatzweise bevollmächtigt.\n\n` : ''}VI. Betreuungsverfügung

Sollte gleichwohl ein:e Betreuer:in zu bestellen sein, schlage ich die o. g. bevollmächtigte Person als Betreuer:in vor (§ 1816 Abs. 2 BGB).

VII. Widerruf

Diese Vollmacht kann jederzeit ohne Angabe von Gründen widerrufen werden. Der Widerruf bedarf zur Wirksamkeit gegenüber Dritten der Rückgabe der Urkunde.

____________________________
Ort, Datum

____________________________
Unterschrift Vollmachtgeber:in

Hinweis: Für Verfügungen über Grundbesitz (§ 29 GBO), Eintragungen im Handelsregister (§ 12 HGB) sowie für Erbausschlagungen (§ 1945 Abs. 1 BGB) ist öffentliche Beglaubigung der Unterschrift bzw. notarielle Beurkundung erforderlich. Empfehlung: Registrierung im Zentralen Vorsorgeregister (ZVR) der Bundesnotarkammer.
`,
  },

  // ---------------------------------
  {
    id: 'ehevertrag_entwurf',
    title: 'Ehevertrag (Entwurf)',
    description: 'Entwurf eines Ehevertrags zur Modifikation des gesetzlichen Güterstands gem. § 1408 BGB.',
    useCase: 'Eheleute / Verlobte möchten den gesetzlichen Zugewinnausgleich modifizieren oder ausschließen, ggf. Versorgungsausgleich und nachehelichen Unterhalt regeln. Notarielle Beurkundung zwingend (§ 1410 BGB).',
    fields: [
      { id: 'ehegatte1', label: 'Ehegatte 1 (Name)', type: 'text', required: true },
      { id: 'ehegatte1Anschrift', label: 'Anschrift Ehegatte 1', type: 'textarea' },
      { id: 'ehegatte2', label: 'Ehegatte 2 (Name)', type: 'text', required: true },
      { id: 'ehegatte2Anschrift', label: 'Anschrift Ehegatte 2', type: 'textarea' },
      { id: 'gueterstand', label: 'Gewählter Güterstand', type: 'text', required: true, placeholder: 'modifizierte Zugewinngemeinschaft / Gütertrennung / Wahl-Zugewinngemeinschaft' },
      { id: 'modifikationen', label: 'Modifikationen Zugewinn', type: 'textarea', hint: 'z. B. Herausnahme Unternehmen, Kappung Ausgleich' },
      { id: 'versorgungsausgleich', label: 'Versorgungsausgleich', type: 'text', placeholder: 'Ausschluss / Modifikation / gesetzlich' },
      { id: 'unterhalt', label: 'Nachehelicher Unterhalt', type: 'textarea', placeholder: 'Verzicht / Höchstdauer / Höchstbetrag' },
    ],
    render: f => `Ehevertrag
— Entwurf zur notariellen Beurkundung —

zwischen

${f.ehegatte1 || '[Ehegatte 1]'}${f.ehegatte1Anschrift ? `, ${f.ehegatte1Anschrift.replace(/\n/g, ', ')}` : ''}

und

${f.ehegatte2 || '[Ehegatte 2]'}${f.ehegatte2Anschrift ? `, ${f.ehegatte2Anschrift.replace(/\n/g, ', ')}` : ''}

— nachfolgend gemeinsam „die Ehegatten" —

Vorbemerkung

Die Ehegatten leben im gesetzlichen Güterstand der Zugewinngemeinschaft (§ 1363 BGB) bzw. beabsichtigen die Eheschließung. Sie wünschen, ihre güter- und versorgungsrechtlichen Verhältnisse für den Fall der Scheidung und des Todes verbindlich zu regeln. Ihnen ist bekannt, dass der gesetzliche Güterstand bei Scheidung zum Zugewinnausgleich gem. §§ 1372 ff. BGB führt.

§ 1 Güterstand

${(f.gueterstand || '').toLowerCase().includes('trennung')
  ? 'Die Ehegatten vereinbaren mit Wirkung ab Beurkundung Gütertrennung gem. § 1414 BGB. Der Güterstand der Zugewinngemeinschaft wird hiermit aufgehoben. Ein etwaiger bis heute entstandener Zugewinn gilt als ausgeglichen.'
  : `Es wird folgender Güterstand vereinbart: ${f.gueterstand || '[Güterstand]'}.`}

§ 2 Modifikationen Zugewinn

${f.modifikationen || 'Soweit die Zugewinngemeinschaft aufrechterhalten bleibt, gelten die gesetzlichen Vorschriften der §§ 1373 ff. BGB unverändert.'}

§ 3 Versorgungsausgleich

${(f.versorgungsausgleich || '').toLowerCase().includes('ausschluss')
  ? 'Die Ehegatten schließen den Versorgungsausgleich für den Fall der Scheidung in beiderseitigem Einvernehmen aus (§ 6 Abs. 1 Nr. 2 VersAusglG). Sie sind über die Wirksamkeitskontrolle nach § 8 VersAusglG belehrt worden.'
  : `Versorgungsausgleich: ${f.versorgungsausgleich || 'gesetzliche Regelung'}.`}

§ 4 Nachehelicher Unterhalt

${f.unterhalt || 'Die gesetzlichen Regelungen zum nachehelichen Unterhalt (§§ 1569 ff. BGB) bleiben unberührt. Auf die Grenzen vertraglicher Disponibilität und die Wirksamkeitskontrolle nach § 138 BGB / Kernbereichslehre des BGH wurde hingewiesen.'}

§ 5 Erbrechtliche Hinweise

Etwaige erbrechtliche Regelungen (Berliner Testament, Erbvertrag, Pflichtteilsverzicht) bleiben einer gesonderten letztwilligen Verfügung bzw. einem gesonderten Erbvertrag (§ 2274 BGB) vorbehalten. Auf die Wechselwirkung des § 1371 BGB mit dem hier gewählten Güterstand wurde hingewiesen.

§ 6 Belehrungen

Die Ehegatten wurden ausführlich belehrt über:
— die Beurkundungsbedürftigkeit (§ 1410 BGB),
— die Inhalts- und Ausübungskontrolle ehevertraglicher Vereinbarungen (§§ 138, 242 BGB; BVerfG, BGH-Rechtsprechung zur Kernbereichslehre),
— die Folgen für gemeinsame minderjährige Kinder (Kindesunterhalt ist nicht disponibel),
— die Auswirkungen auf erbschaftsteuerliche Freibeträge.

§ 7 Schlussbestimmungen

Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam; an die Stelle der unwirksamen Regelung tritt diejenige Regelung, die dem wirtschaftlichen Zweck am nächsten kommt.

____________________________
Ort, Datum — Beurkundung erforderlich (§ 1410 BGB)

Hinweis: Eheverträge bedürfen zwingend der gleichzeitigen Anwesenheit beider Ehegatten vor dem Notar (§ 1410 BGB). Eine Vertretung durch Boten ist ausgeschlossen.
`,
  },
]

/**
 * Migrationsrecht-Pack — für Fachanwält:innen für Migrationsrecht und Solos
 * mit hoher Migrant:innen-Mandantschaft (z. B. Berliner Kanzleien mit
 * vietnamesischer/türkischer/arabischer Community).
 *
 * 12 Templates: Aufenthaltstitel-Erteilung/-Verlängerung, Niederlassung,
 * Familiennachzug, Beschäftigungserlaubnis, Einbürgerung, Widersprüche,
 * Eilanträge gegen Abschiebung, Fiktionsbescheinigung, Härtefall,
 * Familienasyl. Frist-Hinweise und Anlagen-Listen sind in render() drin.
 */
export const MIGRATION_TEMPLATES: LawyerTemplate[] = [
// ---------------------------------
  {
    id: 'aufenthaltserlaubnis_antrag',
    title: 'Antrag auf Aufenthaltserlaubnis',
    description: 'Erstantrag auf Erteilung einer Aufenthaltserlaubnis gem. §§ 7, 8 AufenthG bei der zuständigen Ausländerbehörde.',
    useCase: 'Mandantschaft hält sich rechtmäßig in Deutschland auf (z. B. mit nationalem Visum) und benötigt erstmals eine Aufenthaltserlaubnis zu einem konkreten Aufenthaltszweck.',
    fields: [
      { id: 'behoerde', label: 'Ausländerbehörde', type: 'text', required: true, placeholder: 'Landesamt für Einwanderung Berlin (LEA)' },
      { id: 'mandant', label: 'Antragsteller:in (Mandant:in)', type: 'text', required: true },
      { id: 'mandantAnschrift', label: 'Anschrift Antragsteller:in', type: 'textarea' },
      { id: 'geboren', label: 'Geburtsdatum', type: 'date', required: true },
      { id: 'staatsang', label: 'Staatsangehörigkeit', type: 'text', required: true },
      { id: 'zweck', label: 'Aufenthaltszweck', type: 'text', required: true, placeholder: 'Studium (§ 16b) / Beschäftigung (§ 18b) / Familiennachzug (§ 28)', hint: 'Bitte konkrete Norm des AufenthG benennen.' },
      { id: 'bisherigeTitel', label: 'Bisheriger Aufenthaltsstatus / Visum', type: 'textarea', placeholder: 'Nationales Visum Typ D v. 12.01.2026, gültig bis 11.04.2026' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Pass, biometrisches Lichtbild, Mietvertrag, Krankenversicherung, Immatrikulation, Arbeitsvertrag' },
    ],
    render: f => `An ${f.behoerde || '[Ausländerbehörde]'}

Antrag auf Erteilung einer Aufenthaltserlaubnis
gem. §§ 7, 8 AufenthG i. V. m. ${f.zweck ? `§ ${f.zweck.replace(/^.*§\s*/, '')}` : '[einschlägiger Spezialnorm]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}${f.geboren ? `, geboren am ${f.geboren}` : ''}${f.staatsang ? `, ${f.staatsang}e:r Staatsangehörige:r` : ''}${f.mandantAnschrift ? `, wohnhaft ${f.mandantAnschrift.replace(/\n/g, ', ')}` : ''}, beantrage ich

die Erteilung einer Aufenthaltserlaubnis

gem. §§ 7, 8 AufenthG zum Zweck ${f.zweck || '[Aufenthaltszweck]'}.

I. Bisheriger Aufenthalt

${f.bisherigeTitel || '[Angaben zu Einreise, Visum und bisherigem Status]'}

II. Erteilungsvoraussetzungen (§ 5 AufenthG)

Die allgemeinen Erteilungsvoraussetzungen nach § 5 Abs. 1 AufenthG liegen vor: Die Identität und Staatsangehörigkeit meiner Mandantschaft sind geklärt, der Lebensunterhalt ist gesichert (§ 2 Abs. 3 AufenthG), ein Ausweisungsinteresse besteht nicht. Die Passpflicht (§ 3 AufenthG) ist erfüllt.

III. Anlagen

${f.anlagen || '— gültiger Pass (Kopie)\n— biometrisches Lichtbild\n— Nachweis des Lebensunterhalts\n— Nachweis Krankenversicherung\n— Meldebestätigung\n— zweckbezogene Nachweise'}

Ich bitte um Terminvergabe zur persönlichen Vorsprache meiner Mandantschaft sowie um Ausstellung einer Fiktionsbescheinigung gem. § 81 Abs. 4 AufenthG für die Dauer des Verfahrens. Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'niederlassungserlaubnis',
    title: 'Antrag auf Niederlassungserlaubnis',
    description: 'Antrag auf Erteilung einer unbefristeten Niederlassungserlaubnis gem. § 9 AufenthG nach fünfjährigem Besitz einer Aufenthaltserlaubnis.',
    useCase: 'Mandantschaft erfüllt die Voraussetzungen des § 9 Abs. 2 AufenthG (fünf Jahre Aufenthaltserlaubnis, Lebensunterhalt, B1, Rentenversicherung, ausreichender Wohnraum).',
    fields: [
      { id: 'behoerde', label: 'Ausländerbehörde', type: 'text', required: true },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'mandantAnschrift', label: 'Anschrift Mandant:in', type: 'textarea' },
      { id: 'bisherigerTitel', label: 'Bisheriger Aufenthaltstitel', type: 'text', required: true, placeholder: 'Aufenthaltserlaubnis § 18b AufenthG' },
      { id: 'titelSeit', label: 'Titel erteilt am', type: 'date', required: true, hint: '5-Jahres-Frist § 9 Abs. 2 Nr. 1 AufenthG' },
      { id: 'beschaeftigung', label: 'Aktuelle Beschäftigung', type: 'textarea', placeholder: 'Arbeitgeber, Position, sozialversicherungspflichtig seit ...' },
      { id: 'sprachnachweis', label: 'Sprachnachweis B1', type: 'text', placeholder: 'Zertifikat telc Deutsch B1 v. 03.11.2025' },
      { id: 'lebensunterhalt', label: 'Sicherung Lebensunterhalt', type: 'textarea', hint: 'Monatliches Nettoeinkommen, Bedarf, ggf. Ehegatte.' },
    ],
    render: f => `An ${f.behoerde || '[Ausländerbehörde]'}

Antrag auf Erteilung einer Niederlassungserlaubnis
gem. § 9 AufenthG

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}${f.mandantAnschrift ? `, wohnhaft ${f.mandantAnschrift.replace(/\n/g, ', ')}` : ''}, beantrage ich

die Erteilung einer Niederlassungserlaubnis

gem. § 9 Abs. 2 AufenthG.

I. Besitz einer Aufenthaltserlaubnis seit fünf Jahren (§ 9 Abs. 2 Nr. 1 AufenthG)

Meine Mandantschaft ist seit ${f.titelSeit || '[Datum]'} im Besitz einer ${f.bisherigerTitel || '[Aufenthaltserlaubnis]'}. Die Fünfjahresfrist ist damit gewahrt.

II. Sicherung des Lebensunterhalts (§ 9 Abs. 2 Nr. 2 AufenthG)

${f.lebensunterhalt || '[Angaben zur Einkommenssituation, Nachweise liegen bei]'}

III. Beiträge zur gesetzlichen Rentenversicherung (§ 9 Abs. 2 Nr. 3 AufenthG)

Meine Mandantschaft hat Pflichtbeiträge bzw. freiwillige Beiträge zur gesetzlichen Rentenversicherung für mindestens 60 Monate geleistet; der entsprechende Versicherungsverlauf ist beigefügt.

IV. Beschäftigung (§ 9 Abs. 2 Nr. 5 AufenthG)

${f.beschaeftigung || '[Angaben zur aktuellen Erwerbstätigkeit]'}

V. Sprachkenntnisse und Kenntnisse der Rechts- und Gesellschaftsordnung (§ 9 Abs. 2 Nr. 7, 8 AufenthG)

Ausreichende Deutschkenntnisse auf Niveau B1 sind durch ${f.sprachnachweis || '[Zertifikat]'} nachgewiesen. Kenntnisse der Rechts- und Gesellschaftsordnung sind durch erfolgreichen Abschluss des Einbürgerungs- bzw. Orientierungskurses belegt.

VI. Weitere Voraussetzungen

Ausweisungsinteressen i. S. v. § 54 AufenthG bestehen nicht. Ausreichender Wohnraum (§ 9 Abs. 2 Nr. 9 AufenthG) ist vorhanden; der Mietvertrag liegt bei.

VII. Anlagen

— bisheriger Aufenthaltstitel (Kopie)
— Rentenversicherungsverlauf
— Arbeitsvertrag und 3 aktuelle Gehaltsabrechnungen
— B1-Zertifikat
— Nachweis Integrationskurs / „Leben in Deutschland"-Test
— Mietvertrag

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'verlaengerung_aufenthaltstitel',
    title: 'Verlängerung Aufenthaltstitel',
    description: 'Antrag auf Verlängerung einer laufenden Aufenthaltserlaubnis gem. § 8 AufenthG.',
    useCase: 'Laufender Aufenthaltstitel läuft in Kürze ab. Verlängerungsantrag ist rechtzeitig vor Ablauf zu stellen; bei fristgerechter Antragstellung greift die Fiktionswirkung des § 81 Abs. 4 AufenthG.',
    fields: [
      { id: 'behoerde', label: 'Ausländerbehörde', type: 'text', required: true },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'mandantAnschrift', label: 'Anschrift Mandant:in', type: 'textarea' },
      { id: 'bisherigerTitel', label: 'Bisheriger Titel (Rechtsgrundlage)', type: 'text', required: true, placeholder: 'Aufenthaltserlaubnis § 28 Abs. 1 S. 1 Nr. 1 AufenthG' },
      { id: 'ablaufDatum', label: 'Ablauf des Titels', type: 'date', required: true, hint: 'Antrag muss vor Ablauf gestellt sein — § 81 Abs. 4 AufenthG.' },
      { id: 'verhaeltnisse', label: 'Geänderte / unveränderte Verhältnisse', type: 'textarea', required: true, placeholder: 'Ehebestand fortbestehend seit ..., Arbeitsverhältnis unverändert bei ...' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Pass, aktuelle Meldebescheinigung, Gehaltsabrechnungen, Krankenversicherung' },
    ],
    render: f => `An ${f.behoerde || '[Ausländerbehörde]'}

Antrag auf Verlängerung der Aufenthaltserlaubnis
gem. § 8 AufenthG

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}${f.mandantAnschrift ? `, wohnhaft ${f.mandantAnschrift.replace(/\n/g, ', ')}` : ''}, beantrage ich

die Verlängerung der Aufenthaltserlaubnis

meiner Mandantschaft, derzeit erteilt auf Grundlage von ${f.bisherigerTitel || '[Rechtsgrundlage]'}, gültig bis ${f.ablaufDatum || '[Ablaufdatum]'}.

I. Fortbestand des Aufenthaltszwecks (§ 8 Abs. 1 AufenthG)

${f.verhaeltnisse || '[Darlegung, dass die Erteilungsvoraussetzungen fortbestehen; relevante Veränderungen sind aufzuführen.]'}

II. Erteilungsvoraussetzungen

Die allgemeinen Erteilungsvoraussetzungen des § 5 AufenthG liegen weiterhin vor. Der Lebensunterhalt ist gesichert, die Passpflicht ist erfüllt, Ausweisungsinteressen bestehen nicht.

III. Fiktionswirkung

Der Antrag wird vor Ablauf des derzeitigen Titels gestellt, sodass der bisherige Titel gem. § 81 Abs. 4 S. 1 AufenthG bis zur Entscheidung der Behörde als fortbestehend gilt. Ich bitte vorsorglich um Ausstellung einer Fiktionsbescheinigung (§ 81 Abs. 5 AufenthG).

IV. Anlagen

${f.anlagen || '— Pass (Kopie)\n— Meldebescheinigung\n— aktuelle Einkommensnachweise\n— Nachweis Krankenversicherung\n— bisheriger Titel (Kopie)'}

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'familiennachzug_ehegatte',
    title: 'Familiennachzug Ehegatt:in',
    description: 'Antrag auf Visum zum Ehegattennachzug gem. §§ 27, 28, 30 AufenthG bei der Auslandsvertretung.',
    useCase: 'Ehegatt:in einer/eines in Deutschland lebenden Stammberechtigten möchte zum Zweck der Herstellung der ehelichen Lebensgemeinschaft nachziehen. Grundsätzlich A1-Sprachnachweis erforderlich (§ 30 Abs. 1 S. 1 Nr. 2 AufenthG).',
    fields: [
      { id: 'behoerde', label: 'Empfänger:in (Botschaft / Ausländerbehörde)', type: 'text', required: true, placeholder: 'Deutsche Botschaft Ankara / LEA Berlin' },
      { id: 'antragsteller', label: 'Antragsteller:in (im Ausland)', type: 'text', required: true },
      { id: 'antragstellerDaten', label: 'Geburtsdatum / Staatsangehörigkeit Antragsteller:in', type: 'text', placeholder: '12.03.1992, türkisch' },
      { id: 'stammberechtigt', label: 'Stammberechtigte:r in Deutschland', type: 'text', required: true, hint: 'Name, Aufenthaltstitel / Staatsangehörigkeit' },
      { id: 'eheDatum', label: 'Eheschließung (Datum)', type: 'date', required: true },
      { id: 'eheOrt', label: 'Ort der Eheschließung', type: 'text', required: true },
      { id: 'sprachnachweis', label: 'Sprachnachweis A1', type: 'text', placeholder: 'Goethe A1 v. 14.02.2026 / Befreiungstatbestand § 30 Abs. 1 S. 3 AufenthG' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Heiratsurkunde mit Apostille, Pässe, A1-Zertifikat, Mietvertrag, Einkommensnachweise' },
    ],
    render: f => `An ${f.behoerde || '[Botschaft / Ausländerbehörde]'}

Antrag auf Visum zum Ehegattennachzug
gem. §§ 27, 28 bzw. 30 AufenthG

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.antragsteller || '[Antragsteller:in]'}${f.antragstellerDaten ? ` (${f.antragstellerDaten})` : ''}, beantrage ich

die Erteilung eines nationalen Visums zum Zweck des Ehegattennachzugs

zur Herstellung der ehelichen Lebensgemeinschaft mit ${f.stammberechtigt || '[Stammberechtigte:r]'} in der Bundesrepublik Deutschland.

I. Eheliche Lebensgemeinschaft (§ 27 Abs. 1 AufenthG)

Die Ehe wurde am ${f.eheDatum || '[Datum]'} in ${f.eheOrt || '[Ort]'} geschlossen. Die Heiratsurkunde nebst Apostille / Legalisation liegt bei. Beide Ehegatten beabsichtigen die Herstellung und Wahrung der ehelichen Lebensgemeinschaft im Bundesgebiet; eine Scheinehe liegt ausdrücklich nicht vor.

II. Voraussetzungen auf Seiten der stammberechtigten Person

${f.stammberechtigt || '[Stammberechtigte:r]'} hält sich rechtmäßig im Bundesgebiet auf (Nachweis als Anlage). Ausreichender Wohnraum (§ 29 Abs. 1 Nr. 2 AufenthG) und die Sicherung des Lebensunterhalts (§ 5 Abs. 1 Nr. 1 AufenthG) sind gegeben; entsprechende Nachweise liegen bei.

III. Sprachnachweis (§ 30 Abs. 1 S. 1 Nr. 2 AufenthG)

${f.sprachnachweis || 'Einfache Deutschkenntnisse auf Niveau A1 werden durch beigefügtes Zertifikat nachgewiesen. Hilfsweise liegt ein Befreiungstatbestand gem. § 30 Abs. 1 S. 3 AufenthG vor.'}

IV. Beteiligung der Ausländerbehörde

Ich rege an, die zuständige Ausländerbehörde am künftigen Wohnort zeitnah gem. § 31 AufenthV zu beteiligen, um Verfahrensverzögerungen zu vermeiden.

V. Anlagen

${f.anlagen || '— Reisepass Antragsteller:in\n— Heiratsurkunde mit Apostille / Legalisation\n— Aufenthaltstitel / Pass der stammberechtigten Person\n— Mietvertrag, Wohnflächenberechnung\n— Einkommensnachweise der letzten 6 Monate\n— A1-Zertifikat'}

Ich bitte um zeitnahe Terminvergabe und Bearbeitung. Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'familiennachzug_kind',
    title: 'Kindernachzug',
    description: 'Antrag auf Visum bzw. Aufenthaltserlaubnis zum Kindernachzug gem. § 32 AufenthG (minderjährige ledige Kinder bis 16/18 Jahre).',
    useCase: 'Eltern bzw. personensorgeberechtigter Elternteil leben rechtmäßig in Deutschland; minderjähriges lediges Kind soll nachziehen. Bei Kindern ab 16 J. zusätzliche Integrationsprognose (§ 32 Abs. 2 AufenthG).',
    fields: [
      { id: 'behoerde', label: 'Empfänger:in (Botschaft / Ausländerbehörde)', type: 'text', required: true },
      { id: 'eltern', label: 'Eltern / Sorgeberechtigte:r in DE', type: 'text', required: true, hint: 'Name + Aufenthaltstitel' },
      { id: 'kind', label: 'Kind (Name)', type: 'text', required: true },
      { id: 'kindGeboren', label: 'Geburtsdatum Kind', type: 'date', required: true, hint: 'Relevant für § 32 Abs. 2 AufenthG (Altersgrenze 16).' },
      { id: 'staatsang', label: 'Staatsangehörigkeit Kind', type: 'text' },
      { id: 'sorgerecht', label: 'Sorgerecht', type: 'textarea', placeholder: 'Alleiniges Sorgerecht der Mutter seit Scheidung v. ... / gemeinsames Sorgerecht' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Geburtsurkunde, Sorgerechtsentscheidung, Pässe, Aufenthaltstitel Eltern' },
    ],
    render: f => `An ${f.behoerde || '[Botschaft / Ausländerbehörde]'}

Antrag auf Visum zum Kindernachzug
gem. § 32 AufenthG

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.eltern || '[Eltern / Sorgeberechtigte:r]'}, beantrage ich für das gemeinsame Kind

${f.kind || '[Kind]'}${f.kindGeboren ? `, geboren am ${f.kindGeboren}` : ''}${f.staatsang ? `, ${f.staatsang}e:r Staatsangehörige:r` : ''},

die Erteilung eines Visums zum Nachzug gem. § 32 AufenthG.

I. Voraussetzungen des § 32 AufenthG

Das Kind ist minderjährig und ledig. Die sorgeberechtigten Eltern bzw. der allein personensorgeberechtigte Elternteil halten sich rechtmäßig im Bundesgebiet auf und verfügen über einen Aufenthaltstitel i. S. v. § 32 Abs. 1 AufenthG.

II. Sorgerecht

${f.sorgerecht || '[Angaben zum Sorgerecht und Vorlage der zugrundeliegenden Urkunden / Entscheidungen]'}

III. Sicherung des Lebensunterhalts und Wohnraum

Der Lebensunterhalt ist gesichert (§ 5 Abs. 1 Nr. 1 AufenthG), ausreichender Wohnraum steht zur Verfügung (§ 29 Abs. 1 Nr. 2 AufenthG). Entsprechende Nachweise liegen bei.

IV. ${(() => { const g = f.kindGeboren ? new Date(f.kindGeboren) : null; return g && (Date.now() - g.getTime()) / (1000*60*60*24*365.25) >= 16 ? 'Integrationsprognose (§ 32 Abs. 2 AufenthG)' : 'Hinweis'})()}

${(() => { const g = f.kindGeboren ? new Date(f.kindGeboren) : null; return g && (Date.now() - g.getTime()) / (1000*60*60*24*365.25) >= 16 ? 'Da das Kind das 16. Lebensjahr vollendet hat, wird auf die Integrationsprognose nach § 32 Abs. 2 AufenthG besonders hingewiesen; der Sprachnachweis C1 bzw. die Integrationsfähigkeit wird durch beiliegende Nachweise belegt.' : 'Das Kind hat das 16. Lebensjahr noch nicht vollendet; eine Integrationsprognose nach § 32 Abs. 2 AufenthG ist nicht erforderlich.'})()}

V. Anlagen

${f.anlagen || '— Geburtsurkunde des Kindes mit Apostille\n— Sorgerechtsnachweis / Einverständniserklärung des anderen Elternteils\n— Reisepass des Kindes\n— Aufenthaltstitel und Pass der Eltern\n— Einkommens- und Wohnraumnachweise'}

Ich bitte um zeitnahe Terminvergabe; die minderjährige Antragstellerin / der minderjährige Antragsteller ist auf die baldige Familienzusammenführung dringend angewiesen. Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'beschaeftigungserlaubnis',
    title: 'Antrag Beschäftigungserlaubnis',
    description: 'Antrag auf Erteilung der Erlaubnis zur Ausübung einer Erwerbstätigkeit gem. § 4a AufenthG („Erwerbstätigkeit gestattet").',
    useCase: 'Mandantschaft besitzt einen Aufenthaltstitel, der eine Erwerbstätigkeit nicht oder nur mit gesonderter Erlaubnis zulässt (z. B. Aufenthaltsgestattung, Duldung, bestimmte humanitäre Titel). Zustimmung der BA nach §§ 39 ff. AufenthG ggf. erforderlich.',
    fields: [
      { id: 'behoerde', label: 'Ausländerbehörde', type: 'text', required: true },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'aktuellerStatus', label: 'Aktueller Aufenthaltsstatus', type: 'text', required: true, placeholder: 'Aufenthaltsgestattung / Duldung § 60a / AE § 25 Abs. 5' },
      { id: 'arbeitgeber', label: 'Arbeitgeber:in', type: 'text', required: true },
      { id: 'stelle', label: 'Stellenbezeichnung / Tätigkeit', type: 'textarea', required: true, placeholder: 'Fachkraft Pflege, 30h/Woche, EG P7 TVöD' },
      { id: 'vertragslaufzeit', label: 'Vertragslaufzeit', type: 'text', placeholder: 'unbefristet ab 01.05.2026 / befristet bis 30.04.2027' },
      { id: 'bruttolohn', label: 'Bruttolohn', type: 'text', placeholder: '€ 3.200,- monatlich' },
      { id: 'baZustimmung', label: 'BA-Zustimmung erforderlich?', type: 'text', placeholder: 'ja (§ 39 AufenthG) / nein (§ 32 BeschV)' },
    ],
    render: f => `An ${f.behoerde || '[Ausländerbehörde]'}

Antrag auf Erteilung der Erlaubnis zur Erwerbstätigkeit
gem. § 4a AufenthG

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'} (aktueller Status: ${f.aktuellerStatus || '[Status]'}), beantrage ich

die Erteilung der Erlaubnis zur Ausübung einer Erwerbstätigkeit

gem. § 4a Abs. 1 und 2 AufenthG durch Eintragung des Zusatzes „Erwerbstätigkeit gestattet" in den Aufenthaltstitel bzw. die Bescheinigung meiner Mandantschaft.

I. Angaben zum Arbeitsverhältnis

Arbeitgeber:in: ${f.arbeitgeber || '[Arbeitgeber:in]'}
Tätigkeit: ${f.stelle || '[Stellenbezeichnung]'}
Vertragslaufzeit: ${f.vertragslaufzeit || '—'}
Bruttovergütung: ${f.bruttolohn || '—'}

Der Arbeitsvertrag sowie die „Erklärung zum Beschäftigungsverhältnis" der BA liegen bei.

II. Zustimmung der Bundesagentur für Arbeit

${(f.baZustimmung || '').toLowerCase().startsWith('ja') ? 'Die Zustimmung der Bundesagentur für Arbeit gem. §§ 39, 40 AufenthG ist einzuholen. Ich bitte die Ausländerbehörde, das Verfahren über das einheitliche Zustimmungsverfahren anzustoßen. Die Arbeitsbedingungen entsprechen den tariflichen bzw. ortsüblichen Bedingungen (§ 39 Abs. 3 AufenthG).' : 'Eine Zustimmung der Bundesagentur für Arbeit ist nicht erforderlich (zustimmungsfreie Beschäftigung gem. BeschV). Die einschlägige Norm ist in den Anlagen dargestellt.'}

III. Ermessen / gebundene Entscheidung

Die Voraussetzungen liegen vor; im Rahmen des Ermessens (soweit einschlägig) überwiegt das Integrationsinteresse meiner Mandantschaft sowie das Interesse des Arbeitgebers an einer zeitnahen Aufnahme der Beschäftigung.

IV. Eilbedürftigkeit

Der Arbeitsantritt ist auf den im Vertrag genannten Termin datiert. Eine Entscheidung innerhalb von drei Wochen wird höflich erbeten; andernfalls droht der Verlust des Arbeitsplatzes.

V. Anlagen

— Arbeitsvertrag
— „Erklärung zum Beschäftigungsverhältnis" (BA-Vordruck)
— Stellenbeschreibung
— Nachweis beruflicher Qualifikation
— Kopie Aufenthaltstitel / Duldung / Gestattung

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'einbuergerung_antrag',
    title: 'Einbürgerungsantrag',
    description: 'Antrag auf Einbürgerung gem. §§ 8, 9, 10 StAG (Regelfrist 5 Jahre, bei besonderen Integrationsleistungen 3 Jahre).',
    useCase: 'Mandantschaft lebt langjährig und rechtmäßig in Deutschland und möchte die deutsche Staatsangehörigkeit erwerben. Seit Reform des StAG 2024 ist Mehrstaatigkeit grundsätzlich zulässig.',
    fields: [
      { id: 'behoerde', label: 'Einbürgerungsbehörde', type: 'text', required: true, placeholder: 'LEA Berlin — Staatsangehörigkeitsbehörde' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'mandantAnschrift', label: 'Anschrift Mandant:in', type: 'textarea' },
      { id: 'bisherigeStaatsang', label: 'Bisherige Staatsangehörigkeit(en)', type: 'text', required: true },
      { id: 'aufenthaltSeit', label: 'Rechtmäßiger Aufenthalt in DE seit', type: 'date', required: true, hint: '§ 10 Abs. 1 Nr. 3 StAG — 5 bzw. 3 Jahre.' },
      { id: 'sprachnachweis', label: 'Sprachnachweis', type: 'text', placeholder: 'B1 (§ 10 Abs. 1 Nr. 6) bzw. C1 bei 3-Jahres-Variante' },
      { id: 'einbuergerungstest', label: 'Einbürgerungstest', type: 'text', placeholder: 'Zertifikat v. ... / Befreiung gem. § 10 Abs. 6 StAG' },
      { id: 'lebensunterhalt', label: 'Sicherung Lebensunterhalt', type: 'textarea', hint: 'Keine Leistungen nach SGB II/XII (§ 10 Abs. 1 Nr. 3 StAG) — Ausnahmen bei Unverschulden.' },
    ],
    render: f => `An ${f.behoerde || '[Einbürgerungsbehörde]'}

Antrag auf Einbürgerung
gem. §§ 8, 10 StAG

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}${f.mandantAnschrift ? `, wohnhaft ${f.mandantAnschrift.replace(/\n/g, ', ')}` : ''}, bisher ${f.bisherigeStaatsang || '[Staatsangehörigkeit]'}, beantrage ich

die Einbürgerung in den deutschen Staatsverband

gem. § 10 StAG, hilfsweise § 8 StAG.

I. Rechtmäßiger gewöhnlicher Aufenthalt (§ 10 Abs. 1 Nr. 1 StAG)

Meine Mandantschaft hält sich seit ${f.aufenthaltSeit || '[Datum]'} rechtmäßig und mit gewöhnlichem Aufenthalt im Bundesgebiet auf. Die Voraussetzungen der 5-Jahres-Frist (§ 10 Abs. 1 Nr. 1 StAG) — ggf. der 3-Jahres-Frist bei besonderen Integrationsleistungen (§ 10 Abs. 3 StAG n. F.) — sind erfüllt.

II. Bekenntnis zur freiheitlichen demokratischen Grundordnung (§ 10 Abs. 1 Nr. 1 StAG)

Meine Mandantschaft bekennt sich zur freiheitlichen demokratischen Grundordnung des Grundgesetzes und erklärt, keine Bestrebungen verfolgt zu haben oder zu verfolgen, die gegen sie gerichtet sind. Eine entsprechende Loyalitätserklärung liegt bei.

III. Aufenthaltsrechtlicher Status (§ 10 Abs. 1 Nr. 2 StAG)

Meine Mandantschaft ist im Besitz eines nach § 10 Abs. 1 Nr. 2 StAG einbürgerungsgeeigneten Aufenthaltstitels (Nachweis als Anlage).

IV. Sicherung des Lebensunterhalts (§ 10 Abs. 1 Nr. 3 StAG)

${f.lebensunterhalt || '[Darlegung, dass der Lebensunterhalt ohne Inanspruchnahme von SGB II-/XII-Leistungen gesichert ist; ggf. Ausnahmen des § 10 Abs. 1 Nr. 3 a. E. StAG.]'}

V. Sprachkenntnisse (§ 10 Abs. 1 Nr. 6 StAG)

Ausreichende Deutschkenntnisse sind nachgewiesen durch: ${f.sprachnachweis || '[Sprachnachweis]'}.

VI. Staatsbürgerliche Kenntnisse (§ 10 Abs. 1 Nr. 7 StAG)

Kenntnisse der Rechts- und Gesellschaftsordnung: ${f.einbuergerungstest || 'bestandener Einbürgerungstest (Zertifikat als Anlage)'}.

VII. Straffreiheit (§ 10 Abs. 1 Nr. 5, § 12a StAG)

Meine Mandantschaft ist strafrechtlich nicht in einem einbürgerungsschädlichen Umfang in Erscheinung getreten; ein Führungszeugnis wird von der Behörde eingeholt (§ 41 StAG).

VIII. Mehrstaatigkeit

Nach dem Gesetz zur Modernisierung des Staatsangehörigkeitsrechts ist die bisherige Staatsangehörigkeit grundsätzlich beizubehalten (§ 12 StAG n. F.); ein Entlassungsverfahren ist nicht erforderlich.

IX. Anlagen

— Lebenslauf
— Pass / Passersatz und Aufenthaltstitel
— Einkommensnachweise der letzten 12 Monate
— B1-/C1-Zertifikat, Einbürgerungstest
— Loyalitätserklärung
— Meldebescheinigung, Geburts- und ggf. Eheurkunde

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'widerspruch_ablehnung_aufenthalt',
    title: 'Widerspruch gegen Ablehnung Aufenthaltstitel',
    description: 'Widerspruch gegen einen ablehnenden Bescheid der Ausländerbehörde gem. §§ 68 ff. VwGO — Frist 1 Monat (§ 70 VwGO)!',
    useCase: 'Ausländerbehörde hat einen Antrag (Erteilung, Verlängerung, Niederlassung) abgelehnt. Statthafter Rechtsbehelf ist — soweit das Vorverfahren nicht landesrechtlich abgeschafft ist — der Widerspruch binnen eines Monats. In Berlin/Brandenburg: unmittelbar Verpflichtungsklage!',
    fields: [
      { id: 'behoerde', label: 'Ausländerbehörde (Widerspruchsgegnerin)', type: 'text', required: true },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'bescheidDatum', label: 'Datum des Bescheids', type: 'date', required: true, hint: 'Frist § 70 VwGO: 1 Monat ab Bekanntgabe!' },
      { id: 'aktenzeichen', label: 'Aktenzeichen Bescheid', type: 'text', required: true },
      { id: 'bescheidGegenstand', label: 'Gegenstand des Bescheids', type: 'text', placeholder: 'Ablehnung der Verlängerung § 28 AufenthG' },
      { id: 'begruendung', label: 'Widerspruchsbegründung', type: 'textarea', required: true, hint: 'Sach- und Rechtsfehler, neue Tatsachen, Ermessensfehler.' },
    ],
    render: f => `An ${f.behoerde || '[Ausländerbehörde]'}

Widerspruch
in der Ausländersache ${f.mandant || '[Mandant:in]'}
gegen den Bescheid vom ${f.bescheidDatum || '[Datum]'}, Az. ${f.aktenzeichen || '[Aktenzeichen]'}
${f.bescheidGegenstand ? `— ${f.bescheidGegenstand} —` : ''}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}, lege ich gegen den oben bezeichneten Bescheid

W i d e r s p r u c h

ein und beantrage,

1. den angefochtenen Bescheid aufzuheben,
2. dem Antrag meiner Mandantschaft in vollem Umfang stattzugeben,
3. hilfsweise, die Sache unter Beachtung der Rechtsauffassung der Widerspruchsbehörde erneut zu bescheiden.

Die Widerspruchsfrist des § 70 Abs. 1 VwGO ist gewahrt.

I. Sachverhalt

Auf den Akteninhalt wird Bezug genommen. Ergänzende Tatsachen werden im Rahmen der Begründung vorgetragen.

II. Begründung

${f.begruendung || '[Ausführliche rechtliche Begründung: Verkennung der Tatsachen, fehlerhafte Anwendung der §§ AufenthG, Ermessensfehler (§ 114 VwGO), Verhältnismäßigkeit, Art. 6 GG / Art. 8 EMRK bei familiärem Bezug.]'}

III. Aufschiebende Wirkung

Der Widerspruch entfaltet aufschiebende Wirkung (§ 80 Abs. 1 VwGO), soweit diese nicht nach § 84 AufenthG entfällt. Vorsorglich beantrage ich im Falle des § 84 AufenthG die Anordnung bzw. Wiederherstellung der aufschiebenden Wirkung gem. § 80 Abs. 4 VwGO bei der Behörde sowie ggf. § 80 Abs. 5 VwGO beim Verwaltungsgericht.

IV. Abhilfe

Ich rege eine Abhilfeentscheidung gem. § 72 VwGO an. Andernfalls bitte ich um Vorlage an die Widerspruchsbehörde und Akteneinsicht gem. § 29 VwVfG.

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'eilantrag_abschiebung',
    title: 'Eilantrag gegen Abschiebung (§ 80 Abs. 5 VwGO)',
    description: 'Antrag auf Anordnung / Wiederherstellung der aufschiebenden Wirkung beim Verwaltungsgericht gegen eine Abschiebungsanordnung.',
    useCase: 'Mandantschaft ist von drohender Abschiebung betroffen. Höchste Eilbedürftigkeit — Antrag muss vor Vollzug gestellt werden; ggf. zusätzlich „Hängebeschluss" nach § 123 VwGO analog.',
    fields: [
      { id: 'gericht', label: 'Verwaltungsgericht', type: 'text', required: true, placeholder: 'Verwaltungsgericht Berlin' },
      { id: 'mandant', label: 'Mandant:in (Antragsteller:in)', type: 'text', required: true },
      { id: 'mandantAnschrift', label: 'Anschrift / Unterbringung', type: 'textarea', placeholder: 'Abschiebungshaft JVA Berlin-Grünau' },
      { id: 'antragsgegnerin', label: 'Antragsgegnerin (Behörde)', type: 'text', required: true, placeholder: 'Land Berlin, vertreten durch das LEA' },
      { id: 'anordnungDatum', label: 'Datum der Abschiebungsanordnung', type: 'date', required: true },
      { id: 'aktenzeichen', label: 'Aktenzeichen der Behörde', type: 'text' },
      { id: 'eilbeduerftigkeit', label: 'Eilbedürftigkeit', type: 'textarea', required: true, placeholder: 'Flug gebucht auf ..., Vollzug unmittelbar bevorstehend' },
      { id: 'haerte', label: 'Härtegründe / Rechtsverstöße', type: 'textarea', required: true, hint: 'Art. 6 GG, Art. 8 EMRK, Art. 3 EMRK, Krankheit, familiäre Bindung.' },
    ],
    render: f => `An das ${f.gericht || '[Verwaltungsgericht]'}

Antrag nach § 80 Abs. 5 VwGO (Eilantrag)

in dem verwaltungsgerichtlichen Verfahren

${f.mandant || '[Mandant:in]'}${f.mandantAnschrift ? `, derzeit ${f.mandantAnschrift.replace(/\n/g, ', ')}` : ''}
— Antragsteller:in —
Prozessbevollmächtigte: Unterzeichnerin / Unterzeichner

gegen

${f.antragsgegnerin || '[Antragsgegnerin]'}
— Antragsgegnerin —

wegen Abschiebungsanordnung vom ${f.anordnungDatum || '[Datum]'}${f.aktenzeichen ? `, Az. ${f.aktenzeichen}` : ''}

namens und in Vollmacht der/des Antragstellerin:s beantrage ich,

1. die aufschiebende Wirkung des gleichzeitig erhobenen Widerspruchs / der Klage gegen die Abschiebungsanordnung vom ${f.anordnungDatum || '[Datum]'} gem. § 80 Abs. 5 VwGO anzuordnen bzw. wiederherzustellen,
2. der Antragsgegnerin im Wege des Hängebeschlusses aufzugeben, bis zur Entscheidung über diesen Eilantrag von Vollzugsmaßnahmen — insbesondere der Abschiebung — abzusehen,
3. der Antragsgegnerin die Kosten des Verfahrens aufzuerlegen,
4. meiner Mandantschaft Prozesskostenhilfe zu bewilligen und die Unterzeichnerin / den Unterzeichner beizuordnen (§ 166 VwGO i. V. m. §§ 114 ff. ZPO).

I. Sachverhalt

${f.eilbeduerftigkeit || '[Darstellung der unmittelbaren Vollzugsgefahr, Buchung Flug, Termin, Ingewahrsamnahme.]'}

II. Zulässigkeit

Der Antrag ist statthaft nach § 80 Abs. 5 VwGO. Eine aufschiebende Wirkung entfällt gem. § 84 Abs. 1 AufenthG bzw. § 75 AsylG, sodass die gerichtliche Anordnung geboten ist.

III. Begründetheit — Interessenabwägung

Das Suspensivinteresse meiner Mandantschaft überwiegt das Vollzugsinteresse der Antragsgegnerin erheblich:

${f.haerte || '[Ausführungen zu Art. 6 GG (Familie), Art. 8 EMRK (Privatleben), Art. 3 EMRK (Behandlung im Zielstaat), gesundheitlichen Abschiebungsverboten nach § 60 Abs. 7 AufenthG, Reiseunfähigkeit.]'}

Die Abschiebung würde irreparable Nachteile verursachen; der Bescheid erweist sich zudem bei summarischer Prüfung als offensichtlich rechtswidrig.

IV. Glaubhaftmachung

Zur Glaubhaftmachung dienen die anliegenden Unterlagen sowie die anwaltlich versicherten Angaben.

V. Anlagen

— Abschiebungsanordnung in Kopie
— Widerspruch / Klageschrift
— Atteste, Urkunden, eidesstattliche Versicherungen
— PKH-Erklärung nebst Belegen

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'fiktionsbescheinigung',
    title: 'Antrag auf Fiktionsbescheinigung',
    description: 'Antrag auf Ausstellung einer Fiktionsbescheinigung gem. § 81 Abs. 5 AufenthG i. V. m. § 81 Abs. 4 AufenthG.',
    useCase: 'Laufender Aufenthaltstitel läuft ab, Verlängerungsantrag ist rechtzeitig gestellt — die Behörde zögert die Entscheidung hinaus. Fiktionsbescheinigung wird für Arbeit, Reise, Banken benötigt.',
    fields: [
      { id: 'behoerde', label: 'Ausländerbehörde', type: 'text', required: true },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'ablaufenderTitel', label: 'Ablaufender Aufenthaltstitel', type: 'text', required: true, placeholder: 'AE § 18b AufenthG, gültig bis 12.05.2026' },
      { id: 'antragEingang', label: 'Verlängerungsantrag eingegangen am', type: 'date', required: true, hint: 'Fristwahrung § 81 Abs. 4 AufenthG.' },
      { id: 'eilbeduerftigkeit', label: 'Eilbedürftigkeit', type: 'textarea', required: true, placeholder: 'Dienstreise ins Ausland am ..., Arbeitgeber fordert Nachweis, Bank sperrt Konto' },
    ],
    render: f => `An ${f.behoerde || '[Ausländerbehörde]'}

Antrag auf Ausstellung einer Fiktionsbescheinigung
gem. § 81 Abs. 5 i. V. m. Abs. 4 AufenthG

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}, beantrage ich die unverzügliche

Ausstellung einer Fiktionsbescheinigung

gem. § 81 Abs. 5 AufenthG.

I. Rechtzeitige Antragstellung (§ 81 Abs. 4 AufenthG)

Meine Mandantschaft ist Inhaberin / Inhaber des Aufenthaltstitels ${f.ablaufenderTitel || '[Titel]'}. Der Antrag auf Verlängerung bzw. Erteilung eines neuen Titels wurde am ${f.antragEingang || '[Datum]'} und damit vor Ablauf des bisherigen Titels bei der Behörde eingereicht. Der bisherige Titel gilt gem. § 81 Abs. 4 S. 1 AufenthG bis zur Entscheidung der Behörde als fortbestehend.

II. Eilbedürftigkeit

${f.eilbeduerftigkeit || '[Konkrete Nachteile ohne Bescheinigung: Arbeitsplatzverlust, Reise, Sozialleistungsbezug, Bank, Mietvertrag.]'}

Ohne Aushändigung einer Fiktionsbescheinigung ist meine Mandantschaft nicht in der Lage, den Fortbestand des Aufenthaltstitels gegenüber Dritten (Arbeitgeber, Banken, Grenzbehörden) nachzuweisen. Dies ist mit dem Sinn und Zweck des § 81 Abs. 4 AufenthG unvereinbar.

III. Rechtsanspruch

§ 81 Abs. 5 AufenthG begründet einen Anspruch auf Ausstellung der Bescheinigung; ein Ermessen besteht insoweit nicht. Die Behörde ist zur unverzüglichen Ausstellung verpflichtet.

IV. Bitte um Terminvergabe

Ich bitte um kurzfristige Terminvergabe innerhalb der nächsten zehn Tage und weise vorsorglich darauf hin, dass bei weiterer Verzögerung ein Eilrechtsschutzverfahren nach § 123 VwGO geprüft werden wird.

V. Anlagen

— bisheriger Aufenthaltstitel (Kopie)
— Eingangsbestätigung des Verlängerungsantrags
— Nachweise Eilbedürftigkeit (Arbeitgeber-Bescheinigung, Reisebuchung etc.)

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'haertefall_antrag',
    title: 'Härtefallantrag (§ 23a AufenthG)',
    description: 'Antrag auf Ersuchen der Härtefallkommission um Erteilung einer Aufenthaltserlaubnis aus dringenden humanitären oder persönlichen Gründen.',
    useCase: 'Mandantschaft ist ausreisepflichtig, aber tief in Deutschland verwurzelt; andere Wege sind ausgeschöpft. Die Härtefallkommission des Landes kann ein Ersuchen an die oberste Landesbehörde richten (§ 23a AufenthG).',
    fields: [
      { id: 'kommission', label: 'Härtefallkommission (Bundesland)', type: 'text', required: true, placeholder: 'Härtefallkommission des Landes Berlin bei der Senatsverwaltung für Inneres' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'mandantDaten', label: 'Geburtsdatum / Staatsangehörigkeit', type: 'text' },
      { id: 'aufenthaltSeit', label: 'Aufenthalt in Deutschland seit', type: 'date', required: true },
      { id: 'aktuellerStatus', label: 'Aktueller Status', type: 'text', placeholder: 'Duldung § 60a AufenthG seit ...' },
      { id: 'verwurzelung', label: 'Soziale und wirtschaftliche Verwurzelung', type: 'textarea', required: true, hint: 'Arbeit, Sprache, Familie, Schule der Kinder, Ehrenamt.' },
      { id: 'haertegruende', label: 'Besondere Härtegründe', type: 'textarea', required: true, hint: 'Warum wäre die Ausreise unzumutbar? Krankheit, Kinder, kulturelle Entwurzelung.' },
    ],
    render: f => `An die ${f.kommission || '[Härtefallkommission]'}

Eingabe an die Härtefallkommission
gem. § 23a AufenthG i. V. m. der Härtefallkommissionsverordnung des Landes

in der Ausländersache ${f.mandant || '[Mandant:in]'}${f.mandantDaten ? ` (${f.mandantDaten})` : ''}

Sehr geehrte Mitglieder der Härtefallkommission,

namens und im Auftrag meiner Mandantschaft wende ich mich mit der Bitte an die Kommission,

ein Ersuchen an die oberste Landesbehörde zu richten,

der oder dem Mandantin / Mandanten abweichend von den Erteilungs- und Verlängerungsvoraussetzungen des Aufenthaltsgesetzes eine Aufenthaltserlaubnis gem. § 23a AufenthG zu erteilen.

I. Persönliche Verhältnisse

Meine Mandantschaft hält sich seit ${f.aufenthaltSeit || '[Datum]'} ununterbrochen im Bundesgebiet auf. Aktueller Status: ${f.aktuellerStatus || '[Status]'}.

II. Soziale und wirtschaftliche Verwurzelung

${f.verwurzelung || '[Dichte Schilderung: Sprachniveau, Erwerbstätigkeit, Familie, Schule/Ausbildung der Kinder, Wohnsituation, Ehrenamt, Freundeskreis.]'}

III. Besondere Härtegründe (§ 23a Abs. 1 AufenthG)

${f.haertegruende || '[Warum rechtfertigen die persönlichen Umstände eine Aufenthaltsgewährung aus dringenden humanitären oder persönlichen Gründen? Warum wäre die Ausreise eine besondere Härte — Krankheit, Kindeswohl, Entwurzelung, Bleibeinteresse Art. 8 EMRK.]'}

IV. Ausschlussgründe

Ausschlussgründe i. S. d. § 23a Abs. 1 S. 3 AufenthG (schwere Straftaten, Bezug zu Extremismus) liegen nicht vor. Die Passbeschaffung ist — soweit erforderlich — eingeleitet bzw. unmöglich und wird nachgewiesen.

V. Sicherung des Lebensunterhalts / Verpflichtungserklärung

Der Lebensunterhalt ist gesichert bzw. kann durch die beigefügte Verpflichtungserklärung gesichert werden. Ein Bezug öffentlicher Leistungen ist nicht bzw. nur in unvermeidbarem Umfang gegeben.

VI. Anträge

Ich bitte die Kommission,
1. die Sache zur Beratung und Entscheidung anzunehmen,
2. ein Ersuchen gem. § 23a AufenthG an die oberste Landesbehörde zu richten,
3. bis zur Entscheidung bei der Ausländerbehörde auf Aussetzung etwaiger aufenthaltsbeendender Maßnahmen hinzuwirken.

VII. Anlagen

— Lebenslauf, Lichtbild
— Nachweise Aufenthalt, Duldungen
— Arbeits-/Ausbildungsnachweise, Sprachzertifikate
— Schul- und Zeugnisbescheinigungen der Kinder
— ärztliche Atteste
— Referenzschreiben (Arbeitgeber, Schule, Gemeinde, Nachbarschaft)

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'familienasyl_antrag',
    title: 'Antrag auf Familienasyl / Familienflüchtlingsschutz',
    description: 'Antrag gem. § 26 AsylG auf Ableitung des Schutzstatus von einer stammberechtigten Person.',
    useCase: 'Stammberechtigte Person hat bestandskräftig Asyl, Flüchtlingsschutz oder subsidiären Schutz; Ehegatt:in oder minderjähriges lediges Kind leitet den Status ab.',
    fields: [
      { id: 'bamf', label: 'Empfänger:in', type: 'text', required: true, placeholder: 'Bundesamt für Migration und Flüchtlinge, Außenstelle Berlin' },
      { id: 'antragsteller', label: 'Antragsteller:in', type: 'text', required: true },
      { id: 'antragstellerDaten', label: 'Geburtsdatum / Staatsangehörigkeit', type: 'text' },
      { id: 'stamm', label: 'Stammberechtigte Person', type: 'text', required: true, hint: 'Name, BAMF-Az.' },
      { id: 'verhaeltnis', label: 'Verwandtschaftsverhältnis', type: 'text', required: true, placeholder: 'Ehegatte / minderjähriges lediges Kind / Elternteil eines minderj. Stammberechtigten' },
      { id: 'bestandskraft', label: 'Bestandskraft der Stamm-Anerkennung', type: 'date', required: true, hint: '§ 26 Abs. 1 Nr. 3 / Abs. 2 Nr. 2 / Abs. 3 Nr. 3 AsylG.' },
      { id: 'einreise', label: 'Einreise der/des Antragsteller:in', type: 'date', hint: '§ 26 Abs. 1 Nr. 2 AsylG — vor/innerhalb welcher Frist?' },
    ],
    render: f => `An das ${f.bamf || '[Bundesamt für Migration und Flüchtlinge]'}

Antrag auf Familienasyl / Familienflüchtlingsschutz / internationalen Schutz
gem. § 26 AsylG

in der Asylsache ${f.antragsteller || '[Antragsteller:in]'}${f.antragstellerDaten ? ` (${f.antragstellerDaten})` : ''}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich

die Zuerkennung der Flüchtlingseigenschaft bzw. Anerkennung als Asylberechtigte:r, hilfsweise die Zuerkennung des subsidiären Schutzstatus,

abgeleitet gem. § 26 AsylG von der stammberechtigten Person.

I. Stammberechtigte Person

${f.stamm || '[Name und Aktenzeichen der stammberechtigten Person]'} wurde mit unanfechtbarem Bescheid des Bundesamtes vom ${f.bestandskraft || '[Datum]'} als Asylberechtigte:r anerkannt bzw. ihr/ihm wurde die Flüchtlingseigenschaft oder der subsidiäre Schutzstatus zuerkannt. Die Bestandskraft ist gewahrt (§ 26 Abs. 1 Nr. 3, Abs. 2 Nr. 2, Abs. 3 Nr. 3 AsylG).

II. Verwandtschaftsverhältnis

Meine Mandantschaft steht zu der stammberechtigten Person in folgendem Verhältnis: ${f.verhaeltnis || '[Verhältnis]'}. Die Verwandtschaft wird durch die anliegenden Personenstandsurkunden nachgewiesen.

III. Weitere Voraussetzungen

1. Die eheliche Lebensgemeinschaft / familiäre Lebensgemeinschaft bestand bereits in dem Staat, in dem die stammberechtigte Person politisch verfolgt wird (§ 26 Abs. 1 Nr. 2 AsylG).
2. Die Einreise der/des Antragsteller:in erfolgte am ${f.einreise || '[Einreisedatum]'}; der Antrag wird unverzüglich nach der Einreise gestellt (§ 26 Abs. 1 Nr. 1 AsylG).
3. Ausschlussgründe nach § 26 Abs. 4 AsylG (§§ 3 Abs. 2, 4 Abs. 2 AsylG) liegen nicht vor.

IV. Minderjährigkeit (bei Kindernachzug)

Sofern der Antrag für ein minderjähriges lediges Kind gestellt wird: Die Minderjährigkeit bestand auch zum Zeitpunkt der Asylantragstellung der stammberechtigten Person bzw. ist gem. § 26 Abs. 2 AsylG maßgeblich.

V. Antrag auf bevorzugte Bearbeitung

Da die familiäre Trennung Grundrechtspositionen aus Art. 6 GG und Art. 8 EMRK berührt, bitte ich um vorrangige Bearbeitung und Anhörung.

VI. Anlagen

— Pass / Passersatz
— Geburts- und Heiratsurkunden mit Apostille
— Anerkennungsbescheid der stammberechtigten Person
— Nachweise zur Einreise
— Anhörungsvorbereitung folgt gesondert

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },
]

/**
 * Familienrecht-Pack — 10 Templates für Scheidung, Sorge, Umgang, Unterhalt,
 * Versorgungsausgleich, Gewaltschutz, Vaterschaftsfeststellung. Düsseldorfer-
 * Tabelle-Hinweise wo relevant. Frist-Hinweise besonders bei GewSchG (§ 214 FamFG)
 * und Abänderungsanträgen (§ 238 FamFG).
 */
export const FAMILIE_TEMPLATES: LawyerTemplate[] = [
  {
    id: 'scheidungsantrag',
    title: 'Scheidungsantrag (§ 1565 BGB)',
    description: 'Antrag auf Scheidung der Ehe nach Ablauf des Trennungsjahres.',
    useCase: 'Mandant:in ist seit mindestens einem Jahr getrennt lebend (§ 1565 Abs. 1 BGB) und möchte die Scheidung einreichen. Einzureichend beim zuständigen Familiengericht (§ 121 FamFG).',
    fields: [
      { id: 'gericht', label: 'Familiengericht (Ort)', type: 'text', required: true, placeholder: 'Amtsgericht Berlin-Tempelhof-Kreuzberg – Familiengericht' },
      { id: 'antragsteller', label: 'Antragsteller:in (Mandant:in)', type: 'text', required: true, placeholder: 'Maria Mustermann, geb. 01.01.1980, wohnhaft …' },
      { id: 'antragsgegner', label: 'Antragsgegner:in', type: 'text', required: true, placeholder: 'Thomas Mustermann, geb. 15.03.1978, wohnhaft …' },
      { id: 'heiratsdatum', label: 'Datum der Eheschließung', type: 'date', required: true },
      { id: 'trennungsdatum', label: 'Datum der Trennung', type: 'date', required: true, hint: 'Trennungsjahr muss zum Zeitpunkt der mündlichen Verhandlung vollendet sein (§ 1565 Abs. 1 BGB).' },
      { id: 'kinder', label: 'Minderjährige Kinder (Namen, Geburtsdaten)', type: 'textarea', placeholder: 'Lena Mustermann, geb. 10.05.2015\nPaul Mustermann, geb. 22.08.2018' },
      { id: 'versorgungsausgleich', label: 'Versorgungsausgleich durchführen?', type: 'text', required: true, placeholder: 'ja / nein / Ausschluss vereinbart (Notarvertrag vom …)' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Heiratsurkunde, Geburtsurkunden der Kinder, Scheidungsfolgenvereinbarung (soweit vorhanden)' },
    ],
    render: f => `An das
${f.gericht || '[Familiengericht]'}

Scheidungsantrag
gem. §§ 1564, 1565 BGB i. V. m. §§ 121 ff. FamFG

Antragsteller:in: ${f.antragsteller || '[Antragsteller:in]'}
— vertreten durch Unterzeichner:in —

Antragsgegner:in: ${f.antragsgegner || '[Antragsgegner:in]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich,

die am ${f.heiratsdatum || '[Datum]'} geschlossene Ehe der Beteiligten

z u   s c h e i d e n .

Begründung

I. Trennungsjahr (§ 1565 Abs. 1 BGB)

Die Beteiligten leben seit dem ${f.trennungsdatum || '[Datum]'} getrennt im Sinne des § 1567 BGB. Das Trennungsjahr ist damit abgelaufen bzw. wird bis zur mündlichen Verhandlung vollendet sein. Die Ehe ist unwiederbringlich gescheitert.

II. Minderjährige Kinder

${f.kinder ? f.kinder : 'Aus der Ehe sind keine minderjährigen Kinder hervorgegangen.'}

III. Versorgungsausgleich (§§ 1587 ff. BGB, VersAusglG)

${f.versorgungsausgleich ? `Versorgungsausgleich: ${f.versorgungsausgleich}` : 'Zur Durchführung des Versorgungsausgleichs werden die erforderlichen Auskünfte der Versorgungsträger erbeten.'}

IV. Anlagen

${f.anlagen || '—'}

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'antrag_versorgungsausgleich',
    title: 'Antrag auf Durchführung / Ausschluss des Versorgungsausgleichs (§ 1587 BGB / VersAusglG)',
    description: 'Antrag auf Durchführung oder einvernehmlichen Ausschluss des Versorgungsausgleichs im Scheidungsverbund.',
    useCase: 'Scheidungsverfahren anhängig; Versorgungsausgleich ist von Amts wegen zu regeln (§ 137 Abs. 2 FamFG). Ausschluss nur durch notariell beurkundete Vereinbarung gem. § 6 VersAusglG möglich.',
    fields: [
      { id: 'gericht', label: 'Familiengericht / Aktenzeichen', type: 'text', required: true, placeholder: 'AG Berlin-Mitte, Az. 123 F 456/25' },
      { id: 'antragsteller', label: 'Antragsteller:in', type: 'text', required: true },
      { id: 'antragsgegner', label: 'Antragsgegner:in', type: 'text', required: true },
      { id: 'ehezeit', label: 'Ehezeit (§ 3 VersAusglG)', type: 'text', required: true, placeholder: '01.03.2005 – 28.02.2025 (Monat vor Zustellung)' },
      { id: 'versorgungen', label: 'Bekannte Versorgungsanrechte (Beschreibung)', type: 'textarea', required: true, placeholder: 'Deutsche Rentenversicherung (beide), bAV Arbeitgeber Antragsteller:in, Beamtenversorgung Antragsgegner:in' },
      { id: 'ausschluss', label: 'Ausschlussvereinbarung vorhanden?', type: 'text', placeholder: 'Notarvertrag vom … (Anlage beigefügt)' },
    ],
    render: f => `An das
${f.gericht || '[Familiengericht]'}

Antrag auf Durchführung des Versorgungsausgleichs
gem. §§ 1 ff. VersAusglG i. V. m. § 137 Abs. 2 FamFG

Antragsteller:in: ${f.antragsteller || '[Antragsteller:in]'}
Antragsgegner:in: ${f.antragsgegner || '[Antragsgegner:in]'}

Sehr geehrte Damen und Herren,

im laufenden Scheidungsverfahren beantrage ich,

den V e r s o r g u n g s a u s g l e i c h

für die Ehezeit vom ${f.ehezeit || '[Ehezeit]'} gem. § 3 VersAusglG durchzuführen.

I. Bekannte Versorgungsanrechte

${f.versorgungen || '[Versorgungsanrechte]'}

Ich beantrage, bei allen in Betracht kommenden Versorgungsträgern Auskünfte nach § 220 FamFG einzuholen.

${f.ausschluss ? `II. Ausschlussvereinbarung\n\nDie Beteiligten haben den Versorgungsausgleich notariell ausgeschlossen (${f.ausschluss}, Anlage). Ich beantrage, den Versorgungsausgleich gem. § 6 Abs. 1 VersAusglG nicht durchzuführen.` : ''}

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'sorgerecht_antrag',
    title: 'Antrag auf Übertragung des alleinigen Sorgerechts (§ 1671 BGB)',
    description: 'Antrag auf Übertragung der alleinigen elterlichen Sorge auf einen Elternteil.',
    useCase: 'Eltern leben getrennt; ein Elternteil beantragt alleinige Sorge, weil gemeinsame Ausübung dem Kindeswohl widerspricht (§ 1671 Abs. 1 S. 2 BGB). Zuständig: Familiengericht (§ 151 Nr. 1 FamFG).',
    fields: [
      { id: 'gericht', label: 'Familiengericht / Aktenzeichen', type: 'text', required: true, placeholder: 'AG Schöneberg – Familiengericht, Az. …' },
      { id: 'antragsteller', label: 'Antragsteller:in (Elternteil)', type: 'text', required: true },
      { id: 'antragsgegner', label: 'Antragsgegner:in (anderer Elternteil)', type: 'text', required: true },
      { id: 'kind', label: 'Kind (Name, Geburtsdatum)', type: 'text', required: true, placeholder: 'Lena Mustermann, geb. 10.05.2015' },
      { id: 'sorgerechtslage', label: 'Aktuelle Sorgerechtslage', type: 'text', required: true, placeholder: 'gemeinsames Sorgerecht seit Geburt' },
      { id: 'begruendung', label: 'Begründung (Kindeswohlgefährdung / fehlende Kooperationsfähigkeit)', type: 'textarea', required: true, hint: 'Konkrete Vorfälle schildern; Datum, Zeugen, Belege angeben.' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Geburtsurkunde, Schreiben des Jugendamts, ärztliche Berichte' },
    ],
    render: f => `An das
${f.gericht || '[Familiengericht]'}

Antrag auf Übertragung der alleinigen elterlichen Sorge
gem. § 1671 BGB i. V. m. §§ 151 Nr. 1, 155 FamFG

Antragsteller:in: ${f.antragsteller || '[Antragsteller:in]'}
Antragsgegner:in: ${f.antragsgegner || '[Antragsgegner:in]'}
Kind: ${f.kind || '[Kind]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich,

die elterliche Sorge für das Kind ${f.kind || '[Kind]'} auf die Antragsteller:in zu übertragen.

I. Sachverhalt und Ausgangslage

Sorgerechtslage bisher: ${f.sorgerechtslage || '[aktuell]'}

${f.begruendung || '[Begründung einfügen]'}

II. Rechtliche Würdigung

Die gemeinsame Ausübung der elterlichen Sorge ist dem Kindeswohl abträglich (§ 1671 Abs. 1 S. 2 BGB). Eine konstruktive Kooperation der Eltern ist dauerhaft nicht gewährleistet. Die Übertragung auf die Antragsteller:in dient dem Wohl des Kindes am besten.

III. Anlagen

${f.anlagen || '—'}

Ich beantrage ferner, das Jugendamt gem. § 162 FamFG zu beteiligen.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'umgangsrecht_antrag',
    title: 'Antrag auf Umgangsregelung (§ 1684 BGB)',
    description: 'Antrag auf gerichtliche Festsetzung oder Einschränkung des Umgangsrechts.',
    useCase: 'Umgang wird verweigert, willkürlich eingeschränkt oder muss zum Schutz des Kindes beschränkt werden. Zuständig: Familiengericht (§ 151 Nr. 2 FamFG).',
    fields: [
      { id: 'gericht', label: 'Familiengericht / Aktenzeichen', type: 'text', required: true, placeholder: 'AG Köln – Familiengericht, Az. …' },
      { id: 'antragsteller', label: 'Antragsteller:in', type: 'text', required: true },
      { id: 'antragsgegner', label: 'Antragsgegner:in', type: 'text', required: true },
      { id: 'kind', label: 'Kind (Name, Geburtsdatum)', type: 'text', required: true },
      { id: 'umgangsvorstellung', label: 'Gewünschte Umgangsregelung', type: 'textarea', required: true, placeholder: 'Jedes 2. Wochenende Fr 17 Uhr – So 18 Uhr, Hälfte der Schulferien, alternierend Weihnachten/Ostern' },
      { id: 'begruendung', label: 'Begründung (Warum ist gerichtliche Regelung nötig?)', type: 'textarea', required: true },
      { id: 'eilantrag', label: 'Eilantrag (einstweilige Anordnung) erforderlich?', type: 'text', placeholder: 'ja / nein' },
    ],
    render: f => `An das
${f.gericht || '[Familiengericht]'}

Antrag auf Regelung des Umgangsrechts
gem. § 1684 BGB i. V. m. §§ 151 Nr. 2, 155 FamFG${(f.eilantrag || '').toLowerCase().startsWith('ja') ? '\n— zugleich Antrag auf Erlass einer einstweiligen Anordnung gem. § 49 FamFG —' : ''}

Antragsteller:in: ${f.antragsteller || '[Antragsteller:in]'}
Antragsgegner:in: ${f.antragsgegner || '[Antragsgegner:in]'}
Kind: ${f.kind || '[Kind]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich, den Umgang wie folgt zu regeln:

${f.umgangsvorstellung || '[Umgangsregelung einfügen]'}

Begründung

${f.begruendung || '[Begründung einfügen]'}

Rechtlicher Hinweis

Gem. § 1684 Abs. 1 BGB hat das Kind das Recht auf Umgang mit beiden Elternteilen; jeder Elternteil ist zum Umgang verpflichtet und berechtigt. Eine Verweigerung ohne triftigen Grund verletzt dieses Recht und kann zur Verhängung von Ordnungsmitteln gem. § 89 FamFG führen.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'kindesunterhalt_antrag',
    title: 'Kindesunterhalt (§§ 1601, 1612a BGB – Düsseldorfer Tabelle)',
    description: 'Antrag auf Festsetzung / Abänderung von Kindesunterhalt nach der Düsseldorfer Tabelle.',
    useCase: 'Unterhaltspflichtiger zahlt nicht oder zu wenig. Titulierung durch Jugendamtsurkunde (§ 59 SGB VIII), vereinfachtes Verfahren (§§ 249 ff. FamFG) oder streitiges Verfahren.',
    fields: [
      { id: 'gericht', label: 'Familiengericht / Aktenzeichen', type: 'text', required: true, placeholder: 'AG Hamburg – Familiengericht, Az. …' },
      { id: 'antragsteller', label: 'Antragsteller:in (Kind, vertreten durch …)', type: 'text', required: true, placeholder: 'Lena Mustermann, geb. 10.05.2015, vertreten durch die Mutter Maria Mustermann' },
      { id: 'antragsgegner', label: 'Unterhaltspflichtiger / Antragsgegner:in', type: 'text', required: true },
      { id: 'altersgruppe', label: 'Altersgruppe des Kindes', type: 'text', required: true, placeholder: '0–5 Jahre / 6–11 Jahre / 12–17 Jahre / ab 18 Jahre' },
      { id: 'einkommensgruppe', label: 'Einkommensgruppe Unterhaltspflichtiger (Düss. Tabelle)', type: 'text', required: true, placeholder: 'Gruppe 2 (1.901–2.300 € Netto), Tabellenbetrag 2025: …' },
      { id: 'unterhaltsbetrag', label: 'Geforderter Monatsbetrag (€)', type: 'text', required: true, placeholder: '426' },
      { id: 'rueckstand', label: 'Rückstand (€, seit wann)', type: 'text', placeholder: '2.556 € seit Januar 2025' },
      { id: 'kindergeld', label: 'Kindergeld (Anrechnung gem. § 1612b BGB)', type: 'text', required: true, placeholder: '255 € / Monat – hälftig anzurechnen beim Mindesunterhalt' },
    ],
    render: f => `An das
${f.gericht || '[Familiengericht]'}

Antrag auf Festsetzung von Kindesunterhalt
gem. §§ 1601, 1602, 1610, 1612a BGB i. V. m. §§ 231, 249 ff. FamFG

Antragsteller:in: ${f.antragsteller || '[Kind / gesetzliche Vertretung]'}
Antragsgegner:in: ${f.antragsgegner || '[Unterhaltspflichtiger]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag beantrage ich, den Antragsgegner / die Antragsgegnerin zu verpflichten, an die Antragsteller:in laufenden Kindesunterhalt in Höhe von

monatlich € ${f.unterhaltsbetrag || '[Betrag]'}

ab Rechtshängigkeit zu zahlen.

I. Berechnung nach der Düsseldorfer Tabelle (Stand 01.01.2025)

Altersgruppe: ${f.altersgruppe || '[Altersgruppe]'}
Einkommensgruppe: ${f.einkommensgruppe || '[Einkommensgruppe]'}
Tabellenbetrag: € ${f.unterhaltsbetrag || '[Betrag]'} / Monat
Kindergeldanrechnung (§ 1612b BGB): ${f.kindergeld || '[Kindergeld]'}

Hinweis: Die Düsseldorfer Tabelle ist keine Rechtsnorm, wird aber von Familiengerichten bundesweit als Orientierungsmaßstab herangezogen (BGH FamRZ 2006, 99).

II. Rückstand

${f.rueckstand ? `Offener Rückstand: ${f.rueckstand}. Dieser ist ebenfalls geltend zu machen.` : 'Kein Rückstand geltend gemacht.'}

III. Leistungsfähigkeit des Unterhaltspflichtigen

Der/Die Antragsgegner:in ist leistungsfähig im Sinne des § 1603 BGB. Dem Selbstbehalt (Eigenbedarfsgrenze 2025: € 1.450 gegenüber minderjährigen Kindern laut Düsseldorfer Tabelle) kann Rechnung getragen werden.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'trennungsunterhalt_antrag',
    title: 'Trennungsunterhalt (§ 1361 BGB)',
    description: 'Antrag auf Zahlung von Trennungsunterhalt während des Getrenntlebens.',
    useCase: 'Ehegatten leben getrennt (noch kein rechtskräftiges Scheidungsurteil). Anspruch besteht ab Trennung; Mahnung empfohlen. Verfahren: § 231 FamFG.',
    fields: [
      { id: 'gericht', label: 'Familiengericht / Aktenzeichen', type: 'text', required: true },
      { id: 'antragsteller', label: 'Antragsteller:in (unterhaltsberechtigter Ehegatte)', type: 'text', required: true },
      { id: 'antragsgegner', label: 'Antragsgegner:in (unterhaltspflichtiger Ehegatte)', type: 'text', required: true },
      { id: 'trennungsdatum', label: 'Datum der Trennung', type: 'date', required: true },
      { id: 'einkommenAntragsgegner', label: 'Bereinigtes Nettoeinkommen Antragsgegner:in (€)', type: 'text', required: true, placeholder: '3.200 € netto/Monat' },
      { id: 'einkommenAntragsteller', label: 'Eigenes Einkommen Antragsteller:in (€)', type: 'text', placeholder: '0 € / 800 € Teilzeit' },
      { id: 'unterhaltsbetrag', label: 'Geforderter Monatsbetrag (€)', type: 'text', required: true, hint: 'Halbteilungsgrundsatz: (Einkommen AG − Einkommen AS) × 3/7, ggf. Erwerbstätigenbonus beachten.' },
      { id: 'rueckstand', label: 'Rückstand (€, ab wann)', type: 'text', placeholder: '3.000 € seit Trennung' },
    ],
    render: f => `An das
${f.gericht || '[Familiengericht]'}

Antrag auf Trennungsunterhalt
gem. § 1361 BGB i. V. m. § 231 Abs. 1 Nr. 2 FamFG

Antragsteller:in: ${f.antragsteller || '[Antragsteller:in]'}
Antragsgegner:in: ${f.antragsgegner || '[Antragsgegner:in]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich, den Antragsgegner / die Antragsgegnerin zu verpflichten, ab Rechtshängigkeit monatlich

€ ${f.unterhaltsbetrag || '[Betrag]'}

als Trennungsunterhalt zu zahlen.

I. Trennung

Die Beteiligten leben seit dem ${f.trennungsdatum || '[Datum]'} voneinander getrennt (§ 1567 BGB). Ein Scheidungsurteil liegt noch nicht vor.

II. Bedarfsberechnung (Halbteilungsgrundsatz)

Bereinigtes Nettoeinkommen Antragsgegner:in: ${f.einkommenAntragsgegner || '[Einkommen]'}
Eigenes Einkommen Antragsteller:in: ${f.einkommenAntragsteller || '—'}
Geforderter Unterhaltsbetrag: € ${f.unterhaltsbetrag || '[Betrag]'} / Monat

Der Anspruch ergibt sich aus dem Halbteilungsgrundsatz (BGH FamRZ 2005, 1817) unter Berücksichtigung des Erwerbstätigenbonus von 1/7. Der eheliche Lebensstandard (§ 1361 Abs. 1 BGB) ist maßgeblich.

III. Rückstand

${f.rueckstand ? `Offener Rückstand: ${f.rueckstand}. Dieser ist gesondert einzuklagen.` : 'Kein Unterhaltsrückstand geltend gemacht.'}

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'nachehelicher_unterhalt',
    title: 'Nachehelicher Unterhalt (§§ 1569 ff. BGB)',
    description: 'Antrag auf nachehelichen Ehegattenunterhalt nach rechtskräftiger Scheidung.',
    useCase: 'Ehe ist rechtskräftig geschieden. Anspruchsgrundlagen: Betreuungsunterhalt (§ 1570), Altersunterhalt (§ 1571), Krankheitsunterhalt (§ 1572), Aufstockungsunterhalt (§ 1573), Ausbildungsunterhalt (§ 1575). Befristung / Herabsetzung nach § 1578b BGB prüfen.',
    fields: [
      { id: 'gericht', label: 'Familiengericht / Aktenzeichen', type: 'text', required: true },
      { id: 'antragsteller', label: 'Antragsteller:in', type: 'text', required: true },
      { id: 'antragsgegner', label: 'Antragsgegner:in', type: 'text', required: true },
      { id: 'scheidungsdatum', label: 'Datum Rechtskraft Scheidungsurteil', type: 'date', required: true },
      { id: 'anspruchsgrundlage', label: 'Anspruchsgrundlage', type: 'text', required: true, placeholder: '§ 1570 BGB (Betreuungsunterhalt) – jüngstes Kind 4 Jahre' },
      { id: 'unterhaltsbetrag', label: 'Geforderter Monatsbetrag (€)', type: 'text', required: true },
      { id: 'befristung', label: 'Befristungsaspekte (§ 1578b BGB)', type: 'textarea', placeholder: 'Ehedauer 12 Jahre; Befristung auf 5 Jahre ab Scheidung beantragt / abzulehnen wegen ehebedingter Nachteile' },
    ],
    render: f => `An das
${f.gericht || '[Familiengericht]'}

Antrag auf nachehelichen Unterhalt
gem. ${f.anspruchsgrundlage ? f.anspruchsgrundlage.split('–')[0].trim() : '§§ 1569 ff. BGB'} i. V. m. § 231 Abs. 1 Nr. 2 FamFG

Antragsteller:in: ${f.antragsteller || '[Antragsteller:in]'}
Antragsgegner:in: ${f.antragsgegner || '[Antragsgegner:in]'}

Sehr geehrte Damen und Herren,

die Ehe der Beteiligten ist seit dem ${f.scheidungsdatum || '[Datum]'} rechtskräftig geschieden.

Namens meiner Mandantschaft beantrage ich, den Antragsgegner / die Antragsgegnerin zu verpflichten, ab Rechtshängigkeit monatlich

€ ${f.unterhaltsbetrag || '[Betrag]'}

als nachehelichen Unterhalt zu zahlen.

I. Anspruchsgrundlage

${f.anspruchsgrundlage || '[Anspruchsgrundlage einfügen]'}

II. Bedarfsbemessung

Maßgeblich sind die ehelichen Lebensverhältnisse gem. § 1578 Abs. 1 BGB (sog. Stichtagsprinzip, modifiziert durch BGH-Rspr. zu ehebedingten Nachteilen). Der konkrete Unterhaltsbedarf beläuft sich auf € ${f.unterhaltsbetrag || '[Betrag]'} / Monat.

III. Befristung / Herabsetzung (§ 1578b BGB)

${f.befristung || 'Eine Befristung oder Herabsetzung ist nach den Umständen des Einzelfalls zu prüfen. Ehebedingte Nachteile (Karriereunterbrechung, fehlende Rentenanwartschaften) sprechen gegen eine Befristung.'}

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'gewaltschutz_antrag',
    title: 'Gewaltschutzantrag (§ 1 GewSchG) — EILBEDÜRFTIG',
    description: 'Antrag auf Erlass einer Schutzanordnung / Wohnungszuweisung nach dem Gewaltschutzgesetz.',
    useCase: '⚡ EILBEDÜRFTIG: Bei häuslicher Gewalt, Stalking oder Bedrohung. Einstweilige Anordnung ohne mündliche Verhandlung möglich (§ 214 Abs. 1 FamFG). Zuständig: Familiengericht am Aufenthaltsort der geschützten Person (§ 211 FamFG). Strafanzeige parallel empfehlenswert.',
    fields: [
      { id: 'gericht', label: 'Familiengericht (Eilzuständigkeit)', type: 'text', required: true, placeholder: 'AG Mitte Berlin – Familiengericht, Bereitschaftsdienst erreichbar' },
      { id: 'antragsteller', label: 'Antragsteller:in (geschützte Person)', type: 'text', required: true },
      { id: 'antragsgegner', label: 'Antragsgegner:in (Täter:in)', type: 'text', required: true },
      { id: 'letzterVorfall', label: 'Letzter Vorfall (Datum, Ort, Schilderung)', type: 'textarea', required: true, hint: 'So konkret wie möglich: Datum, Uhrzeit, Ort, beteiligte Personen, körperliche/verbale Übergriffe, Zeugen.' },
      { id: 'vorVorfaelle', label: 'Vorherige Vorfälle (Chronologie)', type: 'textarea' },
      { id: 'wohnungszuweisung', label: 'Wohnungszuweisung beantragen (§ 2 GewSchG)?', type: 'text', required: true, placeholder: 'ja – gemeinsame Wohnung: [Adresse] / nein' },
      { id: 'kontaktverbot', label: 'Kontaktverbot / Näherungsverbot beantragen?', type: 'text', required: true, placeholder: 'ja – Mindestabstand 100 m, kein Kontakt per Telefon/SMS/E-Mail/Social Media' },
    ],
    render: f => `⚡ EILANTRAG ⚡

An das
${f.gericht || '[Familiengericht]'}

Antrag auf Erlass einer Schutzanordnung
gem. § 1 GewSchG i. V. m. §§ 210 ff., 214 FamFG
— als einstweilige Anordnung ohne mündliche Verhandlung —

Antragsteller:in: ${f.antragsteller || '[Antragsteller:in]'}
Antragsgegner:in: ${f.antragsgegner || '[Antragsgegner:in]'}

Sehr geehrte Damen und Herren,

namens meiner Mandantschaft beantrage ich den sofortigen Erlass folgender Schutzanordnungen:

1. Dem Antragsgegner / der Antragsgegnerin wird untersagt, die Antragsteller:in zu verletzen, zu bedrohen oder zu belästigen (§ 1 Abs. 1 GewSchG).

${(f.kontaktverbot || '').toLowerCase().startsWith('ja') ? `2. ${f.kontaktverbot || 'Kontaktverbot: Dem Antragsgegner / der Antragsgegnerin wird untersagt, mit der Antragsteller:in Kontakt aufzunehmen (§ 1 Abs. 1 S. 3 Nr. 4 GewSchG).'}` : ''}

${(f.wohnungszuweisung || '').toLowerCase().startsWith('ja') ? `3. Die gemeinsame Wohnung wird der Antragsteller:in zur alleinigen Nutzung zugewiesen (§ 2 GewSchG).` : ''}

I. Sachverhalt — letzter Vorfall

${f.letzterVorfall || '[Vorfall schildern]'}

II. Vorherige Vorfälle

${f.vorVorfaelle || '—'}

III. Eilbedürftigkeit

Aufgrund der unmittelbaren Gefährdungslage ist die Anordnung ohne mündliche Verhandlung zu erlassen (§ 214 Abs. 1 FamFG). Jede weitere Verzögerung würde die körperliche Unversehrtheit (Art. 2 Abs. 2 GG) der Antragsteller:in gefährden.

Parallel wird Strafanzeige bei der Polizei erstattet.

Verstöße gegen die Schutzanordnung sind gem. § 4 GewSchG strafbar (Freiheitsstrafe bis 2 Jahre oder Geldstrafe).

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'aenderung_unterhalt',
    title: 'Abänderungsantrag Unterhalt (§ 238 FamFG / § 323 ZPO)',
    description: 'Antrag auf Abänderung eines bestehenden Unterhaltstitels wegen wesentlicher Änderung der Verhältnisse.',
    useCase: 'Bestehendes Urteil, Beschluss oder vollstreckbarer Vergleich über Unterhalt. Wesentliche Änderung der Einkommens- oder Bedarfsverhältnisse seit Titelerlass (§ 238 Abs. 1 FamFG). Rückwirkung nur ab Antragstellung (§ 238 Abs. 3 FamFG) — Antrag unverzüglich stellen!',
    fields: [
      { id: 'gericht', label: 'Familiengericht / Aktenzeichen Ursprungsverfahren', type: 'text', required: true },
      { id: 'antragsteller', label: 'Antragsteller:in', type: 'text', required: true },
      { id: 'antragsgegner', label: 'Antragsgegner:in', type: 'text', required: true },
      { id: 'titelBezeichnung', label: 'Abzuändernder Titel (Bezeichnung, Datum)', type: 'text', required: true, placeholder: 'Beschluss AG Hamburg vom 10.03.2022, Az. 123 F 10/22 – Kindesunterhalt € 380/Monat' },
      { id: 'bisherBetrag', label: 'Bisheriger Unterhaltsbetrag (€)', type: 'text', required: true },
      { id: 'neuerBetrag', label: 'Beantragter neuer Betrag (€)', type: 'text', required: true },
      { id: 'aenderungsgrund', label: 'Wesentliche Änderung der Verhältnisse (§ 238 Abs. 1 FamFG)', type: 'textarea', required: true, hint: 'Einkommensveränderung, Jobverlust, Volljährigkeit des Kindes, Wiederheirat, Düsseldorfer Tabelle angepasst etc.' },
    ],
    render: f => `An das
${f.gericht || '[Familiengericht]'}

Abänderungsantrag
gem. § 238 FamFG (bzw. § 323 ZPO für ältere Urteile)

Antragsteller:in: ${f.antragsteller || '[Antragsteller:in]'}
Antragsgegner:in: ${f.antragsgegner || '[Antragsgegner:in]'}

Abzuändernder Titel: ${f.titelBezeichnung || '[Titel]'}

Sehr geehrte Damen und Herren,

namens meiner Mandantschaft beantrage ich, den oben bezeichneten Unterhaltstitel dahingehend abzuändern, dass der monatliche Unterhalt

von € ${f.bisherBetrag || '[bisheriger Betrag]'} auf € ${f.neuerBetrag || '[neuer Betrag]'}

herabgesetzt / heraufgesetzt wird, und zwar ab Rechtshängigkeit dieses Antrags.

I. Wesentliche Änderung der Verhältnisse (§ 238 Abs. 1 FamFG)

${f.aenderungsgrund || '[Änderungsgrund einfügen]'}

II. Rechtlicher Hinweis

Die Abänderung wirkt gem. § 238 Abs. 3 FamFG frühestens ab Antragstellung zurück. Der Antrag wurde unverzüglich nach Kenntnis der Änderung gestellt.

Sofern der Titel auf einer Jugendamtsurkunde (§ 59 SGB VIII) beruht, ist der Antrag gem. § 240 FamFG zu stellen.

Bei Änderung der Düsseldorfer Tabelle (jeweils zum 01.01.) ist eine Abänderung ohne Darlegung weiterer Umstände möglich (BGH FamRZ 2018, 260).

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'vaterschaftsfeststellung',
    title: 'Antrag auf Vaterschaftsfeststellung (§ 1600d BGB / § 169 FamFG)',
    description: 'Antrag auf gerichtliche Feststellung der Vaterschaft, wenn keine Anerkennung vorliegt.',
    useCase: 'Vaterschaft nicht anerkannt und Mutter / Kind benötigt Feststellung für Unterhalt, Erbrecht oder Namensrecht. Zuständig: Familiengericht (§§ 169 ff. FamFG). Abstammungsgutachten wird vom Gericht angeordnet.',
    fields: [
      { id: 'gericht', label: 'Familiengericht', type: 'text', required: true, placeholder: 'AG Frankfurt am Main – Familiengericht' },
      { id: 'antragsteller', label: 'Antragsteller:in (Kind, vertreten durch Mutter / Beistand)', type: 'text', required: true, placeholder: 'Max Mustermann, geb. 05.06.2024, gesetzl. vertreten durch die Mutter …' },
      { id: 'putativerVater', label: 'Mutmaßlicher Vater (Antragsgegner:in)', type: 'text', required: true },
      { id: 'geburtsdatum', label: 'Geburtsdatum des Kindes', type: 'date', required: true },
      { id: 'beziehungszeitraum', label: 'Beziehungszeitraum / Empfängniszeit (Nachweis)', type: 'text', required: true, placeholder: 'Beziehung von ca. September 2023 bis März 2024 (Empfängniszeit gem. § 1600d Abs. 3 BGB)' },
      { id: 'begruendung', label: 'Begründung (Warum wurde nicht anerkannt?)', type: 'textarea', hint: 'Anerkennungsverweigerung, Kontaktverlust, Unbekannter Aufenthalt etc.' },
      { id: 'unterhalt', label: 'Gleichzeitig Unterhalt beantragen?', type: 'text', placeholder: 'ja / nein' },
    ],
    render: f => `An das
${f.gericht || '[Familiengericht]'}

Antrag auf Feststellung der Vaterschaft
gem. § 1600d BGB i. V. m. §§ 169 ff. FamFG

Antragsteller:in: ${f.antragsteller || '[Kind / gesetzliche Vertretung]'}
Antragsgegner:in: ${f.putativerVater || '[mutmaßlicher Vater]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag der Antragsteller:in beantrage ich festzustellen, dass

${f.putativerVater || '[Name]'}

der Vater des Kindes ${f.antragsteller ? f.antragsteller.split(',')[0] : '[Kind]'} (geb. ${f.geburtsdatum || '[Datum]'}) ist.

I. Sachverhalt

${f.beziehungszeitraum || '[Beziehungszeitraum / Empfängniszeit]'}

${f.begruendung || ''}

II. Rechtliche Grundlage

Gem. § 1600d Abs. 1 BGB wird die Vaterschaft gerichtlich festgestellt, wenn keine Anerkennungserklärung vorliegt. Die Empfängniszeit wird gem. § 1600d Abs. 3 BGB vermutet (300–181 Tage vor der Geburt). Ich beantrage, ein Abstammungsgutachten gem. § 177 FamFG in Auftrag zu geben.

${(f.unterhalt || '').toLowerCase().startsWith('ja') ? 'III. Verbundantrag Kindesunterhalt\n\nGleichzeitig beantrage ich, den Antragsgegner zum Kindesunterhalt nach Maßgabe der §§ 1601 ff. BGB und der Düsseldorfer Tabelle zu verpflichten. Der genaue Betrag wird nach Bekanntwerden der Einkommensverhältnisse beziffert.\n\n' : ''}Die Beiordnung eines Beistands gem. § 1712 BGB (Jugendamt) wird angeregt, sofern keine anwaltliche Vertretung des Kindes bereits gesichert ist.

${SIGN_OFF}
`,
  },
]

/**
 * Sozialrecht-Pack — 10 Templates für Pflichtverteidigung/Beratungshilfe.
 * Schwerpunkt Widersprüche (§ 84 SGG, 1 Monat) gegen Jobcenter/Krankenkasse/
 * DRV/Sozialamt + Klagen ans Sozialgericht + Eilanträge (§ 86b SGG) +
 * PKH/BerHG. Frist-Warnhinweise prominent in jeder render-Funktion.
 */
export const SOZIAL_TEMPLATES: LawyerTemplate[] = [
  // ---------------------------------------------------------------------
  {
    id: 'widerspruch_buergergeld',
    title: 'Widerspruch Bürgergeld (SGB II)',
    description: 'Widerspruch gegen Jobcenter-Bescheid (Ablehnung, Kürzung, Sanktion, Aufhebung/Erstattung).',
    useCase: 'Mandant:in hat einen negativen Jobcenter-Bescheid erhalten. FRIST: 1 Monat ab Bekanntgabe, § 84 SGG. Sofortige Mandatsannahme prüfen — Fristversäumnis führt zu Bestandskraft!',
    fields: [
      { id: 'jobcenter', label: 'Jobcenter (Empfänger:in)', type: 'text', required: true, placeholder: 'Jobcenter Berlin Mitte, Widerspruchsstelle' },
      { id: 'mandant', label: 'Mandant:in (Name, Bedarfsgemeinschaft)', type: 'text', required: true },
      { id: 'mandantAdresse', label: 'Anschrift Mandant:in', type: 'textarea', required: true },
      { id: 'kundennummer', label: 'Kunden-/BG-Nummer', type: 'text', required: true },
      { id: 'bescheidDatum', label: 'Datum des Bescheids', type: 'date', required: true },
      { id: 'bescheidArt', label: 'Art des Bescheids (z. B. Sanktionsbescheid, Aufhebung)', type: 'text', required: true, placeholder: 'Sanktionsbescheid / Ablehnungsbescheid / Erstattungsbescheid' },
      { id: 'begruendung', label: 'Widerspruchsbegründung', type: 'textarea', required: true, hint: 'Rechtliche Würdigung: z. B. § 31 SGB II (Pflichtverletzung), § 48 SGB X (Aufhebung), § 40 SGB II. Nachweise beilegen.' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Bescheid im Original, Einkommensnachweise, Attest' },
    ],
    render: f => `An ${f.jobcenter || '[Jobcenter]'}

W i d e r s p r u c h
gem. § 84 SGG

in der Sache: ${f.mandant || '[Mandant:in]'}
Kunden-/BG-Nr.: ${f.kundennummer || '[BG-Nr.]'}
Anschrift: ${f.mandantAdresse ? f.mandantAdresse.replace(/\n/g, ', ') : '[Anschrift]'}
gegen den Bescheid vom ${f.bescheidDatum || '[Datum]'} (${f.bescheidArt || '[Bescheidart]'})

⚠ FRISTHINWEIS: Widerspruchsfrist 1 Monat ab Bekanntgabe, § 84 Abs. 1 SGG.

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}, lege ich gegen den oben bezeichneten Bescheid

W i d e r s p r u c h

ein und beantrage, diesen aufzuheben.

Begründung

${f.begruendung || '[Begründung einfügen — z. B. Verstoß gegen § 31 SGB II, fehlende Anhörung gem. § 24 SGB X, Ermessensfehler etc.]'}

Ich beantrage ferner, die aufschiebende Wirkung dieses Widerspruchs anzuordnen, soweit sie nicht bereits kraft Gesetzes besteht (§ 39 SGB II, § 86a SGG).

Sollte der Widerspruch nicht abgeholfen werden, behalten wir uns Klage beim zuständigen Sozialgericht ausdrücklich vor.

Anlagen: ${f.anlagen || '—'}

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert; sie wird auf Verlangen nachgereicht.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'widerspruch_grundsicherung',
    title: 'Widerspruch Grundsicherung (SGB XII)',
    description: 'Widerspruch gegen Bescheid des Sozialamts (Grundsicherung im Alter/bei Erwerbsminderung, Hilfe zum Lebensunterhalt).',
    useCase: 'Mandant:in bezieht oder beantragte Leistungen nach SGB XII; Bescheid ist ablehnend oder kürzend. FRIST: 1 Monat, § 84 SGG.',
    fields: [
      { id: 'sozialamt', label: 'Sozialamt / Träger (Empfänger:in)', type: 'text', required: true, placeholder: 'Bezirksamt Berlin-Neukölln, Soziale Wohnhilfen' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'mandantAdresse', label: 'Anschrift Mandant:in', type: 'textarea', required: true },
      { id: 'aktenzeichen', label: 'Aktenzeichen der Behörde', type: 'text', required: true },
      { id: 'bescheidDatum', label: 'Datum des Bescheids', type: 'date', required: true },
      { id: 'leistungsart', label: 'Leistungsart (z. B. HLU, Grundsicherung EM, Hilfe zur Pflege)', type: 'text', required: true, placeholder: 'Grundsicherung bei Erwerbsminderung gem. §§ 41 ff. SGB XII' },
      { id: 'begruendung', label: 'Widerspruchsbegründung', type: 'textarea', required: true, hint: 'z. B. Bedarfsunterdeckung § 27a SGB XII, fehlerhafter Regelsatz, Anrechnung von Einkommen/Vermögen gem. §§ 82 ff. SGB XII.' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Bescheid, Kontoauszüge, Attest, GdB-Nachweis' },
    ],
    render: f => `An ${f.sozialamt || '[Sozialamt]'}

W i d e r s p r u c h
gem. § 84 SGG

in der Sache: ${f.mandant || '[Mandant:in]'}
Az. der Behörde: ${f.aktenzeichen || '[Az.]'}
Anschrift: ${f.mandantAdresse ? f.mandantAdresse.replace(/\n/g, ', ') : '[Anschrift]'}
Leistungsart: ${f.leistungsart || '[Leistungsart SGB XII]'}
gegen den Bescheid vom ${f.bescheidDatum || '[Datum]'}

⚠ FRISTHINWEIS: Widerspruchsfrist 1 Monat ab Bekanntgabe, § 84 Abs. 1 SGG.

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}, lege ich gegen den o.g. Bescheid

W i d e r s p r u c h

ein und beantrage, diesen aufzuheben sowie die beantragten Leistungen ungekürzt zu gewähren.

Begründung

${f.begruendung || '[Begründung einfügen — z. B. § 27a SGB XII Regelbedarf, fehlerhafte Einkommensanrechnung §§ 82 ff. SGB XII, Verstoß gegen Anhörungspflicht § 24 SGB X]'}

Anlagen: ${f.anlagen || '—'}

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'widerspruch_alg1',
    title: 'Widerspruch ALG I (SGB III)',
    description: 'Widerspruch gegen Bescheid der Agentur für Arbeit (ALG I, Sperrzeit, Ablehnung, Aufhebung).',
    useCase: 'Mandant:in erhielt Sperrzeitbescheid, Ablehnungsbescheid oder Aufhebungs-/Erstattungsbescheid der Bundesagentur für Arbeit. FRIST: 1 Monat, § 84 SGG.',
    fields: [
      { id: 'agentur', label: 'Agentur für Arbeit (Empfänger:in)', type: 'text', required: true, placeholder: 'Agentur für Arbeit Berlin Mitte, Widerspruchsstelle' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'kundennummer', label: 'Kunden-/Bewerber-Nr.', type: 'text', required: true },
      { id: 'bescheidDatum', label: 'Datum des Bescheids', type: 'date', required: true },
      { id: 'bescheidArt', label: 'Art des Bescheids', type: 'text', required: true, placeholder: 'Sperrzeitbescheid § 159 SGB III / Ablehnungsbescheid § 137 SGB III' },
      { id: 'sperrzeitGrund', label: 'Angegebener Sperrzeitgrund (falls Sperrzeit)', type: 'text', placeholder: 'z. B. „selbst herbeigeführte Arbeitslosigkeit" gem. § 159 Abs. 1 Nr. 1 SGB III' },
      { id: 'begruendung', label: 'Widerspruchsbegründung', type: 'textarea', required: true, hint: 'z. B. wichtiger Grund gem. § 159 Abs. 1 S. 2 SGB III, fehlende Kausalität, Unverhältnismäßigkeit, Verfahrensfehler § 24 SGB X.' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Bescheid, Aufhebungsvertrag, Arbeitszeugnis, ärztl. Attest' },
    ],
    render: f => `An ${f.agentur || '[Agentur für Arbeit]'}

W i d e r s p r u c h
gem. § 84 SGG

in der Sache: ${f.mandant || '[Mandant:in]'}
Kunden-Nr.: ${f.kundennummer || '[Nr.]'}
gegen den Bescheid vom ${f.bescheidDatum || '[Datum]'} (${f.bescheidArt || '[Bescheidart]'})

⚠ FRISTHINWEIS: Widerspruchsfrist 1 Monat ab Bekanntgabe, § 84 Abs. 1 SGG.

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}, lege ich gegen den o.g. Bescheid

W i d e r s p r u c h

ein.

${f.sperrzeitGrund ? `Zur Sperrzeit (angegebener Grund: ${f.sperrzeitGrund}):\n\n` : ''}Begründung

${f.begruendung || '[Begründung einfügen — z. B. wichtiger Grund gem. § 159 Abs. 1 S. 2 SGB III, keine grobe Fahrlässigkeit, Verhältnismäßigkeit; oder: Anwartschaftszeit § 142 SGB III erfüllt]'}

Ich beantrage, den angefochtenen Bescheid aufzuheben und die Leistungen ungekürzt zu gewähren.

Anlagen: ${f.anlagen || '—'}

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'widerspruch_krankenkasse',
    title: 'Widerspruch Krankenkasse (SGB V)',
    description: 'Widerspruch gegen Ablehnung von Reha, Hilfsmittel, Heilmittel, Krankengeld oder stationärer Behandlung durch gesetzliche Krankenkasse.',
    useCase: 'Mandant:in wurde Leistung nach SGB V (Reha § 40, Hilfsmittel § 33, Heilmittel § 32, Krankengeld § 44, Behandlung § 27) abgelehnt oder nachträglich gekürzt. FRIST: 1 Monat, § 84 SGG.',
    fields: [
      { id: 'krankenkasse', label: 'Krankenkasse (Empfänger:in)', type: 'text', required: true, placeholder: 'Techniker Krankenkasse, Widerspruchsstelle Hamburg' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'versichertenNr', label: 'Versichertennummer', type: 'text', required: true },
      { id: 'bescheidDatum', label: 'Datum des Bescheids / Ablehnungsschreibens', type: 'date', required: true },
      { id: 'leistung', label: 'Abgelehnte Leistung', type: 'text', required: true, placeholder: 'Hilfsmittel (Rollstuhl) gem. § 33 SGB V / stationäre Reha § 40 SGB V' },
      { id: 'mdgutachten', label: 'MDK/MD-Gutachten vorhanden?', type: 'text', placeholder: 'ja – Gutachten vom [Datum] beigefügt / nein' },
      { id: 'begruendung', label: 'Widerspruchsbegründung', type: 'textarea', required: true, hint: 'z. B. medizinische Notwendigkeit § 12 SGB V, Wirtschaftlichkeitsgebot richtig angewandt?, Kausalität Erkrankung–Leistung, ggf. Gegengutachten ankündigen.' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Ärztliche Verordnung, Facharztbericht, MDK-Gutachten, Kostenvoranschlag' },
    ],
    render: f => `An ${f.krankenkasse || '[Krankenkasse]'}

W i d e r s p r u c h
gem. § 84 SGG

in der Sache: ${f.mandant || '[Mandant:in]'}
Versichertennummer: ${f.versichertenNr || '[Nr.]'}
Abgelehnte Leistung: ${f.leistung || '[Leistung]'}
gegen den Bescheid / das Schreiben vom ${f.bescheidDatum || '[Datum]'}

⚠ FRISTHINWEIS: Widerspruchsfrist 1 Monat ab Bekanntgabe, § 84 Abs. 1 SGG. Bei formlosen Ablehnungsschreiben gilt ggf. verlängerte Frist — Einlegung vorsorglich unverzüglich.

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}, lege ich gegen die Ablehnung der o.g. Leistung

W i d e r s p r u c h

ein und beantrage, die Leistung zu gewähren.

${f.mdgutachten ? `Zum MDK/MD-Gutachten: ${f.mdgutachten}\n\n` : ''}Begründung

${f.begruendung || '[Begründung einfügen — z. B. medizinische Notwendigkeit i.S.d. § 12 SGB V, Anspruchsgrundlage § 33 / § 40 / § 44 SGB V, fehlerhafte Anwendung des Wirtschaftlichkeitsgebots]'}

Ich beantrage ferner, die Entscheidung über den Widerspruch vor Einholung eines weiteren MD-Gutachtens meiner Mandantschaft zur Stellungnahme zuzuleiten (§ 277 Abs. 1 SGB V analog).

Anlagen: ${f.anlagen || '—'}

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'widerspruch_rentenbescheid',
    title: 'Widerspruch Rentenbescheid (SGB VI)',
    description: 'Widerspruch gegen Bescheid der Deutschen Rentenversicherung (Ablehnung Erwerbsminderungsrente, Altersrente, Rentenhöhe, Rentenanpassung).',
    useCase: 'Mandant:in hat Rentenantrag gestellt oder Bescheid erhalten. Typisch: Ablehnung EM-Rente (§§ 43, 240 SGB VI), falsche Entgeltpunkte, fehlende Berücksichtigung von Versicherungszeiten. FRIST: 1 Monat, § 84 SGG.',
    fields: [
      { id: 'drv', label: 'Deutsche Rentenversicherung (Empfänger:in)', type: 'text', required: true, placeholder: 'Deutsche Rentenversicherung Berlin-Brandenburg, Widerspruchsstelle' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'rentenversicherungsNr', label: 'Rentenversicherungsnummer', type: 'text', required: true },
      { id: 'bescheidDatum', label: 'Datum des Bescheids', type: 'date', required: true },
      { id: 'rentenart', label: 'Rentenart / Streitgegenstand', type: 'text', required: true, placeholder: 'Ablehnung Erwerbsminderungsrente gem. § 43 SGB VI' },
      { id: 'begruendung', label: 'Widerspruchsbegründung', type: 'textarea', required: true, hint: 'z. B. volle/teilweise Erwerbsminderung (§ 43 SGB VI), Wartezeit erfüllt (§ 50 SGB VI), fehlerhafte Entgeltpunkte, Gutachtenmangel, Versicherungszeiten gem. §§ 54 ff. SGB VI.' },
      { id: 'gutachten', label: 'Rentenärztliches Gutachten / Gegengutachten', type: 'text', placeholder: 'Gutachten des Rentendienstes vom [Datum]; Gegengutachten wird beantragt' },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Ärztliche Befundberichte, GdB-Bescheid, Arbeitsamtsunterlagen' },
    ],
    render: f => `An ${f.drv || '[Deutsche Rentenversicherung]'}

W i d e r s p r u c h
gem. § 84 SGG

in der Sache: ${f.mandant || '[Mandant:in]'}
Rentenversicherungsnummer: ${f.rentenversicherungsNr || '[Nr.]'}
Streitgegenstand: ${f.rentenart || '[Rentenart]'}
gegen den Bescheid vom ${f.bescheidDatum || '[Datum]'}

⚠ FRISTHINWEIS: Widerspruchsfrist 1 Monat ab Bekanntgabe, § 84 Abs. 1 SGG. Fristversäumnis führt zu Bestandskraft — keine Nachsicht ohne triftigen Grund.

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}, lege ich gegen den o.g. Bescheid

W i d e r s p r u c h

ein und beantrage, die Rente zu gewähren / die Rentenhöhe korrekt festzusetzen.

Begründung

${f.begruendung || '[Begründung einfügen — z. B. die Leistungsfähigkeit auf dem allgemeinen Arbeitsmarkt ist dauerhaft auf unter 6 / 3 Stunden täglich gesunken gem. § 43 Abs. 1/2 SGB VI; Wartezeit gem. § 50 SGB VI erfüllt]'}

${f.gutachten ? `Zum Gutachten: ${f.gutachten}\n\n` : ''}Ich beantrage ferner Akteneinsicht gem. § 29 SGB X.

Anlagen: ${f.anlagen || '—'}

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'antrag_schwerbehinderung',
    title: 'Antrag Schwerbehindertenausweis (SGB IX)',
    description: 'Erstantrag oder Verschlimmerungsantrag auf Feststellung des Grades der Behinderung (GdB) beim Versorgungsamt, § 152 SGB IX.',
    useCase: 'Mandant:in leidet an einer Beeinträchtigung und möchte den GdB und Merkzeichen (z. B. G, aG, RF, B) feststellen lassen. Kein Widerspruch — dies ist ein Erstantrag / Neufeststellungsantrag.',
    fields: [
      { id: 'behoerde', label: 'Versorgungsamt / Landesamt (Empfänger:in)', type: 'text', required: true, placeholder: 'Landesamt für Gesundheit und Soziales Berlin (LAGeSo), Versorgungsamt' },
      { id: 'mandant', label: 'Mandant:in (Name, Geburtsdatum)', type: 'text', required: true },
      { id: 'mandantAdresse', label: 'Anschrift Mandant:in', type: 'textarea', required: true },
      { id: 'behinderungen', label: 'Gesundheitliche Beeinträchtigungen / Diagnosen', type: 'textarea', required: true, hint: 'Alle relevanten Diagnosen mit ICD-10 wenn bekannt. Je vollständiger, desto besser die Ausgangslage.' },
      { id: 'merkzeichen', label: 'Beantragte Merkzeichen (optional)', type: 'text', placeholder: 'G (erhebliche Gehbehinderung), aG, RF, B, H, Gl, TBl' },
      { id: 'gdBisherig', label: 'Bisheriger GdB (falls Verschlimmerungsantrag)', type: 'text', placeholder: 'bisher GdB 30 (Bescheid vom [Datum])' },
      { id: 'anlagen', label: 'Anlagen (ärztliche Atteste, Befundberichte)', type: 'textarea', placeholder: 'Arztbriefe, Reha-Entlassbericht, Gutachten' },
    ],
    render: f => `An ${f.behoerde || '[Versorgungsamt]'}

Antrag auf Feststellung der Behinderung
gem. § 152 SGB IX

Antragstellende Person: ${f.mandant || '[Mandant:in]'}
Anschrift: ${f.mandantAdresse ? f.mandantAdresse.replace(/\n/g, ', ') : '[Anschrift]'}
${f.gdBisherig ? `Bisheriger GdB: ${f.gdBisherig}\n` : ''}

Sehr geehrte Damen und Herren,

ich zeige an, dass mich ${f.mandant || '[Mandant:in]'} mit der Wahrnehmung ihrer:seiner Interessen im Schwerbehindertenverfahren beauftragt hat.

Namens und im Auftrag meiner Mandantschaft stelle ich hiermit

A n t r a g

auf Feststellung des Grades der Behinderung (GdB) gem. § 152 Abs. 1 SGB IX sowie auf Ausstellung eines Schwerbehindertenausweises.

Gesundheitliche Beeinträchtigungen

${f.behinderungen || '[Diagnosen / Beeinträchtigungen einfügen]'}

${f.merkzeichen ? `Beantragte Merkzeichen\n\n${f.merkzeichen}\n\n` : ''}Ich bitte, die beigefügten ärztlichen Unterlagen bei der Begutachtung vollständig zu berücksichtigen. Sollte eine amtsärztliche Untersuchung geplant sein, bitte ich um vorherige Mitteilung.

Anlagen: ${f.anlagen || '—'}

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

Hinweis: Bei Ablehnung oder unzureichendem GdB empfehle ich meiner Mandantschaft Widerspruch gem. § 84 SGG (Frist 1 Monat) sowie ggf. Klage beim Sozialgericht.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'klage_sozialgericht',
    title: 'Klageschrift Sozialgericht',
    description: 'Klage beim Sozialgericht nach erfolglosem Widerspruch (Widerspruchsbescheid liegt vor).',
    useCase: 'Widerspruchsverfahren erfolglos. Klage beim zuständigen Sozialgericht nach § 54 SGG. FRIST: 1 Monat ab Zustellung des Widerspruchsbescheids, § 87 Abs. 1 SGG. Verfahren ist gerichtskostenfrei gem. § 183 SGG (Versicherte/Rentner).',
    fields: [
      { id: 'gericht', label: 'Sozialgericht (Empfänger:in)', type: 'text', required: true, placeholder: 'Sozialgericht Berlin, Littenstraße 12–17, 10179 Berlin' },
      { id: 'klaeger', label: 'Kläger:in (Mandant:in, Anschrift)', type: 'textarea', required: true },
      { id: 'beklagter', label: 'Beklagte:r (Behörde, Anschrift)', type: 'textarea', required: true, placeholder: 'Jobcenter Berlin Mitte, Brunnenstraße 110, 13355 Berlin' },
      { id: 'widerspruchsbescheidDatum', label: 'Datum des Widerspruchsbescheids', type: 'date', required: true },
      { id: 'streitgegenstand', label: 'Streitgegenstand', type: 'text', required: true, placeholder: 'Gewährung von Bürgergeld für den Zeitraum [Datum–Datum], § 19 SGB II' },
      { id: 'klageziel', label: 'Klageantrag', type: 'textarea', required: true, hint: 'Konkret formulieren: z. B. „Die Beklagte wird verurteilt, dem Kläger für den Zeitraum … Leistungen i.H.v. monatlich … € zu gewähren."' },
      { id: 'begruendung', label: 'Klagebegründung', type: 'textarea', required: true },
      { id: 'anlagen', label: 'Anlagen', type: 'textarea', placeholder: 'Ausgangsbescheid, Widerspruchsbescheid, Vollmacht, Belege' },
    ],
    render: f => `An ${f.gericht || '[Sozialgericht]'}

K l a g e s c h r i f t
gem. § 54 SGG

Kläger:in:
${f.klaeger || '[Kläger:in, Anschrift]'}
— vertreten durch Rechtsanwält:in —

gegen

Beklagte:r:
${f.beklagter || '[Beklagte:r, Anschrift]'}

Streitgegenstand: ${f.streitgegenstand || '[Streitgegenstand]'}

⚠ FRISTHINWEIS: Klagefrist 1 Monat ab Zustellung des Widerspruchsbescheids, § 87 Abs. 1 SGG.
Gerichtskostenfreiheit für Versicherte/Rentner gem. § 183 SGG.

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft erhebe ich hiermit gegen den Widerspruchsbescheid vom ${f.widerspruchsbescheidDatum || '[Datum]'}

K l a g e

und beantrage,

${f.klageziel || '[Klageantrag einfügen]'}

Begründung

${f.begruendung || '[Klagebegründung einfügen — Sachverhalt, Rechtslage, Beweiswürdigung]'}

Beweis: Beiziehung der Verwaltungsakte; ggf. Sachverständigengutachten.

Anlagen: ${f.anlagen || '—'}

Die anwaltliche Vertretungsvollmacht ist beigefügt.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'eilantrag_einstweilige_anordnung_sg',
    title: 'Eilantrag einstweilige Anordnung (§ 86b SGG)',
    description: 'Eilantrag auf einstweilige Anordnung beim Sozialgericht, z. B. bei drohender Obdachlosigkeit (Mietkosten), Heizungsausfall, Leistungsunterbrechung.',
    useCase: 'Sofortige Sicherung nötig: Jobcenter oder Sozialamt verweigert Leistung, die nicht bis zur Hauptsacheentscheidung warten kann. § 86b Abs. 2 SGG: Anordnungsanspruch + Anordnungsgrund müssen glaubhaft gemacht werden (§ 920 Abs. 2 ZPO analog). Keine Frist, aber Eilbedürftigkeit belegen!',
    fields: [
      { id: 'gericht', label: 'Sozialgericht (Empfänger:in)', type: 'text', required: true, placeholder: 'Sozialgericht Berlin, Littenstraße 12–17, 10179 Berlin' },
      { id: 'antragsteller', label: 'Antragsteller:in (Mandant:in, Anschrift)', type: 'textarea', required: true },
      { id: 'antragsgegner', label: 'Antragsgegner:in (Behörde, Anschrift)', type: 'textarea', required: true },
      { id: 'eilgrund', label: 'Eilgrund (konkreter Notfall)', type: 'text', required: true, placeholder: 'Drohende Kündigung / Räumungsklage durch Vermieter zum [Datum] / Heizungsausfall' },
      { id: 'anordnungsanspruch', label: 'Anordnungsanspruch (Glaubhaftmachung)', type: 'textarea', required: true, hint: '§ 22 SGB II / § 36 SGB XII (Mietkosten), § 24 SGB II (einmalige Beihilfe), § 33 SGB V (Hilfsmittel). Rechtsgrundlage + Tatsachengrundlage darlegen.' },
      { id: 'anordnungsgrund', label: 'Anordnungsgrund (Eilbedürftigkeit)', type: 'textarea', required: true, hint: 'Konkrete drohende Rechtseinbuße: z. B. Räumungsklage, Versorgungsunterbrechung, Gesundheitsschaden. Zeitpunkt benennen.' },
      { id: 'antrag', label: 'Formulierter Eilantrag', type: 'textarea', required: true, placeholder: 'Die Antragsgegnerin wird im Wege der einstweiligen Anordnung verpflichtet, dem Antragsteller Mietkosten i.H.v. … € als Schulden zu übernehmen, § 22 Abs. 8 SGB II.' },
      { id: 'anlagen', label: 'Anlagen (zur Glaubhaftmachung)', type: 'textarea', placeholder: 'Mietrückstandsschreiben Vermieter, Kündigung, Kontoauszüge, Ablehnungsbescheid, eidesstattliche Erklärung' },
    ],
    render: f => `An ${f.gericht || '[Sozialgericht]'}

Antrag auf einstweilige Anordnung
gem. § 86b Abs. 2 SGG

Antragsteller:in:
${f.antragsteller || '[Antragsteller:in, Anschrift]'}
— vertreten durch Rechtsanwält:in —

gegen

Antragsgegner:in:
${f.antragsgegner || '[Antragsgegner:in, Anschrift]'}

Eilgrund: ${f.eilgrund || '[Eilgrund]'}

⚠ EILBEDÜRFTIG: Keine Frist gem. Gesetz, aber sofortiges Handeln erforderlich. Einstweilige Anordnung setzt GLAUBHAFTMACHUNG von Anordnungsanspruch + Anordnungsgrund voraus (§ 86b Abs. 2 S. 4 SGG i.V.m. § 920 Abs. 2 ZPO).

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich hiermit im Wege des einstweiligen Rechtsschutzes gem. § 86b Abs. 2 SGG,

${f.antrag || '[Formulierten Eilantrag einfügen]'}

I. Anordnungsanspruch

${f.anordnungsanspruch || '[Anordnungsanspruch glaubhaft machen — Rechtsgrundlage + Tatsachen]'}

II. Anordnungsgrund (Eilbedürftigkeit)

${f.anordnungsgrund || '[Anordnungsgrund glaubhaft machen — konkrete drohende Nachteile, Zeitpunkt]'}

Für den Fall der Nicht-Abhilfe wird auf die Möglichkeit der Beschwerde gem. § 172 SGG hingewiesen.

Anlagen (zur Glaubhaftmachung): ${f.anlagen || '—'}

Die Vollmacht ist beigefügt.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'antrag_pkh_beratungshilfe',
    title: 'Antrag Beratungshilfe / PKH (BerHG / SGG)',
    description: 'Antrag auf Beratungshilfe gem. §§ 1, 4 BerHG (außergerichtlich) bzw. Prozesskostenhilfe gem. § 73a SGG i.V.m. §§ 114 ff. ZPO (gerichtlich).',
    useCase: 'Mandant:in ist mittellos. Vor Mandatsübernahme klären: Beratungshilfe für außergerichtliche Tätigkeit (Berechtigungsschein Amtsgericht, Gebühr Nr. 2500 VV RVG = 35 € zzgl. MwSt.) oder PKH für gerichtliches Verfahren (kein Kostenvorschuss, ggf. Beiordnung). Sozialgerichtsverfahren für Versicherte ist gem. § 183 SGG bereits gerichtskostenfrei.',
    fields: [
      { id: 'empfaenger', label: 'Amtsgericht (Beratungshilfe) oder Sozialgericht (PKH)', type: 'text', required: true, placeholder: 'Amtsgericht Berlin-Mitte, Beratungshilfestelle / Sozialgericht Berlin' },
      { id: 'mandant', label: 'Antragsteller:in (Mandant:in)', type: 'text', required: true },
      { id: 'mandantAdresse', label: 'Anschrift Mandant:in', type: 'textarea', required: true },
      { id: 'einkommenssituation', label: 'Einkommens- und Vermögenssituation (kurz)', type: 'textarea', required: true, hint: 'Nettoeinkommen, laufende Leistungen (SGB II/XII), Vermögenswerte. PKH-Formular VKH wird separat eingereicht.' },
      { id: 'angelegenheit', label: 'Angelegenheit / Rechtsgebiet', type: 'text', required: true, placeholder: 'Widerspruch gegen Jobcenter-Sanktionsbescheid (SGB II)' },
      { id: 'erfolgsaussichten', label: 'Kurze Darlegung der Erfolgsaussichten', type: 'textarea', required: true, hint: 'PKH: hinreichende Erfolgsaussichten + keine Mutwilligkeit (§ 114 ZPO). Beratungshilfe: keine offensichtliche Unzulässigkeit.' },
      { id: 'art', label: 'Art der Hilfe', type: 'text', required: true, placeholder: 'Beratungshilfe (BerHG) / Prozesskostenhilfe mit Beiordnung (§ 73a SGG)' },
    ],
    render: f => `An ${f.empfaenger || '[Amtsgericht / Sozialgericht]'}

Antrag auf ${f.art || 'Beratungshilfe / Prozesskostenhilfe'}

Antragsteller:in: ${f.mandant || '[Mandant:in]'}
Anschrift: ${f.mandantAdresse ? f.mandantAdresse.replace(/\n/g, ', ') : '[Anschrift]'}
Angelegenheit: ${f.angelegenheit || '[Angelegenheit]'}

Sehr geehrte Damen und Herren,

ich bitte namens meiner Mandantschaft, ${f.mandant || '[Mandant:in]'},

${(f.art || '').toLowerCase().includes('pkh') || (f.art || '').toLowerCase().includes('prozesskostenhilfe')
  ? 'um Bewilligung von Prozesskostenhilfe mit Anwaltsbeiordnung gem. § 73a SGG i.V.m. §§ 114 ff. ZPO.'
  : 'um Ausstellung eines Berechtigungsscheins für Beratungshilfe gem. §§ 1, 4 BerHG.'}

Einkommens- und Vermögenssituation

${f.einkommenssituation || '[Einkommens- und Vermögenssituation]'}

${(f.art || '').toLowerCase().includes('pkh') || (f.art || '').toLowerCase().includes('prozesskostenhilfe')
  ? 'Das ausgefüllte PKH-Formular (VKH) sowie Belege über die Einkommensverhältnisse sind beigefügt.\n\n'
  : ''}Erfolgsaussichten

${f.erfolgsaussichten || '[Erfolgsaussichten darlegen]'}

Hinweis Beratungshilfe: Vergütung Anwält:in gem. Nr. 2500 VV RVG (35,00 € zzgl. MwSt. = 41,65 €) — Erstattung aus Staatskasse. Mandant:in zahlt ggf. Eigenanteil 15 €.

Hinweis PKH / SG: Sozialgerichtsverfahren ist für Versicherte bereits gem. § 183 SGG gerichtskostenfrei. PKH umfasst hier primär die Anwaltsbeiordnung (Vergütung nach RVG aus Staatskasse).

Die anwaltliche Vollmacht ist beigefügt.

${SIGN_OFF}
`,
  },

  // ---------------------------------------------------------------------
  {
    id: 'antrag_uebernahme_mietkosten',
    title: 'Antrag Übernahme Mietkosten/-schulden',
    description: 'Antrag auf Übernahme von Mietschulden oder laufenden Unterkunftskosten gem. § 22 Abs. 8 SGB II (Jobcenter) oder § 36 SGB XII (Sozialamt).',
    useCase: 'Mandant:in hat Mietrückstände und droht Wohnungsverlust durch Kündigung / Räumungsklage. § 22 Abs. 8 SGB II: Darlehen oder Beihilfe, wenn Wohnungserhalt möglich und Übernahme gerechtfertigt. § 36 SGB XII: Übernahme als einmalige Beihilfe. Ggf. Eilantrag parallel stellen!',
    fields: [
      { id: 'behoerde', label: 'Behörde (Jobcenter / Sozialamt)', type: 'text', required: true, placeholder: 'Jobcenter Berlin-Neukölln / Sozialamt Bezirksamt Neukölln' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'kundennummer', label: 'Kunden-/Aktenzeichen', type: 'text' },
      { id: 'mandantAdresse', label: 'Anschrift (Wohnung, die erhalten werden soll)', type: 'textarea', required: true },
      { id: 'vermieter', label: 'Vermieter:in (Name, Anschrift)', type: 'text', required: true },
      { id: 'mietrueckstand', label: 'Höhe Mietrückstand (€) und Zeitraum', type: 'text', required: true, placeholder: '2.400,00 € für Monate Januar–März 2026' },
      { id: 'kuendigungSituation', label: 'Kündigungs-/Räumungssituation', type: 'text', required: true, placeholder: 'Fristlose Kündigung vom [Datum]; Räumungsklage angekündigt zum [Datum]' },
      { id: 'begruendung', label: 'Begründung / Darstellung der Notsituation', type: 'textarea', required: true, hint: 'Warum ist Übernahme gerechtfertigt? Wohnungserhalt möglich? Keine Wiederholungsgefahr? § 22 Abs. 8 S. 2 SGB II: soll gewährt werden, wenn Wohnungserhalt möglich.' },
    ],
    render: f => `An ${f.behoerde || '[Jobcenter / Sozialamt]'}

Antrag auf Übernahme von Mietschulden
gem. § 22 Abs. 8 SGB II / § 36 SGB XII

Antragsteller:in: ${f.mandant || '[Mandant:in]'}${f.kundennummer ? `\nAktenzeichen: ${f.kundennummer}` : ''}
Anschrift der zu erhaltenden Wohnung: ${f.mandantAdresse ? f.mandantAdresse.replace(/\n/g, ', ') : '[Anschrift]'}
Vermieter:in: ${f.vermieter || '[Vermieter:in]'}

⚠ ACHTUNG: Drohender Wohnungsverlust — Eilbedürftigkeit gegeben. Ggf. parallel Eilantrag § 86b SGG stellen!

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}, stelle ich hiermit

A n t r a g

auf Übernahme der aufgelaufenen Mietschulden gem. § 22 Abs. 8 SGB II (hilfsweise § 36 SGB XII) als Beihilfe, hilfsweise als Darlehen.

Mietrückstand: ${f.mietrueckstand || '[Betrag und Zeitraum]'}
Aktuelle Situation: ${f.kuendigungSituation || '[Kündigungs-/Räumungssituation]'}

Begründung

${f.begruendung || '[Begründung einfügen — Notsituation, Wohnungserhalt möglich, keine Wiederholungsgefahr, § 22 Abs. 8 S. 2 SGB II: soll-Norm bei möglichem Wohnungserhalt]'}

Rechtsgrundlage: § 22 Abs. 8 SGB II sieht vor, dass Schulden übernommen werden sollen, wenn Wohnungserhalt möglich und Übernahme gerechtfertigt ist. Eine Ermessensreduzierung auf Null ist angezeigt, da Obdachlosigkeit droht und die Kosten der Obdachlosenunterbringung die Übernahmesumme übersteigen würden.

Ich bitte um schnellstmögliche Bearbeitung. Sollte der Antrag abgelehnt werden, behalten wir uns ausdrücklich vor, Eilantrag gem. § 86b Abs. 2 SGG zu stellen.

Die anwaltliche Vertretungsvollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },
]

/**
 * Steuerrecht-Pack — 10 Templates für Einspruch (§ 347 AO, 1 Monat),
 * AdV-Antrag (§ 361 AO / § 69 FGO), Stundung (§ 222 AO), Erlass (§ 227 AO),
 * Selbstanzeige (§ 371 AO mit Vollständigkeitsgebot + Sperrgrund-Check),
 * FG-Klage, ErbStG-Anzeige, USt-Dauerfristverlängerung.
 */
export const STEUER_TEMPLATES: LawyerTemplate[] = [
  {
    id: 'einspruch_steuerbescheid',
    title: 'Einspruch gegen Steuerbescheid',
    description: 'Einspruch gem. § 347 AO mit Begründung; Frist 1 Monat ab Bekanntgabe (§ 355 AO).',
    useCase: 'Mandant:in hat einen Einkommensteuerbescheid, Gewerbesteuermessbescheid oder anderen Steuerbescheid erhalten, der materiell oder formell fehlerhaft ist. Frist unbedingt wahren.',
    fields: [
      { id: 'finanzamt', label: 'Finanzamt (Empfänger:in)', type: 'text', required: true, placeholder: 'Finanzamt Berlin-Mitte' },
      { id: 'mandant', label: 'Mandant:in (Steuerpflichtige:r)', type: 'text', required: true },
      { id: 'steuernummer', label: 'Steuernummer', type: 'text', required: true, placeholder: '11/222/33333' },
      { id: 'bescheidDatum', label: 'Datum des Bescheids', type: 'date', required: true },
      { id: 'steuerart', label: 'Steuerart und Veranlagungszeitraum', type: 'text', required: true, placeholder: 'Einkommensteuer 2023' },
      { id: 'begruendung', label: 'Einspruchsbegründung', type: 'textarea', required: true, hint: 'Konkrete Angriffspunkte benennen: fehlerhafte Schätzung, unberücksichtigte Betriebsausgaben, Rechtsanwendungsfehler etc.' },
      { id: 'beweismittel', label: 'Beweismittel / Anlagen', type: 'textarea', placeholder: 'Kontoauszüge, Belege, Verträge' },
    ],
    render: f => `An ${f.finanzamt || '[Finanzamt]'}

Einspruch gem. § 347 AO

in der Sache: ${f.mandant || '[Mandant:in]'}
Steuernummer: ${f.steuernummer || '[Steuernummer]'}
Bescheid über ${f.steuerart || '[Steuerart/VZ]'} vom ${f.bescheidDatum || '[Datum]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}, lege ich gegen den oben bezeichneten Bescheid innerhalb der Einspruchsfrist des § 355 Abs. 1 AO

E i n s p r u c h

ein und beantrage, den Bescheid aufzuheben, hilfsweise zu ändern.

I. Zulässigkeit

Der Einspruch ist gem. § 347 Abs. 1 Nr. 1 AO statthaft. Die Einspruchsfrist von einem Monat ab Bekanntgabe (§ 355 Abs. 1 AO, § 122 Abs. 2 AO) ist gewahrt. Die Beschwer liegt vor.

II. Begründung

${f.begruendung || '[Einspruchsbegründung einfügen]'}

III. Beweismittel

${f.beweismittel || '— Beizufügende Belege werden nachgereicht bzw. liegen an.'}

Ich beantrage,
— den angefochtenen Bescheid aufzuheben / zu ändern,
— die Zuziehung eines Bevollmächtigten gem. § 139 Abs. 3 FGO für notwendig zu erklären,
— vorsorglich Aussetzung der Vollziehung gem. § 361 AO.

Die Bevollmächtigung wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'antrag_aussetzung_vollziehung',
    title: 'AdV-Antrag (§ 361 AO / § 69 FGO)',
    description: 'Antrag auf Aussetzung der Vollziehung bei ernstlichen Zweifeln an der Rechtmäßigkeit oder unbilliger Härte.',
    useCase: 'Im laufenden Einspruchsverfahren oder nach Klageerhebung — Mandant:in soll nicht zahlen müssen, bevor über den Streit entschieden ist.',
    fields: [
      { id: 'finanzamt', label: 'Finanzamt / Finanzgericht (Empfänger:in)', type: 'text', required: true, placeholder: 'Finanzamt Berlin-Mitte / Finanzgericht Berlin-Brandenburg' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'steuernummer', label: 'Steuernummer / Az. FG', type: 'text', required: true },
      { id: 'bescheidDatum', label: 'Datum des angefochtenen Bescheids', type: 'date', required: true },
      { id: 'steuerart', label: 'Steuerart und Veranlagungszeitraum', type: 'text', required: true, placeholder: 'Körperschaftsteuer 2022' },
      { id: 'streitbetrag', label: 'Streitiger Betrag (€)', type: 'text', required: true, placeholder: '12.450,00' },
      { id: 'adv_begruendung', label: 'Begründung der ernstlichen Zweifel / unbilligen Härte', type: 'textarea', required: true, hint: 'Ernstliche Zweifel i. S. d. § 361 Abs. 2 S. 2 AO oder unbillige Härte i. S. d. § 361 Abs. 2 S. 2 a. E. AO.' },
    ],
    render: f => `An ${f.finanzamt || '[Finanzamt / Finanzgericht]'}

Antrag auf Aussetzung der Vollziehung
gem. § 361 AO / § 69 FGO

in der Sache: ${f.mandant || '[Mandant:in]'}
Steuernummer / Az.: ${f.steuernummer || '[Steuernummer/Az.]'}
Bescheid über ${f.steuerart || '[Steuerart/VZ]'} vom ${f.bescheidDatum || '[Datum]'}
Streitiger Nachzahlungsbetrag: € ${f.streitbetrag || '[Betrag]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich,

die Vollziehung des o. g. Bescheids in Höhe von € ${f.streitbetrag || '[Betrag]'} gem. § 361 Abs. 2 AO (im Einspruchsverfahren) / § 69 Abs. 2 FGO (im Klageverfahren) auszusetzen.

I. Zulässigkeit

Gegen den Bescheid ist Einspruch / Klage erhoben; das Verfahren ist anhängig. Der Antrag ist daher statthaft.

II. Begründung

Es bestehen ernstliche Zweifel an der Rechtmäßigkeit des angefochtenen Bescheids i. S. d. § 361 Abs. 2 S. 2 AO / § 69 Abs. 2 S. 2 FGO:

${f.adv_begruendung || '[Begründung ernstliche Zweifel / unbillige Härte einfügen]'}

III. Ergebnis

Eine Vollziehung des Bescheids vor Abschluss des Hauptsacheverfahrens würde für meine Mandantschaft eine unbillige Härte bedeuten. Die steuerlichen Interessen des Fiskus werden durch die übliche Sicherheitsleistung oder AdV ohne Sicherheitsleistung (bei zweifelsfreiem Rückzahlungsanspruch) hinreichend gewahrt.

Ich bitte um kurzfristige Entscheidung.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'schaetzung_erlaeuterung',
    title: 'Erläuterung gegen Schätzungsbescheid',
    description: 'Einspruch mit nachgereichter Steuererklärung gegen einen Schätzungsbescheid gem. § 162 AO.',
    useCase: 'Mandant:in hat Steuererklärung nicht abgegeben; Finanzamt hat geschätzt (§ 162 AO). Einspruch + nachgereichte Erklärung sind der Standardweg.',
    fields: [
      { id: 'finanzamt', label: 'Finanzamt', type: 'text', required: true, placeholder: 'Finanzamt Charlottenburg' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'steuernummer', label: 'Steuernummer', type: 'text', required: true },
      { id: 'bescheidDatum', label: 'Datum des Schätzungsbescheids', type: 'date', required: true },
      { id: 'steuerart', label: 'Steuerart und Veranlagungszeitraum', type: 'text', required: true, placeholder: 'Einkommensteuer 2022' },
      { id: 'schaetzBetrag', label: 'Geschätzter Steuerbetrag (€)', type: 'text', placeholder: '8.900,00' },
      { id: 'erklaerungBeigefuegt', label: 'Erklärung beigefügt?', type: 'text', required: true, placeholder: 'ja — Anlage ESt-Erklärung 2022' },
      { id: 'abweichung', label: 'Erläuterung der Abweichung vom Schätzwert', type: 'textarea', required: true, hint: 'Warum weicht die tatsächliche Besteuerungsgrundlage von der Schätzung ab?' },
    ],
    render: f => `An ${f.finanzamt || '[Finanzamt]'}

Einspruch gegen Schätzungsbescheid / Nachreichung Steuererklärung
gem. §§ 347, 162 AO

in der Sache: ${f.mandant || '[Mandant:in]'}
Steuernummer: ${f.steuernummer || '[Steuernummer]'}
Schätzungsbescheid ${f.steuerart || '[Steuerart/VZ]'} vom ${f.bescheidDatum || '[Datum]'}${f.schaetzBetrag ? `\nGeschätzter Steuerbetrag: € ${f.schaetzBetrag}` : ''}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft lege ich gegen den o. g. Schätzungsbescheid

E i n s p r u c h

ein und reiche gleichzeitig die Steuererklärung für den o. g. Veranlagungszeitraum nach.

I. Zur Schätzung (§ 162 AO)

Die Schätzung ist durch Nichtabgabe der Erklärung veranlasst worden. Die Voraussetzungen für eine Schätzung nach § 162 Abs. 1 AO lagen damit zwar formell vor; der Bescheid ist jedoch der Höhe nach fehlerhaft, da die tatsächlichen Besteuerungsgrundlagen erheblich von der Schätzung abweichen.

II. Nachgereichte Steuererklärung

${f.erklaerungBeigefuegt || 'Die Steuererklärung für den Veranlagungszeitraum wird als Anlage beigefügt.'}

III. Abweichung vom Schätzwert

${f.abweichung || '[Erläuterung der Abweichung einfügen]'}

Ich beantrage, den angefochtenen Schätzungsbescheid aufzuheben und die Veranlagung auf Grundlage der nachgereichten Steuererklärung durchzuführen.

Sollten noch Rückfragen bestehen, stehe ich für Rücksprache zur Verfügung.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'fristverlaengerung_steuererklaerung',
    title: 'Fristverlängerungsantrag (§ 109 AO)',
    description: 'Antrag auf Verlängerung der Abgabefrist für die Steuererklärung gem. § 109 AO.',
    useCase: 'Steuererklärungsfrist läuft ab und Unterlagen oder Buchhaltung liegen noch nicht vollständig vor. Antrag muss vor Fristablauf gestellt werden.',
    fields: [
      { id: 'finanzamt', label: 'Finanzamt', type: 'text', required: true, placeholder: 'Finanzamt Steglitz-Zehlendorf' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'steuernummer', label: 'Steuernummer', type: 'text', required: true },
      { id: 'steuerart', label: 'Steuerart und Veranlagungszeitraum', type: 'text', required: true, placeholder: 'Einkommensteuer 2024' },
      { id: 'bisherigeFrist', label: 'Bisherige Abgabefrist', type: 'date', required: true },
      { id: 'neueFrist', label: 'Beantragte neue Frist', type: 'date', required: true },
      { id: 'begruendung', label: 'Begründung (§ 109 Abs. 1 AO: erheblicher Grund)', type: 'textarea', required: true, hint: 'Erheblicher Grund i. S. d. § 109 Abs. 1 S. 1 AO: z. B. fehlende Belege, Krankheit, Unternehmensumstrukturierung.' },
    ],
    render: f => `An ${f.finanzamt || '[Finanzamt]'}

Antrag auf Verlängerung der Erklärungsfrist
gem. § 109 AO

in der Sache: ${f.mandant || '[Mandant:in]'}
Steuernummer: ${f.steuernummer || '[Steuernummer]'}
Steuerart / Veranlagungszeitraum: ${f.steuerart || '[Steuerart/VZ]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich gem. § 109 Abs. 1 AO,

die Frist zur Abgabe der ${f.steuerart || '[Steuerart/VZ]'}-Erklärung
von bisher ${f.bisherigeFrist || '[bisherige Frist]'}
auf den ${f.neueFrist || '[neue Frist]'}

zu verlängern.

I. Begründung

${f.begruendung || '[Erheblicher Grund i. S. d. § 109 Abs. 1 S. 1 AO einfügen]'}

II. Hinweis

Innerhalb der beantragten Verlängerungsfrist wird die vollständige und prüffähige Erklärung eingereicht werden. Ich versichere, dass der Antrag nicht der Verschleppung dient und die Frist auch nicht zu steuerlichen Nachteilen des Fiskus führen wird.

Ich bitte um schriftliche Bestätigung der Fristverlängerung.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'stundung_antrag',
    title: 'Stundungsantrag (§ 222 AO)',
    description: 'Antrag auf Stundung fälliger Steuerschulden bei erheblicher Härte gem. § 222 AO.',
    useCase: 'Mandant:in ist vorübergehend zahlungsunfähig oder bei sofortiger Zahlung in wirtschaftliche Not. Stundung setzt erhebliche Härte und kein Verschulden voraus.',
    fields: [
      { id: 'finanzamt', label: 'Finanzamt', type: 'text', required: true, placeholder: 'Finanzamt Neukölln' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'steuernummer', label: 'Steuernummer', type: 'text', required: true },
      { id: 'steuerart', label: 'Steuerart / Fälligkeitsdatum', type: 'text', required: true, placeholder: 'Körperschaftsteuer-Vorauszahlung, fällig 10.03.2025' },
      { id: 'betrag', label: 'Zu stundender Betrag (€)', type: 'text', required: true, placeholder: '15.300,00' },
      { id: 'stundungsBis', label: 'Stundung beantragt bis', type: 'date', required: true },
      { id: 'begruendung', label: 'Begründung der erheblichen Härte', type: 'textarea', required: true, hint: 'Liquiditätsengpass, außergewöhnliche Geschäftslage, Zahlungsausfall Forderungen etc. Belege beifügen.' },
      { id: 'sicherheit', label: 'Angebotene Sicherheitsleistung (§ 222 S. 2 AO)', type: 'text', placeholder: 'keine / Grundpfandrecht / Bürgschaft' },
    ],
    render: f => `An ${f.finanzamt || '[Finanzamt]'}

Stundungsantrag gem. § 222 AO

in der Sache: ${f.mandant || '[Mandant:in]'}
Steuernummer: ${f.steuernummer || '[Steuernummer]'}
Betreff: ${f.steuerart || '[Steuerart/Fälligkeit]'}
Zu stundender Betrag: € ${f.betrag || '[Betrag]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich gem. § 222 S. 1 AO,

die o. g. Steuerschuld in Höhe von € ${f.betrag || '[Betrag]'} bis zum ${f.stundungsBis || '[Datum]'} zu stunden.

I. Voraussetzungen (§ 222 AO)

Die Einziehung der Steuer zum gegenwärtigen Zeitpunkt würde für meine Mandantschaft eine erhebliche Härte bedeuten. Die Härte ist nicht selbstverschuldet.

II. Sachverhalt

${f.begruendung || '[Begründung der erheblichen Härte einfügen]'}

III. Sicherheitsleistung

${f.sicherheit ? `Meine Mandantschaft bietet als Sicherheit an: ${f.sicherheit}.` : 'Eine Sicherheitsleistung gem. § 222 S. 2 AO wird angeboten, soweit das Finanzamt dies für erforderlich hält.'}

IV. Rückzahlung

Meine Mandantschaft wird in der Lage sein, den gestundeten Betrag spätestens zum beantragten Termin vollständig zu begleichen. Eine Ratenzahlungsvereinbarung ist alternativ möglich.

Ich bitte um kurzfristige Entscheidung vor dem Fälligkeitstermin.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'erlassantrag',
    title: 'Erlassantrag (§ 227 AO — Billigkeitserlass)',
    description: 'Antrag auf Erlass von Steuern oder steuerlichen Nebenleistungen aus sachlichen oder persönlichen Billigkeitsgründen.',
    useCase: 'Mandant:in kann eine festgesetzte Steuer dauerhaft nicht entrichten (persönliche Billigkeit) oder die Festsetzung ist im Einzelfall unbillig (sachliche Billigkeit); Ermessensentscheidung des FA.',
    fields: [
      { id: 'finanzamt', label: 'Finanzamt', type: 'text', required: true, placeholder: 'Finanzamt Mitte' },
      { id: 'mandant', label: 'Mandant:in', type: 'text', required: true },
      { id: 'steuernummer', label: 'Steuernummer', type: 'text', required: true },
      { id: 'steuerart', label: 'Steuerart / Bescheid(e)', type: 'text', required: true, placeholder: 'Einkommensteuer 2021 und 2022 nebst Nachzahlungszinsen' },
      { id: 'betrag', label: 'Zu erlassender Betrag (€)', type: 'text', required: true },
      { id: 'erlassArt', label: 'Art der Billigkeit', type: 'text', required: true, placeholder: 'persönlich (§ 227 AO i. V. m. AEAO zu § 227) / sachlich' },
      { id: 'begruendung', label: 'Begründung', type: 'textarea', required: true, hint: 'Persönliche Billigkeit: Einkommens-/Vermögensverhältnisse, existenzbedrohende Lage. Sachliche Billigkeit: Widerspruch zum Sinn und Zweck der Norm, atypischer Sachverhalt.' },
    ],
    render: f => `An ${f.finanzamt || '[Finanzamt]'}

Antrag auf Erlass aus Billigkeitsgründen
gem. § 227 AO

in der Sache: ${f.mandant || '[Mandant:in]'}
Steuernummer: ${f.steuernummer || '[Steuernummer]'}
Betreff: ${f.steuerart || '[Steuerart/Bescheide]'}
Erlassbetrag: € ${f.betrag || '[Betrag]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich,

die o. g. Steuern / steuerlichen Nebenleistungen in Höhe von € ${f.betrag || '[Betrag]'} gem. § 227 AO aus ${f.erlassArt || 'Billigkeitsgründen'} zu erlassen.

I. Rechtsgrundlage

§ 227 AO räumt der Finanzbehörde das Ermessen ein, Ansprüche aus dem Steuerschuldverhältnis zu erlassen, wenn deren Einziehung nach Lage des einzelnen Falles unbillig wäre. AEAO zu § 227 präzisiert die Fallgruppen.

II. Begründung

${f.begruendung || '[Begründung persönlicher / sachlicher Billigkeit einfügen]'}

III. Ermessenserwägungen

Ich weise vorsorglich darauf hin, dass das Finanzamt sein Ermessen pflichtgemäß auszuüben hat (§ 5 AO) und eine vollständige Ermittlung der wirtschaftlichen Verhältnisse geboten ist. Eine Ablehnung ohne Ermessensausübung wäre rechtswidrig und angreifbar.

Ich bin bereit, auf Anforderung weitere Nachweise (Vermögensverzeichnis, Einkommensnachweise) vorzulegen.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'selbstanzeige',
    title: 'Selbstanzeige (§ 371 AO — Steuerhinterziehung)',
    description: 'Strafbefreiende Selbstanzeige gem. § 371 AO. Vollständigkeitsgebot und Sperrgründe beachten — anwaltliche Einzelfallprüfung zwingend.',
    useCase: 'Mandant:in hat Steuern hinterzogen (§ 370 AO) und möchte Straffreiheit durch vollständige und fristgerechte Selbstanzeige erlangen. Höchste Sorgfalt erforderlich.',
    fields: [
      { id: 'finanzamt', label: 'Finanzamt (für die betroffene Steuerart zuständig)', type: 'text', required: true, placeholder: 'Finanzamt Berlin-Mitte — Straf- und Bußgeldsachenstelle' },
      { id: 'mandant', label: 'Mandant:in (Anzeigender)', type: 'text', required: true },
      { id: 'steuernummer', label: 'Steuernummer(n)', type: 'text', required: true },
      { id: 'steuerarten', label: 'Betroffene Steuerarten', type: 'text', required: true, placeholder: 'Einkommensteuer, Gewerbesteuer, Umsatzsteuer' },
      { id: 'zeitraum', label: 'Hinterziehungszeitraum (vollständig!)', type: 'text', required: true, hint: 'Vollständigkeitsgebot § 371 Abs. 1 AO: alle unverjährten Zeiträume, mind. 10 Jahre rückwirkend angeben.' },
      { id: 'sachdarstellung', label: 'Sachdarstellung und berichtigte Besteuerungsgrundlagen', type: 'textarea', required: true, hint: 'Vollständige, richtige, in sich stimmige Darstellung aller nicht erklärten Einnahmen/Umsätze. Unvollständigkeit macht Selbstanzeige unwirksam (§ 371 Abs. 1 AO).' },
      { id: 'nachzahlungsBetrag', label: 'Voraussichtliche Nachzahlung + Zinsen (§ 235 AO) (€)', type: 'text', required: true },
    ],
    render: f => `An ${f.finanzamt || '[Finanzamt / Straf- und Bußgeldsachenstelle]'}

Selbstanzeige gem. § 371 AO
— VERTRAULICH —

in der Sache: ${f.mandant || '[Mandant:in]'}
Steuernummer(n): ${f.steuernummer || '[Steuernummer]'}
Betroffene Steuerarten: ${f.steuerarten || '[Steuerarten]'}
Zeitraum: ${f.zeitraum || '[Hinterziehungszeitraum]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft erstatte ich hiermit

S e l b s t a n z e i g e

gem. § 371 Abs. 1 AO und berichtige die unrichtigen und unvollständigen Angaben in den Steuererklärungen für die o. g. Zeiträume und Steuerarten.

I. Vollständigkeitsgebot (§ 371 Abs. 1 AO)

Die nachstehende Berichtigung erfasst sämtliche hinterzogenen Beträge für alle unverjährten Veranlagungszeiträume. Das Vollständigkeitsgebot gem. § 371 Abs. 1 AO wird als bindend anerkannt: Eine Teilselbstanzeige entfaltet keine strafbefreiende Wirkung (BGH, Beschl. v. 20.05.2010 — 1 StR 577/09; § 371 Abs. 1 AO i. d. F. des Schwarzgeldbekämpfungsgesetzes 2011).

II. Sachdarstellung und berichtigte Besteuerungsgrundlagen

${f.sachdarstellung || '[Vollständige Sachdarstellung und berichtigte Bemessungsgrundlagen einfügen — nach Steuerart und Veranlagungszeitraum gegliedert]'}

III. Prüfung der Sperrgründe (§ 371 Abs. 2 AO)

Vor Einreichung dieser Anzeige wurde geprüft, ob Sperrgründe vorliegen:
— § 371 Abs. 2 S. 1 Nr. 1 AO: Erscheinen eines Amtsträgers zur steuerlichen Prüfung?
— § 371 Abs. 2 S. 1 Nr. 1a AO: Bekanntgabe einer Prüfungsanordnung gem. § 196 AO?
— § 371 Abs. 2 S. 1 Nr. 1b AO: Erscheinen eines Amtsträgers zur Ermittlung einer Steuerstraftat?
— § 371 Abs. 2 S. 1 Nr. 2 AO: Tatentdeckung und Kenntnis der anzeigenden Person davon?
— § 371 Abs. 2 S. 1 Nr. 3 AO: Hinterziehungsbetrag je Tat > € 25.000?
— § 371 Abs. 2 S. 1 Nr. 4 AO: Besonders schwerer Fall gem. § 370 Abs. 3 S. 2 Nr. 2–6 AO?

Sperrgründe sind nach derzeitigem Kenntnisstand nicht gegeben. Die anwaltliche Einschätzung erfolgt unter Vorbehalt weiterer Sachverhaltsaufklärung.

Hinweis: Bei Hinterziehungsbeträgen über € 25.000 (§ 371 Abs. 2 S. 1 Nr. 3 AO) ist die Straffreiheit trotz wirksamer Selbstanzeige an die vollständige Nachzahlung zzgl. eines Zuschlags gem. § 398a AO gebunden.

IV. Nachzahlung (§ 371 Abs. 3 AO)

Die strafbefreiende Wirkung tritt gem. § 371 Abs. 3 AO nur ein, wenn die hinterzogenen Steuern, Hinterziehungszinsen (§ 235 AO) und ggf. Zinsen gem. § 233a AO innerhalb der vom Finanzamt gesetzten angemessenen Frist entrichtet werden.

Voraussichtliche Gesamtnachzahlung: € ${f.nachzahlungsBetrag || '[Betrag]'}

Meine Mandantschaft ist zur unverzüglichen Zahlung bereit und bittet um Mitteilung der Zahlungskonten und Steuerreferenzen.

V. Prozessualer Hinweis

Diese Selbstanzeige entfaltet ihre strafbefreiende Wirkung nur, wenn sie vollständig, richtig und fristgerecht ist sowie keine Sperrgründe vorliegen. Die steuerstrafrechtliche Bewertung bleibt der zuständigen Straf- und Bußgeldsachenstelle vorbehalten. Eine gesonderte Mitteilung an die Staatsanwaltschaft ist bei Überschreiten der Zuständigkeitsgrenze (§ 386 Abs. 2 AO, § 370 Abs. 3 AO) möglich.

${SIGN_OFF}

⚠ KANZLEI-INTERNER HINWEIS: Vor Einreichung zwingend prüfen: (1) Vollständigkeit aller Zeiträume und Steuerarten, (2) Sperrgründe § 371 Abs. 2 AO, (3) Zuschlag § 398a AO bei Großbeträgen, (4) steuerstrafrechtliche Verjährung (§ 376 AO: 15 Jahre bei schwerer Hinterziehung). Dieses Template ersetzt keine Einzelfallprüfung.
`,
  },

  // ---------------------------------
  {
    id: 'klage_finanzgericht',
    title: 'Klageschrift Finanzgericht (§ 40 FGO)',
    description: 'Anfechtungsklage / Verpflichtungsklage beim Finanzgericht nach erfolglosem Einspruch.',
    useCase: 'Einspruch wurde durch Einspruchsentscheidung zurückgewiesen; Klagefrist 1 Monat ab Bekanntgabe (§ 47 Abs. 1 FGO). Klage per Fax/Schriftform beim zuständigen FG.',
    fields: [
      { id: 'finanzgericht', label: 'Finanzgericht (Empfänger:in)', type: 'text', required: true, placeholder: 'Finanzgericht Berlin-Brandenburg, Cottbus' },
      { id: 'klaeger', label: 'Kläger:in (Mandant:in)', type: 'text', required: true },
      { id: 'klaegerAnschrift', label: 'Anschrift Kläger:in', type: 'textarea', required: true },
      { id: 'beklagter', label: 'Beklagte:r (Finanzamt)', type: 'text', required: true, placeholder: 'Finanzamt Berlin-Mitte' },
      { id: 'einspruchEntscheidung', label: 'Datum Einspruchsentscheidung', type: 'date', required: true },
      { id: 'steuerart', label: 'Streitgegenstand (Steuerart / VZ)', type: 'text', required: true, placeholder: 'Einkommensteuer 2021' },
      { id: 'streitwert', label: 'Streitwert (€)', type: 'text', placeholder: '5.400,00' },
      { id: 'klageantraege', label: 'Klageantrag(e)', type: 'textarea', required: true, hint: 'z. B. „Die Einspruchsentscheidung vom ... und der ESt-Bescheid 2021 vom ... werden aufgehoben."' },
      { id: 'klageBegründung', label: 'Klagebegründung', type: 'textarea', required: true },
    ],
    render: f => `An das ${f.finanzgericht || '[Finanzgericht]'}

K l a g e s c h r i f t

Kläger:in: ${f.klaeger || '[Kläger:in]'}${f.klaegerAnschrift ? `, ${f.klaegerAnschrift.replace(/\n/g, ', ')}` : ''}
— vertreten durch Unterzeichner:in —

Beklagte:r: ${f.beklagter || '[Finanzamt]'}

Streitgegenstand: ${f.steuerart || '[Steuerart/VZ]'}${f.streitwert ? `\nStreitwert: € ${f.streitwert}` : ''}
Einspruchsentscheidung vom: ${f.einspruchEntscheidung || '[Datum]'}

Sehr geehrtes Gericht,

namens und im Auftrag der Kläger:in erhebe ich Klage gem. § 40 Abs. 1 FGO gegen die o. g. Einspruchsentscheidung und beantrage:

I. Klageantrag

${f.klageantraege || '[Klageantrag einfügen]'}

II. Zulässigkeit

Die Klage ist gem. § 40 Abs. 1 FGO (Anfechtungsklage) zulässig. Die Klagefrist des § 47 Abs. 1 FGO von einem Monat ab Bekanntgabe der Einspruchsentscheidung ist gewahrt. Das angerufene Gericht ist gem. § 38 FGO zuständig. Die Kläger:in ist gem. § 40 Abs. 2 FGO klagebefugt (Geltendmachung eigener Rechtsverletzung).

III. Begründetheit

${f.klageBegründung || '[Klagebegründung einfügen]'}

IV. Beweisangebote und Anlagen

Ich rege an, gem. § 79 FGO einen Termin zur Erörterung des Sach- und Streitstands anzuberaumen. Beweismittel werden auf Anforderung des Gerichts vorgelegt.

Vorsorglich beantrage ich gem. § 69 Abs. 3 FGO die Aussetzung der Vollziehung, soweit nicht bereits durch das Finanzamt gewährt.

Die Vollmacht wird anwaltlich versichert.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'erbstg_anzeige',
    title: 'Anzeige Schenkung / Erbschaft (§ 30 ErbStG)',
    description: 'Erfüllung der Anzeigepflicht gem. § 30 ErbStG gegenüber dem Erbschaftsteuer-Finanzamt (Frist: 3 Monate).',
    useCase: 'Mandant:in hat Vermögen durch Erbschaft oder Schenkung erworben und muss dies gem. § 30 ErbStG innerhalb von 3 Monaten beim zuständigen Finanzamt anzeigen.',
    fields: [
      { id: 'finanzamt', label: 'Erbschaftsteuer-Finanzamt', type: 'text', required: true, placeholder: 'Finanzamt Charlottenburg (zuständig für Erbschaft-/Schenkungsteuer)' },
      { id: 'mandant', label: 'Erwerber:in (Mandant:in)', type: 'text', required: true },
      { id: 'mandantAnschrift', label: 'Anschrift Erwerber:in', type: 'textarea' },
      { id: 'steuernummer', label: 'Steuernummer Erwerber:in (sofern bekannt)', type: 'text' },
      { id: 'erwerbsart', label: 'Erwerbsart', type: 'text', required: true, placeholder: 'Erbfall / freigebige Zuwendung (Schenkung)' },
      { id: 'zuwendender', label: 'Erblasser:in / Schenkende:r', type: 'text', required: true },
      { id: 'erwerbsDatum', label: 'Datum des Erwerbs / der Schenkung', type: 'date', required: true },
      { id: 'erworbenesVermoegen', label: 'Erworbenes Vermögen (Art und geschätzter Wert)', type: 'textarea', required: true, hint: 'Grundstücke, Geldbeträge, Wertpapiere, Betriebsvermögen, Kunstgegenstände etc. mit Verkehrswert.' },
      { id: 'verwandtschaft', label: 'Verwandtschaftsverhältnis / Steuerklasse', type: 'text', required: true, placeholder: 'Kind (Steuerklasse I, § 15 Abs. 1 Nr. 2 ErbStG)' },
    ],
    render: f => `An ${f.finanzamt || '[Erbschaftsteuer-Finanzamt]'}

Anzeige gem. § 30 ErbStG

Erwerber:in: ${f.mandant || '[Mandant:in]'}${f.mandantAnschrift ? `\nAnschrift: ${f.mandantAnschrift.replace(/\n/g, ', ')}` : ''}${f.steuernummer ? `\nSteuernummer: ${f.steuernummer}` : ''}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, ${f.mandant || '[Mandant:in]'}, erstate ich folgende

A n z e i g e

gem. § 30 Abs. 1 ErbStG über den nachstehenden Erwerb von Todes wegen / die freigebige Zuwendung.

I. Angaben zum Erwerb

Erwerbsart: ${f.erwerbsart || '[Erbfall / Schenkung]'}
Erblasser:in / Schenkende:r: ${f.zuwendender || '[Name]'}
Datum des Erwerbs / der Schenkung: ${f.erwerbsDatum || '[Datum]'}
Verwandtschaftsverhältnis / Steuerklasse: ${f.verwandtschaft || '[Verhältnis / Steuerklasse]'}

II. Beschreibung des erworbenen Vermögens

${f.erworbenesVermoegen || '[Vermögensbeschreibung mit geschätzten Verkehrswerten einfügen]'}

III. Freibeträge

Ich weise vorsorglich auf die persönlichen Freibeträge gem. § 16 ErbStG hin. Ob eine Steuerpflicht entsteht, ist von der zuständigen Stelle nach Bewertung gem. §§ 151 ff. BewG zu prüfen.

IV. Steuererklärung

Sofern das Finanzamt zur Abgabe einer Erbschaft-/Schenkungsteuererklärung auffordert (§ 31 ErbStG), wird meine Mandantschaft dieser Aufforderung fristgerecht nachkommen.

Diese Anzeige erfolgt innerhalb der Dreimonatsfrist des § 30 Abs. 1 ErbStG.

${SIGN_OFF}
`,
  },

  // ---------------------------------
  {
    id: 'antrag_dauerfristverlaengerung',
    title: 'Dauerfristverlängerung Umsatzsteuer-Voranmeldung (§ 18 UStG)',
    description: 'Antrag auf Dauerfristverlängerung für USt-Voranmeldungen um einen Monat gem. § 18 Abs. 6 UStG i. V. m. §§ 46–48 UStDV.',
    useCase: 'Mandant:in gibt USt-Voranmeldungen ab und benötigt regelmäßig mehr Zeit. Antrag einmalig stellen; gilt bis auf Widerruf. Sondervorauszahlung i. H. v. 1/11 der Vorjahres-USt-Schuld ist zu leisten.',
    fields: [
      { id: 'finanzamt', label: 'Finanzamt', type: 'text', required: true, placeholder: 'Finanzamt Tempelhof-Schöneberg' },
      { id: 'mandant', label: 'Mandant:in (Unternehmer:in)', type: 'text', required: true },
      { id: 'steuernummer', label: 'Steuernummer', type: 'text', required: true },
      { id: 'voranmeldungszeitraum', label: 'Voranmeldungszeitraum', type: 'text', required: true, placeholder: 'monatlich / vierteljährlich' },
      { id: 'abJahr', label: 'Geltung ab Kalenderjahr', type: 'text', required: true, placeholder: '2025' },
      { id: 'sondervorauszahlung', label: 'Sondervorauszahlung (€)', type: 'text', hint: '1/11 der USt-Schuld des Vorjahres (§ 47 UStDV). Entfällt bei Vierteljahres-Zahlern nach § 48 UStDV.', placeholder: '1.200,00' },
    ],
    render: f => `An ${f.finanzamt || '[Finanzamt]'}

Antrag auf Dauerfristverlängerung für Umsatzsteuer-Voranmeldungen
gem. § 18 Abs. 6 UStG i. V. m. §§ 46–48 UStDV

Steuerpflichtige:r: ${f.mandant || '[Mandant:in]'}
Steuernummer: ${f.steuernummer || '[Steuernummer]'}
Voranmeldungszeitraum: ${f.voranmeldungszeitraum || '[monatlich / vierteljährlich]'}
Geltung ab: 01.01.${f.abJahr || '[Jahr]'}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft beantrage ich gem. § 18 Abs. 6 UStG i. V. m. § 46 UStDV,

die Frist zur Abgabe der Umsatzsteuer-Voranmeldungen und zur Entrichtung der Umsatzsteuer-Vorauszahlungen dauerhaft um einen Monat zu verlängern.

I. Sondervorauszahlung

${f.sondervorauszahlung
  ? `Gem. § 47 UStDV wird gleichzeitig eine Sondervorauszahlung in Höhe von € ${f.sondervorauszahlung} (= 1/11 der Umsatzsteuer-Schuld des Vorjahres) angemeldet und bis zum 10. Februar ${f.abJahr || '[Jahr]'} entrichtet.`
  : 'Die Sondervorauszahlung gem. § 47 UStDV wird gesondert angemeldet und fristgerecht entrichtet. Bei vierteljährlicher Voranmeldung entfällt die Sondervorauszahlung nach § 48 UStDV.'}

II. Geltungsdauer

Die Dauerfristverlängerung gilt für den Voranmeldungszeitraum ab dem ${f.abJahr ? `Kalenderjahr ${f.abJahr}` : '[Jahr]'} bis auf Widerruf (§ 46 S. 2 UStDV). Ein Widerruf wird durch gesonderte Erklärung angezeigt.

III. Hinweis

Diese Fristverlängerung bezieht sich ausschließlich auf die Voranmeldungen, nicht auf die Jahressteuererklärung (§ 18 Abs. 3 UStG).

Ich bitte um schriftliche Bestätigung der Dauerfristverlängerung.

${SIGN_OFF}
`,
  },
]

/** Combined list for UI pickers: alle Built-in-Pakete. */
export const ALL_BUILTIN_TEMPLATES: LawyerTemplate[] = [
  ...LAWYER_TEMPLATES,
  ...NOTAR_TEMPLATES,
  ...MIGRATION_TEMPLATES,
  ...FAMILIE_TEMPLATES,
  ...SOZIAL_TEMPLATES,
  ...STEUER_TEMPLATES,
]

export function getAnyBuiltinTemplate(id: string): LawyerTemplate | undefined {
  return ALL_BUILTIN_TEMPLATES.find(t => t.id === id)
}
