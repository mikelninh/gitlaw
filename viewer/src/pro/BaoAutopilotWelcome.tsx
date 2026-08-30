import { ArrowRight, Bot, CheckCircle2, FileSearch, Scale, ShieldCheck } from 'lucide-react'
import { PERSONAS } from './welcome-personas'

export default function BaoAutopilotWelcome() {
  const baseUrl = import.meta.env.BASE_URL
  const bao = PERSONAS.bao
  const autopilotLink = `${baseUrl}#/pro/autopilot?invite=${encodeURIComponent(bao.betaToken)}&preset=${encodeURIComponent(bao.presetKey)}`
  const proLink = `${baseUrl}#/pro?invite=${encodeURIComponent(bao.betaToken)}&preset=${encodeURIComponent(bao.presetKey)}`
  const intakeViLink = `${baseUrl}#/intake/demo-nguyen?lang=vi`

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-[var(--color-bg)] to-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-border)] bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold">
            <Scale className="w-5 h-5 text-[var(--color-gold)]" /> GitLaw <span className="text-[var(--color-gold)]">Pro</span>
          </div>
          <span className="text-xs text-[var(--color-ink-muted)]">Kanzlei Autopilot · geschützte Beta</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 md:py-16 space-y-10">
        <section className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-800">
            <Bot className="w-3.5 h-3.5" /> Für Bao · V1
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold mt-5 leading-[1.05]" style={{ fontFamily: "'Georgia', serif" }}>
            Weniger Akten öffnen.<br />Mehr echte Anwaltsarbeit.
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-ink-soft)] mt-5 max-w-2xl leading-relaxed">
            GitLaw Autopilot soll dir Routinearbeit aus dem Weg räumen: Dokumente vorsortieren, fehlende Unterlagen sichtbar machen, Chronologien und Recherche vorbereiten und nur die Punkte nach oben holen, die wirklich deine anwaltliche Entscheidung brauchen.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <a href={autopilotLink} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-ink)] text-white px-5 py-3 font-semibold hover:opacity-90">
              Bao Today öffnen <ArrowRight className="w-4 h-4" />
            </a>
            <a href={proLink} className="inline-flex items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-5 py-3 font-semibold hover:border-[var(--color-gold)]">
              Ganze Kanzlei-App öffnen
            </a>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          <Card icon={<FileSearch className="w-5 h-5" />} title="Autopilot vorbereitet">
            OCR-Queue, Dokument-Triage, fehlende Pflichtunterlagen, Timeline-/Recherche-/Draft-Vorbereitung und interne Wiedervorlagen.
          </Card>
          <Card icon={<ShieldCheck className="w-5 h-5" />} title="Bao entscheidet">
            Verbindliche Fristen, substantielle Rechtsberatung, Mandatsannahme und beA-Einreichungen bleiben review- bzw. freigabepflichtig.
          </Card>
          <Card icon={<CheckCircle2 className="w-5 h-5" />} title="Gemessen statt behauptet">
            Wir messen echte Vorher-/Nachher-Minuten. Zeitersparnis wird erst ausgewiesen, wenn deine Baseline bestätigt wurde.
          </Card>
        </section>

        <section className="rounded-2xl border border-[var(--color-border)] bg-white p-6 md:p-8">
          <p className="text-xs uppercase tracking-[.18em] font-bold text-[var(--color-gold)]">Der Zielzustand</p>
          <h2 className="text-2xl md:text-3xl font-semibold mt-2">Dein Arbeitstag soll wie eine Ausnahme-Queue aussehen.</h2>
          <div className="grid md:grid-cols-2 gap-6 mt-6 text-sm">
            <div>
              <p className="font-semibold mb-3">Du sollst sehen:</p>
              <ul className="space-y-2 text-[var(--color-ink-soft)]">
                <li>• Fristkandidaten, die anwaltlich bestätigt werden müssen</li>
                <li>• Recherchepakete und Entwürfe zur fachlichen Prüfung</li>
                <li>• ungewöhnliche oder widersprüchliche Fälle</li>
                <li>• beA-Pakete, die zur Freigabe bereit sind</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">Du sollst nicht mehr täglich rekonstruieren:</p>
              <ul className="space-y-2 text-[var(--color-ink-soft)]">
                <li>• welche Unterlage noch fehlt</li>
                <li>• ob ein Dokument schon eingegangen ist</li>
                <li>• welche Akte eine OCR-/Team-Aufgabe braucht</li>
                <li>• was sich seit deiner letzten Prüfung geändert hat</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-semibold text-lg">VN-Mandantenflow separat testen</h2>
          <p className="text-sm text-blue-900/75 mt-1">Der vietnamesische Intake bleibt als eigener Eingang testbar. Er ist nicht gleichbedeutend mit einer anwaltlichen Mandatsannahme.</p>
          <a href={intakeViLink} className="inline-flex mt-4 text-sm font-semibold underline underline-offset-2">Vietnamesischen Demo-Intake öffnen →</a>
        </section>

        <section className="text-xs text-[var(--color-ink-muted)] max-w-3xl">
          Beta-Hinweis: Kanzlei Autopilot ist Assistenz- und Vorbereitungstechnik. Er ersetzt keine anwaltliche Prüfung. Insbesondere werden keine Fristen, Einreichungen oder finalen Rechtsentscheidungen still aus Systemzuständen abgeleitet.
        </section>
      </main>
    </div>
  )
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <div className="w-9 h-9 rounded-xl bg-[var(--color-bg-alt)] flex items-center justify-center text-[var(--color-gold)]">{icon}</div>
      <h2 className="font-semibold mt-4">{title}</h2>
      <p className="text-sm text-[var(--color-ink-soft)] mt-2 leading-relaxed">{children}</p>
    </div>
  )
}
