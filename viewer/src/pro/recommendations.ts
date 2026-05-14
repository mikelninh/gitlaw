/**
 * Status-getriebene Workflow-Empfehlungen fuer den Anwalt/Refa.
 *
 * Frueherer Ansatz lieferte OCR- und Recherche-Vorschlaege — zu viel Rauschen
 * fuer den Bao-Pilot. Jetzt: nur Status-bezogene naechste Schritte.
 */

import type { MandantCase } from './types'

export interface WorkflowRecommendation {
  id: string
  caseId: string
  priority: number
  title: string
  reason: string
  cta: string
  to: string
  tone: 'urgent' | 'action' | 'review'
  stage: 'documents' | 'ocr' | 'translation' | 'research' | 'draft'
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Gibt 0–3 Status-getriebene Empfehlungen fuer eine Akte zurueck.
 * OCR- und Recherche-Vorschlaege wurden entfernt (Bao-Wunsch, Sprint 1).
 */
export function getCaseRecommendations(c: MandantCase): WorkflowRecommendation[] {
  const recs: WorkflowRecommendation[] = []
  const frist = c.fristDatum ? daysUntil(c.fristDatum) : null
  const fristNah = frist !== null && frist <= 3

  const status = c.caseStatus ?? 'unterlagen_fehlen'

  if (status === 'unterlagen_fehlen') {
    recs.push({
      id: `${c.id}:status:unterlagen`,
      caseId: c.id,
      priority: fristNah ? 96 : 90,
      title: 'Mandant:in an fehlende Unterlagen erinnern',
      reason: 'Akte kann nicht weiterbearbeitet werden, solange Unterlagen fehlen.',
      cta: 'Erinnerung erstellen',
      to: `/pro/akten/${c.id}`,
      tone: fristNah ? 'urgent' : 'action',
      stage: 'documents',
    })
  }

  if (status === 'unterlagen_in_pruefung') {
    recs.push({
      id: `${c.id}:status:pruefung`,
      caseId: c.id,
      priority: fristNah ? 94 : 85,
      title: 'Eingereichte Unterlagen prüfen',
      reason: 'Alle Unterlagen eingegangen — bitte Vollständigkeit und Richtigkeit bestätigen.',
      cta: 'Zur Checkliste',
      to: `/pro/akten/${c.id}`,
      tone: fristNah ? 'urgent' : 'review',
      stage: 'documents',
    })
  }

  if (status === 'antrag_in_vorbereitung') {
    recs.push({
      id: `${c.id}:status:vorbereitung`,
      caseId: c.id,
      priority: fristNah ? 96 : 88,
      title: 'Schreiben generieren',
      reason: 'Unterlagen geprüft — Antrag kann jetzt vorbereitet und eingereicht werden.',
      cta: 'Vorlagen öffnen',
      to: `/pro/schreiben?case=${c.id}`,
      tone: fristNah ? 'urgent' : 'action',
      stage: 'draft',
    })
  }

  if (status === 'antrag_eingereicht') {
    recs.push({
      id: `${c.id}:status:eingereicht`,
      caseId: c.id,
      priority: 60,
      title: 'Eingangsbestätigung anfordern',
      reason: 'Antrag liegt bei der Behörde — Eingangsbestätigung sichert den Nachweis.',
      cta: 'Zur Akte',
      to: `/pro/akten/${c.id}`,
      tone: 'review',
      stage: 'draft',
    })
  }

  if (status === 'behoerdliche_rueckmeldung_ausstehend') {
    if (fristNah) {
      recs.push({
        id: `${c.id}:status:frist`,
        caseId: c.id,
        priority: 95,
        title: 'Frist läuft bald ab — Behörde nachfassen',
        reason: 'Keine Rückmeldung und Frist nah. Jetzt Untätigkeitsbeschwerde prüfen.',
        cta: 'Zur Akte',
        to: `/pro/akten/${c.id}`,
        tone: 'urgent',
        stage: 'draft',
      })
    }
  }

  if (status === 'behoerde_nachforderung') {
    recs.push({
      id: `${c.id}:status:nachforderung`,
      caseId: c.id,
      priority: fristNah ? 96 : 88,
      title: 'Nachforderung der Behörde prüfen',
      reason: 'Behörde hat weitere Unterlagen angefordert — bitte zeitnah beantworten.',
      cta: 'Zur Akte',
      to: `/pro/akten/${c.id}`,
      tone: fristNah ? 'urgent' : 'action',
      stage: 'documents',
    })
  }

  if (status === 'termin_steht_aus') {
    recs.push({
      id: `${c.id}:status:termin`,
      caseId: c.id,
      priority: fristNah ? 95 : 80,
      title: 'Anwaltliche Vorbereitung auf Termin',
      reason: 'Termin oder Entscheidung steht aus — Unterlagen und Argumente bereitlegen.',
      cta: 'Zur Akte',
      to: `/pro/akten/${c.id}`,
      tone: fristNah ? 'urgent' : 'action',
      stage: 'draft',
    })
  }

  // 'verfahren_abgeschlossen': kein Vorschlag — Terminal-Status

  return recs.sort((a, b) => b.priority - a.priority)
}

export function getGlobalRecommendations(cases: MandantCase[]): WorkflowRecommendation[] {
  return cases
    .filter(c => c.status === 'aktiv')
    .flatMap(c => getCaseRecommendations(c))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 4)
}
