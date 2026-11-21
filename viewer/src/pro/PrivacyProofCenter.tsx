import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, LockKeyhole, Play, ShieldCheck, XCircle } from 'lucide-react'
import { fetchWithProSession } from './pro-api'
import { getAccessContext, getSettings, listCases, updateCase } from './store'
import type { MandantCase, MatterPrivacyState } from './types'

type Readiness = {
  policyVersion: string
  approvedProvider: string
  shadowModeReady: boolean
  realMandateAiReady: boolean
  gates: Record<string, boolean>
  proofDigest: string
  realMandateDefault: string
  rawIdentifiersDefault: string
  crossMatterMemory: string
  providerFailover: string
}

type Probe = { id: string; label: string; passed: boolean; status: number; providerCalls: string | null; detail: string }

const LABELS: Record<string, string> = {
  privacy_enforcement_enabled: 'Privacy enforcement aktiv',
  real_mandate_ai_explicitly_enabled: 'Realmandat-AI explizit freigeschaltet',
  provider_contract_reviewed: 'Providervertrag geprüft',
  confidentiality_terms_confirmed: 'Verschwiegenheit / §43e-Bedingungen bestätigt',
  dpa_avv_confirmed: 'AVV / DPA bestätigt',
  subprocessors_reviewed: 'Unterauftragsverarbeiter geprüft',
  comparable_secret_protection_reviewed: 'Vergleichbarer Geheimnisschutz geprüft',
  zero_data_retention_confirmed: 'Zero Data Retention bestätigt',
  toms_reviewed: 'TOMs geprüft',
  dpia_reviewed: 'DSFA/DPIA geprüft',
  incident_process_ready: 'Incident-/Breach-Prozess bereit',
  deletion_process_ready: 'Löschprozess bereit',
  receipt_signing_key_configured: 'Privacy-Receipt-Signatur aktiv',
  approved_provider_pinned: 'Ein freigegebener Provider fest gepinnt',
}

