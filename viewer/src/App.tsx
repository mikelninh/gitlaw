import { useState, useEffect, useMemo } from 'react'
import { Search, BookOpen, ArrowLeft, Scale, FileText, Hash, ExternalLink, Sparkles, GitCompare, Lightbulb, Heart, MessageCircle, Send, Download, Share2 } from 'lucide-react'
import Fuse from 'fuse.js'
import { loadExplanations, reformDiffs, type Explanations } from './explain'
import { askLegalQuestion } from './rag'
import { getDailyLaw, dailyLaws, getCategoryColor } from './daily-law'
import { exportLawAsPDF, generateShareLink, copyToClipboard } from './export'
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

// Markdown to HTML with paragraph cross-linking
function md(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 id="$1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^\| (.+)$/gm, (_m: string, row: string) => {
      const cells = row.split('|').map((c: string) => c.trim()).filter(Boolean)
      return `<tr>${cells.map((c: string) => `<td style="padding:4px 12px;border-bottom:1px solid #e5e3de">${c}</td>`).join('')}</tr>`
    })
    // Cross-link: "§ 573 BGB" or "§§ 185, 186 StGB" → clickable
    .replace(/§§?\s*(\d+\w*(?:\s*(?:Abs\.|Absatz|Nr\.|Nummer|Satz|Buchst\.)\s*\d+\w*)*)\s+((?:SGB\s+[IVX]+|[A-ZÄÖÜ][A-Za-zÄÖÜäöü]+))/g,
      (_match: string, num: string, abbr: string) => {
        const lawId = lawAbbrevMap[abbr.trim()]
        if (lawId) {
          return `<a href="#" onclick="event.preventDefault();window.__loadLaw&&window.__loadLaw('${lawId}')" style="color:var(--color-gold);text-decoration:underline;cursor:pointer">§ ${num} ${abbr}</a>`
        }
        return `§ ${num} ${abbr}`
      })
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|b|t|p|a])/gm, '')
}

