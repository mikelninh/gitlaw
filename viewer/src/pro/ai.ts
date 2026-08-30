/**
 * Lawyer-safe Pro research client.
 *
 * There is deliberately NO direct browser LLM fallback and no VITE AI key.
 * Every call goes through the authenticated GitLaw server privacy gateway.
 */
import type { ApprovedAnswerMemory } from './types'
import { fetchWithProSession } from './pro-api'

export interface ProCitation {
  paragraph: string
  gesetz: string
  bedeutung: string
}

export interface PrivacyReceiptSummary {
  schema: string
  policyVersion: string
  decision: 'ALLOW' | 'BLOCK'
  receiptDigest: string
  signature?: string
  signatureAlgorithm?: string
  reasons?: string[]
}

export interface ProAnswer {
  antwort: string
  zitate: ProCitation[]
  privacyReceipt?: PrivacyReceiptSummary
}

export interface ProPrivacyEnvelope {
  dataMode: 'synthetic' | 'redacted' | 'real_mandate'
  purpose?: string
  caseRef?: string
  clientConsent?: boolean
  externalServiceNecessary?: boolean
  redactionApplied?: boolean
  memoryScope?: 'none' | 'same_case'
}

export interface ProAskOptions {
  approvedMemory?: ApprovedAnswerMemory[]
  privacy?: ProPrivacyEnvelope
}

export async function proAsk(question: string, options?: ProAskOptions): Promise<ProAnswer> {
  const resp = await fetchWithProSession('/api/ask-pro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      approvedMemory: options?.approvedMemory || [],
      privacy: options?.privacy || { dataMode: 'synthetic', memoryScope: 'none' },
    }),
  })

  if (!resp.ok) {
    let detail = ''
    try {
      const body = await resp.json() as { error?: string; reasons?: string[]; detectedClasses?: string[] }
      const reasons = Array.isArray(body.reasons) ? body.reasons.join(', ') : ''
      const detected = Array.isArray(body.detectedClasses) && body.detectedClasses.length
        ? ` · erkannt: ${body.detectedClasses.join(', ')}`
        : ''
      detail = reasons ? `${body.error || 'Privacy gate'}: ${reasons}${detected}` : (body.error || '')
    } catch {
      // Do not echo response bodies that were not valid JSON.
    }
    if (resp.status === 423) {
      throw new Error(detail || 'Mandatsgeheimnis-Schutz hat den externen KI-Aufruf blockiert.')
    }
    throw new Error(detail || `KI-Service nicht erreichbar (HTTP ${resp.status}).`)
  }
  return (await resp.json()) as ProAnswer
}

const EXAMPLE_QUESTIONS_DEFAULT = [
  'Welche Tatbestände kommen bei wiederholten Drohnachrichten via Instagram-DM in Betracht?',
  'Wann ist eine fristlose Kündigung des Mietverhältnisses wegen Zahlungsverzugs zulässig?',
  'Welche Verjährungsfristen gelten für Schadensersatzansprüche aus § 823 BGB?',
  'Frist für Widerspruch gegen einen ALG-II-Bescheid und Form?',
  'Welche §§ StGB greifen bei Deepfake-Pornografie ohne Einwilligung?',
  'Pflichten der Arbeitgeberin bei Kündigung während der Schwangerschaft?',
]

const EXAMPLE_QUESTIONS_MIGRATION = [
  'Voraussetzungen für Verlängerung der Aufenthaltserlaubnis nach § 8 AufenthG bei Beschäftigungswechsel?',
  'Wann ist eine Fiktionsbescheinigung nach § 81 Abs. 4 AufenthG zu erteilen und wie lange gilt sie?',
  'Voraussetzungen für Familiennachzug zum Ehegatten mit Niederlassungserlaubnis (§§ 27, 30 AufenthG)?',
  'Welcher Sprachnachweis (A1 vs. B1) ist beim Visumverfahren in Hanoi tatsächlich gefordert?',
  'Frist und Voraussetzungen für Eilantrag nach § 80 Abs. 5 VwGO gegen Abschiebung?',
  'Voraussetzungen Einbürgerung nach 6 Jahren mit § 10 StAG — welche Unterlagen fordert die Berliner LEA?',
  'Wann liegt eine Härtefallentscheidung nach § 23a AufenthG vor und wer entscheidet?',
  'Untätigkeitsklage nach § 75 VwGO bei Aufenthaltstitel — frühestens wann zulässig?',
  'Pflichten zur Vorlage des Reisepasses bei der ABH — was bei Verlust oder Diebstahl?',
  'Voraussetzungen Niederlassungserlaubnis nach § 9 AufenthG bei selbstständiger Tätigkeit?',
]

export function getExampleQuestions(tenantId?: string | null): string[] {
  if (tenantId === 'kanzlei-nguyen') return EXAMPLE_QUESTIONS_MIGRATION
  return EXAMPLE_QUESTIONS_DEFAULT
}

export const EXAMPLE_QUESTIONS = EXAMPLE_QUESTIONS_DEFAULT
