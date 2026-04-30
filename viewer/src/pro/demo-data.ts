/**
 * Kanzlei-Presets für Pitch-Demos.
 *
 * Jedes Preset kombiniert (a) Kanzlei-Branding (Name, Adresse, Anwält:in)
 * und (b) drei fachgebiets-passende Mandant:innen-Akten mit realistischer
 * Recherche-Notiz und einem generierten Schreiben. So kann Mikel für jede
 * Zielkanzlei eine PDF-Demo auf DEREN Briefkopf mit DEREN Rechtsgebiet
 * erzeugen, bevor er pitcht.
 *
 * Presets:
 *   - rubin:     Patrick Rubin (Mietrecht/WEG/Immobilienrecht, Berlin)
 *   - gniosdorz: Kanzlei Gniosdorz (Platzhalter — bitte im Profil anpassen)
 *   - generisch: Kanzlei Müller & Partner (Strafrecht + Miete + Sozialrecht)
 *
 * Erweitern: einfach einen neuen Eintrag zu KANZLEI_PRESETS hinzufügen.
 */

import {
  createCase,
  saveLetter,
  saveResearch,
  saveSettings,
  updateCase,
} from './store'
import type { Citation, KanzleiSettings } from './types'
import { getLawyerTemplate } from './lawyer-templates'

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export const DEMO_MARKER = 'gitlaw.pro.demo-loaded.v1'

interface DemoCase {
  case: {
    aktenzeichen: string
    mandantName: string
    description: string
    mandantEmail?: string
    fristOffsetDays?: number  // relative to "today" so demo always shows live Fristen
    fristBezeichnung?: string
  }
  research?: {
    question: string
    answer: string
    citations: Citation[]
    reviewed: boolean
  }
  letter?: {
    templateId: string
    fields: Record<string, string>
  }
}

interface KanzleiPreset {
  key: string
  label: string
  tagline: string
  settings: KanzleiSettings
  cases: DemoCase[]
}

// --- Rubin — Mietrecht/WEG/Immobilienrecht ----------------------------------

