import type { GeneratedLetter, MandantCase, ResearchQuery } from './types'
import { getChecklistById } from './mandatsart-checklists'

export interface WorkPacketEvent {
  at: string
  kind: 'status' | 'document' | 'research' | 'draft'
  label: string
}

export interface KanzleiWorkPacket {
  caseId: string
  caseLabel: string
  matterType: string
  currentStatus: string
  deadline?: {
    date: string
    label: string
    daysUntil: number | null
    lawyerReviewRequired: boolean
  }
  documents: {
    total: number
    pendingReview: number
    approved: number
    rejected: number
    missingRequired: Array<{ id: string; de: string; vi?: string; state: string }>
    withoutOcr: number
  }
  research: {
    total: number
    unreviewed: number
    verifiedCitations: number
    totalCitations: number
    openQuestions: string[]
  }
  drafts: {
    total: number
    recent: Array<{ id: string; title: string; createdAt: string }>
  }
  recentEvents: WorkPacketEvent[]
  routineMessages: {
    missingDocumentsDe?: string
    missingDocumentsVi?: string
  }
  next: {
    bao: string[]
    team: string[]
    automatic: string[]
  }
  caveat: string
}

function daysUntil(date: string, now: Date): number | null {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return Math.ceil((parsed.getTime() - now.getTime()) / 86_400_000)
}

function safeDate(input?: string): string {
  if (!input) return ''
  const t = Date.parse(input)
  return Number.isFinite(t) ? new Date(t).toISOString() : ''
}

function documentRequest(caseItem: MandantCase, missing: KanzleiWorkPacket['documents']['missingRequired'], lang: 'de' | 'vi'): string | undefined {
  if (!missing.length) return undefined
  const name = caseItem.mandantName || (lang === 'vi' ? 'Quý khách' : 'Mandant:in')
  const list = missing.map(item => `• ${lang === 'vi' ? (item.vi || item.de) : item.de}`).join('\n')
  if (lang === 'vi') {
    return `Kính gửi ${name},\n\nđể tiếp tục chuẩn bị hồ sơ, hiện chúng tôi còn thiếu các tài liệu sau:\n${list}\n\nVui lòng gửi các tài liệu còn thiếu qua kênh an toàn của hồ sơ. Nếu một tài liệu đã được gửi, bạn không cần gửi lại; văn phòng sẽ kiểm tra trạng thái.\n\nĐây là thông báo về tài liệu còn thiếu, không phải đánh giá pháp lý về hồ sơ.`
  }
  return `Guten Tag ${name},\n\nfür die weitere Vorbereitung Ihrer Akte fehlen uns aktuell noch folgende Unterlagen:\n${list}\n\nBitte reichen Sie die fehlenden Unterlagen über den sicheren Fall-Kanal ein. Falls Sie eine Unterlage bereits gesendet haben, müssen Sie sie nicht erneut schicken; die Kanzlei prüft den Status.\n\nDies ist nur eine sachliche Unterlagen-Nachforderung und keine rechtliche Bewertung Ihres Falls.`
}

