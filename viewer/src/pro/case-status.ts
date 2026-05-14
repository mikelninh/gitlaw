/**
 * Modul B — 8-Stati-Status-Modell für GitLaw Pro (Sprint 1, Bao-Pilot)
 *
 * Status-Enum, Übergangs-Regeln aus BAO_KI_DATENVERARBEITUNG_ANTWORT.md Anhang A,
 * und Hilfs-Funktionen für den Sachstands-Generator.
 *
 * Voice: respektvoll-warm, klar, kein Marketing-Deutsch.
 */

import type { MandantCase, KanzleiSettings, CaseTaskType } from './types'
import { getChecklistById } from './mandatsart-checklists'

// ---------------------------------------------------------------------------
// B.1 — Status-Enum + Übergangs-Regeln
// ---------------------------------------------------------------------------

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
  labelVi?: string  // TODO: VI-review by native speaker
  internalDescription: string
  color: 'amber' | 'blue' | 'orange' | 'green' | 'gray'
  icon?: string
  allowedNextStates: CaseStatus[]
  /**
   * Mandantenkommunikations-Text DE — zweite Person, sachlich-warm.
   * Abgeleitet aus Abschnitt 18 des Bao-PDFs ("Ki Datenverarbeitung Kanzlei
   * Arbeitsgrundlage"). Das PDF enthält Spezifikationen in dritter Person;
   * dieser Feld ist die konkrete Umsetzung für die Mandanten-Anzeige.
   * TODO: Bao/Refa final-signoff auf genauen Wortlaut vor Produktiv-Einsatz.
   */
  mandantTextDe: string
  /**
   * Mandantenkommunikations-Text VI — plausible Übersetzung.
   * TODO: Native-Review durch Bao oder VI-Muttersprachler vor Produktiv-Einsatz.
   */
  mandantTextVi: string
}