const RUBIN: KanzleiPreset = {
  key: 'rubin',
  label: 'Rechtsanwalt Patrick Rubin',
  tagline: 'Mietrecht · WEG-Recht · Immobilienrecht (Berlin)',
  settings: {
    name: 'Rechtsanwalt Patrick Rubin',
    anwaltName: 'Rechtsanwalt Patrick Rubin',
    address: 'Knesebeckstraße 59-61\n10719 Berlin',
    contact: 'Tel. +49 30 219 666 29  ·  pr@ra-rubin.de  ·  rubin-rechtsanwalt.de',
    kammerId: 'Rechtsanwaltskammer Berlin',
  },
  cases: [
    {
      case: {
        aktenzeichen: '25/0142',
        mandantName: 'Jusuf Öztürk',
        description: 'Mieter, fristlose Kündigung wegen angeblichen Zahlungsverzugs über 2 Monatsmieten. Widerspruch + Schonfristzahlung zu prüfen.',
        mandantEmail: 'j.oeztuerk@example.com',
        fristOffsetDays: 4,
        fristBezeichnung: 'Schonfristzahlung § 569 Abs. 3 BGB',
      },
      research: {
        question: 'Wann ist eine fristlose Kündigung des Mietverhältnisses wegen Zahlungsverzugs zulässig und welche Schonfristwirkung greift?',
        answer:
          'Die fristlose Kündigung wegen Zahlungsverzugs richtet sich nach §§ 543 Abs. 2 Nr. 3, 569 Abs. 3 BGB.\n\n' +
          'Voraussetzungen: Der Mieter ist mit der Miete für zwei aufeinander folgende Termine in Verzug und der Rückstand erreicht insgesamt mindestens eine Monatsmiete (Alt. 1), oder der Rückstand erreicht in einem Zeitraum, der sich über mehr als zwei Termine erstreckt, die Summe von zwei Monatsmieten (Alt. 2).\n\n' +
          'Schonfristzahlung nach § 569 Abs. 3 Nr. 2 BGB: Vollständige Zahlung binnen zwei Monaten nach Zustellung der Räumungsklage heilt die Kündigung. Die Schonfristwirkung greift nur einmal innerhalb von zwei Jahren.\n\n' +
          'Achtung BGH: Die Schonfristzahlung heilt nach h. M. die außerordentliche, nicht aber eine hilfsweise ausgesprochene ordentliche Kündigung (BGH, Urt. v. 13.10.2021 — VIII ZR 91/20). Hilfsweise ordentliche Kündigung muss daher zusätzlich angegriffen werden.\n\n' +
          'Prozessual: Räumungsklage gem. § 985 BGB i. V. m. § 546 BGB. Streitwertbemessung nach § 41 Abs. 2 GKG.',
        citations: [
          { display: '§ 543 BGB', lawId: 'bgb', section: '543', verified: true },
          { display: '§ 569 BGB', lawId: 'bgb', section: '569', verified: true },
          { display: '§ 546 BGB', lawId: 'bgb', section: '546', verified: true },
          { display: '§ 985 BGB', lawId: 'bgb', section: '985', verified: true },
        ],
        reviewed: true,
      },
      letter: {
        templateId: 'widerspruch_bescheid',
        fields: {
          recipient: 'Harder Hausverwaltung GmbH\nHardenbergstraße 12\n10623 Berlin',
          mandant: 'Jusuf Öztürk',
          mandantAdresse: 'Bleibtreustraße 24\n10707 Berlin',
          aktenzeichen: 'HV-2026-0418',
          bescheidDatum: '2026-03-24',
          begruendung:
            'Die ausgesprochene fristlose Kündigung ist unwirksam. Die Voraussetzungen des § 543 Abs. 2 Nr. 3 BGB liegen nicht vor: Der angeblich offene Betrag von 1.860 EUR setzt sich aus streitigen Nebenkostennachzahlungen zusammen, die meine Mandantschaft form- und fristgerecht bestritten hat (§ 556 Abs. 3 S. 5 BGB). Ein Zahlungsverzug mit der "Miete" im Sinne von § 543 BGB liegt deshalb nicht vor (BGH, Urt. v. 18.07.2012 — VIII ZR 1/11).\n\nVorsorglich wird die Schonfristzahlung gem. § 569 Abs. 3 Nr. 2 BGB angekündigt. Meine Mandantschaft wird den Gesamtbetrag — unter Vorbehalt — binnen 14 Tagen zahlen, sobald eine prüffähige Abrechnung übersandt wird.',
        },
      },
    },
    {
      case: {
        aktenzeichen: '25/0156',
        mandantName: 'WEG Waldstraße 42',
        description: 'Verwalter-Abberufung durch Eigentümerbeschluss. Einzelne Eigentümer klagen gegen Beschluss — Anfechtungsklage nach § 44 WEG?',
        mandantEmail: 'verwaltung@weg-waldstr42.example',
        fristOffsetDays: 12,
        fristBezeichnung: 'Anfechtungsfrist § 44 Abs. 1 WEG',
      },
      research: {
        question: 'Frist und Form für die Anfechtung eines Eigentümerbeschlusses nach WEG-Reform 2020?',
        answer:
          'Die Anfechtung eines Eigentümerbeschlusses ist in § 44 Abs. 1 WEG geregelt.\n\n' +
          'Frist: Klage binnen eines Monats ab Beschlussfassung (Anfechtungsfrist) und Begründung binnen zwei Monaten (Begründungsfrist). Beide Fristen sind materielle Ausschlussfristen — Fristversäumnis führt zur Unbegründetheit.\n\n' +
          'Zuständigkeit: Ausschließlich das Amtsgericht, in dessen Bezirk die Wohnungseigentumsanlage liegt (§ 43 Nr. 2 WEG). Sachlich zuständig unabhängig vom Streitwert.\n\n' +
          'Beklagte: Seit der WEG-Reform 2020 die GdWE (Gemeinschaft der Wohnungseigentümer) als rechtsfähiger Verband, nicht mehr die übrigen Eigentümer einzeln (§ 9a WEG).\n\n' +
          'Prozessual: Streitwert gem. § 49 GKG; häufig 7.500 EUR fiktiv bei reinen Anfechtungsklagen ohne Leistungsantrag.',
        citations: [
          { display: '§ 44 WEG', lawId: 'weg', section: '44', verified: false },
          { display: '§ 43 WEG', lawId: 'weg', section: '43', verified: false },
          { display: '§ 9a WEG', lawId: 'weg', section: '9a', verified: false },
        ],
        reviewed: false,
      },
    },
    {
      case: {
        aktenzeichen: '25/0171',
        mandantName: 'Dr. Schulze (Vermieter)',
        description: 'Eigenbedarfskündigung für Tochter — Mieter widerspricht, Härtefallabwägung erforderlich. 32 Jahre Mietdauer, 78 Jahre alte Mieterin.',
      },
      research: {
        question: 'Welche Anforderungen stellt die Rechtsprechung an die Begründung einer Eigenbedarfskündigung, und wann greift der Härtefall-Einwand § 574 BGB?',
        answer:
          'Eigenbedarfskündigung nach § 573 Abs. 2 Nr. 2 BGB: Erforderlich ist ein berechtigtes Interesse am Selbsteintritt. Der Eigenbedarf muss konkret und nachvollziehbar begründet werden — Name und Verwandtschaftsverhältnis des Eigenbedarfsberechtigten, Grund für den Nutzungswunsch (BGH, Urt. v. 04.03.2015 — VIII ZR 166/14).\n\n' +
          'Härtefall-Widerspruch gem. § 574 BGB: Mieter kann der Kündigung widersprechen, wenn die Beendigung eine Härte bedeutet, die unter Würdigung der berechtigten Interessen des Vermieters nicht zu rechtfertigen ist. Typische anerkannte Härtegründe: hohes Alter (ab ~70), lange Mietdauer (> 20 J.), Verwurzelung im Kiez, gesundheitliche Einschränkungen, Nicht-Verfügbarkeit von Ersatzwohnraum in zumutbarer Lage/Preis.\n\n' +
          'Bei 78-jähriger Mieterin mit 32 J. Mietdauer ist die Härte praktisch indiziert — die Kündigung wird in aller Regel auf Zeit ausgesetzt (§ 574a BGB). Vermieter-Eigenbedarf darf nicht illusionär sein; Verstoß führt zu Schadensersatz (BGH, Urt. v. 29.03.2017 — VIII ZR 44/16).',
        citations: [
          { display: '§ 573 BGB', lawId: 'bgb', section: '573', verified: true },
          { display: '§ 574 BGB', lawId: 'bgb', section: '574', verified: true },
          { display: '§ 574a BGB', lawId: 'bgb', section: '574a', verified: true },
        ],
        reviewed: false,
      },
    },
  ],
}

