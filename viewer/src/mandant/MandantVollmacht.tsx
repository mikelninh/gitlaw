/**
 * Digitale Vollmacht — Mandant:in unterschreibt die Anwalts-Vollmacht per
 * Finger oder Maus. Gespeichert als Document (kind: 'vollmacht') in der Akte.
 *
 * Zeigt:
 * - Wenn noch keine Vollmacht: Vollmachts-Text + SignaturePad + Submit
 * - Wenn bereits vorhanden: Status-Hinweis + Datum
 *
 * Kein Kontakt zu MandantAkte-Upload-Flow (Agent B) oder Onboarding (Agent G).
 */

import { useState } from 'react'
import { CheckCircle, PenTool } from 'lucide-react'
import SignaturePad from './SignaturePad'
import { useMandantCase } from './useMandantCase'
import { getMandantStrings } from './mandant-i18n'
import type { MandantLang } from './mandant-i18n'

const API_URL = import.meta.env.VITE_API_URL || 'https://gitlaw-xi.vercel.app'

interface Props {
  mandantId: string
  backendToken: string | null
  lang: MandantLang
}

export default function MandantVollmacht({ mandantId, backendToken, lang }: Props) {
  const t = getMandantStrings(lang)
  const { data: c, loading, error, reload } = useMandantCase(mandantId, backendToken)

  const [ort, setOrt] = useState('Berlin')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)] py-8 text-center">{t.loading}</p>
  }

  if (error || !c) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)] py-8 text-center">
        {t.akteEmpty}
      </p>
    )
  }

  // Vollmacht bereits vorhanden?
  const existingVollmacht = (c.documents ?? []).find(
    (d) => (d as { kind?: string }).kind === 'vollmacht',
  )

  if (submitted || existingVollmacht) {
    const signedAt = existingVollmacht?.uploadedAt
      ? new Date(existingVollmacht.uploadedAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'de-DE')
      : null
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-green-900">{t.vollmachtSubmitSuccess}</p>
            {signedAt && (
              <p className="text-sm text-green-700 mt-1">
                {t.vollmachtAlreadySigned.replace('{datum}', signedAt)}
              </p>
            )}
          </div>
        </div>

        {existingVollmacht?.serverDocumentId && backendToken && (
          <VollmachtPreview
            documentId={existingVollmacht.serverDocumentId}
            backendToken={backendToken}
            ortsangabe={(existingVollmacht as { ortsangabe?: string | null }).ortsangabe ?? null}
            datumIso={(existingVollmacht as { datumIso?: string | null }).datumIso ?? null}
            label={lang === 'vi' ? 'Chữ ký đã lưu' : 'Gespeicherte Unterschrift'}
          />
        )}
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const kanzlei = 'Anwaltskanzlei Thai Bao Nguyen, Berlin'

  const vollmachtText =
    lang === 'vi'
      ? buildVollmachtTextVi(c.mandantName, kanzlei, c.aktenzeichen, c.mandatsartId)
      : buildVollmachtTextDe(c.mandantName, kanzlei, c.aktenzeichen, c.mandatsartId)

  async function handleSignatureSave(dataUrl: string) {
    // Strip data:-Prefix, nur base64-Teil weitergeben
    const comma = dataUrl.indexOf(',')
    const signaturePngBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl

    if (!backendToken) {
      // Demo-Modus: kein Backend → zeig Bestätigung ohne echten Speichern
      setSubmitted(true)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const resp = await fetch(`${API_URL}/api/mandant/vollmacht`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: backendToken,
          signaturePngBase64,
          ortsangabe: ort.trim() || 'Berlin',
          datumIso: today,
        }),
      })

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as { error?: string }
        throw new Error(body?.error ?? `Fehler (HTTP ${resp.status})`)
      }

      setSubmitted(true)
      reload()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PenTool className="w-5 h-5 text-[var(--color-gold)]" />
          <h1 className="text-xl font-semibold">{t.vollmachtTitle}</h1>
        </div>
        <p className="text-sm text-[var(--color-ink-soft)]">{t.vollmachtIntro}</p>
      </div>

      {/* Vollmachts-Text */}
      <div className="bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {vollmachtText}
      </div>

      {/* Ort-Eingabe */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="vollmacht-ort">
          {t.vollmachtOrtLabel}
        </label>
        <input
          id="vollmacht-ort"
          type="text"
          value={ort}
          onChange={e => setOrt(e.target.value)}
          className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)]"
        />
        <p className="text-xs text-[var(--color-ink-muted)]">
          {today}
        </p>
      </div>

      {/* Signature Pad */}
      <div className="space-y-2">
        <p className="text-sm font-medium">{t.vollmachtSignHere}</p>
        <SignaturePad
          minHeight={220}
          hint={lang === 'vi'
            ? 'Ký tên bằng ngón tay hoặc chuột — TODO: VI-review'
            : 'Mit dem Finger oder der Maus unterschreiben'}
          labelClear={t.vollmachtClear}
          labelSave={submitting ? '…' : t.vollmachtSubmit}
          onSave={handleSignatureSave}
        />
      </div>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {submitError}
        </p>
      )}

      {!backendToken && (
        <p className="text-xs text-[var(--color-ink-muted)]">
          {lang === 'vi'
            ? 'Chế độ demo — chữ ký không được lưu. // TODO: VI-review'
            : 'Demo-Modus — Unterschrift wird nicht gespeichert.'}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vollmacht-Vorschau: Mandant sieht eigene Unterschrift nach dem Signieren
// ---------------------------------------------------------------------------

function VollmachtPreview({
  documentId,
  backendToken,
  ortsangabe,
  datumIso,
  label,
}: {
  documentId: string
  backendToken: string
  ortsangabe: string | null
  datumIso: string | null
  label: string
}) {
  const imgUrl = `${API_URL}/api/mandant/vollmacht?token=${encodeURIComponent(backendToken)}&id=${encodeURIComponent(documentId)}`

  const displayDate = datumIso
    ? new Date(datumIso).toLocaleDateString('de-DE')
    : null

  return (
    <div className="border border-[var(--color-border)] rounded-xl p-3 space-y-2">
      <p className="text-xs font-medium text-[var(--color-ink-muted)]">{label}</p>
      <img
        src={imgUrl}
        alt={label}
        className="max-h-28 rounded-lg border border-[var(--color-border)] bg-white object-contain"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
      {(displayDate || ortsangabe) && (
        <p className="text-xs text-[var(--color-ink-muted)]">
          {[ortsangabe, displayDate].filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vollmacht-Texte
// ---------------------------------------------------------------------------

function buildVollmachtTextDe(
  mandantName: string,
  kanzlei: string,
  aktenzeichen: string,
  mandatsartId?: string | null,
): string {
  const sachgebiet = mandatsartId ? ` (Sachgebiet: ${mandatsartId})` : ''
  return `VOLLMACHT

Ich, ${mandantName}, bevollmächtige hiermit die ${kanzlei}, mich in der Sache mit dem Aktenzeichen ${aktenzeichen}${sachgebiet} in allen rechtlichen Angelegenheiten zu vertreten.

Die Vollmacht umfasst insbesondere:
– Akteneinsicht bei Behörden, Gerichten und sonstigen Stellen
– Antragstellung und Einlegung von Rechtsmitteln in meinem Namen
– Empfangnahme von Schriftstücken, Bescheiden und Urteilen
– alle zur Interessenwahrung erforderlichen Handlungen

Diese Vollmacht gilt bis zu ihrem ausdrücklichen Widerruf schriftlich gegenüber der Kanzlei.

Aktenzeichen: ${aktenzeichen}
Kanzlei: ${kanzlei}`
}

function buildVollmachtTextVi(
  mandantName: string,
  kanzlei: string,
  aktenzeichen: string,
  mandatsartId?: string | null,
): string {
  // TODO: VI-review by native speaker — translation is plausible but unverified
  const sachgebiet = mandatsartId ? ` (Lĩnh vực: ${mandatsartId})` : ''
  return `GIẤY ỦY QUYỀN

Tôi, ${mandantName}, ủy quyền cho ${kanzlei} đại diện cho tôi trong vụ việc mang số hồ sơ ${aktenzeichen}${sachgebiet} trong tất cả các vấn đề pháp lý.

Phạm vi ủy quyền bao gồm đặc biệt:
– Tiếp cận hồ sơ tại cơ quan, tòa án và các tổ chức liên quan
– Nộp đơn và kháng cáo nhân danh tôi
– Nhận các văn bản, quyết định và bản án
– Tất cả các hành động cần thiết để bảo vệ quyền lợi của tôi

Giấy ủy quyền này có hiệu lực cho đến khi được thu hồi rõ ràng bằng văn bản gửi đến văn phòng luật sư.

Số hồ sơ: ${aktenzeichen}
Văn phòng luật sư: ${kanzlei}`
}
