/**
 * Eingänge — Inbox aller Mandant:innen-Fragebogen-Einsendungen.
 *
 * Lawyer's morning habit: check this first. New intakes → read → convert
 * to full case, or archive.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Mail, Phone, CheckCircle2, ArrowRight } from 'lucide-react'
import { createCase, listIntakes, markIntakeReviewed, saveResearch } from './store'
import type { IntakeEntry } from './types'

export default function ProEingaenge() {
  const [tick, setTick] = useState(0)
  const [showAll, setShowAll] = useState(false)
  const intakes = useMemo(
    () => listIntakes(showAll ? {} : { reviewed: false }),
    [tick, showAll],
  )

  function onMarkReviewed(i: IntakeEntry) {
    markIntakeReviewed(i.id)
    setTick(t => t + 1)
  }

  function onConvertToCase(i: IntakeEntry) {
    const shortAktenzeichen = `IN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${i.id.slice(0, 4)}`
    const c = createCase({
      aktenzeichen: shortAktenzeichen,
      mandantName: i.name,
      description: i.anliegen.slice(0, 120),
    })
    // Persist intake data as first research entry so nothing gets lost
    saveResearch({
      caseId: c.id,
      question: `[Mandant:innen-Eingang] ${i.name}${i.email ? ` — ${i.email}` : ''}${i.phone ? ` — ${i.phone}` : ''}`,
      answer:
        `Anliegen:\n${i.anliegen}\n\n` +
        (i.gewuenschterAusgang ? `Gewünschter Ausgang:\n${i.gewuenschterAusgang}\n\n` : '') +
        (i.dringlichkeit ? `Dringlichkeit: ${i.dringlichkeit}\n` : '') +
        (i.fristBekannt !== undefined ? `Frist bekannt: ${i.fristBekannt ? 'ja' : 'nein'}\n\n` : '') +
        (i.attachments?.length
          ? `Anhänge (intern umbenannt):\n${i.attachments.map(a => `- ${a.internalName} (orig: ${a.originalName}, cat=${a.category || 'sonstiges'}, lang=${a.languageHint || 'de'})`).join('\n')}\n\n`
          : '') +
        `Eingegangen am ${new Date(i.submittedAt).toLocaleString('de-DE')}.`,
      citations: [],
      reviewed: false,
    })
    markIntakeReviewed(i.id)
    setTick(t => t + 1)
    window.location.hash = `#/pro/akten/${c.id}`
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="h-page flex items-center gap-2">
            <Inbox className="w-5 h-5 text-[var(--color-gold)]" />
            Eingänge
          </h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Über Mandant:innen-Fragebögen eingegangene Anfragen. Prüfen, ggf. in eine Akte übernehmen.
          </p>
        </div>
        <label className="text-xs text-[var(--color-ink-muted)] inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={showAll}
            onChange={e => setShowAll(e.target.checked)}
          />
          auch bereits geprüfte anzeigen
        </label>
      </header>

      {intakes.length === 0 ? (
        <div className="bg-white border border-dashed border-[var(--color-border)] rounded-2xl p-10 text-center">
          <Inbox className="w-8 h-8 text-[var(--color-ink-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-ink-soft)] mb-2">
            {showAll
              ? 'Noch keine Mandant:innen-Eingänge.'
              : 'Keine unbearbeiteten Eingänge.'}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Fragebogen-Link auf einer Akten-Detailseite teilen → Mandant:in füllt aus → Eingang landet hier.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {intakes.map(i => (
            <li
              key={i.id}
              className={`bg-white border rounded-2xl p-5 ${
                i.reviewed ? 'border-[var(--color-border)] opacity-75' : 'border-[var(--color-gold)]'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                <div>
                  <h3 className="font-semibold">{i.name}</h3>
                  <div className="text-xs text-[var(--color-ink-muted)] flex items-center gap-3 flex-wrap mt-1">
                    {i.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {i.email}
                      </span>
                    )}
                    {i.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {i.phone}
                      </span>
                    )}
                    <span>
                      eingegangen {new Date(i.submittedAt).toLocaleString('de-DE')}
                    </span>
                    {i.dringlichkeit && (
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {i.dringlichkeit}
                      </span>
                    )}
                    {i.fristBekannt && (
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        Frist bekannt
                      </span>
                    )}
                  </div>
                </div>
                {i.reviewed && (
                  <span className="text-xs text-green-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> geprüft
                  </span>
                )}
              </div>

              <div className="text-sm bg-[var(--color-bg-alt)] rounded-lg p-3 border border-[var(--color-border)] mb-3">
                <div className="font-medium text-xs text-[var(--color-ink-muted)] uppercase mb-1">Anliegen</div>
                <p className="whitespace-pre-wrap">{i.anliegen}</p>
                {i.gewuenschterAusgang && (
                  <>
                    <div className="font-medium text-xs text-[var(--color-ink-muted)] uppercase mb-1 mt-3">Gewünschter Ausgang</div>
                    <p className="whitespace-pre-wrap">{i.gewuenschterAusgang}</p>
                  </>
                )}
                {i.attachments && i.attachments.length > 0 && (
                  <>
                    <div className="font-medium text-xs text-[var(--color-ink-muted)] uppercase mb-1 mt-3">Anhänge</div>
                    <ul className="text-xs space-y-1">
                      {i.attachments.map(a => (
                        <li key={`${i.id}-${a.internalName}`} className="flex items-center justify-between gap-3">
                          <span className="truncate">{a.originalName}</span>
                          <span className="font-mono text-[11px] text-[var(--color-ink-soft)]">
                            {a.internalName} [{a.category || 'sonstiges'}/{a.languageHint || 'de'}]
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {!i.caseId && (
                  <button
                    onClick={() => onConvertToCase(i)}
                    className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
                  >
                    <ArrowRight className="w-4 h-4" /> Als Akte anlegen
                  </button>
                )}
                {i.caseId && (
                  <Link
                    to={`/pro/akten/${i.caseId}`}
                    className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]"
                  >
                    Zur Akte <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {!i.reviewed && (
                  <button
                    onClick={() => onMarkReviewed(i)}
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Ohne Akte abhaken
                  </button>
                )}
                {i.email && (
                  <a
                    href={`mailto:${i.email}?subject=${encodeURIComponent(`Ihre Anfrage — Rückmeldung`)}&body=${encodeURIComponent(`Sehr geehrte:r ${i.name},\n\nvielen Dank für Ihre Anfrage. `)}`}
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    <Mail className="w-4 h-4" /> Rückmelden
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