// --- Gniosdorz — Platzhalter (Wix-Site, Daten nicht extrahierbar) -----------

const GNIOSDORZ: KanzleiPreset = {
  key: 'gniosdorz',
  label: 'Kanzlei Gniosdorz (Platzhalter)',
  tagline: '⚠ Kanzlei-Daten nicht automatisch auslesbar — bitte im Profil ergänzen',
  settings: {
    name: 'Kanzlei Gniosdorz',
    anwaltName: 'Rechtsanwalt Gniosdorz',
    address: '[bitte im Profil ergänzen]\n[Berlin]',
    contact: 'info@gniosdorz.de  ·  gniosdorz.de',
    kammerId: 'Rechtsanwaltskammer Berlin',
  },
  // Generalistische Fallauswahl (Straf + Verwaltung + Zivil)
  cases: [
    {
      case: {
        aktenzeichen: '25/0201',
        mandantName: 'Anna Schmidt',
        description: 'Cyberstalking durch Ex-Partner, ca. 200 Nachrichten/Tag via Instagram-DM. Strafanzeige + GewSchG-Antrag.',
      },
      research: {
        question: 'Welche Tatbestände kommen bei wiederholten Drohnachrichten via Instagram-DM in Betracht, welche Rechtsmittel zivilrechtlich?',
        answer:
          'Strafrechtlich einschlägig: § 238 StGB (Nachstellung) — bei 200 Nachrichten/Tag unproblematisch unbefugte Nachstellung in einer Weise, die die Lebensgestaltung nicht unerheblich beeinträchtigt. Je nach Inhalt daneben § 241 StGB (Bedrohung), bei sexuellen Bezügen § 184i StGB (sexuelle Belästigung) bzw. bei Bildmaterial § 201a StGB.\n\n' +
          'Prozessual strafrechtlich: Strafantrag gem. § 158 StPO (§ 238 ist relatives Antragsdelikt, besonderes öffentliches Interesse aber bei intensiver Nachstellung regelmäßig zu bejahen).\n\n' +
          'Zivilrechtlich: Unterlassungsanspruch gem. §§ 823 Abs. 1, 1004 BGB analog (Allgemeines Persönlichkeitsrecht). Zusätzlich Gewaltschutzantrag gem. §§ 1, 3 GewSchG (schnelles Verfahren, Kontakt- und Annäherungsverbot binnen Tagen erreichbar).\n\n' +
          'Empfehlung: Paralleler Dreiklang — Strafanzeige, GewSchG-Antrag (einstweilige Verfügung), zivilrechtliche Unterlassungsklage.',
        citations: [
          { display: '§ 238 StGB', lawId: 'stgb', section: '238', verified: true },
          { display: '§ 241 StGB', lawId: 'stgb', section: '241', verified: true },
          { display: '§ 184i StGB', lawId: 'stgb', section: '184i', verified: true },
          { display: '§ 201a StGB', lawId: 'stgb', section: '201a', verified: true },
          { display: '§ 823 BGB', lawId: 'bgb', section: '823', verified: true },
        ],
        reviewed: true,
      },
      letter: {
        templateId: 'strafanzeige',
        fields: {
          recipient: 'Polizei Berlin — LKA 75 (ZAC)',
          mandant: 'Anna Schmidt',
          beschuldigt: 'Thomas Klein',
          tatort: 'Instagram Direktnachrichten, WhatsApp',
          tatzeit: 'seit 15.01.2026 fortlaufend',
          sachverhalt:
            'Die Mandantin und der Beschuldigte waren bis Dezember 2025 in einer Beziehung. Seit der Trennung versendet der Beschuldigte täglich zwischen 150 und 250 Nachrichten. Nach einer anwaltlichen Unterlassungsaufforderung vom 03.02.2026 hat der Beschuldigte die Frequenz sogar erhöht.',
          paragraphen:
            'Verdacht der Nachstellung gem. § 238 Abs. 1 Nr. 1, 2, 5 StGB sowie der Bedrohung gem. § 241 Abs. 1 StGB.',
          anlagen:
            'Anlage K1: Screenshot-Dossier mit 287 Nachrichten (chronologisch, mit SHA-256 Hash-Kette)\nAnlage K2: Unterlassungsaufforderung v. 03.02.2026',
        },
      },
    },
    {
      case: {
        aktenzeichen: '25/0214',
        mandantName: 'Familie Weber',
        description: 'Jobcenter-Sanktion 30% wegen angeblich versäumten Termins. Widerspruch fristwahrend.',
        mandantEmail: 'p.weber@example.com',
        fristOffsetDays: 2,
        fristBezeichnung: 'Widerspruchsfrist § 84 SGG (Bescheid v. 28.03.)',
      },
      research: {
        question: 'Welche Voraussetzungen müssen für eine Leistungsminderung nach § 31a SGB II vorliegen und welche Frist gilt für den Widerspruch?',
        answer:
          'Rechtsgrundlage: §§ 31, 31a SGB II. Voraussetzungen der Minderung: (a) Pflichtverletzung gem. § 31 Abs. 1 SGB II (wiederholte Meldeversäumnisse, Weigerung bei Arbeitsangebot etc.), (b) vorherige Rechtsfolgenbelehrung schriftlich, (c) keine wichtige Gründe für das Verhalten.\n\n' +
          'Höhe: 10% Regelbedarf erste Stufe, 20% zweite, 30% dritte Stufe binnen eines Jahres — nach der Reform 2023 und der BVerfG-Rechtsprechung (1 BvL 7/16) strikt einzelfallbezogen.\n\n' +
          'Verfahrensrechtlich: Widerspruchsfrist 1 Monat nach Bekanntgabe (§ 84 SGG). Formlos, aber schriftlich zu Beweiszwecken empfohlen. Keine aufschiebende Wirkung bei reinen Leistungsminderungen gem. § 39 SGB II — daher zusätzlich Antrag nach § 86b SGG ratsam.\n\n' +
          'Prozessual: Bei Widerspruchsablehnung Klage vor Sozialgericht binnen eines Monats (§ 87 SGG).',
        citations: [
          { display: '§ 31 SGB II', lawId: 'sgb_2', section: '31', verified: true },
          { display: '§ 31a SGB II', lawId: 'sgb_2', section: '31a', verified: true },
          { display: '§ 39 SGB II', lawId: 'sgb_2', section: '39', verified: true },
          { display: '§ 84 SGG', lawId: 'sgg', section: '84', verified: false },
        ],
        reviewed: false,
      },
    },
    {
      case: {
        aktenzeichen: '25/0219',
        mandantName: 'BäckerAG Handelsvertretung',
        description: 'Mandantin hat offene Forderung über 4.280 EUR gegen Caterer. Mehrfach gemahnt. Vor Mahnverfahren letzte anwaltliche Aufforderung.',
      },
      letter: {
        templateId: 'mahnschreiben',
        fields: {
          schuldner: 'Catering Lehmann GmbH\nKurfürstendamm 112\n10711 Berlin',
          mandant: 'BäckerAG Handelsvertretung',
          betrag: '4.280,00',
          rechnung: 'Rechnung Nr. 2026-042 vom 12.01.2026 (Lieferung vom 10.01.2026)',
          faelligkeit: '2026-01-26',
          frist: '14 Tagen',
          verzugszinsen: 'ja',
        },
      },
    },
  ],
}

