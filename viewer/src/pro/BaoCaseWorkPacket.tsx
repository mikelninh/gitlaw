import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, Clipboard, FileText, Search, ShieldCheck, Users } from 'lucide-react'
import { getCase, listLetters, listResearch } from './store'
import { buildKanzleiWorkPacket } from './kanzlei-work-packet'

export default function BaoCaseWorkPacket() {
  const { caseId } = useParams<{ caseId: string }>()
  const [copied, setCopied] = useState<string>('')
  const c = caseId ? getCase(caseId) : undefined

  if (!c) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-semibold">Akte nicht gefunden.</p>
        <Link to="/pro/autopilot" className="inline-flex items-center gap-2 mt-3 text-sm underline"><ArrowLeft className="w-4 h-4" /> Zurück zu Bao Today</Link>
      </div>
    )
  }

  const packet = buildKanzleiWorkPacket(c, listResearch(c.id), listLetters(c.id))

  async function copy(id: string, text?: string) {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(id)
    window.setTimeout(() => setCopied(''), 1800)
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link to="/pro/autopilot" className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:underline"><ArrowLeft className="w-3.5 h-3.5" /> Bao Today</Link>
          <p className="text-xs uppercase tracking-[.18em] font-bold text-[var(--color-gold)] mt-3">Case work packet</p>
          <h1 className="text-3xl md:text-4xl font-semibold mt-1" style={{ fontFamily: "'Georgia', serif" }}>{packet.caseLabel}</h1>
          <p className="text-[var(--color-ink-soft)] mt-2">{packet.matterType} · Status: {packet.currentStatus}</p>
        </div>
        <Link to={`/pro/akten/${c.id}`} className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold hover:border-[var(--color-gold)]">Originalakte öffnen</Link>
      </div>

      {packet.deadline?.lawyerReviewRequired && (
        <section className="rounded-2xl border border-red-300 bg-red-50 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-950">Frist/Wiedervorlage anwaltlich prüfen</p>
            <p className="text-sm text-red-900/75 mt-1">{packet.deadline.label} · {packet.deadline.date}{packet.deadline.daysUntil !== null ? ` · ${packet.deadline.daysUntil} Tage` : ''}</p>
            <p className="text-xs text-red-900/65 mt-2">Der Autopilot bestätigt dieses Datum nicht als verbindliche Rechtsfrist.</p>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Metric label="Dokumente" value={packet.documents.total} />
        <Metric label="Dokument-Review" value={packet.documents.pendingReview} warning={packet.documents.pendingReview > 0} />
        <Metric label="Fehlende Pflichtdocs" value={packet.documents.missingRequired.length} warning={packet.documents.missingRequired.length > 0} />
        <Metric label="Recherche ungeprüft" value={packet.research.unreviewed} warning={packet.research.unreviewed > 0} />
        <Metric label="Entwürfe" value={packet.drafts.total} />
      </section>

      <section className="grid lg:grid-cols-3 gap-5">
        <QueueCard icon={<ShieldCheck className="w-5 h-5" />} title="Bao entscheidet" items={packet.next.bao} tone="amber" />
        <QueueCard icon={<Users className="w-5 h-5" />} title="Team" items={packet.next.team} tone="slate" />
        <QueueCard icon={<Bot className="w-5 h-5" />} title="Autopilot vorbereitet" items={packet.next.automatic} tone="emerald" />
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
          <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-[var(--color-gold)]" /><h2 className="text-xl font-semibold">Dokumentlage</h2></div>
          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
            <SmallStat label="bestätigt" value={packet.documents.approved} />
            <SmallStat label="abgelehnt" value={packet.documents.rejected} />
            <SmallStat label="zu prüfen" value={packet.documents.pendingReview} />
            <SmallStat label="ohne OCR" value={packet.documents.withoutOcr} />
          </div>
          {packet.documents.missingRequired.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-[.14em] font-bold text-[var(--color-ink-muted)]">Fehlt aktuell</p>
              <ul className="mt-2 space-y-2 text-sm">
                {packet.documents.missingRequired.map(item => <li key={item.id} className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">{item.de}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
          <div className="flex items-center gap-2"><Search className="w-5 h-5 text-[var(--color-gold)]" /><h2 className="text-xl font-semibold">Recherche & Entwürfe</h2></div>
          <div className="mt-4 text-sm space-y-3">
            <p><strong>{packet.research.verifiedCitations}/{packet.research.totalCitations}</strong> zitierte Fundstellen im gespeicherten Recherchebestand sind als verifiziert markiert.</p>
            {packet.research.openQuestions.length > 0 ? (
              <ul className="space-y-2">
                {packet.research.openQuestions.map((q, i) => <li key={`${q}-${i}`} className="rounded-lg bg-slate-50 border border-slate-200 p-3">{q}</li>)}
              </ul>
            ) : <p className="text-[var(--color-ink-muted)]">Keine ungeprüften Recherchefragen.</p>}
          </div>
          {packet.drafts.recent.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-[.14em] font-bold text-[var(--color-ink-muted)]">Letzte Entwürfe</p>
              <ul className="mt-2 space-y-2 text-sm">
                {packet.drafts.recent.map(d => <li key={d.id}>{d.title} <span className="text-[var(--color-ink-muted)]">· {new Date(d.createdAt).toLocaleDateString('de-DE')}</span></li>)}
              </ul>
            </div>
          )}
        </div>
      </section>

      {(packet.routineMessages.missingDocumentsDe || packet.routineMessages.missingDocumentsVi) && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs uppercase tracking-[.16em] font-bold text-blue-800">Vorbereitete Routinekommunikation · noch nicht gesendet</p>
          <h2 className="text-xl font-semibold mt-1">Fehlende Unterlagen</h2>
          <p className="text-sm text-blue-900/70 mt-1">Nur sachliche Dokument-Nachforderung. Copy-Paste ist vorbereitet; ein externer Auto-Versand ist in dieser V1 nicht angeschlossen.</p>
          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            <MessageBox title="Deutsch" text={packet.routineMessages.missingDocumentsDe} copied={copied === 'de'} onCopy={() => copy('de', packet.routineMessages.missingDocumentsDe)} />
            <MessageBox title="Tiếng Việt" text={packet.routineMessages.missingDocumentsVi} copied={copied === 'vi'} onCopy={() => copy('vi', packet.routineMessages.missingDocumentsVi)} />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
        <h2 className="text-xl font-semibold">Was hat sich zuletzt geändert?</h2>
        {packet.recentEvents.length ? (
          <div className="mt-4 divide-y divide-slate-100">
            {packet.recentEvents.map((e, i) => (
              <div key={`${e.at}-${e.kind}-${i}`} className="py-3 flex items-start justify-between gap-4 text-sm">
                <div><span className="font-medium">{e.label}</span><span className="ml-2 text-xs text-[var(--color-ink-muted)]">{e.kind}</span></div>
                <span className="text-xs text-[var(--color-ink-muted)] whitespace-nowrap">{new Date(e.at).toLocaleString('de-DE')}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[var(--color-ink-muted)] mt-3">Noch keine verwertbare Änderungs-Historie vorhanden.</p>}
      </section>

      <section className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-xs text-slate-600 flex gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0" /> <span>{packet.caveat}</span>
      </section>
    </div>
  )
}

function Metric({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className={`rounded-xl border p-4 ${warning ? 'border-amber-300 bg-amber-50' : 'border-[var(--color-border)] bg-white'}`}><div className="text-2xl font-semibold">{value}</div><div className="text-xs text-[var(--color-ink-muted)] mt-1">{label}</div></div>
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><strong className="text-xl">{value}</strong><div className="text-xs text-slate-500">{label}</div></div>
}

function QueueCard({ icon, title, items, tone }: { icon: React.ReactNode; title: string; items: string[]; tone: 'amber' | 'slate' | 'emerald' }) {
  const cls = tone === 'amber' ? 'border-amber-300 bg-amber-50' : tone === 'emerald' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
  return <div className={`rounded-2xl border p-5 ${cls}`}><div className="flex items-center gap-2 font-semibold">{icon}{title}</div>{items.length ? <ul className="mt-3 space-y-2 text-sm">{items.map((x, i) => <li key={`${x}-${i}`}>• {x}</li>)}</ul> : <p className="text-sm opacity-65 mt-3">Nichts offen.</p>}</div>
}

function MessageBox({ title, text, copied, onCopy }: { title: string; text?: string; copied: boolean; onCopy: () => void }) {
  if (!text) return null
  return <div className="rounded-xl bg-white border border-blue-200 p-4"><div className="flex items-center justify-between gap-3"><strong>{title}</strong><button onClick={onCopy} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:underline"><Clipboard className="w-3.5 h-3.5" />{copied ? 'Kopiert' : 'Kopieren'}</button></div><pre className="whitespace-pre-wrap font-sans text-sm text-[var(--color-ink-soft)] mt-3 leading-relaxed">{text}</pre></div>
}
