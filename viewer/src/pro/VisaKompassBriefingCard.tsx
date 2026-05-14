/**
 * Briefing-Karte für visa-kompass-Leads im Eingänge-Inbox.
 *
 * Zeigt das vorqualifizierte AI-Briefing, das visa-kompass.de mit dem Lead
 * mitschickt: Triage, Quiz-Top-Treffer, Doc-Checkliste, VN-spezifische
 * Hinweise, Original + Übersetzung, Antwort-Entwurf.
 *
 * Bao-Aufwand: ~30 Sek scannen → 1 Klick "In Akte umwandeln" → fertig.
 */

import { useState } from 'react'
import { CheckCircle2, ArrowRight, Trash2, FileText, Globe2 } from 'lucide-react'
import {
  type VisaKompassBriefing,
  markVisaKompassBriefingReviewed,
  deleteVisaKompassBriefing,
} from './pro-api'
import { createCase, saveResearch } from './store'

interface Props {
  briefing: VisaKompassBriefing
  onChanged: () => void
}

function complexityBadge(c?: string) {
  if (!c) return null
  const cls =
    c === 'urgent'
      ? 'bg-red-100 text-red-800 border-red-200'
      : c === 'complex'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls} uppercase tracking-wider`}>
      {c}
    </span>
  )
}

export function VisaKompassBriefingCard({ briefing: b, onChanged }: Props) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [working, setWorking] = useState(false)

  async function onConvertToCase() {
    setWorking(true)
    try {
      const aktenzeichen = `VK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${b.id.slice(-4)}`
      const c = createCase({
        aktenzeichen,
        mandantName: b.client.name,
        description:
          b.intake.germanSummary?.slice(0, 200) ??
          b.intake.quizContext?.topVisaName ??
          'Visa-Kompass-Anfrage',
      })
      saveResearch({
        caseId: c.id,
        question: `[Visa-Kompass-Eingang] ${b.client.name}${b.client.email ? ` — ${b.client.email}` : ''}${b.client.phone ? ` — ${b.client.phone}` : ''} (Sprache ${b.client.language.toUpperCase()})`,
        answer: buildResearchSummary(b),
        citations: [],
        reviewed: false,
      })
      await markVisaKompassBriefingReviewed(b.id)
      onChanged()
      window.location.hash = `#/pro/akten/${c.id}`
    } finally {
      setWorking(false)
    }
  }

  async function onMarkReviewed() {
    setWorking(true)
    try {
      await markVisaKompassBriefingReviewed(b.id)
      onChanged()
    } finally {
      setWorking(false)
    }
  }

  async function onDelete() {
    if (!confirm('Diesen Briefing-Eintrag wirklich löschen?')) return
    setWorking(true)
    try {
      await deleteVisaKompassBriefing(b.id)
      onChanged()
    } finally {
      setWorking(false)
    }
  }

  const top = b.intake.quizContext
  const t = b.intake.triage
  const checklist = b.intake.docChecklist ?? []
  const vnNotes = b.intake.vnSpecificNotes ?? []

  return (
    <article className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-4">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-700 mb-1 flex items-center gap-2">
            <Globe2 className="w-3 h-3" /> Visa-Kompass · {b.client.language.toUpperCase()}
          </div>
          <div className="font-medium text-base">{b.client.name}</div>
          <div className="text-xs text-stone-500 mt-0.5">
            {b.client.email && <span>{b.client.email}</span>}
            {b.client.phone && <span> · {b.client.phone}</span>}
            <span> · empfangen {new Date(b.receivedAt).toLocaleString('de-DE')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {complexityBadge(t?.complexity)}
          {b.reviewed && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              gelesen
            </span>
          )}
        </div>
      </header>

      {b.intake.germanSummary && (
        <p className="text-sm leading-relaxed text-stone-800">{b.intake.germanSummary}</p>
      )}

      {(top || t) && (
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {top?.topVisaName && (
            <div className="rounded-lg bg-white border border-emerald-200 p-3">
              <div className="text-xs text-stone-500 uppercase tracking-wider">Quiz-Top</div>
              <div className="font-medium">{top.topVisaName}</div>
              {typeof top.matchScore === 'number' && (
                <div className="text-emerald-700 text-sm mt-0.5">{top.matchScore}/100</div>
              )}
            </div>
          )}
          {t && (
            <div className="rounded-lg bg-white border border-emerald-200 p-3">
              <div className="text-xs text-stone-500 uppercase tracking-wider">Triage</div>
              <div className="text-sm">
                {t.urgencyDays === 0 ? 'sofort' : `~${t.urgencyDays} Tage`}
                {t.suggestedFocusArea && ` · ${t.suggestedFocusArea}`}
              </div>
              {t.suggestedPriceRange && (
                <div className="text-stone-600 text-xs mt-0.5">{t.suggestedPriceRange}</div>
              )}
            </div>
          )}
        </div>
      )}

      {checklist.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-stone-700 hover:text-emerald-700 flex items-center gap-2">
            <FileText className="w-3 h-3" /> Dokumenten-Checkliste ({checklist.length})
          </summary>
          <ul className="mt-2 space-y-1 text-stone-700 pl-5">
            {checklist.map((d, i) => (
              <li key={i}>
                ☐ {d.label}
                {d.detail && <span className="text-stone-500"> — {d.detail}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {vnNotes.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-stone-800">
          <div className="text-xs text-amber-800 uppercase tracking-wider mb-1">
            VN-spezifische Hinweise
          </div>
          <ul className="space-y-1">
            {vnNotes.map((n, i) => (
              <li key={i}>· {n}</li>
            ))}
          </ul>
        </div>
      )}

      {b.intake.replyDraft && (
        <details className="text-sm">
          <summary
            className="cursor-pointer text-stone-700 hover:text-emerald-700"
            onClick={() => setShowReply((v) => !v)}
          >
            Antwort-Entwurf ({b.client.language.toUpperCase()}) — anpassbar
          </summary>
          {showReply && (
            <div className="mt-2 p-3 rounded-lg bg-white border border-stone-200 whitespace-pre-wrap text-stone-700">
              {b.intake.replyDraft}
            </div>
          )}
        </details>
      )}

      {b.intake.originalMessage && b.intake.germanTranslation && (
        <details className="text-sm">
          <summary
            className="cursor-pointer text-stone-700 hover:text-emerald-700"
            onClick={() => setShowOriginal((v) => !v)}
          >
            Original ({b.client.language.toUpperCase()}) + DE-Übersetzung
          </summary>
          {showOriginal && (
            <div className="mt-2 grid md:grid-cols-2 gap-2 text-stone-700">
              <div className="p-3 rounded-lg bg-white border border-stone-200">
                <div className="text-xs text-stone-500 mb-1">Original</div>
                {b.intake.originalMessage}
              </div>
              <div className="p-3 rounded-lg bg-white border border-stone-200">
                <div className="text-xs text-stone-500 mb-1">Übersetzung</div>
                {b.intake.germanTranslation}
              </div>
            </div>
          )}
        </details>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onConvertToCase}
          disabled={working}
          className="inline-flex items-center gap-1.5 text-sm bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-lg disabled:opacity-60"
        >
          In Akte umwandeln <ArrowRight className="w-3.5 h-3.5" />
        </button>
        {!b.reviewed && (
          <button
            type="button"
            onClick={onMarkReviewed}
            disabled={working}
            className="inline-flex items-center gap-1.5 text-sm border border-stone-300 hover:bg-stone-50 px-3.5 py-2 rounded-lg disabled:opacity-60"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Gelesen
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={working}
          className="inline-flex items-center gap-1.5 text-sm text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg ml-auto disabled:opacity-60"
        >
          <Trash2 className="w-3.5 h-3.5" /> Löschen
        </button>
      </div>
    </article>
  )
}

function buildResearchSummary(b: VisaKompassBriefing): string {
  const lines: string[] = []
  if (b.intake.germanSummary) lines.push('== Kurz-Fazit ==', b.intake.germanSummary, '')
  if (b.intake.triage) {
    lines.push('== Triage ==')
    lines.push(`Komplexität: ${b.intake.triage.complexity}`)
    lines.push(
      `Dringlichkeit: ${
        b.intake.triage.urgencyDays === 0 ? 'sofort' : `~${b.intake.triage.urgencyDays} Tage`
      }`,
    )
    if (b.intake.triage.suggestedFocusArea)
      lines.push(`Schwerpunkt: ${b.intake.triage.suggestedFocusArea}`)
    if (b.intake.triage.suggestedPriceRange)
      lines.push(`Preis-Vorschlag: ${b.intake.triage.suggestedPriceRange}`)
    lines.push('')
  }
  if (b.intake.quizContext?.topVisaName) {
    lines.push('== Quiz-Vorbefund ==')
    lines.push(
      `Top: ${b.intake.quizContext.topVisaName} (${b.intake.quizContext.matchScore}/100)`,
    )
    lines.push('')
  }
  if (b.intake.docChecklist?.length) {
    lines.push('== Dokumenten-Checkliste ==')
    for (const d of b.intake.docChecklist) {
      lines.push(`☐ ${d.label}${d.detail ? ` — ${d.detail}` : ''}`)
      if (d.vnSpecificNote) lines.push(`   VN: ${d.vnSpecificNote}`)
    }
    lines.push('')
  }
  if (b.intake.vnSpecificNotes?.length) {
    lines.push('== VN-Stolpersteine ==')
    for (const n of b.intake.vnSpecificNotes) lines.push(`· ${n}`)
    lines.push('')
  }
  if (b.intake.originalMessage) {
    lines.push(`== Original (${b.client.language.toUpperCase()}) ==`, b.intake.originalMessage, '')
  }
  if (b.intake.germanTranslation && b.client.language !== 'de') {
    lines.push('== DE-Übersetzung ==', b.intake.germanTranslation, '')
  }
  if (b.intake.replyDraft) {
    lines.push(`== AI-Antwort-Entwurf (${b.client.language.toUpperCase()}) ==`, b.intake.replyDraft, '')
  }
  lines.push(`Empfangen via visa-kompass am ${new Date(b.receivedAt).toLocaleString('de-DE')}.`)
  return lines.join('\n')
}
