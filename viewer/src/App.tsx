import { useState, useEffect, useMemo } from 'react'
import { Search, ArrowLeft, Scale, FileText, ExternalLink, Sparkles, GitCompare, Lightbulb, MessageCircle, Send, Download, Share2 } from 'lucide-react'
import Fuse from 'fuse.js'
import { loadExplanations, reformDiffs, type Explanations } from './explain'
import { askLegalQuestion } from './rag'
import { dailyLaws, getCategoryColor } from './daily-law'
import { exportLawAsPDF, generateShareLink, copyToClipboard } from './export'
import { letterTemplates } from './templates'
import { contradictions } from './contradictions'
import { addFavorite, isFavorite, removeFavorite } from './favorites'
import './index.css'

interface LawEntry {
  id: string
  title: string
  abbreviation: string
  date: string
  stand: string
  sections: number
  lines: number
  file: string
}

// Known law abbreviation → file ID mapping for cross-linking
const lawAbbrevMap: Record<string, string> = {
  'GG': 'gg', 'StGB': 'stgb', 'BGB': 'bgb', 'StPO': 'stpo', 'ZPO': 'zpo',
  'SGB V': 'sgb_5', 'SGB VI': 'sgb_6', 'SGB II': 'sgb_2', 'SGB XII': 'sgb_12',
  'EStG': 'estg', 'AO': 'ao_1977', 'NetzDG': 'netzdg', 'TierSchG': 'tierschg',
  'AufenthG': 'aufenthg_2004', 'ArbZG': 'arbzg', 'KSchG': 'kschg',
  'MuSchG': 'muschg', 'AGG': 'agg', 'GEG': 'geg', 'BEEG': 'beeg',
  'BImSchG': 'bimschg', 'UWG': 'uwg', 'HGB': 'hgb', 'AktG': 'aktg',
  'BetrVG': 'betrvg', 'InsO': 'inso', 'VwGO': 'vwgo', 'GWB': 'gwb',
}

function inlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/§§?\s*(\d+\w*(?:\s*(?:Abs\.|Absatz|Nr\.|Nummer|Satz|Buchst\.)\s*\d+\w*)*)\s+((?:SGB\s+[IVX]+|[A-ZÄÖÜ][A-Za-zÄÖÜäöü]+))/g,
      (_match: string, num: string, abbr: string) => {
        const lawId = lawAbbrevMap[abbr.trim()]
        if (lawId) {
          return `<a href="#" onclick="event.preventDefault();window.__loadLaw&&window.__loadLaw('${lawId}')" style="color:var(--color-gold);text-decoration:underline;cursor:pointer">§ ${num} ${abbr}</a>`
        }
        return `§ ${num} ${abbr}`
      })
}

// Markdown to HTML with paragraph cross-linking
function md(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      if (trimmed === '---') return '<hr />'
      if (trimmed.startsWith('### ')) {
        const title = trimmed.slice(4)
        return `<h3 id="${title}">${inlineMd(title)}</h3>`
      }
      if (trimmed.startsWith('## ')) return `<h2>${inlineMd(trimmed.slice(3))}</h2>`
      if (trimmed.startsWith('# ')) return `<h1>${inlineMd(trimmed.slice(2))}</h1>`
      if (trimmed.startsWith('> ')) return `<blockquote>${inlineMd(trimmed.slice(2))}</blockquote>`
      return `<p>${inlineMd(trimmed)}</p>`
    })
    .join('\n')
}

