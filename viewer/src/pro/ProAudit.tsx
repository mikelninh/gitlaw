/**
 * Audit-Log viewer (kanzlei-wide). Exports as branded PDF for BHV / Compliance.
 */

import { useMemo, useState } from 'react'
import { Download, Filter } from 'lucide-react'
import { getSettings, listAudit } from './store'
import { exportAuditPDF } from './pdf'

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  'case.create': 'Akte angelegt',
  'case.archive': 'Akte archiviert',
  'research.query': 'Recherche-Anfrage',
  'letter.generate': 'Schreiben generiert',
  'pdf.export': 'PDF-Export',
  'settings.update': 'Profil aktualisiert',
}

export default function ProAudit() {
  const all = useMemo(() => listAudit(), [])
  const [filterAction, setFilterAction] = useState<string>('')
  const filtered = filterAction ? all.filter(a => a.action === filterAction) : all
  const actions = Array.from(new Set(all.map(a => a.action)))

  function onExport() {
    exportAuditPDF({ settings: getSettings(), entries: filtered })
  }

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="h-page">Audit-Log</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Lückenlose Aufzeichnung aller Aktionen — exportierbar für BHV-Versicherung
            und interne Compliance.
          </p>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
          >
            <Download className="w-4 h-4" /> {filtered.length} Einträge als PDF
          </button>
        )}
      </header>

      {actions.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Filter className="w-4 h-4 text-[var(--color-ink-muted)]" />
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="border border-[var(--color-border)] rounded-lg px-2 py-1 text-sm"
          >
            <option value="">Alle Aktionstypen</option>
            {actions.map(a => (
              <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-[var(--color-border)] rounded-2xl p-10 text-center">
          <p className="text-sm text-[var(--color-ink-soft)]">Keine Einträge im Log.</p>
        </div>
      ) : (
        <ul className="bg-white border border-[var(--color-border)] rounded-2xl divide-y divide-[var(--color-border)]">
          {filtered.map(a => (
            <li key={a.id} className="px-4 py-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-xs text-[var(--color-gold)] shrink-0">
                  {ACTION_LABELS[a.action] || a.action}
                </span>
                <span className="text-xs text-[var(--color-ink-muted)] shrink-0">
                  {new Date(a.at).toLocaleString('de-DE')}
                </span>
              </div>
              <div className="text-sm text-[var(--color-ink-soft)] mt-1">{a.detail}</div>
              {a.actor && (
                <div className="text-xs text-[var(--color-ink-muted)] mt-0.5">
                  durch: {a.actor}
                  {a.caseId && <span className="ml-2 font-mono">akte:{a.caseId.slice(0, 6)}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
