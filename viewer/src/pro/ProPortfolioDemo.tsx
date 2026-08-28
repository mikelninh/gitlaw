import { useMemo, useState } from 'react'
import {
  Scale,
  FolderOpen,
  Search,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'
import './pro-theme.css'
import './pro-tone.css'

type Source = {
  id: string
  label: string
  kind: 'Gesetz' | 'Rechtsprechung' | 'Akte'
  excerpt: string
  verified: boolean
}

type MatterDocument = {
  id: string
  name: string
  status: 'bestätigt' | 'zu_pruefen' | 'fehlt'
  note: string
}

type MatterTask = {
  id: string
  label: string
  due: string
  done: boolean
}

type Matter = {
  id: string
  ref: string
  client: string
  area: string
  status: 'aktiv' | 'review' | 'wartet'
  summary: string
  facts: string[]
  documents: MatterDocument[]
  tasks: MatterTask[]
  research: {
    question: string
    answer: string
    sources: Source[]
  }
  open: string[]
  draft: {
    title: string
    body: string
  }
}

type Workspace = 'uebersicht' | 'fakten' | 'dokumente' | 'research' | 'quellen' | 'entwurf' | 'review' | 'audit'

const matters: Matter[] = [
  {
    id: 'miete-kuendigung', ref: '25/0142', client: 'Jusuf Öztürk', area: 'Mietrecht', status: 'review',
    summary: 'Fristlose Kündigung wegen behauptetem Zahlungsverzug. Rückstand, Schonfristzahlung und hilfsweise ordentliche Kündigung getrennt prüfen.',
    facts: ['Kündigung vom 18.08.2026 liegt vor', '1.860 € Rückstand behauptet', 'Nebenkostenanteil wird bestritten', 'Räumungsklage noch nicht zugestellt', 'Mandant wohnt seit 2017 in der Wohnung'],
    documents: [
      { id: 'kuendigung', name: 'Kündigung_18-08-2026.pdf', status: 'bestätigt', note: 'Originalschreiben in der Akte.' },
      { id: 'nk', name: 'Nebenkostenabrechnung_2025.pdf', status: 'zu_pruefen', note: 'Beträge gegen Mandantenangaben abgleichen.' },
      { id: 'konto', name: 'Kontoauszüge_Juni-August.pdf', status: 'fehlt', note: 'Für exakte Rückstandsberechnung erforderlich.' },
    ],
    tasks: [
      { id: 't1', label: 'Rückstand aus Kontoauszügen verifizieren', due: '28.08.2026', done: false },
      { id: 't2', label: 'Kündigungstext auf ordentliche Hilfskündigung prüfen', due: '28.08.2026', done: true },
    ],
    research: {
      question: 'Welche Voraussetzungen gelten für fristlose Kündigung wegen Zahlungsverzugs und welche Wirkung hat eine Schonfristzahlung?',
      answer: 'Arbeitsstand: Kündigungsgrund und Rückstand müssen anhand der Originalunterlagen getrennt geprüft werden. Die Schonfristwirkung betrifft die außerordentliche Kündigung; eine hilfsweise ordentliche Kündigung ist separat zu würdigen. Offene Tatsachenfragen bleiben bis zur Aktenprüfung markiert.',
      sources: [
        { id: '543', label: '§ 543 BGB', kind: 'Gesetz', excerpt: 'Außerordentliche fristlose Kündigung aus wichtigem Grund.', verified: true },
        { id: '569', label: '§ 569 BGB', kind: 'Gesetz', excerpt: 'Ergänzende Regeln zur außerordentlichen Kündigung von Wohnraum.', verified: true },
        { id: 'bgh91', label: 'BGH VIII ZR 91/20', kind: 'Rechtsprechung', excerpt: 'Rechtsprechung zur Schonfristzahlung und ordentlichen Kündigung — Volltextreview erforderlich.', verified: false },
        { id: 'akte-kuend', label: 'Kündigung vom 18.08.2026', kind: 'Akte', excerpt: 'Primärquelle für Wortlaut, Begründung und Hilfsanträge.', verified: true },
      ],
    },
    open: ['Exakte Zusammensetzung des behaupteten Rückstands', 'Kontoauszüge vollständig?', 'Nebenkostenforderung fällig und prüffähig?'],
    draft: { title: 'Stellungnahme zur Kündigung', body: 'Sehr geehrte Damen und Herren,\n\nunter Bezugnahme auf die Kündigung vom 18.08.2026 zeigen wir die Vertretung an. Der behauptete Zahlungsrückstand wird derzeit anhand der Originalunterlagen geprüft. Insbesondere sind streitige Nebenkostenpositionen von laufender Miete zu trennen.\n\n[Offene Tatsachen vor Versand prüfen]\n\nMit freundlichen Grüßen' },
  },
  {
    id: 'weg-beschluss', ref: '25/0156', client: 'WEG Waldstraße 42', area: 'WEG-Recht', status: 'aktiv',
    summary: 'Anfechtung eines Eigentümerbeschlusses nach Verwalter-Abberufung. Fristen, Parteirolle und Beschlussprotokoll müssen zusammengeführt werden.',
    facts: ['Beschlussfassung am 11.08.2026', 'Verwalter wurde abberufen', 'GdWE als Partei erfasst', 'Protokoll liegt als Scan vor', 'Begründungsentwurf noch offen'],
    documents: [
      { id: 'protokoll', name: 'ETV_Protokoll_11-08-2026.pdf', status: 'zu_pruefen', note: 'Beschlusswortlaut und Abstimmung prüfen.' },
      { id: 'einladung', name: 'Einladung_ETV.pdf', status: 'bestätigt', note: 'Tagesordnung dokumentiert.' },
      { id: 'vollmacht', name: 'Prozessvollmacht.pdf', status: 'bestätigt', note: 'Signierte Vollmacht.' },
    ],
    tasks: [
      { id: 't1', label: 'Fristkalender anhand Beschlussdatum prüfen', due: '01.09.2026', done: false },
      { id: 't2', label: 'Beschlusswortlaut extrahieren', due: '29.08.2026', done: false },
    ],
    research: {
      question: 'Welche Fristen und Parteien gelten für die Beschlussanfechtung nach aktuellem WEG?',
      answer: 'Arbeitsstand: Anfechtungs- und Begründungsfrist müssen getrennt im Fristenkalender geführt werden. Die Prozessrolle der Gemeinschaft und die konkrete Beschlussfassung werden mit dem Originalprotokoll abgeglichen.',
      sources: [
        { id: '44weg', label: '§ 44 WEG', kind: 'Gesetz', excerpt: 'Beschlussklagen und gerichtliche Geltendmachung.', verified: false },
        { id: '43weg', label: '§ 43 WEG', kind: 'Gesetz', excerpt: 'Zuständigkeit in Wohnungseigentumssachen.', verified: false },
        { id: '9aweg', label: '§ 9a WEG', kind: 'Gesetz', excerpt: 'Gemeinschaft der Wohnungseigentümer.', verified: false },
        { id: 'akte-proto', label: 'ETV-Protokoll', kind: 'Akte', excerpt: 'Primärquelle für Beschlussinhalt und Datum.', verified: false },
      ],
    },
    open: ['Exakter Beschlusswortlaut', 'Zustellung / Kenntnisstand aller Beteiligten'],
    draft: { title: 'Klagebegründung — Arbeitsentwurf', body: 'Arbeitsentwurf zur Beschlussanfechtung\n\n1. Beschluss und Datum\n2. Anfechtungsgründe\n3. Partei- und Zuständigkeitsprüfung\n\n[Vor Einreichung vollständige Akten- und Quellenprüfung erforderlich]' },
  },
  {
    id: 'eigenbedarf', ref: '25/0171', client: 'Dr. Schulze', area: 'Mietrecht', status: 'wartet',
    summary: 'Eigenbedarfskündigung für Tochter. 78-jährige Mieterin, 32 Jahre Mietdauer; Härtefallabwägung hängt an noch fehlenden Tatsachen.',
    facts: ['Eigenbedarf für Tochter angegeben', 'Mietdauer 32 Jahre', 'Mieterin 78 Jahre alt', 'Widerspruch angekündigt', 'Ersatzwohnraum noch nicht dokumentiert'],
    documents: [
      { id: 'eigen', name: 'Eigenbedarfskuendigung.pdf', status: 'bestätigt', note: 'Begründung und benannte Person vorhanden.' },
      { id: 'wider', name: 'Widerspruch_Mieterin.pdf', status: 'zu_pruefen', note: 'Härtegründe extrahieren, nicht inferieren.' },
      { id: 'attest', name: 'Ärztliche Unterlagen.pdf', status: 'fehlt', note: 'Nur falls Mandantin sie tatsächlich vorlegt.' },
    ],
    tasks: [
      { id: 't1', label: 'Widerspruch vollständig prüfen', due: '02.09.2026', done: false },
      { id: 't2', label: 'Nutzungswunsch Tochter dokumentieren', due: '30.08.2026', done: true },
    ],
    research: {
      question: 'Welche Anforderungen gelten für Eigenbedarf und Härtefallabwägung?',
      answer: 'Arbeitsstand: Der Nutzungswunsch ist von der Härtefallabwägung zu trennen. Alter und Mietdauer sind keine automatisch entscheidenden Regeln; die konkrete Tatsachengrundlage muss aus Akte und Rechtsprechung geprüft werden.',
      sources: [
        { id: '573', label: '§ 573 BGB', kind: 'Gesetz', excerpt: 'Ordentliche Kündigung und berechtigtes Interesse.', verified: true },
        { id: '574', label: '§ 574 BGB', kind: 'Gesetz', excerpt: 'Widerspruch des Mieters wegen unzumutbarer Härte.', verified: true },
        { id: '574a', label: '§ 574a BGB', kind: 'Gesetz', excerpt: 'Fortsetzung des Mietverhältnisses nach Widerspruch.', verified: true },
        { id: 'akte-wider', label: 'Widerspruch der Mieterin', kind: 'Akte', excerpt: 'Konkrete behauptete Härtegründe.', verified: false },
      ],
    },
    open: ['Konkrete gesundheitliche Härtegründe', 'Verfügbarkeit zumutbaren Ersatzwohnraums', 'Zeitplan des behaupteten Eigenbedarfs'],
    draft: { title: 'Aktenvermerk Härtefallprüfung', body: 'Aktenvermerk\n\nDer Eigenbedarf ist anhand des Kündigungsschreibens dokumentiert. Die Härtefallprüfung bleibt offen, solange die angekündigten Unterlagen und die konkrete Wohn-/Gesundheitssituation nicht vollständig vorliegen.\n\nKeine Schlussfolgerung aus Alter oder Mietdauer allein.' },
  },
  {
    id: 'migration-familie', ref: '26/0204', client: 'Nguyen Familie', area: 'Migrationsrecht', status: 'review',
    summary: 'Familiennachzug: Dokumente aus zwei Sprachen, fehlende Urkunde und eine nahende Behördenfrist. Eingang ≠ geprüft.',
    facts: ['Antragstellerin in Berlin', 'Ehepartner in Vietnam', 'Termin bei Auslandsvertretung dokumentiert', 'Heiratsurkunde als Scan vorhanden', 'Beglaubigte Übersetzung noch nicht bestätigt'],
    documents: [
      { id: 'pass', name: 'Pass_Scan.pdf', status: 'bestätigt', note: 'Lesbarer synthetischer Scan.' },
      { id: 'heirat', name: 'Heiratsurkunde_VI.pdf', status: 'zu_pruefen', note: 'Original/Übersetzung getrennt prüfen.' },
      { id: 'ueber', name: 'Beglaubigte_Uebersetzung.pdf', status: 'fehlt', note: 'Nicht automatisch als vorhanden behandeln.' },
      { id: 'termin', name: 'Terminbestaetigung.pdf', status: 'bestätigt', note: 'Termin dokumentiert.' },
    ],
    tasks: [
      { id: 't1', label: 'Übersetzung nachfordern', due: '29.08.2026', done: false },
      { id: 't2', label: 'Dokumentencheck für Mandant:in aktualisieren', due: '29.08.2026', done: false },
    ],
    research: {
      question: 'Welche Unterlagen und offenen Rechtsfragen sind für diesen synthetischen Familiennachzug zuerst zu prüfen?',
      answer: 'Arbeitsstand: GitLaw trennt Dokumentvollständigkeit, Identität/Beziehung und die eigentliche rechtliche Subsumtion. Fehlende oder nur eingegangene Dokumente werden nicht als geprüft behandelt.',
      sources: [
        { id: 'aufenthg27', label: '§ 27 AufenthG', kind: 'Gesetz', excerpt: 'Grundsatz des Familiennachzugs.', verified: true },
        { id: 'aufenthg30', label: '§ 30 AufenthG', kind: 'Gesetz', excerpt: 'Ehegattennachzug — konkrete Voraussetzungen fallbezogen prüfen.', verified: false },
        { id: 'heirat-akte', label: 'Heiratsurkunde (Scan)', kind: 'Akte', excerpt: 'Eingegangen; Dokumentenstatus noch im Review.', verified: false },
      ],
    },
    open: ['Beglaubigte Übersetzung vorhanden?', 'Welcher konkrete Verfahrensstand ist behördlich bestätigt?', 'Weitere fallbezogene Voraussetzungen aus Originalunterlagen'],
    draft: { title: 'Mandanten-Checkliste DE / VI', body: 'Noch benötigt / Còn cần:\n\n☐ Beglaubigte Übersetzung der Heiratsurkunde\n☐ Bestätigung des aktuellen Verfahrensstands\n\nEingegangen bedeutet noch nicht anwaltlich geprüft.' },
  },
  {
    id: 'strafrecht', ref: '26/0218', client: 'Anna Schmidt', area: 'Strafrecht', status: 'aktiv',
    summary: 'Cyberstalking-Vorwurf mit Chat-Exporten und Screenshots. Zeitleiste und Beweismittelherkunft müssen nachvollziehbar bleiben.',
    facts: ['Vorladung als Beschuldigte liegt vor', 'Chat-Export umfasst 312 Nachrichten', 'Screenshots aus zwei Geräten', 'Keine Einlassung dokumentiert', 'Zeitstempel teilweise unterschiedliche Zeitzonen'],
    documents: [
      { id: 'vorladung', name: 'Vorladung.pdf', status: 'bestätigt', note: 'Aktenzeichen und Termin erfasst.' },
      { id: 'chats', name: 'Chat_Export.zip', status: 'zu_pruefen', note: 'Metadaten und Chronologie prüfen.' },
      { id: 'screens', name: 'Screenshots.zip', status: 'zu_pruefen', note: 'Herkunft und Duplikate prüfen.' },
    ],
    tasks: [
      { id: 't1', label: 'Chronologie aus Beweismitteln aufbauen', due: '31.08.2026', done: false },
      { id: 't2', label: 'Akteneinsicht-Status prüfen', due: '29.08.2026', done: false },
    ],
    research: {
      question: 'Welche Tatbestandsmerkmale und Beweisfragen müssen anhand der Akte getrennt geprüft werden?',
      answer: 'Arbeitsstand: Rechtsfrage und Beweislage bleiben getrennte Ebenen. Chat-Inhalte werden nicht als vollständig oder authentisch behauptet, solange Herkunft, Vollständigkeit und Kontext nicht überprüft sind.',
      sources: [
        { id: '238', label: '§ 238 StGB', kind: 'Gesetz', excerpt: 'Nachstellung — Tatbestandsvarianten fallbezogen prüfen.', verified: true },
        { id: 'vorladung-akte', label: 'Vorladung', kind: 'Akte', excerpt: 'Verfahrensdaten aus Primärdokument.', verified: true },
        { id: 'chat-akte', label: 'Chat-Export', kind: 'Akte', excerpt: 'Eingegangen, technische/inhaltliche Prüfung offen.', verified: false },
      ],
    },
    open: ['Vollständigkeit der Chat-Historie', 'Zeitstempel normalisieren', 'Akteneinsicht vollständig?'],
    draft: { title: 'Interner Aktenvermerk', body: 'Interner Aktenvermerk\n\nVor rechtlicher Bewertung sind Chronologie, Herkunft und Vollständigkeit der elektronischen Beweismittel zu prüfen. Eine Einlassung wird in diesem synthetischen Workflow nicht automatisch erzeugt oder versendet.' },
  },
  {
    id: 'sozialrecht', ref: '26/0227', client: 'Mara Becker', area: 'Sozialrecht', status: 'wartet',
    summary: 'Widerspruch gegen Leistungsbescheid. Bescheid, Berechnungsbogen und tatsächliche Haushaltsdaten müssen abgeglichen werden.',
    facts: ['Bescheid zugestellt am 19.08.2026', 'Widerspruchsabsicht dokumentiert', 'Berechnungsbogen vorhanden', 'Mietänderung zum 01.08.2026 behauptet', 'Nachweis zur neuen Miete fehlt'],
    documents: [
      { id: 'bescheid', name: 'Bescheid_19-08-2026.pdf', status: 'bestätigt', note: 'Primärdokument.' },
      { id: 'bogen', name: 'Berechnungsbogen.pdf', status: 'zu_pruefen', note: 'Positionen mit Evidenz abgleichen.' },
      { id: 'miete', name: 'Mietaenderung.pdf', status: 'fehlt', note: 'Noch nicht belegt.' },
    ],
    tasks: [
      { id: 't1', label: 'Widerspruchsfrist in Kalender übernehmen', due: '28.08.2026', done: true },
      { id: 't2', label: 'Mietnachweis anfordern', due: '28.08.2026', done: false },
    ],
    research: {
      question: 'Welche Bescheidpositionen lassen sich aus der vorliegenden Akte bereits nachvollziehen und welche nicht?',
      answer: 'Arbeitsstand: Der Workflow markiert belegte, streitige und fehlende Tatsachen separat. Die Demo berechnet keinen verbindlichen Leistungsanspruch und ersetzt keine anwaltliche Prüfung.',
      sources: [
        { id: 'sgg84', label: '§ 84 SGG', kind: 'Gesetz', excerpt: 'Widerspruchsfrist — konkrete Zustellung prüfen.', verified: true },
        { id: 'bescheid-akte', label: 'Bescheid', kind: 'Akte', excerpt: 'Zustellung und Verfügungssatz aus Primärdokument.', verified: true },
        { id: 'bogen-akte', label: 'Berechnungsbogen', kind: 'Akte', excerpt: 'Review der Einzelpositionen offen.', verified: false },
      ],
    },
    open: ['Nachweis der Mietänderung', 'Welche Position des Berechnungsbogens wird konkret bestritten?'],
    draft: { title: 'Fristwahrender Widerspruch — Entwurf', body: 'Sehr geehrte Damen und Herren,\n\nhiermit wird gegen den Bescheid vom 19.08.2026 fristwahrend Widerspruch eingelegt. Eine Begründung bleibt nach vollständiger Prüfung der Berechnungsgrundlagen und noch ausstehender Nachweise vorbehalten.\n\n[Vor Versand anwaltlich prüfen]' },
  },
  {
    id: 'arbeitsrecht', ref: '26/0236', client: 'Jonas Klein', area: 'Arbeitsrecht', status: 'aktiv',
    summary: 'Kündigung und variabler Bonus. Vertragsfassung, Zielvereinbarung und Zugangsdatum sind zentrale Tatsachen.',
    facts: ['Kündigungsschreiben datiert 24.08.2026', 'Zugang am 25.08. behauptet', 'Arbeitsvertrag vorhanden', 'Bonusvereinbarung 2026 vorhanden', 'Zielerreichung strittig'],
    documents: [
      { id: 'arbeitsvertrag', name: 'Arbeitsvertrag.pdf', status: 'bestätigt', note: 'Vertragsbasis.' },
      { id: 'kuend', name: 'Kuendigung.pdf', status: 'bestätigt', note: 'Datum und Wortlaut vorhanden.' },
      { id: 'bonus', name: 'Bonusvereinbarung_2026.pdf', status: 'zu_pruefen', note: 'Ziele und Ermessen prüfen.' },
      { id: 'zugang', name: 'Zugangsnachweis.pdf', status: 'fehlt', note: 'Zugang ist nur behauptet.' },
    ],
    tasks: [
      { id: 't1', label: 'Zugangsdatum verifizieren', due: '28.08.2026', done: false },
      { id: 't2', label: 'Bonusregelung markieren', due: '30.08.2026', done: false },
    ],
    research: {
      question: 'Welche Frist- und Vertragsfragen müssen vor einer Klageentscheidung geklärt werden?',
      answer: 'Arbeitsstand: Zugang der Kündigung, Vertragsinhalt und Bonusmechanik werden getrennt erfasst. Eine Frist wird nicht aus einem unbestätigten Zugangsdatum als sicher abgeleitet.',
      sources: [
        { id: 'kschg4', label: '§ 4 KSchG', kind: 'Gesetz', excerpt: 'Klagefrist — Fristbeginn setzt belastbare Tatsachengrundlage voraus.', verified: true },
        { id: 'vertrag-akte', label: 'Arbeitsvertrag', kind: 'Akte', excerpt: 'Vertragliche Ausgangslage.', verified: true },
        { id: 'bonus-akte', label: 'Bonusvereinbarung', kind: 'Akte', excerpt: 'Review der Ziel-/Ermessensklauseln offen.', verified: false },
      ],
    },
    open: ['Zugang der Kündigung nachweisen', 'Bonus-Zielerreichung aus Unterlagen belegen'],
    draft: { title: 'Mandanten-Check vor Fristentscheidung', body: 'Bitte noch prüfen / nachreichen:\n\n1. Nachweis oder genaue Umstände des Kündigungszugangs\n2. Zielerreichungsunterlagen zum Bonus\n\nDie Fristberechnung bleibt bis zur Prüfung des Zugangs als Reviewpunkt markiert.' },
  },
  {
    id: 'erbrecht', ref: '26/0241', client: 'Geschwister Hoffmann', area: 'Erbrecht', status: 'review',
    summary: 'Nachlass mit zwei Testamentsfassungen und einer ungeklärten Schenkung. Dokumentversionen dürfen nicht vermischt werden.',
    facts: ['Testament 2018 liegt vor', 'Handschriftliches Dokument 2024 liegt vor', 'Erblasser 2026 verstorben', 'Schenkung 2023 behauptet', 'Kontobeleg zur Schenkung fehlt'],
    documents: [
      { id: 'test18', name: 'Testament_2018.pdf', status: 'bestätigt', note: 'Fassung separat erhalten.' },
      { id: 'test24', name: 'Testament_2024_scan.pdf', status: 'zu_pruefen', note: 'Originalstatus/Formfragen offen.' },
      { id: 'konto', name: 'Kontobeleg_Schenkung.pdf', status: 'fehlt', note: 'Behauptete Zahlung nicht belegt.' },
    ],
    tasks: [
      { id: 't1', label: 'Testamentsfassungen versioniert vergleichen', due: '03.09.2026', done: false },
      { id: 't2', label: 'Nachweis Schenkung anfordern', due: '30.08.2026', done: false },
    ],
    research: {
      question: 'Welche Form- und Auslegungsfragen ergeben sich aus den zwei dokumentierten Fassungen?',
      answer: 'Arbeitsstand: Beide Fassungen bleiben als getrennte Primärquellen sichtbar. GitLaw macht keine Echtheits- oder Wirksamkeitsbehauptung aus einem Scan; offene Form- und Tatsachenfragen gehen in den Review.',
      sources: [
        { id: '2247', label: '§ 2247 BGB', kind: 'Gesetz', excerpt: 'Eigenhändiges Testament — konkrete Form anhand Original prüfen.', verified: true },
        { id: 'test18-akte', label: 'Testament 2018', kind: 'Akte', excerpt: 'Erste dokumentierte Fassung.', verified: true },
        { id: 'test24-akte', label: 'Dokument 2024', kind: 'Akte', excerpt: 'Scan; Original-/Formstatus offen.', verified: false },
      ],
    },
    open: ['Original des Dokuments 2024 vorhanden?', 'Schenkung 2023 tatsächlich erfolgt?', 'Weitere letztwillige Verfügungen?'],
    draft: { title: 'Quellen- und Versionsvermerk', body: 'Versionsvermerk\n\nFassung 2018 und Dokument 2024 werden getrennt behandelt. Der Scan von 2024 wird nicht als formwirksames Original bezeichnet. Offene Beweis- und Auslegungsfragen bleiben für anwaltlichen Review sichtbar.' },
  },
]

const workspaces: { key: Workspace; label: string; icon: typeof FolderOpen }[] = [
  { key: 'uebersicht', label: 'Übersicht', icon: FolderOpen },
  { key: 'fakten', label: 'Fakten', icon: FileText },
  { key: 'dokumente', label: 'Dokumente', icon: FileText },
  { key: 'research', label: 'Research', icon: Search },
  { key: 'quellen', label: 'Quellen', icon: ShieldCheck },
  { key: 'entwurf', label: 'Entwurf', icon: FileText },
  { key: 'review', label: 'Review', icon: CheckCircle2 },
  { key: 'audit', label: 'Audit', icon: ShieldCheck },
]

function key(matterId: string, itemId: string) { return `${matterId}:${itemId}` }

export default function ProPortfolioDemo() {
  const [matterId, setMatterId] = useState(matters[0].id)
  const [workspace, setWorkspace] = useState<Workspace>('uebersicht')
  const [matterSearch, setMatterSearch] = useState('')
  const [area, setArea] = useState('Alle')
  const [sourceReviews, setSourceReviews] = useState<Record<string, boolean>>({})
  const [documentReviews, setDocumentReviews] = useState<Record<string, boolean>>({})
  const [resolvedOpen, setResolvedOpen] = useState<Record<string, boolean>>({})
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>({})
  const [researchQueries, setResearchQueries] = useState<Record<string, string>>({})
  const [researchRuns, setResearchRuns] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [released, setReleased] = useState<Record<string, boolean>>({})
  const [audit, setAudit] = useState<string[]>([
    'Demo geöffnet · nur lokale synthetische Daten',
    'Authority contract: menschlicher Review vor Wirkung',
  ])

  const matter = useMemo(() => matters.find(m => m.id === matterId) || matters[0], [matterId])
  const areas = useMemo(() => ['Alle', ...Array.from(new Set(matters.map(m => m.area)))], [])
  const filtered = useMemo(() => {
    const q = matterSearch.trim().toLowerCase()
    return matters.filter(m => (area === 'Alle' || m.area === area) && (!q || `${m.ref} ${m.client} ${m.area} ${m.summary}`.toLowerCase().includes(q)))
  }, [area, matterSearch])

  function record(action: string) {
    const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setAudit(prev => [`${time} · ${matter.ref} · ${action}`, ...prev].slice(0, 30))
  }

  function selectMatter(id: string) {
    setMatterId(id)
    setWorkspace('uebersicht')
  }

  const context = {
    matter,
    sourceReviews,
    setSourceReviews,
    documentReviews,
    setDocumentReviews,
    resolvedOpen,
    setResolvedOpen,
    taskDone,
    setTaskDone,
    researchQueries,
    setResearchQueries,
    researchRuns,
    setResearchRuns,
    drafts,
    setDrafts,
    released,
    setReleased,
    audit,
    record,
    setWorkspace,
  }

  return (
    <div className="min-h-screen bg-[#22272a] text-[#edf1ef]">
      <header className="border-b border-white/10 bg-[#293034] sticky top-0 z-20">
        <div className="max-w-[1500px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#c7a86a]" />
            <span className="font-semibold">GitLaw <span className="text-[#d3b675]">Pro</span></span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/8 border border-white/10 text-white/70">Rich Portfolio Demo</span>
          </div>
          <a href="#/pro" className="text-xs text-white/60 hover:text-white flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Echter Pilot-Login</a>
        </div>
      </header>

      <div className="max-w-[1500px] mx-auto px-4 py-5">
        <div className="rounded-xl border border-[#9c7d45]/30 bg-[#393329] px-4 py-3 text-sm text-[#e8d8b6] mb-5 flex flex-wrap items-center justify-between gap-3">
          <span><strong>Spielwiese mit 8 synthetischen Akten.</strong> Alles hier bleibt lokal im Browser: kein Upload, keine Cloud, keine Rechtsberatung, keine externe Wirkung.</span>
          <button onClick={() => { setSourceReviews({}); setDocumentReviews({}); setResolvedOpen({}); setTaskDone({}); setResearchRuns({}); setDrafts({}); setReleased({}); setAudit(['Demo zurückgesetzt · lokale Zustände gelöscht']); setWorkspace('uebersicht') }} className="text-xs rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/5">Demo zurücksetzen</button>
        </div>

        <div className="grid xl:grid-cols-[300px_minmax(0,1fr)] gap-5">
          <aside className="rounded-2xl border border-white/10 bg-[#293034] p-3 h-max xl:sticky xl:top-[76px]">
            <div className="px-2 pt-2 pb-3">
              <div className="text-[11px] uppercase tracking-[.16em] text-white/45">Akten</div>
              <div className="text-2xl font-semibold mt-1">{matters.length}</div>
              <div className="text-xs text-white/40">synthetische Matters</div>
            </div>
            <input value={matterSearch} onChange={e => setMatterSearch(e.target.value)} placeholder="Akte suchen …" className="w-full rounded-xl bg-[#212629] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-[#b89a62]/60" />
            <div className="flex gap-1.5 overflow-x-auto py-3">
              {areas.map(a => <button key={a} onClick={() => setArea(a)} className={`whitespace-nowrap text-[10px] rounded-full border px-2 py-1 ${area === a ? 'border-[#c7a86a]/50 bg-[#3d392f] text-[#e2c98f]' : 'border-white/10 text-white/50'}`}>{a}</button>)}
            </div>
            <div className="space-y-2 max-h-[62vh] overflow-auto pr-1">
              {filtered.map(m => (
                <button key={m.id} onClick={() => selectMatter(m.id)} className={`w-full text-left rounded-xl border px-3 py-3 transition ${m.id === matter.id ? 'border-[#b89a62]/55 bg-[#383c3e]' : 'border-white/8 bg-[#242a2d] hover:bg-[#303639]'}`}>
                  <div className="flex justify-between gap-2"><span className="text-xs text-[#d3b675] font-mono">{m.ref}</span><Status state={m.status} /></div>
                  <div className="font-semibold mt-1">{m.client}</div>
                  <div className="text-xs text-white/45 mt-1">{m.area} · {m.documents.length} Dok. · {m.tasks.filter(t => !t.done).length} Aufgaben</div>
                </button>
              ))}
              {!filtered.length && <div className="text-sm text-white/40 px-2 py-6">Keine Akte im Filter.</div>}
            </div>
          </aside>

          <main className="min-w-0">
            <section className="rounded-2xl border border-white/10 bg-[#2d3438] p-5 mb-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[.16em] text-white/45">Aktive Akte · {matter.ref} · {matter.area}</div>
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">{matter.client}</h1>
                  <p className="text-white/58 mt-2 max-w-4xl">{matter.summary}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 min-w-[260px]">
                  <MiniMetric label="Dokumente" value={String(matter.documents.length)} />
                  <MiniMetric label="Quellen" value={String(matter.research.sources.length)} />
                  <MiniMetric label="Offen" value={String(matter.open.length)} />
                </div>
              </div>
            </section>

            <nav className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-2 mb-4">
              {workspaces.map(w => {
                const Icon = w.icon
                return <button key={w.key} onClick={() => setWorkspace(w.key)} className={`rounded-xl border px-3 py-3 text-left transition ${workspace === w.key ? 'border-[#c7a86a]/50 bg-[#3a3d3b]' : 'border-white/8 bg-[#293034] hover:bg-[#32393c]'}`}>
                  <Icon className={`w-4 h-4 mb-2 ${workspace === w.key ? 'text-[#d3b675]' : 'text-white/40'}`} />
                  <div className="text-xs font-semibold">{w.label}</div>
                </button>
              })}
            </nav>

            <section className="rounded-2xl border border-white/10 bg-[#2b3236] p-5 min-h-[560px]">
              <WorkspacePanel workspace={workspace} ctx={context} />
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

type DemoContext = {
  matter: Matter
  sourceReviews: Record<string, boolean>
  setSourceReviews: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  documentReviews: Record<string, boolean>
  setDocumentReviews: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  resolvedOpen: Record<string, boolean>
  setResolvedOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  taskDone: Record<string, boolean>
  setTaskDone: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  researchQueries: Record<string, string>
  setResearchQueries: React.Dispatch<React.SetStateAction<Record<string, string>>>
  researchRuns: Record<string, boolean>
  setResearchRuns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  drafts: Record<string, string>
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>
  released: Record<string, boolean>
  setReleased: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  audit: string[]
  record: (action: string) => void
  setWorkspace: React.Dispatch<React.SetStateAction<Workspace>>
}

function WorkspacePanel({ workspace, ctx }: { workspace: Workspace; ctx: DemoContext }) {
  const m = ctx.matter

  if (workspace === 'uebersicht') {
    const openTasks = m.tasks.filter(t => !(ctx.taskDone[key(m.id, t.id)] ?? t.done))
    const reviewDocs = m.documents.filter(d => d.status === 'zu_pruefen' && !ctx.documentReviews[key(m.id, d.id)])
    const missingDocs = m.documents.filter(d => d.status === 'fehlt')
    return <Panel kicker="MATTER COMMAND CENTER" title="Was braucht diese Akte jetzt?">
      <div className="grid md:grid-cols-3 gap-3">
        <ActionCard tone="amber" title={`${openTasks.length} offene Aufgabe${openTasks.length === 1 ? '' : 'n'}`} text={openTasks[0]?.label || 'Keine offene Aufgabe in der Demo.'} action="Aufgaben ansehen" onClick={() => ctx.setWorkspace('fakten')} />
        <ActionCard tone="blue" title={`${reviewDocs.length} Dokument${reviewDocs.length === 1 ? '' : 'e'} im Review`} text={missingDocs.length ? `${missingDocs.length} weiteres Dokument fehlt.` : 'Keine fehlenden Dokumente markiert.'} action="Dokumente prüfen" onClick={() => ctx.setWorkspace('dokumente')} />
        <ActionCard tone="gold" title={`${m.research.sources.filter(s => !(s.verified || ctx.sourceReviews[key(m.id, s.id)])).length} Quelle(n) offen`} text="Quellenstatus bleibt Teil des Ergebnisses, nicht Fußnote." action="Quellen öffnen" onClick={() => ctx.setWorkspace('quellen')} />
      </div>
      <div className="mt-5 grid lg:grid-cols-[1.3fr_.7fr] gap-4">
        <div className="rounded-xl border border-white/10 bg-[#242a2d] p-4"><div className="text-[10px] uppercase tracking-wider text-[#d3b675]">Arbeitskontext</div><p className="text-lg mt-2 text-white/75">{m.summary}</p><div className="mt-4 flex flex-wrap gap-2">{m.facts.slice(0, 4).map(f => <span key={f} className="text-xs rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1.5 text-white/60">{f}</span>)}</div></div>
        <div className="rounded-xl border border-white/10 bg-[#242a2d] p-4"><div className="text-[10px] uppercase tracking-wider text-white/40">Nächster sauberer Loop</div><ol className="mt-3 space-y-2 text-sm text-white/65"><li>1. Aktenfakten prüfen</li><li>2. Dokumente bestätigen</li><li>3. Research + Quellen reviewen</li><li>4. Offene Fragen klären</li><li>5. Entwurf menschlich freigeben</li></ol></div>
      </div>
    </Panel>
  }

  if (workspace === 'fakten') return <Panel kicker="FAKTEN + AUFGABEN" title="Relevante Tatsachen, nicht Chat-Verlauf">
    <div className="grid lg:grid-cols-2 gap-4">
      <div><div className="space-y-2">{m.facts.map((f, i) => <div key={f} className="rounded-xl border border-white/10 bg-[#242a2d] p-4"><div className="text-[10px] uppercase tracking-wider text-white/35">Fakt {i + 1}</div><div className="mt-1.5">{f}</div></div>)}</div></div>
      <div><div className="text-[11px] uppercase tracking-[.14em] text-[#d3b675] mb-2">Tasks / Fristen</div><div className="space-y-2">{m.tasks.map(t => { const done = ctx.taskDone[key(m.id, t.id)] ?? t.done; return <button key={t.id} onClick={() => { ctx.setTaskDone(prev => ({ ...prev, [key(m.id, t.id)]: !done })); ctx.record(`${!done ? 'Task erledigt' : 'Task wieder geöffnet'}: ${t.label}`) }} className={`w-full text-left rounded-xl border p-4 ${done ? 'border-emerald-500/20 bg-emerald-500/[.07]' : 'border-white/10 bg-[#242a2d]'}`}><div className="flex justify-between gap-3"><span className={done ? 'line-through text-white/45' : ''}>{t.label}</span><span className="text-xs text-white/40">{t.due}</span></div><div className="text-xs mt-2 text-white/35">{done ? '✓ erledigt — klicken zum Wiederöffnen' : 'offen — klicken zum Abhaken'}</div></button> })}</div></div>
    </div>
  </Panel>

  if (workspace === 'dokumente') return <Panel kicker="DOCUMENT GROUND TRUTH" title="Eingegangen ≠ geprüft">
    <div className="space-y-3">{m.documents.map(d => { const reviewed = d.status === 'bestätigt' || Boolean(ctx.documentReviews[key(m.id, d.id)]); return <div key={d.id} className={`rounded-xl border p-4 ${d.status === 'fehlt' ? 'border-amber-400/20 bg-amber-400/[.06]' : reviewed ? 'border-emerald-500/20 bg-emerald-500/[.06]' : 'border-white/10 bg-[#242a2d]'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium">{d.name}</div><div className="text-sm text-white/45 mt-1">{d.note}</div></div><DocStatus status={d.status} reviewed={reviewed} /></div><div className="mt-3 flex gap-2 flex-wrap">{d.status === 'zu_pruefen' && <button onClick={() => { ctx.setDocumentReviews(prev => ({ ...prev, [key(m.id, d.id)]: !reviewed })); ctx.record(`${!reviewed ? 'Dokument bestätigt' : 'Dokumentreview zurückgesetzt'}: ${d.name}`) }} className="text-xs rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/5">{reviewed ? 'Review zurücksetzen' : 'Nach Sichtprüfung bestätigen'}</button>}{d.status === 'fehlt' && <button onClick={() => ctx.record(`Nachforderung vorbereitet: ${d.name}`)} className="text-xs rounded-lg border border-amber-300/20 bg-amber-300/[.05] text-amber-100 px-3 py-1.5">Nachforderung vorbereiten (Demo)</button>}</div></div> })}</div>
  </Panel>

  if (workspace === 'research') {
    const q = ctx.researchQueries[m.id] ?? m.research.question
    const ran = ctx.researchRuns[m.id]
    return <Panel kicker="SOURCE-GROUNDED RESEARCH" title="Mit Aktenkontext recherchieren">
      <label className="text-xs text-white/45">Research-Frage bearbeiten</label>
      <textarea value={q} onChange={e => ctx.setResearchQueries(prev => ({ ...prev, [m.id]: e.target.value }))} className="mt-2 w-full min-h-24 rounded-xl bg-[#22282b] border border-white/10 p-4 outline-none focus:border-[#c7a86a]/50" />
      <div className="mt-3 flex gap-2"><button onClick={() => { ctx.setResearchRuns(prev => ({ ...prev, [m.id]: true })); ctx.record('Research in synthetischer Demo ausgeführt') }} className="rounded-lg bg-[#d0b06d] text-[#25231e] font-semibold px-4 py-2 text-sm">Research starten</button><button onClick={() => ctx.setWorkspace('quellen')} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Quellen öffnen</button></div>
      <div className={`mt-5 rounded-xl border p-4 ${ran ? 'border-[#c7a86a]/25 bg-[#35342f]' : 'border-white/10 bg-[#242a2d]'}`}><div className="text-[10px] uppercase tracking-wider text-white/40">{ran ? 'Synthetischer Research-Lauf' : 'Gespeicherter Arbeitsstand'}</div><p className="mt-2 text-white/75 leading-relaxed">{m.research.answer}</p><div className="mt-4 flex flex-wrap gap-2">{m.research.sources.map(s => <span key={s.id} className="text-xs rounded-full border border-white/10 px-2.5 py-1 text-white/55">{s.label}</span>)}</div><p className="mt-4 text-xs text-white/35">Portfolio-Demo: deterministischer synthetischer Arbeitsstand, kein Live-LLM und keine Rechtsberatung.</p></div>
    </Panel>
  }

  if (workspace === 'quellen') return <Panel kicker="PROVENIENZ" title="Quelle für Quelle reviewen">
    <div className="space-y-3">{m.research.sources.map(s => { const verified = s.verified || Boolean(ctx.sourceReviews[key(m.id, s.id)]); return <div key={s.id} className={`rounded-xl border p-4 ${verified ? 'border-emerald-500/20 bg-emerald-500/[.05]' : 'border-amber-400/20 bg-amber-400/[.05]'}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] uppercase tracking-wider text-white/35">{s.kind}</div><div className="font-mono mt-1">{s.label}</div></div><span className={`text-xs rounded-full border px-2 py-1 ${verified ? 'border-emerald-400/20 text-emerald-200' : 'border-amber-300/20 text-amber-100'}`}>{verified ? '✓ verifiziert / geprüft' : 'Review nötig'}</span></div><p className="text-sm text-white/55 mt-3">{s.excerpt}</p>{!s.verified && <button onClick={() => { ctx.setSourceReviews(prev => ({ ...prev, [key(m.id, s.id)]: !verified })); ctx.record(`${!verified ? 'Quelle geprüft' : 'Quellenreview zurückgesetzt'}: ${s.label}`) }} className="mt-3 text-xs rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/5">{verified ? 'Review zurücksetzen' : 'Als geprüft markieren (Demo)'}</button>}</div> })}</div>
  </Panel>

  if (workspace === 'entwurf') {
    const text = ctx.drafts[m.id] ?? m.draft.body
    return <Panel kicker="DRAFT — NICHT FREIGABE" title={m.draft.title}>
      <textarea value={text} onChange={e => ctx.setDrafts(prev => ({ ...prev, [m.id]: e.target.value }))} className="w-full min-h-[330px] rounded-xl bg-[#22282b] border border-white/10 p-4 leading-relaxed outline-none focus:border-[#c7a86a]/50" />
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => { ctx.setDrafts(prev => ({ ...prev, [m.id]: text })); ctx.record('Entwurf lokal gespeichert') }} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Entwurf speichern</button><button onClick={() => { ctx.record('Entwurf zum Human Review markiert'); ctx.setWorkspace('review') }} className="rounded-lg bg-[#d0b06d] text-[#25231e] font-semibold px-4 py-2 text-sm">Zum Review →</button></div><div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-4 text-sm text-amber-100"><strong>Grenze:</strong> Entwurf ≠ versendet, eingereicht oder anwaltlich freigegeben.</div>
    </Panel>
  }

  if (workspace === 'review') {
    const sourcesOk = m.research.sources.every(s => s.verified || ctx.sourceReviews[key(m.id, s.id)])
    const docsOk = m.documents.filter(d => d.status === 'zu_pruefen').every(d => ctx.documentReviews[key(m.id, d.id)])
    const openOk = m.open.every((_, i) => ctx.resolvedOpen[key(m.id, `open-${i}`)])
    const allOk = sourcesOk && docsOk && openOk
    const isReleased = Boolean(ctx.released[m.id])
    return <Panel kicker="HUMAN REVIEW GATE" title="Vor Wirkung müssen die offenen Dinge verschwinden — nicht nur die Warnfarbe">
      <div className="grid md:grid-cols-3 gap-3"><Gate ok={docsOk} title="Dokumentreview" text={docsOk ? 'Alle eingegangenen Review-Dokumente bestätigt.' : 'Mindestens ein Dokument wartet auf Sichtprüfung.'} /><Gate ok={sourcesOk} title="Quellenreview" text={sourcesOk ? 'Alle markierten Quellen geprüft.' : 'Mindestens eine Quelle ist noch offen.'} /><Gate ok={openOk} title="Tatsachenfragen" text={openOk ? 'Alle Demo-Fragen menschlich geklärt.' : `${m.open.filter((_, i) => !ctx.resolvedOpen[key(m.id, `open-${i}`)]).length} offene Frage(n).`} /></div>
      <div className="mt-5 text-[11px] uppercase tracking-[.14em] text-[#d3b675]">Offene Tatsachenfragen</div><div className="mt-2 space-y-2">{m.open.map((o, i) => { const k = key(m.id, `open-${i}`), done = Boolean(ctx.resolvedOpen[k]); return <button key={o} onClick={() => { ctx.setResolvedOpen(prev => ({ ...prev, [k]: !done })); ctx.record(`${!done ? 'Tatsachenfrage geklärt' : 'Tatsachenfrage wieder geöffnet'}: ${o}`) }} className={`w-full text-left rounded-xl border p-3 flex gap-3 ${done ? 'border-emerald-500/20 bg-emerald-500/[.06]' : 'border-amber-400/20 bg-amber-400/[.05]'}`}>{done ? <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />}<span className={done ? 'text-white/45 line-through' : ''}>{o}</span></button> })}</div>
      <div className={`mt-5 rounded-xl border p-4 ${isReleased ? 'border-emerald-500/25 bg-emerald-500/[.08]' : allOk ? 'border-[#c7a86a]/30 bg-[#37342c]' : 'border-white/10 bg-[#242a2d]'}`}><div className="font-semibold">{isReleased ? '✓ In der Demo menschlich freigegeben' : allOk ? 'Review-Gate bereit' : 'Freigabe blockiert'}</div><p className="text-sm text-white/55 mt-1">{isReleased ? 'Keine externe Aktion wurde ausgeführt. Der Audit-Eintrag zeigt nur die lokale Demo-Freigabe.' : allOk ? 'Alle lokalen Demo-Gates sind erfüllt. Ein Mensch kann den Arbeitsstand freigeben.' : 'Erst Dokumente, Quellen und offene Tatsachen prüfen.'}</p><button disabled={!allOk || isReleased} onClick={() => { ctx.setReleased(prev => ({ ...prev, [m.id]: true })); ctx.record('Arbeitsstand menschlich freigegeben — keine externe Wirkung') }} className="mt-3 rounded-lg bg-[#d0b06d] disabled:opacity-35 text-[#25231e] font-semibold px-4 py-2 text-sm">Menschlich freigeben (Demo)</button></div>
    </Panel>
  }

  return <Panel kicker="AUDIT / REPLAY" title="Jede Demo-Aktion bleibt nachvollziehbar">
    <div className="rounded-xl border border-white/10 bg-[#242a2d] overflow-hidden"><div className="grid grid-cols-[150px_1fr] px-4 py-2 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/35"><span>Kontext</span><span>Ereignis</span></div>{ctx.audit.map((a, i) => { const parts = a.split(' · '); return <div key={`${a}-${i}`} className="grid grid-cols-[150px_1fr] px-4 py-3 border-b border-white/[.06] last:border-0 text-sm"><span className="font-mono text-white/35">{parts.length > 2 ? `${parts[0]} · ${parts[1]}` : 'SYSTEM'}</span><span className="text-white/65">{parts.length > 2 ? parts.slice(2).join(' · ') : a}</span></div> })}</div><p className="mt-4 text-xs text-white/35">Die echte Pro-Architektur besitzt serverseitige Auth-/Tenant-/Audit-Grenzen. Diese öffentliche Portfolio-Demo simuliert ausschließlich lokale UI-Zustände.</p>
  </Panel>
}

function Panel({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return <><div className="text-[11px] uppercase tracking-[.16em] text-[#d3b675]">{kicker}</div><h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2 mb-5 max-w-4xl">{title}</h2>{children}</>
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-[#252b2e] px-3 py-2"><div className="text-xl font-semibold">{value}</div><div className="text-[10px] text-white/35">{label}</div></div>
}

function Status({ state }: { state: Matter['status'] }) {
  const classes = state === 'aktiv' ? 'text-emerald-200 border-emerald-500/20 bg-emerald-500/[.07]' : state === 'review' ? 'text-amber-100 border-amber-400/20 bg-amber-400/[.06]' : 'text-sky-100 border-sky-400/20 bg-sky-400/[.06]'
  return <span className={`text-[9px] rounded-full border px-1.5 py-0.5 ${classes}`}>{state}</span>
}

function DocStatus({ status, reviewed }: { status: MatterDocument['status']; reviewed: boolean }) {
  if (status === 'fehlt') return <span className="text-xs rounded-full border border-amber-400/20 bg-amber-400/[.06] text-amber-100 px-2 py-1">fehlt</span>
  return <span className={`text-xs rounded-full border px-2 py-1 ${reviewed ? 'border-emerald-500/20 bg-emerald-500/[.07] text-emerald-200' : 'border-white/15 text-white/55'}`}>{reviewed ? '✓ bestätigt' : 'zu prüfen'}</span>
}

function ActionCard({ tone, title, text, action, onClick }: { tone: 'amber' | 'blue' | 'gold'; title: string; text: string; action: string; onClick: () => void }) {
  const styles = tone === 'amber' ? 'border-amber-400/20 bg-amber-400/[.05]' : tone === 'blue' ? 'border-sky-400/20 bg-sky-400/[.05]' : 'border-[#c7a86a]/25 bg-[#38342c]'
  return <div className={`rounded-xl border p-4 ${styles}`}><div className="font-semibold">{title}</div><p className="text-sm text-white/50 mt-1 min-h-10">{text}</p><button onClick={onClick} className="text-xs mt-3 underline text-white/65 hover:text-white">{action} →</button></div>
}

function Gate({ ok, title, text }: { ok: boolean; title: string; text: string }) {
  return <div className={`rounded-xl border p-4 ${ok ? 'border-emerald-500/20 bg-emerald-500/[.06]' : 'border-amber-400/20 bg-amber-400/[.05]'}`}><div className="flex gap-2 items-center">{ok ? <CheckCircle2 className="w-5 h-5 text-emerald-300" /> : <AlertTriangle className="w-5 h-5 text-amber-300" />}<strong>{title}</strong></div><p className="text-sm text-white/50 mt-2">{text}</p></div>
}
