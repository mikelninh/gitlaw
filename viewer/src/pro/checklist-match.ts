/**
 * Gemeinsame Helfer fuer OCR-Keyword-Matching von Checklist-Items.
 * Wird von ChecklistUploadZone (Pro) und mandant-ocr.ts (Mandant) geteilt.
 */

// ---------------------------------------------------------------------------
// Aliase fuer OCR-Keyword-Matching
// ---------------------------------------------------------------------------

export const KEYWORD_ALIASES: Record<string, string[]> = {
  reisepass: ['reisepass', 'passport', 'hộ chiếu'],
  meldebescheinigung: ['meldebescheinigung', 'anmeldung', 'melderegister'],
  mietvertrag: ['mietvertrag', 'mietverhältnis'],
  krankenversicherung: ['krankenversicherung', 'versicherungsnachweis', 'tk', 'aok', 'barmer'],
  einkommen: ['einkommen', 'lohn', 'gehalt', 'arbeitsentgelt', 'lohnabrechnung'],
  lichtbild: ['lichtbild', 'passfoto', 'biometrisch'],
  sprachzeugnis: ['sprachzeugnis', 'goethe', 'telc', 'dtz', 'b1', 'a2'],
  vollmacht: ['vollmacht', 'bevollmächtigung'],
  arbeitsvertrag: ['arbeitsvertrag', 'beschäftigungsverhältnis'],
  aufenthaltstitel: ['aufenthaltstitel', 'aufenthaltserlaubnis', 'eat', 'elektronischer aufenthaltstitel'],
  kontoauszug: ['kontoauszug', 'kontoauszüge', 'girokonto', 'iban', 'bankverbindung', 'sao kê'],
  geburtsurkunde: ['geburtsurkunde', 'geburtsregister', 'giấy khai sinh'],
  heiratsurkunde: ['heiratsurkunde', 'heiratsregister', 'giấy đăng ký kết hôn'],
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export type MatchConfidence = 'high' | 'low'

export function matchesItem(
  itemLabel: string,
  itemId: string,
  ocrText: string,
): { matched: boolean; confidence: MatchConfidence } {
  const text = normalize(ocrText)

  // Pruefe zuerst Aliase per item-ID-Praefix oder Label
  for (const [key, aliases] of Object.entries(KEYWORD_ALIASES)) {
    if (itemId.includes(key) || itemLabel.toLowerCase().includes(key)) {
      if (aliases.some(alias => text.includes(normalize(alias)))) {
        return { matched: true, confidence: 'high' }
      }
    }
  }

  // Fallback: item.label direkt als Substring (ab 6 Zeichen, um Rauschen zu vermeiden)
  const labelNorm = normalize(itemLabel)
  if (labelNorm.length >= 6 && text.includes(labelNorm)) {
    return { matched: true, confidence: 'low' }
  }

  return { matched: false, confidence: 'low' }
}
