import { DECISIONS } from './core.mjs'

const ADVOWARE_ACTIONS = Object.freeze({
  'advoware.matter.read': { decision: DECISIONS.ALLOW, reason: 'Read-only Aktenzugriff darf den internen Arbeitsstand spiegeln.' },
  'advoware.activity.read': { decision: DECISIONS.ALLOW, reason: 'Read-only Aktivitätsabruf darf zur internen Arbeitsvorbereitung laufen.' },
  'advoware.followup.write': { decision: DECISIONS.APPROVAL, reason: 'Wiedervorlage verändert den produktiven Kanzleidatensatz und ist in V1 freigabepflichtig.' },
  'advoware.file.attach': { decision: DECISIONS.APPROVAL, reason: 'Dateianlage verändert die produktive Akte und ist in V1 freigabepflichtig.' },
  'advoware.invoice.create': { decision: DECISIONS.APPROVAL, reason: 'Rechnungserstellung im produktiven System ist in V1 freigabepflichtig.' },
  'advoware.invoice.update': { decision: DECISIONS.APPROVAL, reason: 'Rechnungsänderungen bleiben menschlich freigabepflichtig.' },
  'advoware.matter.update': { decision: DECISIONS.APPROVAL, reason: 'Produktive Aktenänderungen bleiben menschlich freigabepflichtig.' },
})

export function decideAdvowareAction(action, context = {}) {
  if (context.cross_tenant === true || context.cross_matter === true) {
    return { action, decision: DECISIONS.BLOCK, reason: 'Tenant-/Mandatsgrenze verletzt.' }
  }
  const rule = ADVOWARE_ACTIONS[action]
  if (!rule) return { action, decision: DECISIONS.BLOCK, reason: 'Unbekannte Advoware-Aktion wird fail-closed blockiert.' }
  return { action, ...rule }
}
