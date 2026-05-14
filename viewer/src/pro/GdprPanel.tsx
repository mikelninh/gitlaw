/**
 * DSGVO-Rechte-Panel für Pro-Settings.
 *
 * Einbinden in ProSettings.tsx:
 *   import GdprPanel from './GdprPanel'
 *   // Irgendwo in der Render-Ausgabe:
 *   <GdprPanel tenantId={session.tenantId} sessionToken={sessionToken} />
 *
 * Voraussetzungen:
 *   - tenantId: string  (aus Pro-Session)
 *   - sessionToken: string  (Bearer-Token für die API-Calls)
 */

import { useState } from 'react'
import { Shield, Download, Trash2, AlertTriangle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'

interface Props {
  tenantId: string
  sessionToken: string
}

type Panel = 'none' | 'export' | 'delete'

export default function GdprPanel({ tenantId, sessionToken }: Props) {
  const [activePanel, setActivePanel] = useState<Panel>('none')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const requiredConfirmText = `LÖSCHEN-${tenantId}`

  async function handleExport() {
    setLoading(true)
    setStatus(null)
    try {
      const resp = await fetch(`${API_URL}/api/pro/gdpr/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ scope: 'tenant' }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `HTTP ${resp.status}`)
      }
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gitlaw-export-${tenantId}-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
      setStatus({ type: 'success', message: 'Export heruntergeladen.' })
    } catch (err) {
      setStatus({ type: 'error', message: `Export fehlgeschlagen: ${String(err)}` })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== requiredConfirmText) return
    setLoading(true)
    setStatus(null)
    try {
      const resp = await fetch(`${API_URL}/api/pro/gdpr/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ confirmText: deleteConfirm, scope: 'tenant' }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error((data as { error?: string }).error ?? `HTTP ${resp.status}`)
      }
      const d = data as { scheduledDeletionAt?: string }
      setStatus({
        type: 'success',
        message: `Löschantrag registriert. Daten werden am ${d.scheduledDeletionAt?.slice(0, 10) ?? '(unbekannt)'} gelöscht.`,
      })
      setActivePanel('none')
      setDeleteConfirm('')
    } catch (err) {
      setStatus({ type: 'error', message: `Löschantrag fehlgeschlagen: ${String(err)}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="border border-gray-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-gray-500" />
        <h3 className="font-medium text-sm text-gray-800">Ihre DSGVO-Rechte</h3>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Als Verantwortliche:r haben Sie nach Art. 20 DSGVO das Recht auf Datenportabilität
        und nach Art. 17 das Recht auf Löschung. Diese Funktionen setzen das technisch um.
      </p>

      {status && (
        <div
          className={`text-xs rounded px-3 py-2 ${
            status.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {status.message}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setActivePanel(activePanel === 'export' ? 'none' : 'export')
            setStatus(null)
          }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Daten exportieren (Art. 20)
        </button>

        <button
          type="button"
          onClick={() => {
            setActivePanel(activePanel === 'delete' ? 'none' : 'delete')
            setStatus(null)
            setDeleteConfirm('')
          }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Daten löschen (Art. 17)
        </button>
      </div>

      {activePanel === 'export' && (
        <div className="bg-gray-50 rounded p-4 space-y-3">
          <p className="text-xs text-gray-600">
            Exportiert alle Kanzleidaten als ZIP: Akten, Schriftsätze, Recherchen,
            Dokumentenmetadaten. Dokument-Inhalte sind separat über das Vault abrufbar.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Export läuft...' : 'ZIP herunterladen'}
          </button>
        </div>
      )}

      {activePanel === 'delete' && (
        <div className="bg-red-50 border border-red-200 rounded p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-red-800">Löschantrag stellen</p>
              <p className="text-xs text-red-700 leading-relaxed">
                Alle Tenant-Daten werden nach 30 Tagen endgültig gelöscht.
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-gray-700">
              Zur Bestätigung eingeben:{' '}
              <code className="bg-white border border-gray-300 rounded px-1 py-0.5 font-mono">
                {requiredConfirmText}
              </code>
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={requiredConfirmText}
              className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-red-400"
            />
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || deleteConfirm !== requiredConfirmText}
            className="text-xs px-3 py-1.5 rounded bg-red-700 text-white hover:bg-red-800 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Wird verarbeitet...' : 'Löschantrag absenden'}
          </button>
        </div>
      )}
    </section>
  )
}
