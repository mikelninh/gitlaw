/**
 * Mandant:innen-Fragebogen — öffentlich, KEIN Pro-Auth-Gate.
 *
 * Mehrsprachig (DE/VI/TR/AR/EN) via ?lang=vi etc. — Berliner Realität:
 * viele Mandant:innen sprechen ihre Muttersprache besser als Deutsch.
 * Patrick Rubin = türkisch-mietrechtl. Mandant:innen, Thai Bao Nguyen
 * (ra-nguyen.de) = vietnamesische Community, etc.
 *
 * Anwält:in teilt URL (z. B. per QR-Code bei Termin, oder Link in E-Mail)
 * im jeweiligen Sprach-Setup. Mandant:in füllt aus → Submit speichert
 * lokal UND öffnet mailto: zur:m Anwält:in mit den ausgefüllten Feldern.
 *
 * URL: /#/intake/:slug?lang=vi
 *
 * Die Anwält:in sieht die Antworten IMMER auf Deutsch in der Akte —
 * Übersetzung gilt nur für die LABELS, die Eingaben bleiben unverändert.
 */

import { useState } from 'react'
import { Scale, Send, CheckCircle2, Globe } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getCase, getSettings, saveIntake } from './store'
import type { IntakeAttachmentMeta } from './types'
import { detectIntakeLang, getIntakeStrings, INTAKE_LANGS, isRtl } from './intake-i18n'

