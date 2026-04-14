/**
 * Branded PDF export for GitLaw Pro.
 *
 * Wraps jsPDF with Kanzlei branding (logo, name, address) so that
 * exported research/letters look professional on Anwält:innen-letterhead
 * rather than carrying the GitLaw footer.
 *
 * Three exports:
 *   - exportResearchPDF: AI Q&A with citations
 *   - exportLetterPDF: generated letter on letterhead
 *   - exportAuditPDF: case audit log (BHV-Versicherung evidence)
 */

import { jsPDF } from 'jspdf'
import type {
  AuditEntry,
  GeneratedLetter,
  KanzleiSettings,
  MandantCase,
  ResearchQuery,
} from './types'

const MARGIN = 20
const PAGE_WIDTH = 210
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const PAGE_HEIGHT = 297

const FONT_FAMILY = 'helvetica'

interface RenderCtx {
  doc: jsPDF
  y: number
  settings: KanzleiSettings
}

function newDoc(): jsPDF {
  return new jsPDF({ unit: 'mm', format: 'a4' })
}

/** Insert Kanzlei letterhead (logo + name + address). Mutates ctx.y. */
function drawLetterhead(ctx: RenderCtx): void {
  const { doc, settings } = ctx
  let y = MARGIN

  // Logo (right-aligned, max 30mm tall)
  if (settings.logoDataUrl) {
    try {
      const fmt = settings.logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG'
      // logo box: max 40mm wide, 25mm tall, anchored top-right
      doc.addImage(settings.logoDataUrl, fmt, PAGE_WIDTH - MARGIN - 40, y, 40, 25, undefined, 'FAST')
    } catch {
      // bad data URL — skip silently rather than failing the whole export
    }
  }

  doc.setFont(FONT_FAMILY, 'bold')
  doc.setFontSize(13)
  doc.text(settings.name || 'Kanzlei (nicht konfiguriert)', MARGIN, y + 5)

  doc.setFont(FONT_FAMILY, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80)
  const addrLines = (settings.address || '').split('\n').filter(Boolean)
  let lineY = y + 11
  for (const line of addrLines.slice(0, 4)) {
    doc.text(line, MARGIN, lineY)
    lineY += 4
  }
  if (settings.contact) {
    doc.text(settings.contact, MARGIN, lineY)
    lineY += 4
  }
  doc.setTextColor(0)

  // Horizontal divider
  const dividerY = Math.max(y + 30, lineY + 2)
  doc.setDrawColor(180)
  doc.line(MARGIN, dividerY, PAGE_WIDTH - MARGIN, dividerY)
  doc.setDrawColor(0)

  ctx.y = dividerY + 8
}

/** Footer with disclaimer + page number on every page. */
function drawFooters(doc: jsPDF, settings: KanzleiSettings): void {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(110)
    doc.text(
      'Hinweis: Diese Auswertung wurde KI-gestützt erstellt und ersetzt keine anwaltliche Prüfung. ' +
        'Inhalte sind ohne Gewähr. Bitte vor Verwendung gegenprüfen.',
      MARGIN,
      PAGE_HEIGHT - 12,
      { maxWidth: CONTENT_WIDTH },
    )
    doc.text(
      `${settings.name || 'GitLaw Pro'} · Seite ${i}/${total} · erstellt mit GitLaw Pro`,
      MARGIN,
      PAGE_HEIGHT - 6,
    )
    doc.setTextColor(0)
  }
}

function ensureRoom(ctx: RenderCtx, needed: number): void {
  if (ctx.y + needed > PAGE_HEIGHT - 25) {
    ctx.doc.addPage()
    ctx.y = MARGIN
  }
}

function paragraph(ctx: RenderCtx, text: string, opts?: { bold?: boolean; size?: number; color?: number }): void {
  const { doc } = ctx
  doc.setFont(FONT_FAMILY, opts?.bold ? 'bold' : 'normal')
  doc.setFontSize(opts?.size ?? 10.5)
  doc.setTextColor(opts?.color ?? 0)
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[]
  for (const line of lines) {
    ensureRoom(ctx, 6)
    doc.text(line, MARGIN, ctx.y)
    ctx.y += 5
  }
  doc.setTextColor(0)
}

// --- Research export ---

