import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSearch,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'

type Tab = 'overview' | 'today' | 'case' | 'privacy' | 'friday'

const syntheticCase = {
  ref: 'SYN-26/0204',
  title: 'Familiennachzug · synthetischer Testfall',
  changed: [
    'Neue Heiratsurkunde (VI) eingegangen — noch nicht anwaltlich geprüft',
    'Terminbestätigung der Auslandsvertretung erkannt',
    'Beglaubigte Übersetzung weiterhin nicht vorhanden',
    'Datum 12.09.2026 erkannt — nur als Fristkandidat, nicht als bestätigte Frist',
  ],
  automatic: [
    'Dokumente inventarisieren und Duplikate prüfen',
    'OCR-/Übersetzungsarbeit vorbereiten',
    'Chronologie aus neuen Ereignissen aktualisieren',
    'Fehlende Unterlagen für eine Nachforderung vorbereiten',
    'Recherchefragen und ersten Arbeitsentwurf vorbereiten',
  ],
  bao: [
    'Fristkandidat anhand Originalquelle bestätigen oder verwerfen',
    'Dokumentverwendbarkeit prüfen',
    'Rechtliche Bewertung / Strategie freigeben',
  ],
}

const fridayOutcomes = [
  'Bao versteht in 5 Minuten, was automatisiert wird und was bewusst bei ihm bleibt.',
  'Privacy Challenge besteht: Geheimnis-/Mandatsdaten werden vor externem Provider-Aufruf blockiert.',
  'Ein synthetischer Migrationsfall läuft Ende-zu-Ende durch Bao Today → Work Packet → Review.',
  'Ein gewöhnlicher echter Fall darf nur im Shadow Mode getestet werden: Struktur/Deltas lokal bzw. in freigegebenen Kanzleisystemen, kein externer KI-Egress.',
  'Wir messen eine echte Baseline für mindestens einen wiederkehrenden Workflow und sehen den ersten Vorher/Nachher-Zeitwert.',
  'Bao wählt die 2–3 nervigsten Arbeitsabläufe für Week 01; danach priorisieren wir nach Minuten × Häufigkeit × sicherer Automatisierbarkeit.',
]

function detectLocalSensitive(text: string): string[] {
  const checks: Array<[string, RegExp]> = [
    ['Mandats-Canary', /MANDATE-CANARY-[A-Z0-9_-]{6,}/i],
    ['E-Mail', /\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/],
    ['IBAN', /\b[A-Z]{2}\d{2}(?:[\s-]?[A-Z0-9]){11,30}\b/],
    ['Name', /\b(?:Herr|Frau|Mandant|Mandantin)\s+[A-ZÄÖÜ][a-zäöüß-]{2,}(?:\s+[A-ZÄÖÜ][a-zäöüß-]{2,})?\b/],
    ['Telefon', /\b(?:\+49|0049|0\d{2,4})[\s/.-]?\d{3,8}(?:[\s/.-]?\d{1,8})?\b/],
  ]
  return checks.filter(([, re]) => re.test(text)).map(([label]) => label)
}

