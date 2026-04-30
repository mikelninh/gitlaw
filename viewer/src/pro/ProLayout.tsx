/**
 * Pro shell layout: top bar + sidebar + content outlet.
 *
 * Visual language: serious, dense, professional. Different from the citizen
 * version (which is more inviting, with daily-law cards etc.).
 */

import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Scale, FolderOpen, FileText, Search, Settings, Shield, LogOut, ExternalLink, Inbox, Cloud, RefreshCw, AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import { clearStoredInvite, getAccessContext, getSettings, isSessionExpired, listIntakes, touchSessionActivity } from './store'
import { hasRole, type ProRole } from './access'
import {
  getSyncState,
  isCloudSyncEnabled,
  pullFromCloud,
  subscribeSyncState,
  type SyncStatus,
} from './sync'
import { eraseAllProData } from './store'
import { loadDemoData, getPreset } from './demo-data'

const NAV_GROUPS = [
  {
    title: 'Arbeitsfluss',
    items: [
      { to: '/pro', icon: Scale, label: 'Übersicht', end: true, badge: 0 as const, minRole: 'read_only' as ProRole },
      { to: '/pro/eingaenge', icon: Inbox, label: 'Eingänge', badge: 'pending' as const, minRole: 'assistenz' as ProRole },
      { to: '/pro/akten', icon: FolderOpen, label: 'Akten', badge: 0 as const, minRole: 'assistenz' as ProRole },
      { to: '/pro/recherche', icon: Search, label: 'Recherche', badge: 0 as const, minRole: 'assistenz' as ProRole },
      { to: '/pro/schreiben', icon: FileText, label: 'Schreiben', badge: 0 as const, minRole: 'assistenz' as ProRole },
    ],
  },
  {
    title: 'Verwaltung',
    items: [
      { to: '/pro/audit', icon: Shield, label: 'Audit', badge: 0 as const, minRole: 'anwalt' as ProRole },
      { to: '/pro/import', icon: Upload, label: 'Import', badge: 0 as const, minRole: 'assistenz' as ProRole },
      { to: '/pro/einstellungen', icon: Settings, label: 'Einstellungen', badge: 0 as const, minRole: 'owner' as ProRole },
    ],
  },
]

