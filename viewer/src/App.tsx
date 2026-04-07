import { useState, useEffect, useMemo } from 'react'
import { Search, BookOpen, ArrowLeft, Scale, FileText, Hash, ExternalLink } from 'lucide-react'
import Fuse from 'fuse.js'
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

// Simple markdown to HTML (no library needed for basic formatting)
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
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|b|t|p])/gm, '')
}

function App() {
  const [laws, setLaws] = useState<LawEntry[]>([])
  const [search, setSearch] = useState('')
  const [selectedLaw, setSelectedLaw] = useState<string | null>(null)
  const [lawContent, setLawContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [contentSearch, setContentSearch] = useState('')

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
    const law = laws.find(l => l.id === id)
    if (!law) return
    fetch(`./laws/${law.file}`)
      .then(r => r.text())
      .then(text => setLawContent(text))
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
            {law && (
              <a href={`https://github.com/mikelninh/gitlaw/blob/main/laws/${law.file}`}
                target="_blank" rel="noopener"
                className="flex items-center gap-1 text-xs text-ink-muted hover:text-gold transition-colors">
                <ExternalLink className="w-3 h-3" /> GitHub
              </a>
            )}
          </div>
        </header>

        {/* Law content */}
        <main className="max-w-3xl mx-auto px-5 py-8">
          {!lawContent ? (
            <div className="text-center py-20 text-ink-muted">Lade Gesetzestext...</div>
          ) : (
            <div className="law-content" dangerouslySetInnerHTML={{ __html: html }} />
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

      {/* Quick links */}
      <div className="bg-bg-alt border-b border-border">
        <div className="max-w-5xl mx-auto px-5 py-3 flex flex-wrap gap-2 justify-center">
          {[
            { id: 'gg', label: 'Grundgesetz' },
            { id: 'stgb', label: 'StGB' },
            { id: 'bgb', label: 'BGB' },
            { id: 'sgb_6', label: 'SGB VI (Rente)' },
            { id: 'netzdg', label: 'NetzDG' },
            { id: 'tierschg', label: 'Tierschutzgesetz' },
            { id: 'aufenthg_2004', label: 'Aufenthaltsgesetz' },
            { id: 'ao_1977', label: 'Abgabenordnung' },
          ].map(q => (
            <button key={q.id} onClick={() => loadLaw(q.id)}
              className="px-3 py-1.5 rounded-full text-sm bg-card border border-border text-ink-muted hover:text-gold hover:border-gold/30 transition-colors cursor-pointer">
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Law list */}
      <main className="max-w-5xl mx-auto px-5 py-8">
        {loading ? (
          <div className="text-center py-20 text-ink-muted">Lade Gesetzes-Index...</div>
        ) : (
          <>
            <p className="text-sm text-ink-muted mb-4">
              {search ? `${filtered.length} Ergebnisse für „${search}"` : `${filtered.length} Gesetze`}
            </p>
            <div className="space-y-1">
              {filtered.slice(0, 100).map(law => (
                <button
                  key={law.id}
                  onClick={() => loadLaw(law.id)}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-card hover:shadow-sm border border-transparent hover:border-border transition-all text-left cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {law.abbreviation && (
                        <span className="text-xs font-bold text-gold bg-gold-light px-2 py-0.5 rounded shrink-0">
                          {law.abbreviation}
                        </span>
                      )}
                      <span className="font-display text-[15px] group-hover:text-gold transition-colors truncate">
                        {law.title}
                      </span>
                    </div>
                    {law.date && (
                      <span className="text-xs text-ink-muted ml-0 sm:ml-[calc(var(--abbr-width)+12px)]">
                        {law.date}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="text-xs text-ink-muted hidden sm:block">{law.sections} §§</span>
                    <ArrowLeft className="w-4 h-4 text-ink-muted/30 rotate-180 group-hover:text-gold transition-colors" />
                  </div>
                </button>
              ))}
              {filtered.length > 100 && (
                <p className="text-center text-ink-muted text-sm py-4">
                  Zeige 100 von {filtered.length} — verfeinere deine Suche
                </p>
              )}
            </div>
          </>
        )}
      </main>

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