export function buildKanzleiWorkPacket(
  caseItem: MandantCase,
  research: ResearchQuery[],
  letters: GeneratedLetter[],
  now = new Date(),
): KanzleiWorkPacket {
  const docs = (caseItem.documents || []).filter(d => !d.deletedAt)
  const checklist = caseItem.mandatsartId ? getChecklistById(caseItem.mandatsartId) : undefined
  const states = caseItem.checklistStates || {}
  const missingRequired = (checklist?.requiredDocuments || [])
    .filter(item => item.level === 'required' && states[item.id] !== 'received')
    .map(item => ({
      id: item.id,
      de: item.label,
      vi: item.labelVi,
      state: states[item.id] || 'pending',
    }))

  const caseResearch = research.filter(r => r.caseId === caseItem.id)
  const caseLetters = letters.filter(l => l.caseId === caseItem.id)
  const allCitations = caseResearch.flatMap(r => r.citations || [])

  const recentEvents: WorkPacketEvent[] = [
    ...(caseItem.statusHistory || []).map(s => ({
      at: safeDate(s.changedAt),
      kind: 'status' as const,
      label: `Status: ${s.status}`,
    })),
    ...docs.map(d => ({
      at: safeDate(d.uploadedAt),
      kind: 'document' as const,
      label: `Dokument: ${d.internalName || d.originalName}`,
    })),
    ...caseResearch.map(r => ({
      at: safeDate(r.createdAt),
      kind: 'research' as const,
      label: `Recherche: ${r.question}`,
    })),
    ...caseLetters.map(l => ({
      at: safeDate(l.createdAt),
      kind: 'draft' as const,
      label: `Entwurf: ${l.templateTitle}`,
    })),
  ]
    .filter(e => e.at)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12)

  const bao: string[] = []
  const team: string[] = []
  const automatic: string[] = []

  const deadlineDays = caseItem.fristDatum ? daysUntil(caseItem.fristDatum, now) : null
  if (caseItem.fristDatum && deadlineDays !== null && deadlineDays <= 14) {
    bao.push(`Frist/Wiedervorlage prüfen: ${caseItem.fristBezeichnung || caseItem.fristDatum}`)
  }
  if (caseResearch.some(r => !r.reviewed)) bao.push(`${caseResearch.filter(r => !r.reviewed).length} Recherchepaket(e) fachlich prüfen`)

  const pendingDocs = docs.filter(d => d.uploadedBy === 'mandant' && (d.reviewStatus || 'pending') === 'pending')
  if (pendingDocs.length) team.push(`${pendingDocs.length} Mandanten-Dokument(e) auf Verwendbarkeit prüfen`)
  for (const task of (caseItem.tasks || []).filter(t => !t.done)) team.push(task.title)

  if (missingRequired.length) automatic.push(`Sachliche Nachforderung für ${missingRequired.length} fehlende Pflichtunterlage(n) vorbereiten`)
  if (docs.some(d => !d.ocrText)) automatic.push(`${docs.filter(d => !d.ocrText).length} Dokument(e) für OCR vorbereiten`)
  if (caseItem.statusHistory?.length) automatic.push('Änderungen seit letzter Prüfung als Chronologie zusammenstellen')
  if (caseResearch.length) automatic.push('Recherche + verifizierte Fundstellen in Draft-Briefing bündeln')
  if (caseLetters.length) automatic.push('Vorhandene Entwürfe und offenen Review-Status bündeln')

  return {
    caseId: caseItem.id,
    caseLabel: `${caseItem.aktenzeichen || 'ohne AZ'} · ${caseItem.mandantName || 'Mandant:in'}`,
    matterType: checklist?.title || caseItem.mandatsartId || caseItem.description || 'Nicht klassifiziert',
    currentStatus: caseItem.caseStatus || caseItem.status,
    deadline: caseItem.fristDatum ? {
      date: caseItem.fristDatum,
      label: caseItem.fristBezeichnung || 'Frist/Wiedervorlage',
      daysUntil: deadlineDays,
      lawyerReviewRequired: deadlineDays !== null && deadlineDays <= 14,
    } : undefined,
    documents: {
      total: docs.length,
      pendingReview: pendingDocs.length,
      approved: docs.filter(d => d.reviewStatus === 'approved').length,
      rejected: docs.filter(d => d.reviewStatus === 'rejected').length,
      missingRequired,
      withoutOcr: docs.filter(d => !d.ocrText).length,
    },
    research: {
      total: caseResearch.length,
      unreviewed: caseResearch.filter(r => !r.reviewed).length,
      verifiedCitations: allCitations.filter(c => c.verified).length,
      totalCitations: allCitations.length,
      openQuestions: caseResearch.filter(r => !r.reviewed).map(r => r.question).slice(0, 8),
    },
    drafts: {
      total: caseLetters.length,
      recent: [...caseLetters]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map(l => ({ id: l.id, title: l.templateTitle, createdAt: l.createdAt })),
    },
    recentEvents,
    routineMessages: {
      missingDocumentsDe: documentRequest(caseItem, missingRequired, 'de'),
      missingDocumentsVi: documentRequest(caseItem, missingRequired, 'vi'),
    },
    next: { bao, team: [...new Set(team)], automatic: [...new Set(automatic)] },
    caveat: 'Arbeitsunterlage: Fakten, Dokumentstatus, Quellen und Entwürfe bleiben reviewpflichtig. Dieses Paket bestätigt keine Frist, keine rechtliche Vollständigkeit und keine finale Rechtsposition.',
  }
}