export default function ProLayout() {
  const settings = getSettings()
  const access = getAccessContext()
  const location = useLocation()
  const navigate = useNavigate()
  const [syncState, setSyncState] = useState(getSyncState())

  const needsConfig = !settings.name || !settings.anwaltName
  const pendingIntakes = listIntakes({ reviewed: false }).length

  // Pending preset switch: User kam mit ?preset=X aber andere Demo war geladen.
  // Wir bieten einen 1-Klick-Switch mit Klartext-Hinweis was passiert.
  const pendingSwitch = typeof window !== 'undefined'
    ? localStorage.getItem('gitlaw.pro.pendingPresetSwitch.v1')
    : null
  const pendingSwitchPresetLabel = pendingSwitch && getPreset(pendingSwitch)?.label

  function applyPresetSwitch() {
    if (!pendingSwitch) return
    if (!confirm(
      `Auf Demo „${pendingSwitchPresetLabel}" wechseln?\n\n` +
      `Das löscht alle aktuellen Pro-Daten in diesem Browser ` +
      `(Akten, Recherchen, Schreiben, Audit-Log, Profil) und lädt das ` +
      `neue Preset frisch.\n\nFortfahren?`,
    )) return
    eraseAllProData()
    try { loadDemoData(pendingSwitch) } catch {}
    localStorage.removeItem('gitlaw.pro.pendingPresetSwitch.v1')
    window.location.hash = '#/pro'
    window.location.reload()
  }
  function dismissPresetSwitch() {
    localStorage.removeItem('gitlaw.pro.pendingPresetSwitch.v1')
    window.location.reload()
  }

  // Sync-State subscription
  useEffect(() => subscribeSyncState(setSyncState), [])

  // Session hygiene for beta: local idle timeout + activity touch.
  useEffect(() => {
    const onActivity = () => touchSessionActivity()
    const events = ['click', 'keydown', 'mousemove', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    const id = window.setInterval(() => {
      if (isSessionExpired(120)) {
        clearStoredInvite()
        window.location.hash = '#/pro'
        window.location.reload()
      }
    }, 60 * 1000)
    return () => {
      window.clearInterval(id)
      events.forEach(e => window.removeEventListener(e, onActivity))
    }
  }, [])

  // Auto-Pull beim ersten Mount, falls Cloud-Sync aktiv (für den anderen
  // Browser im Werner+Jasmin-Setup: jedes neue Tab zieht zuerst die
  // aktuellsten Daten der Kanzlei).
  useEffect(() => {
    if (isCloudSyncEnabled()) {
      pullFromCloud().catch(() => { /* errors gehen via syncState */ })
    }
  }, [])

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
            <SyncIndicator state={syncState} />
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
            {access && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200" title={`tenant=${access.tenantId}`}>
                {access.role}
              </span>
            )}
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

      {pendingSwitchPresetLabel && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap text-sm">
            <span className="text-amber-900">
              <strong>Hinweis:</strong> Aus deinem Link wolltest du auf Preset{' '}
              <strong>„{pendingSwitchPresetLabel}"</strong> wechseln, aber es ist bereits eine
              andere Demo geladen. Möchtest du wechseln (alle aktuellen Pro-Daten löschen)?
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={applyPresetSwitch}
                className="text-xs bg-[var(--color-ink)] text-white rounded px-3 py-1.5 hover:opacity-90"
              >
                Ja, zu „{pendingSwitchPresetLabel}" wechseln
              </button>
              <button
                onClick={dismissPresetSwitch}
                className="text-xs text-amber-900 hover:text-amber-950"
              >
                Behalten
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <nav className="col-span-12 md:col-span-3 lg:col-span-2">
          <div className="space-y-5">
            {NAV_GROUPS.map(group => (
              <div key={group.title}>
                <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                  {group.title}
                </div>
                <ul className="space-y-1">
                  {group.items.filter(item => hasRole(item.minRole)).map(item => {
                    const showBadge = item.badge === 'pending' && pendingIntakes > 0
                    return (
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
                          <span className="flex-1">{item.label}</span>
                          {showBadge && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-[var(--color-gold)] text-white">
                              {pendingIntakes}
                            </span>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

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
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-[var(--color-ink-muted)] space-y-2">
          <p>
            <strong>Hinweis:</strong> GitLaw Pro ist ein Recherche- und Vorlagen-Tool.
            KI-gestützte Antworten und Schreiben ersetzen <em>keine</em> anwaltliche Prüfung
            und stellen <em>keine</em> Rechtsberatung dar. Vor jeder Verwendung gegenprüfen.
            Die Software befindet sich in geschlossener Beta — Funktionalität, Datenmodell
            und Fehlerzustände können sich jederzeit ändern.
          </p>
          <p>
            Betrieben von Mikel Ninh, Berlin ·{' '}
            <a href="https://github.com/mikelninh/gitlaw" target="_blank" rel="noopener" className="underline hover:text-[var(--color-ink)]">Quellcode (BSL → MIT in 4 Jahren)</a> ·{' '}
            <a href="https://github.com/mikelninh/gitlaw/blob/main/CHANGELOG.md" target="_blank" rel="noopener" className="underline hover:text-[var(--color-ink)]">Changelog</a> ·{' '}
            Stand: {new Date().toISOString().slice(0, 10)}
          </p>
        </div>
      </footer>
    </div>
  )
}

function SyncIndicator({ state }: { state: { status: SyncStatus; lastSync: string | null; lastError: string | null } }) {
  if (state.status === 'disabled') return null  // nothing — Cloud-Sync ist aus

  const cfg = (() => {
    switch (state.status) {
      case 'pushing':
        return { icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, text: 'Lade zur Cloud hoch', color: 'text-[var(--color-ink-muted)]' }
      case 'pulling':
        return { icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, text: 'Hole aus der Cloud', color: 'text-[var(--color-ink-muted)]' }
      case 'success': {
        const last = state.lastSync ? new Date(state.lastSync) : null
        const ago = last ? formatAgo(last) : ''
        return { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: ago, color: 'text-green-700' }
      }
      case 'error':
        return { icon: <AlertCircle className="w-3.5 h-3.5" />, text: 'Sync unterbrochen', color: 'text-[var(--color-danger)]' }
      case 'idle':
      default:
        return { icon: <Cloud className="w-3.5 h-3.5" />, text: 'Cloud aktiv', color: 'text-[var(--color-ink-muted)]' }
    }
  })()

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${cfg.color}`}
      title={state.lastError || (state.lastSync ? `Letzte Sync: ${new Date(state.lastSync).toLocaleString('de-DE')}` : 'Cloud-Sync aktiv')}
    >
      {cfg.icon}
      {cfg.text}
    </span>
  )
}

function formatAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 5) return 'Synchronisiert'
  if (sec < 60) return `vor ${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `vor ${min}min`
  const h = Math.floor(min / 60)
  return `vor ${h}h`
}
