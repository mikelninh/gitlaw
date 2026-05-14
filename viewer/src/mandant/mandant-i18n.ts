/**
 * UI-Strings für das Mandanten-Portal (DE + VI).
 *
 * VI-Strings: Kern-UI übersetzt, Rest mit TODO markiert.
 * Native-Speaker-Review steht noch aus — sprachlich plausibel aber ungeprüft.
 */

export type MandantLang = 'de' | 'vi'

export interface MandantStrings {
  // Login
  loginTitle: string
  loginSubtitle: string
  loginTokenPlaceholder: string
  loginButton: string
  loginError: string
  loginHint: string

  // Navigation / Layout
  navAkte: string
  navStatus: string
  navSachstand: string
  navLogout: string
  portalName: string
  poweredBy: string

  // Akte
  akteTitle: string
  akteNumber: string
  akteStatus: string
  akteDocuments: string
  akteMissingDocuments: string
  akteNoMissingDocuments: string
  akteUploadHint: string
  akteEmpty: string

  // Upload
  uploadLabel: string
  uploadDrop: string
  uploadFormats: string

  // Status
  statusTitle: string
  statusHistoryEmpty: string
  statusNotificationBadge: string

  // Sachstand
  sachstandTitle: string
  sachstandSubtitle: string
  sachstandContactHint: string
  sachstandLastUpdated: string
  sachstandNoCase: string

  // Onboarding (Erst-Login)
  onboardingTitle: string
  onboardingStep1Title: string
  onboardingStep1Body: string
  onboardingStep2Title: string
  onboardingStep2Body: string
  onboardingStep3Title: string
  onboardingStep3Body: string
  onboardingDismiss: string

  // Onboarding Multi-Step (MandantOnboarding.tsx)
  onboardingWelcomeTitle: (name: string) => string
  onboardingWelcomeTitlePlain: string
  onboardingWelcomeBody: (kanzleiName: string) => string
  onboardingFeaturesTitle: string
  onboardingFeature1: string
  onboardingFeature2: string
  onboardingFeature3: string
  onboardingHelpTitle: string
  onboardingHelpBody: string
  onboardingNext: string
  onboardingDismissFinal: string
  onboardingBack: string
  onboardingStepLabel: (n: number) => string

  // Checklist-Cards (per fehlendem Dokument)
  checklistIntro: string
  checklistRequiredBadge: string
  checklistUploadButton: string
  checklistUploadingButton: string
  checklistUploadSuccess: string
  checklistUploadError: string
  checklistAcceptedFormats: string
  checklistShowReceived: string
  checklistHideReceived: string
  checklistAllDone: string

  // Aktenzeichen-Card
  caseRefHint: string

  // Multi-Photo-Cards
  photoProgress: (uploaded: number, required: number) => string
  photoAddMore: string
  photoSlotFilled: string
  photoSlotMissing: string

  // Smart-Upload (OCR-Auto-Klassifikation)
  smartUploadLabel: string
  smartUploadHint: string
  smartUploadRunning: string
  smartUploadSuggestion: (label: string) => string
  smartUploadConfirm: string
  smartUploadChooseManually: string
  smartUploadNoMatch: string
  smartUploadChooseItem: string
  smartUploadNeedsRender: string
  smartUploadError: string

  // Vollmacht
  navVollmacht: string
  vollmachtTitle: string
  vollmachtIntro: string
  vollmachtSignHere: string
  vollmachtClear: string
  vollmachtSubmit: string
  /** {datum} wird ersetzt mit dem formatierten Datum */
  vollmachtAlreadySigned: string
  vollmachtSubmitSuccess: string
  vollmachtOrtLabel: string

  // Dokument-Aktionen (Self-View: Anzeigen / Löschen)
  docViewLabel: string
  docDeleteLabel: string
  docDeleteConfirm: string
  docDeleteSuccess: string
  /** {datum} wird ersetzt mit dem formatierten Datum */
  docUploadedAt: string

  // Dokument-Review-Status (sichtbar im Mandant-Portal nach Kanzlei-Prüfung)
  docRejectedBanner: string
  docApprovedBadge: string
  docPendingBadge: string

  // General
  loading: string
  unknownStatus: string
  lastUpdated: string

  // Checklisten-Fortschritt
  /** {submitted} und {total} werden ersetzt */
  checklistProgress: (submitted: number, total: number) => string
}

