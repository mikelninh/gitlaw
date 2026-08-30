import { DECISIONS, digest } from './core.mjs'

function value(obj, keys) {
  for (const key of keys) {
    const v = obj?.[key]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}

function text(v) {
  return v === null || v === undefined ? '' : String(v).trim()
}

function timestamp(v) {
  if (!v) return null
  const parsed = Date.parse(String(v))
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

export function normalizeAdvowareMatter(raw = {}) {
  return {
    advoware_id: text(value(raw, ['Id', 'ID', 'id', 'AktenId', 'aktenId'])) || null,
    file_number: text(value(raw, ['Aktenzeichen', 'aktenzeichen', 'FileNumber', 'fileNumber'])) || null,
    client_name: text(value(raw, ['Mandant', 'MandantName', 'mandantName', 'ClientName', 'clientName', 'Rubrum', 'KurzRubrum'])) || null,
    subject: text(value(raw, ['Betreff', 'betreff', 'Bezeichnung', 'Beschreibung', 'description', 'Subject'])) || null,
    responsible: text(value(raw, ['Sachbearbeiter', 'Anwalt', 'Bearbeiter', 'ResponsibleUser', 'responsible'])) || null,
    changed_at: timestamp(value(raw, ['GeaendertAm', 'GeändertAm', 'ModifiedAt', 'modifiedAt', 'UpdatedAt', 'updatedAt', 'Datum'])) || null,
    raw_digest: digest(JSON.stringify(raw)),
  }
}

export function normalizeAdvowareActivity(raw = {}) {
  return {
    advoware_activity_id: text(value(raw, ['Id', 'ID', 'id', 'ActivityId', 'activityId'])) || digest(JSON.stringify(raw)).slice(0, 20),
    advoware_matter_id: text(value(raw, ['AktenId', 'AkteId', 'aktenId', 'akteId', 'MatterId', 'matterId'])) || null,
    file_number: text(value(raw, ['Aktenzeichen', 'aktenzeichen', 'FileNumber', 'fileNumber'])) || null,
    occurred_at: timestamp(value(raw, ['Datum', 'CreatedAt', 'createdAt', 'Zeitpunkt', 'Timestamp', 'timestamp'])) || null,
    type: text(value(raw, ['Typ', 'Type', 'type', 'Art', 'ActivityType'])) || 'unknown',
    title: text(value(raw, ['Betreff', 'Titel', 'Title', 'title', 'Beschreibung', 'Text'])) || 'Neue Aktivität',
    raw_digest: digest(JSON.stringify(raw)),
  }
}

function localIdentifiers(localCase = {}) {
  return {
    case_id: text(value(localCase, ['id', 'case_id'])) || null,
    advoware_id: text(value(localCase, ['advowareId', 'advoware_id', 'externalAdvowareId'])) || null,
    file_number: text(value(localCase, ['aktenzeichen', 'file_number', 'fileNumber'])) || null,
  }
}

export function matchAdvowareMatter(matter, localCases = []) {
  const normalized = matter?.raw_digest ? matter : normalizeAdvowareMatter(matter)
  const locals = localCases.map(c => ({ raw: c, ...localIdentifiers(c) }))

  if (normalized.advoware_id) {
    const exactId = locals.filter(c => c.advoware_id && c.advoware_id === normalized.advoware_id)
    if (exactId.length === 1) return { status: 'matched', method: 'advoware_id', case: exactId[0].raw }
    if (exactId.length > 1) return { status: 'ambiguous', method: 'advoware_id', candidates: exactId.map(x => x.case_id) }
  }

  if (normalized.file_number) {
    const exactFile = locals.filter(c => c.file_number && c.file_number === normalized.file_number)
    if (exactFile.length === 1) return { status: 'matched', method: 'file_number', case: exactFile[0].raw }
    if (exactFile.length > 1) return { status: 'ambiguous', method: 'file_number', candidates: exactFile.map(x => x.case_id) }
  }

  return { status: 'unmatched', method: null, candidates: [] }
}

export function planAdvowareDelta({ matters = [], activities = [], localCases = [], lastSeenAt = null } = {}) {
  const normalizedMatters = matters.map(normalizeAdvowareMatter)
  const normalizedActivities = activities.map(normalizeAdvowareActivity)
  const cursor = lastSeenAt ? Date.parse(lastSeenAt) : null
  if (lastSeenAt && !Number.isFinite(cursor)) throw new Error('lastSeenAt muss ein gültiger Zeitstempel sein')

  const result = {
    schema: 'kanzlei-autopilot/advoware-delta/0.1',
    generated_at: new Date().toISOString(),
    matched: [],
    ambiguous: [],
    new_matter_candidates: [],
    ignored_before_cursor: 0,
    newest_activity_at: lastSeenAt || null,
  }

  const matterById = new Map(normalizedMatters.filter(m => m.advoware_id).map(m => [m.advoware_id, m]))
  const matterByFile = new Map(normalizedMatters.filter(m => m.file_number).map(m => [m.file_number, m]))

  for (const activity of normalizedActivities) {
    const eventTime = activity.occurred_at ? Date.parse(activity.occurred_at) : null
    if (cursor !== null && eventTime !== null && eventTime <= cursor) {
      result.ignored_before_cursor++
      continue
    }
    if (activity.occurred_at && (!result.newest_activity_at || activity.occurred_at > result.newest_activity_at)) {
      result.newest_activity_at = activity.occurred_at
    }

    const matter = (activity.advoware_matter_id && matterById.get(activity.advoware_matter_id)) ||
      (activity.file_number && matterByFile.get(activity.file_number)) ||
      normalizeAdvowareMatter({ Id: activity.advoware_matter_id, Aktenzeichen: activity.file_number })
    const match = matchAdvowareMatter(matter, localCases)
    const item = {
      activity,
      matter,
      match_method: match.method,
      context_digest: digest(JSON.stringify({
        activity: activity.raw_digest,
        matter: matter.raw_digest,
        match: match.status,
        local_case_id: match.case?.id || null,
      })),
    }

    if (match.status === 'matched') {
      result.matched.push({
        ...item,
        local_case_id: match.case.id,
        decision: DECISIONS.ALLOW,
        next: 'prepare_internal_case_delta',
      })
    } else if (match.status === 'ambiguous') {
      result.ambiguous.push({
        ...item,
        candidates: match.candidates,
        decision: DECISIONS.APPROVAL,
        next: 'human_resolve_matter_match',
      })
    } else {
      result.new_matter_candidates.push({
        ...item,
        decision: DECISIONS.APPROVAL,
        next: 'human_confirm_new_local_matter',
      })
    }
  }

  return result
}

export function compileMorningChangeBrief(delta) {
  const byCase = new Map()
  for (const item of delta.matched || []) {
    const bucket = byCase.get(item.local_case_id) || {
      local_case_id: item.local_case_id,
      file_number: item.matter.file_number,
      client_name: item.matter.client_name,
      changes: [],
    }
    bucket.changes.push({
      at: item.activity.occurred_at,
      type: item.activity.type,
      title: item.activity.title,
      activity_id: item.activity.advoware_activity_id,
      context_digest: item.context_digest,
    })
    byCase.set(item.local_case_id, bucket)
  }

  const cases = [...byCase.values()]
    .map(c => ({ ...c, changes: c.changes.sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))) }))
    .sort((a, b) => b.changes.length - a.changes.length || String(a.file_number || '').localeCompare(String(b.file_number || ''), 'de'))

  return {
    schema: 'kanzlei-autopilot/morning-brief/0.1',
    changed_cases: cases.length,
    changes: cases.reduce((n, c) => n + c.changes.length, 0),
    ambiguous_matches: (delta.ambiguous || []).length,
    new_matter_candidates: (delta.new_matter_candidates || []).length,
    needs_human_matching: (delta.ambiguous || []).length + (delta.new_matter_candidates || []).length,
    newest_activity_at: delta.newest_activity_at,
    cases,
  }
}
