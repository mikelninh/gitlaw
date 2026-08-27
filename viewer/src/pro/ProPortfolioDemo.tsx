import { useMemo, useState } from 'react'
import { Scale, FolderOpen, Search, FileText, ShieldCheck, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react'
import './pro-theme.css'
import './pro-tone.css'

type Matter = {
  id: string
  ref: string
  client: string
  area: string
  summary: string
  facts: string[]
  research: { question: string; answer: string; sources: { label: string; verified: boolean }[] }
  open: string[]
}

const matters: Matter[] = [
  {
    id: 'miete', ref: '25/0142', client: 'Jusuf Öztürk', area: 'Mietrecht',
    summary: 'Fristlose Kündigung wegen behauptetem Zahlungsverzug. Schonfristzahlung und hilfsweise ordentliche Kündigung getrennt prüfen.',
    facts: ['Kündigung liegt vor', 'Rückstand teilweise streitig', 'Nebenkostenabrechnung bestritten', 'Räumungsklage noch nicht zugestellt'],
    research: {
      question: 'Welche Voraussetzungen gelten für fristlose Kündigung und Schonfristzahlung?',
      answer: 'Die Recherche trennt Kündigungsgrund, Zahlungsrückstand und Schonfristwirkung. Eine hilfsweise ordentliche Kündigung muss separat geprüft werden.',
      sources: [{ label: '§ 543 BGB', verified: true }, { label: '§ 569 BGB', verified: true }, { label: 'BGH VIII ZR 91/20', verified: false }],
    },
    open: ['Exakte Rückstandshöhe anhand Kontoauszügen verifizieren', 'Wortlaut der hilfsweisen ordentlichen Kündigung prüfen'],
  },
  {
    id: 'weg', ref: '25/0156', client: 'WEG Waldstraße 42', area: 'WEG-Recht',
    summary: 'Anfechtung eines Eigentümerbeschlusses nach Verwalter-Abberufung.',
    facts: ['Beschlussdatum bekannt', 'Anfechtungsabsicht dokumentiert', 'GdWE als Partei erfasst', 'Begründungsfrist noch offen'],
    research: {
      question: 'Welche Fristen und Parteien gelten nach der WEG-Reform?',
      answer: 'Die Recherche legt Anfechtungs- und Begründungsfrist getrennt offen und markiert nicht verifizierte Quellen sichtbar.',
      sources: [{ label: '§ 44 WEG', verified: false }, { label: '§ 43 WEG', verified: false }, { label: '§ 9a WEG', verified: false }],
    },
    open: ['Beschlussprotokoll im Original prüfen', 'Fristbeginn anhand Beschlussdatum bestätigen'],
  },
  {
    id: 'eigenbedarf', ref: '25/0171', client: 'Dr. Schulze', area: 'Mietrecht',
    summary: 'Eigenbedarfskündigung; 78-jährige Mieterin, 32 Jahre Mietdauer, Härtefallabwägung erforderlich.',
    facts: ['Eigenbedarf für Tochter angegeben', 'Mietdauer 32 Jahre', 'Alter 78 Jahre', 'Ersatzwohnraum nicht geklärt'],
    research: {
      question: 'Welche Anforderungen gelten für Eigenbedarf und Härtefall?',
      answer: 'Die Recherche trennt Begründung des Eigenbedarfs von der Härtefallabwägung und weist auf offene Tatsachenfragen hin.',
      sources: [{ label: '§ 573 BGB', verified: true }, { label: '§ 574 BGB', verified: true }, { label: '§ 574a BGB', verified: true }],
    },
    open: ['Gesundheitliche Belastungen nur aus Originalunterlagen übernehmen', 'Ersatzwohnraum-Situation erheben'],
  },
]

const steps = [
  { key: 'matter', label: 'Matter', icon: FolderOpen },
  { key: 'facts', label: 'Fakten', icon: FileText },
  { key: 'research', label: 'Research', icon: Search },
  { key: 'sources', label: 'Quellen', icon: ShieldCheck },
  { key: 'open', label: 'Offene Fragen', icon: AlertTriangle },
  { key: 'review', label: 'Review', icon: CheckCircle2 },
] as const

type Step = typeof steps[number]['key']

export default function ProPortfolioDemo() {
  const [matterId, setMatterId] = useState(matters[0].id)
  const [step, setStep] = useState<Step>('matter')
  const matter = useMemo(() => matters.find(m => m.id === matterId) || matters[0], [matterId])

  return (
    <div className="min-h-screen bg-[#1f2427] text-[#edf1ef]">
      <header className="border-b border-white/10 bg-[#252b2f] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#c7a86a]" />
            <span className="font-semibold">GitLaw <span className="text-[#d3b675]">Pro</span></span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/8 border border-white/10 text-white/70">Portfolio Demo</span>
          </div>
          <a href="#/pro" className="text-xs text-white/60 hover:text-white flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Echter Pilot-Login</a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="rounded-xl border border-[#9c7d45]/30 bg-[#342f25] px-4 py-3 text-sm text-[#e8d8b6] mb-5">
          <strong>Interaktive, lokale Demo.</strong> Synthetische Akten, kein Login, keine Uploads, keine Cloud-Synchronisation und keine Rechtsberatung.
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-5">
          <aside className="rounded-2xl border border-white/10 bg-[#272d31] p-3 h-max">
            <div className="px-2 py-2 text-[11px] uppercase tracking-[.16em] text-white/45">Akten</div>
            <div className="space-y-2">
              {matters.map(m => (
                <button key={m.id} onClick={() => { setMatterId(m.id); setStep('matter') }} className={`w-full text-left rounded-xl border px-3 py-3 transition ${m.id === matter.id ? 'border-[#b89a62]/50 bg-[#34383a]' : 'border-white/8 bg-[#23282b] hover:bg-[#2d3336]'}`}>
                  <div className="text-xs text-[#d3b675] font-mono">{m.ref}</div>
                  <div className="font-semibold mt-1">{m.client}</div>
                  <div className="text-xs text-white/45 mt-1">{m.area}</div>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0">
            <section className="rounded-2xl border border-white/10 bg-[#2a3034] p-5 mb-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[.16em] text-white/45">Aktive Akte · {matter.ref}</div>
                  <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">{matter.client}</h1>
                  <p className="text-white/55 mt-2 max-w-3xl">{matter.summary}</p>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 px-3 py-1 text-xs">synthetisch · lokal</span>
              </div>
            </section>

            <nav className="grid sm:grid-cols-3 xl:grid-cols-6 gap-2 mb-4">
              {steps.map(s => {
                const Icon = s.icon
                return <button key={s.key} onClick={() => setStep(s.key)} className={`rounded-xl border px-3 py-3 text-left transition ${step === s.key ? 'border-[#c7a86a]/50 bg-[#373a38]' : 'border-white/8 bg-[#252b2f] hover:bg-[#2e3437]'}`}>
                  <Icon className={`w-4 h-4 mb-2 ${step === s.key ? 'text-[#d3b675]' : 'text-white/40'}`} />
                  <div className="text-xs font-semibold">{s.label}</div>
                </button>
              })}
            </nav>

            <section className="rounded-2xl border border-white/10 bg-[#282e32] p-5 min-h-[430px]">
              <DemoPanel step={step} matter={matter} />
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

function DemoPanel({ step, matter }: { step: Step; matter: Matter }) {
  if (step === 'matter') return <Panel title="Matter zuerst" kicker="ARBEITSHYPOTHESE"><p className="text-lg text-white/70 max-w-3xl">{matter.summary}</p><div className="mt-6 grid md:grid-cols-3 gap-3"><Metric label="Fakten" value={matter.facts.length.toString()} /><Metric label="Quellen" value={matter.research.sources.length.toString()} /><Metric label="Offene Fragen" value={matter.open.length.toString()} /></div><p className="mt-6 text-sm text-white/45">Der Einstieg ist die Akte — nicht ein leerer Chat.</p></Panel>
  if (step === 'facts') return <Panel title="Relevante Fakten" kicker="FAKTEN"><div className="grid md:grid-cols-2 gap-3 mt-4">{matter.facts.map((f,i)=><div key={f} className="rounded-xl border border-white/10 bg-[#23292c] p-4"><div className="text-[10px] uppercase tracking-wider text-white/35">Fakt {i+1}</div><div className="mt-2">{f}</div></div>)}</div></Panel>
  if (step === 'research') return <Panel title="Research mit Kontext" kicker="RESEARCH"><div className="rounded-xl border border-white/10 bg-[#23292c] p-4"><div className="text-xs text-[#d3b675] uppercase tracking-wider">Frage</div><p className="text-lg mt-2">{matter.research.question}</p></div><div className="mt-3 rounded-xl border border-white/10 bg-[#303538] p-4"><div className="text-xs text-white/40 uppercase tracking-wider">Arbeitsstand</div><p className="mt-2 text-white/75 leading-relaxed">{matter.research.answer}</p></div></Panel>
  if (step === 'sources') return <Panel title="Quellen als Interface" kicker="PROVENIENZ"><div className="space-y-3 mt-4">{matter.research.sources.map(s=><div key={s.label} className="rounded-xl border border-white/10 bg-[#23292c] p-4 flex items-center justify-between gap-3"><span className="font-mono">{s.label}</span><span className={`text-xs rounded-full px-2 py-1 border ${s.verified?'border-emerald-500/25 bg-emerald-500/10 text-emerald-200':'border-amber-400/25 bg-amber-400/10 text-amber-200'}`}>{s.verified?'verifiziert':'Review nötig'}</span></div>)}</div></Panel>
  if (step === 'open') return <Panel title="Offene Fragen bleiben offen" kicker="KEINE SCHEINSICHERHEIT"><div className="space-y-3 mt-4">{matter.open.map(q=><div key={q} className="rounded-xl border border-amber-400/20 bg-amber-400/8 p-4 flex gap-3"><AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5"/><span>{q}</span></div>)}</div></Panel>
  return <Panel title="Review vor Wirkung" kicker="HUMAN REVIEW"><div className="grid md:grid-cols-2 gap-3 mt-4"><Review ok label="Fakten strukturiert" /><Review ok label="Quellen sichtbar" /><Review ok={matter.research.sources.every(s=>s.verified)} label="Alle Quellen verifiziert" /><Review ok={matter.open.length===0} label="Keine offenen Tatsachenfragen" /></div><div className="mt-5 rounded-xl border border-[#c7a86a]/25 bg-[#342f25] p-4 text-[#eadab8]"><strong>Demo-Regel:</strong> Ein schöner Entwurf ist noch kein freigegebenes Ergebnis. Offene Punkte bleiben sichtbar, bis ein Mensch sie prüft.</div></Panel>
}

function Panel({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return <><div className="text-[11px] uppercase tracking-[.16em] text-[#d3b675]">{kicker}</div><h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">{title}</h2><div className="mt-4">{children}</div></>
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-[#23292c] p-4"><div className="text-3xl font-semibold">{value}</div><div className="text-xs text-white/40 mt-1">{label}</div></div> }
function Review({ ok, label }: { ok: boolean; label: string }) { return <div className={`rounded-xl border p-4 flex gap-3 items-center ${ok?'border-emerald-500/20 bg-emerald-500/8':'border-amber-400/20 bg-amber-400/8'}`}>{ok?<CheckCircle2 className="w-5 h-5 text-emerald-300"/>:<AlertTriangle className="w-5 h-5 text-amber-300"/>}<span>{label}</span></div> }
