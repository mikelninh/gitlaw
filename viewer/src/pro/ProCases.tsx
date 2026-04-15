/**
 * Mandant:innen-Akten — list + create + detail.
 *
 * Evolved from the MVP: now with search, status tabs, Frist-field,
 * and per-case ZIP bundle export (BHV-tauglich).
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, FolderOpen, Archive, FileText, Search as SearchIcon,
  Shield, Package, Clock, AlertCircle, Share2, Copy, Check,
} from 'lucide-react'
import Fuse from 'fuse.js'
import {
  archiveCase,
  createCase,
  getCase,
  getSettings,
  listAudit,
  listCases,
  listIntakes,
  listLetters,
  listResearch,
  markIntakeReviewed,
  updateCase,
} from './store'
import { exportAuditPDF } from './pdf'
import { exportCaseBundle } from './zip'
import type { MandantCase } from './types'

/** Returns days until the ISO date, negative if past. */
function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function FristPill({ c }: { c: MandantCase }) {
  if (!c.fristDatum) return null
  const days = daysUntil(c.fristDatum)
  const past = days < 0
  const urgent = !past && days <= 7
  const cls = past
    ? 'bg-red-100 text-red-800 border-red-300'
    : urgent
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-slate-100 text-slate-700 border-slate-200'
  const label = past
    ? `Frist vor ${-days}T abgelaufen`
    : days === 0
      ? 'Frist HEUTE'
      : `Frist in ${days}T`
  return (
    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${cls}`}>
      <Clock className="w-3 h-3" /> {label}
    </span>
  )
}

function IntakeShareDialog({
  caseId,
  caseDisplay,
  copied,
  onCopy,
  onClose,
}: {
  caseId: string
  caseDisplay: string
  copied: boolean
  onCopy: (url: string) => void
  onClose: () => void
}) {
  const origin = window.location.origin + window.location.pathname
  const url = `${origin}#/intake/${caseId}`
  const mailSubject = encodeURIComponent(`Fragebogen zu Ihrem Anliegen — ${caseDisplay.split(' · ')[0]}`)
  const mailBody = encodeURIComponent(
    `Sehr geehrte:r Mandant:in,\n\n` +
      `bitte füllen Sie vorab den folgenden Fragebogen aus, damit ich Ihr Anliegen strukturiert aufnehmen kann:\n\n` +
      `${url}\n\n` +
      `Die Übermittlung ist verschlüsselt. Es handelt sich um eine unverbindliche Erstanfrage.\n\n` +
      `Mit freundlichen Grüßen`,
  )
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-[var(--color-border)] max-w-lg w-full p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Mandant:innen-Fragebogen teilen</h2>
        <p className="text-sm text-[var(--color-ink-soft)]">
          Schicke diesen Link per E-Mail, WhatsApp oder zeige ihn auf deinem iPad im Termin.
          Das Formular ist an die Akte <strong>{caseDisplay}</strong> gebunden — Antworten
          landen hier in der Akte.
        </p>
        <div className="bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-lg p-3 flex items-center gap-2">
          <code className="text-xs break-all flex-1 font-mono">{url}</code>
          <button
            onClick={() => onCopy(url)}
            className="shrink-0 inline-flex items-center gap-1 text-xs bg-[var(--color-ink)] text-white rounded px-2 py-1 hover:opacity-90"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Kopiert!' : 'Kopieren'}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
            className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
          >
            Per E-Mail senden
          </a>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            Schließen
          </button>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)] border-t border-[var(--color-border)] pt-3">
          <strong>Hinweis Beta:</strong> Daten liegen derzeit nur lokal im Browser, in dem die
          Akte angelegt wurde. Für echte Remote-Einreichungen benötigt die finale Fassung einen
          Server (geplant: Server-Sync Beta 2). Für Kiosk-Betrieb am iPad im Büro funktioniert
          das Formular bereits jetzt.
        </p>
      </div>
    </div>
  )
}

