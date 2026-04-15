/**
 * Zeit-Ersparnis-Rechner aus dem Audit-Log.
 *
 * Warum diese Zahlen im UI: Rubin, Werner und Jasmin sollen spätestens am
 * Freitagabend sehen „diese Woche: 3h 20min gespart". Das ist der
 * psychologische Anker, der aus einem Tool einen täglichen Begleiter macht.
 *
 * Annahme pro Aktion (konservativ, basierend auf Anwalts-Benchmark-Gespräch):
 *   letter.generate:   25 min gespart (Vorlage öffnen → fertig)
 *   research.query:    12 min gespart (Beck-Suche → Paragraph + Excerpt)
 *   case.create:        3 min gespart (Aktenanlage inkl. Frist-Feld)
 *   pdf.export:         2 min gespart (kein manueller Kanzlei-Briefkopf)
 *   letter.generate + pdf.export + mail: zählen einzeln, nicht aufsummiert
 *
 * Wenn wir später Nutzer-Feedback haben, kalibrieren wir diese Werte.
 */

import type { AuditEntry } from './types'
import { listAudit } from './store'

const MINUTES_PER_ACTION: Record<AuditEntry['action'], number> = {
  'letter.generate': 25,
  'research.query': 12,
  'case.create': 3,
  'pdf.export': 2,
  'intake.received': 8,   // eingesparte Erstintake-Zeit am Telefon
  'case.archive': 0,
  'settings.update': 0,
  'login': 0,
}

export interface SavingsSummary {
  /** Gesamte Minuten gespart im Zeitraum. */
  minutes: number
  /** Formatiertes "3h 40min" / "45min" / "0min" */
  humanTime: string
  /** Bei 220 €/h Stundensatz (Berlin-Standard) */
  euroAt220: number
  /** Anzahl Aktionen gruppiert */
  breakdown: Partial<Record<AuditEntry['action'], number>>
}

export function savingsForPeriod(days: number): SavingsSummary {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffIso = cutoff.toISOString()
  const entries = listAudit().filter(e => e.at >= cutoffIso)
  return computeSavings(entries)
}

export function savingsThisWeek(): SavingsSummary {
  return savingsForPeriod(7)
}

export function savingsThisMonth(): SavingsSummary {
  return savingsForPeriod(30)
}

export function computeSavings(entries: AuditEntry[]): SavingsSummary {
  const breakdown: Partial<Record<AuditEntry['action'], number>> = {}
  let minutes = 0
  for (const e of entries) {
    breakdown[e.action] = (breakdown[e.action] || 0) + 1
    minutes += MINUTES_PER_ACTION[e.action] || 0
  }
  return {
    minutes,
    humanTime: formatMinutes(minutes),
    euroAt220: Math.round((minutes / 60) * 220),
    breakdown,
  }
}

function formatMinutes(m: number): string {
  if (m <= 0) return '0min'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (rem === 0) return `${h}h`
  return `${h}h ${rem}min`
}
