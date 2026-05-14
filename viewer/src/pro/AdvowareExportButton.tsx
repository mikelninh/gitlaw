/**
 * Button zum CSV-Export aller Akten im Advoware-Mandanten-Schema.
 *
 * Generiert die Datei client-seitig und triggert einen Browser-Download
 * via Blob + URL.createObjectURL — kein Server-Roundtrip nötig.
 *
 * Phase 2: Ersatz durch direkte Advoware REST-API (advoware@stp.one).
 */

import { useState } from 'react'
import { Download } from 'lucide-react'
import type { MandantCase } from './types'
import { exportCasesToAdvowareCSV } from './advoware-export'

interface Props {
  cases: MandantCase[]
}

export default function AdvowareExportButton({ cases }: Props) {
  const [done, setDone] = useState(false)

  function handleExport() {
    const csv = exportCasesToAdvowareCSV(cases)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `gitlaw-advoware-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setDone(true)
    setTimeout(() => setDone(false), 2500)
  }

  return (
    <button
      onClick={handleExport}
      disabled={cases.length === 0}
      title="Exportiert alle Akten als Advoware-kompatible CSV (Schema-Best-Guess — mit STP validieren)"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <Download size={14} />
      {done ? 'Exportiert' : 'Akten als CSV exportieren'}
    </button>
  )
}