export function exportResearchPDF(args: {
  settings: KanzleiSettings
  research: ResearchQuery
  caseInfo?: MandantCase
}): void {
  const { settings, research, caseInfo } = args
  const doc = newDoc()
  const ctx: RenderCtx = { doc, y: MARGIN, settings }

  drawLetterhead(ctx)

  paragraph(ctx, 'Rechtliche Recherche-Notiz', { bold: true, size: 16 })
  ctx.y += 2
  paragraph(
    ctx,
    `Erstellt am ${new Date(research.createdAt).toLocaleString('de-DE')} durch ${
      settings.anwaltName || '—'
    }`,
    { color: 100, size: 9 },
  )
  ctx.y += 4

  if (caseInfo) {
    paragraph(ctx, `Aktenzeichen: ${caseInfo.aktenzeichen}`, { bold: true })
    paragraph(ctx, `Mandant:in: ${caseInfo.mandantName}`, { bold: true })
    ctx.y += 3
  }

  paragraph(ctx, 'Fragestellung', { bold: true, size: 12 })
  paragraph(ctx, research.question)
  ctx.y += 4

  paragraph(ctx, 'KI-gestützte Antwort', { bold: true, size: 12 })
  paragraph(ctx, research.answer)
  ctx.y += 4

  if (research.citations.length > 0) {
    paragraph(ctx, 'Zitierte Vorschriften', { bold: true, size: 12 })
    for (const c of research.citations) {
      const status = c.verified ? '✓ verifiziert' : '⚠ ungeprüft'
      paragraph(ctx, `${c.display}  (${status})`, { bold: true, size: 10 })
      if (c.excerpt) paragraph(ctx, c.excerpt, { color: 80, size: 9.5 })
      ctx.y += 1
    }
  }

  paragraph(ctx, '', { size: 8 })
  paragraph(
    ctx,
    research.reviewed
      ? `Status: anwaltlich geprüft am ${new Date(research.createdAt).toLocaleDateString('de-DE')}.`
      : 'Status: noch nicht anwaltlich geprüft. Bitte vor Verwendung gegenlesen.',
    { color: research.reviewed ? 0 : 150, size: 9.5 },
  )

  drawFooters(doc, settings)

  const filename = `Recherche_${caseInfo?.aktenzeichen?.replace(/[^\w-]/g, '_') || 'GitLawPro'}_${research.id}.pdf`
  doc.save(filename)
}

// --- Letter export ---

export function exportLetterPDF(args: {
  settings: KanzleiSettings
  letter: GeneratedLetter
  caseInfo?: MandantCase
}): void {
  const { settings, letter, caseInfo } = args
  const doc = newDoc()
  const ctx: RenderCtx = { doc, y: MARGIN, settings }

  drawLetterhead(ctx)

  paragraph(ctx, letter.templateTitle, { bold: true, size: 14 })
  if (caseInfo) {
    paragraph(ctx, `Aktenzeichen: ${caseInfo.aktenzeichen}`, { color: 100, size: 9 })
  }
  paragraph(ctx, `Datum: ${new Date(letter.createdAt).toLocaleDateString('de-DE')}`, {
    color: 100,
    size: 9,
  })
  ctx.y += 5

  paragraph(ctx, letter.body)

  ctx.y += 12
  paragraph(ctx, '_______________________________', { size: 10 })
  paragraph(ctx, `${settings.anwaltName || ''}${settings.kammerId ? ` (${settings.kammerId})` : ''}`, {
    size: 10,
  })

  drawFooters(doc, settings)

  const filename = `${letter.templateId}_${caseInfo?.aktenzeichen?.replace(/[^\w-]/g, '_') || 'GitLawPro'}.pdf`
  doc.save(filename)
}

// --- Audit log export (for BHV-Versicherung / Compliance) ---

export function exportAuditPDF(args: {
  settings: KanzleiSettings
  entries: AuditEntry[]
  caseInfo?: MandantCase
}): void {
  const { settings, entries, caseInfo } = args
  const doc = newDoc()
  const ctx: RenderCtx = { doc, y: MARGIN, settings }

  drawLetterhead(ctx)

  paragraph(ctx, 'Audit-Log', { bold: true, size: 14 })
  if (caseInfo) paragraph(ctx, `Akte: ${caseInfo.aktenzeichen} (${caseInfo.mandantName})`)
  paragraph(ctx, `Exportiert am ${new Date().toLocaleString('de-DE')} · ${entries.length} Einträge`, {
    color: 100,
    size: 9,
  })
  ctx.y += 5

  for (const e of entries) {
    ensureRoom(ctx, 14)
    paragraph(
      ctx,
      `${new Date(e.at).toLocaleString('de-DE')}  ·  ${e.action}  ·  ${e.actor}`,
      { bold: true, size: 9.5 },
    )
    paragraph(ctx, e.detail, { color: 70, size: 9 })
    ctx.y += 1
  }

  drawFooters(doc, settings)

  doc.save(
    `Auditlog_${caseInfo?.aktenzeichen?.replace(/[^\w-]/g, '_') || 'GitLawPro'}_${new Date().toISOString().slice(0, 10)}.pdf`,
  )
}
