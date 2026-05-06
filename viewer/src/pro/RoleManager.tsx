/**
 * RoleManager — zeigt die verfügbaren Rollen und erklärt ihre Berechtigungen.
 * MVP: localStorage-basiertes Rollen-Mapping pro Tenant (kein echtes Auth).
 * Voice: respektvoll-warm, kein Marketing-Deutsch.
 */

import { useState } from 'react'
import { Shield } from 'lucide-react'
import type { ProRole } from './access'
import { roleLabel } from './access'
import { getAccessContext, setAccessContext } from './store'

interface RoleEntry {
  role: ProRole
  description: string
  scopes: string[]
}

const ROLE_DEFINITIONS: RoleEntry[] = [
  {
    role: 'owner',
    description: 'Vollzugriff inkl. Einstellungen, Billing und Audit.',
    scopes: ['Alle Bereiche'],
  },
  {
    role: 'anwalt',
    description: 'Wie Inhaber:in, ohne Billing-Zugang.',
    scopes: ['Akten', 'Recherche', 'Schreiben', 'Dokumente', 'Eingänge', 'Audit'],
  },
  {
    role: 'paralegal',
    description: 'Refa / Rechtsanwaltsfachangestellte — alle operativen Aufgaben.',
    scopes: ['Akten', 'Recherche', 'Schreiben', 'Dokumente', 'Eingänge (klassifizieren)', 'Audit (lesen)'],
  },
  {
    role: 'assistenz',
    description: 'Anlegen und Bearbeiten, kein Archivieren und kein Audit-Zugang.',
    scopes: ['Akten', 'Recherche erstellen', 'Schreiben erstellen', 'Dokumente', 'Eingänge klassifizieren'],
  },
  {
    role: 'assistant',
    description: 'Hilfskraft — nur Lesen und Klassifizieren.',
    scopes: ['Akten lesen', 'Eingänge klassifizieren'],
  },
  {
    role: 'read_only',
    description: 'Nur Lesen — keine Bearbeitung.',
    scopes: ['Akten lesen', 'Recherchen lesen'],
  },
]

export default function RoleManager() {
  const ctx = getAccessContext()
  const [currentRole, setCurrentRoleState] = useState<ProRole>(ctx?.role ?? 'read_only')
  const [saved, setSaved] = useState(false)

  if (!ctx) return null

  function handleRoleChange(role: ProRole) {
    if (!ctx) return
    setCurrentRoleState(role)
    setSaved(false)
  }

  function handleSave() {
    if (!ctx) return
    setAccessContext({ ...ctx, role: currentRole })
    setSaved(true)
  }

  return (
    <section className="bg-white border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-[var(--color-gold)]" /> Rollenmodell (MVP-Vorschau)
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)]">
          Deine aktuelle Rolle bestimmt, welche Bereiche du sehen und bearbeiten kannst.
          Echtzeit-Rollenverwaltung pro Nutzer folgt mit dem Server-Sync.
        </p>
      </div>

      <div className="space-y-2">
        {ROLE_DEFINITIONS.map(def => (
          <label
            key={def.role}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
              currentRole === def.role
                ? 'border-[var(--color-gold)] bg-amber-50'
                : 'border-[var(--color-border)] hover:border-[var(--color-gold)]'
            }`}
          >
            <input
              type="radio"
              name="proRole"
              value={def.role}
              checked={currentRole === def.role}
              onChange={() => handleRoleChange(def.role)}
              className="mt-1 accent-[var(--color-gold)]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{roleLabel(def.role)}</span>
                <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">{def.role}</span>
              </div>
              <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">{def.description}</p>
              <p className="text-[11px] text-[var(--color-ink-muted)] mt-1">
                {def.scopes.join(' · ')}
              </p>
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={currentRole === ctx.role}
          className="text-sm bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 hover:opacity-90 disabled:opacity-40"
        >
          Rolle speichern
        </button>
        {saved && (
          <span className="text-sm text-green-700">
            Gespeichert — Seite neu laden damit alle Bereiche korrekt aktualisiert werden.
          </span>
        )}
      </div>

      <p className="text-xs text-[var(--color-ink-muted)] italic">
        MVP-Modus: Rollenänderungen gelten nur für diesen Browser. Kanzleiweite Nutzerverwaltung
        folgt mit dem Server-Sync (Phase 2).
      </p>
    </section>
  )
}