export default function BaoPreview() {
  const [tab, setTab] = useState<Tab>('overview')
  const [privacyText, setPrivacyText] = useState('Frau Mustermann, test@example.com, DE89370400440532013000 MANDATE-CANARY-ABC123')
  const detected = useMemo(() => detectLocalSensitive(privacyText), [privacyText])
  const blocked = detected.length > 0

  return (
    <div className="min-h-screen bg-[#f6f7f3] text-[#17231d]">
      <header className="sticky top-0 z-10 border-b border-[#dfe5df] bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <a href="#/" className="flex items-center gap-2 font-semibold">
            <Scale className="w-5 h-5 text-[#a47727]" />
            GitLaw <span className="text-[#a47727]">Kanzlei Autopilot</span>
          </a>
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
            SYNTHETIC SANDBOX · keine echten Mandatsdaten
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <section className="grid lg:grid-cols-[1.15fr_.85fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#dfe5df] px-3 py-1 text-xs font-bold text-emerald-800">
              <Sparkles className="w-3.5 h-3.5" /> Vorschau für unsere Session
            </div>
            <h1 className="mt-5 text-4xl md:text-6xl font-semibold leading-[1.02]" style={{ fontFamily: "'Georgia', serif" }}>
              Die Kanzlei arbeitet vor.<br />Du entscheidest das Wichtige.
            </h1>
            <p className="mt-5 text-lg text-[#516159] max-w-2xl leading-relaxed">
              Ziel: Dokumentchaos, Nachforderungen, Akten-Rekonstruktion, Recherchevorbereitung und Entwurfsarbeit verschwinden weitgehend aus deinem Tag. GitLaw bereitet vor und zeigt dir eine kleine Ausnahme-Queue. Rechtliche Bewertung, verbindliche Fristen und Außenhandlungen bleiben bei dir.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-7">
              <button onClick={() => setTab('today')} className="rounded-xl bg-[#17231d] text-white px-5 py-3 font-semibold inline-flex items-center justify-center gap-2">
                Bao Today ausprobieren <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#/pro-demo" className="rounded-xl border border-[#cfd8d1] bg-white px-5 py-3 font-semibold text-center hover:border-[#a47727]">
                Ganze synthetische Kanzlei-Demo
              </a>
            </div>
          </div>

          <div className="rounded-3xl bg-[#17231d] text-white p-6 md:p-7 shadow-xl">
            <p className="text-xs uppercase tracking-[.2em] text-emerald-200">Zielbild</p>
            <p className="text-2xl font-semibold mt-2">Nicht 50 Akten. 5 Entscheidungen.</p>
            <div className="mt-6 space-y-3 text-sm">
              <Metric label="Dokumente vorsortiert" value="37" />
              <Metric label="Nachforderungen vorbereitet" value="11" />
              <Metric label="Recherchepakete vorbereitet" value="4" />
              <Metric label="Entwürfe vorbereitet" value="6" />
              <Metric label="Braucht Anwalt" value="5" accent />
            </div>
            <p className="mt-5 text-xs text-white/55">Illustratives Zielbild, keine gemessenen Kundenergebnisse.</p>
          </div>
        </section>

        <nav className="mt-12 flex gap-2 overflow-x-auto pb-2">
          <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Was ist das?</TabButton>
          <TabButton active={tab === 'today'} onClick={() => setTab('today')}>Bao Today</TabButton>
          <TabButton active={tab === 'case'} onClick={() => setTab('case')}>Work Packet</TabButton>
          <TabButton active={tab === 'privacy'} onClick={() => setTab('privacy')}>Privacy Challenge</TabButton>
          <TabButton active={tab === 'friday'} onClick={() => setTab('friday')}>Was wir Freitag wollen</TabButton>
        </nav>

        <section className="mt-4">
          {tab === 'overview' && <Overview onNext={() => setTab('today')} />}
          {tab === 'today' && <BaoToday onCase={() => setTab('case')} />}
          {tab === 'case' && <CasePacket />}
          {tab === 'privacy' && (
            <PrivacyChallenge
              value={privacyText}
              onChange={setPrivacyText}
              detected={detected}
              blocked={blocked}
            />
          )}
          {tab === 'friday' && <Friday />}
        </section>

        <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex gap-3 items-start">
          <TriangleAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-950">
            <strong>Bitte heute keine echten Mandatsdaten eingeben.</strong> Diese öffentliche Vorschau ist absichtlich nur ein synthetischer Sandbox-Flow. Den echten Shadow Pilot richten wir gemeinsam mit expliziten Datenschutz-/Geheimnisgrenzen ein.
          </div>
        </section>
      </main>
    </div>
  )
}

