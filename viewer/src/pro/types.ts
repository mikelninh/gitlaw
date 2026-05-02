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
  /** Lightweight collaboration tasks for the case team. */
  tasks?: CaseTask[]
  /** Local beta document records until server-side storage goes live. */
  documents?: CaseDocument[]
  /** Lightweight document-processing jobs (OCR/translation) attached to the case. */
  documentJobs?: DocumentJob[]
}

export interface CaseTask {
  id: string
  title: string
  done: boolean
  assignee?: string
  createdAt: string
  completedAt?: string
}

export interface CaseDocument {
  id: string
  originalName: string
  internalName: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy?: string
  category?: IntakeAttachmentMeta['category']
  languageHint?: IntakeAttachmentMeta['languageHint']
  dataUrl?: string
  storageMode?: 'local_inline' | 'server_vault'
  serverDocumentId?: string
  storageProvider?: string
  checksumSha256?: string
  textContent?: string
  ocrText?: string
  translatedTextDe?: string
  translationReviewed?: boolean
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
  /** Optional lawyer-corrected final version used for memory building. */
  approvedAnswer?: string
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
    | 'case.task.add'
    | 'case.task.done'
    | 'case.document.upload'
    | 'doc.ocr.queue'
    | 'doc.translate.queue'
    | 'doc.review.done'
    | 'research.query'
    | 'letter.generate'
    | 'pdf.export'
    | 'settings.update'
    | 'intake.received'
  /** Free-form payload for the action. */
  detail: string
  /** Optional case context. */
  caseId?: string
  /** Optional tenant context for future server-side audit correlation. */
  tenantId?: string
  /** Optional role context for least-privilege tracing. */
  actorRole?: 'owner' | 'anwalt' | 'assistenz' | 'read_only'
  /** Hash-chain reference for tamper-evident audit verification. */
  prevHash?: string
  hash?: string
}

/**
 * Custom-Musterbrief: eigene Vorlage der Anwält:in, mit {{platzhalter}}-Syntax.
 * Wird neben den eingebauten 5+ Lawyer-Templates angezeigt.
 */
export interface CustomTemplate {
  id: string
  title: string
  description?: string
  /** Template-Body mit {{key}}-Platzhaltern, die beim Rendern ersetzt werden. */
  body: string
  /** Abgeleitete Platzhalter aus body (z. B. ["mandant", "aktenzeichen"]). */
  placeholders: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Persönliche Notiz pro Paragraph — baut über Zeit die Wissensdatenbank
 * der Anwält:in auf (z. B. „§ 573 BGB: BGH vom 29.03.2017 beachten!").
 */
export interface ParagraphNote {
  /** Zusammengesetzt aus lawId + ':' + section, z. B. "bgb:573". */
  key: string
  lawId: string
  section: string
  body: string
  updatedAt: string
}

/**
 * Mandant:innen-Intake: eine vom Mandanten ausgefüllte Eingangsmeldung,
 * die die Anwält:in dann in eine Akte übernehmen kann.
 */
export interface IntakeEntry {
  id: string
  /** Welcher Akte zugeordnet (Kiosk-Modus) oder keine (Public-Modus). */
  caseId?: string
  /** Anwält:in, an die das Intake gerichtet ist (für Public-Links per Slug). */
  targetSlug?: string
  submittedAt: string
  /** Vom Mandant:in ausgefüllt. */
  name: string
  email?: string
  phone?: string
  anliegen: string
  /** Optional: konkrete Forderung / gewünschter Ausgang. */
  gewuenschterAusgang?: string
  /** Optional urgency provided by mandant for triage. */
  dringlichkeit?: 'niedrig' | 'mittel' | 'hoch' | 'akut'
  /** Optional if the mandant indicates a known legal/official deadline exists. */
  fristBekannt?: boolean
  /** Optional metadata for uploaded intake files/photos (no binary stored). */
  attachments?: IntakeAttachmentMeta[]
  /** True sobald Anwält:in es gelesen hat. */
  reviewed: boolean
}

export interface IntakeAttachmentMeta {
  originalName: string
  internalName: string
  mimeType: string
  sizeBytes: number
  /** Optional lightweight classification from mandant input. */
  category?: 'foto' | 'bescheid' | 'vertrag' | 'chat' | 'sonstiges'
  /** Optional language hint for OCR/translation pipeline planning. */
  languageHint?: 'de' | 'vi' | 'en' | 'tr' | 'ar' | 'other'
}

export interface DocumentJob {
  id: string
  documentId?: string
  attachmentInternalName: string
  type: 'ocr' | 'translate'
  status: 'queued' | 'processing' | 'done'
  requestedAt: string
  requestedBy?: string
  sourceLanguage?: IntakeAttachmentMeta['languageHint']
  targetLanguage?: 'de'
  note?: string
}

export interface ApprovedAnswerMemory {
  id: string
  tenantId?: string
  caseId?: string
  question: string
  approvedAnswer: string
  practiceHint?: string
  createdAt: string
  sourceResearchId?: string
}

/** Simple wrapper for paragraph lookup result. */
export interface ParagraphLookup {
  found: boolean
  lawId: string
  section: string
  text?: string
}
