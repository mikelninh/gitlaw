/** Demo-Akte-Generator — all data here is synthetic test data. */
import type { KanzleiSettings, MandantCase } from './types'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

export function createDemoCase(_settings: KanzleiSettings): MandantCase {
  return {
    id: 'demo-az-2026-0042',
    mandantName: 'Phạm Văn Đức',
    aktenzeichen: 'AZ-2026-0042',
    description: 'Aufenthaltstitel-Verlängerung — Bescheid vom LEA Berlin ausstehend.',
    createdAt: daysAgo(21),
    updatedAt: daysAgo(3),
    researchIds: [],
    letterIds: [],
    status: 'aktiv',
    tasks: [],
    documents: [],
    mandatsartId: 'aufenthaltstitel-verlaengerung',
    caseStatus: 'antrag_in_vorbereitung',
    mandantEmail: 'pham.duc@example.com',
    behoerde: 'Ausländerbehörde Berlin Mitte',
    fristDatum: daysFromNow(17),
    fristBezeichnung: 'Fiktionsbescheinigung läuft ab (§ 81 Abs. 4 AufenthG)',
    checklistStates: {
      reisepass: 'received',
      'aktueller-aufenthaltstitel': 'received',
      meldebescheinigung: 'received',
      mietvertrag: 'received',
      einkommensnachweis: 'received',
      'biometrisches-lichtbild': 'received',
      krankenversicherungsnachweis: 'problem',
      sprachzeugnis: 'pending',
      anwaltsvollmacht: 'pending',
      arbeitsvertrag: 'pending',
    },
    privacy: {
      dataMode: 'synthetic',
      externalAiPurpose: 'product demonstration with synthetic matter data',
      pseudonymousCaseRef: 'demo-matter-0042',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'system-demo-seed',
    },
  }
}
