/**
 * Pro landing — quick stats + jump-off points.
 */

import { Link } from 'react-router-dom'
import { FolderOpen, Search, FileText, Plus } from 'lucide-react'
import { listAudit, listCases, listLetters, listResearch } from './store'

export default function ProDashboard() {
  const cases = listCases()
  const research = listResearch()
  const letters = listLetters()
  const recentAudit = listAudit().slice(0, 5)

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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link
          to="/pro/akten?new=1"
          className="bg-white border border-[var(--color-border)] rounded-2xl p-6 hover:border-[var(--color-gold)] transition-colors group"
        >
          <Plus className="w-5 h-5 text-[var(--color-gold)] mb-2" />
          <h3 className="font-semibold mb-1">Neue Akte anlegen</h3>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Mandant:in + Aktenzeichen. Recherche und Schreiben werden später daran geheftet.
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
          <h2 className="font-semibold mb-3">Letzte Aktivität</h2>
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
        </section>
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