export const CASE_STATUSES: CaseStatusInfo[] = [
  {
    id: 'unterlagen_fehlen',
    label: 'Unterlagen fehlen',
    // TODO: VI-review by native speaker
    labelVi: 'Hồ sơ chưa đầy đủ',
    internalDescription: 'Antrag kann nicht eingereicht werden — fehlende Unterlagen blockieren den Prozess.',
    color: 'amber',
    icon: '📋',
    allowedNextStates: ['unterlagen_in_pruefung'],
    // Bao-PDF Abschnitt 18 Spec: "Der Mandant erhält eine klare Liste fehlender
    // Unterlagen und eine kurze Erklärung, dass eine Bearbeitung erst nach Eingang
    // der vollständigen Unterlagen möglich ist."
    mandantTextDe:
      'Wir können Ihre Akte noch nicht weiterbearbeiten, weil folgende Unterlagen fehlen. ' +
      'Bitte reichen Sie die fehlenden Dokumente so bald wie möglich ein — erst danach kann Ihr Antrag vorbereitet werden.',
    // TODO: Native-Review durch Bao oder VI-Muttersprachler
    mandantTextVi:
      'Chúng tôi chưa thể tiếp tục xử lý hồ sơ của bạn vì còn thiếu một số tài liệu. ' +
      'Vui lòng nộp các tài liệu còn thiếu sớm nhất có thể — chỉ sau khi nhận đủ, đơn của bạn mới được chuẩn bị.',
  },
  {
    id: 'unterlagen_in_pruefung',
    label: 'Unterlagen in Prüfung',
    // TODO: VI-review by native speaker
    labelVi: 'Hồ sơ đang được kiểm tra',
    internalDescription: 'Alle Unterlagen eingegangen — Refa/Anwalt prüft Vollständigkeit und Richtigkeit.',
    color: 'blue',
    icon: '🔍',
    allowedNextStates: ['antrag_in_vorbereitung', 'unterlagen_fehlen'],
    // Bao-PDF Abschnitt 18 Spec: "Der Mandant wird informiert, dass die Unterlagen
    // eingegangen sind und geprüft werden."
    mandantTextDe:
      'Ihre Unterlagen sind bei uns eingegangen. Wir prüfen gerade, ob alles vollständig und verwendbar ist. ' +
      'Sie hören von uns, sobald die Prüfung abgeschlossen ist.',
    // TODO: Native-Review durch Bao oder VI-Muttersprachler
    mandantTextVi:
      'Chúng tôi đã nhận được tài liệu của bạn và đang kiểm tra xem hồ sơ có đầy đủ và hợp lệ không. ' +
      'Chúng tôi sẽ liên hệ bạn ngay khi quá trình kiểm tra hoàn tất.',
  },
  {
    id: 'antrag_in_vorbereitung',
    label: 'Antrag in Vorbereitung',
    // TODO: VI-review by native speaker
    labelVi: 'Đơn đang được chuẩn bị',
    internalDescription: 'Prüfung abgeschlossen — Anwalt bereitet die Einreichung vor.',
    color: 'blue',
    icon: '✍️',
    allowedNextStates: ['antrag_eingereicht'],
    // Bao-PDF Abschnitt 18 Spec: "Der Mandant wird informiert, dass die Kanzlei
    // den Antrag vorbereitet und sich bei Rückfragen meldet."
    mandantTextDe:
      'Die wesentlichen Unterlagen liegen vor. Wir bereiten Ihren Antrag jetzt vor. ' +
      'Falls wir noch Fragen haben, melden wir uns bei Ihnen.',
    // TODO: Native-Review durch Bao oder VI-Muttersprachler
    mandantTextVi:
      'Các tài liệu cần thiết đã đầy đủ. Chúng tôi đang chuẩn bị đơn của bạn. ' +
      'Nếu có câu hỏi gì thêm, chúng tôi sẽ liên hệ bạn.',
  },
  {
    id: 'antrag_eingereicht',
    label: 'Antrag eingereicht',
    // TODO: VI-review by native speaker
    labelVi: 'Đơn đã được nộp',
    internalDescription: 'Antrag liegt bei der Behörde. Bearbeitung liegt jetzt bei der Behörde — nicht bei der Kanzlei.',
    color: 'green',
    icon: '📬',
    allowedNextStates: ['behoerdliche_rueckmeldung_ausstehend'],
    // Bao-PDF Abschnitt 18 Spec: "Der Mandant wird informiert, dass die weitere
    // Bearbeitung nun bei der Behörde oder sonstigen Stelle liegt und dass die
    // Bearbeitungsdauer regelmäßig mehrere Wochen oder länger betragen kann."
    mandantTextDe:
      'Ihr Antrag wurde eingereicht. Die weitere Bearbeitung liegt jetzt bei der Behörde — nicht bei uns. ' +
      'Behördliche Bearbeitungszeiten betragen erfahrungsgemäß mehrere Wochen oder länger. ' +
      'Wir informieren Sie, sobald eine Rückmeldung vorliegt.',
    // TODO: Native-Review durch Bao oder VI-Muttersprachler
    mandantTextVi:
      'Đơn của bạn đã được nộp. Từ đây, quá trình xử lý thuộc về cơ quan có thẩm quyền — không phải văn phòng chúng tôi. ' +
      'Thời gian xử lý thường kéo dài nhiều tuần hoặc hơn. ' +
      'Chúng tôi sẽ thông báo ngay khi nhận được phản hồi.',
  },
  {
    id: 'behoerdliche_rueckmeldung_ausstehend',
    label: 'Behördliche Rückmeldung ausstehend',
    // TODO: VI-review by native speaker
    labelVi: 'Đang chờ phản hồi từ cơ quan',
    internalDescription: 'Antrag eingereicht, Behörde hat noch nicht reagiert. Wartezeit erfahrungsgemäß mehrere Wochen.',
    color: 'orange',
    icon: '⏳',
    allowedNextStates: [
      'behoerde_nachforderung',
      'termin_steht_aus',
      'verfahren_abgeschlossen',
    ],
    // Bao-PDF Abschnitt 18 Spec: "Der Mandant erhält eine standardisierte Erklärung,
    // dass derzeit keine neue Rückmeldung vorliegt und die Kanzlei den Vorgang
    // weiter überwacht."
    mandantTextDe:
      'Wir warten aktuell auf eine Rückmeldung der Behörde. Eine neue Nachricht liegt uns noch nicht vor. ' +
      'Wir beobachten den Vorgang weiterhin und informieren Sie sofort, wenn sich etwas ändert.',
    // TODO: Native-Review durch Bao oder VI-Muttersprachler
    mandantTextVi:
      'Chúng tôi đang chờ phản hồi từ cơ quan có thẩm quyền. Hiện tại chưa có thông tin mới. ' +
      'Chúng tôi tiếp tục theo dõi và sẽ thông báo ngay khi có thay đổi.',
  },
  {
    id: 'behoerde_nachforderung',
    label: 'Behörde hat Nachforderung gestellt',
    // TODO: VI-review by native speaker
    labelVi: 'Cơ quan yêu cầu bổ sung hồ sơ',
    internalDescription: 'Behörde fordert weitere Unterlagen oder Klärung. Rückkehr in Prüfungs-Phase nach Eingang.',
    color: 'amber',
    icon: '📩',
    allowedNextStates: ['unterlagen_in_pruefung'],
    // Kein eigener Bao-PDF-Abschnitt-18-Status — Fallback-Text.
    // Bao-PDF deckt nur 5 Stati ab; dieser ist interne Kanzlei-Granularität.
    mandantTextDe:
      'Die Behörde hat weitere Unterlagen oder Informationen angefordert. Wir informieren Sie, was als nächstes benötigt wird.',
    // TODO: Native-Review durch Bao oder VI-Muttersprachler
    mandantTextVi:
      'Cơ quan đã yêu cầu thêm tài liệu hoặc thông tin. Chúng tôi sẽ thông báo cho bạn những gì cần cung cấp tiếp theo.',
  },
  {
    id: 'termin_steht_aus',
    label: 'Termin / Entscheidung steht aus',
    // TODO: VI-review by native speaker
    labelVi: 'Đang chờ lịch hẹn / quyết định',
    internalDescription: 'Behörde hat Termin oder Entscheidung angekündigt — Ergebnis ausstehend.',
    color: 'orange',
    icon: '📅',
    allowedNextStates: ['verfahren_abgeschlossen'],
    // Kein eigener Bao-PDF-Abschnitt-18-Status — Fallback-Text.
    // Bao-PDF deckt nur 5 Stati ab; dieser ist interne Kanzlei-Granularität.
    mandantTextDe:
      'Ein Termin oder eine Entscheidung steht aus. Wir halten Sie auf dem Laufenden, sobald das Ergebnis bekannt ist.',
    // TODO: Native-Review durch Bao oder VI-Muttersprachler
    mandantTextVi:
      'Đang chờ lịch hẹn hoặc quyết định từ cơ quan. Chúng tôi sẽ thông báo ngay khi có kết quả.',
  },
  {
    id: 'verfahren_abgeschlossen',
    label: 'Verfahren abgeschlossen',
    // TODO: VI-review by native speaker
    labelVi: 'Hồ sơ đã hoàn tất',
    internalDescription: 'Verfahren beendet — Bescheid erhalten, Ergebnis dokumentiert. Akte kann archiviert werden.',
    color: 'gray',
    icon: '✅',
    allowedNextStates: [],
    // Kein eigener Bao-PDF-Abschnitt-18-Status — Fallback-Text.
    // Bao-PDF deckt nur 5 Stati ab; dieser ist interne Kanzlei-Granularität.
    mandantTextDe:
      'Ihr Verfahren ist abgeschlossen. Wir haben alle Ergebnisse in Ihrer Akte dokumentiert. Bei weiteren Fragen stehen wir Ihnen gerne zur Verfügung.',
    // TODO: Native-Review durch Bao oder VI-Muttersprachler
    mandantTextVi:
      'Hồ sơ của bạn đã được hoàn tất. Chúng tôi đã lưu toàn bộ kết quả vào hồ sơ. Nếu có thắc mắc thêm, vui lòng liên hệ chúng tôi.',
  },
]

