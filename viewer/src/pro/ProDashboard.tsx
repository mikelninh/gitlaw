/**
 * Pro Dashboard — bewusst reduziert auf vier Blöcke:
 *   1. TodayWidget — was heute liegen bleibt
 *   2. Begrüßung mit Datum
 *   3. Beispiel-Akten (max 3) für schnellen Wiedereinstieg
 *   4. Drei Aktions-Karten — Akte / Recherche / Schreiben
 *
 * Alles andere (Workflow-Loop, Analytics, gespart-Widget, Audit-Excerpt)
 * lebt jetzt in den dedizierten Bereichen, nicht auf dem Cover.
 */

import { Link } from 'react-router-dom'
import { FolderOpen, Search, FileText, Plus, CheckCircle2, Gavel } from 'lucide-react'
import {
  getAccessContext, getSettings, listAlerts, listCases, listLetters, listResearch,
} from './store'
import { roleLabel } from './access'
import TodayWidget from './TodayWidget'

function getSettingsName(): string {
  const s = getSettings()
  if (!s.anwaltName) return ''
  const parts = s.anwaltName
    .replace(/^(RAin|RA|Rechtsanwalt|Rechtsanwältin|Dr\.|Prof\.|Dipl\.-[A-Za-z]+)\s+/g, '')
    .split(/\s+/)
  return parts[0] || ''
}

export default function ProDashboard() {
  const cases = listCases()
  const research = listResearch()
  const letters = listLetters()
  const access = getAccessContext()

  const featuredCases = cases
    .filter(c => c.status === 'aktiv')
    .map(c => {
      const caseResearch = research.filter(r => r.caseId === c.id)
      const caseLetters = letters.filter(l => l.caseId === c.id)
      const reviewedCount = caseResearch.filter(r => r.reviewed).length
      return { c, reviewedCount, letterCount: caseLetters.length }
    })
    .filter(x => x.reviewedCount > 0 || x.letterCount > 0)
    .sort((a, b) => (b.reviewedCount + b.letterCount) - (a.reviewedCount + a.letterCount))
    .slice(0, 3)

  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 14 ? 'Mittag' : hour < 18 ? 'Nachmittag' : 'Guten Abend'
  const name = getSettingsName()

  return (
    <div className="space-y-8">
      <header>
        <h1 className="h-page">
          {greeting}
          {name && (
            <span className="text-[var(--color-ink-soft)] font-normal" style={{ fontSize: '1.5rem' }}>
              , {name}
            </span>
          )}
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        {access && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-ink-soft)]">
            <span className="font-semibold">{roleLabel(access.role)}</span>
            <span>·</span>
            <span>{access.tenantId}</span>
          </div>
        )}
      </header>

      <TodayWidget />

      <RechtsprechungsAlertWidget />

      {featuredCases.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-700" />
            Beispiel-Akten
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {featuredCases.map(({ c, reviewedCount, letterCount }) => (
              <Link
                key={c.id}
                to={`/pro/akten/${c.id}`}
                className="bg-white border border-[var(--color-border)] rounded-2xl p-4 hover:border-[var(--color-gold)] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-[var(--color-gold)]">{c.aktenzeichen}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[var(--color-bg-alt)] text-[var(--color-ink-soft)] border border-[var(--color-border)]">
                    bereit
                  </span>
                </div>
                <h3 className="font-semibold mt-2">{c.mandantName}</h3>
                <p className="text-sm text-[var(--color-ink-soft)] mt-1 line-clamp-3">{c.description}</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-3">
                  {reviewedCount} gepr. Recherche{reviewedCount === 1 ? '' : 'n'} · {letterCount} Schreiben
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link
          to="/pro/akten?new=1"
          className="bg-white border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-gold)] transition-colors"
        >
          <Plus className="w-5 h-5 text-[var(--color-gold)] mb-2" />
          <h3 className="font-semibold mb-1">Neue Akte anlegen</h3>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Mandant:in + Aktenzeichen + optionale Frist.
          </p>
        </Link>
        <Link
          to="/pro/recherche"
          className="bg-white border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-gold)] transition-colors"
        >
          <Search className="w-5 h-5 text-[var(--color-gold)] mb-2" />
          <h3 className="font-semibold mb-1">Schnelle Recherche</h3>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Frage → verifizierte Paragraphen-Belege.
          </p>
        </Link>
        <Link
          to="/pro/schreiben"
          className="bg-white border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-gold)] transition-colors"
        >
          <FileText className="w-5 h-5 text-[var(--color-gold)] mb-2" />
          <h3 className="font-semibold mb-1">Schreiben generieren</h3>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Vorlagen auf eigenem Briefkopf.
          </p>
        </Link>
      </section>

      {cases.length === 0 && (
        <div className="bg-white border border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center">
          <FolderOpen className="w-6 h-6 text-[var(--color-ink-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--color-ink-soft)] mb-1">
            Noch keine Akten. Lege eine an oder lade ein Demo-Preset in{' '}
            <Link to="/pro/einstellungen" className="underline">Einstellungen</Link>.
          </p>
        </div>
      )}
    </div>
  )
}

function RechtsprechungsAlertWidget() {
  const alerts = listAlerts().slice(0, 3)
  if (alerts.length === 0) return null
  return (
    <section className="bg-white border border-[var(--color-border)] rounded-2xl p-5">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Gavel className="w-4 h-4 text-[var(--color-gold)]" />
        Rechtsprechungs-News
      </h2>
      <div className="space-y-2">
        {alerts.map(a => (
          <div key={a.id} className="rounded-lg border border-[var(--color-border)] p-3 bg-[var(--color-bg-alt)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{a.court} · {new Date(a.rulingDate).toLocaleDateString('de-DE')}</p>
              </div>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 shrink-0">
                {a.paragraph.display}
              </span>
            </div>
            {a.summary && <p className="text-xs text-[var(--color-ink-soft)] mt-2 line-clamp-2">{a.summary}</p>}
            {a.url && (
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-gold)] hover:underline mt-1 inline-block">
                Zum Volltext →
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

