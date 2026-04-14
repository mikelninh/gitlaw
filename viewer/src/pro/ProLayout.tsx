/**
 * Pro shell layout: top bar + sidebar + content outlet.
 *
 * Visual language: serious, dense, professional. Different from the citizen
 * version (which is more inviting, with daily-law cards etc.).
 */

import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Scale, FolderOpen, FileText, Search, Settings, Shield, LogOut, ExternalLink } from 'lucide-react'
import { clearStoredInvite, getSettings } from './store'

const NAV_ITEMS = [
  { to: '/pro', icon: Scale, label: 'Übersicht', end: true },
  { to: '/pro/akten', icon: FolderOpen, label: 'Mandant:innen-Akten' },
  { to: '/pro/recherche', icon: Search, label: 'Recherche' },
  { to: '/pro/schreiben', icon: FileText, label: 'Schreiben' },
  { to: '/pro/audit', icon: Shield, label: 'Audit-Log' },
  { to: '/pro/einstellungen', icon: Settings, label: 'Einstellungen' },
]

export default function ProLayout() {
  const settings = getSettings()
  const location = useLocation()
  const navigate = useNavigate()

  const needsConfig = !settings.name || !settings.anwaltName

  function handleLogout() {
    if (!confirm('Beta-Zugang dieses Browsers aufheben?')) return
    clearStoredInvite()
    navigate('/pro')
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      {/* Top bar */}
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/pro" className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[var(--color-gold)]" />
            <span className="font-semibold">GitLaw <span className="text-[var(--color-gold)]">Pro</span></span>
            <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
              Beta
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              to="/"
              className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] flex items-center gap-1"
              title="Bürger:innen-Version"
            >
              gitlaw.app <ExternalLink className="w-3 h-3" />
            </Link>
            <span className="text-[var(--color-ink-muted)]">|</span>
            <span className="text-[var(--color-ink-soft)]">
              {settings.anwaltName || <span className="italic text-[var(--color-ink-muted)]">Profil unvollständig</span>}
            </span>
            <button
              onClick={handleLogout}
              className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              title="Beta-Zugang aufheben"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <nav className="col-span-12 md:col-span-3 lg:col-span-2">
          <ul className="space-y-1">
            {NAV_ITEMS.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-[var(--color-ink)] text-white'
                        : 'text-[var(--color-ink-soft)] hover:bg-white hover:text-[var(--color-ink)]'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {needsConfig && location.pathname !== '/pro/einstellungen' && (
            <div className="mt-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong>Setup:</strong> Bitte zuerst{' '}
              <Link to="/pro/einstellungen" className="underline font-semibold">
                Kanzlei-Profil ausfüllen
              </Link>{' '}
              (für PDF-Briefkopf und Audit-Log).
            </div>
          )}
        </nav>

        {/* Content */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <Outlet />
        </main>
      </div>

      {/* Footer disclaimer — visible on every Pro page */}
      <footer className="border-t border-[var(--color-border)] bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-[var(--color-ink-muted)]">
          <strong>Hinweis:</strong> GitLaw Pro ist ein Recherche- und Vorlagen-Tool.
          Die KI-gestützten Antworten und Schreiben ersetzen <em>keine</em> anwaltliche Prüfung
          und stellen <em>keine</em> Rechtsberatung dar. Bitte vor jeder Verwendung gegenprüfen.
          Die Software befindet sich in geschlossener Beta — Funktionalität, Fehler, Datenmodell
          können sich jederzeit ändern.
        </div>
      </footer>
    </div>
  )
}
