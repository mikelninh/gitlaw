/**
 * Shared types for GitLaw Pro (Anwält:innen-Tier).
 *
 * Persistence is currently localStorage-only — server sync (Supabase / own
 * backend) follows once we have paying customers and a real Auftragsverarbeitungs-
 * vertrag with them.
 */

export interface KanzleiSettings {
  /** Display name shown on PDFs ("Kanzlei Müller & Partner mbB"). */
  name: string
  /** Multi-line address block. */
  address: string
  /** Optional contact line (phone, email, web). */
  contact: string
  /** Data-URL of the uploaded logo (PNG/JPG). */
  logoDataUrl?: string
  /** Anwält:in's name for the audit log + PDF signature line. */
  anwaltName: string
  /** Bar registration ID, optional but useful in headers. */
  kammerId?: string
}

export interface MandantCase {
  id: string
  /** Mandant:in display name (or pseudonym). */
  mandantName: string
  /** Internal Aktenzeichen ("23/0142"). */
  aktenzeichen: string
  /** Free-text matter description. */
  description: string
  createdAt: string  // ISO
  updatedAt: string  // ISO
  /** Linked research queries. */
  researchIds: string[]
  /** Linked generated letters. */
  letterIds: string[]
  status: 'aktiv' | 'archiviert'
  /** Optional deadline (Frist), ISO date. Drives dashboard warnings. */
  fristDatum?: string
  /** What the deadline is for — e.g. "Widerspruchsfrist SGB II". */
  fristBezeichnung?: string
  /** Optional Mandant:in email — used to prefill mailto: when sending letters. */
  mandantEmail?: string
}

export interface ResearchQuery {
  id: string
  caseId?: string
  question: string
  answer: string
  /** Cited paragraphs the AI claims to reference. */
  citations: Citation[]
  createdAt: string
  /** Was the answer marked as "geprüft" by the Anwält:in? */
  reviewed: boolean
}

export interface Citation {
  /** "§ 573 BGB" — display string. */
  display: string
  /** "bgb" — law file ID, used to deep-link. */
  lawId: string
  /** "573" — paragraph number for anchor. */
  section: string
  /** Whether we could verify the cited paragraph exists in our 5,936 laws. */
  verified: boolean
  /** Excerpt of the actual paragraph text (when verified). */
  excerpt?: string
}

export interface GeneratedLetter {
  id: string
  caseId?: string
  templateId: string
  templateTitle: string
  /** Filled-in field values keyed by field id. */
  fields: Record<string, string>
  /** Final rendered letter text. */
  body: string
  createdAt: string
}

export interface AuditEntry {
  id: string
  /** ISO timestamp. */
  at: string
  /** Anwält:in name (from settings). */
  actor: string
  /** Type of action. */
  action:
    | 'login'
    | 'case.create'
    | 'case.archive'
    | 'research.query'
    | 'letter.generate'
    | 'pdf.export'
    | 'settings.update'
  /** Free-form payload for the action. */
  detail: string
  /** Optional case context. */
  caseId?: string
}

/** Simple wrapper for paragraph lookup result. */
export interface ParagraphLookup {
  found: boolean
  lawId: string
  section: string
  text?: string
}