export default function IntakeForm() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const lang = detectIntakeLang(searchParams.get('lang'))
  const t = getIntakeStrings(lang)
  const rtl = isRtl(lang)

  const [done, setDone] = useState(false)
  const [emailSending, setEmailSending] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [anliegen, setAnliegen] = useState('')
  const [gewuenschterAusgang, setGewuenschterAusgang] = useState('')
  const [consent, setConsent] = useState(false)
  const [attachments, setAttachments] = useState<IntakeAttachmentMeta[]>([])

  const settings = getSettings()
  const caseInfo = slug ? getCase(slug) : undefined

  function setLang(newLang: string) {
    const next = new URLSearchParams(searchParams)
    if (newLang === 'de') next.delete('lang')
    else next.set('lang', newLang)
    setSearchParams(next, { replace: true })
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!consent) {
      alert(t.consentRequired)
      return
    }

    saveIntake({
      caseId: caseInfo?.id,
      targetSlug: slug,
      name,
      email: email || undefined,
      phone: phone || undefined,
      anliegen,
      gewuenschterAusgang: gewuenschterAusgang || undefined,
      attachments: attachments.length ? attachments : undefined,
    })

    setDone(true)
  }

  function slugPart(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30) || 'file'
  }

  function extension(name: string): string {
    const idx = name.lastIndexOf('.')
    if (idx < 0 || idx === name.length - 1) return ''
    return name.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const nameTag = slugPart(name || 'mandant')
    const mapped = files.map((f, idx) => {
      const ext = extension(f.name)
      const internal = [
        'in',
        dateTag,
        nameTag,
        String(idx + 1).padStart(2, '0'),
      ].join('_') + (ext ? `.${ext}` : '')
      return {
        originalName: f.name,
        internalName: internal,
        mimeType: f.type || 'application/octet-stream',
        sizeBytes: f.size,
      } satisfies IntakeAttachmentMeta
    })
    setAttachments(mapped)
  }

  function onSendMail() {
    if (!settings.anwaltName && !settings.name) {
      alert('Kanzlei-E-Mail ist nicht bekannt — bitte nehmen Sie direkt Kontakt auf.')
      return
    }
    const contact = settings.contact || ''
    const emailMatch = contact.match(/[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}/)
    const kanzleiEmail = emailMatch ? emailMatch[0] : ''
    const subject = `Mandant:innen-Anliegen — ${name}`
    const body = [
      `Sehr geehrte ${settings.anwaltName || 'Damen und Herren'},`,
      ``,
      `hiermit übermittle ich Ihnen über Ihren Fragebogen folgende Angaben` +
        (lang !== 'de' ? ` (eingegeben in ${INTAKE_LANGS.find(l => l.code === lang)?.label}):` : ':'),
      ``,
      `Name:          ${name}`,
      `E-Mail:        ${email || '—'}`,
      `Telefon:       ${phone || '—'}`,
      caseInfo ? `Akten-Bezug:   ${caseInfo.aktenzeichen}` : '',
      ``,
      `Anliegen:`,
      anliegen,
      ``,
      gewuenschterAusgang ? `Gewünschter Ausgang:\n${gewuenschterAusgang}\n` : '',
      ``,
      `Mit freundlichen Grüßen`,
      name,
    ].filter(Boolean).join('\n')

    setEmailSending(true)
    window.location.href = `mailto:${kanzleiEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setTimeout(() => setEmailSending(false), 1500)
  }

  if (done) {
    return (
      <div
        className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4"
        dir={rtl ? 'rtl' : 'ltr'}
      >
        <div className="w-full max-w-md bg-white border border-[var(--color-border)] rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto text-green-700">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold">{t.thankYouTitle}</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            {t.thankYouMessage(settings.name || '')}
          </p>
          <button
            onClick={onSendMail}
            disabled={emailSending}
            className="inline-flex items-center gap-2 bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {emailSending ? t.emailButtonSending : t.emailButtonLabel}
          </button>
          <p className="text-xs text-[var(--color-ink-muted)] pt-4 border-t border-[var(--color-border)]">
            {t.kioskNote}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[var(--color-bg)] py-10 px-4"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-xl mx-auto bg-white border border-[var(--color-border)] rounded-2xl p-8 space-y-6">
        {/* Sprach-Auswahl oben */}
        <div className="flex items-center justify-end gap-1 -mt-2 -mr-2 flex-wrap">
          <Globe className="w-3.5 h-3.5 text-[var(--color-ink-muted)] mr-1" />
          {INTAKE_LANGS.map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                l.code === lang
                  ? 'bg-[var(--color-ink)] text-white'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg-alt)]'
              }`}
              title={l.label}
            >
              <span className="mr-0.5">{l.flag}</span>
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>

        <header className="flex items-center gap-3 pb-4 border-b border-[var(--color-border)]">
          <Scale className="w-6 h-6 text-[var(--color-gold)] shrink-0" />
          <div>
            <h1 className="text-xl font-semibold">
              {t.headerTitle(settings.name || '—')}
            </h1>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {caseInfo ? `${t.caseRefPrefix}: ${caseInfo.aktenzeichen}` : t.headerSubtitle}
            </p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label={t.fieldName} required={t.required}>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
              required
              autoFocus
              dir={rtl ? 'rtl' : 'ltr'}
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label={t.fieldEmail}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
                dir="ltr"
              />
            </FormField>
            <FormField label={t.fieldPhone}>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
                dir="ltr"
              />
            </FormField>
          </div>

          <FormField label={t.fieldConcern} required={t.required} hint={t.fieldConcernHint}>
            <textarea
              value={anliegen}
              onChange={e => setAnliegen(e.target.value)}
              rows={5}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
              required
              dir={rtl ? 'rtl' : 'ltr'}
            />
          </FormField>

          <FormField label={t.fieldOutcome}>
            <textarea
              value={gewuenschterAusgang}
              onChange={e => setGewuenschterAusgang(e.target.value)}
              rows={3}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
              dir={rtl ? 'rtl' : 'ltr'}
            />
          </FormField>

          <FormField
            label="Fotos / Dateien (optional)"
            hint="Nur Metadaten werden gespeichert, keine Datei-Uploads in dieser Beta."
          >
            <input
              type="file"
              multiple
              onChange={onFilesSelected}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
            />
            {attachments.length > 0 && (
              <ul className="mt-2 text-xs text-[var(--color-ink-muted)] space-y-1">
                {attachments.map(a => (
                  <li key={a.internalName} className="flex items-center justify-between gap-3">
                    <span className="truncate">{a.originalName}</span>
                    <span className="font-mono text-[11px] text-[var(--color-ink-soft)]">{a.internalName}</span>
                  </li>
                ))}
              </ul>
            )}
          </FormField>

          <label className="flex items-start gap-2 text-xs text-[var(--color-ink-soft)] pt-3 border-t border-[var(--color-border)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 shrink-0"
              required
            />
            <span>{t.consent}</span>
          </label>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 bg-[var(--color-ink)] text-white rounded-lg px-4 py-3 hover:opacity-90"
          >
            <Send className="w-4 h-4" /> {t.submit}
          </button>
        </form>

        <footer className="text-xs text-[var(--color-ink-muted)] border-t border-[var(--color-border)] pt-4">
          {t.footer}
        </footer>
      </div>
    </div>
  )
}

function FormField({
  label, hint, required, children,
}: {
  label: string
  hint?: string
  required?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1 gap-2">
        <span className="text-sm font-medium">
          {label}
          {required && <span className="text-red-600 ml-1" title={required}>*</span>}
        </span>
        {hint && <span className="text-xs text-[var(--color-ink-muted)] text-right">{hint}</span>}
      </div>
      {children}
    </label>
  )
}
