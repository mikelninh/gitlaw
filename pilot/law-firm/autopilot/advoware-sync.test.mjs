import test from 'node:test'
import assert from 'node:assert/strict'
import {
  compileMorningChangeBrief,
  matchAdvowareMatter,
  normalizeAdvowareActivity,
  normalizeAdvowareMatter,
  planAdvowareDelta,
} from './advoware-sync.mjs'
import { DECISIONS } from './core.mjs'

test('normalizes common Advoware matter and activity field variants without inventing values', () => {
  const m = normalizeAdvowareMatter({ Id: 42, Aktenzeichen: '123/26', MandantName: 'Nguyen', Betreff: 'Aufenthalt', UpdatedAt: '2026-08-30T08:00:00Z' })
  assert.equal(m.advoware_id, '42')
  assert.equal(m.file_number, '123/26')
  assert.equal(m.client_name, 'Nguyen')
  assert.equal(m.subject, 'Aufenthalt')
  assert.equal(m.changed_at, '2026-08-30T08:00:00.000Z')
  assert.equal(m.raw_digest.length, 64)

  const a = normalizeAdvowareActivity({ Id: 9, AktenId: 42, Aktenzeichen: '123/26', Datum: '2026-08-30T09:00:00Z', Art: 'Posteingang', Betreff: 'Schreiben LEA' })
  assert.equal(a.advoware_matter_id, '42')
  assert.equal(a.file_number, '123/26')
  assert.equal(a.type, 'Posteingang')
  assert.equal(a.title, 'Schreiben LEA')
})

test('matches by stable Advoware id first, then exact file number', () => {
  const locals = [
    { id: 'g1', advowareId: '42', aktenzeichen: 'OLD/26' },
    { id: 'g2', advowareId: '99', aktenzeichen: '123/26' },
  ]
  const byId = matchAdvowareMatter({ Id: 42, Aktenzeichen: '123/26' }, locals)
  assert.equal(byId.status, 'matched')
  assert.equal(byId.method, 'advoware_id')
  assert.equal(byId.case.id, 'g1')

  const byFile = matchAdvowareMatter({ Id: 77, Aktenzeichen: '123/26' }, locals)
  assert.equal(byFile.status, 'matched')
  assert.equal(byFile.method, 'file_number')
  assert.equal(byFile.case.id, 'g2')
})

test('ambiguous case number never silently files an activity', () => {
  const localCases = [
    { id: 'g1', aktenzeichen: '123/26' },
    { id: 'g2', aktenzeichen: '123/26' },
  ]
  const delta = planAdvowareDelta({
    matters: [{ Id: 42, Aktenzeichen: '123/26' }],
    activities: [{ Id: 9, AktenId: 42, Datum: '2026-08-30T09:00:00Z', Betreff: 'Neue Post' }],
    localCases,
  })
  assert.equal(delta.matched.length, 0)
  assert.equal(delta.ambiguous.length, 1)
  assert.equal(delta.ambiguous[0].decision, DECISIONS.APPROVAL)
  assert.equal(delta.ambiguous[0].next, 'human_resolve_matter_match')
})

test('unmatched activity becomes new-matter candidate requiring human confirmation', () => {
  const delta = planAdvowareDelta({
    matters: [{ Id: 42, Aktenzeichen: 'NEW/26', MandantName: 'New Client' }],
    activities: [{ Id: 9, AktenId: 42, Datum: '2026-08-30T09:00:00Z', Betreff: 'Neue Akte' }],
    localCases: [],
  })
  assert.equal(delta.new_matter_candidates.length, 1)
  assert.equal(delta.new_matter_candidates[0].decision, DECISIONS.APPROVAL)
  assert.equal(delta.new_matter_candidates[0].next, 'human_confirm_new_local_matter')
})

test('cursor suppresses old activities and keeps only new deltas', () => {
  const localCases = [{ id: 'g1', advowareId: '42', aktenzeichen: '123/26' }]
  const delta = planAdvowareDelta({
    matters: [{ Id: 42, Aktenzeichen: '123/26', MandantName: 'Nguyen' }],
    activities: [
      { Id: 1, AktenId: 42, Datum: '2026-08-29T08:00:00Z', Betreff: 'Alt' },
      { Id: 2, AktenId: 42, Datum: '2026-08-30T09:00:00Z', Betreff: 'Neu' },
      { Id: 3, AktenId: 42, Datum: '2026-08-30T10:00:00Z', Betreff: 'Noch neuer' },
    ],
    localCases,
    lastSeenAt: '2026-08-30T08:30:00Z',
  })
  assert.equal(delta.ignored_before_cursor, 1)
  assert.equal(delta.matched.length, 2)
  assert.equal(delta.newest_activity_at, '2026-08-30T10:00:00.000Z')
})

test('morning brief compresses matched activities into changed cases and isolates matching exceptions', () => {
  const localCases = [
    { id: 'g1', advowareId: '42', aktenzeichen: '123/26' },
    { id: 'g2', advowareId: '77', aktenzeichen: '777/26' },
  ]
  const delta = planAdvowareDelta({
    matters: [
      { Id: 42, Aktenzeichen: '123/26', MandantName: 'Nguyen' },
      { Id: 77, Aktenzeichen: '777/26', MandantName: 'Pham' },
      { Id: 88, Aktenzeichen: 'NEW/26', MandantName: 'Tran' },
    ],
    activities: [
      { Id: 1, AktenId: 42, Datum: '2026-08-30T09:00:00Z', Art: 'Post', Betreff: 'LEA Schreiben' },
      { Id: 2, AktenId: 42, Datum: '2026-08-30T10:00:00Z', Art: 'Dokument', Betreff: 'Gehaltsnachweis' },
      { Id: 3, AktenId: 77, Datum: '2026-08-30T11:00:00Z', Art: 'Notiz', Betreff: 'Telefonat' },
      { Id: 4, AktenId: 88, Datum: '2026-08-30T12:00:00Z', Art: 'Neu', Betreff: 'Neue Sache' },
    ],
    localCases,
  })
  const brief = compileMorningChangeBrief(delta)
  assert.equal(brief.changed_cases, 2)
  assert.equal(brief.changes, 3)
  assert.equal(brief.new_matter_candidates, 1)
  assert.equal(brief.needs_human_matching, 1)
  assert.equal(brief.cases[0].local_case_id, 'g1')
  assert.equal(brief.cases[0].changes.length, 2)
})

test('invalid cursor fails rather than silently replaying full history', () => {
  assert.throws(() => planAdvowareDelta({ lastSeenAt: 'not-a-date' }), /gültiger Zeitstempel/)
})
