/**
 * Statusmodell und Sachstands-Helfer für Migrationsakten.
 *
 * Wichtig: Zeitangaben in diesem Modul sind interne Wiedervorlagen bzw.
 * Erfahrungswerte. Sie sind keine pauschalen gesetzlichen Bearbeitungsfristen.
 */

import type { MandantCase, KanzleiSettings, CaseTaskType } from './types'
import { getChecklistById } from './mandatsart-checklists'

export type CaseStatus =
  | 'unterlagen_fehlen'
  | 'unterlagen_in_pruefung'
  | 'antrag_in_vorbereitung'
  | 'antrag_eingereicht'
  | 'behoerdliche_rueckmeldung_ausstehend'
  | 'behoerde_nachforderung'
  | 'termin_steht_aus'
  | 'verfahren_abgeschlossen'

export interface CaseStatusInfo {
  id: CaseStatus
  label: string
  labelVi?: string
  internalDescription: string
  color: 'amber' | 'blue' | 'orange' | 'green' | 'gray'
  icon?: string
  allowedNextStates: CaseStatus[]
  mandantTextDe: string
  mandantTextVi: string
}

export const CASE_STATUSES: CaseStatusInfo[] = [
  {
    id: 'unterlagen_fehlen',
    label: 'Unterlagen fehlen',
    labelVi: 'Hồ sơ chưa đầy đủ',
    internalDescription: 'Fehlende Unterlagen blockieren die weitere Vorbereitung.',
    color: 'amber',
    icon: '📋',
    allowedNextStates: ['unterlagen_in_pruefung'],
    mandantTextDe: 'Wir können Ihre Akte noch nicht weiterbearbeiten, weil Unterlagen fehlen. Bitte reichen Sie die offenen Dokumente ein. Danach prüfen wir Ihre Akte weiter.',
    mandantTextVi: 'Chúng tôi chưa thể tiếp tục xử lý hồ sơ vì còn thiếu tài liệu. Vui lòng nộp các giấy tờ còn thiếu. Sau đó chúng tôi sẽ tiếp tục kiểm tra hồ sơ.',
  },
  {
    id: 'unterlagen_in_pruefung',
    label: 'Unterlagen in Prüfung',
    labelVi: 'Hồ sơ đang được kiểm tra',
    internalDescription: 'Unterlagen sind eingegangen und werden auf Vollständigkeit und Verwendbarkeit geprüft.',
    color: 'blue',
    icon: '🔍',
    allowedNextStates: ['antrag_in_vorbereitung', 'unterlagen_fehlen'],
    mandantTextDe: 'Ihre Unterlagen sind bei uns eingegangen. Wir prüfen gerade, ob alles vollständig und verwendbar ist. Sie hören von uns, sobald die Prüfung abgeschlossen ist.',
    mandantTextVi: 'Chúng tôi đã nhận được tài liệu của bạn và đang kiểm tra xem hồ sơ có đầy đủ và có thể sử dụng được hay không. Chúng tôi sẽ liên hệ khi việc kiểm tra hoàn tất.',
  },
  {
    id: 'antrag_in_vorbereitung',
    label: 'Antrag in Vorbereitung',
    labelVi: 'Đơn đang được chuẩn bị',
    internalDescription: 'Die wesentlichen Unterlagen liegen vor; die Einreichung wird vorbereitet.',
    color: 'blue',
    icon: '✍️',
    allowedNextStates: ['antrag_eingereicht'],
    mandantTextDe: 'Die wesentlichen Unterlagen liegen vor. Wir bereiten Ihren Antrag jetzt vor. Falls wir noch Fragen haben, melden wir uns bei Ihnen.',
    mandantTextVi: 'Các tài liệu chính đã có. Chúng tôi đang chuẩn bị đơn của bạn. Nếu cần thêm thông tin, chúng tôi sẽ liên hệ.',
  },
  {
    id: 'antrag_eingereicht',
    label: 'Antrag eingereicht',
    labelVi: 'Đơn đã được nộp',
    internalDescription: 'Antrag wurde bei der zuständigen Stelle eingereicht.',
    color: 'green',
    icon: '📬',
    allowedNextStates: ['behoerdliche_rueckmeldung_ausstehend'],
    mandantTextDe: 'Ihr Antrag wurde eingereicht. Die weitere Bearbeitung liegt jetzt bei der zuständigen Stelle. Bearbeitungszeiten können je nach Verfahren und Behörde stark variieren. Wir informieren Sie, sobald eine Rückmeldung vorliegt.',
    mandantTextVi: 'Đơn của bạn đã được nộp. Việc xử lý tiếp theo hiện thuộc cơ quan có thẩm quyền. Thời gian xử lý có thể khác nhau nhiều tùy thủ tục và cơ quan. Chúng tôi sẽ thông báo khi có phản hồi.',
  },
  {
    id: 'behoerdliche_rueckmeldung_ausstehend',
    label: 'Behördliche Rückmeldung ausstehend',
    labelVi: 'Đang chờ phản hồi từ cơ quan',
    internalDescription: 'Antrag ist eingereicht; eine neue behördliche Rückmeldung liegt noch nicht vor.',
    color: 'orange',
    icon: '⏳',
    allowedNextStates: ['behoerde_nachforderung', 'termin_steht_aus', 'verfahren_abgeschlossen'],
    mandantTextDe: 'Wir warten aktuell auf eine Rückmeldung der Behörde. Eine neue Nachricht liegt uns noch nicht vor. Wir beobachten den Vorgang weiterhin und informieren Sie, wenn sich etwas ändert.',
    mandantTextVi: 'Chúng tôi đang chờ phản hồi từ cơ quan có thẩm quyền. Hiện chưa có thông tin mới. Chúng tôi tiếp tục theo dõi và sẽ thông báo khi có thay đổi.',
  },
  {
    id: 'behoerde_nachforderung',
    label: 'Behörde hat Nachforderung gestellt',
    labelVi: 'Cơ quan yêu cầu bổ sung hồ sơ',
    internalDescription: 'Die Behörde fordert weitere Unterlagen oder eine Klärung.',
    color: 'amber',
    icon: '📩',
    allowedNextStates: ['unterlagen_in_pruefung'],
    mandantTextDe: 'Die Behörde hat weitere Unterlagen oder Informationen angefordert. Wir zeigen Ihnen, was als Nächstes benötigt wird.',
    mandantTextVi: 'Cơ quan đã yêu cầu thêm tài liệu hoặc thông tin. Chúng tôi sẽ cho bạn biết bước tiếp theo cần gì.',
  },
  {
    id: 'termin_steht_aus',
    label: 'Termin / Entscheidung steht aus',
    labelVi: 'Đang chờ lịch hẹn / quyết định',
    internalDescription: 'Ein Termin oder eine Entscheidung ist angekündigt bzw. steht noch aus.',
    color: 'orange',
    icon: '📅',
    allowedNextStates: ['verfahren_abgeschlossen'],
    mandantTextDe: 'Ein Termin oder eine Entscheidung steht aus. Wir halten Sie auf dem Laufenden, sobald das Ergebnis bekannt ist.',
    mandantTextVi: 'Đang chờ lịch hẹn hoặc quyết định từ cơ quan. Chúng tôi sẽ thông báo khi có kết quả.',
  },
  {
    id: 'verfahren_abgeschlossen',
    label: 'Verfahren abgeschlossen',
    labelVi: 'Hồ sơ đã hoàn tất',
    internalDescription: 'Verfahren beendet; Ergebnis ist in der Akte dokumentiert.',
    color: 'gray',
    icon: '✅',
    allowedNextStates: [],
    mandantTextDe: 'Ihr Verfahren ist abgeschlossen. Wir haben das Ergebnis in Ihrer Akte dokumentiert. Bei weiteren Fragen können Sie sich an uns wenden.',
    mandantTextVi: 'Hồ sơ của bạn đã hoàn tất. Chúng tôi đã ghi nhận kết quả trong hồ sơ. Nếu có câu hỏi thêm, bạn có thể liên hệ với chúng tôi.',
  },
]