export function ProCasesList() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [showCreate, setShowCreate] = useState(search.get('new') === '1')
  const [tick, setTick] = useState(0)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'aktiv' | 'archiviert' | 'alle'>('aktiv')

  const cases = useMemo(() => listCases(), [tick, showCreate])

  const filtered = useMemo(() => {
    let list = cases
    if (statusFilter !== 'alle') {
      list = list.filter(c => c.status === statusFilter)
    }
    if (query.trim()) {
      const fuse = new Fuse(list, {
        keys: ['mandantName', 'aktenzeichen', 'description'],
        threshold: 0.35,
      })
      list = fuse.search(query).map(r => r.item)
    }
    return list
  }, [cases, query, statusFilter])

  const counts = {
    aktiv: cases.filter(c => c.status === 'aktiv').length,
    archiviert: cases.filter(c => c.status === 'archiviert').length,
    alle: cases.length,
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Mandant:innen-Akten</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Eine Akte gruppiert Recherchen, Schreiben und ein Audit-Log pro Fall.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(s => !s)}
          className="inline-flex items-center gap-2 bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Neue Akte
        </button>
      </header>

      {showCreate && (
        <CreateForm
          onCreated={c => {
            setShowCreate(false)
            setTick(t => t + 1)
            navigate(`/pro/akten/${c.id}`)
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Search + filter */}
      {cases.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <SearchIcon className="w-4 h-4 text-[var(--color-ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Suche: Mandant:in, Aktenzeichen, Sache…"
              className="w-full border border-[var(--color-border)] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
            />
          </div>
          <div className="flex items-center gap-1 text-xs bg-white border border-[var(--color-border)] rounded-lg p-1">
            {(['aktiv', 'archiviert', 'alle'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 rounded ${
                  statusFilter === s
                    ? 'bg-[var(--color-ink)] text-white'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {s} <span className="opacity-60">({counts[s]})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {cases.length === 0 ? (
        <div className="bg-white border border-dashed border-[var(--color-border)] rounded-2xl p-10 text-center">
          <FolderOpen className="w-8 h-8 text-[var(--color-ink-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-ink-soft)]">
            Noch keine Akte angelegt. Klicke auf <strong>Neue Akte</strong> oben rechts.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 text-center text-sm text-[var(--color-ink-soft)]">
          Keine Akten passen zu Suche/Filter.
        </div>
      ) : (
        <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
          {filtered.map(c => (
            <li key={c.id}>
              <Link
                to={`/pro/akten/${c.id}`}
                className="block px-4 py-3 hover:bg-[var(--color-bg-alt)] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-[var(--color-gold)]">{c.aktenzeichen}</span>
                      <span className="font-semibold truncate">{c.mandantName}</span>
                      {c.status === 'archiviert' && (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          archiviert
                        </span>
                      )}
                      <FristPill c={c} />
                    </div>
                    {c.description && (
                      <p className="text-sm text-[var(--color-ink-soft)] mt-0.5 truncate">{c.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-ink-muted)] shrink-0">
                    {c.researchIds.length} R · {c.letterIds.length} S
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (c: MandantCase) => void
  onCancel: () => void
}) {
  const [mandantName, setMandantName] = useState('')
  const [aktenzeichen, setAktenzeichen] = useState('')
  const [description, setDescription] = useState('')
  const [mandantEmail, setMandantEmail] = useState('')
  const [fristDatum, setFristDatum] = useState('')
  const [fristBezeichnung, setFristBezeichnung] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mandantName.trim() || !aktenzeichen.trim()) return
    const c = createCase({ mandantName, aktenzeichen, description })
    if (fristDatum || mandantEmail) {
      updateCase(c.id, {
        fristDatum: fristDatum || undefined,
        fristBezeichnung: fristBezeichnung || undefined,
        mandantEmail: mandantEmail || undefined,
      })
    }
    onCreated({ ...c, fristDatum, fristBezeichnung, mandantEmail })
  }

  return (
    <form onSubmit={onSubmit} className="bg-white border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold">Neue Akte</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          value={aktenzeichen}
          onChange={e => setAktenzeichen(e.target.value)}
          placeholder="Aktenzeichen (z. B. 25/0142)"
          className="border border-[var(--color-border)] rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-[var(--color-gold)]"
          required
          autoFocus
        />
        <input
          type="text"
          value={mandantName}
          onChange={e => setMandantName(e.target.value)}
          placeholder="Mandant:in (Name oder Pseudonym)"
          className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
          required
        />
      </div>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Sache (kurz) — z. B. „Cyberstalking durch Ex-Partner, vor Strafanzeige"
        rows={2}
        className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="email"
          value={mandantEmail}
          onChange={e => setMandantEmail(e.target.value)}
          placeholder="E-Mail Mandant:in (optional)"
          className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
        />
        <input
          type="date"
          value={fristDatum}
          onChange={e => setFristDatum(e.target.value)}
          placeholder="Frist (Datum)"
          className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
          title="Frist (Datum, optional)"
        />
        <input
          type="text"
          value={fristBezeichnung}
          onChange={e => setFristBezeichnung(e.target.value)}
          placeholder="z. B. Widerspruchsfrist"
          className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 text-sm hover:opacity-90"
        >
          Anlegen
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}

export function ProCaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [exportingZip, setExportingZip] = useState(false)
  const [showIntakeShare, setShowIntakeShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const c = useMemo(() => (id ? getCase(id) : undefined), [id, tick])
  const research = useMemo(() => (id ? listResearch(id) : []), [id, tick])
  const letters = useMemo(() => (id ? listLetters(id) : []), [id, tick])
  const audit = useMemo(() => (id ? listAudit(id) : []), [id, tick])
  const intakes = useMemo(() => (id ? listIntakes({ caseId: id }) : []), [id, tick])

  useEffect(() => { /* re-render trigger placeholder */ }, [tick])

  if (!c) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-2xl p-10 text-center">
        <p className="text-sm text-[var(--color-ink-soft)]">Akte nicht gefunden.</p>
        <Link to="/pro/akten" className="text-sm text-[var(--color-gold)] underline mt-2 inline-block">
          ← Alle Akten
        </Link>
      </div>
    )
  }

  function onArchive() {
    if (!c) return
    if (!confirm(`Akte ${c.aktenzeichen} archivieren?`)) return
    archiveCase(c.id)
    setTick(t => t + 1)
  }

  function onExportAudit() {
    if (!c) return
    exportAuditPDF({ settings: getSettings(), entries: audit, caseInfo: c })
  }

  async function onExportZip() {
    if (!c) return
    setExportingZip(true)
    try {
      await exportCaseBundle({
        settings: getSettings(),
        caseInfo: c,
        research,
        letters,
        audit,
      })
    } catch (err) {
      alert('ZIP-Export fehlgeschlagen: ' + (err instanceof Error ? err.message : 'unbekannt'))
    } finally {
      setExportingZip(false)
    }
  }

  const frist = c.fristDatum ? daysUntil(c.fristDatum) : null

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/pro/akten')}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft className="w-4 h-4" /> Alle Akten
      </button>

      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="font-mono text-sm text-[var(--color-gold)] mb-1">{c.aktenzeichen}</div>
          <h1 className="text-2xl font-semibold">{c.mandantName}</h1>
          {c.description && <p className="text-sm text-[var(--color-ink-soft)] mt-1">{c.description}</p>}
          {c.mandantEmail && (
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">
              <span className="font-mono">{c.mandantEmail}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/pro/recherche?case=${c.id}`}
            className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]"
          >
            <SearchIcon className="w-4 h-4" /> Recherche
          </Link>
          <Link
            to={`/pro/schreiben?case=${c.id}`}
            className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]"
          >
            <FileText className="w-4 h-4" /> Schreiben
          </Link>
          <button
            onClick={() => setShowIntakeShare(true)}
            className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]"
            title="Mandant:innen-Fragebogen teilen (Link oder QR)"
          >
            <Share2 className="w-4 h-4" /> Fragebogen teilen
          </button>
          <button
            onClick={onExportZip}
            disabled={exportingZip}
            className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-gold)] text-white rounded-lg px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
            title="Akte als ZIP (PDFs + Audit-Log + meta.txt)"
          >
            <Package className="w-4 h-4" /> {exportingZip ? 'Baue ZIP…' : 'Akte als ZIP'}
          </button>
          {c.status === 'aktiv' && (
            <button
              onClick={onArchive}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              <Archive className="w-4 h-4" /> Archivieren
            </button>
          )}
        </div>
      </header>

      {/* Intake share dialog */}
      {showIntakeShare && c && (
        <IntakeShareDialog
          caseId={c.id}
          caseDisplay={`${c.aktenzeichen} · ${c.mandantName}`}
          copied={copied}
          onCopy={url => {
            navigator.clipboard.writeText(url).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
          onClose={() => setShowIntakeShare(false)}
        />
      )}

      {/* Frist-Info-Banner */}
      {c.fristDatum && frist !== null && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-2 ${
            frist < 0
              ? 'bg-red-50 border-red-200 text-red-900'
              : frist <= 7
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            {frist < 0
              ? `Frist seit ${-frist} Tagen abgelaufen`
              : frist === 0
                ? 'Frist läuft heute ab'
                : `Frist in ${frist} Tagen`}
            {c.fristBezeichnung && ` — ${c.fristBezeichnung}`}
            <span className="ml-2 font-mono text-xs">
              ({new Date(c.fristDatum).toLocaleDateString('de-DE')})
            </span>
          </span>
        </div>
      )}

      {/* Sachverhalt-Eingänge von Mandant:in */}
      {intakes.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">Mandant:innen-Eingänge ({intakes.length})</h2>
          <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
            {intakes.map(i => (
              <li key={i.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{i.name}</span>
                      {!i.reviewed && (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          neu
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-ink-soft)] mt-1">{i.anliegen}</p>
                    {i.gewuenschterAusgang && (
                      <p className="text-xs text-[var(--color-ink-muted)] mt-1 italic">
                        Gewünscht: {i.gewuenschterAusgang}
                      </p>
                    )}
                    <div className="text-xs text-[var(--color-ink-muted)] mt-2 flex items-center gap-3 flex-wrap">
                      {i.email && <span>✉ {i.email}</span>}
                      {i.phone && <span>☎ {i.phone}</span>}
                      <span>{new Date(i.submittedAt).toLocaleString('de-DE')}</span>
                    </div>
                  </div>
                  {!i.reviewed && (
                    <button
                      onClick={() => {
                        markIntakeReviewed(i.id)
                        setTick(t => t + 1)
                      }}
                      className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                    >
                      Als gelesen markieren
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Recherchen ({research.length})</h2>
        {research.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Noch keine Recherche zu dieser Akte.</p>
        ) : (
          <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
            {research.map(r => (
              <li key={r.id} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium truncate">{r.question}</span>
                  <span className="text-xs text-[var(--color-ink-muted)] shrink-0">
                    {new Date(r.createdAt).toLocaleDateString('de-DE')}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-ink-muted)] mt-1">
                  {r.citations.length} Zitat{r.citations.length === 1 ? '' : 'e'}
                  {r.reviewed ? ' · ✓ geprüft' : ' · ⚠ ungeprüft'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-2">Schreiben ({letters.length})</h2>
        {letters.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Noch keine Schreiben zu dieser Akte.</p>
        ) : (
          <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
            {letters.map(l => (
              <li key={l.id} className="px-4 py-3 text-sm flex items-baseline justify-between gap-3">
                <span className="font-medium truncate">{l.templateTitle}</span>
                <span className="text-xs text-[var(--color-ink-muted)] shrink-0">
                  {new Date(l.createdAt).toLocaleDateString('de-DE')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-semibold">Audit-Log ({audit.length})</h2>
          {audit.length > 0 && (
            <button
              onClick={onExportAudit}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              <Shield className="w-3.5 h-3.5" /> als PDF exportieren
            </button>
          )}
        </div>
        {audit.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Keine Einträge.</p>
        ) : (
          <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
            {audit.slice(0, 20).map(a => (
              <li key={a.id} className="px-4 py-2 text-xs flex items-baseline justify-between gap-3">
                <span className="text-[var(--color-ink-soft)] truncate">
                  <span className="font-mono text-[var(--color-ink-muted)] mr-2">{a.action}</span>
                  {a.detail}
                </span>
                <span className="text-[var(--color-ink-muted)] shrink-0">
                  {new Date(a.at).toLocaleString('de-DE')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
