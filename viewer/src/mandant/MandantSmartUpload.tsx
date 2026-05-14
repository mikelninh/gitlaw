/**
 * MandantSmartUpload — "Foto hochladen ohne Zuordnung"-Aktion.
 *
 * Der Mandant waehlt ein Foto. OCR laeuft. Dann:
 *  - Vorschlag mit Bestaetigung (Ja / Nein, ich waehle selbst)
 *  - Kein Match -> manuelle Auswahl aus der fehlenden-Items-Liste
 *  - Loading-State waehrend OCR laeuft
 *
 * Nach Bestaetigung wird das File per onConfirm-Callback an MandantAkte
 * weitergereicht, das den echten Upload ausfuehrt.
 */

import { useRef, useState } from 'react'
import { Camera, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react'
import { runOcr, suggestChecklistMatch } from './mandant-ocr'
import type { ChecklistItem, MandatsartChecklist, MandantCase } from '../pro/types'
import type { MandantLang } from './mandant-i18n'
import { getMandantStrings } from './mandant-i18n'
import { countUploadedForItem } from './mandant-store'

interface Props {
  caseData: MandantCase
  checklist: MandatsartChecklist | null
  lang: MandantLang
  backendToken: string | null
  onConfirm: (item: ChecklistItem, file: File) => void
}

type SmartState =
  | { phase: 'idle' }
  | { phase: 'running' }
  | { phase: 'suggestion'; item: ChecklistItem; file: File }
  | { phase: 'choose'; file: File; missingItems: ChecklistItem[] }
  | { phase: 'no_match'; file: File; missingItems: ChecklistItem[] }
  | { phase: 'needs_render' }
  | { phase: 'error'; message: string }

export default function MandantSmartUpload({ caseData, checklist, lang, backendToken, onConfirm }: Props) {
  const t = getMandantStrings(lang)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<SmartState>({ phase: 'idle' })

  if (!checklist) return null

  function getMissingItems(): ChecklistItem[] {
    if (!checklist) return []
    return checklist.requiredDocuments.filter(item => {
      if (item.level !== 'required') return false
      const required = item.requiredPhotoCount ?? 1
      return countUploadedForItem(caseData, item.id) < required
    })
  }

  async function handleFile(file: File) {
    if (!checklist) return
    setState({ phase: 'running' })

    const result = await runOcr(file, lang, backendToken ?? undefined)

    if (result.status === 'needs_render') {
      setState({ phase: 'needs_render' })
      return
    }

    if (result.status === 'error') {
      setState({ phase: 'error', message: result.errorMessage ?? t.smartUploadError })
      return
    }

    const missingItems = getMissingItems()

    if (result.text.trim().length < 20) {
      // Kaum Text erkannt — direkt zur manuellen Auswahl
      setState({ phase: 'no_match', file, missingItems })
      return
    }

    const uploadedCountByItemId: Record<string, number> = {}
    for (const item of checklist.requiredDocuments) {
      uploadedCountByItemId[item.id] = countUploadedForItem(caseData, item.id)
    }

    const suggestion = suggestChecklistMatch(result.text, checklist, uploadedCountByItemId)

    if (!suggestion) {
      setState({ phase: 'no_match', file, missingItems })
      return
    }

    const matchedItem = checklist.requiredDocuments.find(i => i.id === suggestion.itemId)
    if (!matchedItem) {
      setState({ phase: 'no_match', file, missingItems })
      return
    }

    setState({ phase: 'suggestion', item: matchedItem, file })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) handleFile(file)
  }

  function confirmSuggestion() {
    if (state.phase !== 'suggestion') return
    onConfirm(state.item, state.file)
    setState({ phase: 'idle' })
  }

  function rejectSuggestion() {
    if (state.phase !== 'suggestion') return
    const missingItems = getMissingItems().filter(i => i.id !== state.item.id)
    setState({ phase: 'choose', file: state.file, missingItems })
  }

  function chooseManually(item: ChecklistItem) {
    if (state.phase !== 'choose' && state.phase !== 'no_match') return
    onConfirm(item, state.file)
    setState({ phase: 'idle' })
  }

  function reset() {
    setState({ phase: 'idle' })
  }

  const buttonBase =
    'flex items-center justify-center gap-2 w-full min-h-[44px] rounded-lg text-sm font-medium active:opacity-80 disabled:opacity-50'

  return (
    <div className="bg-[var(--color-bg-alt,_#fff8e6)] border border-[var(--color-gold)]/40 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-[var(--color-ink)]">{t.smartUploadLabel}</p>
        <p className="text-xs text-[var(--color-ink-soft)] mt-0.5 leading-relaxed">
          {t.smartUploadHint}
        </p>
      </div>

      {state.phase === 'idle' && (
        <div className="grid grid-cols-2 gap-2">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => cameraRef.current?.click()}
            className={`${buttonBase} border border-[var(--color-border)] bg-white text-[var(--color-ink)]`}
          >
            <Camera className="w-4 h-4" />
            {lang === 'vi' ? 'Chup anh' : 'Foto'}
            {/* TODO: VI-review native speaker */}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className={`${buttonBase} bg-[var(--color-gold)] text-white`}
          >
            {lang === 'vi' ? 'Chon file' : 'Datei wählen'}
            {/* TODO: VI-review native speaker */}
          </button>
        </div>
      )}

      {state.phase === 'running' && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-ink-muted)]">
          <span className="inline-block w-4 h-4 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
          {t.smartUploadRunning}
        </div>
      )}

      {state.phase === 'suggestion' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {t.smartUploadSuggestion(
                lang === 'vi' && state.item.labelVi
                  ? state.item.labelVi
                  : state.item.label
              )}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={confirmSuggestion}
              className={`${buttonBase} bg-green-600 text-white`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {t.smartUploadConfirm}
            </button>
            <button
              onClick={rejectSuggestion}
              className={`${buttonBase} border border-[var(--color-border)] bg-white text-[var(--color-ink)]`}
            >
              {t.smartUploadChooseManually}
            </button>
          </div>
        </div>
      )}

      {(state.phase === 'choose' || state.phase === 'no_match') && (
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-ink-soft)]">
            {state.phase === 'no_match' ? t.smartUploadNoMatch : t.smartUploadChooseItem}
          </p>
          <ul className="space-y-1.5">
            {state.missingItems.map(item => {
              const label = lang === 'vi' && item.labelVi ? item.labelVi : item.label
              return (
                <li key={item.id}>
                  <button
                    onClick={() => chooseManually(item)}
                    className="w-full min-h-[44px] flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-white text-sm text-[var(--color-ink)] active:bg-slate-50 text-left"
                  >
                    <span>{label}</span>
                    <ChevronDown className="w-4 h-4 shrink-0 text-[var(--color-ink-muted)] -rotate-90" />
                  </button>
                </li>
              )
            })}
          </ul>
          <button
            onClick={reset}
            className="text-xs text-[var(--color-ink-muted)] underline"
          >
            {lang === 'vi' ? 'Huy bo' : 'Abbrechen'}
            {/* TODO: VI-review native speaker */}
          </button>
        </div>
      )}

      {state.phase === 'needs_render' && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t.smartUploadNeedsRender}</span>
          </div>
          <button onClick={reset} className="text-xs text-[var(--color-ink-muted)] underline">
            {lang === 'vi' ? 'Thu lai' : 'Nochmal versuchen'}
            {/* TODO: VI-review native speaker */}
          </button>
        </div>
      )}

      {state.phase === 'error' && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{state.message}</span>
          </div>
          <button onClick={reset} className="text-xs text-[var(--color-ink-muted)] underline">
            {lang === 'vi' ? 'Thu lai' : 'Nochmal versuchen'}
            {/* TODO: VI-review native speaker */}
          </button>
        </div>
      )}
    </div>
  )
}