export default function PrivacyProofCenter() {
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [readinessError, setReadinessError] = useState('')
  const [probes, setProbes] = useState<Probe[]>([])
  const [running, setRunning] = useState(false)
  const realCases = useMemo(() => listCases().filter(c => c.status === 'aktiv' && c.privacy?.dataMode !== 'synthetic'), [])
  const [selectedCaseId, setSelectedCaseId] = useState(realCases[0]?.id || '')
  const selected = realCases.find(c => c.id === selectedCaseId)

  useEffect(() => {
    fetchWithProSession('/api/pro/privacy-readiness')
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        setReadiness(await r.json() as Readiness)
      })
      .catch(err => setReadinessError(err instanceof Error ? err.message : 'Readiness nicht verfügbar'))
  }, [])

  async function probe(id: string, label: string, body: Record<string, unknown>): Promise<Probe> {
    try {
      const r = await fetchWithProSession('/api/ask-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const providerCalls = r.headers.get('x-privacy-provider-calls')
      let detail = ''
      try {
        const parsed = await r.json() as { reasons?: string[]; error?: string }
        detail = parsed.reasons?.join(', ') || parsed.error || ''
      } catch {}
      const passed = r.status === 423 && providerCalls === '0'
      return { id, label, passed, status: r.status, providerCalls, detail }
    } catch (err) {
      return { id, label, passed: false, status: 0, providerCalls: null, detail: err instanceof Error ? err.message : 'network error' }
    }
  }

  async function runGauntlet() {
    setRunning(true)
    setProbes([])
    const baseReal = {
      dataMode: 'real_mandate',
      purpose: 'synthetic privacy probe',
      caseRef: 'privacy_probe_case',
      externalServiceNecessary: true,
      redactionApplied: true,
      memoryScope: 'none',
    }
    const results = []
    results.push(await probe('unclassified', 'Unklassifizierte Daten dürfen nicht egressen', {
      question: 'Person A hat eine aufenthaltsrechtliche Frage.',
    }))
    results.push(await probe('canary', 'Canary-Geheimnis wird vor Netzwerk blockiert', {
      question: 'MANDATE-CANARY-DO-NOT-EGRESS-7F91A2',
      privacy: { dataMode: 'synthetic', memoryScope: 'none' },
    }))
    results.push(await probe('consent', 'Realmandat ohne Einwilligung wird blockiert', {
      question: 'Person A beantragt eine Verlängerung nach § 8 AufenthG.',
      privacy: { ...baseReal, clientConsent: false },
    }))
    results.push(await probe('raw-id', 'Direkter Identifikator wird trotz Attestierung blockiert', {
      question: 'Frau Mustermann unter test@example.com beantragt eine Verlängerung.',
      privacy: { ...baseReal, clientConsent: true },
    }))
    results.push(await probe('memory', 'Privilegierte Cross-Prompt-Memory wird blockiert', {
      question: 'Person A beantragt eine Verlängerung.',
      approvedMemory: [{ question: 'anderes Mandat', approvedAnswer: 'vertrauliche Vorantwort' }],
      privacy: { ...baseReal, clientConsent: true },
    }))
    setProbes(results)
    setRunning(false)
  }

  function saveMatterPrivacy(patch: Partial<MatterPrivacyState>) {
    if (!selected) return
    const current: MatterPrivacyState = selected.privacy || { dataMode: 'real_mandate' }
    const next: MatterPrivacyState = {
      ...current,
      dataMode: 'real_mandate',
      ...patch,
      reviewedAt: new Date().toISOString(),
      reviewedBy: getSettings().anwaltName || getAccessContext()?.userId || 'lawyer',
    }
    updateCase(selected.id, { privacy: next })
    window.location.reload()
  }

  const allProbesPassed = probes.length > 0 && probes.every(p => p.passed)

  return (
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-emerald-800"><ShieldCheck className="w-4 h-4" /> Proof over trust</div>
        <h1 className="h-page mt-2">Privacy Proof Center</h1>
        <p className="text-sm text-[var(--color-ink-soft)] max-w-4xl">
          Mandatsgeheimnis und Datenschutz als ausführbarer Safety Case: Rechtsanforderung → technische Kontrolle → automatischer Angriffstest → Laufzeit-Receipt → anwaltliche Freigabe.
        </p>
      </header>

      <section className="grid md:grid-cols-3 gap-3">
        <StatusCard ok={true} title="Shadow Mode" detail="Realmandate lokal bearbeiten; externe AI standardmäßig gesperrt." />
        <StatusCard ok={readiness?.realMandateAiReady === true} title="Privileged AI" detail={readiness?.realMandateAiReady ? 'Alle Release-Gates technisch belegt.' : 'LOCKED bis alle Provider-/Kanzlei-Gates vollständig sind.'} />
        <StatusCard ok={allProbesPassed} title="Live Safety Gauntlet" detail={allProbesPassed ? 'Alle Angriffstests: BLOCK vor Provider.' : 'Gauntlet ausführen und Zero-Egress beweisen.'} />
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-xl font-semibold">Release Gate · Realmandat → externe AI</h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-1">Kein einzelner Haken reicht. Alle serverseitigen Gates müssen wahr sein.</p>
          </div>
          {readiness && <span className="font-mono text-[10px] break-all max-w-lg text-[var(--color-ink-muted)]">proof {readiness.proofDigest}</span>}
        </div>
        {readinessError && <p className="text-sm text-red-700">{readinessError}</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {readiness && Object.entries(readiness.gates).map(([key, ok]) => (
            <div key={key} className={`rounded-xl border p-3 text-sm flex gap-2 items-start ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
              {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" /> : <LockKeyhole className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />}
              <span>{LABELS[key] || key}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
          Diese Anzeige ist ein technischer Readiness-Nachweis, keine anwaltliche oder datenschutzrechtliche Zertifizierung. Vertrags-/DSFA-/Berufsrechtsfreigabe bleibt menschlich.
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Live Zero-Egress Gauntlet</h2>
            <p className="text-sm text-[var(--color-ink-soft)] mt-1">Fünf synthetische Angriffe gegen die echte API. PASS nur bei HTTP 423 + `provider calls = 0`.</p>
          </div>
          <button onClick={runGauntlet} disabled={running} className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-ink)] text-white px-4 py-2.5 font-semibold disabled:opacity-50"><Play className="w-4 h-4" /> {running ? 'Teste…' : 'Safety Gauntlet starten'}</button>
        </div>
        <div className="space-y-2 mt-5">
          {probes.map(p => (
            <div key={p.id} className={`rounded-xl border p-3 ${p.passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {p.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <XCircle className="w-4 h-4 text-red-700" />}
                <strong className="text-sm">{p.label}</strong>
                <span className="ml-auto text-xs font-mono">HTTP {p.status} · provider={p.providerCalls ?? '?'}</span>
              </div>
              {p.detail && <p className="text-xs mt-1 opacity-70 break-words">{p.detail}</p>}
            </div>
          ))}
          {!probes.length && <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Noch nicht ausgeführt.</div>}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="text-xl font-semibold">Mandatsbezogene Freigabeevidenz</h2>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">Nur Evidenzmarker speichern — die unterschriebene Einwilligung bleibt in der Kanzleiakte.</p>
        {realCases.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-slate-500">Keine als Realmandat klassifizierte aktive Akte vorhanden.</div>
        ) : (
          <div className="mt-4 space-y-4">
            <select value={selectedCaseId} onChange={e => setSelectedCaseId(e.target.value)} className="w-full max-w-xl rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
              {realCases.map(c => <option key={c.id} value={c.id}>{c.aktenzeichen} · {c.mandantName}</option>)}
            </select>
            {selected && <MatterGateEditor key={`${selected.id}-${selected.updatedAt}`} matter={selected} onSave={saveMatterPrivacy} />}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3"><AlertTriangle className="w-5 h-5 text-amber-800 shrink-0" /><div><h2 className="font-semibold">Meeting rule</h2><p className="text-sm text-amber-900 mt-1">Nächste Woche starten wir mit Synthetic + Shadow Mode. Realmandat → externe AI wird nur dann live aktiviert, wenn das Proof Center grün ist und Bao die mandatsbezogene Evidenz geprüft hat. Kein Zeitdruck darf diese Grenze überschreiben.</p></div></div>
      </section>
    </div>
  )
}

function StatusCard({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return <div className={`rounded-2xl border p-4 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-center gap-2">{ok ? <CheckCircle2 className="w-5 h-5 text-emerald-700" /> : <LockKeyhole className="w-5 h-5 text-amber-800" />}<strong>{title}</strong></div><p className="text-xs mt-2 opacity-75">{detail}</p></div>
}

function MatterGateEditor({ matter, onSave }: { matter: MandantCase; onSave: (patch: Partial<MatterPrivacyState>) => void }) {
  const [consent, setConsent] = useState(matter.privacy?.externalAiConsentOnFile === true)
  const [evidence, setEvidence] = useState(matter.privacy?.externalAiConsentEvidenceRef || '')
  const [necessary, setNecessary] = useState(matter.privacy?.externalServiceNecessaryAttested === true)
  const [purpose, setPurpose] = useState(matter.privacy?.externalAiPurpose || '')
  const [pseudo, setPseudo] = useState(matter.privacy?.pseudonymousCaseRef || '')
  return (
    <div className="grid md:grid-cols-2 gap-3 max-w-4xl">
      <label className="text-sm"><span className="block mb-1 text-[var(--color-ink-soft)]">Pseudonymisierte Case-Referenz</span><input value={pseudo} onChange={e => setPseudo(e.target.value)} placeholder="matter_7f2c…" className="w-full rounded-lg border p-2" /></label>
      <label className="text-sm"><span className="block mb-1 text-[var(--color-ink-soft)]">Einwilligungs-Evidenzreferenz</span><input value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="Advoware-Dokument-ID / Hash / Pfad" className="w-full rounded-lg border p-2" /></label>
      <label className="md:col-span-2 text-sm"><span className="block mb-1 text-[var(--color-ink-soft)]">Konkreter Zweck</span><input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="z. B. pseudonymisierte Recherche zur Anspruchsvoraussetzung" className="w-full rounded-lg border p-2" /></label>
      <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" /><span>Mandanteneinwilligung für den konkreten externen Dienst liegt nach anwaltlicher Prüfung vor.</span></label>
      <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={necessary} onChange={e => setNecessary(e.target.checked)} className="mt-1" /><span>Externer Dienst ist für diesen konkreten Workflow erforderlich und Datenumfang minimiert.</span></label>
      <div className="md:col-span-2"><button onClick={() => onSave({ externalAiConsentOnFile: consent && Boolean(evidence.trim()), externalAiConsentEvidenceRef: evidence.trim() || undefined, externalServiceNecessaryAttested: necessary, externalAiPurpose: purpose.trim() || undefined, pseudonymousCaseRef: pseudo.trim() || `matter_${crypto.randomUUID()}` })} className="rounded-xl bg-[var(--color-ink)] text-white px-4 py-2 text-sm font-semibold">Evidenzmarker speichern</button></div>
    </div>
  )
}
