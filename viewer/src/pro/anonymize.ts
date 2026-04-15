/**
 * PII-Anonymisierung vor KI-Anfragen — Version 2 (deutlich erweitert).
 *
 * Warum überhaupt notwendig: die Recherche-Frage geht an OpenAI (USA).
 * Wenn ein:e Anwält:in schreibt "Frau Öztürk aus der Bleibtreustraße 24
 * möchte…" landet ein realer Name + Adresse bei einem US-Anbieter —
 * ohne AVV ein Berufsrechts-Problem (§ 43a BRAO, § 203 StGB) und
 * DSGVO-Verstoß.
 *
 * Diese Version 2:
 *   - 14 Patterns (statt 9): + Steuer-ID, Sozialversicherungs-Nr,
 *     IBAN-Verbesserung, BIC, GmbH-/AG-/UG-Namen, Aktenzeichen-
 *     Pattern, Geburtsdatum-Phrasen
 *   - Whitelist gegen Falsch-Anonymisierung von Rechtsbegriffen
 *     ("BGB", "StGB" etc. werden NIE als Mandanten-Name erkannt)
 *   - "DSGVO-Modus": auto-anonymize vor jedem KI-Call (in store.ts)
 *
 * Wichtig: Dies ist keine DSGVO-Compliance-Silberkugel. Es ist ein
 * pragmatischer Schutz gegen *versehentliche* PII-Preisgabe. Für echten
 * Compliance-Level brauchen wir zusätzlich: AVV mit OpenAI, idealerweise
 * Azure OpenAI EU-Region, Kanzlei-AVV, TOM-Dokumentation.
 */

export interface AnonymizeResult {
  anonymized: string
  replacements: Array<{ original: string; placeholder: string; pattern: string }>
}

// Whitelist — diese Begriffe werden NIE anonymisiert, auch wenn sie wie
// PII aussehen. Wichtig: deutsche Rechts-Abkürzungen und Standard-Worte.
const WHITELIST = new Set([
  // Gesetzes-Abkürzungen
  'BGB', 'StGB', 'StPO', 'ZPO', 'GG', 'EStG', 'AO', 'NetzDG', 'AufenthG',
  'ArbZG', 'KSchG', 'MuSchG', 'AGG', 'GEG', 'BEEG', 'BImSchG', 'UWG', 'HGB',
  'AktG', 'BetrVG', 'InsO', 'VwGO', 'GWB', 'VwVfG', 'GVG', 'GewSchG', 'SGG',
  'StVO', 'StVG', 'UStG', 'WEG', 'WoEigG', 'AsylG', 'StAG', 'BeurkG', 'GBO',
  'FamFG', 'BeschV', 'TVöD', 'TVL', 'BGH', 'BVerfG', 'BVerwG', 'BSG', 'EuGH',
  'BAG', 'BFH', 'OLG', 'LG', 'AG', 'OVG', 'VG', 'SG', 'LSG', 'FG',
  // Verbreitete Sachbegriffe die wie Eigennamen aussehen können
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart',
  'Düsseldorf', 'Bremen', 'Leipzig', 'Hannover', 'Dresden', 'Essen',
  'Bundesrepublik', 'Deutschland', 'Europäische', 'Union', 'Mietvertrag',
  'Kaufvertrag', 'Arbeitsvertrag', 'Klage', 'Widerspruch', 'Antrag',
  'Bescheid', 'Urteil', 'Verfassung', 'Grundgesetz', 'Strafanzeige',
])

interface PatternDef {
  name: string
  re: RegExp
  placeholder: string
}

