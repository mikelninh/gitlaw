/**
 * OCR-Helfer fuer das Mandanten-Portal.
 *
 * runOcr:            Datei -> /api/ocr -> {text, status}
 * suggestChecklistMatch: OCR-Text -> bestes passendes Checklist-Item
 */

import { matchesItem } from '../pro/checklist-match'
import type { ChecklistItem, MandatsartChecklist } from '../pro/types'

const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'

// ---------------------------------------------------------------------------
// runOcr
// ---------------------------------------------------------------------------

export type OcrRunStatus = 'ok' | 'needs_render' | 'error'

export interface OcrResult {
  text: string
  status: OcrRunStatus
  errorMessage?: string
}

export async function runOcr(
  file: File,
  lang: 'de' | 'vi' = 'de',
  token?: string,
): Promise<OcrResult> {
  let base64 = ''
  try {
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1] ?? '')
      }
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'))
      reader.readAsDataURL(file)
    })
  } catch (err) {
    return {
      text: '',
      status: 'error',
      errorMessage: err instanceof Error ? err.message : 'Lesefehler',
    }
  }

  // Mandant-Endpoint (Token-Auth) — kein Pro-Session nötig
  const endpoint = `${API_URL}/api/mandant/ocr`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token ?? '',
        fileName: file.name,
        mimeType: file.type,
        base64,
        // Deutsche Behoerdendokumente auch fuer VI-Mandanten per 'de' erkennen
        lang: lang === 'vi' ? 'de' : lang,
      }),
    })

    const data = (await res.json()) as {
      ok: boolean
      status?: string
      ocrText?: string
      message?: string
      error?: string
    }

    if (!data.ok) {
      // Zeige konkrete Fehlermeldung vom Backend (error > message > Fallback)
      const msg = data.error ?? data.message ?? `OCR-Fehler (HTTP ${res.status})`
      return { text: '', status: 'error', errorMessage: msg }
    }

    if (data.status === 'needs_render') {
      return { text: '', status: 'needs_render' }
    }

    return { text: data.ocrText ?? '', status: 'ok' }
  } catch (err) {
    return {
      text: '',
      status: 'error',
      errorMessage: err instanceof Error ? err.message : 'Netzwerkfehler',
    }
  }
}

// ---------------------------------------------------------------------------
// suggestChecklistMatch
// ---------------------------------------------------------------------------

export interface ChecklistSuggestion {
  itemId: string
  itemLabel: string
  itemLabelVi: string | undefined
  confidence: 'high' | 'low'
}

/**
 * Vergleicht OCR-Text mit allen required Items der Checkliste.
 * Gibt das erste High-Confidence-Match zurueck, sonst das erste Low-Confidence-Match.
 * Bereits vollstaendig abgeschlossene Items werden uebersprungen.
 */
export function suggestChecklistMatch(
  ocrText: string,
  checklist: MandatsartChecklist,
  uploadedCountByItemId: Record<string, number>,
): ChecklistSuggestion | null {
  if (!ocrText || ocrText.trim().length < 20) return null

  const candidates: Array<{ item: ChecklistItem; confidence: 'high' | 'low' }> = []

  for (const item of checklist.requiredDocuments) {
    if (item.level !== 'required') continue

    const required = item.requiredPhotoCount ?? 1
    const uploaded = uploadedCountByItemId[item.id] ?? 0
    if (uploaded >= required) continue  // Item bereits vollstaendig

    const { matched, confidence } = matchesItem(item.label, item.id, ocrText)
    if (matched) {
      candidates.push({ item, confidence })
    }
  }

  if (candidates.length === 0) return null

  // High-confidence bevorzugen
  const best =
    candidates.find(c => c.confidence === 'high') ?? candidates[0]

  return {
    itemId: best.item.id,
    itemLabel: best.item.label,
    itemLabelVi: best.item.labelVi,
    confidence: best.confidence,
  }
}