function App() {
  const baseUrl = import.meta.env.BASE_URL
  const [laws, setLaws] = useState<LawEntry[]>([])
  const [search, setSearch] = useState('')
  const [fontSize, setFontSize] = useState(16)
  const [darkMode, setDarkMode] = useState(false)
  const [selectedLaw, setSelectedLaw] = useState<string | null>(null)
  const [lawContent, setLawContent] = useState('')
  const [_loading, setLoading] = useState(true)
  const [contentSearch, setContentSearch] = useState('')
  const [explanations, setExplanations] = useState<Explanations | null>(null)
  const [showExplain, setShowExplain] = useState(false)
  const [liveExplaining, setLiveExplaining] = useState(false)
  const [liveExplanation, setLiveExplanation] = useState('')
  const [activeTab, setActiveTab] = useState<'gesetze' | 'reformen' | 'fragen' | 'briefe' | 'widersprueche'>('fragen')
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [templateFields, setTemplateFields] = useState<Record<string, string>>({})
  const [generatedLetter, setGeneratedLetter] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant'; text: string; sources?: {law: string; section: string}[]}[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null)
  const [language, setLanguage] = useState<string>('de')
  const [lawError, setLawError] = useState('')

  // Expose loadLaw for cross-linking from rendered HTML
  useEffect(() => {
    (window as any).__loadLaw = loadLaw
    return () => { delete (window as any).__loadLaw }
  })

  // Load index
  useEffect(() => {
    fetch('./law-index.json')
      .then(r => r.json())
      .then(data => { setLaws(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Fuse search
  const fuse = useMemo(() => new Fuse(laws, {
    keys: [{ name: 'title', weight: 0.6 }, { name: 'abbreviation', weight: 0.4 }],
    threshold: 0.3,
    ignoreLocation: true,
  }), [laws])

  const filtered = search.length > 1
    ? fuse.search(search).map(r => r.item)
    : laws

  // Load law content
  const loadLaw = (id: string) => {
    setSelectedLaw(id)
    setLawContent('')
    setLawError('')
    setExplanations(null)
    setShowExplain(false)
    setLiveExplanation('')
    const law = laws.find(l => l.id === id)
    if (!law) return
    fetch(`./laws/${law.file}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then(text => {
        setLawContent(text)
        if (!text.trim()) setLawError('Dieser Gesetzestext ist gerade leer oder konnte nicht sauber geladen werden.')
      })
      .catch(() => {
        setLawError('Dieser Gesetzestext konnte gerade nicht geladen werden. Bitte versuche es erneut.')
      })
    loadExplanations(id).then(e => setExplanations(e))
  }

  function startQuestionFlow(question: string) {
    setActiveTab('fragen')
    setChatInput(question)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Highlight search in content
  const highlightContent = (text: string, query: string) => {
    if (!query || query.length < 2) return text
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:#F5ECD7;padding:2px 4px;border-radius:3px">$1</mark>')
  }

  // Stats removed — now shown in subtitle text directly

  // Currently viewing a specific law
  if (selectedLaw) {
    const law = laws.find(l => l.id === selectedLaw)
    const html = highlightContent(md(lawContent), contentSearch)

    return (
      <div className="min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-50 bg-bg/90 backdrop-blur-lg border-b border-border">
          <div className="max-w-4xl mx-auto flex items-center gap-4 px-5 h-14">
            <button onClick={() => { setSelectedLaw(null); setContentSearch('') }}
              className="flex items-center gap-2 text-gold hover:text-ink transition-colors cursor-pointer text-sm">
              <ArrowLeft className="w-4 h-4" /> Alle Gesetze
            </button>
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                type="text"
                placeholder="Im Gesetz suchen..."
                value={contentSearch}
                onChange={e => setContentSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-lg border border-border bg-card text-sm w-56 focus:outline-none focus:border-gold"
              />
            </div>
            {/* Favorit toggle */}
            {law && (
              <button onClick={() => {
                if (isFavorite(law.id)) { removeFavorite(law.id) } else { addFavorite(law.id, law.title) }
                setSelectedLaw(law.id) // Force re-render
              }}
                className={`text-lg cursor-pointer ${isFavorite(law.id) ? 'text-gold' : 'text-ink-muted/30 hover:text-gold'}`}
                title={isFavorite(law.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}>
                {isFavorite(law.id) ? '⭐' : '☆'}
              </button>
            )}
            {/* Font size (Barrierefreiheit) */}
            <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
              <button onClick={() => setFontSize(f => Math.max(12, f - 2))} className="px-2 py-1 text-xs text-ink-muted hover:bg-bg-alt cursor-pointer" title="Schrift kleiner">A-</button>
              <span className="text-[10px] text-ink-muted px-1">{fontSize}</span>
              <button onClick={() => setFontSize(f => Math.min(24, f + 2))} className="px-2 py-1 text-xs text-ink-muted hover:bg-bg-alt cursor-pointer" title="Schrift größer">A+</button>
            </div>
            {/* Export + Share + GitHub */}
            {law && (
              <div className="flex items-center gap-2">
                <button onClick={() => lawContent && exportLawAsPDF(lawContent)}
                  className="flex items-center gap-1 text-xs text-ink-muted hover:text-gold transition-colors cursor-pointer"
                  title="Als PDF exportieren">
                  <Download className="w-3 h-3" /> PDF
                </button>
                <button onClick={async () => {
                  const link = generateShareLink(law.id, '', '')
                  const ok = await copyToClipboard(link)
                  if (ok) alert('Link ist in der Zwischenablage.')
                }}
                  className="flex items-center gap-1 text-xs text-ink-muted hover:text-gold transition-colors cursor-pointer"
                  title="Link teilen">
                  <Share2 className="w-3 h-3" /> Teilen
                </button>
                <a href={`https://github.com/mikelninh/gitlaw/blob/main/laws/${law.file}`}
                  target="_blank" rel="noopener"
                  className="flex items-center gap-1 text-xs text-ink-muted hover:text-gold transition-colors">
                  <ExternalLink className="w-3 h-3" /> GitHub
                </a>
              </div>
            )}
          </div>
        </header>

        {/* Gesetzesstand — P0 für Anwälte */}
        {lawContent && law && (
          <div className="bg-blue-light border-b border-blue/10">
            <div className="max-w-3xl mx-auto px-5 py-2 flex items-center justify-between text-sm">
              <span className="text-blue font-medium">{law.title}</span>
              {law.stand ? (
                <span className="text-blue/70 text-xs">{law.stand}</span>
              ) : law.date ? (
                <span className="text-blue/70 text-xs">Ausfertigungsdatum: {law.date}</span>
              ) : null}
            </div>
          </div>
        )}

        {/* Explain toggle — only show if explanations exist */}
        {lawContent && explanations && Object.keys(explanations.explanations).length > 0 && (
          <div className="bg-gold-light border-b border-gold/20">
            <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
              <p className="text-sm text-ink-soft">
                {Object.keys(explanations.explanations).length} Paragraphen in einfacher Sprache erklärt
              </p>
              <button onClick={() => setShowExplain(!showExplain)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${showExplain ? 'bg-gold text-white' : 'bg-white text-gold border border-gold/30'}`}>
                <Sparkles className="w-4 h-4" />
                {showExplain ? 'Ausblenden' : 'Erklärungen zeigen'}
              </button>
            </div>
          </div>
        )}
        {/* No pre-cached explanations — offer live AI explanation */}
        {lawContent && (!explanations || Object.keys(explanations.explanations).length === 0) && (
          <div className="bg-gold-light border-b border-gold/20">
            <div className="max-w-3xl mx-auto px-5 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-soft">Gesetzestext schwer verständlich?</p>
                <button onClick={async () => {
                  if (liveExplaining) return
                  setLiveExplaining(true)
                  setLiveExplanation('')
                  try {
                    const result = await askLegalQuestion(
                      `Erkläre mir dieses Gesetz in einfacher Sprache. Was regelt es? Für wen ist es relevant? Was sind die wichtigsten Punkte? Gesetz: ${law?.title || ''}\n\nText (Auszug):\n${lawContent.slice(0, 2000)}`
                    )
                    setLiveExplanation(result.answer)
                  } catch {
                    setLiveExplanation('Die Erklärung ist nicht verfügbar — OpenAI antwortet gerade nicht. Stelle deine Frage im Chat-Tab oder versuche es in 10 Sekunden erneut.')
                  }
                  setLiveExplaining(false)
                }}
                  disabled={liveExplaining}
                  className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-xl text-sm font-medium hover:bg-gold/90 transition-colors cursor-pointer disabled:opacity-50">
                  <Sparkles className="w-4 h-4" />
                  {liveExplaining ? 'Wird erklärt...' : 'Einfach erklären'}
                </button>
              </div>
              {liveExplanation && (
                <div className="mt-3 bg-white rounded-xl p-5 border border-gold/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-gold" />
                    <span className="text-sm font-bold text-gold">In einfacher Sprache</span>
                  </div>
                  <p className="text-ink-soft leading-relaxed whitespace-pre-wrap">{liveExplanation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Law content */}
        <main className="max-w-3xl mx-auto px-5 py-8">
          {!lawContent ? (
            <div className="text-center py-20 text-ink-muted">{lawError || 'Lade Gesetzestext...'}</div>
          ) : (
            <>
              <div className="law-content" style={{ fontSize: `${fontSize}px` }} dangerouslySetInnerHTML={{ __html: html }} />
              {showExplain && explanations && (
                <div className="mt-12 border-t border-border pt-8">
                  <div className="flex items-center gap-2 mb-6">
                    <Lightbulb className="w-5 h-5 text-gold" />
                    <h2 className="font-display text-xl">Alle Paragraphen — einfach erklärt</h2>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(explanations.explanations).map(([section, text]) => (
                      <div key={section} className="bg-gold-light rounded-xl p-5 border border-gold/10">
                        <p className="font-display text-sm font-bold text-gold mb-2">{section}</p>
                        <p className="text-ink-soft leading-relaxed">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    )
  }

  // Main view — law browser
  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-[#1a1a2e] text-[#e0e0e0]' : ''}`} style={darkMode ? {background:'#1a1a2e',color:'#e0e0e0'} : {}}>
      {/* Header */}
      <header className={`border-b ${darkMode ? 'bg-[#1a1a2e] border-[#333]' : 'bg-bg border-border'}`}>
        <div className="max-w-5xl mx-auto px-5 py-12 sm:py-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="w-8 h-8 text-gold" />
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              Git<span className="text-gold">Law</span>
            </h1>
          </div>
          <p className="text-ink-soft text-lg mb-6 max-w-xl mx-auto">
            Stell zuerst deine Rechtsfrage. GitLaw zeigt dir die passenden Gesetze, erklärt sie einfacher und führt dich erst danach in den Volltext.
          </p>
          <button onClick={() => setDarkMode(!darkMode)}
            className="text-xs text-ink-muted hover:text-gold transition-colors cursor-pointer mb-6">
            {darkMode ? '☀️ Heller Modus' : '🌙 Dunkler Modus'}
          </button>

          {/* Public handoff to the lawyer tier */}
          <div className="mb-8">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-gold/20 bg-white/75 px-4 py-2 text-sm shadow-sm">
              <span className="text-ink-soft">Für Anwält:innen:</span>
              <a
                href={`${baseUrl}#/preise`}
                className="font-medium text-gold hover:underline"
              >
                GitLaw Pro ansehen
              </a>
              <span className="text-ink-muted">·</span>
              <a
                href={`${baseUrl}#/pro`}
                className="font-medium text-ink hover:underline"
              >
                Beta-Login
              </a>
            </div>
          </div>

          <div className="max-w-2xl mx-auto bg-white border border-border rounded-3xl p-4 sm:p-5 shadow-sm mb-6 text-left">
            <p className="text-xs font-bold text-gold uppercase tracking-widest mb-2">Am einfachsten starten</p>
            <h2 className="font-display text-2xl sm:text-3xl mb-2">1. Frage stellen 2. Antwort lesen 3. Gesetz bei Bedarf öffnen</h2>
            <p className="text-sm text-ink-muted mb-4">
              Du musst nicht wissen, welches Gesetz du brauchst. Beschreibe einfach dein Problem in normaler Sprache.
            </p>
            <div className="relative">
              <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
              <input
                type="text"
                placeholder="Zum Beispiel: Mein Vermieter will Eigenbedarf anmelden - was kann ich tun?"
                value={chatInput}
                onChange={e => {
                  setActiveTab('fragen')
                  setChatInput(e.target.value)
                }}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-card text-base sm:text-lg shadow-sm focus:outline-none focus:border-gold focus:shadow-md transition-all"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => startQuestionFlow('Mein Vermieter will Eigenbedarf anmelden - was kann ich tun?')}
                className="px-3 py-2 rounded-xl text-sm bg-bg-alt border border-border hover:border-gold/30 cursor-pointer">
                Mietrecht
              </button>
              <button onClick={() => startQuestionFlow('Mein Chef will mich kuendigen - was kann ich tun?')}
                className="px-3 py-2 rounded-xl text-sm bg-bg-alt border border-border hover:border-gold/30 cursor-pointer">
                Arbeitsrecht
              </button>
              <button onClick={() => startQuestionFlow('Ich habe einen Strafbefehl bekommen - was ist jetzt wichtig?')}
                className="px-3 py-2 rounded-xl text-sm bg-bg-alt border border-border hover:border-gold/30 cursor-pointer">
                Strafrecht
              </button>
            </div>
          </div>

          {/* Quick topics — question-first */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8 max-w-4xl mx-auto">
            {[
              { emoji: '🏠', label: 'Miete & Wohnen', q: 'Mein Vermieter will die Miete erhoehen - was darf er?' },
              { emoji: '💼', label: 'Arbeit & Job', q: 'Mein Chef will mich kuendigen - was kann ich tun?' },
              { emoji: '💰', label: 'Geld & Steuern', q: 'Welche Steuern muss ich als Arbeitnehmer oder Freelancer zahlen?' },
              { emoji: '👶', label: 'Familie & Kinder', q: 'Wie lange habe ich Elternzeit und wie viel Elterngeld bekomme ich?' },
              { emoji: '🏥', label: 'Gesundheit', q: 'Was zahlt meine Krankenkasse und wann habe ich Anspruch auf Krankengeld?' },
              { emoji: '🏦', label: 'Rente', q: 'Wann kann ich in Rente gehen und wie funktioniert die Rentenversicherung?' },
              { emoji: '🐾', label: 'Tierschutz', q: 'Was ist nach dem Tierschutzgesetz verboten und wie melde ich Tierquaelerei?' },
              { emoji: '🌐', label: 'Internet & Recht', q: 'Jemand beleidigt mich online - welche Rechte habe ich?' },
            ].map(t => (
              <button key={t.q} onClick={() => startQuestionFlow(t.q)}
                className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-gold/30 hover:shadow-sm transition-all cursor-pointer text-left">
                <span className="text-xl">{t.emoji}</span>
                <span className="text-sm font-medium text-ink">{t.label}</span>
              </button>
            ))}
          </div>

          <p className="text-sm text-ink-muted mb-4">Oder wenn du schon weißt, welches Gesetz du suchst:</p>

          {/* Search */}
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
            <input
              type="text"
              placeholder="Gesetz suchen, z. B. Grundgesetz oder StGB"
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveTab('gesetze') }}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-card text-lg shadow-sm focus:outline-none focus:border-gold focus:shadow-md transition-all"
            />
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-bg border-b border-border">
        <div className="max-w-5xl mx-auto px-5 flex gap-1 pt-2 items-center flex-wrap">
          <button onClick={() => setActiveTab('fragen')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors cursor-pointer ${activeTab === 'fragen' ? 'bg-bg-alt text-ink border border-border border-b-bg-alt' : 'text-ink-muted hover:text-ink'}`}>
            <MessageCircle className="w-4 h-4 inline mr-1.5" />Frage stellen
          </button>
          <button onClick={() => setActiveTab('gesetze')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors cursor-pointer ${activeTab === 'gesetze' ? 'bg-bg-alt text-ink border border-border border-b-bg-alt' : 'text-ink-muted hover:text-ink'}`}>
            <FileText className="w-4 h-4 inline mr-1.5" />Gesetze durchsuchen
          </button>
          <button onClick={() => setActiveTab('reformen')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors cursor-pointer ${activeTab === 'reformen' ? 'bg-bg-alt text-ink border border-border border-b-bg-alt' : 'text-ink-muted hover:text-ink'}`}>
            <GitCompare className="w-4 h-4 inline mr-1.5" />Reform-Diffs
          </button>
          <button onClick={() => setActiveTab('briefe')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors cursor-pointer ${activeTab === 'briefe' ? 'bg-bg-alt text-ink border border-border border-b-bg-alt' : 'text-ink-muted hover:text-ink'}`}>
            <FileText className="w-4 h-4 inline mr-1.5" />Musterbriefe
          </button>
          <button onClick={() => setActiveTab('widersprueche')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors cursor-pointer ${activeTab === 'widersprueche' ? 'bg-bg-alt text-ink border border-border border-b-bg-alt' : 'text-ink-muted hover:text-ink'}`}>
            ⚡ Widersprüche
          </button>
          <a
            href={`${baseUrl}#/pro`}
            className="ml-auto px-4 py-2.5 rounded-t-xl text-sm font-semibold text-gold hover:text-ink transition-colors"
            title="Zur Pro-Version für Anwält:innen"
          >
            Pro für Anwält:innen
          </a>
        </div>
      </div>

      {activeTab === 'reformen' ? (
        /* ── REFORM DIFFS TAB ── */
        <main className="max-w-4xl mx-auto px-5 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-gold font-bold uppercase tracking-widest mb-2">Reformvorschläge × GitLaw</p>
            <h2 className="font-display text-3xl mb-3">Was sich ändern könnte</h2>
            <p className="text-ink-muted max-w-lg mx-auto">Wie würden konkrete Reformvorschläge den Gesetzestext verändern? Vorher/Nachher — Wort für Wort.</p>
          </div>

          {/* Important disclaimer */}
          <div className="bg-blue-light rounded-2xl p-5 mb-8 border border-blue/10">
            <p className="text-sm text-blue font-medium mb-1">⚠️ Dies sind keine beschlossenen Gesetze</p>
            <p className="text-sm text-ink-muted">Diese Diffs zeigen <strong>Reformvorschläge</strong> aus dem Projekt <a href="https://mikelninh.github.io/zeitgeist/" target="_blank" rel="noopener" className="text-gold hover:underline font-medium">Zeitgeist DE</a> — eine evidenzbasierte Vision für Deutschland, inspiriert von 12 Ländern. Die Vorschläge basieren auf simulierten Bundestagsdebatten und internationaler Forschung.</p>
          </div>

          <div className="space-y-6">
            {reformDiffs.map((diff, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <p className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Reformvorschlag</p>
                  <h3 className="font-display text-xl mb-1">{diff.reform}</h3>
                  <p className="text-sm text-ink-muted">{diff.affectedLaw} — {diff.paragraph}</p>
                </div>

                {/* Diff view */}
                <div className="grid md:grid-cols-2">
                  <div className="p-5 bg-red-light/30 border-r border-border">
                    <p className="text-xs font-bold text-red uppercase tracking-widest mb-2">Aktuell geltendes Recht</p>
                    <p className="text-sm text-ink-soft leading-relaxed font-mono whitespace-pre-wrap">{diff.currentText}</p>
                  </div>
                  <div className="p-5 bg-green-light/30">
                    <p className="text-xs font-bold text-green uppercase tracking-widest mb-2">Vorschlag (nicht beschlossen)</p>
                    <p className="text-sm text-ink-soft leading-relaxed font-mono whitespace-pre-wrap">{diff.proposedText}</p>
                  </div>
                </div>

                {/* Explanation + Impact */}
                <div className="p-6 space-y-4">
                  <div className="bg-blue-light rounded-xl p-4">
                    <p className="text-xs font-bold text-blue uppercase tracking-widest mb-1">Was ändert sich?</p>
                    <p className="text-ink-soft">{diff.explanation}</p>
                  </div>
                  <div className="bg-gold-light rounded-xl p-4">
                    <p className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Was bedeutet das für echte Menschen?</p>
                    <p className="text-ink-soft">{diff.impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <p className="text-ink-muted text-sm mb-4">
              Alle Reformvorschläge stammen aus <a href="https://mikelninh.github.io/zeitgeist/" className="text-gold hover:underline" target="_blank" rel="noopener">Zeitgeist DE</a> — eine evidenzbasierte Vision für Deutschland.
            </p>
          </div>
        </main>
      ) : activeTab === 'fragen' ? (
        /* ── FRAGEN TAB (RAG) — PERSONALISIERT ── */
        <main className="max-w-3xl mx-auto px-5 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-gold font-bold uppercase tracking-widest mb-2">Persönlicher Rechts-Assistent</p>
            <h2 className="font-display text-3xl mb-3">Stell deine Frage in normaler Sprache</h2>
            <p className="text-ink-muted max-w-md mx-auto">GitLaw versucht zuerst dein Problem zu verstehen, antwortet einfacher und zeigt dir danach die passenden Gesetze dazu.</p>
          </div>

          {/* Persona selection */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-8">
            {[
              { id: 'student', emoji: '📚', label: 'Student/in', desc: 'Jung, wenig Geld, WG' },
              { id: 'arbeitnehmer', emoji: '👷', label: 'Arbeitnehmer/in', desc: 'Angestellt, Vollzeit' },
              { id: 'selbststaendig', emoji: '💼', label: 'Selbstständig', desc: 'Freelancer, Unternehmer' },
              { id: 'elternteil', emoji: '👨‍👩‍👧', label: 'Elternteil', desc: 'Mit Kindern' },
              { id: 'alleinerziehend', emoji: '👩‍👧', label: 'Alleinerziehend', desc: 'Single-Mutter/Vater' },
              { id: 'rentner', emoji: '👵', label: 'Rentner/in', desc: '65+, Rente' },
              { id: 'mieter', emoji: '🏠', label: 'Mieter/in', desc: 'Mietwohnung' },
              { id: 'vermieter', emoji: '🏘️', label: 'Vermieter/in', desc: 'Eigentum vermietet' },
              { id: 'azubi', emoji: '🔧', label: 'Azubi', desc: 'In Ausbildung' },
              { id: 'migrant', emoji: '🌍', label: 'Migrant/in', desc: 'Nicht-deutsch, in DE lebend' },
              { id: 'schwanger', emoji: '🤰', label: 'Schwanger', desc: 'Mutterschutz/Elternzeit' },
              { id: 'arbeitslos', emoji: '📋', label: 'Arbeitslos', desc: 'Bürgergeld/Jobsuche' },
            ].map(p => (
              <button key={p.id} onClick={() => setSelectedPersona(selectedPersona === p.id ? null : p.id)}
                className={`flex items-center gap-2 p-3 rounded-xl text-left cursor-pointer transition-all ${selectedPersona === p.id ? 'bg-gold text-white shadow-md ring-2 ring-gold/30' : 'bg-card border border-border hover:border-gold/30'}`}>
                <span className="text-xl">{p.emoji}</span>
                <div>
                  <span className={`text-sm font-medium ${selectedPersona === p.id ? 'text-white' : 'text-ink'}`}>{p.label}</span>
                  <p className={`text-[11px] ${selectedPersona === p.id ? 'text-white/70' : 'text-ink-muted'}`}>{p.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Language selector — P1 für Elif & Ahmed */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs text-ink-muted">Sprache:</span>
            {[
              { id: 'de', label: '🇩🇪 Deutsch' },
              { id: 'easy', label: '📖 Einfach' },
              { id: 'tr', label: '🇹🇷 Türkçe' },
              { id: 'ar', label: '🇸🇦 العربية' },
              { id: 'en', label: '🇬🇧 English' },
              { id: 'uk', label: '🇺🇦 Українська' },
            ].map(l => (
              <button key={l.id} onClick={() => setLanguage(l.id)}
                className={`px-2 py-1 rounded-lg text-xs cursor-pointer transition-all ${language === l.id ? 'bg-gold text-white' : 'bg-card border border-border text-ink-muted hover:text-ink'}`}>
                {l.label}
              </button>
            ))}
          </div>

          {selectedPersona && (
            <div className="bg-gold-light rounded-xl p-3 mb-4 text-center">
              <p className="text-sm text-gold">Personalisiert für: <strong>{
                { student: '📚 Student/in', arbeitnehmer: '👷 Arbeitnehmer/in', selbststaendig: '💼 Selbstständig', elternteil: '👨‍👩‍👧 Elternteil', alleinerziehend: '👩‍👧 Alleinerziehend', rentner: '👵 Rentner/in', mieter: '🏠 Mieter/in', vermieter: '🏘️ Vermieter/in', azubi: '🔧 Azubi', migrant: '🌍 Migrant/in', schwanger: '🤰 Schwanger', arbeitslos: '📋 Arbeitslos' }[selectedPersona]
              }</strong> · {{'de':'Deutsch','easy':'Leichte Sprache','tr':'Türkçe','ar':'العربية','en':'English','uk':'Українська'}[language]}</p>
            </div>
          )}

          {/* Example questions — personalized */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {({
              student: [
                'Was passiert wenn ich schwarzfahre?',
                'Jemand beleidigt mich online — was tun?',
                'Baue ich als Student Rente auf?',
                'Kann mein WG-Vermieter mich rausschmeißen?',
                'Muss ich GEZ zahlen als Student?',
                'Ich wurde beim Klauen erwischt — was droht mir?',
              ],
              arbeitnehmer: [
                'Wie lange darf ich am Tag arbeiten?',
                'Mein Chef will mich kündigen — was tun?',
                'Wann kann ich in Rente gehen?',
                'Habe ich Recht auf Homeoffice?',
                'Mein Arbeitgeber zahlt mein Gehalt nicht — was nun?',
                'Wie viel Urlaub steht mir gesetzlich zu?',
              ],
              selbststaendig: [
                'Muss ich mich selbst krankenversichern?',
                'Welche Steuern zahle ich als Freelancer?',
                'Mein Auftraggeber zahlt nicht — was tun?',
                'Bin ich scheinselbstständig?',
                'Muss ich in die Rentenversicherung einzahlen?',
                'Brauche ich ein Gewerbe oder bin ich Freiberufler?',
              ],
              elternteil: [
                'Wie viel Kindergeld steht mir zu?',
                'Wie lange habe ich Elternzeit?',
                'Kann ich Kinderbetreuungskosten von der Steuer absetzen?',
                'Wer entscheidet über die Schule meines Kindes nach Trennung?',
                'Wie funktioniert das Ehegattensplitting?',
                'Mein Kind hat in der Schule jemanden verletzt — hafte ich?',
              ],
              alleinerziehend: [
                'Wie viel Unterhalt steht meinem Kind zu?',
                'Der Vater zahlt keinen Unterhalt — was tun?',
                'Bekomme ich Unterhaltsvorschuss vom Staat?',
                'Habe ich Anspruch auf Wohngeld?',
                'Welche Steuervorteile habe ich als Alleinerziehende?',
                'Kann ich die Kita-Kosten von der Steuer absetzen?',
              ],
              rentner: [
                'Wie hoch ist meine Rente?',
                'Darf ich als Rentner dazuverdienen?',
                'Muss ich als Rentner Steuern zahlen?',
                'Ich kann mir meine Medikamente nicht leisten — gibt es Hilfe?',
                'Meine Rente reicht nicht — bekomme ich Grundsicherung?',
                'Wie funktioniert die Witwenrente?',
              ],
              mieter: [
                'Kann mein Vermieter die Miete erhöhen?',
                'Meine Heizung ist kaputt — darf ich die Miete kürzen?',
                'Mein Vermieter will Eigenbedarf anmelden',
                'Wer zahlt die Reparatur — ich oder der Vermieter?',
                'Darf mein Vermieter einfach in meine Wohnung?',
                'Meine Nebenkostenabrechnung ist zu hoch — was tun?',
              ],
              vermieter: [
                'Wie kündige ich wegen Eigenbedarf?',
                'Darf ich die Miete erhöhen?',
                'Mein Mieter zahlt nicht — was tun?',
                'Welche Schönheitsreparaturen muss der Mieter machen?',
                'Muss ich die Kaution verzinsen?',
                'Wie setze ich Modernisierungskosten auf die Miete um?',
              ],
              azubi: [
                'Darf mein Ausbilder mich kündigen?',
                'Wie viele Überstunden darf ich als Azubi machen?',
                'Muss mein Betrieb mich nach der Ausbildung übernehmen?',
                'Ich werde im Betrieb nur als billige Arbeitskraft benutzt — ist das erlaubt?',
                'Wie viel Urlaub habe ich als Azubi?',
                'Kann ich meine Ausbildung vorzeitig beenden?',
              ],
              migrant: [
                'Welchen Aufenthaltstitel brauche ich?',
                'Kann ich meine Familie nachholen?',
                'Darf ich arbeiten?',
                'Wie lasse ich meinen Berufsabschluss anerkennen?',
                'Kann ich die deutsche Staatsbürgerschaft beantragen?',
                'Ich werde wegen meiner Herkunft diskriminiert — was tun?',
              ],
              schwanger: [
                'Darf mein Chef mich kündigen?',
                'Wie lange habe ich Mutterschutz?',
                'Wie viel Elterngeld bekomme ich?',
                'Darf ich in der Schwangerschaft Überstunden machen?',
                'Kann ich Elternzeit und Teilzeit kombinieren?',
                'Was passiert mit meinem Job wenn ich 2 Jahre Elternzeit nehme?',
              ],
              arbeitslos: [
                'Wie viel Bürgergeld bekomme ich?',
                'Kann das Jobcenter mein Bürgergeld kürzen?',
                'Darf ich dazuverdienen?',
                'Ich habe Schulden — wird mein Bürgergeld gepfändet?',
                'Muss ich jeden Job annehmen den das Jobcenter vorschlägt?',
                'Wie beantrage ich Wohngeld?',
              ],
            }[selectedPersona || ''] || [
              'Kann mein Vermieter mich rausschmeißen?',
              'Wie lange darf ich am Tag arbeiten?',
              'Was passiert bei Online-Beleidigung?',
              'Wann kann ich in Rente gehen?',
              'Darf mein Chef mich kündigen?',
              'Was sind meine Grundrechte?',
            ]).map(q => (
              <button key={q} onClick={() => setChatInput(q)}
                className="px-3 py-2 rounded-xl text-sm bg-card border border-border text-ink-muted hover:text-gold hover:border-gold/30 cursor-pointer transition-colors">
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          {(() => {
            const personaDesc: Record<string, string> = {
              student: 'Student/in, jung, wenig Einkommen, WG, eventuell BAföG',
              arbeitnehmer: 'Angestellt, Vollzeit, sozialversicherungspflichtig',
              selbststaendig: 'Selbstständig/Freelancer, keine automatische Absicherung',
              elternteil: 'Verheiratet mit Kindern, Doppelverdiener oder Alleinverdiener',
              alleinerziehend: 'Alleinerziehend, ein Einkommen, Kind(er) im Haushalt',
              rentner: 'Im Ruhestand, 65+, lebt von Rente',
              mieter: 'Mieter/in einer Wohnung',
              vermieter: 'Vermieter/in, besitzt vermietete Immobilie(n)',
              azubi: 'In der Berufsausbildung, geringes Einkommen',
              migrant: 'Nicht-deutsche Staatsangehörigkeit, lebt in Deutschland',
              schwanger: 'Schwanger oder gerade Mutter geworden, im Arbeitsverhältnis',
              arbeitslos: 'Arbeitsuchend, bezieht Bürgergeld oder ALG I',
            }
            const sendQuestion = () => {
              if (chatInput.trim() && !chatLoading) {
                const question = chatInput.trim()
                setChatInput('')
                setChatLoading(true)
                const newMsgs = [...chatMessages, { role: 'user' as const, text: question }]
                setChatMessages(newMsgs)
                const history = chatMessages.map(m => ({ role: m.role, content: m.text }))
                const persona = selectedPersona ? personaDesc[selectedPersona] : undefined
                const langSuffix = language !== 'de' ? ` Antworte auf ${{'easy':'sehr einfachem Deutsch (Leichte Sprache, kurze Sätze, kein Fachvokabular)','tr':'Türkisch','ar':'Arabisch','en':'Englisch','uk':'Ukrainisch'}[language] || 'Deutsch'}.` : ''
                askLegalQuestion(question + langSuffix, persona, history)
                  .then(result => {
                    setChatMessages(prev => [...prev, { role: 'assistant' as const, text: result.answer, sources: result.sources }])
                    setChatLoading(false)
                  })
                  .catch(() => {
                    setChatMessages(prev => [...prev, {
                      role: 'assistant' as const,
                      text: 'Ich konnte dazu gerade keine brauchbare Antwort laden. Bitte versuche die Frage konkreter oder etwas später noch einmal.',
                      sources: [],
                    }])
                    setChatLoading(false)
                  })
              }
            }
            return (
              <div className="relative mb-4">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendQuestion() }}
                  placeholder={chatMessages.length > 0 ? "Folgefrage stellen..." : (selectedPersona ? `Deine Frage als ${selectedPersona}...` : "Deine Rechtsfrage...")}
                  className="w-full pl-5 pr-14 py-4 rounded-2xl border border-border bg-card text-lg shadow-sm focus:outline-none focus:border-gold focus:shadow-md transition-all"
                />
                <button onClick={sendQuestion} disabled={chatLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gold text-white rounded-xl hover:bg-gold/90 transition-colors cursor-pointer disabled:opacity-50">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            )
          })()}

          {/* Answer */}
          {/* Chat messages */}
          {chatMessages.length > 0 && (
            <div className="space-y-3 mb-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-gold text-white' : 'bg-card border border-border'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Scale className="w-4 h-4 text-gold" />
                        <span className="text-[11px] font-bold text-gold uppercase tracking-wider">Rechts-Assistent</span>
                      </div>
                    )}
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-ink-soft'}`}>{msg.text}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-border/50">
                        {msg.sources.map((s, j) => (
                          <span key={j} className="text-[10px] bg-bg-alt px-2 py-0.5 rounded text-ink-muted">{s.law} — {s.section}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start"><div className="bg-card border border-border rounded-2xl px-5 py-3 text-sm text-ink-muted">Suche nach passenden Gesetzen und Erklaerungen...</div></div>
              )}
              <p className="text-center text-[11px] text-gold">⚠️ Keine Rechtsberatung. GitLaw ist ein erster Orientierungsschritt, keine anwaltliche Pruefung.</p>
            </div>
          )}
        </main>
      ) : (
      /* ── WIDERSPRÜCHE TAB ── */
      activeTab === 'widersprueche' ? (
        <main className="max-w-3xl mx-auto px-5 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-red font-bold uppercase tracking-widest mb-2">Widersprüche</p>
            <h2 className="font-display text-3xl mb-3">Wo das Recht sich selbst widerspricht</h2>
            <p className="text-ink-muted max-w-md mx-auto">Was das Gesetz sagt — und was die Realität zeigt. Mit echten Paragraphen, echten Zahlen.</p>
          </div>
          <div className="space-y-6">
            {contradictions.map(c => {
              const severityColor = c.severity === 'krass' ? 'bg-red-light text-red' : c.severity === 'absurd' ? 'bg-purple-light text-purple' : 'bg-gold-light text-gold'
              return (
                <div key={c.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{c.emoji}</span>
                      <div className="flex-1">
                        <h3 className="font-display text-base">{c.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-light text-blue">{c.category}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${severityColor}`}>{c.severity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Law says */}
                    <div className="bg-green-light rounded-xl p-4 mb-3">
                      <p className="text-[10px] font-bold text-green uppercase tracking-wider mb-1">Was das Gesetz sagt</p>
                      <p className="text-sm text-ink-soft italic">"{c.lawSays.quote}"</p>
                      <p className="text-[11px] text-green mt-1">— {c.lawSays.law}, {c.lawSays.paragraph}</p>
                      {c.lawSays.lawId && (
                        <button onClick={() => loadLaw(c.lawSays.lawId!)} className="text-[11px] text-gold hover:underline cursor-pointer mt-1">→ Im Volltext lesen</button>
                      )}
                    </div>

                    {/* Reality says */}
                    <div className="bg-red-light rounded-xl p-4 mb-3">
                      <p className="text-[10px] font-bold text-red uppercase tracking-wider mb-1">Was die Realität zeigt</p>
                      <p className="text-sm text-ink-soft">{c.realitySays}</p>
                    </div>

                    {/* The contradiction */}
                    <div className="bg-gold-light rounded-xl p-4 mb-3 border border-gold/10">
                      <p className="text-[10px] font-bold text-gold uppercase tracking-wider mb-1">Der Widerspruch</p>
                      <p className="text-sm text-ink-soft font-medium">{c.contradiction}</p>
                    </div>

                    {/* Numbers */}
                    {c.numbers && (
                      <div className="bg-bg-alt rounded-xl p-4 mb-3">
                        <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">Zahlen</p>
                        <p className="text-sm text-ink-muted">{c.numbers}</p>
                      </div>
                    )}

                    {/* Why nothing happens */}
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">Warum passiert nichts?</p>
                      <p className="text-sm text-ink-muted">{c.whyNothingHappens}</p>
                    </div>

                    {/* What should change */}
                    <div className="bg-blue-light rounded-xl p-4">
                      <p className="text-[10px] font-bold text-blue uppercase tracking-wider mb-1">Was sich ändern muss</p>
                      <p className="text-sm text-ink-soft">{c.whatShouldChange}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-ink-muted">Kennst du einen Widerspruch der fehlt? <a href="https://github.com/mikelninh/gitlaw/issues" target="_blank" rel="noopener" className="text-gold hover:underline">Melde ihn auf GitHub</a></p>
          </div>
        </main>
      ) :
      /* ── MUSTERBRIEFE TAB ── */
      activeTab === 'briefe' ? (
        <main className="max-w-3xl mx-auto px-5 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-gold font-bold uppercase tracking-widest mb-2">Musterbriefe</p>
            <h2 className="font-display text-3xl mb-3">Recht, schwarz auf weiß</h2>
            <p className="text-ink-muted max-w-md mx-auto">Wähle einen Musterbrief, fülle die Felder aus, kopiere oder drucke ihn.</p>
          </div>

          {/* Category filter */}
          {!activeTemplate ? (
            <div>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {['Alle', ...new Set(letterTemplates.map(t => t.category))].map(cat => (
                  <button key={cat} className="px-3 py-1.5 rounded-full text-xs bg-card border border-border text-ink-muted hover:text-gold hover:border-gold/30 cursor-pointer transition-colors">
                    {cat}
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-ink-muted mb-4">{letterTemplates.length} Musterbriefe · {letterTemplates.filter(t => !t.premium).length} frei · {letterTemplates.filter(t => t.premium).length} Premium</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {letterTemplates.map(t => (
                  <button key={t.id} onClick={() => {
                    if (t.premium) {
                      alert('Dieses Template gehört zu GitLaw Premium (€4,99/Monat, in Vorbereitung). ' + letterTemplates.filter(x => !x.premium).length + ' Musterbriefe sind im freien Tier verfügbar.')
                      return
                    }
                    setActiveTemplate(t.id); setTemplateFields({}); setGeneratedLetter('')
                  }}
                    className={`rounded-xl border p-5 text-left transition-all cursor-pointer ${t.premium ? 'bg-gold-light/30 border-gold/20 hover:border-gold/40' : 'bg-card border-border hover:border-gold/30 hover:shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{t.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-sm">{t.title}</h3>
                          {t.premium && <span className="text-[9px] font-bold text-gold bg-gold-light px-1.5 py-0.5 rounded-full">PREMIUM</span>}
                        </div>
                        <span className="text-[10px] text-ink-muted">{t.category}</span>
                      </div>
                    </div>
                    <p className="text-xs text-ink-muted">{t.description}</p>
                    <p className="text-[10px] text-gold mt-2">{t.lawReference}</p>
                  </button>
                ))}
              </div>

              {/* Premium CTA */}
              <div className="mt-8 bg-gold-light rounded-2xl p-6 text-center border border-gold/10">
                <h3 className="font-display text-lg mb-2">GitLaw Premium — €4,99/Monat</h3>
                <p className="text-sm text-ink-soft mb-4">Alle {letterTemplates.length} Musterbriefe + unbegrenzte AI-Fragen + Favoriten-Sync + Beratungsstellen-Suche</p>
                <div className="flex flex-wrap gap-3 justify-center text-xs text-ink-muted">
                  <span>{letterTemplates.filter(t => !t.premium).length} Briefe im freien Tier</span>
                  <span>{letterTemplates.filter(t => t.premium).length} Premium-Briefe</span>
                  <span>6 Sprachen</span>
                  <span>Unbegrenzte Fragen</span>
                </div>
                <button className="mt-4 px-6 py-2.5 bg-gold text-white rounded-xl font-medium hover:bg-gold/90 transition-colors cursor-pointer text-sm">
                  Warteliste: E-Mail an hi@gitlaw.app
                </button>
              </div>
            </div>
          ) : (() => {
            const tmpl = letterTemplates.find(t => t.id === activeTemplate)!
            return (
              <div>
                <button onClick={() => setActiveTemplate(null)} className="text-sm text-gold hover:underline cursor-pointer mb-4">← Zurück</button>
                <div className="bg-card rounded-2xl border border-border p-6 mb-6">
                  <h3 className="font-display text-xl mb-1">{tmpl.emoji} {tmpl.title}</h3>
                  <p className="text-sm text-ink-muted mb-4">{tmpl.description}</p>
                  <div className="space-y-3">
                    {tmpl.fields.map(f => (
                      <div key={f.id}>
                        <label className="text-sm font-medium text-ink mb-1 block">{f.label}</label>
                        {f.type === 'textarea' ? (
                          <textarea value={templateFields[f.id] || ''} onChange={e => setTemplateFields({...templateFields, [f.id]: e.target.value})}
                            placeholder={f.placeholder} rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-gold" />
                        ) : (
                          <input type={f.type || 'text'} value={templateFields[f.id] || ''} onChange={e => setTemplateFields({...templateFields, [f.id]: e.target.value})}
                            placeholder={f.placeholder}
                            className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-gold" />
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => {
                    let text = tmpl.template
                    text = text.replace(/\{\{datum\}\}/g, new Date().toLocaleDateString('de-DE'))
                    for (const [key, val] of Object.entries(templateFields)) {
                      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || `[${key}]`)
                    }
                    setGeneratedLetter(text)
                  }} className="mt-4 px-6 py-3 bg-gold text-white rounded-xl font-medium hover:bg-gold/90 transition-colors cursor-pointer">
                    Brief generieren
                  </button>
                </div>

                {generatedLetter && (
                  <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <span className="text-sm font-bold">Brief</span>
                      <div className="flex gap-2">
                        <button onClick={() => copyToClipboard(generatedLetter).then(() => alert('Brief ist in der Zwischenablage.'))}
                          className="text-xs text-gold hover:underline cursor-pointer">Kopieren</button>
                        <button onClick={() => window.print()}
                          className="text-xs text-gold hover:underline cursor-pointer">Drucken</button>
                      </div>
                    </div>
                    <pre className="p-6 text-sm whitespace-pre-wrap font-mono leading-relaxed">{generatedLetter}</pre>
                    <div className="p-3 bg-gold-light text-center">
                      <p className="text-xs text-gold">Rechtsgrundlage: {tmpl.lawReference} · Dies ist ein Muster — bei Bedarf anwaltlich prüfen lassen.</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </main>
      ) :
      /* ── GESETZE TAB ── */
      <div>

      {/* Featured laws */}
      <div className="bg-bg-alt border-b border-border">
        <div className="max-w-5xl mx-auto px-5 py-6">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-widest mb-3 text-center">Wichtige Gesetze</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'gg', label: 'Grundgesetz', emoji: '🏛️', desc: 'Verfassung' },
              { id: 'stgb', label: 'StGB', emoji: '⚖️', desc: 'Strafrecht' },
              { id: 'bgb', label: 'BGB', emoji: '📋', desc: 'Zivilrecht' },
              { id: 'sgb_6', label: 'SGB VI', emoji: '🏦', desc: 'Rentenrecht' },
              { id: 'netzdg', label: 'NetzDG', emoji: '🌐', desc: 'Netzwerkrecht' },
              { id: 'tierschg', label: 'TierSchG', emoji: '🐾', desc: 'Tierschutz' },
              { id: 'aufenthg_2004', label: 'AufenthG', emoji: '🛂', desc: 'Aufenthaltsrecht' },
              { id: 'ao_1977', label: 'AO', emoji: '💶', desc: 'Steuerrecht' },
            ].map(q => (
              <button key={q.id} onClick={() => loadLaw(q.id)}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-gold/30 hover:shadow-sm transition-all cursor-pointer text-left">
                <span className="text-xl">{q.emoji}</span>
                <div>
                  <span className="text-sm font-bold text-ink">{q.label}</span>
                  <p className="text-xs text-ink-muted">{q.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Curated content (only when NOT searching) */}
      {!search ? (
      <main className="max-w-5xl mx-auto px-5 py-8">
        {/* More interesting laws — expandable */}
        <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-3">Spannende Gesetze entdecken</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {dailyLaws.slice(0, 9).map(law => (
            <details key={law.id} className="bg-card rounded-xl border border-border hover:border-gold/20 hover:shadow-sm transition-all group">
              <summary className="p-4 cursor-pointer list-none">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{law.emoji}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${getCategoryColor(law.category)}`}>{law.category}</span>
                  {law.year && <span className="text-[10px] text-ink-muted">{law.year}</span>}
                </div>
                <h4 className="font-display text-sm group-open:text-gold transition-colors">{law.title}</h4>
                <p className="text-[12px] text-ink-muted mt-1">{law.law} — {law.paragraph}</p>
              </summary>
              <div className="px-4 pb-4 space-y-3">
                <p className="text-[13px] text-ink-soft leading-relaxed">{law.context}</p>
                {law.funFact && (
                  <div className="bg-gold-light rounded-lg p-3">
                    <p className="text-[12px] text-ink-soft"><strong className="text-gold">Fun Fact:</strong> {law.funFact}</p>
                  </div>
                )}
                {law.needsUpdate && (
                  <div className="bg-red-light rounded-lg p-3">
                    <p className="text-[12px] text-ink-soft"><strong className="text-red">Braucht Update:</strong> {law.needsUpdate}</p>
                  </div>
                )}
                {law.lawId && (
                  <button onClick={() => loadLaw(law.lawId!)} className="text-[12px] text-gold hover:underline cursor-pointer">→ Gesetz im Volltext lesen</button>
                )}
              </div>
            </details>
          ))}
        </div>

        {/* Recently updated */}
        <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-3">Zuletzt geändert (2025/2026)</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {laws
            .filter(l => l.stand && (l.stand.includes('2025') || l.stand.includes('2026')))
            .slice(0, 6)
            .map(law => (
              <button key={law.id} onClick={() => loadLaw(law.id)}
                className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border hover:border-gold/30 transition-all cursor-pointer text-left">
                <Scale className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{law.abbreviation || law.title}</p>
                  <p className="text-[11px] text-ink-muted truncate">{law.title}</p>
                </div>
              </button>
            ))}
        </div>
      </main>
      ) : (
      /* Search results */
      <main className="max-w-5xl mx-auto px-5 py-8">
        <p className="text-sm text-ink-muted mb-4">{filtered.length} Ergebnisse für „{search}"</p>
        <div className="space-y-1">
          {filtered.slice(0, 50).map(law => (
            <button key={law.id} onClick={() => loadLaw(law.id)}
              className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-card hover:shadow-sm border border-transparent hover:border-border transition-all text-left cursor-pointer group">
              <div className="flex items-center gap-3 min-w-0">
                {law.abbreviation && <span className="text-xs font-bold text-gold bg-gold-light px-2 py-0.5 rounded shrink-0">{law.abbreviation}</span>}
                <span className="font-display text-[15px] group-hover:text-gold truncate">{law.title}</span>
              </div>
              <span className="text-xs text-ink-muted shrink-0 ml-4">{law.sections} §§</span>
            </button>
          ))}
          {filtered.length > 50 && <p className="text-center text-ink-muted text-sm py-4">Zeige 50 von {filtered.length} — verfeinere deine Suche</p>}
        </div>
      </main>
      )}
      </div>
      )}

      {/* Footer */}
      <footer className="py-8 px-5 border-t border-border text-center">
        <p className="text-ink-muted text-sm">
          GitLaw — 5.936 Bundesgesetze, frei einsehbar. Daten von <a href="https://www.gesetze-im-internet.de" className="text-gold hover:underline" target="_blank" rel="noopener">gesetze-im-internet.de</a>
        </p>
        <p className="text-ink-muted/70 text-xs mt-2">
          Betrieben von Mikel Ninh, Berlin ·{' '}
          <a href="https://github.com/mikelninh/gitlaw" className="hover:text-gold" target="_blank" rel="noopener">Quellcode (MIT)</a> ·{' '}
          <a href="https://github.com/mikelninh/gitlaw/blob/main/CHANGELOG.md" className="hover:text-gold" target="_blank" rel="noopener">Changelog</a> ·{' '}
          Stand: {new Date().toISOString().slice(0, 10)} · Keine Gewähr für Richtigkeit
        </p>
      </footer>

      {/* Ecosystem footer */}
      <div style={{ background: '#F5ECD7', borderTop: '1px solid #E5D5B0', padding: '12px 0', textAlign: 'center', fontSize: '13px', color: '#777' }}>
        <a href="https://mikelninh.github.io/" style={{ color: '#8B6914', textDecoration: 'none', fontWeight: 600 }}>Digitale Demokratie</a>
        {' · '}
        <a href="https://mikelninh.github.io/faireint/" style={{ color: '#555', textDecoration: 'none' }}>FairEint</a>
        {' · '}
        <span style={{ color: '#555', fontWeight: 600 }}>GitLaw</span>
        {' · '}
        <a href="https://github.com/mikelninh/Public-Money-Mirror" style={{ color: '#555', textDecoration: 'none' }}>Public Money Mirror</a>
        {' · '}
        <a href="https://github.com/mikelninh/safevoice" style={{ color: '#555', textDecoration: 'none' }}>SafeVoice</a>
      </div>
    </div>
  )
}

export default App
