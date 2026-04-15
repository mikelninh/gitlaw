/**
 * Lawyer letter generator.
 *
 * Zeigt gebaut-in Templates + Notariats-Specials + eigene Custom-Templates.
 * Anwält:innen können eigene Vorlagen anlegen mit {{placeholder}}-Syntax —
 * diese persistieren in localStorage und stehen dauerhaft zur Verfügung.
 */

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Download, Save, Copy, ChevronLeft, Mail, Plus, Trash2, Pencil } from 'lucide-react'
import {
  ALL_BUILTIN_TEMPLATES,
  NOTAR_TEMPLATES,
  LAWYER_TEMPLATES,
  getAnyBuiltinTemplate,
  type LawyerTemplate,
} from './lawyer-templates'
import { exportLetterPDF } from './pdf'
import {
  deleteCustomTemplate,
  getCase,
  getCustomTemplate,
  getSettings,
  listCases,
  listCustomTemplates,
  saveCustomTemplate,
  saveLetter,
} from './store'
import type { CustomTemplate, GeneratedLetter } from './types'

type PickedTemplate =
  | { kind: 'builtin'; t: LawyerTemplate }
  | { kind: 'custom'; t: CustomTemplate }

function renderCustom(t: CustomTemplate, fields: Record<string, string>): string {
  return t.body.replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi, (_m, key) => fields[key] || `[${key}]`)
}

export default function ProTemplates() {
  const [params, setParams] = useSearchParams()
  const cases = useMemo(() => listCases().filter(c => c.status === 'aktiv'), [])
  const [selectedCaseId, setSelectedCaseId] = useState(params.get('case') || '')
  const [activeTemplate, setActiveTemplate] = useState<PickedTemplate | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [savedLetter, setSavedLetter] = useState<GeneratedLetter | null>(null)
  const [copyOk, setCopyOk] = useState(false)
  const [tick, setTick] = useState(0)
  const [editingCustom, setEditingCustom] = useState<CustomTemplate | 'new' | null>(null)

  const customTemplates = useMemo(() => listCustomTemplates(), [tick, editingCustom])

  const renderedBody =
    activeTemplate?.kind === 'builtin'
      ? activeTemplate.t.render(fields)
      : activeTemplate?.kind === 'custom'
        ? renderCustom(activeTemplate.t, fields)
        : ''

  function pickBuiltin(id: string) {
    const t = getAnyBuiltinTemplate(id)
    if (!t) return
    setActiveTemplate({ kind: 'builtin', t })
    setFields({})
    setSavedLetter(null)
  }
  function pickCustom(id: string) {
    const t = getCustomTemplate(id)
    if (!t) return
    setActiveTemplate({ kind: 'custom', t })
    setFields({})
    setSavedLetter(null)
  }
  function back() {
    setActiveTemplate(null)
    setFields({})
    setSavedLetter(null)
  }

  function onSave() {
    if (!activeTemplate) return
    const t = activeTemplate.t
    const saved = saveLetter({
      caseId: selectedCaseId || undefined,
      templateId: t.id,
      templateTitle: t.title,
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
    } catch { /* ignore */ }
  }

  function onOpenMail() {
    if (!activeTemplate) return
    const caseInfo = selectedCaseId ? getCase(selectedCaseId) : undefined
    const to = caseInfo?.mandantEmail || ''
    const subjectParts = [activeTemplate.t.title]
    if (caseInfo?.aktenzeichen) subjectParts.push(`Az. ${caseInfo.aktenzeichen}`)
    const subject = subjectParts.join(' — ')
    const maxBodyLen = 1500
    const body =
      renderedBody.length > maxBodyLen
        ? renderedBody.slice(0, maxBodyLen) +
          '\n\n[…verkürzt — bitte vollständigen Brief als PDF-Anhang mitsenden]'
        : renderedBody
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  if (editingCustom) {
    return (
      <CustomTemplateEditor
        existing={editingCustom === 'new' ? undefined : editingCustom}
        onSaved={() => {
          setEditingCustom(null)
          setTick(t => t + 1)
        }}
        onCancel={() => setEditingCustom(null)}
      />
    )
  }

  if (!activeTemplate) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold mb-1">Schreiben</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Eingebaute Vorlagen + deine eigenen. Füllen → Preview → PDF auf deinem Briefkopf.
          </p>
        </header>

        {customTemplates.length > 0 && (
          <section>
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)] mb-3">
              Eigene Vorlagen ({customTemplates.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customTemplates.map(t => (
                <div key={t.id} className="bg-white border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-gold)] transition-colors">
                  <button onClick={() => pickCustom(t.id)} className="text-left w-full">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-[var(--color-gold)] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{t.title}</h3>
                        {t.description && (
                          <p className="text-sm text-[var(--color-ink-soft)] mb-2">{t.description}</p>
                        )}
                        <p className="text-xs text-[var(--color-ink-muted)]">
                          {t.placeholders.length} Platzhalter · zuletzt {new Date(t.updatedAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                    <button
                      onClick={() => setEditingCustom(t)}
                      className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> bearbeiten
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`„${t.title}" löschen?`)) {
                          deleteCustomTemplate(t.id)
                          setTick(x => x + 1)
                        }
                      }}
                      className="text-xs text-red-700 hover:text-red-900 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div>
          <button
            onClick={() => setEditingCustom('new')}
            className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Eigene Vorlage anlegen
          </button>
        </div>

        <section>
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)] mb-3">
            Eingebaute Vorlagen — Allgemein
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LAWYER_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => pickBuiltin(t.id)}
                className="text-left bg-white border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-gold)] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[var(--color-gold)] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{t.title}</h3>
                    <p className="text-sm text-[var(--color-ink-soft)] mb-2">{t.description}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] italic">Wann: {t.useCase}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)] mb-3">
            Eingebaute Vorlagen — Notariat & Erbrecht
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NOTAR_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => pickBuiltin(t.id)}
                className="text-left bg-white border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-gold)] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[var(--color-gold)] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{t.title}</h3>
                    <p className="text-sm text-[var(--color-ink-soft)] mb-2">{t.description}</p>
                    <p className="text-xs text-[var(--color-ink-muted)] italic">Wann: {t.useCase}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    )
  }

  const template = activeTemplate.t
  const fieldDefs =
    activeTemplate.kind === 'builtin'
      ? activeTemplate.t.fields
      : activeTemplate.t.placeholders.map(p => ({
          id: p,
          label: p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          type: 'text' as const,
          required: false,
        }))

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
        {activeTemplate.kind === 'builtin' && (
          <p className="text-sm text-[var(--color-ink-soft)]">{template.description}</p>
        )}
        {activeTemplate.kind === 'custom' && activeTemplate.t.description && (
          <p className="text-sm text-[var(--color-ink-soft)]">{activeTemplate.t.description}</p>
        )}
      </header>

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
        <form onSubmit={e => e.preventDefault()} className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">Felder</h2>
          {fieldDefs.map(f => (
            <div key={f.id}>
              <label className="block text-xs font-medium mb-1">
                {f.label}
                {f.required && <span className="text-red-600 ml-1">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  value={fields[f.id] || ''}
                  onChange={e => setFields({ ...fields, [f.id]: e.target.value })}
                  placeholder={'placeholder' in f ? f.placeholder : ''}
                  rows={3}
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
                />
              ) : (
                <input
                  type={f.type === 'date' ? 'date' : 'text'}
                  value={fields[f.id] || ''}
                  onChange={e => setFields({ ...fields, [f.id]: e.target.value })}
                  placeholder={'placeholder' in f ? f.placeholder : ''}
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
                />
              )}
              {'hint' in f && f.hint && (
                <p className="text-xs text-[var(--color-ink-muted)] mt-1 italic">{f.hint}</p>
              )}
            </div>
          ))}
        </form>

        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">Vorschau</h2>
          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-lg p-3 max-h-[500px] overflow-y-auto">
            {renderedBody}
          </pre>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button onClick={onCopy} className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]">
              <Copy className="w-4 h-4" /> {copyOk ? 'Kopiert!' : 'Text kopieren'}
            </button>
            <button onClick={onOpenMail} className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)]">
              <Mail className="w-4 h-4" /> Per E-Mail senden
            </button>
            {!savedLetter && (
              <button onClick={onSave} className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90">
                <Save className="w-4 h-4" /> Speichern{selectedCaseId ? ' in Akte' : ''}
              </button>
            )}
            {savedLetter && (
              <button onClick={onExportPDF} className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-gold)] text-white rounded-lg px-3 py-1.5 hover:opacity-90">
                <Download className="w-4 h-4" /> Branded PDF
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] italic">
            Diese Vorlage ist ein Entwurf, keine geprüfte Rechtsformel. Bitte vor Versand inhaltlich anpassen.
          </p>
        </div>
      </div>
    </div>
  )
}

