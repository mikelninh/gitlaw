/**
 * Lawyer letter generator.
 *
 * Pick a template → fill fields → preview → save to case → export branded PDF.
 */

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Download, Save, Copy, ChevronLeft, Mail } from 'lucide-react'
import { LAWYER_TEMPLATES, getLawyerTemplate } from './lawyer-templates'
import { exportLetterPDF } from './pdf'
import { getCase, getSettings, listCases, saveLetter } from './store'
import type { GeneratedLetter } from './types'

export default function ProTemplates() {
  const [params, setParams] = useSearchParams()
  const cases = useMemo(() => listCases().filter(c => c.status === 'aktiv'), [])
  const [selectedCaseId, setSelectedCaseId] = useState(params.get('case') || '')
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [savedLetter, setSavedLetter] = useState<GeneratedLetter | null>(null)
  const [copyOk, setCopyOk] = useState(false)

  const template = activeTemplate ? getLawyerTemplate(activeTemplate) : null
  const renderedBody = template ? template.render(fields) : ''

  function pickTemplate(id: string) {
    setActiveTemplate(id)
    setFields({})
    setSavedLetter(null)
  }

  function back() {
    setActiveTemplate(null)
    setFields({})
    setSavedLetter(null)
  }

  function onSave() {
    if (!template) return
    const saved = saveLetter({
      caseId: selectedCaseId || undefined,
      templateId: template.id,
      templateTitle: template.title,
      fields,
      body: renderedBody,
    })
    setSavedLetter(saved)
  }

  function onExportPDF() {
    if (!savedLetter) return
    const settings = getSettings()
    const caseInfo = savedLetter.caseId ? getCase(savedLetter.caseId) : undefined
    exportLetterPDF({ settings, letter: savedLetter, caseInfo })
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(renderedBody)
      setCopyOk(true)
      setTimeout(() => setCopyOk(false), 2000)
    } catch {
      // ignore
    }
  }

  function onOpenMail() {
    if (!template) return
    const caseInfo = selectedCaseId ? getCase(selectedCaseId) : undefined
    const to = caseInfo?.mandantEmail || ''
    const subjectParts = [template.title]
    if (caseInfo?.aktenzeichen) subjectParts.push(`Az. ${caseInfo.aktenzeichen}`)
    const subject = subjectParts.join(' — ')
    // mailto: has ~2000-char limits. Truncate body if needed and tell the
    // Anwält:in to attach the PDF separately.
    const maxBodyLen = 1500
    const body =
      renderedBody.length > maxBodyLen
        ? renderedBody.slice(0, maxBodyLen) +
          '\n\n[…verkürzt — bitte den vollständigen Brief als PDF-Anhang mitsenden]'
        : renderedBody
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold mb-1">Schreiben</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            5 anwaltliche Vorlagen — fülle Felder aus, exportiere als PDF auf deinem Briefkopf.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LAWYER_TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => pickTemplate(t.id)}
              className="text-left bg-white border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-gold)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-[var(--color-gold)] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{t.title}</h3>
                  <p className="text-sm text-[var(--color-ink-soft)] mb-2">{t.description}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] italic">
                    Wann: {t.useCase}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={back}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
      >
        <ChevronLeft className="w-4 h-4" /> Alle Vorlagen
      </button>

      <header>
        <h1 className="text-2xl font-semibold mb-1">{template.title}</h1>
        <p className="text-sm text-[var(--color-ink-soft)]">{template.description}</p>
      </header>

      {/* Case selector */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 flex items-baseline gap-2">
        <label className="text-sm text-[var(--color-ink-soft)] shrink-0">Akte:</label>
        <select
          value={selectedCaseId}
          onChange={e => {
            setSelectedCaseId(e.target.value)
            setParams(e.target.value ? { case: e.target.value } : {}, { replace: true })
          }}
          className="border border-[var(--color-border)] rounded-lg px-2 py-1 text-sm flex-1"
        >
          <option value="">— ohne Akte —</option>
          {cases.map(c => (
            <option key={c.id} value={c.id}>{c.aktenzeichen} · {c.mandantName}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={e => e.preventDefault()} className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">
            Felder
          </h2>
          {template.fields.map(f => (
            <div key={f.id}>
              <label className="block text-xs font-medium mb-1">
                {f.label}
                {f.required && <span className="text-red-600 ml-1">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  value={fields[f.id] || ''}
                  onChange={e => setFields({ ...fields, [f.id]: e.target.value })}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
                />
              ) : (
                <input
                  type={f.type === 'date' ? 'date' : 'text'}
                  value={fields[f.id] || ''}
                  onChange={e => setFields({ ...fields, [f.id]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
                />
              )}
              {f.hint && (
                <p className="text-xs text-[var(--color-ink-muted)] mt-1 italic">{f.hint}</p>
              )}
            </div>
          ))}
        </form>

        {/* Preview */}
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">
            Vorschau
          </h2>
          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-lg p-3 max-h-[500px] overflow-y-auto">
            {renderedBody}
          </pre>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              onClick={onCopy}
              className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]"
            >
              <Copy className="w-4 h-4" /> {copyOk ? 'Kopiert!' : 'Text kopieren'}
            </button>
            <button
              onClick={onOpenMail}
              className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]"
              title="Öffnet dein Mail-Programm mit vorgefülltem Text. PDF bitte separat anhängen."
            >
              <Mail className="w-4 h-4" /> Per E-Mail senden
            </button>
            {!savedLetter && (
              <button
                onClick={onSave}
                className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
              >
                <Save className="w-4 h-4" /> Speichern{selectedCaseId ? ' in Akte' : ''}
              </button>
            )}
            {savedLetter && (
              <button
                onClick={onExportPDF}
                className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-gold)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
              >
                <Download className="w-4 h-4" /> Branded PDF
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] italic">
            Diese Vorlage ist ein Entwurf, keine geprüfte Rechtsformel. Bitte vor Versand inhaltlich
            anpassen und auf Vollständigkeit prüfen.
          </p>
        </div>
      </div>
    </div>
  )
}
