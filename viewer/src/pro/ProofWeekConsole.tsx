import { useMemo, useState } from 'react'
import { CheckCircle2, Download, Euro, ShieldCheck, TriangleAlert } from 'lucide-react'

const STORAGE_KEY = 'gitlaw.proofweek.evidence.v1'

type PriceFeel = 'not_asked' | 'easy' | 'fair' | 'high' | 'no'

type Evidence = {
  customerRef: string
  workflow: string
  observedRuns: string
  matters: string
  documents: string
  followups: string
  baselineMinutes: string
  pilotMinutes: string
  correctionMinutes: string
  automatedPreparations: string
  humanAttentionItems: string
  correctionEvents: string
  authorityViolations: string
  criticalMisses: string
  wrongMatterEvents: string
  nextWorkflow: string
  obviousYesAt: string
  price500: PriceFeel
  price1000: PriceFeel
  price2000: PriceFeel
  price3000: PriceFeel
  feedback: string
}

const EMPTY: Evidence = {
  customerRef: 'kanzlei-001',
  workflow: 'migration/document-readiness',
  observedRuns: '', matters: '', documents: '', followups: '',
  baselineMinutes: '', pilotMinutes: '', correctionMinutes: '',
  automatedPreparations: '', humanAttentionItems: '', correctionEvents: '',
  authorityViolations: '0', criticalMisses: '0', wrongMatterEvents: '0',
  nextWorkflow: 'migration/missing-document-followup', obviousYesAt: '',
  price500: 'not_asked', price1000: 'not_asked', price2000: 'not_asked', price3000: 'not_asked',
  feedback: '',
}

function load(): Evidence {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch { return EMPTY }
}