function CustomTemplateEditor({
  existing,
  onSaved,
  onCancel,
}: {
  existing?: CustomTemplate
  onSaved: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(existing?.title || '')
  const [description, setDescription] = useState(existing?.description || '')
  const [body, setBody] = useState(
    existing?.body ||
      `An {{empfaenger}}

{{betreff}}

Sehr geehrte Damen und Herren,

namens und im Auftrag meiner Mandantschaft, {{mandant}}, nehme ich Bezug auf {{bezug}}.

{{sachverhalt}}

Mit freundlichen Grüßen`,
  )

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    saveCustomTemplate({
      id: existing?.id,
      title,
      description: description || undefined,
      body,
    })
    onSaved()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold mb-1">
          {existing ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
        </h1>
        <p className="text-sm text-[var(--color-ink-soft)]">
          Schreibe deinen Brief-Text. Nutze <code className="font-mono bg-[var(--color-bg-alt)] px-1">{'{{feldname}}'}</code>{' '}
          für Platzhalter — diese werden beim Generieren durch deine Eingaben ersetzt.
        </p>
      </header>

      <form onSubmit={onSubmit} className="bg-white border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Titel *</span>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z. B. „Mein Standard-Widerspruch GewO"
            className="w-full mt-1 border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
            required
            autoFocus
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Beschreibung (optional)</span>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full mt-1 border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Brief-Text *</span>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={16}
            className="w-full mt-1 border border-[var(--color-border)] rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-[var(--color-gold)]"
            required
          />
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Platzhalter-Syntax: <code className="font-mono">{'{{name}}'}</code>. Erkannte Platzhalter: <strong>{extractPlaceholdersClient(body).join(', ') || '—'}</strong>
          </p>
        </label>
        <div className="flex items-center gap-2 pt-4 border-t border-[var(--color-border)]">
          <button type="submit" className="inline-flex items-center gap-1.5 bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 text-sm hover:opacity-90">
            <Save className="w-4 h-4" /> Speichern
          </button>
          <button type="button" onClick={onCancel} className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}

function extractPlaceholdersClient(body: string): string[] {
  const set = new Set<string>()
  for (const m of body.matchAll(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi)) set.add(m[1])
  return Array.from(set)
}

// Legacy export for tests/external references
export { ALL_BUILTIN_TEMPLATES }