// --- Generisch --------------------------------------------------------------

const GENERISCH: KanzleiPreset = {
  key: 'generisch',
  label: 'Kanzlei Müller & Partner (generisch)',
  tagline: 'Strafrecht · Mietrecht · Sozialrecht — breiter Demo-Mix',
  settings: {
    name: 'Kanzlei Müller & Partner mbB',
    anwaltName: 'RAin Maria Müller',
    address: 'Friedrichstraße 12\n10117 Berlin',
    contact: 'Tel. 030 / 1234-0  ·  kanzlei@mueller-partner.example',
    kammerId: 'RAK Berlin Nr. 12345',
  },
  cases: GNIOSDORZ.cases, // reuse the three-case mix
}

// --- Thai Bao Nguyen — Strafrecht/Mietrecht/Migration (vietnamesische Community) -----

const NGUYEN: KanzleiPreset = {
  key: 'nguyen',
  label: 'Rechtsanwalt Thai Bao Nguyen',
  tagline: 'Strafrecht · Mietrecht · Migrationsrecht (vietnamesische Mandant:innen)',
  settings: {
    name: 'Anwaltskanzlei Thai Bao Nguyen',
    anwaltName: 'Rechtsanwalt Thai Bao Nguyen',
    address: '[bitte im Profil ergänzen]\nBerlin',
    contact: 'thai.bao@ra-nguyen.de  ·  ra-nguyen.de',
    kammerId: 'Rechtsanwaltskammer Berlin',
  },
  cases: [
    {
      case: {
        aktenzeichen: '25/0301',
        mandantName: 'Nguyen Van Minh',
        description: 'Aufenthaltstitel-Verlängerung; Mandant lebt seit 4 J. in DE, Beschäftigung gewechselt — Frist läuft.',
        mandantEmail: 'minh.nguyen@example.com',
        fristOffsetDays: 14,
        fristBezeichnung: 'Verlängerungsantrag § 8 AufenthG',
      },
      research: {
        question: 'Welche Voraussetzungen für die Verlängerung einer Aufenthaltserlaubnis nach § 8 AufenthG, wenn der Mandant den Arbeitgeber gewechselt hat?',
        answer:
          'Die Verlängerung der Aufenthaltserlaubnis richtet sich nach § 8 AufenthG. Maßgeblich ist, ob die Erteilungsvoraussetzungen des ursprünglichen Aufenthaltszwecks (z.B. § 18a/§ 18b AufenthG bei Beschäftigung) weiterhin vorliegen.\n\n' +
          'Bei Arbeitgeberwechsel ist § 8 Abs. 1 AufenthG einschlägig: die Verlängerung erfolgt unter denselben Voraussetzungen wie die Erteilung. Dazu gehört insbesondere die Sicherung des Lebensunterhalts (§ 5 Abs. 1 Nr. 1 AufenthG) und ggf. erneute Zustimmung der Bundesagentur für Arbeit nach § 39 AufenthG, sofern der neue Beruf nicht von der Zustimmungsfreiheit (§ 9 BeschV) gedeckt ist.\n\n' +
          'Prozessual: Antrag rechtzeitig vor Ablauf des bisherigen Titels stellen. Bei verspätetem Antrag droht Erlöschen (§ 51 Abs. 1 Nr. 7 AufenthG). Bei Antrag während Gültigkeit greift Fiktionswirkung gem. § 81 Abs. 4 AufenthG — Ausstellung einer Fiktionsbescheinigung sicherstellen.',
        citations: [
          { display: '§ 8 AufenthG', lawId: 'aufenthg_2004', section: '8', verified: true },
          { display: '§ 5 AufenthG', lawId: 'aufenthg_2004', section: '5', verified: true },
          { display: '§ 39 AufenthG', lawId: 'aufenthg_2004', section: '39', verified: true },
          { display: '§ 81 AufenthG', lawId: 'aufenthg_2004', section: '81', verified: true },
        ],
        reviewed: true,
      },
    },
    {
      case: {
        aktenzeichen: '25/0312',
        mandantName: 'Le Thi Hoa',
        description: 'Familiennachzug Ehegattin aus Vietnam; Stammberechtigter mit Niederlassungserlaubnis. A1-Sprachnachweis-Frage.',
        mandantEmail: 'hoa.le@example.com',
        fristOffsetDays: 21,
        fristBezeichnung: 'Visumsantrag bei Botschaft Hanoi',
      },
      research: {
        question: 'Welche Voraussetzungen für Familiennachzug der Ehegattin aus Vietnam zu Stammberechtigten mit Niederlassungserlaubnis? Sprachnachweis-Pflicht?',
        answer:
          'Der Ehegattennachzug richtet sich nach §§ 27, 30 AufenthG. Voraussetzungen: bestehende Ehe, Volljährigkeit beider Partner (§ 30 Abs. 1 Nr. 1 AufenthG), ausreichender Wohnraum, Sicherung Lebensunterhalt (§ 5 Abs. 1 Nr. 1 AufenthG).\n\n' +
          'Sprachnachweis A1: § 30 Abs. 1 S. 1 Nr. 2 AufenthG fordert einfache Deutschkenntnisse (A1-Niveau) bereits vor Einreise. Ausnahme: § 30 Abs. 1 S. 3 Nr. 2 AufenthG bei Niederlassungserlaubnis-Stammberechtigten — entfällt bei besonderem Härtefall (BVerfG 25.03.2011 – 2 BvR 1413/10) bzw. Unzumutbarkeit des Spracherwerbs.\n\n' +
          'Prozessual: Visum bei Auslandsvertretung (Botschaft Hanoi) beantragen, Anhörung bei Ausländerbehörde am Wohnort des Stammberechtigten. Bei Ablehnung Remonstration binnen 1 Monat, dann Klage VG.',
        citations: [
          { display: '§ 27 AufenthG', lawId: 'aufenthg_2004', section: '27', verified: true },
          { display: '§ 30 AufenthG', lawId: 'aufenthg_2004', section: '30', verified: true },
          { display: '§ 5 AufenthG', lawId: 'aufenthg_2004', section: '5', verified: true },
        ],
        reviewed: true,
      },
    },
    {
      case: {
        aktenzeichen: '25/0287',
        mandantName: 'Pham Quoc An',
        description: 'Strafbefehl wegen § 263 StGB (Betrug) — Mandant bestreitet, Sprachbarriere bei Beschuldigten-Vernehmung.',
        mandantEmail: 'an.pham@example.com',
        fristOffsetDays: 28,
        fristBezeichnung: 'Einspruch Strafbefehl § 410 StPO',
      },
      research: {
        question: 'Welche Verteidigungsansätze bei Strafbefehl wegen § 263 StGB, wenn bei der ersten Vernehmung erhebliche Sprachprobleme bestanden?',
        answer:
          'Bei einem Strafbefehl wegen § 263 StGB ist zuerst die Einspruchsfrist des § 410 StPO strikt zu sichern. Materiell ist zu prüfen, ob der subjektive Tatbestand tragfähig belegt ist und ob der Mandant die ihm vorgeworfenen Täuschungshandlungen überhaupt inhaltlich verstanden hat.\n\n' +
          'Wenn bei der Beschuldigtenvernehmung erhebliche Sprachprobleme bestanden, ist die Verwertbarkeit der Angaben kritisch zu prüfen. Der Anspruch auf ein faires Verfahren und auf sprachliche Verständlichkeit spricht dafür, belastende Aussagen nur zurückhaltend zu verwerten, wenn keine hinreichende Übersetzung oder Verständnissicherung erfolgt ist.\n\n' +
          'Verteidigungspraktisch: fristwahrender Einspruch, sofortige Akteneinsicht, Prüfung der Vernehmungsdokumentation und der Dolmetscherfrage sowie Vorbereitung einer Einlassung erst nach Aktenkenntnis.',
        citations: [
          { display: '§ 263 StGB', lawId: 'stgb', section: '263', verified: true },
          { display: '§ 410 StPO', lawId: 'stpo', section: '410', verified: true },
          { display: '§ 147 StPO', lawId: 'stpo', section: '147', verified: true },
        ],
        reviewed: true,
      },
      letter: {
        templateId: 'akteneinsicht',
        fields: {
          recipient: 'Amtsgericht Tiergarten — Strafabteilung',
          mandant: 'Pham Quoc An',
          aktenzeichen: '227 Cs 105/26',
          rolle: 'Beschuldigter',
          rechtsgrundlage: '§ 147 StPO',
        },
      },
    },
  ],
}