const DE: MandantStrings = {
  loginTitle: 'Meine Akte',
  loginSubtitle: 'Bitte geben Sie Ihren Zugangs-Code ein. Den Code erhalten Sie von Ihrer Kanzlei.',
  loginTokenPlaceholder: 'Zugangs-Code …',
  loginButton: 'Einloggen',
  loginError: 'Code ungültig. Bitte prüfen Sie die Schreibweise oder wenden Sie sich an Ihre Kanzlei.',
  loginHint: 'Kein Code? Bitte kontaktieren Sie Kanzlei Nguyen direkt.',

  navAkte: 'Meine Akte',
  navStatus: 'Status',
  navSachstand: 'Sachstand',
  navLogout: 'Abmelden',
  portalName: 'Meine Akte',
  poweredBy: 'Bereitgestellt durch GitLaw Pro',

  akteTitle: 'Ihre Akte',
  akteNumber: 'Aktenzeichen',
  akteStatus: 'Aktueller Status',
  akteDocuments: 'Eingereichte Dokumente',
  akteMissingDocuments: 'Noch fehlende Dokumente',
  akteNoMissingDocuments: 'Alle erforderlichen Dokumente sind eingegangen.',
  akteUploadHint: 'Dokumente hochladen',
  akteEmpty: 'Keine Akte gefunden. Bitte wenden Sie sich an Ihre Kanzlei.',

  uploadLabel: 'Dokument hinzufügen',
  uploadDrop: 'Datei hier ablegen oder klicken',
  uploadFormats: 'PNG, JPG, PDF',

  statusTitle: 'Status-Verlauf',
  statusHistoryEmpty: 'Noch keine Status-Änderungen gespeichert.',
  statusNotificationBadge: 'Neu',

  sachstandTitle: 'Aktueller Sachstand',
  sachstandSubtitle: 'Stand Ihrer Akte',
  sachstandContactHint: 'Bei Fragen kontaktieren Sie bitte unsere Kanzlei.',
  sachstandLastUpdated: 'Zuletzt aktualisiert',
  sachstandNoCase: 'Keine Akte gefunden. Bitte wenden Sie sich an Ihre Kanzlei.',

  onboardingTitle: 'Willkommen in Ihrem Akten-Portal',
  onboardingStep1Title: '1 — Sprache wählen',
  onboardingStep1Body: 'Oben rechts können Sie zwischen Deutsch und Vietnamesisch wechseln.',
  onboardingStep2Title: '2 — Dokumente hochladen',
  onboardingStep2Body: 'Wir zeigen Ihnen genau, welche Unterlagen wir noch von Ihnen brauchen. Pro Dokument ein eigener Knopf — tippen Sie ihn an und wählen Sie die Datei oder fotografieren Sie das Dokument.',
  onboardingStep3Title: '3 — Status verfolgen',
  onboardingStep3Body: 'Unter "Sachstand" sehen Sie, wo Ihre Akte gerade steht. Bei Fragen rufen Sie unsere Kanzlei an — Ihr Aktenzeichen steht oben.',
  onboardingDismiss: 'Verstanden, weiter zur Akte',

  onboardingWelcomeTitle: (name) => `Herzlich willkommen, ${name}`,
  onboardingWelcomeTitlePlain: 'Herzlich willkommen',
  onboardingWelcomeBody: (kanzleiName) =>
    `Sie haben einen sicheren Zugang zu Ihrer Akte bei der ${kanzleiName}.`,
  onboardingFeaturesTitle: 'So nutzen Sie Ihre Akte',
  onboardingFeature1: 'Sie sehen, welche Unterlagen wir noch von Ihnen brauchen.',
  onboardingFeature2: 'Sie fotografieren Dokumente direkt mit Ihrem Handy.',
  onboardingFeature3:
    'Sie verfolgen den Stand Ihrer Akte und bekommen automatisch ein Update.',
  onboardingHelpTitle: 'Bei Fragen sind wir für Sie da',
  onboardingHelpBody:
    'Schreiben Sie uns auf WhatsApp oder rufen Sie an. Sagen Sie immer Ihr Aktenzeichen — Sie sehen es ganz oben.',
  onboardingNext: 'Weiter',
  onboardingDismissFinal: 'Verstanden, los geht\'s',
  onboardingBack: 'Zurück',
  onboardingStepLabel: (n) => `Schritt ${n} von 3`,

  checklistIntro: 'Bitte laden Sie die folgenden Dokumente hoch. Sie können fotografieren oder eine Datei wählen.',
  checklistRequiredBadge: 'Pflicht',
  checklistUploadButton: 'Dokument hochladen',
  checklistUploadingButton: 'Wird hochgeladen …',
  checklistUploadSuccess: 'Eingegangen — vielen Dank.',
  checklistUploadError: 'Hochladen fehlgeschlagen. Bitte erneut versuchen.',
  checklistAcceptedFormats: 'Foto oder PDF',
  checklistShowReceived: 'Bereits eingereichte Dokumente anzeigen',
  checklistHideReceived: 'Eingereichte Dokumente ausblenden',
  checklistAllDone: 'Alle Pflichtdokumente sind eingegangen. Vielen Dank!',

  caseRefHint: 'Bei Anrufen bitte Aktenzeichen angeben',

  navVollmacht: 'Vollmacht',
  vollmachtTitle: 'Vollmacht unterschreiben',
  vollmachtIntro: 'Mit Ihrer Unterschrift bevollmächtigen Sie die Kanzlei, Sie in dieser Sache zu vertreten. Bitte lesen Sie den Text sorgfältig und unterschreiben Sie unten.',
  vollmachtSignHere: 'Hier unterschreiben',
  vollmachtClear: 'Löschen',
  vollmachtSubmit: 'Vollmacht absenden',
  vollmachtAlreadySigned: 'Sie haben am {datum} unterschrieben.',
  vollmachtSubmitSuccess: 'Vielen Dank — Ihre Vollmacht ist bei der Kanzlei eingegangen.',
  vollmachtOrtLabel: 'Ort',

  photoProgress: (uploaded, required) => `${uploaded} von ${required} Fotos hochgeladen`,
  photoAddMore: 'Weiteres Foto hinzufügen',
  photoSlotFilled: 'Hochgeladen',
  photoSlotMissing: 'Fehlt noch',

  smartUploadLabel: 'Foto hochladen — wir erkennen das Dokument',
  smartUploadHint: 'Laden Sie ein Foto hoch. Wir versuchen automatisch zu erkennen, um welches Dokument es sich handelt.',
  smartUploadRunning: 'Wird ausgewertet …',
  smartUploadSuggestion: (label) => `Wir glauben, das ist: ${label}. Stimmt das?`,
  smartUploadConfirm: 'Ja, passt',
  smartUploadChooseManually: 'Nein, ich wähle selbst',
  smartUploadNoMatch: 'Konnten wir nicht erkennen — bitte wählen Sie selbst:',
  smartUploadChooseItem: 'Dokument zuordnen',
  smartUploadNeedsRender: 'Scan-PDF erkannt — bitte als Foto (JPG/PNG) hochladen.',
  smartUploadError: 'Erkennung fehlgeschlagen. Bitte wählen Sie das Dokument manuell.',

  docViewLabel: 'Anzeigen',
  docDeleteLabel: 'Löschen',
  docDeleteConfirm: 'Dieses Dokument wirklich löschen?',
  docDeleteSuccess: 'Dokument gelöscht.',
  docUploadedAt: 'Hochgeladen am {datum}',

  docRejectedBanner: 'Bitte erneut hochladen — Hinweis Ihrer Kanzlei:',
  docApprovedBadge: 'Bestätigt',
  docPendingBadge: 'Wird geprüft',

  loading: 'Wird geladen …',
  unknownStatus: 'Status unbekannt',
  lastUpdated: 'Zuletzt aktualisiert',

  checklistProgress: (submitted, total) => `${submitted} von ${total} Dokumenten eingereicht`,
}

