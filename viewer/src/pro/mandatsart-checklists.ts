/**
 * Modul A — Mandatsart-Checklisten (Sprint 0, Bao pilot)
 *
 * Seed data for 11 Migration-Mandatsarten with DE + VI document labels.
 * Designed for Bao Nguyen's Vietnamese-German immigration law practice.
 *
 * Defensive default: items are 'required' unless clearly optional.
 * Bao can downgrade required → optional in tomorrow's meeting.
 *
 * VI labels: marked `// TODO: VI-review by native speaker` where confidence
 * is lower than ~80 %. A Vietnamesisch-Muttersprachler should review all VI
 * labels before going live with Mandant-facing UI.
 *
 * Legal basis sources: AufenthG, StAG, FreizügigG/EU, AsylG, VwGO.
 */

import type { MandatsartChecklist, MandatsartCategory } from './types'

export type { MandatsartChecklist, MandatsartCategory }

// ---------------------------------------------------------------------------
// 1. Aufenthaltstitel verlängern
// ---------------------------------------------------------------------------

const aufenthaltstitelVerlaengerung: MandatsartChecklist = {
  id: 'aufenthaltstitel-verlaengerung',
  title: 'Aufenthaltstitel verlängern',
  titleVi: 'Gia hạn giấy phép cư trú', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Verlängerung eines bestehenden Aufenthaltstitels (Aufenthaltserlaubnis, Niederlassungserlaubnis ausgenommen) vor Ablauf der Gültigkeitsdauer. Betrifft Drittstaatsangehörige mit bestehendem Aufenthaltsrecht in Deutschland.',
  legalBasis: ['§ 8 AufenthG', '§ 81 AufenthG', '§ 5 AufenthG', '§ 26 AufenthG'],
  typicalDuration: '6–12 Wochen',
  requiredDocuments: [
    {
      id: 'reisepass',
      label: 'Reisepass (Original + Kopie aller Stempelseiten, ≥ 6 Monate gültig über Antragsdatum)',
      labelVi: 'Hộ chiếu (bản gốc + bản sao tất cả các trang có đóng dấu, còn hạn ≥ 6 tháng)', // TODO: VI-review by native speaker
      description: 'Die Ausländerbehörde prüft Einreisestempel und frühere Visa. Alle bestempelten Seiten müssen kopiert werden.',
      level: 'required',
      category: 'identitaet',
      acceptedFormats: ['pdf', 'jpg', 'png'],
      typicalIssues: [
        'Ablichtung muss farbig sein',
        'Reisepass mit weniger als 6 Monaten Restlaufzeit wird oft abgelehnt',
        'Alle Seiten inkl. leerer Seiten mit Stempel',
      ],
    },
    {
      id: 'aktueller-aufenthaltstitel',
      label: 'Aktueller Aufenthaltstitel (Original + Kopie Vorder- und Rückseite)',
      labelVi: 'Giấy phép cư trú hiện tại (bản gốc + bản sao cả hai mặt)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
      typicalIssues: ['Gültigkeitsdatum prüfen — Verlängerungsantrag muss vor Ablauf gestellt werden'],
    },
    {
      id: 'meldebescheinigung',
      label: 'Aktuelle Meldebescheinigung (≤ 3 Monate alt)',
      labelVi: 'Giấy chứng nhận đăng ký hộ khẩu (không quá 3 tháng)', // TODO: VI-review by native speaker
      description: 'Amtliche Bestätigung der Wohnadresse vom Einwohnermeldeamt.',
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'mietvertrag',
      label: 'Mietvertrag (aktuelle Version) oder Wohnungsgeberbestätigung (§ 19 BMG)',
      labelVi: 'Hợp đồng thuê nhà hoặc xác nhận của chủ nhà (§ 19 BMG)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'einkommensnachweis',
      label: 'Einkommensnachweis: letzte 3 Lohnabrechnungen oder Rentenbescheid',
      labelVi: 'Bằng chứng thu nhập: 3 tháng lương gần nhất hoặc thông báo lương hưu', // TODO: VI-review by native speaker
      description: 'Sicherung des Lebensunterhalts gem. § 5 Abs. 1 Nr. 1 AufenthG.',
      level: 'required',
      category: 'einkommen',
      typicalIssues: ['Minijob reicht oft nicht für Lebensunterhaltssicherung'],
    },
    {
      id: 'krankenversicherungsnachweis',
      label: 'Nachweis Krankenversicherung (Versicherungskarte oder Bescheinigung)',
      labelVi: 'Bằng chứng bảo hiểm y tế (thẻ hoặc giấy chứng nhận)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'gesundheit',
    },
    {
      id: 'biometrisches-lichtbild',
      label: 'Biometrisches Lichtbild (35 × 45 mm, ≤ 6 Monate alt, weißer Hintergrund)',
      labelVi: 'Ảnh sinh trắc học (35 × 45 mm, không quá 6 tháng, nền trắng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
      typicalIssues: ['Druck muss auf Fotopapier sein', 'Kein Ausdruck auf Normalpapier'],
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'sprachzeugnis',
      label: 'Sprachzertifikat (mind. B1 Deutsch, z. B. Goethe, telc, TestDaF)',
      labelVi: 'Chứng chỉ tiếng Đức (tối thiểu B1, ví dụ Goethe, telc, TestDaF)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur wenn der aktuelle Aufenthaltstitel oder der angestrebte Titel einen Sprachnachweis voraussetzt (z. B. Aufenthaltserlaubnis zur Beschäftigung nach § 18 AufenthG oder für Familiennachzug)',
      category: 'sprache',
    },
    {
      id: 'arbeitsvertrag',
      label: 'Arbeitsvertrag oder Arbeitgeberbescheinigung',
      labelVi: 'Hợp đồng lao động hoặc giấy xác nhận của người sử dụng lao động', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur bei aufenthaltstiteln, die an eine Beschäftigung geknüpft sind (§ 18 ff. AufenthG)',
      category: 'einkommen',
    },
  ],
}

// ---------------------------------------------------------------------------
// 2. Familiennachzug Ehegatt:in
// ---------------------------------------------------------------------------

const familiennachzugEhegatte: MandatsartChecklist = {
  id: 'familiennachzug-ehegatte',
  title: 'Familiennachzug Ehegatt:in',
  titleVi: 'Đoàn tụ gia đình – vợ/chồng', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Nachzug eines/einer Ehegatt:in zu einem/einer in Deutschland lebenden Drittstaatsangehörigen oder Deutschen. Gilt für Antragsteller:innen, die aus dem Ausland nachziehen.',
  legalBasis: ['§ 27 AufenthG', '§ 28 AufenthG', '§ 30 AufenthG', '§ 5 AufenthG'],
  typicalDuration: '3–6 Monate (Visumverfahren + Aufenthaltserlaubnis)',
  requiredDocuments: [
    {
      id: 'reisepass-antragsteller',
      label: 'Reisepass nachziehende Person (Original + Kopie aller Stempelseiten, ≥ 6 Monate gültig)',
      labelVi: 'Hộ chiếu người theo (bản gốc + bản sao tất cả trang đóng dấu, còn hạn ≥ 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'reisepass-stammberechtigter',
      label: 'Reisepass oder Personalausweis Stammberechtigte:r (in Deutschland lebend)',
      labelVi: 'Hộ chiếu hoặc CMND của người bảo lãnh (đang sống ở Đức)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'aufenthaltstitel-stammberechtigter',
      label: 'Aufenthaltstitel der stammberechtigten Person (Original + Kopie)',
      labelVi: 'Giấy phép cư trú của người bảo lãnh (bản gốc + bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
      typicalIssues: ['Bei deutschen Stammberechtigten entfällt dieser Nachweis'],
    },
    {
      id: 'heiratsurkunde',
      label: 'Heiratsurkunde mit Apostille oder Legalisation + beglaubigte Übersetzung ins Deutsche',
      labelVi: 'Giấy đăng ký kết hôn kèm con dấu Apostille hoặc hợp pháp hóa + bản dịch công chứng tiếng Đức', // TODO: VI-review by native speaker
      description: 'Ausländische Urkunden benötigen Apostille (Haager Abkommen) oder Legalisation durch die Deutsche Botschaft.',
      level: 'required',
      category: 'familie',
      typicalIssues: [
        'Vietnamesische Urkunden benötigen in der Regel Legalisation (kein Apostille-Mitglied)',
        'Übersetzung muss von einem vereidigten Übersetzer stammen',
        'Originalurkunde muss vorgelegt werden, keine Fotokopie',
      ],
    },
    {
      id: 'meldebescheinigung-stammberechtigter',
      label: 'Meldebescheinigung Stammberechtigte:r (≤ 3 Monate alt)',
      labelVi: 'Giấy đăng ký hộ khẩu của người bảo lãnh (không quá 3 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'wohnraumnachweis',
      label: 'Wohnraumnachweis: Mietvertrag + Nachweis ausreichender Wohnfläche (mind. 12 m² pro Person)',
      labelVi: 'Bằng chứng nhà ở: hợp đồng thuê + diện tích đủ (ít nhất 12 m² mỗi người)', // TODO: VI-review by native speaker
      description: 'Behörden prüfen Wohnfläche pro Person. Faustregel: mind. 12 m² pro Person neben Gemeinschaftsflächen.',
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'einkommensnachweis-stammberechtigter',
      label: 'Einkommensnachweis Stammberechtigte:r: letzte 3 Lohnabrechnungen + Arbeitsvertrag',
      labelVi: 'Bằng chứng thu nhập người bảo lãnh: 3 phiếu lương gần nhất + hợp đồng lao động', // TODO: VI-review by native speaker
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'krankenversicherung-antragsteller',
      label: 'Nachweis Krankenversicherung nachziehende Person (ggf. Reiseversicherung für Einreise)',
      labelVi: 'Bằng chứng bảo hiểm y tế người theo (có thể là bảo hiểm du lịch khi nhập cảnh)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'gesundheit',
    },
    {
      id: 'sprachzeugnis-a1',
      label: 'Sprachzertifikat A1 Deutsch (nachziehende Person) — z. B. Goethe-Institut "Start Deutsch 1"',
      labelVi: 'Chứng chỉ tiếng Đức A1 (người theo) — ví dụ Goethe-Institut "Start Deutsch 1"', // TODO: VI-review by native speaker
      description: 'Gem. § 30 Abs. 1 Nr. 2 AufenthG Grundvoraussetzung, sofern kein Ausnahmegrund vorliegt.',
      level: 'required',
      category: 'sprache',
      typicalIssues: [
        'Ausnahmen: Nicht-lateinisches Schriftsystem aus gesundheitlichen Gründen, Alter 67+, erkennbar keine Integration möglich',
        'Kursort muss im Ausland sein (Prüfung vor Visum)',
      ],
    },
    {
      id: 'biometrisches-lichtbild-antragsteller',
      label: 'Biometrisches Lichtbild (35 × 45 mm, ≤ 6 Monate alt)',
      labelVi: 'Ảnh sinh trắc học (35 × 45 mm, không quá 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'geburtsurkunden-kinder',
      label: 'Geburtsurkunden gemeinsamer Kinder (falls vorhanden) + beglaubigte Übersetzung',
      labelVi: 'Giấy khai sinh của các con chung (nếu có) + bản dịch công chứng', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur wenn gemeinsame minderjährige Kinder existieren, die im Antrag berücksichtigt werden sollen',
      category: 'familie',
    },
  ],
}

// ---------------------------------------------------------------------------
// 3. Familiennachzug Kind
// ---------------------------------------------------------------------------