function App() {
  const [laws, setLaws] = useState<LawEntry[]>([])
  const [search, setSearch] = useState('')
  const [selectedLaw, setSelectedLaw] = useState<string | null>(null)
  const [lawContent, setLawContent] = useState('')
  const [_loading, setLoading] = useState(true)
  const [contentSearch, setContentSearch] = useState('')
  const [explanations, setExplanations] = useState<Explanations | null>(null)
  const [showExplain, setShowExplain] = useState(false)
  const [activeTab, setActiveTab] = useState<'gesetze' | 'reformen' | 'fragen'>('gesetze')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant'; text: string; sources?: {law: string; section: string}[]}[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null)

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
    setExplanations(null)
    setShowExplain(false)
    const law = laws.find(l => l.id === id)
    if (!law) return
    fetch(`./laws/${law.file}`)
      .then(r => r.text())
      .then(text => setLawContent(text))
    loadExplanations(id).then(e => setExplanations(e))
  }

  // Highlight search in content
  const highlightContent = (text: string, query: string) => {
    if (!query || query.length < 2) return text
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:#F5ECD7;padding:2px 4px;border-radius:3px">$1</mark>')
  }

  // Stats
  const totalLaws = laws.length
  const totalSections = laws.reduce((s, l) => s + l.sections, 0)
  const totalLines = laws.reduce((s, l) => s + l.lines, 0)

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
                  if (ok) alert('Link kopiert!')
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

        {/* Explain toggle */}
        {lawContent && (
          <div className="bg-gold-light border-b border-gold/20">
            <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
              <p className="text-sm text-ink-soft">
                {explanations
                  ? `✨ ${Object.keys(explanations.explanations).length} Paragraphen erklärt verfügbar`
                  : 'Einfache Erklärungen werden geladen...'}
              </p>
              <button onClick={() => setShowExplain(!showExplain)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${showExplain ? 'bg-gold text-white' : 'bg-white text-gold border border-gold/30'}`}>
                <Sparkles className="w-4 h-4" />
                {showExplain ? 'Erklärungen ausblenden' : 'Einfach erklären'}
              </button>
            </div>
          </div>
        )}

        {/* Law content */}
        <main className="max-w-3xl mx-auto px-5 py-8">
          {!lawContent ? (
            <div className="text-center py-20 text-ink-muted">Lade Gesetzestext...</div>
          ) : (
            <>
              <div className="law-content" dangerouslySetInnerHTML={{ __html: html }} />
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-bg border-b border-border">
        <div className="max-w-5xl mx-auto px-5 py-12 sm:py-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="w-8 h-8 text-gold" />
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              Git<span className="text-gold">Law</span>
            </h1>
          </div>
          <p className="text-ink-soft text-lg mb-8 max-w-md mx-auto">
            Alle deutschen Bundesgesetze. Durchsuchbar. Lesbar. Transparent.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mb-8 text-sm text-ink-muted">
            <div className="flex items-center gap-2"><FileText className="w-4 h-4" /><span><strong className="text-ink">{totalLaws.toLocaleString()}</strong> Gesetze</span></div>
            <div className="flex items-center gap-2"><Hash className="w-4 h-4" /><span><strong className="text-ink">{totalSections.toLocaleString()}</strong> Paragraphen</span></div>
            <div className="flex items-center gap-2"><BookOpen className="w-4 h-4" /><span><strong className="text-ink">{totalLines.toLocaleString()}</strong> Zeilen</span></div>
          </div>

          {/* Search */}
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
            <input
              type="text"
              placeholder="Gesetz suchen... z.B. 'Grundgesetz' oder 'StGB'"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-border bg-card text-lg shadow-sm focus:outline-none focus:border-gold focus:shadow-md transition-all"
              autoFocus
            />
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-bg border-b border-border">
        <div className="max-w-5xl mx-auto px-5 flex gap-1 pt-2">
          <button onClick={() => setActiveTab('gesetze')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors cursor-pointer ${activeTab === 'gesetze' ? 'bg-bg-alt text-ink border border-border border-b-bg-alt' : 'text-ink-muted hover:text-ink'}`}>
            <FileText className="w-4 h-4 inline mr-1.5" />Gesetze durchsuchen
          </button>
          <button onClick={() => setActiveTab('reformen')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors cursor-pointer ${activeTab === 'reformen' ? 'bg-bg-alt text-ink border border-border border-b-bg-alt' : 'text-ink-muted hover:text-ink'}`}>
            <GitCompare className="w-4 h-4 inline mr-1.5" />Reform-Diffs
          </button>
          <button onClick={() => setActiveTab('fragen')}
            className={`px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors cursor-pointer ${activeTab === 'fragen' ? 'bg-bg-alt text-ink border border-border border-b-bg-alt' : 'text-ink-muted hover:text-ink'}`}>
            <MessageCircle className="w-4 h-4 inline mr-1.5" />Frage stellen
          </button>
        </div>
      </div>

      {activeTab === 'reformen' ? (
        /* ── REFORM DIFFS TAB ── */
        <main className="max-w-4xl mx-auto px-5 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-gold font-bold uppercase tracking-widest mb-2">Deutschland 2030 × GitLaw</p>
            <h2 className="font-display text-3xl mb-3">Was sich im Gesetzestext ändert</h2>
            <p className="text-ink-muted max-w-lg mx-auto">Jede Reform verändert konkrete Paragraphen. Hier siehst du den Vorher/Nachher-Diff — Wort für Wort.</p>
          </div>

          {/* Teal Swan inspiration */}
          <div className="bg-gold-light rounded-2xl p-6 mb-8 text-center border border-gold/10">
            <Heart className="w-5 h-5 text-gold mx-auto mb-3" />
            <p className="text-ink-soft italic leading-relaxed max-w-lg mx-auto">
              "If you want someone to make a change, you need to spark their desire to change by showing them why it is in their best interest to make the change."
            </p>
            <p className="text-ink-muted text-sm mt-2">— Teal Swan</p>
          </div>

          <div className="space-y-6">
            {reformDiffs.map((diff, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <p className="text-xs font-bold text-gold uppercase tracking-widest mb-1">Reform</p>
                  <h3 className="font-display text-xl mb-1">{diff.reform}</h3>
                  <p className="text-sm text-ink-muted">{diff.affectedLaw} — {diff.paragraph}</p>
                </div>

                {/* Diff view */}
                <div className="grid md:grid-cols-2">
                  <div className="p-5 bg-red-light/30 border-r border-border">
                    <p className="text-xs font-bold text-red uppercase tracking-widest mb-2">Aktueller Gesetzestext</p>
                    <p className="text-sm text-ink-soft leading-relaxed font-mono whitespace-pre-wrap">{diff.currentText}</p>
                  </div>
                  <div className="p-5 bg-green-light/30">
                    <p className="text-xs font-bold text-green uppercase tracking-widest mb-2">Nach der Reform</p>
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
              Diese Diffs basieren auf den simulierten Gesetzentwürfen aus <a href="https://mikelninh.github.io/deutschland-2030/" className="text-gold hover:underline" target="_blank">Deutschland 2030</a>.
            </p>
          </div>
        </main>
      ) : activeTab === 'fragen' ? (
        /* ── FRAGEN TAB (RAG) — PERSONALISIERT ── */
        <main className="max-w-3xl mx-auto px-5 py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-gold font-bold uppercase tracking-widest mb-2">Persönlicher Rechts-Assistent</p>
            <h2 className="font-display text-3xl mb-3">Wer bist du?</h2>
            <p className="text-ink-muted max-w-md mx-auto">Wähle dein Profil — die Antwort wird auf DEINE Situation zugeschnitten. Basierend auf echten Gesetzestexten.</p>
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

          {selectedPersona && (
            <div className="bg-gold-light rounded-xl p-3 mb-4 text-center">
              <p className="text-sm text-gold">Antworten werden personalisiert für: <strong>{
                { student: '📚 Student/in', arbeitnehmer: '👷 Arbeitnehmer/in', selbststaendig: '💼 Selbstständig', elternteil: '👨‍👩‍👧 Elternteil', alleinerziehend: '👩‍👧 Alleinerziehend', rentner: '👵 Rentner/in', mieter: '🏠 Mieter/in', vermieter: '🏘️ Vermieter/in', azubi: '🔧 Azubi', migrant: '🌍 Migrant/in', schwanger: '🤰 Schwanger', arbeitslos: '📋 Arbeitslos' }[selectedPersona]
              }</strong></p>
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
                askLegalQuestion(question, persona, history).then(result => {
                  setChatMessages(prev => [...prev, { role: 'assistant' as const, text: result.answer, sources: result.sources }])
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
                <div className="flex justify-start"><div className="bg-card border border-border rounded-2xl px-5 py-3 text-sm text-ink-muted">Suche in Gesetzen...</div></div>
              )}
              <p className="text-center text-[11px] text-gold">⚠️ Keine Rechtsberatung. Bei konkreten Fragen → Anwalt.</p>
            </div>
          )}
        </main>
      ) : (
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

      {/* Daily Law + curated content (only when NOT searching) */}
      {!search ? (
      <main className="max-w-5xl mx-auto px-5 py-8">
        {/* Daily Law */}
        {(() => {
          const daily = getDailyLaw()
          return (
            <div className="bg-card rounded-2xl border border-gold/20 p-6 sm:p-8 mb-8 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{daily.emoji}</span>
                <div>
                  <p className="text-[11px] font-bold text-gold uppercase tracking-widest">Gesetz des Tages</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getCategoryColor(daily.category)}`}>{daily.category}</span>
                </div>
              </div>
              <h3 className="font-display text-xl sm:text-2xl mb-2">{daily.title}</h3>
              <p className="text-sm text-ink-muted mb-3">{daily.law} — {daily.paragraph} ({daily.year})</p>
              <p className="text-ink-soft leading-relaxed mb-4">{daily.context}</p>
              {daily.funFact && (
                <div className="bg-gold-light rounded-xl p-4 mb-3">
                  <p className="text-sm text-ink-soft"><strong className="text-gold">Fun Fact:</strong> {daily.funFact}</p>
                </div>
              )}
              {daily.needsUpdate && (
                <div className="bg-red-light rounded-xl p-4">
                  <p className="text-sm text-ink-soft"><strong className="text-red">Braucht ein Update:</strong> {daily.needsUpdate}</p>
                </div>
              )}
              {daily.lawId && (
                <button onClick={() => loadLaw(daily.lawId!)} className="mt-3 text-sm text-gold hover:underline cursor-pointer">
                  → Gesetz im Volltext lesen
                </button>
              )}
            </div>
          )
        })()}

        {/* More interesting laws — expandable */}
        <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mb-3">Spannende Gesetze entdecken</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {dailyLaws.filter(l => l.id !== getDailyLaw().id).slice(0, 9).map(law => (
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
          GitLaw — Alle Bundesgesetze, open source. Daten von <a href="https://www.gesetze-im-internet.de" className="text-gold hover:underline" target="_blank" rel="noopener">gesetze-im-internet.de</a>
        </p>
        <p className="text-ink-muted/50 text-xs mt-1">
          <a href="https://github.com/mikelninh/gitlaw" className="hover:text-gold" target="_blank" rel="noopener">GitHub</a> · MIT Lizenz · Keine Gewähr für Richtigkeit
        </p>
      </footer>
    </div>
  )
}

export default App