export function getStatusInfo(s: CaseStatus): CaseStatusInfo {
  const info = CASE_STATUSES.find(i => i.id === s)
  if (!info) throw new Error(`Unknown CaseStatus: ${s}`)
  return info
}

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  // Pilot: alle Übergänge erlaubt — auch rückwärts. Im Kanzlei-Alltag
  // werden Status-Korrekturen oft gebraucht (Versehen, neue Information).
  // allowedNextStates bleibt für Auto-Tasks/Suggestions im Code erhalten.
  return from !== to
}

// ---------------------------------------------------------------------------
// B.2 — Auto-Frist-Berechnung bei Status-Wechsel zu 'antrag_eingereicht'
// ---------------------------------------------------------------------------

interface FristResult {
  fristDatum: string      // ISO date string (YYYY-MM-DD)
  fristBezeichnung: string
}

interface FristConfig {
  months?: number
  days?: number
  bezeichnung: string
}

const BEHOERDEN_FRIST_CONFIG: Record<string, FristConfig> = {
  'aufenthaltstitel-verlaengerung': {
    months: 3,
    bezeichnung: 'Behördliche Bearbeitungsfrist nach § 75 VwVfG',
  },
  'familiennachzug-ehegatte': {
    months: 3,
    bezeichnung: 'Behördliche Bearbeitungsfrist nach § 75 VwVfG',
  },
  'familiennachzug-kind': {
    months: 3,
    bezeichnung: 'Behördliche Bearbeitungsfrist nach § 75 VwVfG',
  },
  'visumsverfahren-national': {
    months: 3,
    bezeichnung: 'Behördliche Bearbeitungsfrist nach § 75 VwVfG',
  },
  'einbuergerung': {
    months: 6,
    bezeichnung: 'Erfahrungswert Bearbeitung Einbürgerung',
  },
  'niederlassungserlaubnis': {
    months: 3,
    bezeichnung: 'Behördliche Bearbeitungsfrist nach § 75 VwVfG',
  },
  'chancenkarte': {
    months: 2,
    bezeichnung: 'Behördliche Bearbeitungsfrist nach § 75 VwVfG',
  },
  'beschaeftigungserlaubnis': {
    months: 2,
    bezeichnung: 'Behördliche Bearbeitungsfrist nach § 75 VwVfG',
  },
  'eilantrag-abschiebung': {
    days: 7,
    bezeichnung: 'Eilverfahren — sehr kurze Frist',
  },
  'untaetigkeitsklage': {
    months: 3,
    bezeichnung: 'Untätigkeitsfrist nach § 75 VwGO',
  },
  'haertefall': {
    months: 6,
    bezeichnung: 'Erfahrungswert Bearbeitung Härtefall',
  },
}