export function getStatusInfo(s: CaseStatus): CaseStatusInfo {
  const info = CASE_STATUSES.find(item => item.id === s)
  if (!info) throw new Error(`Unknown CaseStatus: ${s}`)
  return info
}

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  // Korrekturen im Kanzleialltag bleiben möglich; allowedNextStates wird für
  // Vorschläge und Automationen weitergeführt.
  return from !== to
}

interface FristResult {
  fristDatum: string
  fristBezeichnung: string
}

interface FristConfig {
  months?: number
  days?: number
  bezeichnung: string
}

const INTERNAL_REVIEW = 'Interne Wiedervorlage – keine gesetzliche Bearbeitungsfrist'

const BEHOERDEN_FRIST_CONFIG: Record<string, FristConfig> = {
  'aufenthaltstitel-verlaengerung': { months: 3, bezeichnung: INTERNAL_REVIEW },
  'familiennachzug-ehegatte': { months: 3, bezeichnung: INTERNAL_REVIEW },
  'familiennachzug-kind': { months: 3, bezeichnung: INTERNAL_REVIEW },
  'visumsverfahren-national': { months: 3, bezeichnung: INTERNAL_REVIEW },
  'einbuergerung': { months: 6, bezeichnung: 'Interne Wiedervorlage – Erfahrungswert, keine gesetzliche Bearbeitungsfrist' },
  'niederlassungserlaubnis': { months: 3, bezeichnung: INTERNAL_REVIEW },
  'chancenkarte': { months: 2, bezeichnung: INTERNAL_REVIEW },
  'beschaeftigungserlaubnis': { months: 2, bezeichnung: INTERNAL_REVIEW },
  'eilantrag-abschiebung': { days: 7, bezeichnung: 'Interne Wiedervorlage Eilverfahren – konkrete Fristen fallbezogen prüfen' },
  'untaetigkeitsklage': { months: 3, bezeichnung: 'Prüfpunkt für Untätigkeitsklage nach § 75 VwGO – Voraussetzungen fallbezogen prüfen' },
  'haertefall': { months: 6, bezeichnung: 'Interne Wiedervorlage – Erfahrungswert, keine gesetzliche Bearbeitungsfrist' },
}