// TODO: VI-Strings — Kern-UI übersetzt, Feinheiten brauchen Native-Speaker-Review
const VI: MandantStrings = {
  loginTitle: 'Hồ sơ của tôi',
  loginSubtitle: 'Vui lòng nhập mã truy cập. Bạn nhận mã này từ văn phòng luật sư.',
  loginTokenPlaceholder: 'Mã truy cập …',
  loginButton: 'Đăng nhập',
  loginError: 'Mã không hợp lệ. Vui lòng kiểm tra lại hoặc liên hệ văn phòng luật sư.',
  loginHint: 'Chưa có mã? Vui lòng liên hệ trực tiếp với Văn phòng luật sư Nguyen.',

  navAkte: 'Hồ sơ của tôi',
  navStatus: 'Tình trạng',
  // TODO: VI-review — "Sachstand" auf VI; "Tiến độ vụ việc" ist plausibel aber ungeprüft
  navSachstand: 'Tiến độ',
  navLogout: 'Đăng xuất',
  portalName: 'Hồ sơ của tôi',
  poweredBy: 'Được cung cấp bởi GitLaw Pro',

  akteTitle: 'Hồ sơ của bạn',
  akteNumber: 'Số hồ sơ',
  akteStatus: 'Tình trạng hiện tại',
  akteDocuments: 'Tài liệu đã nộp',
  akteMissingDocuments: 'Tài liệu còn thiếu',
  akteNoMissingDocuments: 'Tất cả tài liệu cần thiết đã được nhận.',
  akteUploadHint: 'Tải lên tài liệu',
  akteEmpty: 'Không tìm thấy hồ sơ. Vui lòng liên hệ văn phòng luật sư.',

  uploadLabel: 'Thêm tài liệu',
  uploadDrop: 'Kéo thả tệp vào đây hoặc nhấn để chọn',
  uploadFormats: 'PNG, JPG, PDF',

  // TODO: VI-review — "status-verlauf" auf VI
  statusTitle: 'Lịch sử tình trạng',
  statusHistoryEmpty: 'Chưa có thay đổi tình trạng nào được ghi lại.',
  statusNotificationBadge: 'Mới',

  // TODO: VI-review — Sachstand-Strings; plausibel aber ungeprüft
  sachstandTitle: 'Tình trạng hiện tại',
  sachstandSubtitle: 'Thông tin về hồ sơ của bạn',
  sachstandContactHint: 'Nếu có câu hỏi, vui lòng liên hệ văn phòng luật sư.',
  sachstandLastUpdated: 'Cập nhật lần cuối',
  sachstandNoCase: 'Không tìm thấy hồ sơ. Vui lòng liên hệ văn phòng luật sư.',

  // TODO: VI-review onboarding + checklist strings — alle Native-Speaker-Check ausstehend
  onboardingTitle: 'Chào mừng bạn đến với Cổng hồ sơ của bạn',
  onboardingStep1Title: '1 — Chọn ngôn ngữ',
  onboardingStep1Body: 'Ở trên cùng bên phải, bạn có thể chuyển đổi giữa tiếng Đức và tiếng Việt.',
  onboardingStep2Title: '2 — Tải lên tài liệu',
  onboardingStep2Body: 'Chúng tôi sẽ chỉ cho bạn chính xác các tài liệu chúng tôi cần. Mỗi tài liệu có một nút riêng — nhấn vào và chọn tệp hoặc chụp ảnh tài liệu.',
  onboardingStep3Title: '3 — Theo dõi tình trạng',
  onboardingStep3Body: 'Ở mục "Tiến độ", bạn có thể xem hồ sơ của bạn đang ở đâu. Nếu có câu hỏi, hãy gọi cho văn phòng luật sư — số hồ sơ ở phía trên.',
  onboardingDismiss: 'Đã hiểu, tiếp tục',

  // TODO: VI-review — onboarding multi-step strings; plausibel aber Native-Speaker-Check ausstehend
  onboardingWelcomeTitle: (name) => `Kính chào ${name}`,
  onboardingWelcomeTitlePlain: 'Kính chào quý khách',
  onboardingWelcomeBody: (kanzleiName) =>
    `Quý khách đã có quyền truy cập an toàn vào hồ sơ của mình tại ${kanzleiName}.`,
  onboardingFeaturesTitle: 'Cách sử dụng hồ sơ của bạn',
  onboardingFeature1: 'Bạn thấy ngay những tài liệu chúng tôi còn cần từ bạn.',
  onboardingFeature2: 'Bạn có thể chụp ảnh tài liệu trực tiếp bằng điện thoại.',
  onboardingFeature3:
    'Bạn theo dõi tiến độ hồ sơ và sẽ nhận thông báo khi có cập nhật quan trọng.',
  onboardingHelpTitle: 'Chúng tôi luôn sẵn sàng hỗ trợ bạn',
  onboardingHelpBody:
    'Bạn có thể nhắn tin qua WhatsApp hoặc gọi điện cho chúng tôi. Vui lòng luôn nêu số hồ sơ — bạn thấy số đó ở phía trên trang.',
  onboardingNext: 'Tiếp theo',
  onboardingDismissFinal: 'Đã hiểu, bắt đầu thôi',
  onboardingBack: 'Quay lại',
  onboardingStepLabel: (n) => `Bước ${n} / 3`,

  checklistIntro: 'Vui lòng tải lên các tài liệu sau. Bạn có thể chụp ảnh hoặc chọn tệp.',
  checklistRequiredBadge: 'Bắt buộc',
  checklistUploadButton: 'Tải lên tài liệu',
  checklistUploadingButton: 'Đang tải lên …',
  checklistUploadSuccess: 'Đã nhận — xin cảm ơn.',
  checklistUploadError: 'Tải lên thất bại. Vui lòng thử lại.',
  checklistAcceptedFormats: 'Ảnh hoặc PDF',
  checklistShowReceived: 'Hiển thị tài liệu đã nộp',
  checklistHideReceived: 'Ẩn tài liệu đã nộp',
  checklistAllDone: 'Tất cả tài liệu bắt buộc đã được nhận. Xin cảm ơn!',

  caseRefHint: 'Vui lòng cung cấp số hồ sơ khi gọi điện',

  // TODO: VI-review — photoProgress strings; plausibel aber ungeprüft
  photoProgress: (uploaded, required) => `${uploaded} / ${required} ảnh đã tải lên`,
  photoAddMore: 'Thêm ảnh',
  photoSlotFilled: 'Đã tải lên',
  photoSlotMissing: 'Còn thiếu',

  // TODO: VI-review — smartUpload strings; plausibel aber ungeprüft
  smartUploadLabel: 'Tải ảnh lên — chúng tôi nhận dạng tài liệu',
  smartUploadHint: 'Tải ảnh lên. Chúng tôi sẽ cố gắng tự động nhận dạng đây là loại tài liệu gì.',
  smartUploadRunning: 'Đang phân tích …',
  smartUploadSuggestion: (label) => `Chúng tôi nghĩ đây là: ${label}. Có đúng không?`,
  smartUploadConfirm: 'Đúng rồi',
  smartUploadChooseManually: 'Không, tôi tự chọn',
  smartUploadNoMatch: 'Không nhận dạng được — vui lòng chọn:',
  smartUploadChooseItem: 'Chọn loại tài liệu',
  smartUploadNeedsRender: 'Phát hiện PDF scan — vui lòng tải lên ảnh (JPG/PNG).',
  smartUploadError: 'Nhận dạng thất bại. Vui lòng chọn tài liệu thủ công.',

  // TODO: VI-review — Vollmacht strings; plausibel aber ungeprüft
  navVollmacht: 'Giấy ủy quyền',
  vollmachtTitle: 'Ký giấy ủy quyền',
  vollmachtIntro: 'Bằng chữ ký của bạn, bạn ủy quyền cho văn phòng luật sư đại diện cho bạn trong vụ việc này. Vui lòng đọc kỹ nội dung và ký ở phía dưới.',
  vollmachtSignHere: 'Ký tên tại đây',
  vollmachtClear: 'Xóa',
  vollmachtSubmit: 'Gửi giấy ủy quyền',
  vollmachtAlreadySigned: 'Bạn đã ký vào ngày {datum}.',
  vollmachtSubmitSuccess: 'Cảm ơn bạn — giấy ủy quyền của bạn đã được văn phòng luật sư nhận.',
  vollmachtOrtLabel: 'Địa điểm',

  // TODO: VI-review native speaker — docViewLabel / docDeleteLabel / docDeleteConfirm / docDeleteSuccess / docUploadedAt
  docViewLabel: 'Xem',
  docDeleteLabel: 'Xóa',
  docDeleteConfirm: 'Bạn có chắc muốn xóa tài liệu này không?',
  docDeleteSuccess: 'Đã xóa tài liệu.',
  docUploadedAt: 'Đã tải lên vào {datum}',

  // TODO: VI-review — docRejectedBanner / docApprovedBadge / docPendingBadge; plausibel aber ungeprüft
  docRejectedBanner: 'Vui lòng tải lên lại — Ghi chú từ văn phòng luật sư:',
  docApprovedBadge: 'Đã xác nhận',
  docPendingBadge: 'Đang kiểm tra',

  loading: 'Đang tải …',
  unknownStatus: 'Tình trạng không xác định',
  lastUpdated: 'Cập nhật lần cuối',

  // TODO: VI-review — checklistProgress native speaker prüfen
  checklistProgress: (submitted, total) => `${submitted} / ${total} tài liệu đã nộp`,
}

const STRINGS: Record<MandantLang, MandantStrings> = { de: DE, vi: VI }

export function getMandantStrings(lang: MandantLang): MandantStrings {
  return STRINGS[lang] ?? STRINGS.de
}
