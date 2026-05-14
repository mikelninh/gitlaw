/**
 * DraftVerificationBadge — zeigt Verifikationsstatus aller §-Zitate im
 * generierten Briefentwurf.
 *
 * Verwendung:
 *   <DraftVerificationBadge text={finalBody} />
 *
 * Die Komponente läuft den RAG-Check gegen die lokale Corpus-Datenbank
 * (5.936 deutsche Gesetze). Halluzinierte oder falsch geschriebene
 * Paragraphen werden klar ausgewiesen — bevor der Brief rausgeht.
 */

import { useEffect, useState } from 'react'
import { verifyDraftCitations, type DraftVerification } from './verify'

interface Props {
  text: string
}

type Status = 'idle' | 'loading' | 'done'

export default function DraftVerificationBadge({ text }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<DraftVerification | null>(null)

  useEffect(() => {
    if (!text.trim()) {
      setResult(null)
      setStatus('idle')
      return
    }

    setStatus('loading')
    let cancelled = false

    verifyDraftCitations(text).then(r => {
      if (!cancelled) {
        setResult(r)
        setStatus('done')
      }
    })

    return () => { cancelled = true }
  }, [text])

  if (status === 'idle' || (status === 'done' && result?.total === 0)) return null

  if (status === 'loading') {
    return (
      <div className="mt-3 text-xs text-[var(--color-ink-muted)] italic animate-pulse">
        Paragraphen werden gegen Korpus geprüft …
      </div>
    )
  }

  if (!result) return null

  const { verified, unverified } = result

  return (
    <div className="mt-3 space-y-2">
      {verified.length > 0 && (
        <div className="inline-flex items-center gap-1.5 text-xs bg-green-50 border border-green-200 text-green-800 rounded-lg px-3 py-1.5">
          <span className="font-semibold">{verified.length} {verified.length === 1 ? 'Zitat' : 'Zitate'} verifiziert</span>
          <span className="text-green-700/70">({verified.map(v => v.display).join(', ')})</span>
        </div>
      )}

      {unverified.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2.5 space-y-1.5">
          <p className="text-xs font-semibold text-amber-900">
            {unverified.length} {unverified.length === 1 ? 'Paragraph' : 'Paragraphen'} {unverified.length === 1 ? 'konnte' : 'konnten'} nicht verifiziert werden — bitte vor Versand prüfen.
          </p>
          <ul className="space-y-1">
            {unverified.map((u, i) => (
              <li key={i} className="text-xs text-amber-900">
                <span className="font-medium">{u.display}</span>
                <span className="text-amber-800/80"> — {u.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
