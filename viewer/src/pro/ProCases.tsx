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
  addCaseDocument,
  archiveCase,
  addCaseTask,
  createCase,
  getCase,
  getSettings,
  listAudit,
  listCases,
  listIntakes,
  listLetters,
  listResearch,
  markDocumentTranslationReviewed,
  markIntakeReviewed,
  queueDocumentJob,
  runDocumentJob,
  toggleCaseTask,
  updateCase,
} from './store'
import { exportAuditPDF } from './pdf'
import { exportCaseBundle } from './zip'
import { berechneFristAusPreset, FRIST_PRESETS, presetToBezeichnung } from './frist-calc'
import QrCard from './QrCard'
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
    ? 'bg-amber-100 text-amber-900 border-amber-300'
    : urgent
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-slate-100 text-slate-700 border-slate-200'
  const label = past
    ? `Frist überschritten (${ -days }T)`
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

        {/* QR-Code für iPad-zu-Handy-Übergabe im Mandant:innen-Termin */}
        <div className="bg-gradient-to-br from-[var(--color-bg-alt)] to-white border border-[var(--color-border)] rounded-2xl p-5 flex flex-wrap items-center gap-5">
          <QrCard
            url={url}
            size={140}
            caption={`Fragebogen — ${caseDisplay.split(' · ')[1] || ''}`}
          />
          <div className="text-sm text-[var(--color-ink-soft)] flex-1 min-w-[200px]">
            <p className="font-semibold text-[var(--color-ink)] mb-2">📱 Im Termin nutzen:</p>
            <ol className="space-y-1.5 text-sm list-decimal list-inside">
              <li>QR-Code zeigen <span className="text-[var(--color-ink-muted)]">(klicken für Vollbild)</span></li>
              <li>Mandant:in scannt mit Handy-Kamera</li>
              <li>Formular öffnet sich, wird ausgefüllt</li>
              <li>Antwort erscheint in dieser Akte</li>
            </ol>
          </div>
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
          <h1 className="h-page">Mandant:innen-Akten</h1>
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
  // Frist-Calculator state
  const [bescheidDatum, setBescheidDatum] = useState('')
  const [presetId, setPresetId] = useState<string>('')
  const [calcResult, setCalcResult] = useState<ReturnType<typeof berechneFristAusPreset> | null>(null)

  function onCalcFrist() {
    if (!bescheidDatum || !presetId) return
    const r = berechneFristAusPreset(bescheidDatum, presetId as Parameters<typeof berechneFristAusPreset>[1])
    setCalcResult(r)
    if (r) {
      setFristDatum(r.enddatum)
      setFristBezeichnung(presetToBezeichnung(presetId as Parameters<typeof presetToBezeichnung>[0]))
    }
  }

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

      {/* Frist-Calculator */}
      <details className="bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-lg">
        <summary className="text-sm font-medium cursor-pointer px-3 py-2 hover:bg-white">
          Frist berechnen aus Bescheid-/Zustellungsdatum
        </summary>
        <div className="p-3 space-y-2 border-t border-[var(--color-border)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="date"
              value={bescheidDatum}
              onChange={e => setBescheidDatum(e.target.value)}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
              title="Datum der Zustellung des Bescheids / Beginn-Ereignis"
            />
            <select
              value={presetId}
              onChange={e => setPresetId(e.target.value)}
              className="md:col-span-2 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
            >
              <option value="">— Frist-Typ wählen —</option>
              {FRIST_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onCalcFrist}
            disabled={!bescheidDatum || !presetId}
            className="text-xs bg-[var(--color-ink)] text-white rounded px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
          >
            Frist berechnen & übernehmen
          </button>
          {calcResult && (
            <div
              className={`text-xs rounded p-2 ${
                calcResult.istWochenende
                  ? 'bg-amber-50 border border-amber-200 text-amber-900'
                  : 'bg-green-50 border border-green-200 text-green-900'
              }`}
            >
              <strong>Endtag: {new Date(calcResult.enddatum).toLocaleDateString('de-DE')} ({calcResult.wochentag})</strong>
              <p className="mt-1 text-[var(--color-ink-soft)]">{calcResult.hinweis}</p>
            </div>
          )}
        </div>
      </details>
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
  const [confirmingArchive, setConfirmingArchive] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [docCategory, setDocCategory] = useState<'foto' | 'bescheid' | 'vertrag' | 'chat' | 'sonstiges'>('sonstiges')
  const [docLanguage, setDocLanguage] = useState<'de' | 'vi' | 'en' | 'tr' | 'ar' | 'other'>('de')
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
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
    archiveCase(c.id)
    setConfirmingArchive(false)
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
      alert('ZIP-Export abgebrochen — PDF-Generator meldet: ' + (err instanceof Error ? err.message : 'keine Meldung zurückgegeben'))
    } finally {
      setExportingZip(false)
    }
  }

  const frist = c.fristDatum ? daysUntil(c.fristDatum) : null
  const selectedDocument = (c.documents || []).find(d => d.id === selectedDocumentId) || (c.documents || [])[0] || null

  function slugPart(input: string): string {
    return input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'doc'
  }

  async function onUploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !c) return
    const internalName = `case_${c.aktenzeichen.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()}_${Date.now().toString(36)}_${slugPart(file.name)}`
    const textContent = file.type.startsWith('text/') ? await file.text() : undefined
    const dataUrl = await new Promise<string | undefined>(resolve => {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return resolve(undefined)
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(undefined)
      reader.readAsDataURL(file)
    })
    addCaseDocument(c.id, {
      originalName: file.name,
      internalName,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      category: docCategory,
      languageHint: docLanguage,
      uploadedBy: getSettings().anwaltName || undefined,
      dataUrl,
      textContent,
    })
    setTick(t => t + 1)
    e.target.value = ''
  }

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
          <h1 className="h-page">{c.mandantName}</h1>
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
            className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
            title="Akte als ZIP (PDFs + Audit-Log + meta.txt)"
          >
            <Package className="w-4 h-4" /> {exportingZip ? 'Baue ZIP…' : 'Akte als ZIP'}
          </button>
          {c.status === 'aktiv' && (
            confirmingArchive ? (
              <span className="inline-flex items-center gap-2 text-sm bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 animate-fade-slide-up">
                <span className="text-amber-900">Wirklich archivieren?</span>
                <button
                  onClick={onArchive}
                  className="text-[var(--color-danger)] font-medium hover:underline"
                >
                  Ja
                </button>
                <button
                  onClick={() => setConfirmingArchive(false)}
                  className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  Abbrechen
                </button>
              </span>
            ) : (
              <button
                onClick={() => {
                  setConfirmingArchive(true)
                  setTimeout(() => setConfirmingArchive(false), 5000)
                }}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                <Archive className="w-4 h-4" /> Archivieren
              </button>
            )
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
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : frist <= 7
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            {frist < 0
              ? `Achtung: Frist seit ${-frist} Tagen überschritten`
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
                      {i.dringlichkeit && (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {i.dringlichkeit}
                        </span>
                      )}
                      {i.fristBekannt && (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          Frist bekannt
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
                    {i.attachments && i.attachments.length > 0 && (
                      <ul className="mt-2 text-xs space-y-1">
                        {i.attachments.map(a => (
                          <li key={`${i.id}-${a.internalName}`} className="flex items-center justify-between gap-2">
                            <span className="truncate">{a.originalName}</span>
                            <span className="font-mono text-[11px] text-[var(--color-ink-soft)]">
                              {a.internalName} [{a.category || 'sonstiges'}/{a.languageHint || 'de'}]
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
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
        <h2 className="font-semibold mb-2">Dokumente ({c.documents?.length || 0})</h2>
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <select
              value={docCategory}
              onChange={e => setDocCategory(e.target.value as typeof docCategory)}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm"
            >
              <option value="sonstiges">Kategorie: Sonstiges</option>
              <option value="foto">Kategorie: Foto</option>
              <option value="bescheid">Kategorie: Bescheid</option>
              <option value="vertrag">Kategorie: Vertrag</option>
              <option value="chat">Kategorie: Chat</option>
            </select>
            <select
              value={docLanguage}
              onChange={e => setDocLanguage(e.target.value as typeof docLanguage)}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm"
            >
              <option value="de">Sprache: Deutsch</option>
              <option value="vi">Sprache: Vietnamesisch</option>
              <option value="en">Sprache: Englisch</option>
              <option value="tr">Sprache: Türkisch</option>
              <option value="ar">Sprache: Arabisch</option>
              <option value="other">Sprache: Andere</option>
            </select>
            <label className="inline-flex items-center gap-2 bg-[var(--color-ink)] text-white rounded-lg px-3 py-2 cursor-pointer hover:opacity-90 text-sm">
              <Plus className="w-4 h-4" /> Dokument hochladen
              <input type="file" onChange={onUploadDocument} className="hidden" />
            </label>
          </div>

          {!c.documents || c.documents.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">Noch keine lokalen Beta-Dokumente in dieser Akte.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
              <ul className="border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
                {c.documents.map(d => (
                  <li key={d.id}>
                    <button
                      onClick={() => setSelectedDocumentId(d.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-[var(--color-bg-alt)] ${selectedDocument?.id === d.id ? 'bg-[var(--color-bg-alt)]' : ''}`}
                    >
                      <div className="font-mono text-xs text-[var(--color-gold)] truncate">{d.internalName}</div>
                      <div className="text-sm truncate">{d.originalName}</div>
                      <div className="text-[11px] text-[var(--color-ink-muted)] mt-1">
                        {d.category || 'sonstiges'} · {d.languageHint || 'de'}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {selectedDocument && (
                <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-3">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-mono text-xs text-[var(--color-gold)]">{selectedDocument.internalName}</div>
                      <h3 className="font-semibold">{selectedDocument.originalName}</h3>
                    </div>
                    <div className="text-xs text-[var(--color-ink-muted)]">
                      {Math.round(selectedDocument.sizeBytes / 1024)} KB
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap text-xs">
                    <button
                      onClick={() => {
                        const job = queueDocumentJob(c.id, {
                          documentId: selectedDocument.id,
                          attachmentInternalName: selectedDocument.internalName,
                          type: 'ocr',
                          sourceLanguage: selectedDocument.languageHint,
                          note: 'Local beta OCR',
                        })
                        if (job) runDocumentJob(c.id, job.id)
                        setTick(t => t + 1)
                      }}
                      className="rounded-lg border border-[var(--color-border)] px-2 py-1 hover:border-[var(--color-gold)]"
                    >
                      OCR starten
                    </button>
                    {selectedDocument.languageHint && selectedDocument.languageHint !== 'de' && (
                      <button
                        onClick={() => {
                          const job = queueDocumentJob(c.id, {
                            documentId: selectedDocument.id,
                            attachmentInternalName: selectedDocument.internalName,
                            type: 'translate',
                            sourceLanguage: selectedDocument.languageHint,
                            targetLanguage: 'de',
                            note: 'Local beta translation',
                          })
                          if (job) runDocumentJob(c.id, job.id)
                          setTick(t => t + 1)
                        }}
                        className="rounded-lg border border-[var(--color-border)] px-2 py-1 hover:border-[var(--color-gold)]"
                      >
                        Uebersetzung DE erzeugen
                      </button>
                    )}
                    {selectedDocument.translatedTextDe && !selectedDocument.translationReviewed && (
                      <button
                        onClick={() => {
                          markDocumentTranslationReviewed(c.id, selectedDocument.id)
                          setTick(t => t + 1)
                        }}
                        className="rounded-lg border border-green-300 bg-green-50 px-2 py-1 text-green-800"
                      >
                        DE-Fassung freigeben
                      </button>
                    )}
                  </div>

                  {selectedDocument.dataUrl && selectedDocument.mimeType.startsWith('image/') && (
                    <img
                      src={selectedDocument.dataUrl}
                      alt={selectedDocument.originalName}
                      className="max-h-64 rounded border border-[var(--color-border)] object-contain bg-white"
                    />
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[var(--color-border)] p-3">
                      <div className="text-xs uppercase text-[var(--color-ink-muted)] mb-2">OCR / Text</div>
                      <div className="text-sm whitespace-pre-wrap text-[var(--color-ink-soft)]">
                        {selectedDocument.ocrText || selectedDocument.textContent || 'Noch kein OCR/Text vorhanden.'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--color-border)] p-3">
                      <div className="text-xs uppercase text-[var(--color-ink-muted)] mb-2">
                        DE-Arbeitsfassung {selectedDocument.translationReviewed ? '· freigegeben' : '· ungeprueft'}
                      </div>
                      <div className="text-sm whitespace-pre-wrap text-[var(--color-ink-soft)]">
                        {selectedDocument.translatedTextDe || 'Noch keine DE-Fassung erzeugt.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Dokument-Chronologie</h2>
        {intakes.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Noch keine dokumentierten Eingänge.</p>
        ) : (
          <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
            {intakes.flatMap(i => (i.attachments || []).map(a => ({ i, a })))
              .sort((x, y) => y.i.submittedAt.localeCompare(x.i.submittedAt))
              .map(({ i, a }) => (
                <li key={`${i.id}-${a.internalName}`} className="px-4 py-2 text-xs flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="truncate block">
                      <span className="font-mono mr-2">{a.internalName}</span>
                      von {i.name} · {a.category || 'sonstiges'} · {a.languageHint || 'de'}
                    </span>
                    {c.documentJobs && c.documentJobs.filter(j => j.attachmentInternalName === a.internalName).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.documentJobs
                          .filter(j => j.attachmentInternalName === a.internalName)
                          .map(job => (
                            <span
                              key={job.id}
                              className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] uppercase text-slate-700"
                            >
                              {job.type} · {job.status}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[var(--color-ink-muted)] block">
                      {new Date(i.submittedAt).toLocaleString('de-DE')}
                    </span>
                    <div className="mt-1 flex gap-1 justify-end">
                      <button
                        onClick={() => {
                          if (!c) return
                          queueDocumentJob(c.id, {
                            attachmentInternalName: a.internalName,
                            type: 'ocr',
                            sourceLanguage: a.languageHint,
                            note: 'Beta queue',
                          })
                          setTick(t => t + 1)
                        }}
                        className="rounded border border-[var(--color-border)] px-1.5 py-0.5 hover:border-[var(--color-gold)]"
                      >
                        OCR
                      </button>
                      {a.languageHint && a.languageHint !== 'de' && (
                        <button
                          onClick={() => {
                            if (!c) return
                            queueDocumentJob(c.id, {
                              attachmentInternalName: a.internalName,
                              type: 'translate',
                              sourceLanguage: a.languageHint,
                              targetLanguage: 'de',
                              note: 'Maschinelle Uebersetzung vorbereiten',
                            })
                            setTick(t => t + 1)
                          }}
                          className="rounded border border-[var(--color-border)] px-1.5 py-0.5 hover:border-[var(--color-gold)]"
                        >
                          VI/EN/TR/AR → DE
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
          <h2 className="font-semibold">Team-Aufgaben ({c.tasks?.length || 0})</h2>
        </div>
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              placeholder="Neue Aufgabe, z. B. Bescheid nachfordern"
              className="flex-1 min-w-[220px] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
            />
            <input
              type="text"
              value={newTaskAssignee}
              onChange={e => setNewTaskAssignee(e.target.value)}
              placeholder="Zuständig (optional)"
              className="w-48 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
            />
            <button
              onClick={() => {
                if (!c || !newTaskTitle.trim()) return
                addCaseTask(c.id, { title: newTaskTitle.trim(), assignee: newTaskAssignee.trim() || undefined })
                setNewTaskTitle('')
                setNewTaskAssignee('')
                setTick(t => t + 1)
              }}
              className="text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-2 hover:opacity-90"
            >
              Aufgabe anlegen
            </button>
          </div>
          {!c.tasks || c.tasks.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted)]">Noch keine Team-Aufgaben für diese Akte.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {c.tasks.map(task => (
                <li key={task.id} className="py-2 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => {
                        toggleCaseTask(c.id, task.id)
                        setTick(t => t + 1)
                      }}
                    />
                    <span className={`text-sm ${task.done ? 'line-through text-[var(--color-ink-muted)]' : ''}`}>
                      {task.title}
                    </span>
                  </label>
                  <span className="text-xs text-[var(--color-ink-muted)] shrink-0">
                    {task.assignee || 'offen'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Recherchen ({research.length})</h2>
        {research.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Noch keine Recherche zu dieser Akte.</p>
        ) : (
          <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
            {research.map(r => (
              <li key={r.id}>
                <Link
                  to={`/pro/recherche?case=${c.id}&ref=${r.id}`}
                  className="block px-4 py-3 text-sm hover:bg-[var(--color-bg-alt)] transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium truncate">{r.question}</span>
                    <span className="text-xs text-[var(--color-ink-muted)] shrink-0">
                      {new Date(r.createdAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-ink-muted)] mt-1">
                    {r.citations.length} Zitat{r.citations.length === 1 ? '' : 'e'}
                    {r.reviewed ? ' · ✓ geprüft' : ' · ⚠ ungeprüft'}
                    <span className="ml-2 text-[var(--color-gold)]">Öffnen →</span>
                  </div>
                </Link>
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
              <li key={l.id}>
                <Link
                  to={`/pro/schreiben?case=${c.id}&ref=${l.id}`}
                  className="flex items-baseline justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--color-bg-alt)] transition-colors"
                >
                  <span className="font-medium truncate">{l.templateTitle}</span>
                  <span className="text-xs text-[var(--color-ink-muted)] shrink-0">
                    {new Date(l.createdAt).toLocaleDateString('de-DE')}
                  </span>
                </Link>
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
