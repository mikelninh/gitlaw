/**
 * Bundle-Export pro Mandant:innen-Akte als ZIP.
 *
 * Enthält:
 *   - meta.txt           — Akten-Kopfdaten
 *   - recherche-XXX.pdf  — pro gespeicherter Recherche-Notiz
 *   - schreiben-XXX.pdf  — pro generiertem Schreiben
 *   - auditlog.pdf       — vollständiges Audit-Log der Akte
 *
 * Warum nicht einfach Einzel-Downloads: David (unser Pflichtverteidiger-
 * Test-Anwalt) sagt, er braucht „eine Datei pro Mandant:in" für sein
 * Aktensystem. Einzeln downloaden und manuell in Ordner schieben ist
 * Reibung, die er nicht hat.
 */

import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import type {
  AuditEntry,
  GeneratedLetter,
  KanzleiSettings,
  MandantCase,
  ResearchQuery,
} from './types'
import { exportResearchPDF, exportLetterPDF, exportAuditPDF } from './pdf'

// jsPDF-output-Helpers, mirror pdf.ts internals — but instead of .save()
// we need raw bytes for ZIP insertion. jsPDF exposes `.output('arraybuffer')`.
// We inline tiny wrappers that reuse pdf.ts logic via saveAs side-effect
// isn't ZIP-friendly, so we rebuild the three exports as buffer variants.

// Mini-variants of the exports that return bytes instead of .save()-ing.
// To keep DRY, we monkey-patch save → collect-to-buffer. This keeps the
// pdf.ts single source of truth for layout.
function captureSave(fn: () => void): ArrayBuffer {
  let captured: ArrayBuffer | null = null
  const origSave = jsPDF.prototype.save
  // @ts-expect-error - temporary override
  jsPDF.prototype.save = function (this: jsPDF, _filename: string) {
    captured = this.output('arraybuffer') as ArrayBuffer
  }
  try {
    fn()
  } finally {
    jsPDF.prototype.save = origSave
  }
  if (!captured) throw new Error('PDF generator did not call save()')
  return captured
}

export async function exportCaseBundle(args: {
  settings: KanzleiSettings
  caseInfo: MandantCase
  research: ResearchQuery[]
  letters: GeneratedLetter[]
  audit: AuditEntry[]
}): Promise<void> {
  const { settings, caseInfo, research, letters, audit } = args
  const zip = new JSZip()

  // meta.txt — human-readable case summary
  const meta = [
    `Akte:        ${caseInfo.aktenzeichen}`,
    `Mandant:in:  ${caseInfo.mandantName}`,
    `Sache:       ${caseInfo.description || '—'}`,
    `Status:      ${caseInfo.status}`,
    `Angelegt:    ${new Date(caseInfo.createdAt).toLocaleString('de-DE')}`,
    `Aktualisiert:${new Date(caseInfo.updatedAt).toLocaleString('de-DE')}`,
    caseInfo.fristDatum
      ? `Frist:       ${new Date(caseInfo.fristDatum).toLocaleDateString('de-DE')}${caseInfo.fristBezeichnung ? ' — ' + caseInfo.fristBezeichnung : ''}`
      : 'Frist:       —',
    '',
    `Enthaltene Dokumente:`,
    `  • ${research.length} Recherche-Notiz(en)`,
    `  • ${letters.length} Schreiben`,
    `  • ${audit.length} Audit-Einträge`,
    '',
    `Kanzlei:     ${settings.name || '—'}`,
    `Anwält:in:   ${settings.anwaltName || '—'}`,
    '',
    `Exportiert:  ${new Date().toLocaleString('de-DE')}`,
    `Tool:        GitLaw Pro (Beta)`,
  ].join('\n')
  zip.file('meta.txt', meta)

  // Research PDFs
  research.forEach((r, i) => {
    const bytes = captureSave(() => exportResearchPDF({ settings, research: r, caseInfo }))
    zip.file(
      `recherche-${String(i + 1).padStart(2, '0')}-${r.id.slice(0, 6)}.pdf`,
      bytes,
    )
  })

  // Letter PDFs
  letters.forEach((l, i) => {
    const bytes = captureSave(() => exportLetterPDF({ settings, letter: l, caseInfo }))
    zip.file(
      `schreiben-${String(i + 1).padStart(2, '0')}-${l.templateId}-${l.id.slice(0, 6)}.pdf`,
      bytes,
    )
  })

  // Audit PDF
  if (audit.length > 0) {
    const bytes = captureSave(() => exportAuditPDF({ settings, entries: audit, caseInfo }))
    zip.file('auditlog.pdf', bytes)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Akte_${caseInfo.aktenzeichen.replace(/[^\w-]/g, '_')}_${new Date()
    .toISOString()
    .slice(0, 10)}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
