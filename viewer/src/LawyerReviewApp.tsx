import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Download, EyeOff, FileUp, RotateCcw, Scale, ShieldCheck } from 'lucide-react'
import {
  CLAIM_RATINGS,
  ERROR_TAGS,
  SCORE_KEYS,
  TERMINAL_LABELS,
  createReviewDraft,
  downloadJson,
  finalizeReview,
  reviewCaseSnapshots,
  reviewCompletion,
  validateReviewCase,
  type AbstentionReview,
  type ClaimReview,
  type FinalLawyerReview,
  type LawyerReviewCase,
  type LawyerReviewDraft,
  type ScoreFive,
  type ScoreKey,
  type Ternary,
  type YesNo,
} from './lawyer-review'

const SCORE_0_2 = [0, 1, 2] as const
const SCORE_1_5 = [1, 2, 3, 4, 5] as const

const scoreLabels: Record<ScoreKey, string> = {
  issue_spotting: 'Issue spotting',
  legal_correctness: 'Rechtliche Korrektheit',
  completeness: 'Vollständigkeit',
  evidence_presentation: 'Evidence-Präsentation',
  missing_facts_uncertainty: 'Missing facts + Unsicherheit',
  lawyer_usefulness: 'Nützlichkeit für Anwält:innen',
}

const ratingLabels = {
  supported: 'Belegt',
  partially_supported: 'Teilweise belegt',
  unsupported: 'Unbelegt',
  contradicted_by_source: 'Quelle widerspricht',
} as const

const terminalLabels = {
  ACCEPTABLE_WITHOUT_MATERIAL_CORRECTION: 'Ohne materielle Korrektur akzeptabel',
  ACCEPTABLE_WITH_MINOR_CORRECTION: 'Mit kleiner Korrektur akzeptabel',
  MATERIAL_CORRECTION_REQUIRED: 'Materielle Korrektur erforderlich',
  UNSAFE_OR_MISLEADING: 'Unsicher oder irreführend',
} as const

function progressPct(complete: number, total: number): number {
  return total === 0 ? 0 : Math.round((complete / total) * 100)
}

function shortHash(value: string): string {
  return value ? `${value.slice(0, 12)}…${value.slice(-8)}` : '—'
}

