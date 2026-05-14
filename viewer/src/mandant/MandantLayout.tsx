/**
 * Layout für das Mandanten-Portal — bewusst anders als /pro.
 *
 * /pro ist dicht und Anwalt-orientiert. Hier: warm, einfach, wenig Text,
 * viel Luft. Mandant:innen kommen hierher um Dokumente einzureichen und
 * den Status zu sehen — kein Fachjargon, keine Sidebar-Fachmenüs.
 */

import { NavLink, Outlet } from 'react-router-dom'
import { FileText, LogOut, ClipboardList, PenTool } from 'lucide-react'
import { clearMandantSession } from './mandant-auth'
import type { MandantLang } from './mandant-i18n'
import { getMandantStrings } from './mandant-i18n'

interface Props {
  lang: MandantLang
  onLangChange: (lang: MandantLang) => void
  onLogout: () => void
}

export default function MandantLayout({ lang, onLangChange, onLogout }: Props) {
  const t = getMandantStrings(lang)

  function handleLogout() {
    clearMandantSession()
    onLogout()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--color-gold)]" />
            <span className="font-semibold">{t.portalName}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sprachschalter DE / VI */}
            <div className="flex items-center rounded-lg border border-[var(--color-border)] overflow-hidden text-xs">
              <button
                onClick={() => onLangChange('de')}
                className={`px-2.5 py-1.5 ${lang === 'de' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-alt)]'}`}
              >
                DE
              </button>
              <button
                onClick={() => onLangChange('vi')}
                className={`px-2.5 py-1.5 ${lang === 'vi' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-alt)]'}`}
              >
                VI
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              title={t.navLogout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav — einfach, nur 2 Punkte */}
      <nav className="border-b border-[var(--color-border)] bg-white">
        <div className="max-w-2xl mx-auto px-4 flex gap-0">
          <NavLink
            to="/mandant/akte"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-3 text-sm border-b-2 transition-colors ${
                isActive
                  ? 'border-[var(--color-gold)] text-[var(--color-ink)] font-medium'
                  : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
              }`
            }
          >
            <FileText className="w-4 h-4" />
            {t.navAkte}
          </NavLink>
          <NavLink
            to="/mandant/sachstand"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-3 text-sm border-b-2 transition-colors ${
                isActive
                  ? 'border-[var(--color-gold)] text-[var(--color-ink)] font-medium'
                  : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
              }`
            }
          >
            <ClipboardList className="w-4 h-4" />
            {t.navSachstand}
          </NavLink>
          <NavLink
            to="/mandant/vollmacht"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-3 text-sm border-b-2 transition-colors ${
                isActive
                  ? 'border-[var(--color-gold)] text-[var(--color-ink)] font-medium'
                  : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
              }`
            }
          >
            <PenTool className="w-4 h-4" />
            {t.navVollmacht}
          </NavLink>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--color-border)] mt-12">
        <div className="max-w-2xl mx-auto px-4 py-3 text-xs text-[var(--color-ink-muted)]">
          {t.poweredBy}
        </div>
      </footer>
    </div>
  )
}