const PATTERNS: PatternDef[] = [
  // E-Mail
  { name: 'email', re: /\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, placeholder: '[E-MAIL]' },

  // IBAN (DE + optional andere EU)
  { name: 'iban', re: /\b[A-Z]{2}\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{0,4}\b/g, placeholder: '[IBAN]' },

  // BIC
  { name: 'bic', re: /\b[A-Z]{4}DE[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g, placeholder: '[BIC]' },

  // Telefon (nur wenn klar erkennbar — vermeide false-positives für §-Nummern)
  { name: 'tel', re: /\b(?:\+49|0049)[\s/.-]?\d{2,4}[\s/.-]?\d{3,8}[\s/.-]?\d{0,8}\b|\b0\d{2,4}[\s/.-]?\d{3,8}[\s/.-]?\d{0,8}\b/g, placeholder: '[TEL]' },

  // Deutsche Steuer-Identifikationsnummer (11 Ziffern, ohne Punkte)
  { name: 'steuer_id', re: /\b\d{11}\b/g, placeholder: '[STEUER-ID]' },

  // Sozialversicherungsnummer (12 Stellen mit Buchstabe an Position 9)
  // z. B. "12345678A901" oder "12 345678 A 901"
  { name: 'sv_nr', re: /\b\d{2}\s?\d{6}\s?[A-Z]\s?\d{3}\b/g, placeholder: '[SV-NR]' },

  // Deutsche Adresse: Straße/Platz/Allee/Weg + Hausnummer
  {
    name: 'adresse',
    re: /\b[A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.|platz|allee|weg|gasse|damm|ufer|ring|chaussee|stieg)\s+\d+[a-zA-Z]?\b/g,
    placeholder: '[ADRESSE]',
  },

  // PLZ + Ort
  { name: 'plz_ort', re: /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)*\b/g, placeholder: '[PLZ_ORT]' },

  // Reine PLZ (ohne Ort)
  { name: 'plz', re: /\b\d{5}\b/g, placeholder: '[PLZ]' },

  // Aktenzeichen Gericht/StA: "12 O 345/24", "2 StR 202/19", "VIII ZR 91/20"
  { name: 'aktenzeichen', re: /\b(?:[IVX]+\s+)?\d+\s+[A-Z][A-Za-z]{0,4}\s+\d+\/\d+\b/g, placeholder: '[AKTENZEICHEN]' },

  // Geburtsdatums-Phrasen ("geb. 12.03.1985", "geboren am 1.1.1990")
  {
    name: 'geburtsdatum',
    re: /\b(?:geb\.|geboren\s+am)\s*\d{1,2}\.\s*\d{1,2}\.\s*(?:19|20)\d{2}\b/gi,
    placeholder: '[GEBURTSDATUM]',
  },

  // Datum TT.MM.JJJJ und TT.MM.JJ (nach Geburtsdatum, sonst wir hätten dieses dort schon ersetzt)
  { name: 'datum', re: /\b\d{1,2}\.\d{1,2}\.(?:19|20)\d{2}\b/g, placeholder: '[DATUM]' },

  // Firmen mit GmbH/AG/UG/SE/KG-Suffix
  {
    name: 'firma',
    re: /\b(?:[A-ZÄÖÜ][a-zäöüß&-]+\s+){1,4}(?:GmbH(?:\s+&?\s*Co\.?\s*KG)?|AG|UG\s*\(haftungsbeschränkt\)|SE|KG|OHG|e\.?\s*V\.?|mbH(?:\s+&?\s*Co\.?\s*KG)?)\b/g,
    placeholder: '[FIRMA]',
  },

  // Mehrteilige Namen mit Titel
  {
    name: 'name_titel_mehr',
    re: /\b(?:(?:Herr|Frau|Hr\.|Fr\.)\s+)?(?:Dr\.|Prof\.|Dr\.\s+Dr\.|Dipl\.-[A-Za-z]+|RA|RAin)\s+(?:[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\s+){0,3}[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\b/g,
    placeholder: '[MANDANT:IN]',
  },

  // Konservative Namenserkennung: Titel davor
  {
    name: 'name_titel',
    re: /\b(?:Herr|Frau|Hr\.|Fr\.)\s+(?:[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\s+){0,2}[A-ZÄÖÜ][a-zäöüß]+(?:-[A-ZÄÖÜ][a-zäöüß]+)?\b/g,
    placeholder: '[MANDANT:IN]',
  },
]

/**
 * Anonymize a string. Replacements get reported back so UI can show diff.
 */
export function anonymize(text: string): AnonymizeResult {
  let result = text
  const replacements: AnonymizeResult['replacements'] = []
  const seen = new Map<string, string>()

  for (const { name, re, placeholder } of PATTERNS) {
    result = result.replace(re, match => {
      // Whitelist: Wenn der Match exakt ein Whitelist-Token ist, NICHT ersetzen
      const trimmed = match.trim()
      if (WHITELIST.has(trimmed)) return match
      // Whitelist-Words kontextuell: zerlege Match und prüfe ob alle Tokens whitelisted
      const tokens = trimmed.split(/\s+/)
      if (tokens.every(t => WHITELIST.has(t))) return match

      if (!seen.has(match)) {
        seen.set(match, placeholder)
        replacements.push({ original: match, placeholder, pattern: name })
      }
      return placeholder
    })
  }

  return { anonymized: result, replacements }
}

export function hasPII(text: string): boolean {
  return anonymize(text).replacements.length > 0
}

// --- DSGVO-Modus: auto-anonymize-Toggle, persistent in localStorage ---

const KEY_DSGVO_MODUS = 'gitlaw.pro.dsgvoModus.v1'

export function isDsgvoModusActive(): boolean {
  return localStorage.getItem(KEY_DSGVO_MODUS) === '1'
}

export function setDsgvoModusActive(active: boolean): void {
  localStorage.setItem(KEY_DSGVO_MODUS, active ? '1' : '0')
}
