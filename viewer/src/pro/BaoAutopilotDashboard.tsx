import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bot, CheckCircle2, Clock3, FileCheck2, Scale, ShieldCheck, Users } from 'lucide-react'
import { getAnalyticsSnapshot, listCases, listResearch } from './store'
import { buildKanzleiAutopilotSnapshot, type AutopilotItem } from './kanzlei-autopilot'

function Item({ item }: { item: AutopilotItem }) {
  const tone = item.severity === 'critical'
    ? 'border-red-300 bg-red-50'
    : item.severity === 'review'
      ? 'border-amber-300 bg-amber-50'
      : item.severity === 'team'
        ? 'border-slate-200 bg-white'
        : 'border-emerald-200 bg-emerald-50'
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--color-ink-muted)]">{item.caseLabel}</p>
          <p className="font-semibold mt-1">{item.title}</p>
          <p className="text-sm text-[var(--color-ink-soft)] mt-1">{item.detail}</p>
        </div>
        {item.dueDate && <span className="text-xs whitespace-nowrap font-medium">{item.dueDate}</span>}
      </div>
    </div>
  )
}

export default function BaoAutopilotDashboard() {
  const cases = listCases()
  const research = listResearch()
  const analytics = getAnalyticsSnapshot()
  const snapshot = useMemo(() => buildKanzleiAutopilotSnapshot(cases, research), [cases, research])
  const previewAutomatic = snapshot.automaticQueue.slice(0, 8)
  const previewTeam = snapshot.teamQueue.slice(0, 8)

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-border)] bg-white/95 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold">
            <Scale className="w-5 h-5 text-[var(--color-gold)]" />
            GitLaw Pro <span className="text-[var(--color-gold)]">· Kanzlei Autopilot</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/pro/akten" className="hover:underline">Akten</Link>
            <Link to="/bao" className="hover:underline">Bao Beta</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" /> Ausnahme- statt Inbox-Prinzip
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold mt-4" style={{ fontFamily: "'Georgia', serif" }}>Bao, heute brauchst du nur hierhin.</h1>
          <p className="text-lg text-[var(--color-ink-soft)] max-w-3xl mt-3 leading-relaxed">
            Der Autopilot bereitet Routinearbeit vor und sortiert sie nach Autorität. Du siehst zuerst nur Fristen, ungeprüfte Recherche und andere Punkte, die wirklich anwaltliche Aufmerksamkeit brauchen.
          </p>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Metric icon={<Scale className="w-4 h-4" />} value={snapshot.activeCases} label="aktive Akten" />
          <Metric icon={<AlertTriangle className="w-4 h-4" />} value={snapshot.baoAttention.length} label="brauchen Bao" emphasis={snapshot.baoAttention.length > 0} />
          <Metric icon={<Users className="w-4 h-4" />} value={snapshot.teamQueue.length} label="Team-Queue" />
          <Metric icon={<Bot className="w-4 h-4" />} value={snapshot.automaticQueue.length} label="Autopilot vorbereitet" />
          <Metric icon={<CheckCircle2 className="w-4 h-4" />} value={snapshot.waitingCases} label="kein Eingriff nötig" />
        </section>

        <section className="grid lg:grid-cols-[1.1fr_.9fr] gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[.18em] text-red-700 font-bold">Deine Queue</p>
                <h2 className="text-2xl font-semibold">Nur anwaltliche Ausnahmen</h2>
              </div>
              <span className="text-xs text-[var(--color-ink-muted)]">Fristen werden nie still bestätigt.</span>
            </div>
            {snapshot.baoAttention.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 mb-2" />
                <p className="font-semibold">Gerade nichts auf deiner Ausnahme-Queue.</p>
                <p className="text-sm text-emerald-900/70 mt-1">Das ist der Zielzustand — nicht noch eine Inbox.</p>
              </div>
            ) : snapshot.baoAttention.slice(0, 12).map(item => <Item key={item.id} item={item} />)}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 h-fit">
            <div className="flex items-center gap-2 mb-4"><Clock3 className="w-5 h-5 text-[var(--color-gold)]" /><h2 className="font-semibold text-lg">Heute im System</h2></div>
            <div className="space-y-3 text-sm">
              <Row label="Fristen ≤ 14 Tage" value={snapshot.deadlinesWithin14Days} />
              <Row label="Mandanten-Dokumente zu prüfen" value={snapshot.unresolvedDocuments} />
              <Row label="Recherchepakete ungeprüft" value={snapshot.unreviewedResearch} />
              <Row label="Audit-/Workflow-Ereignisse" value={analytics.totalEvents} />
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
              <strong>Wichtig:</strong> Diese Beta-Oberfläche zählt echte lokale GitLaw-Pro-Zustände. Sie behauptet keine Zeitersparnis. Stunden werden erst veröffentlicht, wenn Bao die Vorher-/Nachher-Baseline bestätigt hat.
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5" /><h2 className="text-xl font-semibold">Team kann abarbeiten</h2></div>
            <div className="space-y-3">
              {previewTeam.length ? previewTeam.map(item => <Item key={item.id} item={item} />) : <Empty text="Keine offenen Team-Punkte erkannt." />}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-emerald-700" /><h2 className="text-xl font-semibold">Autopilot kann vorbereiten</h2></div>
            <div className="space-y-3">
              {previewAutomatic.length ? previewAutomatic.map(item => <Item key={item.id} item={item} />) : <Empty text="Keine neue sichere Vorbereitung nötig." />}
            </div>
            {snapshot.automaticQueue.length > previewAutomatic.length && (
              <p className="text-xs text-[var(--color-ink-muted)] mt-3">+ {snapshot.automaticQueue.length - previewAutomatic.length} weitere Routinepunkte</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink)] text-white p-6">
          <div className="flex items-start gap-3">
            <FileCheck2 className="w-6 h-6 text-[var(--color-gold)] shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-semibold">Autopilot-Grenze</h2>
              <p className="text-sm text-white/75 mt-2 max-w-3xl leading-relaxed">
                OCR, Klassifikation, Duplikatprüfung, Fakten-/Timeline-Vorschläge, Quellenrecherche, Entwürfe und vorbereitete Routine-Nachforderungen können automatisiert werden. Verbindliche Fristen, substantielle Rechtsberatung, Mandatsannahme und beA-Einreichungen bleiben freigabepflichtig. Bankdatenänderungen, Selbst-Erweiterung der Autorität und finale Rechtsentscheidungen sind blockiert.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function Metric({ icon, value, label, emphasis = false }: { icon: React.ReactNode; value: number; label: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? 'border-red-300 bg-red-50' : 'border-[var(--color-border)] bg-white'}`}>
      <div className="flex items-center gap-2 text-[var(--color-ink-muted)]">{icon}<span className="text-xs">{label}</span></div>
      <div className="text-3xl font-semibold mt-2">{value}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2"><span className="text-[var(--color-ink-soft)]">{label}</span><strong>{value}</strong></div>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">{text}</div>
}
