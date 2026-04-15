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
    fullName: 'Thai Bao Nguyen',
    heroEmoji: '🇻🇳',
    tagline: 'Ich habe an etwas Konkretes gedacht: ein vietnamesisch-sprachiges Mandant:innen-Formular und 12 Migrationsrecht-Vorlagen — falls deine Mandantschaft das öfter braucht, als deine Website verrät 😉',
    betaToken: 'BETA-NGUYEN',
    presetKey: 'nguyen',
    personalNote: 'Bao, du bist mein bester Freund und einer der wenigen Anwält:innen, denen ich eine vietnamesisch-sprachige Mandantschaft anvertrauen würde. Wenn du das Tool 4 Wochen testest und mir sagst was kaputt ist — gewinnen wir beide. Wenn nicht, kein Cent.',
    highlights: [
      {
        emoji: '🇻🇳',
        title: 'Mandant:innen-Formular auf Vietnamesisch',
        description: 'Deine Mandant:innen scannen den QR mit dem Handy, füllen Tiếng Việt aus, du liest das Ergebnis auf Deutsch. Spart dir die ersten 30 Min jeder Erstberatung.',
        showQrFor: { lang: 'vi', caption: 'Demo-Formular auf Vietnamesisch' },
      },
      {
        emoji: '📋',
        title: '12 Migrationsrecht-Vorlagen',
        description: 'Kein anderes deutsches Tool hat das in dieser Tiefe.',
        bullets: [
          'Aufenthaltstitel-Verlängerung (§ 8 AufenthG)',
          'Familiennachzug Ehegatt:in (§§ 27-30 AufenthG)',
          'Einbürgerungsantrag (§§ 8-10 StAG)',
          'Eilantrag gegen Abschiebung (§ 80 V VwGO)',
          'Fiktionsbescheinigung (§ 81 IV AufenthG)',
          '… plus 7 weitere',
        ],
        footnote: 'Vorlage wählen, 6 Felder ausfüllen, PDF auf deinem Briefkopf. 5 Min.',
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