const DEFAULT_FRIST_CONFIG: FristConfig = {
  months: 3,
  bezeichnung: 'Behördliche Bearbeitungsfrist nach § 75 VwVfG',
}

/**
 * Berechnet die erwartete Bearbeitungsfrist der Behörde ab einem Antragsdatum.
 * Gibt null zurück wenn kein Antragsdatum übergeben wird.
 */
export function computeBehoerdenFrist(
  mandatsartId: string | undefined,
  antragDatum: Date
): FristResult | null {
  if (!antragDatum || isNaN(antragDatum.getTime())) return null

  const config =
    (mandatsartId ? BEHOERDEN_FRIST_CONFIG[mandatsartId] : undefined) ??
    DEFAULT_FRIST_CONFIG

  const frist = new Date(antragDatum)

  if (config.days) {
    frist.setDate(frist.getDate() + config.days)
  } else if (config.months) {
    frist.setMonth(frist.getMonth() + config.months)
  }

  const fristDatum = frist.toISOString().slice(0, 10)

  return { fristDatum, fristBezeichnung: config.bezeichnung }
}

// ---------------------------------------------------------------------------
// B.3 — Helper functions
// ---------------------------------------------------------------------------

/**
 * Füllt einen Template-String mit {placeholder}-Werten.
 * Unbekannte Platzhalter bleiben als {placeholder} erhalten.
 */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  })
}

/**
 * Formatiert die fehlenden Unterlagen als Aufzählung.
 * Liest checklistStates und liefert alle required-Items mit status ≠ 'received'.
 */
