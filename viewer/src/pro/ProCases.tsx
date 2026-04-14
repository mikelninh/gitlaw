/**
 * Mandant:innen-Akten — list + create + detail.
 *
 * Kept as a single component file with a tiny inner router based on the
 * URL `:id` param to keep file count manageable in the Pro folder.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, FolderOpen, Archive, FileText, Search, Shield } from 'lucide-react'
import {
  archiveCase,
  createCase,
  getCase,
  getSettings,
  listAudit,
  listCases,
  listLetters,
  listResearch,
} from './store'
import { exportAuditPDF } from './pdf'

export function ProCasesList() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [showCreate, setShowCreate] = useState(search.get('new') === '1')
  const [tick, setTick] = useState(0)
  const cases = useMemo(() => listCases(), [tick, showCreate])

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

      {cases.length === 0 ? (
        <div className="bg-white border border-dashed border-[var(--color-border)] rounded-2xl p-10 text-center">
          <FolderOpen className="w-8 h-8 text-[var(--color-ink-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-ink-soft)]">
            Noch keine Akte angelegt. Klicke auf <strong>Neue Akte</strong> oben rechts.
          </p>
        </div>
      ) : (
        <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
          {cases.map(c => (
            <li key={c.id}>
              <Link
                to={`/pro/akten/${c.id}`}
                className="block px-4 py-3 hover:bg-[var(--color-bg-alt)] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-[var(--color-gold)]">{c.aktenzeichen}</span>
                      <span className="font-semibold truncate">{c.mandantName}</span>
                      {c.status === 'archiviert' && (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          archiviert
                        </span>
                      )}
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
  onCreated: (c: ReturnType<typeof createCase>) => void
  onCancel: () => void
}) {
  const [mandantName, setMandantName] = useState('')
  const [aktenzeichen, setAktenzeichen] = useState('')
  const [description, setDescription] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mandantName.trim() || !aktenzeichen.trim()) return
    const c = createCase({ mandantName, aktenzeichen, description })
    onCreated(c)
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
  const c = useMemo(() => (id ? getCase(id) : undefined), [id, tick])
  const research = useMemo(() => (id ? listResearch(id) : []), [id, tick])
  const letters = useMemo(() => (id ? listLetters(id) : []), [id, tick])
  const audit = useMemo(() => (id ? listAudit(id) : []), [id, tick])

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

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/pro/akten')}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ArrowLeft className="w-4 h-4" /> Alle Akten
      </button>

      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-[var(--color-gold)] mb-1">{c.aktenzeichen}</div>
          <h1 className="text-2xl font-semibold">{c.mandantName}</h1>
          {c.description && <p className="text-sm text-[var(--color-ink-soft)] mt-1">{c.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/pro/recherche?case=${c.id}`}
            className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]"
          >
            <Search className="w-4 h-4" /> Recherche
          </Link>
          <Link
            to={`/pro/schreiben?case=${c.id}`}
            className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]"
          >
            <FileText className="w-4 h-4" /> Schreiben
          </Link>
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
