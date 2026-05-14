/**
 * Welcome-Page-Konfiguration pro echtem Beta-Tester.
 *
 * Jede Persona hat:
 * - eine eigene URL (z. B. /#/bao oder /#/rubin)
 * - persönliche Begrüßung (Vorname, Hero-Emoji, Personal-Note)
 * - Highlight-Cards mit den 1-2 Features die SIE besonders brauchen
 * - 1-Klick "App starten" mit ihrem Token + Preset
 */

export interface WelcomePersona {
  /** URL slug — /#/{slug} */
  slug: string
  /** Vorname für persönliche Anrede */
  firstName: string
  /** Vollständiger Name für Header */
  fullName: string
  /** Hero-Emoji (Flag, Symbol) */
  heroEmoji: string
  /** Untertitel-Tagline für Hero */
  tagline: string
  /** Beta-Token für Auto-Login */
  betaToken: string
  /** Demo-Preset-Key für Auto-Load */
  presetKey: string
  /** Persönliche Note von Mikel — wird in eigener Karte gezeigt */
  personalNote: string
  /** Highlight-Karten mit Schwerpunkt-Features */
  highlights: WelcomeHighlight[]
}

export interface WelcomeHighlight {
  emoji: string
  title: string
  description: string
  /** Optional: Liste mit Bullet-Points (Templates, Features, etc.) */
  bullets?: string[]
  /** Optional: zeigt einen QR-Code für eine Demo-Intake-URL */
  showQrFor?: { lang?: string; caption: string }
  /** Optional: Hinweis-Footer */
  footnote?: string
}