export function formatFehlendeUnterlagen(c: MandantCase, lang: 'de' | 'vi'): string {
  if (!c.mandatsartId) return ''
  const checklist = getChecklistById(c.mandatsartId)
  if (!checklist) return ''

  const states = c.checklistStates ?? {}
  const missing = checklist.requiredDocuments.filter(
    item => item.level === 'required' && states[item.id] !== 'received'
  )

  if (missing.length === 0) return ''

  return missing
    .map(item => {
      const label = lang === 'vi' && item.labelVi ? item.labelVi : item.label
      // Nur bei DE: item.description als Erklärungszeile anhängen.
      // Bei VI lieber weglassen — Mischsprache im Brief vermeiden.
      if (lang === 'de' && item.description) {
        return `· ${label}\n  — ${item.description}`
      }
      return `· ${label}`
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// B.4 — Auto-Aufgaben bei Status-Wechsel (Modul D, Sprint 1)
// ---------------------------------------------------------------------------

interface AutoTaskSpec {
  title: string
  type: CaseTaskType
  dueDateOffsetDays?: number
}

/**
 * Gibt die Liste der Aufgaben zurück, die beim Übergang von fromStatus → toStatus
 * automatisch erstellt werden sollen.
 * Leere Liste = kein Auto-Task für diesen Übergang.
 */
export function getAutoTasksForStatusChange(
  _caseId: string,
  fromStatus: CaseStatus,
  toStatus: CaseStatus,
): AutoTaskSpec[] {
  const specs: AutoTaskSpec[] = []

  // Mandant erinnern wenn Unterlagen fehlen und Status wechselt weg
  if (fromStatus === 'unterlagen_fehlen') {
    specs.push({
      title: 'Mandant:in an fehlende Unterlagen erinnern',
      type: 'mandant_erinnern',
      dueDateOffsetDays: 3,
    })
  }

  if (toStatus === 'antrag_in_vorbereitung') {
    specs.push({
      title: 'Antrag vorbereiten und prüfen',
      type: 'antrag_vorbereiten',
      dueDateOffsetDays: 5,
    })
  }

  if (toStatus === 'antrag_eingereicht') {
    specs.push({
      title: 'Behörde nachfassen — Eingangsbestätigung anfordern',
      type: 'behoerde_nachfassen',
      dueDateOffsetDays: 14,
    })
  }

  if (toStatus === 'behoerde_nachforderung') {
    specs.push({
      title: 'Nachforderung der Behörde prüfen und beantworten',
      type: 'nachforderung_pruefen',
      dueDateOffsetDays: 2,
    })
  }

  if (toStatus === 'termin_steht_aus') {
    specs.push({
      title: 'Anwaltliche Prüfung vor Termin',
      type: 'anwaltliche_pruefung',
      dueDateOffsetDays: 7,
    })
  }

  return specs
}

/**
 * Baut den Kontext-Record für fillTemplate() aus einer Akte.
 * Alle Platzhalter, die in den Sachstands-Templates vorkommen.
 */
export function buildSachstandsContext(
  c: MandantCase,
  settings: KanzleiSettings,
  lang: 'de' | 'vi'
): Record<string, string> {
  const anrede =
    lang === 'vi'
      ? `Kính gửi ${c.mandantName},`
      : `Sehr geehrte/r Frau/Herr ${c.mandantName},`

  const antragDatum = c.createdAt
    ? new Date(c.createdAt).toLocaleDateString('de-DE')
    : '—'

  const unterschrift =
    lang === 'vi'
      ? `Trân trọng,\n${settings.anwaltName}\n${settings.name}`
      : `Mit freundlichen Grüßen\n${settings.anwaltName}\n${settings.name}`

  // Derive Mandatsart label from mandatsartId if available
  const mandatsartLabel = c.mandatsartId
    ? c.mandatsartId
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
    : lang === 'vi' ? 'Vụ việc di trú' : 'Migrationsmandat'

  return {
    mandant_anrede: anrede,
    mandant_name: c.mandantName,
    aktenzeichen: c.aktenzeichen,
    mandatsart: mandatsartLabel,
    behoerde: c.behoerde || (lang === 'vi' ? 'Cơ quan có thẩm quyền' : 'der zuständigen Behörde'),
    antrag_datum: antragDatum,
    fehlende_unterlagen: formatFehlendeUnterlagen(c, lang),
    naechster_schritt:
      lang === 'vi'
        ? 'Chúng tôi sẽ thông báo khi có thông tin mới.'
        : 'Wir informieren Sie, sobald es Neuigkeiten gibt.',
    kanzlei_unterschrift: unterschrift,
  }
}
