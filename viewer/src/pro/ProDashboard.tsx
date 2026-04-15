/**
 * Pro landing — "Täglicher Begleiter"-Design.
 *
 * Drei zeitliche Hooks die der:die Anwält:in während des Tages braucht:
 *   ☕ Morgens    — Fristen + Intake-Eingänge + Heute offen
 *   💬 Mittags    — laufende Akten + schneller §-Einstieg
 *   🌙 Abends     — "Diese Woche gespart" (€/Zeit) + morgen's Fristen
 *
 * Alles auf EINEM Screen, keine Sidebar-Sucherei.
 */

import { Link } from 'react-router-dom'
import {
  FolderOpen, Search, FileText, Plus, Clock, AlertCircle, Inbox, Sparkles, TrendingUp,
} from 'lucide-react'
import {
  getSettings, listAudit, listCases, listIntakes, listLetters, listResearch,
} from './store'
import { savingsThisWeek } from './savings'

function getSettingsName(): string {
  const s = getSettings()
  // Use the first name part if Anwält:in name is set, otherwise blank (no greeting suffix)
  if (!s.anwaltName) return ''
  // Strip titles like "RAin", "Dr.", etc. for greeting
  const parts = s.anwaltName
    .replace(/^(RAin|RA|Rechtsanwalt|Rechtsanwältin|Dr\.|Prof\.|Dipl\.-[A-Za-z]+)\s+/g, '')
    .split(/\s+/)
  return parts[0] || ''
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

export default function ProDashboard() {
  const cases = listCases()
  const research = listResearch()
  const letters = listLetters()
  const pendingIntakes = listIntakes({ reviewed: false })
  const recentAudit = listAudit().slice(0, 5)
  const savings = savingsThisWeek()

  const upcomingFristen = cases
    .filter(c => c.status === 'aktiv' && c.fristDatum)
    .map(c => ({ c, days: daysUntil(c.fristDatum!) }))
    .filter(({ days }) => days <= 14)
    .sort((a, b) => a.days - b.days)

  const todaysActivity = [...research, ...letters].filter(x => isToday(x.createdAt))

  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'Guten Morgen' : hour < 14 ? 'Mittag' : hour < 18 ? 'Nachmittag' : 'Guten Abend'

  return (
    <div className="space-y-8">
      <header className="bg-gradient-to-r from-[var(--color-gold-light)] via-[var(--color-bg-alt)] to-transparent rounded-2xl p-6 -mx-2">
        <h1 className="h-page">
          {greeting}
          {(getSettingsName()) && (
            <span className="text-[var(--color-ink-soft)] font-normal" style={{ fontSize: '1.5rem' }}>
              , {getSettingsName()}
            </span>
          )}
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)]">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      {/* ☕ HEUTE-Block — das Morgenritual */}
      {(upcomingFristen.length > 0 || pendingIntakes.length > 0 || todaysActivity.length > 0) && (
        <section className="bg-white border border-[var(--color-border)] rounded-2xl p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <span>☕</span> Heute
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <HeuteCard
              icon={<Clock className="w-4 h-4" />}
              label="Fristen ≤ 7 Tage"
              value={upcomingFristen.filter(f => f.days <= 7).length}
              tone={upcomingFristen.some(f => f.days <= 0) ? 'red' : upcomingFristen.some(f => f.days <= 3) ? 'amber' : 'neutral'}
              to="/pro/akten"
            />
            <HeuteCard
              icon={<Inbox className="w-4 h-4" />}
              label="Neue Mandant:innen-Eingänge"
              value={pendingIntakes.length}
              tone={pendingIntakes.length > 0 ? 'gold' : 'neutral'}
              to="/pro/eingaenge"
            />
            <HeuteCard
              icon={<Sparkles className="w-4 h-4" />}
              label="Heute bereits erledigt"
              value={todaysActivity.length}
              sublabel={todaysActivity.length > 0 ? `${todaysActivity.length} Vorgänge` : 'Noch nichts'}
              tone="neutral"
              to="/pro/audit"
            />
          </div>
        </section>
      )}

      {/* Fristen der kommenden 14 Tage */}
      {upcomingFristen.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--color-gold)]" />
            Fristen ({upcomingFristen.length})
          </h2>
          <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
            {upcomingFristen.map(({ c, days }) => (
              <li key={c.id}>
                <Link
                  to={`/pro/akten/${c.id}`}
                  className={`block px-4 py-3 text-sm transition-colors ${
                    days < 0
                      ? 'bg-red-50 hover:bg-red-100'
                      : days <= 7
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : 'hover:bg-[var(--color-bg-alt)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-[var(--color-gold)]">{c.aktenzeichen}</span>
                        <span className="font-semibold truncate">{c.mandantName}</span>
                      </div>
                      {c.fristBezeichnung && (
                        <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">{c.fristBezeichnung}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`text-xs font-medium ${
                          days < 0
                            ? 'text-red-800'
                            : days === 0
                              ? 'text-red-700'
                              : days <= 7
                                ? 'text-amber-800'
                                : 'text-[var(--color-ink-soft)]'
                        }`}
                      >
                        {days < 0 ? `${-days}T abgelaufen` : days === 0 ? 'HEUTE' : `in ${days}T`}
                      </span>
                      <div className="text-[10px] text-[var(--color-ink-muted)] font-mono">
                        {new Date(c.fristDatum!).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={<FolderOpen />} label="Aktive Akten" value={cases.filter(c => c.status === 'aktiv').length} to="/pro/akten" />
        <Stat icon={<Search />} label="Recherche-Notizen" value={research.length} to="/pro/recherche" />
        <Stat icon={<FileText />} label="Generierte Schreiben" value={letters.length} to="/pro/schreiben" />
      </section>

      {/* 🌙 WOCHE-Block — der Abendritual "was hab ich gespart" */}
      {savings.minutes > 0 && (
        <section className="bg-gradient-to-br from-[var(--color-bg-alt)] to-white border border-[var(--color-border)] rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-green-700">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-semibold">Diese Woche gespart</h2>
                <div className="mt-1">
                  <span className="text-3xl font-bold text-[var(--color-ink)]">{savings.humanTime}</span>
                  <span className="text-sm text-[var(--color-ink-muted)] ml-3">
                    ≈ €{savings.euroAt220.toLocaleString('de-DE')} bei 220 €/h
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs text-[var(--color-ink-muted)] text-right">
              <div>{savings.breakdown['letter.generate'] || 0}× Schreiben</div>
              <div>{savings.breakdown['research.query'] || 0}× Recherche</div>
              <div>{savings.breakdown['case.create'] || 0}× Akte</div>
            </div>
          </div>
        </section>
      )}

      {/* Aktions-Karten */}
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
            5 Vorlagen auf Kanzlei-Briefkopf.
          </p>
        </Link>
      </section>

      {recentAudit.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Letzte 5 Ereignisse</h2>
          <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
            {recentAudit.map(a => (
              <li key={a.id} className="px-4 py-3 text-sm flex items-baseline justify-between gap-3">
                <span className="text-[var(--color-ink-soft)] truncate">
                  <span className="font-mono text-[var(--color-ink-muted)] mr-2">{a.action}</span>
                  {a.detail}
                </span>
                <span className="text-xs text-[var(--color-ink-muted)] shrink-0">
                  {new Date(a.at).toLocaleString('de-DE')}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-[var(--color-ink-muted)] mt-2">
            Vollständiges Audit-Log unter{' '}
            <Link to="/pro/audit" className="underline">Audit-Log</Link>.
          </p>
        </section>
      )}

      {cases.length === 0 && (
        <div className="bg-white border border-dashed border-[var(--color-border)] rounded-2xl p-8 text-center">
          <AlertCircle className="w-6 h-6 text-[var(--color-ink-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--color-ink-soft)] mb-1">
            Noch keine Akten. Lege eine an oder lade ein Demo-Preset in{' '}
            <Link to="/pro/einstellungen" className="underline">Einstellungen</Link>.
          </p>
        </div>
      )}
    </div>
  )
}

function HeuteCard({
  icon, label, value, sublabel, tone, to,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sublabel?: string
  tone: 'red' | 'amber' | 'gold' | 'neutral'
  to: string
}) {
  const toneMap = {
    red: 'border-red-300 bg-red-50 text-red-900',
    amber: 'border-amber-300 bg-amber-50 text-amber-900',
    gold: 'border-amber-200 bg-amber-50 text-amber-900',
    neutral: 'border-[var(--color-border)] bg-[var(--color-bg-alt)] text-[var(--color-ink)]',
  }
  return (
    <Link
      to={to}
      className={`block rounded-lg border p-3 hover:shadow-sm transition ${toneMap[tone]}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      {sublabel && <div className="text-xs opacity-70 mt-0.5">{sublabel}</div>}
    </Link>
  )
}

function Stat({ icon, label, value, to }: { icon: React.ReactNode; label: string; value: number; to: string }) {
  return (
    <Link
      to={to}
      className="bg-white border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-gold)] transition-colors flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-alt)] flex items-center justify-center text-[var(--color-gold)]">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-semibold leading-none">{value}</div>
        <div className="text-sm text-[var(--color-ink-soft)] mt-1">{label}</div>
      </div>
    </Link>
  )
}