function Overview({ onNext }: { onNext: () => void }) {
  const cards = [
    [<FileSearch className="w-5 h-5" />, 'Routine verschwindet', 'Eingänge, Dokumentstatus, fehlende Unterlagen, Chronologie, Recherchefragen und Entwurfsarbeit werden vorbereitet.'],
    [<ShieldCheck className="w-5 h-5" />, 'Anwalt bleibt Autorität', 'Verbindliche Fristen, Rechtsrat, Mandatsannahme und beA-/Behörden-Sends sind nicht still automatisierbar.'],
    [<Clock3 className="w-5 h-5" />, 'Wir messen Minuten', 'Keine erfundenen ROI-Zahlen: vor/nach jedem Workflow messen wir aktive Minuten und Korrekturen.'],
  ] as const
  return (
    <div className="rounded-3xl border border-[#dfe5df] bg-white p-6 md:p-8">
      <p className="text-xs uppercase tracking-[.2em] font-bold text-[#a47727]">In 60 Sekunden</p>
      <h2 className="text-3xl font-semibold mt-2">Was soll sich in deinem Alltag ändern?</h2>
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {cards.map(([icon, title, body]) => (
          <div key={title} className="rounded-2xl border border-[#e4e9e4] bg-[#fafbf8] p-5">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#e4e9e4] flex items-center justify-center text-[#a47727]">{icon}</div>
            <h3 className="font-semibold mt-4">{title}</h3>
            <p className="text-sm text-[#596860] mt-2 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
      <button onClick={onNext} className="mt-6 inline-flex items-center gap-2 font-semibold text-emerald-800">
        Zeig mir meinen neuen Morgen <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function BaoToday({ onCase }: { onCase: () => void }) {
  return (
    <div className="rounded-3xl border border-[#dfe5df] bg-white overflow-hidden">
      <div className="p-6 md:p-8 border-b border-[#e7ebe7] flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] font-bold text-emerald-700">Bao Today · synthetische Vorschau</p>
          <h2 className="text-3xl font-semibold mt-2">Guten Morgen. 3 Dinge brauchen dich.</h2>
        </div>
        <Bot className="w-7 h-7 text-emerald-700" />
      </div>
      <div className="grid lg:grid-cols-2 gap-0">
        <div className="p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-[#e7ebe7]">
          <p className="text-sm font-bold text-amber-800">BRAUCHT ANWALT · 3</p>
          <div className="mt-4 space-y-3">
            {syntheticCase.bao.map((item, i) => (
              <button key={item} onClick={onCase} className="w-full text-left rounded-xl border border-amber-200 bg-amber-50 p-4 hover:border-amber-400">
                <span className="text-xs font-bold text-amber-700">SYN-26/0204 · #{i + 1}</span>
                <p className="font-medium mt-1">{item}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="p-6 md:p-8 bg-[#fafbf8]">
          <p className="text-sm font-bold text-emerald-800">BEREITS VORBEREITET · 5</p>
          <ul className="mt-4 space-y-3">
            {syntheticCase.automatic.map(item => (
              <li key={item} className="flex gap-2 text-sm text-[#53635a]"><CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />{item}</li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl border border-[#dfe5df] bg-white p-4 text-xs text-[#617067]">
            Externe Nachrichten: <strong>0</strong> · Rechtliche Entscheidungen: <strong>0</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

function CasePacket() {
  return (
    <div className="rounded-3xl border border-[#dfe5df] bg-white p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-emerald-700">{syntheticCase.ref}</p>
          <h2 className="text-3xl font-semibold mt-1">{syntheticCase.title}</h2>
        </div>
        <span className="rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-3 py-1">100% SYNTHETISCH</span>
      </div>
      <div className="grid md:grid-cols-3 gap-5 mt-7">
        <Packet title="Seit deiner letzten Prüfung" icon={<FileCheck2 className="w-4 h-4" />} items={syntheticCase.changed} />
        <Packet title="Autopilot bereitet vor" icon={<Bot className="w-4 h-4" />} items={syntheticCase.automatic} />
        <Packet title="Nur du entscheidest" icon={<Scale className="w-4 h-4" />} items={syntheticCase.bao} />
      </div>
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-semibold text-emerald-950">Das Ziel ist nicht „mehr KI“.</p>
        <p className="text-sm text-emerald-900/80 mt-1">Das Ziel ist: du öffnest die Akte erst, wenn bereits klar ist, was neu ist, was fehlt, welche Quellen relevant sind und welche echte Entscheidung noch bei dir liegt.</p>
      </div>
    </div>
  )
}

function PrivacyChallenge({ value, onChange, detected, blocked }: { value: string; onChange: (v: string) => void; detected: string[]; blocked: boolean }) {
  return (
    <div className="rounded-3xl border border-[#dfe5df] bg-white p-6 md:p-8">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm"><LockKeyhole className="w-4 h-4" /> Privacy Challenge</div>
        <h2 className="text-3xl font-semibold mt-2">Versuch, ein künstliches Mandatsgeheimnis durchzubekommen.</h2>
        <p className="text-sm text-[#5a6961] mt-3 leading-relaxed">
          Diese öffentliche Demo führt nur einen lokalen Browser-Check aus und sendet den Text nirgendwohin. Im geschützten Pilot gibt es zusätzlich einen serverseitigen Fail-Closed-Gate vor jedem externen KI-Aufruf.
        </p>
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={5} className="mt-6 w-full rounded-xl border border-[#ccd6ce] p-4 font-mono text-sm focus:outline-none focus:border-emerald-700" />
      <div className={`mt-4 rounded-2xl border p-5 ${blocked ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="flex items-center gap-2 font-bold">
          {blocked ? <><ShieldCheck className="w-5 h-5 text-red-700" /> BLOCK · Provider Calls 0</> : <><CheckCircle2 className="w-5 h-5 text-emerald-700" /> Keine direkten Kennungen erkannt</>}
        </div>
        {blocked ? (
          <p className="text-sm mt-2 text-red-900">Erkannt: {detected.join(' · ')}. In der echten Privacy-Gate-Architektur darf der externe Aufruf hier gar nicht erst beginnen.</p>
        ) : (
          <p className="text-sm mt-2 text-emerald-900">Das bedeutet noch nicht automatisch „Mandatsdaten dürfen raus“. Ein echter Fall bleibt ohne explizite Klassifizierung, Zweck, Provider-/AVV-Freigaben und weitere Gates weiterhin gesperrt.</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button onClick={() => onChange('MANDATE-CANARY-DO-NOT-EGRESS-123456')} className="text-xs rounded-lg border border-[#d7ded8] px-3 py-2">Canary testen</button>
        <button onClick={() => onChange('Person A beantragt eine Verlängerung nach § 8 AufenthG.')} className="text-xs rounded-lg border border-[#d7ded8] px-3 py-2">Pseudonymisierten Text testen</button>
      </div>
    </div>
  )
}

function Friday() {
  return (
    <div className="rounded-3xl border border-[#dfe5df] bg-white p-6 md:p-8">
      <p className="text-xs uppercase tracking-[.2em] font-bold text-[#a47727]">Definition of Done · Freitag</p>
      <h2 className="text-3xl font-semibold mt-2">Freitag ist erfolgreich, wenn wir nicht nur eine Demo gesehen haben.</h2>
      <p className="text-[#596860] mt-3 max-w-3xl">Wir wollen eine klare Entscheidung: ist das nützlich genug und sicher genug, um Week 01 mit einem eng begrenzten echten Shadow Pilot zu starten?</p>
      <ol className="mt-7 space-y-3">
        {fridayOutcomes.map((item, i) => (
          <li key={item} className="flex gap-3 rounded-xl border border-[#e4e9e4] bg-[#fafbf8] p-4">
            <span className="w-7 h-7 rounded-full bg-[#17231d] text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
            <span className="text-sm leading-relaxed">{item}</span>
          </li>
        ))}
      </ol>
      <div className="mt-7 grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-bold text-emerald-950">GO</p>
          <p className="text-sm text-emerald-900 mt-1">Bao sees a real workload win, safety boundaries are understandable/testable, and a Shadow Mode workflow is selected.</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-950">STOP</p>
          <p className="text-sm text-red-900 mt-1">Any unexplained data egress, cross-matter access, silent deadline/legal decision, or unclear provider boundary.</p>
        </div>
      </div>
    </div>
  )
}

function Packet({ title, icon, items }: { title: string; icon: React.ReactNode; items: readonly string[] }) {
  return (
    <div className="rounded-2xl border border-[#e3e9e4] bg-[#fafbf8] p-5">
      <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
      <ul className="mt-4 space-y-2 text-sm text-[#58675f]">
        {items.map(item => <li key={item} className="leading-relaxed">• {item}</li>)}
      </ul>
    </div>
  )
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${accent ? 'bg-amber-300 text-[#17231d]' : 'bg-white/8'}`}>
      <span>{label}</span><strong className="text-lg">{value}</strong>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold border ${active ? 'bg-[#17231d] text-white border-[#17231d]' : 'bg-white border-[#dfe5df] hover:border-[#a47727]'}`}>
      {children}
    </button>
  )
}