const DEFAULT_FRIST_CONFIG: FristConfig = { months: 3, bezeichnung: INTERNAL_REVIEW }

/**
 * Berechnet eine interne Wiedervorlage ab Antragsdatum.
 * Der Rückgabewert ist keine Aussage über eine gesetzliche Bearbeitungsfrist.
 */
export function computeBehoerdenFrist(
  mandatsartId: string | undefined,
  antragDatum: Date,
): FristResult | null {
  if (!antragDatum || Number.isNaN(antragDatum.getTime())) return null
  const config = (mandatsartId ? BEHOERDEN_FRIST_CONFIG[mandatsartId] : undefined) ?? DEFAULT_FRIST_CONFIG
  const frist = new Date(antragDatum)
  if (config.days) frist.setDate(frist.getDate() + config.days)
  else if (config.months) frist.setMonth(frist.getMonth() + config.months)
  return { fristDatum: frist.toISOString().slice(0, 10), fristBezeichnung: config.bezeichnung }
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  ))
}

export function formatFehlendeUnterlagen(c: MandantCase, lang: 'de' | 'vi'): string {
  if (!c.mandatsartId) return ''
  const checklist = getChecklistById(c.mandatsartId)
  if (!checklist) return ''
  const states = c.checklistStates ?? {}
  const missing = checklist.requiredDocuments.filter(item => item.level === 'required' && states[item.id] !== 'received')
  return missing.map(item => {
    const label = lang === 'vi' && item.labelVi ? item.labelVi : item.label
    if (lang === 'de' && item.description) return `· ${label}\n  — ${item.description}`
    return `· ${label}`
  }).join('\n')
}

interface AutoTaskSpec {
  title: string
  type: CaseTaskType
  dueDateOffsetDays?: number
}

export function getAutoTasksForStatusChange(
  _caseId: string,
  fromStatus: CaseStatus,
  toStatus: CaseStatus,
): AutoTaskSpec[] {
  const specs: AutoTaskSpec[] = []
  if (fromStatus === 'unterlagen_fehlen') {
    specs.push({ title: 'Mandant:in an fehlende Unterlagen erinnern', type: 'mandant_erinnern', dueDateOffsetDays: 3 })
  }
  if (toStatus === 'antrag_in_vorbereitung') {
    specs.push({ title: 'Antrag vorbereiten und prüfen', type: 'antrag_vorbereiten', dueDateOffsetDays: 5 })
  }
  if (toStatus === 'antrag_eingereicht') {
    specs.push({ title: 'Behörde nachfassen — Eingangsbestätigung anfordern', type: 'behoerde_nachfassen', dueDateOffsetDays: 14 })
  }
  if (toStatus === 'behoerde_nachforderung') {
    specs.push({ title: 'Nachforderung der Behörde prüfen und beantworten', type: 'nachforderung_pruefen', dueDateOffsetDays: 2 })
  }
  if (toStatus === 'termin_steht_aus') {
    specs.push({ title: 'Anwaltliche Prüfung vor Termin', type: 'anwaltliche_pruefung', dueDateOffsetDays: 7 })
  }
  return specs
}

export function buildSachstandsContext(
  c: MandantCase,
  settings: KanzleiSettings,
  lang: 'de' | 'vi',
): Record<string, string> {
  const anrede = lang === 'vi' ? `Kính gửi ${c.mandantName},` : `Sehr geehrte/r Frau/Herr ${c.mandantName},`
  const antragDatum = c.createdAt ? new Date(c.createdAt).toLocaleDateString('de-DE') : '—'
  const unterschrift = lang === 'vi'
    ? `Trân trọng,\n${settings.anwaltName}\n${settings.name}`
    : `Mit freundlichen Grüßen\n${settings.anwaltName}\n${settings.name}`
  const mandatsartLabel = c.mandatsartId
    ? c.mandatsartId.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
    : (lang === 'vi' ? 'Vụ việc di trú' : 'Migrationsmandat')

  return {
    mandant_anrede: anrede,
    mandant_name: c.mandantName,
    aktenzeichen: c.aktenzeichen,
    mandatsart: mandatsartLabel,
    behoerde: c.behoerde || (lang === 'vi' ? 'Cơ quan có thẩm quyền' : 'der zuständigen Behörde'),
    antrag_datum: antragDatum,
    fehlende_unterlagen: formatFehlendeUnterlagen(c, lang),
    naechster_schritt: lang === 'vi'
      ? 'Chúng tôi sẽ thông báo khi có thông tin mới.'
      : 'Wir informieren Sie, sobald es Neuigkeiten gibt.',
    kanzlei_unterschrift: unterschrift,
  }
}
