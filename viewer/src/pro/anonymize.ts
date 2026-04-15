/**
 * PII-Anonymisierung vor KI-Anfragen.
 *
 * Warum überhaupt notwendig: die Recherche-Frage geht an OpenAI (USA).
 * Wenn ein:e Anwält:in schreibt "Frau Öztürk aus der Bleibtreustraße 24
 * möchte…" landet ein realer Name + Adresse bei einem US-Anbieter —
 * ohne AVV ein Berufsrechts-Problem (§ 43a BRAO, § 203 StGB) und
 * DSGVO-Verstoß.
 *
 * Dieser Schritt ersetzt personenbezogene Tokens durch Platzhalter,
 * bevor die Frage gesendet wird. Die juristische Substanz bleibt
 * erhalten — die Frage "Welche Kündigungsfrist gilt für [MANDANT:IN]
 * nach 18 Jahren Mietverhältnis" ist rechtlich genauso beantwortbar
 * wie die mit echtem Namen.
 *
 * Wichtig: Dies ist keine DSGVO-Compliance-Silberkugel. Es ist ein
 * pragmatischer Schutz gegen *versehentliche* PII-Preisgabe. Für echten
 * Rechts-Compliance-Level brauchen wir zusätzlich: AVV mit OpenAI
 * (idealerweise Azure OpenAI EU-Region), signiertes AV-Vertrag mit der
 * Kanzlei, technisch-organisatorische Maßnahmen-Dokumentation.
 */

export interface AnonymizeResult {
  anonymized: string
  replacements: Array<{ original: string; placeholder: string }>
}

// Reihenfolge matters: erst die spezifischsten Muster, dann die allgemeinen.
const PATTERNS: Array<{ re: RegExp; placeholder: string }> = [
  // E-Mail
  { re: /\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/g, placeholder: '[E-MAIL]' },

  // IBAN (approx)
  { re: /\bDE\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{2}\b/g, placeholder: '[IBAN]' },

  // Telefon: +49 30 12345-67, 030 / 1234 5678, 0176-12345678
  { re: /\b(?:\+49|0049|0)[\s/.-]?\d{2,4}[\s/.-]?\d{3,8}[\s/.-]?\d{0,8}\b/g, placeholder: '[TEL]' },

  // Deutsche Adresse: Straße/Platz/Allee/Weg + Hausnummer
  {
    re: /\b[A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.|platz|allee|weg|gasse|damm|ufer|ring)\s+\d+[a-zA-Z]?\b/g,
    placeholder: '[ADRESSE]',
  },

  // PLZ + Ort
  { re: /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\b/g, placeholder: '[PLZ_ORT]' },

  // Reine PLZ (ohne Ort dahinter)
  { re: /\b\d{5}\b/g, placeholder: '[PLZ]' },

  // Aktenzeichen Pattern (Gericht / StA): "12 O 345/24", "2 StR 202/19", "VIII ZR 91/20"
  { re: /\b(?:[IVX]+\s+)?\d+\s+[A-Z][A-Za-z]{0,4}\s+\d+\/\d+\b/g, placeholder: '[AKTENZEICHEN]' },

  // Datum TT.MM.JJJJ und TT.MM.JJ
  { re: /\b\d{1,2}\.\d{1,2}\.(?:19|20)\d{2}\b/g, placeholder: '[DATUM]' },

  // Geburtsdatum / Sozialversicherungsnummer: 12 stellige IDs etc
  { re: /\b\d{10,12}\b/g, placeholder: '[ID]' },

  // Mehrteilige Namen: "Frau Anna Schmidt-Müller", "Herr Dr. von der Leyen"
  {
    re: /\b(?:(?:Herr|Frau|Hr\.|Fr\.)\s+)?(?:Dr\.|Prof\.|Dr\.\s+Dr\.|Dipl\.-[A-Za-z]+|RA|RAin)\s+(?:[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\s+){0,3}[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\b/g,
    placeholder: '[MANDANT:IN]',
  },

  // Konservative Namenserkennung: Titel davor
  {
    re: /\b(?:Herr|Frau|Hr\.|Fr\.)\s+(?:[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\s+){0,2}[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\b/g,
    placeholder: '[MANDANT:IN]',
  },

  // Zwei aufeinanderfolgende kapitalisierte Wörter — vorsichtig, weil das auch Gesetzes-
  // oder Institutionsnamen treffen könnte. Whitelist bekannte Rechtsbegriffe.
  // Wir machen das BEWUSST NICHT automatisch, weil Risiko:
  //   "Bundesgerichtshof" → [MANDANT:IN] wäre fatal.
  // Stattdessen: wir vertrauen darauf dass der:die Anwält:in Titel (Frau/Herr/Dr.)
  // mitgetippt hat. Wenn nicht, bleibt der Name drin — das wird dann manuell ergänzt.
]

export function anonymize(text: string): AnonymizeResult {
  let result = text
  const replacements: AnonymizeResult['replacements'] = []
  const seen = new Map<string, string>()

  for (const { re, placeholder } of PATTERNS) {
    result = result.replace(re, match => {
      if (!seen.has(match)) {
        seen.set(match, placeholder)
        replacements.push({ original: match, placeholder })
      }
      return placeholder
    })
  }

  return { anonymized: result, replacements }
}

/** Did we change anything at all? */
export function hasPII(text: string): boolean {
  return anonymize(text).replacements.length > 0
}
