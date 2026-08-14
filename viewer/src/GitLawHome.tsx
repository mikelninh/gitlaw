import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Heart,
  Home,
  MessageCircle,
  Scale,
  Search,
  ShieldCheck,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { detectLegalScenario, extractRecognizedFacts, type LegalScenario } from './legal-scenarios'

const examples = [
  { icon: Briefcase, category: 'Arbeit', text: 'Mein Arbeitgeber hat mir heute schriftlich gekündigt.' },
  { icon: ShoppingBag, category: 'Verbraucher', text: 'Der Händler will meinen defekten Laptop nicht reparieren.' },
  { icon: FileSearch, category: 'Soziales', text: 'Das Jobcenter hat meinen Bürgergeld-Antrag abgelehnt.' },
  { icon: MessageCircle, category: 'Online', text: 'Jemand beleidigt und bedroht mich auf Instagram.' },
  { icon: Heart, category: 'Gesundheit', text: 'Meine Krankenkasse übernimmt mein Medikament nicht.' },
  { icon: Home, category: 'Miete', text: 'Ist meine Miete in Friedrichshain zu teuer? 2.000 Euro für 50 qm2.' },
]

interface Orientation {
  question: string
  scenario: LegalScenario | null
  facts: string[]
}

export default function GitLawHome() {
  const [question, setQuestion] = useState('')
  const [orientation, setOrientation] = useState<Orientation | null>(null)

  function assess(nextQuestion?: string) {
    const query = (nextQuestion ?? question).trim()
    if (!query) return
    setQuestion(query)
    const scenario = detectLegalScenario(query)
    setOrientation({
      question: query,
      scenario,
      facts: scenario ? extractRecognizedFacts(query, scenario) : [],
    })
    window.setTimeout(() => document.getElementById('orientation')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20)
  }

  return (
    <div className="min-h-screen bg-[#f8f8f4] text-[#171714]">
      <header className="border-b border-[#deded6] bg-[#f8f8f4]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-5">
          <a href="#/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="w-8 h-8 rounded-xl bg-[#171714] text-[#d6a84b] grid place-items-center font-display">§</span>
            GitLaw
          </a>
          <span className="hidden sm:block text-xs text-[#6f6f67]">Source-grounded legal decision support</span>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <a href="#/research" className="hidden sm:inline text-[#5f5f58] hover:text-[#171714]">Gesetze durchsuchen</a>
            <a href="#/mietrecht" className="text-[#5f5f58] hover:text-[#171714]">Mietrecht-Demo</a>
            <a href="#/pro" className="font-medium">Für Kanzleien <span aria-hidden>↗</span></a>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[#deded6]">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -top-32 right-[-8rem] w-[32rem] h-[32rem] rounded-full bg-[#f1e6ca] blur-3xl opacity-70" />
            <div className="absolute bottom-[-14rem] left-[-8rem] w-[30rem] h-[30rem] rounded-full bg-[#e5eee9] blur-3xl opacity-70" />
          </div>
          <div className="relative max-w-5xl mx-auto px-5 pt-16 pb-14 md:pt-24 md:pb-20">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d5c28e] bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#7a5b17] mb-6">
                <ShieldCheck className="w-3.5 h-3.5" />
                Konzeptdemo · 5.936 Bundesgesetze · ohne Anmeldung
              </div>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-[1.06] tracking-[-0.035em]">
                Aus einer Rechtsfrage wird ein <span className="text-[#9a6e13]">prüfbarer nächster Schritt.</span>
              </h1>
              <p className="mt-6 text-lg md:text-xl leading-relaxed text-[#55554f] max-w-2xl mx-auto">
                Schildere dein Problem in deinen eigenen Worten. GitLaw erkennt das mögliche Rechtsgebiet,
                fragt nach entscheidenden Fakten und zeigt, worauf die Einordnung beruht.
              </p>
            </div>

            <div className="mt-10 max-w-3xl mx-auto rounded-[28px] bg-white border border-[#d9d9d1] shadow-[0_24px_80px_rgba(32,32,24,0.10)] p-4 sm:p-5">
              <label htmlFor="legal-question" className="block text-sm font-semibold mb-2">Was ist passiert?</label>
              <textarea
                id="legal-question"
                value={question}
                onChange={event => setQuestion(event.target.value)}
                onKeyDown={event => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') assess()
                }}
                rows={4}
                placeholder="Zum Beispiel: Mein Arbeitgeber hat mir heute schriftlich gekündigt. Was muss ich jetzt beachten?"
                className="w-full rounded-2xl border border-[#d8d8d0] bg-[#fcfcfa] px-4 py-4 text-base leading-relaxed outline-none resize-none focus:border-[#b4872e] focus:ring-4 focus:ring-[#f3ead5]"
              />
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={() => assess()}
                  disabled={!question.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#171714] text-white px-5 py-3 font-semibold disabled:opacity-40 hover:bg-[#2d2d28] transition-colors"
                >
                  Fall einordnen <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-[#73736c]">Keine personenbezogenen Daten eingeben · Strg/⌘ + Enter</p>
              </div>
            </div>

            <div className="mt-8 max-w-5xl mx-auto">
              <p className="text-center text-xs uppercase tracking-[0.2em] text-[#77776f] mb-4">Oder einen häufigen Fall testen</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {examples.map(example => {
                  const Icon = example.icon
                  return (
                    <button
                      key={example.text}
                      onClick={() => assess(example.text)}
                      className="group text-left rounded-2xl border border-[#dcdcd4] bg-white/70 p-4 hover:bg-white hover:border-[#c9ae6b] hover:-translate-y-0.5 transition-all"
                    >
                      <span className="flex items-center gap-2 text-xs font-semibold text-[#8a671c]">
                        <Icon className="w-4 h-4" /> {example.category}
                      </span>
                      <span className="block mt-2 text-sm leading-relaxed text-[#393934] group-hover:text-black">{example.text}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {orientation ? (
          <section id="orientation" className="scroll-mt-20 max-w-4xl mx-auto px-5 py-14">
            {orientation.scenario ? (
              <ScenarioResult orientation={orientation} />
            ) : (
              <UnknownResult question={orientation.question} onRefine={() => document.getElementById('legal-question')?.focus()} />
            )}
          </section>
        ) : (
          <section className="max-w-5xl mx-auto px-5 py-16">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-xs uppercase tracking-[0.22em] font-semibold text-[#8a671c]">Was du danach weißt</p>
              <h2 className="font-display text-3xl mt-3">Orientierung statt Antwortnebel.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-9">
              {[
                ['01', 'Was jetzt zählt', 'GitLaw trennt das wahrscheinliche Rechtsproblem von den Angaben, die noch fehlen.'],
                ['02', 'Was du heute tun kannst', 'Ein konkreter nächster Schritt – inklusive Hinweis, was du nicht vorschnell tun solltest.'],
                ['03', 'Warum das prüfbar ist', 'Originalquellen, erkannte Fakten und Unsicherheit bleiben sichtbar.'],
              ].map(([number, title, text]) => (
                <article key={number} className="rounded-2xl border border-[#dcdcd4] bg-white p-6">
                  <span className="text-xs font-mono text-[#9a6e13]">{number}</span>
                  <h3 className="font-display text-xl mt-4">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#65655e]">{text}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="bg-[#171714] text-white">
          <div className="max-w-5xl mx-auto px-5 py-16">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] font-semibold text-[#d6a84b]">Portfolio proof</p>
                <h2 className="font-display text-3xl md:text-4xl mt-3">Kein allgemeiner Chatbot. Eine überprüfbare Legal-AI-Architektur.</h2>
                <p className="mt-4 text-[#c9c9c0] leading-relaxed max-w-xl">
                  Mietrecht ist das erste vertiefte Modul. Dieselbe Pipeline strukturiert Fälle aus Arbeit,
                  Verbraucherrecht, Sozialrecht, Gesundheit, Familie und digitalem Recht.
                </p>
                <a href="#/mietrecht" className="inline-flex items-center gap-2 mt-7 rounded-xl bg-[#d6a84b] text-[#171714] px-5 py-3 font-semibold">
                  Flagship-Modul testen <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['5.936', 'Bundesgesetze'],
                  ['94K+', 'Paragraph-Knoten'],
                  ['Hybrid', 'BM25 + FAISS'],
                  ['53/53', 'Citation checks'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                    <p className="font-display text-2xl text-[#e1bd70]">{value}</p>
                    <p className="text-xs text-[#b7b7ad] mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
              {[
                [Search, '1. Verstehen', 'Rechtsgebiet und Fakten erkennen'],
                [BookOpen, '2. Belegen', 'Gesetze und Verweise abrufen'],
                [CheckCircle2, '3. Prüfen', 'Zitate lokal verifizieren'],
                [Users, '4. Übergeben', 'Menschliche Prüfung vorbereiten'],
              ].map(([Icon, title, text]) => {
                const StepIcon = Icon as typeof Search
                return (
                  <div key={String(title)} className="rounded-2xl border border-white/10 p-4">
                    <StepIcon className="w-5 h-5 text-[#d6a84b]" />
                    <p className="font-semibold mt-3">{String(title)}</p>
                    <p className="text-xs text-[#aead9f] mt-1">{String(text)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#deded6] bg-[#f8f8f4]">
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col sm:flex-row gap-4 sm:items-center text-sm text-[#66665f]">
          <span>GitLaw · Michael Ninh · Berlin</span>
          <div className="sm:ml-auto flex gap-4">
            <a href="#/research" className="hover:text-black">Vollrecherche</a>
            <a href="https://github.com/mikelninh/gitlaw" target="_blank" rel="noreferrer" className="hover:text-black">Code ↗</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ScenarioResult({ orientation }: { orientation: Orientation }) {
  const scenario = orientation.scenario!
  return (
    <article className="rounded-[28px] border border-[#d8d8d0] bg-white shadow-[0_18px_60px_rgba(32,32,24,0.08)] overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#f3ead5] text-[#795913] px-3 py-1 text-xs font-semibold">{scenario.category}</span>
          <span className="rounded-full bg-[#e8f2eb] text-[#27643a] px-3 py-1 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Geprüfter Entscheidungsweg
          </span>
        </div>
        <p className="mt-5 text-xs uppercase tracking-[0.2em] text-[#77776f]">Vorläufige Orientierung</p>
        <h2 className="font-display text-3xl sm:text-4xl mt-2">{scenario.title}</h2>
        <p className="mt-4 text-base sm:text-lg leading-relaxed text-[#505049]">{scenario.summary}</p>

        {scenario.urgency && (
          <div className="mt-6 rounded-2xl bg-[#fff5e7] border border-[#edd1a3] p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[#9a6210] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#744a0b]">Jetzt beachten</p>
              <p className="text-sm text-[#735c39] mt-1">{scenario.urgency}</p>
            </div>
          </div>
        )}

        {orientation.facts.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.16em] font-semibold text-[#77776f]">Aus deiner Frage erkannt</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {orientation.facts.map(fact => (
                <span key={fact} className="rounded-lg border border-[#d8d8d0] bg-[#fafaf7] px-3 py-1.5 text-sm">{fact}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 rounded-2xl bg-[#eef4f0] p-5">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#437052]">Dein nächster Schritt</p>
          <p className="mt-2 font-semibold text-lg">{scenario.nextSteps[0]}</p>
        </div>

        <div className="mt-4 rounded-2xl border border-[#ead8d3] bg-[#fffafa] p-5">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#95534a]">Nicht vorschnell tun</p>
          <p className="mt-2 text-sm leading-relaxed text-[#684d48]">{scenario.avoid}</p>
        </div>
      </div>

      <div className="border-t border-[#e1e1da] bg-[#fbfbf8] px-6 sm:px-8 py-3">
        <details className="group border-b border-[#e1e1da] py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between font-semibold">
            Was GitLaw noch wissen muss
            <span className="text-[#8a671c] group-open:rotate-45 transition-transform text-xl">+</span>
          </summary>
          <ul className="mt-4 space-y-2 text-sm text-[#5b5b54]">
            {scenario.missingFacts.map(item => <li key={item} className="flex gap-2"><span className="text-[#9a6e13]">•</span>{item}</li>)}
          </ul>
        </details>
        <details className="group border-b border-[#e1e1da] py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between font-semibold">
            Weitere Schritte und Unterlagen
            <span className="text-[#8a671c] group-open:rotate-45 transition-transform text-xl">+</span>
          </summary>
          <div className="grid md:grid-cols-2 gap-6 mt-4 text-sm">
            <div>
              <p className="font-semibold mb-2">Danach</p>
              <ol className="space-y-2 text-[#5b5b54]">
                {scenario.nextSteps.slice(1).map((step, index) => <li key={step}>{index + 2}. {step}</li>)}
              </ol>
            </div>
            <div>
              <p className="font-semibold mb-2">Bereithalten</p>
              <ul className="space-y-2 text-[#5b5b54]">
                {scenario.documents.map(document => <li key={document} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-[#4f7a5d] shrink-0 mt-0.5" />{document}</li>)}
              </ul>
            </div>
          </div>
        </details>
        <details className="group py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between font-semibold">
            Gesetzliche Ausgangspunkte
            <span className="text-[#8a671c] group-open:rotate-45 transition-transform text-xl">+</span>
          </summary>
          <div className="mt-4 grid gap-2">
            {scenario.sources.map(source => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="rounded-xl border border-[#deded6] bg-white p-4 hover:border-[#c9ae6b] flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-[#9a6e13] mt-0.5 shrink-0" />
                <span className="flex-1">
                  <span className="font-semibold text-sm">{source.label}</span>
                  <span className="block text-xs text-[#6d6d65] mt-1">{source.why}</span>
                </span>
                <ExternalLink className="w-4 h-4 text-[#86867e]" />
              </a>
            ))}
          </div>
        </details>
      </div>

      <div className="border-t border-[#d8d8d0] p-5 sm:px-8 flex flex-col sm:flex-row gap-3 sm:items-center">
        <p className="text-xs text-[#77776f] flex-1">Orientierung und Recherchehilfe, keine individuelle Rechtsberatung.</p>
        <a
          href={scenario.deepLink ?? '#/research'}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#171714] text-white px-5 py-3 text-sm font-semibold hover:bg-[#30302b]"
        >
          {scenario.deepLink ? 'Vertieften Mietrechts-Check öffnen' : 'In den Gesetzen weiter recherchieren'}
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </article>
  )
}

function UnknownResult({ question, onRefine }: { question: string; onRefine: () => void }) {
  return (
    <article className="rounded-[28px] border border-[#d8d8d0] bg-white p-7 sm:p-9">
      <span className="rounded-full bg-[#f3ead5] text-[#795913] px-3 py-1 text-xs font-semibold">Unsicherheit sichtbar</span>
      <h2 className="font-display text-3xl mt-5">Noch kein geprüfter Entscheidungsweg erkannt.</h2>
      <p className="mt-4 text-[#5d5d56] leading-relaxed">
        GitLaw rät hier nicht. Ergänze bitte, wer was getan hat, wann es passiert ist,
        welches Schreiben vorliegt und was du erreichen möchtest.
      </p>
      <blockquote className="mt-5 rounded-xl bg-[#f7f7f3] border-l-4 border-[#c49a43] p-4 text-sm text-[#55554f]">„{question}“</blockquote>
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button onClick={onRefine} className="rounded-xl bg-[#171714] text-white px-5 py-3 text-sm font-semibold">Frage ergänzen</button>
        <a href="#/research" className="rounded-xl border border-[#d1d1ca] px-5 py-3 text-sm font-semibold text-center">Alle Gesetze durchsuchen</a>
      </div>
    </article>
  )
}