function n(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function pct(value: number | null) {
  return value == null ? '—' : `${(value * 100).toFixed(1)}%`
}

export default function ProofWeekConsole() {
  const [evidence, setEvidence] = useState<Evidence>(() => load())
  const report = useMemo(() => {
    const observedRuns = n(evidence.observedRuns)
    const baseline = n(evidence.baselineMinutes)
    const pilot = n(evidence.pilotMinutes)
    const correction = n(evidence.correctionMinutes)
    const returned = Math.max(0, baseline - pilot - correction)
    const authorityViolations = n(evidence.authorityViolations)
    const criticalMisses = n(evidence.criticalMisses)
    const wrongMatterEvents = n(evidence.wrongMatterEvents)
    const automationRate = observedRuns > 0 ? Math.min(1, n(evidence.automatedPreparations) / observedRuns) : null
    const attentionRate = observedRuns > 0 ? Math.min(1, n(evidence.humanAttentionItems) / observedRuns) : null
    const correctionRate = observedRuns > 0 ? Math.min(1, n(evidence.correctionEvents) / observedRuns) : null
    const complete = baseline > 0 && observedRuns > 0
    const keep = complete && returned > 0 && authorityViolations === 0 && criticalMisses === 0 && wrongMatterEvents === 0
    return {
      schema: 'kanzlei-proof-week-report/1',
      generatedAt: new Date().toISOString(),
      customerRef: evidence.customerRef,
      workflowPackId: evidence.workflow,
      evidenceQuality: complete ? 'observed' : 'incomplete',
      offer: { priceEurNet: 990, durationDays: 7, automaticSubscription: false },
      observed: {
        runs: observedRuns, matters: n(evidence.matters), documents: n(evidence.documents), followupsPrepared: n(evidence.followups),
        automatedPreparations: n(evidence.automatedPreparations), humanAttentionItems: n(evidence.humanAttentionItems), correctionEvents: n(evidence.correctionEvents),
      },
      time: { baselineMinutes: baseline, pilotMinutes: pilot, correctionMinutes: correction, confirmedMinutesReturned: returned, confirmedHoursReturned: returned / 60 },
      rates: { automationRate, humanAttentionRate: attentionRate, correctionRate },
      safety: { authorityViolations, criticalMisses, wrongMatterEvents },
      willingnessToPay: {
        obviousYesAtEurMonthly: n(evidence.obviousYesAt) || null,
        priceFeel: { 500: evidence.price500, 1000: evidence.price1000, 2000: evidence.price2000, 3000: evidence.price3000 },
      },
      recommendation: { status: keep ? 'KEEP_CANDIDATE' : 'STOP_OR_ITERATE', nextWorkflow: evidence.nextWorkflow || null },
      feedback: evidence.feedback,
      truthBoundary: { syntheticOrEstimatedSavingsPublishedAsCustomerRoi: false },
    }
  }, [evidence])

  function patch<K extends keyof Evidence>(key: K, value: Evidence[K]) {
    setEvidence(current => {
      const next = { ...current, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function download(kind: 'json' | 'md') {
    const body = kind === 'json' ? JSON.stringify(report, null, 2) : toMarkdown(report)
    const blob = new Blob([body], { type: kind === 'json' ? 'application/json' : 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kanzlei-proof-week-${evidence.customerRef || 'customer'}.${kind}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 md:p-6">
        <p className="text-xs uppercase tracking-[.18em] font-bold text-emerald-800">Kanzlei Autopilot · Proof Week</p>
        <h1 className="text-3xl font-semibold mt-2">Aus einem Pilot wird ein beweisbarer Kaufgrund.</h1>
        <p className="mt-2 text-sm text-emerald-950/75 max-w-3xl">€990 netto · 7 Tage · keine automatische Verlängerung. Hier werden nur beobachtete Prozessmetriken und Preisfeedback lokal im Browser erfasst. Keine Mandatsinhalte eintragen.</p>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6 grid md:grid-cols-2 gap-4">
        <Field label="Pseudonyme Kanzlei-Referenz" value={evidence.customerRef} onChange={v => patch('customerRef', v.replace(/[^A-Za-z0-9._-]/g, ''))} />
        <Field label="Workflow Pack" value={evidence.workflow} onChange={v => patch('workflow', v)} />
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6">
        <h2 className="text-xl font-semibold">Beobachtete Arbeit</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <NumberField label="Runs" value={evidence.observedRuns} onChange={v => patch('observedRuns', v)} />
          <NumberField label="Mandate" value={evidence.matters} onChange={v => patch('matters', v)} />
          <NumberField label="Dokumente" value={evidence.documents} onChange={v => patch('documents', v)} />
          <NumberField label="Follow-ups vorbereitet" value={evidence.followups} onChange={v => patch('followups', v)} />
          <NumberField label="Automatisch vorbereitet" value={evidence.automatedPreparations} onChange={v => patch('automatedPreparations', v)} />
          <NumberField label="Human-Attention Items" value={evidence.humanAttentionItems} onChange={v => patch('humanAttentionItems', v)} />
          <NumberField label="Korrekturereignisse" value={evidence.correctionEvents} onChange={v => patch('correctionEvents', v)} />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6">
        <h2 className="text-xl font-semibold">Zeitbeweis</h2>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <NumberField label="Vorher · aktive Minuten" value={evidence.baselineMinutes} onChange={v => patch('baselineMinutes', v)} />
          <NumberField label="Pilot · aktive Minuten" value={evidence.pilotMinutes} onChange={v => patch('pilotMinutes', v)} />
          <NumberField label="Korrektur / Rework · Minuten" value={evidence.correctionMinutes} onChange={v => patch('correctionMinutes', v)} />
        </div>
        <div className="mt-4 grid sm:grid-cols-4 gap-3">
          <Metric label="Bestätigt zurück" value={`${report.time.confirmedMinutesReturned.toFixed(1)} min`} strong />
          <Metric label="Automation" value={pct(report.rates.automationRate)} />
          <Metric label="Human Attention" value={pct(report.rates.humanAttentionRate)} />
          <Metric label="Korrekturrate" value={pct(report.rates.correctionRate)} />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6">
        <h2 className="text-xl font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Safety must stay boring</h2>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <NumberField label="Authority-Verletzungen" value={evidence.authorityViolations} onChange={v => patch('authorityViolations', v)} />
          <NumberField label="Kritische verpasste Items" value={evidence.criticalMisses} onChange={v => patch('criticalMisses', v)} />
          <NumberField label="Wrong-matter Events" value={evidence.wrongMatterEvents} onChange={v => patch('wrongMatterEvents', v)} />
        </div>
        <div className={`mt-4 rounded-xl border p-4 ${report.recommendation.status === 'KEEP_CANDIDATE' ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
          <strong>{report.recommendation.status}</strong>
          <p className="text-sm mt-1">KEEP gibt es nur bei positiver gemessener Zeitersparnis und 0 Authority-Verletzungen, 0 kritischen Misses, 0 Wrong-Matter Events.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Euro className="w-5 h-5" /> Zahlungsbereitschaft — nicht aus ROI erraten</h2>
        <p className="text-sm text-[var(--color-ink-muted)] mt-1">Frage direkt: „Wenn das zuverlässig einen Arbeitstag pro Woche zurückgibt — wie fühlt sich dieser Preis an?“</p>
        <div className="grid sm:grid-cols-4 gap-3 mt-4">
          <Price label="€500 / Monat" value={evidence.price500} onChange={v => patch('price500', v)} />
          <Price label="€1.000 / Monat" value={evidence.price1000} onChange={v => patch('price1000', v)} />
          <Price label="€2.000 / Monat" value={evidence.price2000} onChange={v => patch('price2000', v)} />
          <Price label="€3.000 / Monat" value={evidence.price3000} onChange={v => patch('price3000', v)} />
        </div>
        <div className="mt-4"><NumberField label="Ab welchem €/Monat wäre es ein offensichtliches Ja?" value={evidence.obviousYesAt} onChange={v => patch('obviousYesAt', v)} /></div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6">
        <Field label="Empfohlener nächster Workflow" value={evidence.nextWorkflow} onChange={v => patch('nextWorkflow', v)} />
        <label className="block mt-4"><span className="text-sm font-semibold">Feedback / was musste neu gemacht werden / was kam zu spät?</span><textarea rows={4} value={evidence.feedback} onChange={e => patch('feedback', e.target.value)} placeholder="Nur Prozessfeedback — keine Mandatsgeheimnisse." className="mt-2 w-full rounded-lg border border-[var(--color-border)] px-3 py-2" /></label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => download('json')} className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-ink)] text-white px-4 py-2 text-sm font-semibold"><Download className="w-4 h-4" /> JSON-Evidence</button>
          <button onClick={() => download('md')} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"><Download className="w-4 h-4" /> Report.md</button>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 flex gap-3"><CheckCircle2 className="w-5 h-5 text-blue-800 shrink-0" /><div><strong className="text-blue-950">Truth boundary</strong><p className="text-sm text-blue-900/80 mt-1">Keine Hochrechnung wird als Kunden-ROI veröffentlicht. Ohne echte Baseline + beobachtete Runs bleibt der Report „incomplete“. Ein Sicherheitsfehler stoppt die KEEP-Empfehlung.</p></div></section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex gap-3"><TriangleAlert className="w-5 h-5 text-amber-800 shrink-0" /><div><strong className="text-amber-950">Keine vertraulichen Inhalte</strong><p className="text-sm text-amber-900/80 mt-1">Diese Konsole speichert lokal im Browser. Trotzdem nur pseudonyme Referenzen und Prozessmetriken erfassen.</p></div></section>
    </div>
  )
}

function cleanNumber(value: string) { return value.replace(/[^0-9.,]/g, '') }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="text-sm font-semibold">{label}</span><input value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2" /></label> }
function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="text-xs font-semibold text-[var(--color-ink-muted)]">{label}</span><input inputMode="decimal" value={value} onChange={e => onChange(cleanNumber(e.target.value))} placeholder="0" className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2" /></label> }
function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`rounded-xl border p-4 ${strong ? 'border-emerald-300 bg-emerald-50' : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]'}`}><div className="text-xs text-[var(--color-ink-muted)]">{label}</div><div className="text-xl font-semibold mt-1">{value}</div></div> }
function Price({ label, value, onChange }: { label: string; value: PriceFeel; onChange: (value: PriceFeel) => void }) { return <label className="block"><span className="text-xs font-semibold text-[var(--color-ink-muted)]">{label}</span><select value={value} onChange={e => onChange(e.target.value as PriceFeel)} className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2"><option value="not_asked">noch nicht gefragt</option><option value="easy">leichtes Ja</option><option value="fair">fair</option><option value="high">hoch</option><option value="no">nein</option></select></label> }

function toMarkdown(report: any) {
  const r = report
  const p = (v: number | null) => v == null ? '—' : `${(v * 100).toFixed(1)}%`
  return `# Kanzlei Autopilot — Proof Week\n\n**Evidence:** ${r.evidenceQuality}\n**Workflow:** ${r.workflowPackId}\n**Offer:** €990 net / 7 days / no automatic subscription\n\n## Observed\n- Runs: ${r.observed.runs}\n- Matters: ${r.observed.matters}\n- Documents: ${r.observed.documents}\n- Follow-ups prepared: ${r.observed.followupsPrepared}\n\n## Time\n- Baseline: ${r.time.baselineMinutes.toFixed(1)} min\n- Pilot: ${r.time.pilotMinutes.toFixed(1)} min\n- Correction/Rework: ${r.time.correctionMinutes.toFixed(1)} min\n- **Confirmed returned: ${r.time.confirmedMinutesReturned.toFixed(1)} min (${r.time.confirmedHoursReturned.toFixed(2)} h)**\n\n## Rates\n- Automation: ${p(r.rates.automationRate)}\n- Human attention: ${p(r.rates.humanAttentionRate)}\n- Correction: ${p(r.rates.correctionRate)}\n\n## Safety\n- Authority violations: ${r.safety.authorityViolations}\n- Critical misses: ${r.safety.criticalMisses}\n- Wrong-matter events: ${r.safety.wrongMatterEvents}\n\n## Decision\n**${r.recommendation.status}**\nNext workflow: ${r.recommendation.nextWorkflow ?? '—'}\n\n## Truth boundary\nOnly observed evidence is customer evidence. Synthetic or estimated savings are never published as customer ROI.\n`
}
