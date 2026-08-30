import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, Download, LockKeyhole, Play, RotateCcw, ShieldCheck, Square, TriangleAlert } from 'lucide-react'

const STORAGE_KEY = 'gitlaw.friday.shadow.metrics.v1'

type WorkflowId = 'changed' | 'missing_docs' | 'timeline' | 'deadline' | 'next_action'

type Row = {
  id: WorkflowId
  label: string
  baselineMinutes: string
  pilotMinutes: string
  reworkMinutes: string
  keep: boolean
}

type Session = {
  schema: 'gitlaw-friday-shadow/1'
  matterRef: string
  notes: string
  rows: Row[]
  updatedAt: string
}

const DEFAULT_ROWS: Row[] = [
  { id: 'changed', label: 'Verstehen, was sich geändert hat', baselineMinutes: '', pilotMinutes: '', reworkMinutes: '', keep: true },
  { id: 'missing_docs', label: 'Fehlende Unterlagen bestimmen', baselineMinutes: '', pilotMinutes: '', reworkMinutes: '', keep: true },
  { id: 'timeline', label: 'Chronologie rekonstruieren', baselineMinutes: '', pilotMinutes: '', reworkMinutes: '', keep: true },
  { id: 'deadline', label: 'Datum/Fristkandidat prüfen', baselineMinutes: '', pilotMinutes: '', reworkMinutes: '', keep: true },
  { id: 'next_action', label: 'Nächsten Arbeitsschritt vorbereiten', baselineMinutes: '', pilotMinutes: '', reworkMinutes: '', keep: true },
]

function blankSession(): Session {
  return {
    schema: 'gitlaw-friday-shadow/1',
    matterRef: 'matter-shadow-01',
    notes: '',
    rows: DEFAULT_ROWS.map(row => ({ ...row })),
    updatedAt: new Date().toISOString(),
  }
}

function loadSession(): Session {
  if (typeof window === 'undefined') return blankSession()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return blankSession()
    const parsed = JSON.parse(raw) as Session
    if (parsed?.schema !== 'gitlaw-friday-shadow/1' || !Array.isArray(parsed.rows)) return blankSession()
    return parsed
  } catch {
    return blankSession()
  }
}

