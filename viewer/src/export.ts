/**
 * Export features for GitLaw
 * - PDF export of law sections
 * - Share link generation
 * - Copy to clipboard
 */

import { jsPDF } from 'jspdf'

/**
 * Export selected law text as PDF
 */
export function exportPDF(lawName: string, sections: { heading: string; text: string }[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 20
  const pageWidth = 210 - 2 * margin
  let y = margin

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(lawName, pageWidth)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 8 + 5

  // Date
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(128)
  doc.text(`Exportiert am ${new Date().toLocaleDateString('de-DE')} via GitLaw`, margin, y)
  doc.setTextColor(0)
  y += 10

  // Sections
  for (const section of sections) {
    // Check for page break
    if (y > 270) {
      doc.addPage()
      y = margin
    }

    // Section heading
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    const headingLines = doc.splitTextToSize(section.heading, pageWidth)
    doc.text(headingLines, margin, y)
    y += headingLines.length * 6 + 3

    // Section text
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const textLines = doc.splitTextToSize(section.text, pageWidth)

    for (const line of textLines) {
      if (y > 280) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += 5
    }

    y += 8 // Space between sections
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text(
      `GitLaw — github.com/mikelninh/gitlaw — Seite ${i}/${pageCount}`,
      margin,
      290
    )
    doc.text('Keine Gewähr für Richtigkeit. Dies ist keine Rechtsberatung.', margin, 294)
  }

  // Download
  const filename = lawName.replace(/[^a-zA-ZäöüÄÖÜß0-9]/g, '_').slice(0, 50)
  doc.save(`${filename}_GitLaw.pdf`)
}

/**
 * Export entire currently viewed law as PDF
 */
export function exportLawAsPDF(lawContent: string) {
  const lines = lawContent.split('\n')
  let lawName = ''
  const sections: { heading: string; text: string }[] = []
  let currentHeading = ''
  let currentText: string[] = []

  for (const line of lines) {
    if (line.startsWith('# ') && !lawName) {
      lawName = line.slice(2).trim()
    } else if (line.startsWith('### ')) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, text: currentText.join('\n').trim() })
      }
      currentHeading = line.slice(4).trim()
      currentText = []
    } else if (currentHeading) {
      currentText.push(line)
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, text: currentText.join('\n').trim() })
  }

  exportPDF(lawName || 'Gesetz', sections)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Generate share URL for a specific paragraph
 */
export function generateShareLink(lawId: string, section: string, note?: string): string {
  const params = new URLSearchParams({ law: lawId, s: section })
  if (note) params.set('note', note)
  return `${window.location.origin}${window.location.pathname}?share=${btoa(params.toString())}`
}