export const KANZLEI_PRESETS: KanzleiPreset[] = [RUBIN, GNIOSDORZ, NGUYEN, GENERISCH]

// --- Apply ------------------------------------------------------------------

export function getPreset(key: string): KanzleiPreset | undefined {
  return KANZLEI_PRESETS.find(p => p.key === key)
}

export function isDemoLoaded(): boolean {
  return localStorage.getItem(DEMO_MARKER) !== null
}

/**
 * Load a preset: writes Kanzlei-Settings, creates cases with attached
 * research and letters. Idempotent via DEMO_MARKER. Call eraseAllProData
 * to reset before re-loading a different preset.
 */
export function loadDemoData(presetKey: string): { presetKey: string; caseCount: number } {
  const preset = getPreset(presetKey)
  if (!preset) throw new Error(`Unknown preset: ${presetKey}`)

  saveSettings(preset.settings)

  for (const dc of preset.cases) {
    const c = createCase({
      aktenzeichen: dc.case.aktenzeichen,
      mandantName: dc.case.mandantName,
      description: dc.case.description,
    })
    // Apply optional case metadata (email, frist) via updateCase so it shows
    // in the detail view + dashboard widget.
    const patch: Parameters<typeof updateCase>[1] = {}
    if (dc.case.mandantEmail) patch.mandantEmail = dc.case.mandantEmail
    if (typeof dc.case.fristOffsetDays === 'number') {
      patch.fristDatum = daysFromNow(dc.case.fristOffsetDays)
      patch.fristBezeichnung = dc.case.fristBezeichnung
    }
    if (Object.keys(patch).length > 0) updateCase(c.id, patch)
    if (dc.research) {
      saveResearch({
        caseId: c.id,
        question: dc.research.question,
        answer: dc.research.answer,
        citations: dc.research.citations,
        reviewed: dc.research.reviewed,
      })
    }
    if (dc.letter) {
      const tpl = getLawyerTemplate(dc.letter.templateId)
      if (tpl) {
        const body = tpl.render(dc.letter.fields)
        saveLetter({
          caseId: c.id,
          templateId: tpl.id,
          templateTitle: tpl.title,
          fields: dc.letter.fields,
          body,
        })
      }
    }
  }

  localStorage.setItem(DEMO_MARKER, preset.key)
  return { presetKey: preset.key, caseCount: preset.cases.length }
}
