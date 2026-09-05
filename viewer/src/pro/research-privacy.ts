import type { ApprovedAnswerMemory, MandantCase } from './types'
import { anonymize, hasPII } from './anonymize'
import type { ProPrivacyEnvelope } from './ai'

export interface PreparedResearchEgress {
  questionForAi: string
  approvedMemoryForAi: ApprovedAnswerMemory[]
  privacy: ProPrivacyEnvelope
  replacementCount: number
  dataMode: ProPrivacyEnvelope['dataMode']
  warning?: string
}

/**
 * Unknown linked matters fail to REAL MANDATE. Only an explicit synthetic
 * classification may use the synthetic lane.
 */
export function matterDataMode(caseItem?: MandantCase): 'synthetic' | 'real_mandate' {
  if (!caseItem) return 'real_mandate'
  return caseItem.privacy?.dataMode === 'synthetic' ? 'synthetic' : 'real_mandate'
}

export function prepareResearchEgress(input: {
  question: string
  caseItem?: MandantCase
  approvedMemory?: ApprovedAnswerMemory[]
  forceRedaction?: boolean
}): PreparedResearchEgress {
  const caseItem = input.caseItem
  const sourceHadPii = hasPII(input.question)
  const shouldRedact = Boolean(caseItem) || input.forceRedaction === true || sourceHadPii
  const redacted = shouldRedact ? anonymize(input.question) : { anonymized: input.question, replacements: [] }
  const questionForAi = redacted.anonymized

  if (!caseItem) {
    const dataMode: ProPrivacyEnvelope['dataMode'] = shouldRedact ? 'redacted' : 'synthetic'
    // General research can use only non-matter memory. Case-specific memory is
    // never exported merely because no matter is selected in the UI.
    const safeMemory = dataMode === 'synthetic'
      ? (input.approvedMemory || []).filter(m => !m.caseId)
      : []
    return {
      questionForAi,
      approvedMemoryForAi: safeMemory,
      replacementCount: redacted.replacements.length,
      dataMode,
      privacy: {
        dataMode,
        purpose: dataMode === 'synthetic' ? 'general legal research' : 'de-identified general legal research',
        redactionApplied: shouldRedact,
        memoryScope: 'none',
      },
    }
  }

  const mode = matterDataMode(caseItem)
  if (mode === 'synthetic') {
    const sameMatterMemory = (input.approvedMemory || []).filter(m => !m.caseId || m.caseId === caseItem.id)
    return {
      questionForAi,
      approvedMemoryForAi: sameMatterMemory,
      replacementCount: redacted.replacements.length,
      dataMode: 'synthetic',
      privacy: {
        dataMode: 'synthetic',
        purpose: caseItem.privacy?.externalAiPurpose || 'synthetic matter legal research',
        caseRef: caseItem.privacy?.pseudonymousCaseRef || 'synthetic-matter',
        redactionApplied: true,
        memoryScope: 'same_case',
      },
    }
  }

  const p = caseItem.privacy
  return {
    questionForAi,
    approvedMemoryForAi: [],
    replacementCount: redacted.replacements.length,
    dataMode: 'real_mandate',
    privacy: {
      dataMode: 'real_mandate',
      purpose: p?.externalAiPurpose,
      caseRef: p?.pseudonymousCaseRef,
      clientConsent: p?.externalAiConsentOnFile === true,
      externalServiceNecessary: p?.externalServiceNecessaryAttested === true,
      redactionApplied: true,
      memoryScope: 'none',
    },
    warning: 'Real mandate mode: external AI remains fail-closed until all Kanzlei/provider/consent gates are evidenced.',
  }
}

/**
 * History sent back to the model must use the already-sanitised question and
 * re-sanitise answers before reuse. Local display may keep the original text.
 */
export function safeHistoryContext(turns: Array<{ aiQuestion: string; answer: string }>): string {
  return turns.slice(-2).map((t, i) => {
    const safeAnswer = anonymize(t.answer).anonymized
    return `Vorfrage ${i + 1}: ${t.aiQuestion}\nVorantwort ${i + 1}: ${safeAnswer}`
  }).join('\n\n')
}
