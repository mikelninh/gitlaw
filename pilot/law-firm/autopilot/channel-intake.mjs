import { DECISIONS, digest } from './core.mjs'

const SUPPORTED_CHANNELS = new Set(['email', 'whatsapp', 'scan', 'portal', 'office_upload'])

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max)
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function normalizeChannelItem(input = {}) {
  const channel = clean(input.channel, 40).toLowerCase()
  const attachments = Array.isArray(input.attachments) ? input.attachments.map((a, index) => ({
    id: clean(a.id || `attachment-${index + 1}`, 120),
    name: clean(a.name || a.filename || `attachment-${index + 1}`, 240),
    mime: clean(a.mime || a.content_type || '', 100),
    size: Number.isFinite(Number(a.size)) ? Number(a.size) : null,
    sha256: clean(a.sha256 || a.hash || '', 128) || null,
  })) : []

  const normalized = {
    channel,
    external_id: clean(input.external_id || input.message_id || input.id, 200) || null,
    tenant_id: clean(input.tenant_id, 120) || null,
    explicit_case_id: clean(input.explicit_case_id || input.case_id, 120) || null,
    file_number: clean(input.file_number || input.aktenzeichen, 120) || null,
    sender: clean(input.sender || input.from, 240) || null,
    subject: clean(input.subject, 500) || null,
    text: String(input.text || input.body || '').trim(),
    received_at: input.received_at ? new Date(input.received_at).toISOString() : null,
    attachments,
    data_mode: clean(input.data_mode || 'synthetic', 40),
  }
  normalized.content_digest = digest(canonical({
    channel: normalized.channel,
    external_id: normalized.external_id,
    tenant_id: normalized.tenant_id,
    explicit_case_id: normalized.explicit_case_id,
    file_number: normalized.file_number,
    sender: normalized.sender,
    subject: normalized.subject,
    text: normalized.text,
    attachments: normalized.attachments,
  }))
  return normalized
}

function localId(c = {}) {
  return clean(c.id || c.case_id, 120) || null
}

function localTenant(c = {}) {
  return clean(c.tenant_id || c.tenantId || 'default', 120)
}

function localFile(c = {}) {
  return clean(c.aktenzeichen || c.file_number || c.fileNumber, 120) || null
}

export function matchChannelItem(item, localCases = []) {
  const n = item?.content_digest ? item : normalizeChannelItem(item)
  const sameTenant = localCases.filter(c => localTenant(c) === (n.tenant_id || 'default'))

  if (n.explicit_case_id) {
    const exact = sameTenant.filter(c => localId(c) === n.explicit_case_id)
    if (exact.length === 1) return { status: 'matched', method: 'explicit_case_id', case: exact[0] }
    if (exact.length > 1) return { status: 'ambiguous', method: 'explicit_case_id', candidates: exact.map(localId) }
  }

  if (n.file_number) {
    const exact = sameTenant.filter(c => localFile(c) === n.file_number)
    if (exact.length === 1) return { status: 'matched', method: 'file_number', case: exact[0] }
    if (exact.length > 1) return { status: 'ambiguous', method: 'file_number', candidates: exact.map(localId) }
  }

  // Sender/name similarity is intentionally not sufficient for automatic legal filing.
  return { status: 'unmatched', method: null, candidates: [] }
}

export function extractDateCandidates(text = '') {
  const source = String(text)
  const matches = []
  const seen = new Set()
  const patterns = [
    /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g,
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(source))) {
      let iso
      if (match[0].includes('.')) {
        const [, d, m, y] = match
        iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      } else {
        iso = match[0]
      }
      const parsed = Date.parse(`${iso}T12:00:00Z`)
      if (!Number.isFinite(parsed) || seen.has(iso)) continue
      seen.add(iso)
      const before = source.slice(Math.max(0, match.index - 70), match.index)
      const after = source.slice(match.index + match[0].length, match.index + match[0].length + 70)
      const context = `${before}${match[0]}${after}`.trim()
      const deadlineCue = /frist|bis\s+(?:spätestens\s+)?zum|innerhalb|wiedervorlage|termin/i.test(context)
      matches.push({
        date: iso,
        source_text: context.slice(0, 180),
        deadline_cue: deadlineCue,
        status: 'candidate_only',
        lawyer_confirmation_required: true,
      })
    }
  }
  return matches
}

export function planChannelIntake({ item, localCases = [], seenFingerprints = [], productionDataAuthorized = false } = {}) {
  const n = normalizeChannelItem(item)
  if (!SUPPORTED_CHANNELS.has(n.channel)) {
    return { status: 'blocked', decision: DECISIONS.BLOCK, reason: 'unsupported_channel', providerCalls: 0, item_digest: n.content_digest }
  }
  if (!n.tenant_id) {
    return { status: 'blocked', decision: DECISIONS.BLOCK, reason: 'tenant_required', providerCalls: 0, item_digest: n.content_digest }
  }
  if (n.data_mode === 'real_mandate' && productionDataAuthorized !== true) {
    return { status: 'blocked', decision: DECISIONS.BLOCK, reason: 'real_mandate_data_gate_incomplete', providerCalls: 0, item_digest: n.content_digest }
  }
  if (new Set(seenFingerprints).has(n.content_digest)) {
    return { status: 'duplicate_suppressed', decision: DECISIONS.BLOCK, reason: 'duplicate_inbound_item', providerCalls: 0, item_digest: n.content_digest }
  }

  const match = matchChannelItem(n, localCases)
  if (match.status === 'ambiguous') {
    return {
      status: 'approval_required',
      decision: DECISIONS.APPROVAL,
      reason: 'ambiguous_case_match',
      candidates: match.candidates,
      item_digest: n.content_digest,
      providerCalls: 0,
    }
  }
  if (match.status === 'unmatched') {
    return {
      status: 'approval_required',
      decision: DECISIONS.APPROVAL,
      reason: 'case_match_required',
      item_digest: n.content_digest,
      providerCalls: 0,
    }
  }

  const dateCandidates = extractDateCandidates(`${n.subject || ''}\n${n.text || ''}`)
  return {
    status: 'prepared',
    decision: DECISIONS.ALLOW,
    item_digest: n.content_digest,
    local_case_id: localId(match.case),
    match_method: match.method,
    audit_summary: {
      channel: n.channel,
      external_id_digest: n.external_id ? digest(n.external_id) : null,
      sender_digest: n.sender ? digest(n.sender.toLowerCase()) : null,
      subject_present: Boolean(n.subject),
      text_chars: n.text.length,
      attachment_count: n.attachments.length,
      attachment_hashes: n.attachments.map(a => a.sha256).filter(Boolean),
      data_mode: n.data_mode,
    },
    work: {
      attachments: n.attachments.map(a => ({
        id: a.id,
        name: a.name,
        mime: a.mime,
        sha256: a.sha256,
        next: ['dedupe_check', 'ocr_prepare', 'classification_proposal', 'human_document_review'],
      })),
      text: n.text || n.subject ? ['timeline_proposal', 'fact_extraction_proposal', 'case_change_summary'] : [],
      date_candidates: dateCandidates,
    },
    constraints: {
      legal_usability_confirmed: false,
      deadline_confirmed: false,
      external_message_sent: false,
      case_mutation_executed: false,
    },
    providerCalls: 0,
  }
}