export const PERSONAS: Record<string, WelcomePersona> = {
  bao: {
    slug: 'bao',
    firstName: 'Bao',
    fullName: 'Bao N.',
    heroEmoji: '🇻🇳',
    tagline: 'Stand 2026-05-07. Intake, Akte, Recherche, Schreiben, Advoware-Sync — an einem Ort. Was diese Woche dazugekommen ist:',
    betaToken: 'BETA-NGUYEN',
    presetKey: 'nguyen',
    personalNote: 'Bao, hier ist was seit unserem letzten Gespräch gebaut wurde. Mandanten-Portal ist live — dein erster Mandant kann jetzt direkt hochladen. Advoware-CSV-Sync ist drin: Akten als CSV, dann wieder rein, Smart-Match per Aktenzeichen. Als Nächstes reden wir über die Companion-App (automatisch, kein manueller Export) und den Postgres-Move — beides braucht dein Go.',
    highlights: [
      {
        emoji: '🇻🇳',
        title: 'Mandanten-Portal DE+VI — heute gebaut',
        description: 'Bao klickt "Mandant einladen" → Link generieren → per WhatsApp senden. Mandant öffnet Portal auf Tiếng Việt, lädt Dokumente hoch, du siehst sie sofort in der Akte. Magic-Link, 30 Tage gültig.',
        showQrFor: { lang: 'vi', caption: 'Demo-Mandantenportal (VI)' },
        bullets: [
          'Magic-Link-Auth — kein Passwort für Mandanten nötig',
          'Auto-Upload landet direkt in der Akte',
          'Sprache wählbar: DE oder VI',
        ],
      },
      {
        emoji: '🔄',
        title: 'Advoware-CSV-Sync — heute gebaut',
        description: 'Akten exportieren → als CSV aus Advoware zurückladen → Smart-Match: Treffer/Neu/Nur-GitLaw. Pro Feld entscheidest du selbst was übernommen wird. Audit-Log-Eintrag pro Änderung.',
        bullets: [
          'Drei Buckets: Match · Neu in Advoware · Nur in GitLaw',
          'Keine stillen Overwrites — Bao bestätigt jeden Diff',
          'Demnächst: Companion-App ohne manuellen Export',
        ],
        footnote: 'API-Vertrag mit STP läuft. Bis dahin: CSV-Brücke funktioniert schon.',
      },
      {
        emoji: '✅',
        title: 'Alles was vorher schon drin war',
        description: '11 Mandatsarten mit 108 Unterlagen-Items, 8-Stati-Workflow, 32 Sachstands-Templates DE+VI, Behörden-DB Berlin, Halluzinations-Schutz bei Recherchen, OCR-Klassifikation, Vollmacht-Signatur.',
        bullets: [
          'Sachstands-Generator: Mandantenname + Behörde + Frist automatisch eingesetzt',
          'Reminder für fehlende Unterlagen per WhatsApp-Template',
          'Audit-Log mit Hash-Chain — manipulationssicher',
        ],
      },
      {
        emoji: '🔜',
        title: 'Was als Nächstes kommt',
        description: 'Drei Punkte, die dein Go brauchen:',
        bullets: [
          'Postgres EU (Frankfurt) — AVV wird vorbereitet',
          'Companion-App für automatischen Advoware-Sync — Interesse bestätigen?',
          'Pilot-Mandant einladen — welche Akte testen wir zuerst?',
        ],
        footnote: 'Alles andere läuft schon. Ruf mich an oder schreib — dann setzen wir die drei Punkte um.',
      },
    ],
  },

  rubin: {
    slug: 'rubin',
    firstName: 'Patrick',
    fullName: 'Rechtsanwalt Patrick Rubin',
    heroEmoji: '🏠',
    tagline: 'Ich habe das Tool so gebaut, dass es Aufmerksamkeit unterstützt statt fragmentiert. Eine Sache zur Zeit, klare Hierarchie. Du wirst sofort sehen ob das gelungen ist.',
    betaToken: 'BETA-RUBIN',
    presetKey: 'rubin',
    personalNote: 'Patrick, du bringst den juristischen Vivek, ich die Technik. Lass uns gemeinsam testen ob das Tool die Klarheit verdient, die es behauptet zu haben. 4 Wochen kostenlos. Wenn du nichts findest was dir hilft — kein Cent.',
    highlights: [
      {
        emoji: '⏰',
        title: 'Frist-Tracker für Mietrechtsfälle',
        description: 'Schonfristzahlung § 569 Abs. 3 BGB, Anfechtung WEG-Beschluss, Räumungsklage-Termine — Dashboard zeigt alles auf einen Blick.',
        bullets: [
          'Frist-Calculator aus Bescheid-Datum (§§ 187, 188 BGB)',
          'Wochenend-Hinweis nach § 193 BGB',
          'Heute-Block: rote Markierung wenn ≤ 0 Tage',
        ],
      },
      {
        emoji: '✍',
        title: 'Vorbereitete Mietrechts-Akten',
        description: 'Drei reale Fall-Typen warten auf dich:',
        bullets: [
          'Jusuf Öztürk — fristlose Kündigung wg. Zahlungsverzug (§§ 543/569 BGB)',
          'WEG Waldstr. 42 — Anfechtung Verwalter-Beschluss (§ 44 WEG)',
          'Dr. Schulze — Eigenbedarfskündigung mit Härtefall (§§ 573/574 BGB)',
        ],
        footnote: 'Alles auf deinem Briefkopf (Knesebeckstr. 59-61). Klick → PDF.',
      },
    ],
  },

  werner: {
    slug: 'werner',
    firstName: 'Werner',
    fullName: 'Werner Gniosdorz',
    heroEmoji: '🎩',
    tagline: 'Notar a.D. heißt nicht „Tools für Junge". Notar a.D. heißt: 30 Jahre Erfahrung verdient ein Werkzeug, das mit dir arbeitet, nicht gegen dich.',
    betaToken: 'BETA-WERNER',
    presetKey: 'gniosdorz',
    personalNote: 'Werner, das Tool merkt sich deine eigenen Formulierungen. Du importierst einmal deine 30-Jahre-Erbschein-Vorlage, nutzt sie 100×. Dein Stil, mein Code. Das Abo zahlt sich bei deinem Stundensatz nach einem Vormittag.',
    highlights: [
      {
        emoji: '⚖️',
        title: '12 Notariats-Templates',
        description: 'Genau dein Bereich — Vollmacht, Erbrecht, Familie:',
        bullets: [
          'Vorsorgevollmacht & Generalvollmacht',
          'Erbschein-Antrag (§ 2353 BGB), Pflichtteil, Erbausschlagung',
          'Patientenverfügung (§ 1827 BGB)',
          'Testamentseröffnungsantrag, Beurkundungs-Vorbereitung',
          'Schenkungsvertrag mit Pflichtteilsanrechnung',
          'Eheaufhebung (§ 1313 BGB), Ehevertrag, Grundschuld',
        ],
      },
      {
        emoji: '📓',
        title: 'Persönliche §-Notizen',
        description: 'Deine 30 Jahre BGH-Wissen — endlich nicht mehr in 30 Word-Dokumenten verstreut. Klick auf jeden Paragraphen → eigene Notiz anlegen. Wächst mit dir.',
        footnote: 'Auch eigene Custom-Vorlagen: importiere einmal, nutze 100×.',
      },
    ],
  },

  jasmin: {
    slug: 'jasmin',
    firstName: 'Jasmin',
    fullName: 'Jasmin Gniosdorz',
    heroEmoji: '⚖️',
    tagline: 'Ein Tool, das mit dir mitwächst. Für dich täglich, für die Kanzlei skalierbar — sobald wir Cloud-Sync mit Werner aktivieren, seht ihr beide dieselben Akten.',
    betaToken: 'BETA-JASMIN',
    presetKey: 'gniosdorz',
    personalNote: 'Jasmin, du bist die jüngere Generation einer Kanzlei mit 30 Jahren Erfahrung. Diese Mischung ist selten. Wenn das Tool euch beide trägt — Werner und dich — dann ist es ein Werkzeug für Generationen.',
    highlights: [
      {
        emoji: '☁',
        title: 'Cloud-Sync mit Werner (sobald aktiviert)',
        description: 'Ihr beide gebt denselben Kanzlei-Schlüssel in die Settings → eure Browser synchronisieren sich automatisch via verschlüsselter Cloud (Frankfurt).',
        bullets: [
          'Werner legt Akte an → du siehst sie sofort',
          'Du machst Recherche → Werner sieht die Notiz',
          'Geteilte §-Wissensdatenbank für die Kanzlei',
        ],
        footnote: 'Aktivierung in Settings → Sync & Backup',
      },
      {
        emoji: '📂',
        title: 'Mandant:innen-Intake per QR',
        description: 'Im Termin: QR zeigen → Mandant:in scannt → füllt aus → landet direkt in deiner Akte. Spart 30 Min Erstaufnahme.',
        showQrFor: { caption: 'Demo-Formular' },
      },
    ],
  },
}