function n(value: string): number {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export default function FridayPilotConsole() {
  const [session, setSession] = useState<Session>(() => loadSession())
  const [timer, setTimer] = useState<{ id: WorkflowId; startedAt: number } | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const next = { ...session, updatedAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [session])

  useEffect(() => {
    if (!timer) return
    const tick = () => setElapsed(Date.now() - timer.startedAt)
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [timer])

  const totals = useMemo(() => {
    const baseline = session.rows.reduce((sum, row) => sum + n(row.baselineMinutes), 0)
    const pilot = session.rows.reduce((sum, row) => sum + n(row.pilotMinutes), 0)
    const rework = session.rows.reduce((sum, row) => sum + n(row.reworkMinutes), 0)
    return { baseline, pilot, rework, returned: Math.max(0, baseline - pilot - rework) }
  }, [session.rows])

  function updateRow(id: WorkflowId, patch: Partial<Row>) {
    setSession(current => ({ ...current, rows: current.rows.map(row => row.id === id ? { ...row, ...patch } : row) }))
  }

  function startTimer(id: WorkflowId) {
    setElapsed(0)
    setTimer({ id, startedAt: Date.now() })
  }

  function stopTimer() {
    if (!timer) return
    const minutes = Math.max(0.01, elapsed / 60_000)
    updateRow(timer.id, { pilotMinutes: minutes.toFixed(2) })
    setTimer(null)
    setElapsed(0)
  }

  function reset() {
    if (!confirm('Friday-Pilot-Messung in diesem Browser zurücksetzen?')) return
    localStorage.removeItem(STORAGE_KEY)
    setTimer(null)
    setElapsed(0)
    setSession(blankSession())
  }

  function exportLocal() {
    const payload = JSON.stringify({ ...session, totals, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gitlaw-friday-shadow-${session.matterRef || 'session'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[.18em] font-bold text-emerald-800">Friday Pilot Console · P1 Shadow</p>
            <h1 className="text-3xl font-semibold mt-2">Erste echte Zeitersparnis messen — ohne externen KI-Egress.</h1>
            <p className="text-sm text-emerald-950/75 mt-2 max-w-3xl leading-relaxed">
              Diese Seite arbeitet nur im Browser. Keine Provider-Aufrufe, keine Außenkommunikation, keine beA-Einreichung und keine automatische Fristbestätigung. Verwende hier nur eine pseudonyme Aktenreferenz, keinen Mandantennamen.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-bold text-emerald-800">
            <LockKeyhole className="w-3.5 h-3.5" /> LOCAL ONLY
          </span>
        </div>
      </section>

      <section className="grid md:grid-cols-4 gap-3">
        <Gate title="Externes AI" value="BLOCK" />
        <Gate title="Nachrichten senden" value="BLOCK" />
        <Gate title="beA / Behörde" value="BLOCK" />
        <Gate title="Frist bestätigen" value="BAO" />
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6">
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <label className="block">
            <span className="text-xs font-semibold text-[var(--color-ink-muted)]">Pseudonyme Matter-Referenz</span>
            <input
              value={session.matterRef}
              onChange={e => setSession(current => ({ ...current, matterRef: e.target.value.replace(/[^A-Za-z0-9._-]/g, '') }))}
              placeholder="matter-shadow-01"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2"
            />
          </label>
          <div className="flex gap-2">
            <a href="#/pro/privacy" className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold hover:border-[var(--color-gold)]">Privacy Proof</a>
            <a href="#/pro/import" className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-semibold hover:border-[var(--color-gold)]">CSV / Import</a>
            <a href="#/pro/autopilot" className="rounded-lg bg-[var(--color-ink)] text-white px-3 py-2 text-sm font-semibold">Bao Today</a>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 flex gap-2">
          <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
          Realer Fall am Freitag: keine Namen, E-Mail-Adressen, IBANs oder Freitext-Mandatsgeheimnisse in dieses Messfeld schreiben. Dokument-/Aktenarbeit bleibt in den dafür freigegebenen lokalen bzw. Kanzlei-Systemen.
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
        <div className="p-5 md:p-6 border-b border-[var(--color-border)]">
          <p className="text-xs uppercase tracking-[.16em] font-bold text-[var(--color-gold)]">Messung</p>
          <h2 className="text-2xl font-semibold mt-1">Vorher → Pilot → bestätigte Minuten zurück</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-alt)] text-left text-[var(--color-ink-muted)]">
              <tr>
                <th className="px-4 py-3 min-w-[280px]">Workflow</th>
                <th className="px-3 py-3">Vorher min</th>
                <th className="px-3 py-3">Pilot min</th>
                <th className="px-3 py-3">Rework min</th>
                <th className="px-3 py-3">Timer</th>
                <th className="px-3 py-3">Behalten</th>
              </tr>
            </thead>
            <tbody>
              {session.rows.map(row => {
                const active = timer?.id === row.id
                return (
                  <tr key={row.id} className="border-t border-[var(--color-border)]">
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-3 py-3"><NumberInput value={row.baselineMinutes} onChange={value => updateRow(row.id, { baselineMinutes: value })} /></td>
                    <td className="px-3 py-3"><NumberInput value={row.pilotMinutes} onChange={value => updateRow(row.id, { pilotMinutes: value })} /></td>
                    <td className="px-3 py-3"><NumberInput value={row.reworkMinutes} onChange={value => updateRow(row.id, { reworkMinutes: value })} /></td>
                    <td className="px-3 py-3">
                      {active ? (
                        <button onClick={stopTimer} className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 text-red-800 px-2.5 py-1.5 font-semibold">
                          <Square className="w-3 h-3" /> {(elapsed / 1000).toFixed(1)}s
                        </button>
                      ) : (
                        <button disabled={Boolean(timer)} onClick={() => startTimer(row.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 font-semibold disabled:opacity-40">
                          <Play className="w-3 h-3" /> Start
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center"><input type="checkbox" checked={row.keep} onChange={e => updateRow(row.id, { keep: e.target.checked })} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid sm:grid-cols-4 gap-3">
        <Metric label="Normal vorher" value={`${totals.baseline.toFixed(1)} min`} />
        <Metric label="Pilot aktiv" value={`${totals.pilot.toFixed(1)} min`} />
        <Metric label="Rework" value={`${totals.rework.toFixed(1)} min`} />
        <Metric label="Bestätigt zurück" value={`${totals.returned.toFixed(1)} min`} strong />
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6">
        <label className="block">
          <span className="text-sm font-semibold">Bao-Feedback / Beobachtung</span>
          <textarea
            value={session.notes}
            onChange={e => setSession(current => ({ ...current, notes: e.target.value }))}
            rows={4}
            placeholder="Nur Prozessfeedback. Keine vertraulichen Mandatsinhalte."
            className="mt-2 w-full rounded-lg border border-[var(--color-border)] px-3 py-2"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={exportLocal} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-ink)] text-white px-4 py-2 text-sm font-semibold"><Download className="w-4 h-4" /> Messung lokal exportieren</button>
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"><RotateCcw className="w-4 h-4" /> Session zurücksetzen</button>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-950">Friday GO criterion</p>
            <p className="text-sm text-blue-900/80 mt-1">Mindestens ein echter wiederkehrender Workflow ist messbar schneller, Bao korrigiert keine gefährliche Automatisierung, und alle Vertraulichkeits-/Authority-Invarianten bleiben bei 0 Verletzungen.</p>
            <a href="#/pro/privacy" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-900 underline">Danach Safety Gauntlet zeigen <ArrowRight className="w-3.5 h-3.5" /></a>
          </div>
        </div>
      </section>
    </div>
  )
}

function NumberInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input inputMode="decimal" value={value} onChange={e => onChange(e.target.value.replace(/[^0-9.,]/g, ''))} className="w-20 rounded border border-[var(--color-border)] px-2 py-1.5" placeholder="0" />
}

function Gate({ title, value }: { title: string; value: string }) {
  const good = value === 'BLOCK'
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> {title}</div>
      <div className={`mt-2 font-bold ${good ? 'text-emerald-800' : 'text-amber-800'}`}>{value}</div>
    </div>
  )
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${strong ? 'border-emerald-300 bg-emerald-50' : 'border-[var(--color-border)] bg-white'}`}>
      <div className="text-xs text-[var(--color-ink-muted)] flex items-center gap-1"><Clock3 className="w-3.5 h-3.5" /> {label}</div>
      <div className={`text-xl font-semibold mt-1 ${strong ? 'text-emerald-900' : ''}`}>{value}</div>
    </div>
  )
}