function ChoiceButton({ active, disabled, children, onClick }: { active: boolean; disabled: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${active ? 'border-[var(--color-gold)] bg-[var(--color-gold-light)] text-[var(--color-ink)]' : 'border-[var(--color-border)] bg-white text-[var(--color-ink-soft)] hover:border-[var(--color-gold)]'} disabled:cursor-not-allowed disabled:opacity-55`}>
      {children}
    </button>
  )
}

function TernaryField({ label, value, disabled, onChange }: { label: string; value: Ternary; disabled: boolean; onChange: (value: Ternary) => void }) {
  return (
    <div className="grid gap-2 border-b border-[var(--color-border)] py-3 last:border-0 md:grid-cols-[1fr_auto] md:items-center">
      <span className="text-sm text-[var(--color-ink-soft)]">{label}</span>
      <div className="flex flex-wrap gap-2">
        {(['yes', 'no', 'uncertain'] as const).map(option => (
          <ChoiceButton key={option} active={value === option} disabled={disabled} onClick={() => onChange(option)}>{option === 'yes' ? 'Ja' : option === 'no' ? 'Nein' : 'Unklar'}</ChoiceButton>
        ))}
      </div>
    </div>
  )
}

function YesNoField({ label, value, disabled, onChange }: { label: string; value: YesNo; disabled: boolean; onChange: (value: YesNo) => void }) {
  return (
    <div className="grid gap-2 border-b border-[var(--color-border)] py-3 last:border-0 md:grid-cols-[1fr_auto] md:items-center">
      <span className="text-sm text-[var(--color-ink-soft)]">{label}</span>
      <div className="flex gap-2">
        {(['yes', 'no'] as const).map(option => <ChoiceButton key={option} active={value === option} disabled={disabled} onClick={() => onChange(option)}>{option === 'yes' ? 'Ja' : 'Nein'}</ChoiceButton>)}
      </div>
    </div>
  )
}

function ScoreFiveField({ label, value, disabled, onChange }: { label: string; value: ScoreFive | null; disabled: boolean; onChange: (value: ScoreFive) => void }) {
  return (
    <div className="grid gap-2 border-b border-[var(--color-border)] py-3 last:border-0 md:grid-cols-[1fr_auto] md:items-center">
      <span className="text-sm text-[var(--color-ink-soft)]">{label}</span>
      <div className="flex gap-1.5">{SCORE_1_5.map(score => <ChoiceButton key={score} active={value === score} disabled={disabled} onClick={() => onChange(score)}>{score}</ChoiceButton>)}</div>
    </div>
  )
}

export default function LawyerReviewApp() {
  const baseUrl = import.meta.env.BASE_URL
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [reviewCase, setReviewCase] = useState<LawyerReviewCase | null>(null)
  const [draft, setDraft] = useState<LawyerReviewDraft | null>(null)
  const [caseSha, setCaseSha] = useState('')
  const [runSha, setRunSha] = useState('')
  const [finalReview, setFinalReview] = useState<FinalLawyerReview | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const completion = useMemo(() => reviewCase && draft ? reviewCompletion(reviewCase, draft) : { complete: 0, total: 0, blockers: [] }, [reviewCase, draft])
  const locked = finalReview !== null
  const modelBlinded = reviewCase?.blinding?.hide_model_identity !== false

  const replaceDraft = (next: LawyerReviewDraft) => {
    if (!locked) setDraft(next)
  }

  const loadCaseObject = async (raw: unknown) => {
    const parsed = validateReviewCase(raw)
    const snapshots = await reviewCaseSnapshots(parsed)
    setReviewCase(parsed)
    setDraft(createReviewDraft(parsed))
    setCaseSha(snapshots.caseSha256)
    setRunSha(snapshots.runSha256)
    setFinalReview(null)
    setError('')
  }

  const loadSample = async () => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`${baseUrl}evals/lawyer-review-case.sample.json`)
      if (!response.ok) throw new Error(`Sample case HTTP ${response.status}`)
      await loadCaseObject(await response.json())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sample case konnte nicht geladen werden')
    } finally {
      setBusy(false)
    }
  }

  const importCase = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      await loadCaseObject(JSON.parse(await file.text()))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ungültiges Case JSON')
    } finally {
      setBusy(false)
    }
  }

  const updateClaim = (claimId: string, patch: Partial<ClaimReview>) => {
    if (!draft) return
    const current = draft.claim_reviews[claimId]
    if (!current) return
    replaceDraft({ ...draft, claim_reviews: { ...draft.claim_reviews, [claimId]: { ...current, ...patch } } })
  }

  const finishReview = async () => {
    if (!reviewCase || !draft) return
    setBusy(true)
    setError('')
    try {
      setFinalReview(await finalizeReview(reviewCase, draft))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Review konnte nicht finalisiert werden')
    } finally {
      setBusy(false)
    }
  }

  const resetReview = () => {
    if (!reviewCase) return
    setDraft(createReviewDraft(reviewCase))
    setFinalReview(null)
    setError('')
  }

  if (!reviewCase || !draft) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] px-4 py-16 text-[var(--color-ink)]">
        <div className="mx-auto max-w-3xl">
          <a href="#/" className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-gold)]">← GitLaw</a>
          <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-gold-light)] text-[var(--color-gold)]"><Scale size={28} /></div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">Independent human evidence</p>
            <h1 className="mb-3 font-[var(--font-display)] text-4xl font-semibold">Lawyer Review Lab</h1>
            <p className="mx-auto mb-3 max-w-xl text-sm leading-6 text-[var(--color-ink-soft)]">Blinded, local-first evaluation for frozen Legal AI runs. Final reviews remain compatible with GitLaw's existing German Gold aggregator and gain immutable SHA-256 evidence.</p>
            <div className="mx-auto mb-7 flex max-w-xl gap-2 rounded-xl bg-[var(--color-green-light)] p-3 text-left text-xs leading-5 text-[var(--color-green)]"><ShieldCheck className="mt-0.5 shrink-0" size={16} /><span>Everything stays in the browser until you explicitly export a review. Never load confidential client data into a public deployment.</span></div>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-[var(--color-ink)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"><FileUp size={17} /> Case JSON importieren</button>
              <button type="button" disabled={busy} onClick={loadSample} className="rounded-xl border border-[var(--color-border)] bg-white px-5 py-3 text-sm font-semibold hover:border-[var(--color-gold)] disabled:opacity-50">Synthetischen Testfall laden</button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importCase} />
            {error && <p className="mt-5 rounded-xl bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)]">{error}</p>}
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-gold-light)] text-[var(--color-gold)]"><Scale size={20} /></div><div><strong>GitLaw Lawyer Review Lab</strong><p className="text-xs text-[var(--color-ink-muted)]">schema 1.0 compatible · detailed evidence · SHA-256 bound</p></div></div>
          <a href="#/" className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-gold)]">GitLaw →</a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">{reviewCase.practice_area}</p><h1 className="font-[var(--font-display)] text-2xl font-semibold">{reviewCase.case_id}</h1></div><div className="text-right text-[11px] text-[var(--color-ink-muted)]"><div>Case <code title={caseSha}>{shortHash(caseSha)}</code></div><div>Run <code title={runSha}>{shortHash(runSha)}</code></div></div></div>
              <h2 className="mb-1 text-sm font-semibold">Aufgabe</h2><p className="mb-4 text-sm leading-6 text-[var(--color-ink-soft)]">{reviewCase.task}</p>
              <h2 className="mb-2 text-sm font-semibold">Fakten-Snapshot</h2><ul className="space-y-2 text-sm leading-6 text-[var(--color-ink-soft)]">{reviewCase.facts.map(fact => <li key={fact} className="flex gap-2"><span className="text-[var(--color-gold)]">•</span><span>{fact}</span></li>)}</ul>
              {reviewCase.notes && <p className="mt-4 rounded-xl bg-[var(--color-bg-alt)] p-3 text-xs text-[var(--color-ink-muted)]">{reviewCase.notes}</p>}
            </section>

            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-[var(--font-display)] text-xl font-semibold">Systemausgabe</h2>{modelBlinded ? <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-bg-alt)] px-3 py-1 text-xs text-[var(--color-ink-muted)]"><EyeOff size={14} /> Modell verborgen</span> : <span className="text-xs text-[var(--color-ink-muted)]">{reviewCase.system.model_identity ?? 'Modell nicht angegeben'}</span>}</div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink-soft)]">{reviewCase.system.output}</p>
              <div className="mt-4 grid gap-2 border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-ink-muted)] sm:grid-cols-2"><div>System: <code>{reviewCase.system.system_version}</code></div><div>Corpus: <code>{reviewCase.system.corpus_snapshot}</code></div>{reviewCase.system.trace_id && <div>Trace: <code>{reviewCase.system.trace_id}</code></div>}</div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="mb-1 font-[var(--font-display)] text-xl font-semibold">Core scores · Aggregator-kompatibel</h2>
              <p className="mb-3 text-xs text-[var(--color-ink-muted)]">Diese sechs 1–5 Scores bleiben exakt kompatibel mit dem bestehenden German-Gold-Review-Aggregator.</p>
              {SCORE_KEYS.map(key => <ScoreFiveField key={key} label={scoreLabels[key]} value={draft.scores[key]} disabled={locked} onChange={value => replaceDraft({ ...draft, scores: { ...draft.scores, [key]: value } })} />)}
            </section>

            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="mb-1 font-[var(--font-display)] text-xl font-semibold">Issue-by-Issue Evidence</h2><p className="mb-4 text-xs text-[var(--color-ink-muted)]">0 = verfehlt/falsch · 1 = teilweise · 2 = korrekt und sauber abgegrenzt</p>
              <div className="space-y-3">{reviewCase.expected_issues.map(issue => <div key={issue.id} className="rounded-xl border border-[var(--color-border)] p-4"><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center"><div><div className="text-sm font-semibold">{issue.label}</div>{issue.description && <p className="mt-1 text-xs leading-5 text-[var(--color-ink-muted)]">{issue.description}</p>}</div><div className="flex gap-2">{SCORE_0_2.map(score => <ChoiceButton key={score} active={draft.issue_scores[issue.id] === score} disabled={locked} onClick={() => replaceDraft({ ...draft, issue_scores: { ...draft.issue_scores, [issue.id]: score } })}>{score}</ChoiceButton>)}</div></div></div>)}</div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="mb-1 font-[var(--font-display)] text-xl font-semibold">Claim ↔ Source Adjudication</h2><p className="mb-5 text-xs text-[var(--color-ink-muted)]">Eine auflösbare Citation beweist nicht, dass die Aussage die Quelle korrekt wiedergibt.</p>
              <div className="space-y-5">{reviewCase.claims.map((claim, index) => {
                const row = draft.claim_reviews[claim.id]
                return <article key={claim.id} className="rounded-2xl border border-[var(--color-border)] p-4"><div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">Material claim {index + 1}</div><p className="mb-4 text-sm font-medium leading-6">{claim.text}</p><div className="mb-4 space-y-2">{claim.sources.map(source => <div key={source.id} className="rounded-xl bg-[var(--color-bg-alt)] p-3 text-xs leading-5 text-[var(--color-ink-soft)]"><div className="font-semibold">{source.label}</div>{source.citation && <div className="text-[var(--color-ink-muted)]">{source.citation}</div>}{source.excerpt && <blockquote className="mt-1 border-l-2 border-[var(--color-gold)] pl-2">{source.excerpt}</blockquote>}{source.url && <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[var(--color-blue)] underline">Quelle öffnen</a>}</div>)}</div><div className="mb-2 flex flex-wrap gap-2">{CLAIM_RATINGS.map(rating => <ChoiceButton key={rating} active={row.rating === rating} disabled={locked} onClick={() => updateClaim(claim.id, { rating })}>{ratingLabels[rating]}</ChoiceButton>)}</div><YesNoField label="Erwartete Quelle gefunden?" value={row.expected_source_found} disabled={locked} onChange={value => updateClaim(claim.id, { expected_source_found: value })} /><TernaryField label="Quelle rechtlich relevant?" value={row.source_relevance} disabled={locked} onChange={value => updateClaim(claim.id, { source_relevance: value })} /><TernaryField label="Quelle zeitlich passend?" value={row.temporal_validity} disabled={locked} onChange={value => updateClaim(claim.id, { temporal_validity: value })} /><YesNoField label="Wichtige Quelle ausgelassen?" value={row.important_source_omitted} disabled={locked} onChange={value => updateClaim(claim.id, { important_source_omitted: value })} /><YesNoField label="Irrelevante Quelle eingeführt?" value={row.irrelevant_source_introduced} disabled={locked} onChange={value => updateClaim(claim.id, { irrelevant_source_introduced: value })} /><textarea disabled={locked} value={row.notes} onChange={event => updateClaim(claim.id, { notes: event.target.value })} placeholder="Claim-/Quellen-Notiz …" className="mt-3 min-h-20 w-full rounded-xl border border-[var(--color-border)] p-3 text-sm outline-none focus:border-[var(--color-gold)] disabled:bg-[var(--color-bg-alt)]" /></article>
              })}</div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="mb-3 font-[var(--font-display)] text-xl font-semibold">Workflow & Agent Behavior</h2>
              <TernaryField label="Nur notwendige Tools aufgerufen?" value={draft.workflow.necessary_tools_only} disabled={locked} onChange={value => replaceDraft({ ...draft, workflow: { ...draft.workflow, necessary_tools_only: value } })} />
              <TernaryField label="Iteration-/Kostenlimits eingehalten?" value={draft.workflow.within_iteration_cost_limits} disabled={locked} onChange={value => replaceDraft({ ...draft, workflow: { ...draft.workflow, within_iteration_cost_limits: value } })} />
              <TernaryField label="Alle materiellen Claims traceable?" value={draft.workflow.material_claims_traceable} disabled={locked} onChange={value => replaceDraft({ ...draft, workflow: { ...draft.workflow, material_claims_traceable: value } })} />
              <TernaryField label="Keine Tenant-/Rollen-/Approval-Grenze verletzt?" value={draft.workflow.no_boundary_violation} disabled={locked} onChange={value => replaceDraft({ ...draft, workflow: { ...draft.workflow, no_boundary_violation: value } })} />
              <TernaryField label="Geänderte Quelle öffnete Review korrekt neu?" value={draft.workflow.changed_source_reopened_review} disabled={locked} onChange={value => replaceDraft({ ...draft, workflow: { ...draft.workflow, changed_source_reopened_review: value } })} />
              <TernaryField label="Kein submitted→approved ohne Reviewer-Aktion?" value={draft.workflow.no_false_approval_state} disabled={locked} onChange={value => replaceDraft({ ...draft, workflow: { ...draft.workflow, no_false_approval_state: value } })} />
              <textarea disabled={locked} value={draft.workflow.notes} onChange={event => replaceDraft({ ...draft, workflow: { ...draft.workflow, notes: event.target.value } })} placeholder="Workflow-/Agent-Notizen …" className="mt-4 min-h-24 w-full rounded-xl border border-[var(--color-border)] p-3 text-sm outline-none focus:border-[var(--color-gold)] disabled:bg-[var(--color-bg-alt)]" />
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between"><h2 className="font-[var(--font-display)] text-xl font-semibold">Reviewer</h2><span className="text-sm font-semibold text-[var(--color-gold)]">{progressPct(completion.complete, completion.total)}%</span></div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--color-bg-alt)]"><div className="h-full rounded-full bg-[var(--color-gold)] transition-all" style={{ width: `${progressPct(completion.complete, completion.total)}%` }} /></div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">Pseudonyme Reviewer ID</label><input disabled={locked} value={draft.reviewer_id} onChange={event => replaceDraft({ ...draft, reviewer_id: event.target.value })} placeholder="lawyer-02" className="mb-3 w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-gold)] disabled:bg-[var(--color-bg-alt)]" />
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">Rolle</label><input disabled={locked} value={draft.reviewer_role} onChange={event => replaceDraft({ ...draft, reviewer_role: event.target.value })} placeholder="Rechtsanwält:in · Mietrecht" className="mb-3 w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-gold)] disabled:bg-[var(--color-bg-alt)]" />
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" disabled={locked} checked={draft.independent} onChange={event => replaceDraft({ ...draft, independent: event.target.checked })} className="h-4 w-4" /> Independent reviewer</label>
            </section>

            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="mb-3 font-[var(--font-display)] text-xl font-semibold">Release-signifikante Fehler</h2>
              <YesNoField label="Kritische Authority ausgelassen?" value={draft.release_signals.critical_authority_omitted} disabled={locked} onChange={value => replaceDraft({ ...draft, release_signals: { ...draft.release_signals, critical_authority_omitted: value } })} />
              <YesNoField label="Unbelegter materieller Claim?" value={draft.release_signals.unsupported_material_claim} disabled={locked} onChange={value => replaceDraft({ ...draft, release_signals: { ...draft.release_signals, unsupported_material_claim: value } })} />
              <YesNoField label="Materieller Claim widerspricht Quelle?" value={draft.release_signals.contradicted_material_claim} disabled={locked} onChange={value => replaceDraft({ ...draft, release_signals: { ...draft.release_signals, contradicted_material_claim: value } })} />
              <div className="pt-3"><div className="mb-2 text-sm text-[var(--color-ink-soft)]">Correct abstention?</div><div className="flex flex-wrap gap-2">{([['yes','Ja'],['no','Nein'],['not_applicable','N/A']] as Array<[AbstentionReview, string]>).map(([value, label]) => <ChoiceButton key={value} active={draft.release_signals.correct_abstention === value} disabled={locked} onClick={() => replaceDraft({ ...draft, release_signals: { ...draft.release_signals, correct_abstention: value } })}>{label}</ChoiceButton>)}</div></div>
            </section>

            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <h2 className="mb-3 font-[var(--font-display)] text-xl font-semibold">Terminal Label</h2><div className="grid gap-2">{TERMINAL_LABELS.map(label => <ChoiceButton key={label} active={draft.terminal_label === label} disabled={locked} onClick={() => replaceDraft({ ...draft, terminal_label: label })}>{terminalLabels[label]}</ChoiceButton>)}</div>
              <h3 className="mb-2 mt-5 text-sm font-semibold">Error tags</h3><div className="flex flex-wrap gap-2">{ERROR_TAGS.map(tag => { const active = draft.error_tags.includes(tag); return <ChoiceButton key={tag} active={active} disabled={locked} onClick={() => replaceDraft({ ...draft, error_tags: active ? draft.error_tags.filter(item => item !== tag) : [...draft.error_tags, tag] })}>{tag}</ChoiceButton> })}</div>
              <textarea disabled={locked} value={draft.notes} onChange={event => replaceDraft({ ...draft, notes: event.target.value })} placeholder="Reviewer notes …" className="mt-4 min-h-24 w-full rounded-xl border border-[var(--color-border)] p-3 text-sm outline-none focus:border-[var(--color-gold)] disabled:bg-[var(--color-bg-alt)]" />
            </section>

            {!locked ? <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">{completion.blockers.length > 0 && <div className="mb-4 flex gap-2 rounded-xl bg-[var(--color-gold-light)] p-3 text-xs leading-5 text-[var(--color-ink-soft)]"><AlertTriangle className="mt-0.5 shrink-0 text-[var(--color-gold)]" size={16} /><span>Noch offen: {completion.blockers.slice(0, 3).join(' · ')}{completion.blockers.length > 3 ? ` · +${completion.blockers.length - 3}` : ''}</span></div>}<button type="button" disabled={busy || completion.complete !== completion.total} onClick={finishReview} className="w-full rounded-xl bg-[var(--color-ink)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35">Review finalisieren & hashen</button><p className="mt-3 text-center text-xs leading-5 text-[var(--color-ink-muted)]">Finalisierung sperrt das Review. Änderungen erzeugen anschließend einen neuen Review-Record.</p></section> : finalReview ? <section className="rounded-2xl border border-[var(--color-green)]/30 bg-[var(--color-green-light)] p-5"><div className="mb-3 flex items-center gap-2 font-semibold text-[var(--color-green)]"><CheckCircle2 size={19} /> Immutable review</div><p className="mb-1 text-xs text-[var(--color-ink-muted)]">Payload SHA-256</p><code className="block break-all rounded-lg bg-white/70 p-2 text-[11px]">{finalReview.integrity.payload_sha256}</code><button type="button" onClick={() => downloadJson(`${reviewCase.case_id}__${draft.reviewer_id || 'reviewer'}__review.json`, finalReview)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-green)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"><Download size={17} /> Review JSON exportieren</button><button type="button" onClick={resetReview} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-green)]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-green)]"><RotateCcw size={16} /> Neues Review desselben Runs</button></section> : null}

            <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-alt)] p-4 text-xs leading-5 text-[var(--color-ink-muted)]"><strong className="text-[var(--color-ink-soft)]">Anti-inflation:</strong> Ein exportierter Review erzeugt niemals automatisch Gold. Der Hash beweist Unverändertheit, nicht rechtliche Richtigkeit. Promotion bleibt ein separater governed process.</section>
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-xs font-semibold hover:border-[var(--color-gold)]">Anderen Case laden</button><input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importCase} />
            {error && <p className="rounded-xl bg-[var(--color-danger-bg)] px-4 py-3 text-sm text-[var(--color-danger)]">{error}</p>}
          </aside>
        </div>
      </main>
    </div>
  )
}
