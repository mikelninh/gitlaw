/**
 * Pro landing — quick stats + jump-off points + upcoming Fristen widget.
 */

import { Link } from 'react-router-dom'
import { FolderOpen, Search, FileText, Plus, Clock, AlertCircle } from 'lucide-react'
import { listAudit, listCases, listLetters, listResearch } from './store'

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function ProDashboard() {
  const cases = listCases()
  const research = listResearch()
  const letters = listLetters()
  const recentAudit = listAudit().slice(0, 5)

  // Fristen der nächsten 14 Tage oder abgelaufen — aktive Akten only
  const upcomingFristen = cases
    .filter(c => c.status === 'aktiv' && c.fristDatum)
    .map(c => ({ c, days: daysUntil(c.fristDatum!) }))
    .filter(({ days }) => days <= 14)
    .sort((a, b) => a.days - b.days)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold mb-1">Übersicht</h1>
        <p className="text-sm text-[var(--color-ink-soft)]">
          Beta-Workspace · alle Daten liegen in deinem Browser, nicht auf unserem Server.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={<FolderOpen />} label="Aktive Akten" value={cases.filter(c => c.status === 'aktiv').length} to="/pro/akten" />
        <Stat icon={<Search />} label="Recherche-Notizen" value={research.length} to="/pro/recherche" />
        <Stat icon={<FileText />} label="Generierte Schreiben" value={letters.length} to="/pro/schreiben" />
      </section>

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
                        {days < 0
                          ? `${-days}T abgelaufen`
                          : days === 0
                            ? 'HEUTE'
                            : `in ${days}T`}
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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link
          to="/pro/akten?new=1"
          className="bg-white border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-gold)] transition-colors group"
        >
          <Plus className="w-5 h-5 text-[var(--color-gold)] mb-2" />
          <h3 className="font-semibold mb-1">Neue Akte anlegen</h3>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Mandant:in + Aktenzeichen + optionale Frist. Recherche und Schreiben werden später angeheftet.
          </p>
        </Link>
        <Link
          to="/pro/recherche"
          className="bg-white border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-gold)] transition-colors group"
        >
          <Search className="w-5 h-5 text-[var(--color-gold)] mb-2" />
          <h3 className="font-semibold mb-1">Schnelle Recherche</h3>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Frage stellen → KI antwortet mit Paragraphen-Belegen, die wir gegen 5.936 Gesetze prüfen.
          </p>
        </Link>
        <Link
          to="/pro/schreiben"
          className="bg-white border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-gold)] transition-colors group"
        >
          <FileText className="w-5 h-5 text-[var(--color-gold)] mb-2" />
          <h3 className="font-semibold mb-1">Schreiben generieren</h3>
          <p className="text-sm text-[var(--color-ink-soft)]">
            5 Vorlagen: Strafanzeige, Widerspruch, Mahnschreiben, Mandatsanzeige, Akteneinsicht.
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