const familiennachzugKind: MandatsartChecklist = {
  id: 'familiennachzug-kind',
  title: 'Familiennachzug Kind',
  titleVi: 'Đoàn tụ gia đình – con cái', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Nachzug eines minderjährigen Kindes zu einem oder beiden in Deutschland lebenden Elternteilen. Grundlage: § 32 AufenthG (Drittstaatsangehörige) oder § 28 AufenthG (ein Elternteil deutsch).',
  legalBasis: ['§ 32 AufenthG', '§ 28 AufenthG', '§ 29 AufenthG', '§ 5 AufenthG'],
  typicalDuration: '3–8 Monate',
  requiredDocuments: [
    {
      id: 'reisepass-kind',
      label: 'Reisepass des Kindes (Original + Kopie aller Stempelseiten, ≥ 6 Monate gültig)',
      labelVi: 'Hộ chiếu của trẻ (bản gốc + bản sao tất cả trang đóng dấu, còn hạn ≥ 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'geburtsurkunde-kind',
      label: 'Geburtsurkunde des Kindes mit Apostille/Legalisation + beglaubigte Übersetzung',
      labelVi: 'Giấy khai sinh của trẻ kèm Apostille/hợp pháp hóa + bản dịch công chứng', // TODO: VI-review by native speaker
      description: 'Ausländische Geburtsurkunden bedürfen der Apostille oder Legalisation.',
      level: 'required',
      category: 'familie',
      typicalIssues: [
        'Vietnamesische Urkunden: Legalisation statt Apostille (kein Haag-Mitglied)',
        'Übersetzung muss vereidigter Übersetzer erstellen',
      ],
    },
    {
      id: 'reisepasse-eltern',
      label: 'Reisepässe / Personalausweise beider Elternteile (Kopie)',
      labelVi: 'Hộ chiếu / CMND của cả hai cha mẹ (bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'aufenthaltstitel-elternteil',
      label: 'Aufenthaltstitel des/der in Deutschland lebenden Elternteils (Original + Kopie)',
      labelVi: 'Giấy phép cư trú của cha/mẹ đang sống ở Đức (bản gốc + bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
    },
    {
      id: 'sorgerechtserklarung',
      label: 'Sorgerechtserklärung oder Nachweis gemeinsames Sorgerecht (z. B. notarielle Erklärung)',
      labelVi: 'Xác nhận quyền giám hộ hoặc bằng chứng quyền nuôi con chung (ví dụ công chứng)', // TODO: VI-review by native speaker
      description: 'Wenn nur ein Elternteil in Deutschland lebt, muss das Sorgerecht und ggf. Zustimmung des anderen Elternteils nachgewiesen werden.',
      level: 'required',
      category: 'familie',
      typicalIssues: ['Zustimmung des ausländischen Elternteils ggf. notariell beglaubigt erforderlich'],
    },
    {
      id: 'einkommensnachweis-elternteil',
      label: 'Einkommensnachweis des in Deutschland lebenden Elternteils (letzte 3 Monate)',
      labelVi: 'Bằng chứng thu nhập của cha/mẹ ở Đức (3 tháng gần nhất)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'wohnraumnachweis',
      label: 'Wohnraumnachweis (Mietvertrag, ausreichende Wohnfläche für Kind)',
      labelVi: 'Bằng chứng nhà ở (hợp đồng thuê, diện tích đủ cho trẻ)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'krankenversicherung-kind',
      label: 'Krankenversicherungsnachweis für das Kind',
      labelVi: 'Bằng chứng bảo hiểm y tế cho trẻ', // TODO: VI-review by native speaker
      level: 'required',
      category: 'gesundheit',
    },
    {
      id: 'biometrisches-lichtbild-kind',
      label: 'Biometrisches Lichtbild des Kindes (35 × 45 mm, ≤ 6 Monate alt)',
      labelVi: 'Ảnh sinh trắc học của trẻ (35 × 45 mm, không quá 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (unterschrieben von sorgeberechtigtem Elternteil)',
      labelVi: 'Giấy ủy quyền luật sư (ký bởi người giám hộ hợp pháp)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'schulbescheinigung',
      label: 'Schulbescheinigung oder Nachweis Schulpflicht-Erfüllung (falls Kind schulpflichtig)',
      labelVi: 'Giấy xác nhận học sinh hoặc bằng chứng thực hiện nghĩa vụ học (nếu trẻ trong độ tuổi)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur wenn das Kind bereits schulpflichtig ist (≥ 6 Jahre)',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 4. Nationales Visum (für längere Aufenthalte aus Drittstaaten)
// ---------------------------------------------------------------------------

const visumsverfahrenNational: MandatsartChecklist = {
  id: 'visumsverfahren-national',
  title: 'Nationales Visum (Visum D — für Aufenthalte > 90 Tage)',
  titleVi: 'Thị thực quốc gia (Visa D — lưu trú trên 90 ngày)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Nationales Visum (Typ D) für Aufenthalte über 90 Tage aus Drittstaaten, z. B. zur Beschäftigung, zum Studium oder zum Familiennachzug. Antragstellung bei der Deutschen Botschaft im Herkunftsland.',
  legalBasis: ['§ 6 AufenthG', '§ 4 AufenthG', 'Art. 18 Visakodex', '§ 81 AufenthG'],
  typicalDuration: '4–12 Wochen (abhängig von Botschaft und Visumsart)',
  requiredDocuments: [
    {
      id: 'reisepass',
      label: 'Reisepass (Original, ≥ 12 Monate gültig über gewünschtes Einreisedatum, mind. 2 freie Seiten)',
      labelVi: 'Hộ chiếu (bản gốc, còn hạn ≥ 12 tháng sau ngày nhập cảnh, ít nhất 2 trang trống)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'antragsformular',
      label: 'Ausgefülltes Visumantragsformular (online über Terminbuchungsportal der Botschaft)',
      labelVi: 'Mẫu đơn xin visa đã điền đầy đủ (trực tuyến qua cổng đặt lịch của Đại sứ quán)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'biometrisches-lichtbild',
      label: 'Biometrisches Lichtbild (35 × 45 mm, ≤ 6 Monate alt, weißer Hintergrund)',
      labelVi: 'Ảnh sinh trắc học (35 × 45 mm, không quá 6 tháng, nền trắng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
    },
    {
      id: 'einladungsschreiben-arbeitgeber',
      label: 'Einladungsschreiben oder Zusage des deutschen Arbeitgebers (bei Visum zur Beschäftigung)',
      labelVi: 'Thư mời hoặc cam kết của nhà tuyển dụng Đức (với visa lao động)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur bei Visum zur Beschäftigung (§ 18 AufenthG)',
      category: 'einkommen',
    },
    {
      id: 'arbeitsvertrag',
      label: 'Unterschriebener Arbeitsvertrag (bei Visum zur Beschäftigung)',
      labelVi: 'Hợp đồng lao động đã ký (với visa lao động)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur bei Visum zur Beschäftigung',
      category: 'einkommen',
    },
    {
      id: 'zulassungsbescheid-hochschule',
      label: 'Zulassungsbescheid der deutschen Hochschule (bei Studentenvisum)',
      labelVi: 'Thư chấp nhận của trường đại học Đức (với visa sinh viên)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur bei Studentenvisum (§ 16 AufenthG)',
      category: 'sonstiges',
    },
    {
      id: 'finanzierungsnachweis',
      label: 'Nachweis Lebensunterhaltssicherung: Kontoauszüge (letzter 3 Monate) oder Sperrkonto-Bescheinigung',
      labelVi: 'Bằng chứng đảm bảo sinh hoạt phí: sao kê ngân hàng (3 tháng gần nhất) hoặc giấy xác nhận tài khoản ký quỹ', // TODO: VI-review by native speaker
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'krankenversicherung',
      label: 'Krankenversicherungsnachweis (Auslandsreisekrankenversicherung bis zur Anmeldung in DE)',
      labelVi: 'Bằng chứng bảo hiểm y tế (bảo hiểm du lịch đến khi đăng ký ở Đức)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'gesundheit',
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'heiratsurkunde-familiennachzug',
      label: 'Heiratsurkunde mit Apostille/Legalisation + beglaubigte Übersetzung (bei Familiennachzug)',
      labelVi: 'Giấy đăng ký kết hôn kèm Apostille/hợp pháp hóa + bản dịch công chứng (đoàn tụ gia đình)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur bei Familiennachzugs-Visum',
      category: 'familie',
    },
  ],
}

// ---------------------------------------------------------------------------
// 5. Einbürgerung
// ---------------------------------------------------------------------------

const einbuergerung: MandatsartChecklist = {
  id: 'einbuergerung',
  title: 'Einbürgerung (§§ 8–10 StAG)',
  titleVi: 'Nhập tịch Đức (§§ 8–10 StAG)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Erwerb der deutschen Staatsangehörigkeit nach § 10 StAG (Anspruchseinbürgerung nach 5 Jahren rechtmäßigem Aufenthalt) oder § 8 StAG (Ermessenseinbürgerung nach 8 Jahren). Seit 2024: Mehrstaatigkeit grundsätzlich zulässig.',
  legalBasis: ['§ 8 StAG', '§ 10 StAG', '§ 11 StAG', '§ 12 StAG'],
  typicalDuration: '12–24 Monate (abhängig von Einbürgerungsbehörde)',
  requiredDocuments: [
    {
      id: 'reisepass',
      label: 'Reisepass (Original + alle Kopien seit Einreise nach Deutschland)',
      labelVi: 'Hộ chiếu (bản gốc + tất cả bản sao từ khi nhập cảnh vào Đức)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
      typicalIssues: ['Alle abgelaufenen Reisepässe einreichen — Lücken werden kritisch geprüft'],
    },
    {
      id: 'aktueller-aufenthaltstitel',
      label: 'Aktueller Aufenthaltstitel (Original + Kopie)',
      labelVi: 'Giấy phép cư trú hiện tại (bản gốc + bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
    },
    {
      id: 'meldebescheinigung',
      label: 'Aktuelle Meldebescheinigung mit Einzugsdatum (≤ 3 Monate alt)',
      labelVi: 'Giấy đăng ký hộ khẩu hiện tại kèm ngày chuyển đến (không quá 3 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'geburtsurkunde',
      label: 'Geburtsurkunde (Original + beglaubigte Übersetzung, ggf. Apostille/Legalisation)',
      labelVi: 'Giấy khai sinh (bản gốc + bản dịch công chứng, nếu cần Apostille/hợp pháp hóa)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'einkommensnachweis',
      label: 'Einkommensnachweis: letzte 12 Monate Lohnabrechnungen oder Bescheid über Rentenhöhe',
      labelVi: 'Bằng chứng thu nhập: phiếu lương 12 tháng gần nhất hoặc thông báo mức lương hưu', // TODO: VI-review by native speaker
      description: 'Lebensunterhaltssicherung ohne Inanspruchnahme von Sozialleistungen ist Grundvoraussetzung.',
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'sprachnachweis-b1',
      label: 'Sprachzertifikat mind. B1 Deutsch (z. B. Goethe, telc, DTZ, oder Schulabschluss in DE)',
      labelVi: 'Chứng chỉ tiếng Đức tối thiểu B1 (Goethe, telc, DTZ, hoặc bằng tốt nghiệp ở Đức)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sprache',
    },
    {
      id: 'einbuergerungstest',
      label: 'Einbürgerungstest-Zertifikat (300 Fragen, Mindestpunktzahl 17/33, BAMF-autorisiert)',
      labelVi: 'Chứng chỉ kiểm tra nhập tịch (300 câu hỏi, điểm tối thiểu 17/33, được BAMF ủy quyền)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
      typicalIssues: ['Ausnahmen für Hochschulabsolventen möglich (§ 10 Abs. 7 StAG)'],
    },
    {
      id: 'strafregisterauszug',
      label: 'Führungszeugnis (Bundeszentralregister, Belegart O) — ≤ 3 Monate alt',
      labelVi: 'Lý lịch tư pháp (Bundeszentralregister, loại O) — không quá 3 tháng', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'bekenntnis-verfassungsordnung',
      label: 'Unterschriebenes Bekenntnis zur freiheitlichen demokratischen Grundordnung',
      labelVi: 'Cam kết đã ký về trật tự dân chủ tự do cơ bản', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'aufgabe-bisherige-staatsangehoerigkeit',
      label: 'Nachweis Aufgabe / Entlassung aus bisheriger Staatsangehörigkeit (falls keine Mehrstaatigkeit zulässig)',
      labelVi: 'Bằng chứng từ bỏ / thôi quốc tịch cũ (nếu không được phép đa quốc tịch)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur wenn Herkunftsstaat keine Mehrstaatigkeit akzeptiert UND kein Ausnahmetatbestand gem. § 12 StAG vorliegt. Seit der StAG-Reform 2024 ist Mehrstaatigkeit für die meisten Fälle zulässig.',
      category: 'identitaet',
    },
    {
      id: 'heiratsurkunde',
      label: 'Heiratsurkunde (bei Verheirateten, Original + beglaubigte Übersetzung)',
      labelVi: 'Giấy đăng ký kết hôn (đối với người đã kết hôn, bản gốc + bản dịch công chứng)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur wenn verheiratet',
      category: 'familie',
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 6. Niederlassungserlaubnis (§ 9 AufenthG)
// ---------------------------------------------------------------------------

const niederlassungserlaubnis: MandatsartChecklist = {
  id: 'niederlassungserlaubnis',
  title: 'Niederlassungserlaubnis (§ 9 AufenthG)',
  titleVi: 'Giấy phép cư trú vĩnh viễn (§ 9 AufenthG)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Unbefristeter Aufenthaltstitel nach mind. 5 Jahren rechtmäßigem Aufenthalt mit Aufenthaltserlaubnis. Voraussetzungen: gesicherter Lebensunterhalt, Rentenversicherungsbeiträge, Sprachkenntnisse B1, Wohnraum, keine erheblichen Vorstrafen.',
  legalBasis: ['§ 9 AufenthG', '§ 9a AufenthG', '§ 5 AufenthG', '§ 26 AufenthG'],
  typicalDuration: '4–8 Wochen',
  requiredDocuments: [
    {
      id: 'reisepass',
      label: 'Reisepass (Original + Kopie aller Stempelseiten, ≥ 6 Monate gültig)',
      labelVi: 'Hộ chiếu (bản gốc + bản sao tất cả trang đóng dấu, còn hạn ≥ 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'aktueller-aufenthaltstitel',
      label: 'Aktueller Aufenthaltstitel (Original + Kopie) — mind. 5 Jahre Aufenthalt nachweisbar',
      labelVi: 'Giấy phép cư trú hiện tại (bản gốc + bản sao) — chứng minh ≥ 5 năm cư trú', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
    },
    {
      id: 'meldebescheinigung',
      label: 'Aktuelle Meldebescheinigung (≤ 3 Monate alt)',
      labelVi: 'Giấy đăng ký hộ khẩu hiện tại (không quá 3 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'rentenversicherungsbescheid',
      label: 'Nachweis 60 Monate Pflichtbeiträge zur Rentenversicherung (Rentenauskunft der DRV)',
      labelVi: 'Bằng chứng đóng 60 tháng bảo hiểm hưu trí bắt buộc (xác nhận của DRV)', // TODO: VI-review by native speaker
      description: 'Pflichtbeitrags-Nachweis gem. § 9 Abs. 2 Nr. 3 AufenthG. Online abrufbar über www.deutsche-rentenversicherung.de.',
      level: 'required',
      category: 'einkommen',
      typicalIssues: ['Rentenauskunft dauert 2-3 Wochen — rechtzeitig beantragen'],
    },
    {
      id: 'einkommensnachweis',
      label: 'Einkommensnachweis: letzte 3 Lohnabrechnungen + Arbeitsvertrag (unbefristet bevorzugt)',
      labelVi: 'Bằng chứng thu nhập: 3 phiếu lương gần nhất + hợp đồng lao động (không kỳ hạn được ưu tiên)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'sprachzeugnis-b1',
      label: 'Sprachzertifikat mind. B1 Deutsch (Goethe, telc, DTZ, oder Schulabschluss in DE)',
      labelVi: 'Chứng chỉ tiếng Đức tối thiểu B1 (Goethe, telc, DTZ, hoặc bằng tốt nghiệp ở Đức)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sprache',
    },
    {
      id: 'wohnraumnachweis',
      label: 'Wohnraumnachweis: Mietvertrag + ausreichende Fläche für alle Haushaltsmitglieder',
      labelVi: 'Bằng chứng nhà ở: hợp đồng thuê + diện tích đủ cho tất cả thành viên hộ gia đình', // TODO: VI-review by native speaker
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'krankenversicherungsnachweis',
      label: 'Nachweis Krankenversicherung (gesetzlich oder privat)',
      labelVi: 'Bằng chứng bảo hiểm y tế (bảo hiểm pháp định hoặc tư nhân)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'gesundheit',
    },
    {
      id: 'biometrisches-lichtbild',
      label: 'Biometrisches Lichtbild (35 × 45 mm, ≤ 6 Monate alt)',
      labelVi: 'Ảnh sinh trắc học (35 × 45 mm, không quá 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'strafregisterauszug',
      label: 'Führungszeugnis (≤ 3 Monate alt) — bei Vorstrafen gesonderte Prüfung',
      labelVi: 'Lý lịch tư pháp (không quá 3 tháng) — nếu có tiền án sẽ được xem xét riêng', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 7. Chancenkarte (§ 20a AufenthG)
// ---------------------------------------------------------------------------

const chancenkarte: MandatsartChecklist = {
  id: 'chancenkarte',
  title: 'Chancenkarte zur Arbeitssuche (§ 20a AufenthG)',
  titleVi: 'Thẻ cơ hội tìm kiếm việc làm (§ 20a AufenthG)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Visum/Aufenthaltserlaubnis zur Arbeitssuche auf Basis eines Punktesystems (ab 2024). Voraussetzungen: Berufsqualifikation anerkannt oder vergleichbar mit deutschem Abschluss, Sprachkenntnisse A1/B2, mind. 1 Jahr Berufserfahrung.',
  legalBasis: ['§ 20a AufenthG', '§ 18 AufenthG', '§ 4 BeschV'],
  typicalDuration: '3–6 Wochen (Visum) + 1 Jahr Aufenthalt zur Suche',
  requiredDocuments: [
    {
      id: 'reisepass',
      label: 'Reisepass (Original, ≥ 12 Monate gültig über gewünschtes Einreisedatum)',
      labelVi: 'Hộ chiếu (bản gốc, còn hạn ≥ 12 tháng sau ngày nhập cảnh dự kiến)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'qualifikationsnachweis',
      label: 'Nachweis Berufsqualifikation: Hochschulabschluss oder anerkannte Berufsausbildung (Original + begl. Übersetzung)',
      labelVi: 'Bằng chứng trình độ chuyên môn: bằng đại học hoặc đào tạo nghề được công nhận (bản gốc + bản dịch công chứng)', // TODO: VI-review by native speaker
      description: 'Alternativ: Punkt-Nachweis für vergleichbare Qualifikation ohne formale Anerkennung.',
      level: 'required',
      category: 'sonstiges',
      typicalIssues: [
        'Anerkennung durch anabin.kmk.org oder ANABIN-Datenbank prüfen lassen',
        'Beglaubigte Übersetzung durch vereidigten Übersetzer erforderlich',
      ],
    },
    {
      id: 'berufserfahrungsnachweis',
      label: 'Nachweis Berufserfahrung: Arbeitszeugnisse, Referenzschreiben oder Rentenkontoauszug (mind. 1 Jahr)',
      labelVi: 'Bằng chứng kinh nghiệm làm việc: thư tham chiếu hoặc sao kê bảo hiểm hưu trí (tối thiểu 1 năm)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'sprachzeugnis',
      label: 'Sprachzertifikat Deutsch (mind. A1, B2 bringt Bonuspunkte) oder Englisch (mind. B2)',
      labelVi: 'Chứng chỉ ngôn ngữ: tiếng Đức tối thiểu A1, B2 được điểm thưởng; hoặc tiếng Anh tối thiểu B2', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sprache',
      typicalIssues: ['Ohne Sprachnachweis ist Antrag abzulehnen'],
    },
    {
      id: 'finanzierungsnachweis',
      label: 'Sperrkonto oder Nachweis Lebensunterhaltssicherung für mind. 12 Monate (ca. 1.027 €/Monat)',
      labelVi: 'Tài khoản ký quỹ hoặc bằng chứng đảm bảo sinh hoạt phí ít nhất 12 tháng (khoảng 1.027 €/tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'krankenversicherung',
      label: 'Reisekrankenversicherung für Einreise + Nachweis geplanter gesetzlicher KV',
      labelVi: 'Bảo hiểm y tế du lịch khi nhập cảnh + bằng chứng kế hoạch tham gia bảo hiểm y tế pháp định', // TODO: VI-review by native speaker
      level: 'required',
      category: 'gesundheit',
    },
    {
      id: 'biometrisches-lichtbild',
      label: 'Biometrisches Lichtbild (35 × 45 mm, ≤ 6 Monate alt)',
      labelVi: 'Ảnh sinh trắc học (35 × 45 mm, không quá 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'deutschlandbezug-bonuspunkt',
      label: 'Nachweis Deutschland-Bezug für Bonuspunkt: frühere Aufenthalte, DE-Verwandte, Bildungsaufenthalte',
      labelVi: 'Bằng chứng mối liên hệ với Đức để tính điểm thưởng: lưu trú trước đây, người thân ở Đức, học tập', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 8. Beschäftigungserlaubnis
// ---------------------------------------------------------------------------

const beschaeftigungserlaubnis: MandatsartChecklist = {
  id: 'beschaeftigungserlaubnis',
  title: 'Beschäftigungserlaubnis (§§ 18 ff. AufenthG)',
  titleVi: 'Giấy phép làm việc (§§ 18 ff. AufenthG)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Erteilung oder Nebenbestimmungs-Erweiterung der Arbeitsgenehmigung für Drittstaatsangehörige. Betrifft sowohl Erstanträge als auch Erweiterungen auf einen anderen Arbeitgeber oder eine andere Tätigkeit.',
  legalBasis: ['§ 18 AufenthG', '§ 18a AufenthG', '§ 18b AufenthG', '§ 39 AufenthG'],
  typicalDuration: '4–8 Wochen (mit BA-Zustimmung ggf. länger)',
  requiredDocuments: [
    {
      id: 'reisepass',
      label: 'Reisepass (Original + Kopie aller Stempelseiten)',
      labelVi: 'Hộ chiếu (bản gốc + bản sao tất cả trang đóng dấu)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'aktueller-aufenthaltstitel',
      label: 'Aktueller Aufenthaltstitel (Original + Kopie)',
      labelVi: 'Giấy phép cư trú hiện tại (bản gốc + bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
    },
    {
      id: 'arbeitsvertrag',
      label: 'Unterschriebener Arbeitsvertrag (oder konkretes Stellenangebot mit Vergütungsangabe)',
      labelVi: 'Hợp đồng lao động đã ký (hoặc đề nghị việc làm cụ thể có mức lương)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'einkommen',
      typicalIssues: ['Vergütung muss Mindestlohn gem. Entgeltregelungen der BA erreichen'],
    },
    {
      id: 'qualifikationsnachweis',
      label: 'Anerkannter Berufsabschluss oder Hochschulzeugnis (Original + beglaubigte Übersetzung)',
      labelVi: 'Bằng nghề được công nhận hoặc bằng đại học (bản gốc + bản dịch công chứng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'anerkennungsbescheid',
      label: 'Anerkennungsbescheid der zuständigen Stelle (IHK, HWK, Bezirksregierung)',
      labelVi: 'Quyết định công nhận của cơ quan có thẩm quyền (IHK, HWK, Bezirksregierung)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur bei reglementierten Berufen (Ärzte, Pflege, Handwerksmeister) — unbedingt prüfen lassen',
      category: 'sonstiges',
    },
    {
      id: 'meldebescheinigung',
      label: 'Aktuelle Meldebescheinigung (≤ 3 Monate alt)',
      labelVi: 'Giấy đăng ký hộ khẩu hiện tại (không quá 3 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'biometrisches-lichtbild',
      label: 'Biometrisches Lichtbild (35 × 45 mm, ≤ 6 Monate alt)',
      labelVi: 'Ảnh sinh trắc học (35 × 45 mm, không quá 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'sprachzeugnis',
      label: 'Sprachzeugnis (Niveau abhängig vom Beruf — mind. B1 für viele Positionen)',
      labelVi: 'Chứng chỉ ngôn ngữ (cấp độ phụ thuộc vào nghề — tối thiểu B1 với nhiều vị trí)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Abhängig vom Berufsfeld — bei Gesundheitsberufen und Erzieher:innen zwingend',
      category: 'sprache',
    },
  ],
}

// ---------------------------------------------------------------------------
// 9. Eilantrag gegen Abschiebung (§ 80 V VwGO)
// ---------------------------------------------------------------------------

const eilantragAbschiebung: MandatsartChecklist = {
  id: 'eilantrag-abschiebung',
  title: 'Eilantrag gegen Abschiebung (§ 80 Abs. 5 VwGO)',
  titleVi: 'Đơn khẩn cấp chống trục xuất (§ 80 Abs. 5 VwGO)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Gerichtlicher Eilantrag beim Verwaltungsgericht zur vorläufigen Aussetzung einer angeordneten Abschiebung. Extrem zeitkritisch — i.d.R. 24-48 Stunden Reaktionszeit nach Abschiebungsanordnung.',
  legalBasis: ['§ 80 Abs. 5 VwGO', '§ 59 AufenthG', '§ 60a AufenthG', '§ 34 AsylG'],
  typicalDuration: '24–72 Stunden für Entscheidung des VG im Eilverfahren',
  requiredDocuments: [
    {
      id: 'abschiebungsandrohung',
      label: 'Abschiebungsandrohung oder -anordnung (Original oder Kopie) — mit Zustellungsdatum',
      labelVi: 'Thông báo trục xuất hoặc lệnh trục xuất (bản gốc hoặc bản sao) — kèm ngày tống đạt', // TODO: VI-review by native speaker
      description: 'Das genaue Zustelldatum ist entscheidend für die Fristberechnung gem. §§ 187/188 BGB.',
      level: 'required',
      category: 'aufenthalt',
      typicalIssues: [
        'Zustellungsdatum muss exakt dokumentiert werden',
        'Frist oft 7 Tage ab Zustellung — sofort handeln',
      ],
    },
    {
      id: 'asyl-oder-aufenthaltsbescheid',
      label: 'Alle relevanten Bescheide (Asylbescheid, Aufenthalts-Ablehnungs-Bescheid) — chronologisch geordnet',
      labelVi: 'Tất cả các quyết định liên quan (quyết định tị nạn, quyết định từ chối cư trú) — theo thứ tự thời gian', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
    },
    {
      id: 'reisepass',
      label: 'Reisepass oder Passersatzdokument (falls vorhanden)',
      labelVi: 'Hộ chiếu hoặc tài liệu thay thế hộ chiếu (nếu có)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'aufenthaltsgestattung-duldung',
      label: 'Aufenthaltsgestattung oder Duldung (aktuelle + alle vergangenen)',
      labelVi: 'Giấy phép tạm trú hoặc giấy khoan hồng (hiện tại + tất cả trước đây)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
    },
    {
      id: 'vollmacht-unterzeichnet',
      label: 'Anwaltsvollmacht (sofort unterschrieben — Eilantrag kann erst nach Vollmacht gestellt werden)',
      labelVi: 'Giấy ủy quyền luật sư (ký ngay — đơn khẩn chỉ nộp được sau khi có ủy quyền)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'abschiebungshindernis-belege',
      label: 'Belege für Abschiebungshindernisse: Gesundheitszeugnisse, familiäre Bindungen, Integration, Schutzbedarf',
      labelVi: 'Bằng chứng về trở ngại trục xuất: giấy y tế, quan hệ gia đình, hội nhập, nhu cầu bảo vệ', // TODO: VI-review by native speaker
      description: 'Je spezifischer die Belege, desto höher die Erfolgschance im Eilverfahren.',
      level: 'required',
      category: 'sonstiges',
      typicalIssues: [
        'Arztbriefe müssen aktuell sein (≤ 3 Monate)',
        'Schul- oder Ausbildungsnachweise der Kinder wirken als Integrationsnachweis',
      ],
    },
    {
      id: 'gefahrenlage-herkunftsland',
      label: 'Herkunftsland-Lageberichte oder Individualbelege (UNHCR, Auswärtiges Amt, Menschenrechtsorg.)',
      labelVi: 'Báo cáo tình hình nước gốc hoặc bằng chứng cá nhân (UNHCR, Bộ Ngoại giao Đức, tổ chức nhân quyền)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur wenn Schutzgründe nach § 60 AufenthG oder AsylG geltend gemacht werden',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 10. Untätigkeitsklage (§ 75 VwGO)
// ---------------------------------------------------------------------------

const untaetigkeitsklage: MandatsartChecklist = {
  id: 'untaetigkeitsklage',
  title: 'Untätigkeitsklage (§ 75 VwGO)',
  titleVi: 'Khiếu kiện vì không hành động (§ 75 VwGO)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Verwaltungsklage, wenn Behörde über Antrag oder Widerspruch nicht binnen angemessener Frist (i.d.R. 3 Monate) entschieden hat. Zwingt Behörde zur Bescheidung.',
  legalBasis: ['§ 75 VwGO', '§ 42 VwGO', '§ 68 VwGO', '§ 74 VwGO'],
  typicalDuration: '6–18 Monate (Verwaltungsgericht)',
  requiredDocuments: [
    {
      id: 'urspruenglicher-antrag',
      label: 'Kopie des ursprünglichen Antrags an die Behörde (mit Eingangsbestätigung oder Posteingangsstempel)',
      labelVi: 'Bản sao đơn xin ban đầu gửi cơ quan (kèm xác nhận nhận đơn hoặc dấu nhận văn thư)', // TODO: VI-review by native speaker
      description: 'Belegt, dass ein Antrag gestellt wurde, über den die Behörde nicht entschieden hat.',
      level: 'required',
      category: 'sonstiges',
      typicalIssues: ['Ohne Eingangsbestätigung ist Eingang oft streitig — immer Einschreiben nutzen'],
    },
    {
      id: 'widerspruchseinlegung',
      label: 'Widerspruchsschreiben (falls bereits Widerspruch eingelegt, mit Eingangsbestätigung)',
      labelVi: 'Văn bản khiếu nại (nếu đã khiếu nại, kèm xác nhận nhận)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur wenn bereits Widerspruch eingelegt wurde und darüber nicht entschieden wurde',
      category: 'sonstiges',
    },
    {
      id: 'behoerdliche-korrespondenz',
      label: 'Gesamte Korrespondenz mit der Behörde (alle Schreiben chronologisch)',
      labelVi: 'Toàn bộ thư từ với cơ quan (tất cả thư theo thứ tự thời gian)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'reisepass',
      label: 'Reisepass oder Personalausweis (Kopie)',
      labelVi: 'Hộ chiếu hoặc CMND (bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'aktueller-aufenthaltstitel',
      label: 'Aktueller Aufenthaltstitel oder Fiktionsbescheinigung (Kopie)',
      labelVi: 'Giấy phép cư trú hiện tại hoặc giấy xác nhận theo quy định (bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
    },
    {
      id: 'antragsdatum-frist',
      label: 'Nachweis Antragsdatum und Berechnung der 3-Monatsfrist (Kalenderblatt oder Timeline)',
      labelVi: 'Bằng chứng ngày nộp đơn và tính thời hạn 3 tháng (lịch hoặc dòng thời gian)', // TODO: VI-review by native speaker
      description: 'Klage erst zulässig, wenn 3 Monate verstrichen UND zureichender Grund fehlt (§ 75 VwGO).',
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'sachverhaltsdarstellung',
      label: 'Schriftliche Sachverhaltsdarstellung durch Mandant:in (eigene Schilderung des Ablaufs)',
      labelVi: 'Trình bày tình huống bằng văn bản của thân chủ (mô tả diễn biến theo lời thân chủ)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 11. Härtefallantrag (§ 23a AufenthG)
// ---------------------------------------------------------------------------

const haertefall: MandatsartChecklist = {
  id: 'haertefall',
  title: 'Härtefallantrag (§ 23a AufenthG)',
  titleVi: 'Đơn xin xem xét trường hợp đặc biệt (§ 23a AufenthG)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Antrag an die Härtefallkommission des Bundeslandes, eine Aufenthaltserlaubnis in atypischen, besonders gelagerten Einzelfällen zu erteilen, obwohl die gesetzlichen Voraussetzungen nicht erfüllt sind. Auslese-Verfahren mit hohem Ermessensspielraum.',
  legalBasis: ['§ 23a AufenthG', '§ 60a AufenthG', 'Landesgesetze über Härtefallkommissionen'],
  typicalDuration: '3–12 Monate (Härtefallkommission + Ausländerbehörde)',
  requiredDocuments: [
    {
      id: 'reisepass',
      label: 'Reisepass oder Passersatzdokument (Original + Kopie)',
      labelVi: 'Hộ chiếu hoặc tài liệu thay thế hộ chiếu (bản gốc + bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'aufenthalts-und-duldungshistorie',
      label: 'Vollständige Aufenthalts- und Duldungshistorie (chronologisch, alle Bescheide)',
      labelVi: 'Lịch sử cư trú và khoan hồng đầy đủ (theo thứ tự thời gian, tất cả các quyết định)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
      typicalIssues: ['Lücken in der Aufenthaltshistorie wirken negativ — vollständige Dokumentation entscheidend'],
    },
    {
      id: 'haertegrundschilderung',
      label: 'Ausführliche persönliche Schilderung der Härtegründe (DE, rechtlich ausformuliert durch Anwält:in)',
      labelVi: 'Mô tả chi tiết cá nhân về các lý do hoàn cảnh khó khăn (tiếng Đức, được luật sư diễn đạt pháp lý)', // TODO: VI-review by native speaker
      description: 'Das Herzstück des Antrags. Die Anwält:in arbeitet den Sachverhalt nach § 23a AufenthG-Kriterien aus.',
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'integrationsbelege',
      label: 'Integrationsbelege: Schul- / Ausbildungs-Zeugnisse, Sprachzertifikate, Vereinsmitgliedschaften, Arbeit',
      labelVi: 'Bằng chứng hội nhập: bảng điểm trường/đào tạo nghề, chứng chỉ ngôn ngữ, câu lạc bộ, việc làm', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'soziale-einbindung',
      label: 'Nachweise sozialer Einbindung: Referenzschreiben (Arbeitgeber, Verein, Kirchengemeinde, Nachbarn)',
      labelVi: 'Bằng chứng gắn kết xã hội: thư giới thiệu (chủ lao động, hội đoàn, giáo xứ, hàng xóm)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'kindergeschichte',
      label: 'Unterlagen über in Deutschland geborene oder aufgewachsene Kinder (Geburtsurkunden, Schul-/Kita-Belege)',
      labelVi: 'Tài liệu về trẻ sinh ra hoặc lớn lên ở Đức (giấy khai sinh, chứng nhận trường/nhà trẻ)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur wenn Kinder in Deutschland geboren wurden oder hier aufgewachsen sind — starkes Härtefall-Kriterium',
      category: 'familie',
    },
    {
      id: 'gesundheitliche-haertegrundschilderung',
      label: 'Ärztliche Atteste / Gutachten bei gesundheitlichen Härtegründen (Original + ggf. Fachgutachten)',
      labelVi: 'Giấy khám hoặc giám định y tế với lý do sức khỏe (bản gốc + giám định chuyên khoa nếu cần)', // TODO: VI-review by native speaker
      level: 'conditional',
      conditionalNote: 'Nur wenn gesundheitliche Härtegründe geltend gemacht werden',
      category: 'gesundheit',
    },
    {
      id: 'voranfrage-haertefallkommission',
      label: 'Voranfrage-Schreiben an Härtefallkommission (durch Anwält:in formuliert)',
      labelVi: 'Thư hỏi trước gửi Ủy ban hoàn cảnh khó khăn (do luật sư soạn thảo)', // TODO: VI-review by native speaker
      description: 'Manche Landeskommissionen erwarten eine informelle Voranfrage vor offiziellem Antrag.',
      level: 'conditional',
      conditionalNote: 'Abhängig von Bundesland — bei Bayern, NRW, Baden-Württemberg üblich',
      category: 'sonstiges',
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 12. Aufenthaltstitel-Verlängerung (Bao-pilot validated set, 6-Monats-Einkommen)
// ---------------------------------------------------------------------------
// Note: differs from #1 (aufenthaltstitel-verlaengerung) in document scope:
// 6-month income window, explicit Steuer-ID, A1/B1 as optional rather than conditional.

const aufenthaltVerlaengerung: MandatsartChecklist = {
  id: 'aufenthalt_verlaengerung',
  title: 'Aufenthaltstitel-Verlängerung',
  titleVi: 'Gia hạn giấy phép cư trú', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Verlängerung eines bestehenden Aufenthaltstitels vor Ablauf der Gültigkeitsdauer (§ 8 AufenthG). Checkliste für Bao-Pilot: deckt den vollständigen Dokumentensatz inklusive 6-Monats-Einkommensnachweise ab.',
  legalBasis: ['§ 8 AufenthG', '§ 81 AufenthG', '§ 5 AufenthG', '§ 26 AufenthG'],
  typicalDuration: '6–12 Wochen',
  requiredDocuments: [
    {
      id: 'reisepass',
      label: 'Gültiger Reisepass (Original + Kopie aller Stempelseiten, ≥ 6 Monate gültig)',
      labelVi: 'Hộ chiếu còn hiệu lực (bản gốc + bản sao tất cả trang đóng dấu, còn hạn ≥ 6 tháng)', // TODO: VI-review by native speaker
      description: 'Alle bestempelten Seiten müssen farbig kopiert werden.',
      level: 'required',
      category: 'identitaet',
      typicalIssues: [
        'Ablichtung muss farbig sein',
        'Reisepass mit weniger als 6 Monaten Restlaufzeit wird oft abgelehnt',
      ],
    },
    {
      id: 'alter_aufenthaltstitel',
      label: 'Alter Aufenthaltstitel (Original + Kopie Vorder- und Rückseite)',
      labelVi: 'Giấy phép cư trú cũ (bản gốc + bản sao cả hai mặt)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
      typicalIssues: ['Gültigkeitsdatum prüfen — Antrag muss vor Ablauf gestellt werden'],
    },
    {
      id: 'biometrisches_lichtbild',
      label: 'Biometrisches Passfoto (35 × 45 mm, ≤ 6 Monate alt, weißer Hintergrund)',
      labelVi: 'Ảnh sinh trắc học (35 × 45 mm, không quá 6 tháng, nền trắng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
      typicalIssues: ['Druck auf Fotopapier, kein Normalpapier-Ausdruck'],
    },
    {
      id: 'krankenversicherungsnachweis',
      label: 'Nachweis Krankenversicherung (Versicherungskarte oder Bescheinigung)',
      labelVi: 'Bằng chứng bảo hiểm y tế (thẻ bảo hiểm hoặc giấy chứng nhận)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'gesundheit',
    },
    {
      id: 'meldebescheinigung',
      label: 'Aktuelle Meldebescheinigung (≤ 3 Monate alt)',
      labelVi: 'Giấy xác nhận đăng ký hộ khẩu (không quá 3 tháng)', // TODO: VI-review by native speaker
      description: 'Amtliche Bestätigung der Wohnadresse vom Einwohnermeldeamt. Maximales Alter: 3 Monate.',
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'einkommensnachweise_6_monate',
      label: 'Einkommensnachweise letzte 6 Monate (Lohnabrechnungen oder Bescheid)',
      labelVi: 'Bằng chứng thu nhập 6 tháng gần nhất (phiếu lương hoặc quyết định)', // TODO: VI-review by native speaker
      description: 'Sicherung des Lebensunterhalts gem. § 5 Abs. 1 Nr. 1 AufenthG. Sechs Monate werden für Verlängerung erwartet.',
      level: 'required',
      category: 'einkommen',
      typicalIssues: ['Minijob reicht oft nicht für Lebensunterhaltssicherung', 'Selbstständige: Steuerbescheid letzter 2 Jahre'],
    },
    {
      id: 'mietvertrag',
      label: 'Aktueller Mietvertrag',
      labelVi: 'Hợp đồng thuê nhà hiện tại', // TODO: VI-review by native speaker
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'sprachzertifikat_a1_b1',
      label: 'Sprachzertifikat A1 oder B1 Deutsch (z. B. Goethe, telc)',
      labelVi: 'Chứng chỉ tiếng Đức A1 hoặc B1 (ví dụ Goethe, telc)', // TODO: VI-review by native speaker
      description: 'Erforderlich, wenn der Aufenthaltstitel oder die angestrebte Kategorie einen Sprachnachweis voraussetzt.',
      level: 'optional',
      category: 'sprache',
    },
    {
      id: 'integrationskursnachweis',
      label: 'Integrationskursnachweis (Teilnahme- oder Abschlussbestätigung)',
      labelVi: 'Bằng chứng khóa hội nhập (xác nhận tham gia hoặc hoàn thành)', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'sprache',
    },
    {
      id: 'steuer_id_bescheinigung',
      label: 'Steuer-ID-Bescheinigung (Schreiben des Bundeszentralamts für Steuern)',
      labelVi: 'Giấy chứng nhận mã số thuế (thư từ Cơ quan thuế liên bang)', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 13. Familiennachzug Ehegatten (Bao-pilot validated set)
// ---------------------------------------------------------------------------
// Note: differs from #2 (familiennachzug-ehegatte) in document scope:
// Heiratsbestätigung Standesamt DE as required (when applicable),
// Härtefall-Sprachbefreiung as optional (validate with Bao: conditional?).

const familiennachzugEhegatten: MandatsartChecklist = {
  id: 'familiennachzug_ehegatten',
  title: 'Familiennachzug Ehegatten',
  titleVi: 'Đoàn tụ gia đình – vợ/chồng (đầy đủ)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Nachzug eines Ehegatten zu einem in Deutschland lebenden Stammberechtigten (§ 30 AufenthG). Beinhaltet vollständigen Dokumentensatz für Visumverfahren und anschließende Aufenthaltserlaubnis.',
  legalBasis: ['§ 27 AufenthG', '§ 30 AufenthG', '§ 5 AufenthG', '§ 29 AufenthG'],
  typicalDuration: '3–6 Monate (Visumverfahren + Aufenthaltserlaubnis)',
  requiredDocuments: [
    {
      id: 'reisepass_nachziehend',
      label: 'Reisepass des nachziehenden Partners (Original + Kopie aller Stempelseiten, ≥ 6 Monate gültig)',
      labelVi: 'Hộ chiếu người theo (bản gốc + bản sao tất cả trang đóng dấu, còn hạn ≥ 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'heiratsurkunde_apostille',
      label: 'Eheurkunde mit Apostille oder Legalisation + Übersetzung durch vereidigten Übersetzer',
      labelVi: 'Giấy đăng ký kết hôn kèm Apostille hoặc hợp pháp hóa + bản dịch công chứng', // TODO: VI-review by native speaker
      description: 'Ausländische Eheurkunden benötigen Apostille (Haager Abkommen) oder Legalisation. Vietnamesische Dokumente benötigen Legalisation (kein Apostille-Mitglied).',
      level: 'required',
      category: 'familie',
      typicalIssues: [
        'Vietnamesische Urkunden: Legalisation durch Deutsche Botschaft Hanoi/HCMC',
        'Übersetzung muss vereidigter Übersetzer erstellen',
        'Originalurkunde muss vorgelegt werden',
      ],
    },
    {
      id: 'sprachzeugnis_a1_nachziehend',
      label: 'A1-Sprachzertifikat des nachziehenden Partners (Deutsch, z. B. Goethe "Start Deutsch 1")',
      labelVi: 'Chứng chỉ tiếng Đức A1 của người theo (ví dụ Goethe "Start Deutsch 1")', // TODO: VI-review by native speaker
      description: 'Gem. § 30 Abs. 1 Nr. 2 AufenthG Grundvoraussetzung, sofern kein Ausnahmegrund vorliegt.',
      level: 'required',
      category: 'sprache',
      typicalIssues: [
        'Ausnahmen: Höheres Alter (67+), gesundheitliche Hinderungsgründe, nachweislich unmöglich',
        'Prüfung muss vor Visumsantrag abgeschlossen sein',
      ],
    },
    {
      id: 'wohnraumnachweis',
      label: 'Nachweis ausreichender Wohnraum: Mietvertrag + Wohnflächenberechnung',
      labelVi: 'Bằng chứng nhà ở đủ tiêu chuẩn: hợp đồng thuê + tính diện tích', // TODO: VI-review by native speaker
      description: 'Faustregel der Behörden: mind. 12 m² pro Person (Wohn-/Schlafzimmer, ohne Küche/Bad).',
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'einkommensnachweise_stammberechtigter_6m',
      label: 'Einkommensnachweise des Stammberechtigten letzte 6 Monate (Lohnabrechnungen + Arbeitsvertrag)',
      labelVi: 'Bằng chứng thu nhập người bảo lãnh 6 tháng gần nhất (phiếu lương + hợp đồng lao động)', // TODO: VI-review by native speaker
      description: 'Lebensunterhaltssicherung gem. § 5 Abs. 1 Nr. 1 AufenthG für beide Personen.',
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'krankenversicherung',
      label: 'Nachweis Krankenversicherung (für nachziehenden Partner)',
      labelVi: 'Bằng chứng bảo hiểm y tế (cho người theo)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'gesundheit',
    },
    {
      id: 'biometrisches_lichtbild',
      label: 'Biometrisches Passfoto nachziehender Partner (35 × 45 mm, ≤ 6 Monate alt)',
      labelVi: 'Ảnh sinh trắc học người theo (35 × 45 mm, không quá 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
    },
    {
      id: 'aufenthaltstitel_stammberechtigter',
      label: 'Aufenthaltstitel des Stammberechtigten (Original + Kopie)',
      labelVi: 'Giấy phép cư trú của người bảo lãnh (bản gốc + bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
      typicalIssues: ['Bei deutschen Stammberechtigten entfällt dieser Nachweis'],
    },
    {
      id: 'heiratsbestaetigung_standesamt',
      label: 'Heiratsbestätigung Standesamt Deutschland (wenn Eheschließung in DE erfolgt)',
      labelVi: 'Xác nhận kết hôn của cơ quan hộ tịch Đức (nếu kết hôn ở Đức)', // TODO: VI-review by native speaker
      description: 'Nur erforderlich, wenn die Ehe in Deutschland geschlossen wurde. Steht neben der ausländischen Eheurkunde.',
      level: 'required',
      category: 'familie',
      typicalIssues: ['Entfällt, wenn Eheschließung im Ausland stattgefunden hat'],
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'haertefall_begruendung',
      label: 'Härtefall-Begründung (Antrag auf Befreiung vom Sprachnachweis gem. § 30 Abs. 1 S. 3 AufenthG)',
      labelVi: 'Lý do trường hợp khó khăn đặc biệt (miễn chứng chỉ ngôn ngữ, § 30 Abs. 1 S. 3 AufenthG)', // TODO: VI-review by native speaker
      description: 'Gilt z. B. bei Analphabetismus, schwerer Krankheit oder wenn Erwerb objektiv nicht möglich ist.',
      level: 'optional',
      category: 'sonstiges',
    },
    {
      id: 'geburtsurkunde_gemeinsames_kind',
      label: 'Geburtsurkunde gemeinsames Kind (Original + Apostille/Legalisation + Übersetzung)',
      labelVi: 'Giấy khai sinh con chung (bản gốc + Apostille/hợp pháp hóa + bản dịch)', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'familie',
    },
  ],
}

// ---------------------------------------------------------------------------
// 14. Strafbefehl-Einspruch nach § 410 StPO
// ---------------------------------------------------------------------------

const strafbefehlEinspruch: MandatsartChecklist = {
  id: 'strafbefehl_einspruch',
  title: 'Strafbefehl-Einspruch (§ 410 StPO)',
  titleVi: 'Kháng nghị lệnh xử phạt hình sự (§ 410 StPO)', // TODO: VI-review by native speaker
  category: 'strafrecht',
  description:
    'Einspruch gegen einen Strafbefehl gem. § 410 StPO. Frist: 2 Wochen ab Zustellung. Bearbeitung für Bao als Strafverteidiger — häufig bei Mandantschaft mit Migrationshintergrund wegen Sprachbarriere verpasst.',
  legalBasis: ['§ 407 StPO', '§ 410 StPO', '§ 147 StPO', '§ 185 GVG'],
  typicalDuration: '2–6 Monate (Hauptverhandlung nach Einspruch)',
  requiredDocuments: [
    {
      id: 'strafbefehl_original',
      label: 'Strafbefehl-Original mit verzeichnetem Zustellungsdatum',
      labelVi: 'Lệnh xử phạt hình sự gốc kèm ngày tống đạt', // TODO: VI-review by native speaker
      description: 'Das Zustellungsdatum ist maßgeblich für die 2-Wochen-Einspruchsfrist gem. § 410 Abs. 1 StPO. Ohne Datum kann die Frist nicht berechnet werden.',
      level: 'required',
      category: 'sonstiges',
      typicalIssues: [
        'Zustellungsdatum auf dem Umschlag dokumentieren (Briefkasten-Zustellung)',
        'Bei Zustellung durch die Post: Datum auf dem gelben Einschreiben-Beleg',
        'Fristversäumnis prüfen — ggf. Wiedereinsetzungsantrag nach § 44 StPO',
      ],
    },
    {
      id: 'personalausweis_mandant',
      label: 'Personalausweis oder Reisepass des Mandanten (Kopie)',
      labelVi: 'CMND hoặc hộ chiếu của thân chủ (bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'vollmacht_akteneinsicht',
      label: 'Anwaltsvollmacht für Akteneinsicht (§ 147 StPO, Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư để xem hồ sơ (§ 147 StPO, bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      description: 'Berechtigt zur Einsicht in die Ermittlungsakte bei Staatsanwaltschaft oder Gericht vor der Verhandlung.',
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'sachverhaltsschilderung',
      label: 'Sachverhaltsschilderung des Mandanten (schriftlich, datiert)',
      labelVi: 'Tường trình của thân chủ về sự việc (bằng văn bản, có ngày)', // TODO: VI-review by native speaker
      description: 'Eigene Darstellung des Mandanten zum Vorwurf — Grundlage für Verteidigungsstrategie und ggf. Widerspruch zur Anklageschrift.',
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'zeugenkontakte',
      label: 'Zeugen-Kontaktdaten (Name, Anschrift, ggf. Telefon)',
      labelVi: 'Thông tin liên lạc nhân chứng (tên, địa chỉ, điện thoại nếu có)', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'sonstiges',
    },
    {
      id: 'beweismittel',
      label: 'Beweismittel (Fotos, Screenshots, Nachrichten, Dokumente)',
      labelVi: 'Bằng chứng (ảnh, ảnh chụp màn hình, tin nhắn, tài liệu)', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'sonstiges',
      acceptedFormats: ['pdf', 'jpg', 'png', 'mp4', 'docx'],
    },
    {
      id: 'fruehere_strafbefehle',
      label: 'Frühere Strafbefehle oder laufende Verfahren (soweit bekannt)',
      labelVi: 'Lệnh xử phạt cũ hoặc các vụ án đang xử lý (nếu có)', // TODO: VI-review by native speaker
      description: 'Relevant für Strafzumessung und Einschätzung der Wiederholungsgefahr.',
      level: 'optional',
      category: 'sonstiges',
    },
    {
      id: 'dolmetscher_bestaetigung',
      label: 'Bestätigung Dolmetscher-Einsatz bei polizeilicher Vernehmung (falls zutreffend)',
      labelVi: 'Xác nhận sử dụng phiên dịch trong buổi hỏi cung (nếu có)', // TODO: VI-review by native speaker
      description: 'Relevant, wenn der Mandant bei Vernehmung oder Zustellung keinen Dolmetscher hatte — möglicher Verfahrensfehler.',
      level: 'optional',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 15. Schengen-Kurzaufenthaltsvisum (§ 6 AufenthG)
// ---------------------------------------------------------------------------

const visumKurzaufenthalt: MandatsartChecklist = {
  id: 'visum_kurzaufenthalt',
  title: 'Schengen-Visum / Besuchervisum (max. 90 Tage)',
  titleVi: 'Thị thực Schengen / thị thực thăm viếng (tối đa 90 ngày)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Schengen-Kurzaufenthaltsvisum (Typ C) für Aufenthalte bis zu 90 Tagen innerhalb von 180 Tagen. Typisch für Familienbesuche, Touristenreisen oder kurze Geschäftsreisen. Antrag bei der Deutschen Botschaft im Heimatland.',
  legalBasis: ['§ 6 AufenthG', 'Art. 2 ff. Visakodex (EG) 810/2009', 'Anhang I Visakodex'],
  typicalDuration: '2–4 Wochen (Botschaftsbearbeitung)',
  requiredDocuments: [
    {
      id: 'antragsformular',
      label: 'Ausgefülltes Visumantragsformular (Schengen-Formular, unterschrieben)',
      labelVi: 'Mẫu đơn xin thị thực đã điền và ký (mẫu Schengen)', // TODO: VI-review by native speaker
      description: 'Das Formular ist über das Online-Terminportal der Deutschen Botschaft abrufbar und muss vollständig ausgefüllt und handschriftlich unterschrieben werden.',
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'reisepass',
      label: 'Reisepass (Original, ≥ 6 Monate gültig nach geplantem Abreisedatum, mind. 2 freie Seiten)',
      labelVi: 'Hộ chiếu (bản gốc, còn hạn ≥ 6 tháng sau ngày dự kiến rời đi, ít nhất 2 trang trống)', // TODO: VI-review by native speaker
      description: 'Der Reisepass muss noch mindestens 3 Monate nach Ende des geplanten Aufenthalts gültig sein — viele Botschaften prüfen 6 Monate.',
      level: 'required',
      category: 'identitaet',
      typicalIssues: [
        'Ältere Reisepässe ohne Chip werden von manchen Botschaften nicht mehr akzeptiert',
        'Reisepass muss mind. 2 leere Seiten für Visa-Stempel haben',
      ],
    },
    {
      id: 'biometrisches_lichtbild',
      label: 'Biometrisches Lichtbild (35 × 45 mm, ≤ 6 Monate alt, weißer Hintergrund)',
      labelVi: 'Ảnh sinh trắc học (35 × 45 mm, không quá 6 tháng, nền trắng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
      typicalIssues: ['Druck muss auf Fotopapier sein, kein Ausdruck auf Normalpapier'],
    },
    {
      id: 'reisekrankenversicherung',
      label: 'Auslandsreisekrankenversicherung (mind. 30.000 € Deckung, für gesamten Schengen-Raum)',
      labelVi: 'Bảo hiểm y tế du lịch quốc tế (tối thiểu 30.000 €, bao phủ toàn khu vực Schengen)', // TODO: VI-review by native speaker
      description: 'Pflichtvoraussetzung gem. Art. 15 Visakodex. Die Police muss den gesamten geplanten Aufenthaltszeitraum abdecken.',
      level: 'required',
      category: 'gesundheit',
      typicalIssues: ['Deckungssumme muss explizit ≥ 30.000 € ausgewiesen sein'],
    },
    {
      id: 'finanzierungsnachweis',
      label: 'Finanzierungsnachweis: Kontoauszüge letzter 3 Monate oder Verpflichtungserklärung des Einladers',
      labelVi: 'Bằng chứng tài chính: sao kê ngân hàng 3 tháng gần nhất hoặc cam kết tài chính của người mời', // TODO: VI-review by native speaker
      description: 'Nachweis ausreichender Mittel für Reise und Aufenthalt. Faustregel: ca. 45 €/Tag in Deutschland. Alternativ: Verpflichtungserklärung gem. § 68 AufenthG vom Einlader.',
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'unterkunftsnachweis',
      label: 'Unterkunftsnachweis: Hotelbuchung oder Bestätigung der Gastfamilie',
      labelVi: 'Bằng chứng chỗ ở: đặt phòng khách sạn hoặc xác nhận của gia đình tiếp đón', // TODO: VI-review by native speaker
      description: 'Nachweis, wo der Antragsteller während des Aufenthalts wohnen wird.',
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'hin_und_rueckflug',
      label: 'Hin- und Rückflugbuchung (Bestätigung, noch kein gebuchtes Ticket erforderlich)',
      labelVi: 'Đặt vé khứ hồi (xác nhận đặt chỗ, chưa cần mua vé)', // TODO: VI-review by native speaker
      description: 'Die Buchungsbestätigung (ohne vollständige Zahlung) reicht i.d.R. aus. Sie belegt die Rückreiseabsicht.',
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'einladungsschreiben',
      label: 'Einladungsschreiben von Verwandten oder Geschäftspartner:in in Deutschland',
      labelVi: 'Thư mời từ người thân hoặc đối tác kinh doanh ở Đức', // TODO: VI-review by native speaker
      description: 'Das Schreiben sollte Zweck, Dauer und finanzielle Übernahme des Besuchs bestätigen. Für Familienbesuche empfohlen, für Geschäftsreisen oft verlangt.',
      level: 'optional',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 16. Verpflichtungserklärung (§ 68 AufenthG)
// ---------------------------------------------------------------------------

const verpflichtungserklaerung: MandatsartChecklist = {
  id: 'verpflichtungserklaerung',
  title: 'Verpflichtungserklärung (§ 68 AufenthG)',
  titleVi: 'Cam kết tài chính cho người nhập cảnh (§ 68 AufenthG)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Formelle Erklärung einer in Deutschland lebenden Person (Einlader), alle Kosten des Aufenthalts und der Rückreise des Eingeladenen zu übernehmen. Wird von der Ausländerbehörde ausgestellt und ist Visumvoraussetzung für Kurzaufenthalte.',
  legalBasis: ['§ 68 AufenthG', '§ 6 AufenthG', '§ 66 AufenthG'],
  typicalDuration: '1–3 Wochen (Ausländerbehörde)',
  requiredDocuments: [
    {
      id: 'personalausweis_verpflichteter',
      label: 'Personalausweis oder Reisepass des/der Verpflichteten (Original)',
      labelVi: 'CMND hoặc hộ chiếu của người cam kết (bản gốc)', // TODO: VI-review by native speaker
      description: 'Die Ausländerbehörde prüft die Identität und den Aufenthaltsstatus der verpflichtenden Person.',
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'einkommensnachweise_verpflichteter',
      label: 'Einkommensnachweise des/der Verpflichteten: letzte 6 Monate (Lohnabrechnungen oder Steuerbescheid)',
      labelVi: 'Bằng chứng thu nhập của người cam kết: 6 tháng gần nhất (phiếu lương hoặc quyết định thuế)', // TODO: VI-review by native speaker
      description: 'Die Behörde prüft, ob der Einlader finanziell in der Lage ist, Kosten vollständig zu übernehmen.',
      level: 'required',
      category: 'einkommen',
      typicalIssues: ['Selbstständige: Steuerbescheid der letzten 2 Jahre einreichen'],
    },
    {
      id: 'mietvertrag_wohnflaeche',
      label: 'Mietvertrag des/der Verpflichteten + Wohnflächenberechnung (für Mitversicherungs-Nachweis)',
      labelVi: 'Hợp đồng thuê nhà của người cam kết + tính diện tích nhà ở', // TODO: VI-review by native speaker
      description: 'Belegt ausreichenden Wohnraum, falls der Eingeladene bei der verpflichteten Person wohnen wird.',
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'schufa',
      label: 'Schufa-Selbstauskunft (≤ 3 Monate alt)',
      labelVi: 'Báo cáo tín dụng Schufa (không quá 3 tháng)', // TODO: VI-review by native speaker
      description: 'Nachweis der Kreditwürdigkeit — manche Ausländerbehörden fordern dies als Bonitätsnachweis.',
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'pass_kopie_eingeladener',
      label: 'Kopie des Reisepasses des/der Eingeladenen (Hauptdatenseite)',
      labelVi: 'Bản sao hộ chiếu của người được mời (trang thông tin chính)', // TODO: VI-review by native speaker
      description: 'Die Daten des Eingeladenen werden in die Verpflichtungserklärung eingetragen.',
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'reisezeitraum_nachweis',
      label: 'Geplanter Reisezeitraum + Reisezweck (schriftliche Angabe)',
      labelVi: 'Thời gian và mục đích chuyến đi dự kiến (khai bằng văn bản)', // TODO: VI-review by native speaker
      description: 'Wird in das Formular der Ausländerbehörde eingetragen.',
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'krankenversicherung_mitversicherung',
      label: 'Nachweis Krankenversicherungs-Mitversicherung (bei Familienangehörigen in der GKV)',
      labelVi: 'Bằng chứng bảo hiểm y tế chung (đối với thành viên gia đình trong bảo hiểm y tế pháp định)', // TODO: VI-review by native speaker
      description: 'Nur erforderlich, wenn der Eingeladene als Familienangehöriger in der gesetzlichen Krankenversicherung des Einladers mitversichert werden soll.',
      level: 'conditional',
      conditionalNote: 'Nur bei geplanter GKV-Mitversicherung des Eingeladenen als Familienangehöriger',
      category: 'gesundheit',
    },
    {
      id: 'verwandtschaftsnachweis',
      label: 'Verwandtschaftsnachweis (Geburtsurkunde, Heiratsurkunde) bei Familienangehörigen',
      labelVi: 'Bằng chứng quan hệ họ hàng (giấy khai sinh, giấy đăng ký kết hôn) với thành viên gia đình', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'familie',
    },
  ],
}

// ---------------------------------------------------------------------------
// 17. Aufenthaltsgestattung Asyl (§ 55 AsylG)
// ---------------------------------------------------------------------------

const aufenthaltsgestattung: MandatsartChecklist = {
  id: 'aufenthaltsgestattung',
  title: 'Aufenthaltsgestattung Asyl (§ 55 AsylG)',
  titleVi: 'Giấy phép tạm trú trong thủ tục xin tị nạn (§ 55 AsylG)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Aufenthaltsgestattung für Asylsuchende während des laufenden Asylverfahrens beim BAMF. Kein eigenständiger Aufenthaltstitel, sondern eine Duldung des Aufenthalts während der Prüfung. Mandatsart für Bao: Erstberatung, Akteneinsicht und Begleitung des BAMF-Verfahrens.',
  legalBasis: ['§ 55 AsylG', '§ 63 AsylG', '§ 14 AsylG', '§ 48 AsylG'],
  typicalDuration: '3–36 Monate (BAMF-Verfahren)',
  requiredDocuments: [
    {
      id: 'bamf_bescheid_asylgesuch',
      label: 'BAMF-Bescheid über Asylgesuch oder Registrierungsnachweis (Ankunftsnachweis)',
      labelVi: 'Quyết định của BAMF về đơn xin tị nạn hoặc bằng chứng đăng ký (giấy chứng nhận đến nơi)', // TODO: VI-review by native speaker
      description: 'Der Ankunftsnachweis (früher BÜMA) wird bei Einleitung des Asylverfahrens durch die Aufnahmeeinrichtung ausgestellt.',
      level: 'required',
      category: 'aufenthalt',
      typicalIssues: ['Unterschied zwischen Ankunftsnachweis (frühe Phase) und Aufenthaltsgestattungs-Karte (spätere Phase) beachten'],
    },
    {
      id: 'aufenthaltsgestattung_karte',
      label: 'Aufenthaltsgestattungs-Karte (falls bereits ausgestellt)',
      labelVi: 'Thẻ tạm trú (nếu đã được cấp)', // TODO: VI-review by native speaker
      description: 'Die Karte wird nach der förmlichen Asylantragstellung bei der Außenstelle des BAMF ausgestellt.',
      level: 'required',
      category: 'aufenthalt',
    },
    {
      id: 'biometrisches_lichtbild',
      label: 'Biometrisches Lichtbild (35 × 45 mm, ≤ 6 Monate alt)',
      labelVi: 'Ảnh sinh trắc học (35 × 45 mm, không quá 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
    },
    {
      id: 'sachverhaltsschilderung_mandant',
      label: 'Sachverhaltsschilderung des Mandanten (schriftlich, eigene Darstellung der Fluchtgeschichte)',
      labelVi: 'Tường trình tình huống của thân chủ (bằng văn bản, mô tả lý do và hành trình tị nạn)', // TODO: VI-review by native speaker
      description: 'Grundlage für die Anhörungsvorbereitung beim BAMF. Je konkreter und detaillierter, desto besser für die Vorbereitung.',
      level: 'required',
      category: 'sonstiges',
      typicalIssues: ['Widersprüche zwischen schriftlicher Schilderung und mündlicher BAMF-Anhörung sind häufige Ablehnungsgründe'],
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'identitaetsdokumente_heimatland',
      label: 'Identitätsdokumente aus dem Heimatland (Reisepass, Personalausweis, Geburtsurkunde — sofern vorhanden)',
      labelVi: 'Giấy tờ nhân thân từ quê hương (hộ chiếu, CMND, giấy khai sinh — nếu có)', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'identitaet',
    },
    {
      id: 'beweismittel_verfolgung',
      label: 'Beweismittel zur Verfolgungsgeschichte (Fotos, Dokumente, ärztliche Atteste, polizeiliche Anzeigen)',
      labelVi: 'Bằng chứng về lịch sử bị bắt bớ (ảnh, tài liệu, giấy y tế, đơn tố cáo cảnh sát)', // TODO: VI-review by native speaker
      description: 'Konkrete Beweise stärken die Glaubwürdigkeit beim BAMF erheblich. Auch digitale Belege (Screenshots, Nachrichten) können eingereicht werden.',
      level: 'optional',
      category: 'sonstiges',
    },
    {
      id: 'bisherige_anwaltskorrespondenz',
      label: 'Bisherige Anwaltskorrespondenz und BAMF-Schriftsätze (chronologisch geordnet)',
      labelVi: 'Thư từ luật sư trước đây và các văn bản BAMF (sắp xếp theo thứ tự thời gian)', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// 18. Familiennachzug Kind (snake_case ID, § 32 AufenthG)
// ---------------------------------------------------------------------------

const familiennachzugKindSnake: MandatsartChecklist = {
  id: 'familiennachzug_kind',
  title: 'Familiennachzug Kind (§ 32 AufenthG)',
  titleVi: 'Đoàn tụ gia đình – con cái (§ 32 AufenthG)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Nachzug eines minderjährigen Kindes zu einem oder beiden Elternteilen in Deutschland gem. § 32 AufenthG (Drittstaatsangehörige). Bei einem deutschen Elternteil gilt § 28 AufenthG. Gilt auch für Adoptivkinder mit entsprechendem Adoptionsnachweis.',
  legalBasis: ['§ 32 AufenthG', '§ 28 AufenthG', '§ 29 AufenthG', '§ 5 AufenthG'],
  typicalDuration: '3–8 Monate',
  requiredDocuments: [
    {
      id: 'reisepass_kind',
      label: 'Reisepass des Kindes (Original + Kopie aller Stempelseiten, ≥ 6 Monate gültig)',
      labelVi: 'Hộ chiếu của trẻ (bản gốc + bản sao tất cả trang đóng dấu, còn hạn ≥ 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'geburtsurkunde_kind',
      label: 'Geburtsurkunde des Kindes mit Apostille/Legalisation + beglaubigte Übersetzung ins Deutsche',
      labelVi: 'Giấy khai sinh của trẻ kèm Apostille/hợp pháp hóa + bản dịch công chứng tiếng Đức', // TODO: VI-review by native speaker
      description: 'Ausländische Geburtsurkunden bedürfen der Apostille (Haager Abkommen) oder Legalisation durch die Deutsche Botschaft.',
      level: 'required',
      category: 'familie',
      typicalIssues: [
        'Vietnamesische Urkunden: Legalisation statt Apostille (Vietnam ist kein Haag-Mitglied)',
        'Übersetzung muss von einem vereidigten Übersetzer stammen',
      ],
    },
    {
      id: 'sorgerechtsentscheidung',
      label: 'Sorgerechtsentscheidung oder Nachweis gemeinsames Sorgerecht (notarielle Erklärung)',
      labelVi: 'Quyết định về quyền nuôi con hoặc bằng chứng quyền nuôi chung (công chứng)', // TODO: VI-review by native speaker
      description: 'Wenn nur ein Elternteil in Deutschland lebt, muss das Sorgerecht und ggf. die Zustimmung des anderen Elternteils nachgewiesen werden.',
      level: 'required',
      category: 'familie',
      typicalIssues: ['Zustimmung des im Ausland lebenden Elternteils ggf. notariell beglaubigt erforderlich'],
    },
    {
      id: 'aufenthaltstitel_stammberechtigter',
      label: 'Aufenthaltstitel des in Deutschland lebenden Elternteils (Original + Kopie)',
      labelVi: 'Giấy phép cư trú của cha/mẹ đang sống ở Đức (bản gốc + bản sao)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
    },
    {
      id: 'wohnraumnachweis',
      label: 'Wohnraumnachweis: Mietvertrag + ausreichende Wohnfläche für das Kind (mind. 12 m² pro Person)',
      labelVi: 'Bằng chứng nhà ở: hợp đồng thuê + diện tích đủ cho trẻ (ít nhất 12 m² mỗi người)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'einkommensnachweis_stammberechtigter',
      label: 'Einkommensnachweis des Stammberechtigten (letzte 3 Monate, Lohnabrechnungen)',
      labelVi: 'Bằng chứng thu nhập của người bảo lãnh (3 tháng gần nhất, phiếu lương)', // TODO: VI-review by native speaker
      description: 'Lebensunterhaltssicherung gem. § 5 Abs. 1 Nr. 1 AufenthG für Kind und Stammberechtigte:n gemeinsam.',
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'krankenversicherung_kind',
      label: 'Krankenversicherungsnachweis für das Kind',
      labelVi: 'Bằng chứng bảo hiểm y tế cho trẻ', // TODO: VI-review by native speaker
      level: 'required',
      category: 'gesundheit',
    },
    {
      id: 'biometrisches_lichtbild_kind',
      label: 'Biometrisches Lichtbild des Kindes (35 × 45 mm, ≤ 6 Monate alt)',
      labelVi: 'Ảnh sinh trắc học của trẻ (35 × 45 mm, không quá 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'biometrie',
      acceptedFormats: ['jpg', 'png'],
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (unterschrieben von sorgeberechtigtem Elternteil)',
      labelVi: 'Giấy ủy quyền luật sư (ký bởi người giám hộ hợp pháp)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'schulbescheinigung',
      label: 'Schulbescheinigung (falls Kind schulpflichtig, ≥ 6 Jahre)',
      labelVi: 'Giấy xác nhận học sinh (nếu trẻ trong độ tuổi đi học, ≥ 6 tuổi)', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'sonstiges',
    },
    {
      id: 'sprachzeugnis_kind_16',
      label: 'Sprachzertifikat Kind ab 16 Jahren (Deutsch C1 erforderlich gem. § 32 Abs. 2 AufenthG)',
      labelVi: 'Chứng chỉ ngôn ngữ cho trẻ từ 16 tuổi (Tiếng Đức C1 theo § 32 Abs. 2 AufenthG)', // TODO: VI-review by native speaker
      description: 'Ab dem vollendeten 16. Lebensjahr ist für den eigenständigen Kindernachzug gem. § 32 Abs. 2 AufenthG ein C1-Sprachnachweis erforderlich.',
      level: 'conditional',
      conditionalNote: 'Nur wenn das Kind zum Zeitpunkt des Antrags das 16. Lebensjahr vollendet hat',
      category: 'sprache',
    },
  ],
}

// ---------------------------------------------------------------------------
// 19. Erlaubnis zum Daueraufenthalt-EU (§ 9a AufenthG)
// ---------------------------------------------------------------------------

const niederlassungEuDaueraufenthalt: MandatsartChecklist = {
  id: 'niederlassung_eu_daueraufenthalt',
  title: 'Erlaubnis zum Daueraufenthalt-EU (§ 9a AufenthG)',
  titleVi: 'Giấy phép cư trú dài hạn EU (§ 9a AufenthG)', // TODO: VI-review by native speaker
  category: 'migration',
  description:
    'Daueraufenthaltsstatus gem. EU-Richtlinie 2003/109/EG, umgesetzt in § 9a AufenthG. Ermöglicht nach 5 Jahren legalen Aufenthalts einen EU-weit anerkannten Aufenthaltsstatus. Voraussetzungen ähnlich wie Niederlassungserlaubnis (§ 9 AufenthG), aber mit EU-Anerkennung in anderen Mitgliedstaaten.',
  legalBasis: ['§ 9a AufenthG', '§ 9b AufenthG', '§ 9c AufenthG', 'Richtlinie 2003/109/EG'],
  typicalDuration: '4–8 Wochen',
  requiredDocuments: [
    {
      id: 'reisepass',
      label: 'Reisepass (Original + Kopie aller Stempelseiten, ≥ 6 Monate gültig)',
      labelVi: 'Hộ chiếu (bản gốc + bản sao tất cả trang đóng dấu, còn hạn ≥ 6 tháng)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'identitaet',
    },
    {
      id: 'aktueller_aufenthaltstitel',
      label: 'Aktueller Aufenthaltstitel (Original + Kopie) — Nachweis ≥ 5 Jahre rechtmäßiger Aufenthalt',
      labelVi: 'Giấy phép cư trú hiện tại (bản gốc + bản sao) — chứng minh ≥ 5 năm cư trú hợp pháp', // TODO: VI-review by native speaker
      level: 'required',
      category: 'aufenthalt',
    },
    {
      id: 'meldebescheinigung',
      label: 'Meldebescheinigungen der letzten 5 Jahre (lückenlos, oder Sammel-Meldebescheinigung)',
      labelVi: 'Giấy đăng ký hộ khẩu 5 năm qua (không gián đoạn, hoặc giấy xác nhận tổng hợp)', // TODO: VI-review by native speaker
      description: 'Belegt 5 Jahre tatsächlichen Aufenthalt in Deutschland. Lücken können zur Ablehnung führen.',
      level: 'required',
      category: 'wohnen',
      typicalIssues: ['Meldebescheinigungen für Zeiträume ohne Meldung können rückwirkend nicht erstellt werden — frühzeitig prüfen'],
    },
    {
      id: 'einkommensnachweise_5_jahre',
      label: 'Einkommensnachweise der letzten 5 Jahre (Lohnabrechnungen, Steuerbescheide oder Rentenbescheide)',
      labelVi: 'Bằng chứng thu nhập 5 năm qua (phiếu lương, quyết định thuế hoặc thông báo lương hưu)', // TODO: VI-review by native speaker
      description: 'Nachweis dauerhafter Lebensunterhaltssicherung über den gesamten Zeitraum ohne Sozialleistungen.',
      level: 'required',
      category: 'einkommen',
    },
    {
      id: 'rentenversicherungsnachweise',
      label: 'Rentenversicherungsnachweise: 60 Monate Pflichtbeiträge (Rentenauskunft der DRV)',
      labelVi: 'Bằng chứng bảo hiểm hưu trí: 60 tháng đóng góp bắt buộc (xác nhận của DRV)', // TODO: VI-review by native speaker
      description: 'Online abrufbar über www.deutsche-rentenversicherung.de. Bearbeitungsdauer 2–3 Wochen einplanen.',
      level: 'required',
      category: 'einkommen',
      typicalIssues: ['Rentenauskunft rechtzeitig beantragen — Bearbeitungszeit 2–3 Wochen'],
    },
    {
      id: 'krankenversicherungsnachweis',
      label: 'Nachweis Krankenversicherung (gesetzlich oder privat, lückenlos)',
      labelVi: 'Bằng chứng bảo hiểm y tế (bảo hiểm pháp định hoặc tư nhân, không gián đoạn)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'gesundheit',
    },
    {
      id: 'wohnraumnachweis',
      label: 'Wohnraumnachweis: aktueller Mietvertrag + ausreichende Wohnfläche für alle Haushaltsmitglieder',
      labelVi: 'Bằng chứng nhà ở: hợp đồng thuê hiện tại + diện tích đủ cho tất cả thành viên hộ gia đình', // TODO: VI-review by native speaker
      level: 'required',
      category: 'wohnen',
    },
    {
      id: 'sprachzeugnis_b1',
      label: 'Sprachzertifikat mind. B1 Deutsch (Goethe, telc, DTZ oder Schulabschluss in DE)',
      labelVi: 'Chứng chỉ tiếng Đức tối thiểu B1 (Goethe, telc, DTZ hoặc bằng tốt nghiệp ở Đức)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sprache',
    },
    {
      id: 'anwaltsvollmacht',
      label: 'Anwaltsvollmacht (Original, unterschrieben)',
      labelVi: 'Giấy ủy quyền luật sư (bản gốc, có chữ ký)', // TODO: VI-review by native speaker
      level: 'required',
      category: 'sonstiges',
    },
    {
      id: 'sprachzeugnis_hoeher_b1',
      label: 'Sprachzertifikat höher als B1 (B2 oder C1 — stärkt den Antrag, kein Pflichtdokument)',
      labelVi: 'Chứng chỉ tiếng Đức cao hơn B1 (B2 hoặc C1 — củng cố hồ sơ, không bắt buộc)', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'sprache',
    },
    {
      id: 'integrationsnachweis',
      label: 'Nachweis besonderer Integration: Ehrenamt, Vereinsmitgliedschaft, ehrenamtliche Tätigkeit',
      labelVi: 'Bằng chứng hội nhập đặc biệt: hoạt động tình nguyện, thành viên hội đoàn, công tác cộng đồng', // TODO: VI-review by native speaker
      level: 'optional',
      category: 'sonstiges',
    },
  ],
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export const MANDATSART_CHECKLISTS: MandatsartChecklist[] = [
  aufenthaltstitelVerlaengerung,     // 1
  familiennachzugEhegatte,           // 2
  familiennachzugKind,               // 3
  visumsverfahrenNational,           // 4
  einbuergerung,                     // 5
  niederlassungserlaubnis,           // 6
  chancenkarte,                      // 7
  beschaeftigungserlaubnis,          // 8
  eilantragAbschiebung,              // 9
  untaetigkeitsklage,                // 10
  haertefall,                        // 11
  aufenthaltVerlaengerung,           // 12
  familiennachzugEhegatten,          // 13
  strafbefehlEinspruch,              // 14
  visumKurzaufenthalt,               // 15
  verpflichtungserklaerung,          // 16
  aufenthaltsgestattung,             // 17
  familiennachzugKindSnake,          // 18
  niederlassungEuDaueraufenthalt,    // 19
]

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Lookup a single MandatsartChecklist by its stable slug ID.
 * Returns `undefined` if not found — callers should handle the missing case.
 */
export function getChecklistById(id: string): MandatsartChecklist | undefined {
  return MANDATSART_CHECKLISTS.find((c) => c.id === id)
}

/**
 * Filter checklists by top-level category (e.g. 'migration', 'familie').
 */
export function getChecklistsByCategory(cat: MandatsartCategory): MandatsartChecklist[] {
  return MANDATSART_CHECKLISTS.filter((c) => c.category === cat)
}

/**
 * Count only the 'required' documents in a checklist.
 * 'conditional' and 'optional' items are intentionally excluded —
 * this number represents the hard minimum Bao's team needs.
 */
export function getRequiredDocsCount(checklist: MandatsartChecklist): number {
  return checklist.requiredDocuments.filter((d) => d.level === 'required').length
}
