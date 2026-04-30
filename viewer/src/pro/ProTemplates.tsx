/**
 * Lawyer letter generator.
 *
 * Zeigt gebaut-in Templates + Notariats-Specials + eigene Custom-Templates.
 * Anwält:innen können eigene Vorlagen anlegen mit {{placeholder}}-Syntax —
 * diese persistieren in localStorage und stehen dauerhaft zur Verfügung.
 */

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Download, Save, Copy, ChevronLeft, Mail, Plus, Trash2, Pencil, Star } from 'lucide-react'
import {
  ALL_BUILTIN_TEMPLATES,
  NOTAR_TEMPLATES,
  LAWYER_TEMPLATES,
  MIGRATION_TEMPLATES,
  FAMILIE_TEMPLATES,
  SOZIAL_TEMPLATES,
  STEUER_TEMPLATES,
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
  listLetters,
  listResearch,
  listTemplateUsage,
  saveCustomTemplate,
  saveLetter,
  type TemplateUsageEntry,
  toggleTemplateFavorite,
} from './store'
import type { CustomTemplate, GeneratedLetter } from './types'

type PickedTemplate =
  | { kind: 'builtin'; t: LawyerTemplate }
  | { kind: 'custom'; t: CustomTemplate }

function renderCustom(t: CustomTemplate, fields: Record<string, string>): string {
  return t.body.replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi, (_m, key) => fields[key] || `[${key}]`)
}

function splitMultiValue(value: string): string[] {
  return value
    .split(/[•·;\n]/g)
    .map(v => v.trim())
    .filter(Boolean)
}

function joinMultiValue(values: string[]): string {
  return values.join(' · ')
}

type TemplateSortMode = 'smart' | 'favorites' | 'usage'
type QuickAccessItem = {
  key: string
  title: string
  description?: string
  meta: string
  usage?: TemplateUsageEntry
  favorite: boolean
  onOpen: () => void
  onToggleFavorite: () => void
}

function makeUsageMap(entries: TemplateUsageEntry[]): Map<string, TemplateUsageEntry> {
  return new Map(entries.map(entry => [entry.templateId, entry]))
}

function compareTemplates(
  a: { id: string; title: string },
  b: { id: string; title: string },
  usage: Map<string, TemplateUsageEntry>,
  mode: TemplateSortMode,
): number {
  const ua = usage.get(a.id)
  const ub = usage.get(b.id)
  const favA = ua?.favorite ? 1 : 0
  const favB = ub?.favorite ? 1 : 0
  const countA = ua?.count || 0
  const countB = ub?.count || 0
  const lastA = ua?.lastUsedAt || ''
  const lastB = ub?.lastUsedAt || ''

  if (mode === 'favorites') {
    if (favB !== favA) return favB - favA
    if (countB !== countA) return countB - countA
    if (lastB !== lastA) return lastB.localeCompare(lastA)
    return a.title.localeCompare(b.title, 'de')
  }

  if (mode === 'usage') {
    if (countB !== countA) return countB - countA
    if (favB !== favA) return favB - favA
    if (lastB !== lastA) return lastB.localeCompare(lastA)
    return a.title.localeCompare(b.title, 'de')
  }

  if (favB !== favA) return favB - favA
  if (countB !== countA) return countB - countA
  if (lastB !== lastA) return lastB.localeCompare(lastA)
  return a.title.localeCompare(b.title, 'de')
}

function sortTemplates<T extends { id: string; title: string }>(
  templates: T[],
  usage: Map<string, TemplateUsageEntry>,
  mode: TemplateSortMode,
): T[] {
  const list = [...templates]
  if (mode === 'favorites') {
    return list
      .filter(t => usage.get(t.id)?.favorite)
      .sort((a, b) => compareTemplates(a, b, usage, mode))
  }
  return list.sort((a, b) => compareTemplates(a, b, usage, mode))
}

function compareQuickAccess(a: QuickAccessItem, b: QuickAccessItem): number {
  const favA = a.favorite ? 1 : 0
  const favB = b.favorite ? 1 : 0
  const countA = a.usage?.count || 0
  const countB = b.usage?.count || 0
  const lastA = a.usage?.lastUsedAt || ''
  const lastB = b.usage?.lastUsedAt || ''
  if (favB !== favA) return favB - favA
  if (countB !== countA) return countB - countA
  if (lastB !== lastA) return lastB.localeCompare(lastA)
  return a.title.localeCompare(b.title, 'de')
}

function TemplateCard({
  title,
  description,
  meta,
  usage,
  favorite,
  onOpen,
  onToggleFavorite,
}: {
  title: string
  description?: string
  meta: string
  usage?: TemplateUsageEntry
  favorite: boolean
  onOpen: () => void
  onToggleFavorite: () => void
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-gold)] transition-colors flex items-start gap-3">
      <button type="button" onClick={onOpen} className="text-left flex-1 min-w-0">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-[var(--color-gold)] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold mb-1 truncate">{title}</h3>
            {description && <p className="text-sm text-[var(--color-ink-soft)] mb-2">{description}</p>}
            <p className="text-xs text-[var(--color-ink-muted)] italic">{meta}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`rounded-full px-2 py-1 border ${favorite ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-[var(--color-bg-alt)] border-[var(--color-border)] text-[var(--color-ink-muted)]'}`}>
                {favorite ? 'Favorit' : (usage?.count ? `${usage.count}x genutzt` : 'noch nicht genutzt')}
              </span>
              {usage?.count ? (
                <span className="text-[var(--color-ink-muted)]">
                  zuletzt {new Date(usage.lastUsedAt).toLocaleDateString('de-DE')}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
          favorite
            ? 'border-amber-300 bg-amber-50 text-amber-600'
            : 'border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]'
        }`}
        aria-label={favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
        title={favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
      >
        <Star className="w-4 h-4" fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}

export default function ProTemplates() {
  const [params, setParams] = useSearchParams()
  const cases = useMemo(() => listCases().filter(c => c.status === 'aktiv'), [])
  const [selectedCaseId, setSelectedCaseId] = useState(params.get('case') || '')
  const refLetterId = params.get('ref') || ''
  const refResearchId = params.get('ref') || ''
  const [activeTemplate, setActiveTemplate] = useState<PickedTemplate | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [savedLetter, setSavedLetter] = useState<GeneratedLetter | null>(null)
  const [copyOk, setCopyOk] = useState(false)
  const [tick, setTick] = useState(0)
  const [editingCustom, setEditingCustom] = useState<CustomTemplate | 'new' | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [closingStyle, setClosingStyle] = useState<'kollegial' | 'freundlich' | 'neutral'>('kollegial')
  const [signoffName, setSignoffName] = useState(() => getSettings().anwaltName || '')
  const [sortMode, setSortMode] = useState<TemplateSortMode>('smart')

  const customTemplates = useMemo(() => listCustomTemplates(), [tick, editingCustom])
  const templateUsage = useMemo(() => makeUsageMap(listTemplateUsage()), [tick, savedLetter])
  const linkedLetter = selectedCaseId ? listLetters(selectedCaseId).find(l => l.id === refLetterId) : undefined
  const linkedResearch = selectedCaseId ? listResearch(selectedCaseId).find(r => r.id === refResearchId) : undefined
  const favoriteCount = useMemo(
    () => listTemplateUsage().filter(entry => entry.favorite).length,
    [tick],
  )
  const sortList = <T extends { id: string; title: string }>(items: T[]) =>
    sortTemplates(items, templateUsage, sortMode)

  const renderedBody =
    activeTemplate?.kind === 'builtin'
      ? activeTemplate.t.render(fields)
      : activeTemplate?.kind === 'custom'
        ? renderCustom(activeTemplate.t, fields)
        : ''
  const bodyWithClosing = applyClosing(renderedBody, closingStyle)
  const finalBody = signoffName.trim()
    ? `${bodyWithClosing}\n\n${signoffName.trim()}`
    : bodyWithClosing

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
  function toggleFavorite(id: string) {
    toggleTemplateFavorite(id)
    setTick(t => t + 1)
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
      body: finalBody,
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
      await navigator.clipboard.writeText(finalBody)
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
      finalBody.length > maxBodyLen
        ? finalBody.slice(0, maxBodyLen) +
          '\n\n[…verkürzt — bitte vollständigen Brief als PDF-Anhang mitsenden]'
        : finalBody
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
    const customTemplatesSorted = sortList(customTemplates)
    const lawyerTemplates = sortList(LAWYER_TEMPLATES)
    const notarTemplates = sortList(NOTAR_TEMPLATES)
    const migrationTemplates = sortList(MIGRATION_TEMPLATES)
    const familTemplates = sortList(FAMILIE_TEMPLATES)
    const sozialTemplates = sortList(SOZIAL_TEMPLATES)
    const steuerTemplates = sortList(STEUER_TEMPLATES)
    const smartQuickAccess: QuickAccessItem[] = [
      ...customTemplates.map(t => {
        const usage = templateUsage.get(t.id)
        return {
          key: `custom:${t.id}`,
          title: t.title,
          description: t.description,
          meta: `${t.placeholders.length} Platzhalter`,
          usage,
          favorite: !!usage?.favorite,
          onOpen: () => pickCustom(t.id),
          onToggleFavorite: () => toggleFavorite(t.id),
        }
      }),
      ...LAWYER_TEMPLATES.map(t => {
        const usage = templateUsage.get(t.id)
        return {
          key: `lawyer:${t.id}`,
          title: t.title,
          description: t.description,
          meta: `Wann: ${t.useCase}`,
          usage,
          favorite: !!usage?.favorite,
          onOpen: () => pickBuiltin(t.id),
          onToggleFavorite: () => toggleFavorite(t.id),
        }
      }),
      ...NOTAR_TEMPLATES.map(t => {
        const usage = templateUsage.get(t.id)
        return {
          key: `notar:${t.id}`,
          title: t.title,
          description: t.description,
          meta: `Wann: ${t.useCase}`,
          usage,
          favorite: !!usage?.favorite,
          onOpen: () => pickBuiltin(t.id),
          onToggleFavorite: () => toggleFavorite(t.id),
        }
      }),
      ...MIGRATION_TEMPLATES.map(t => {
        const usage = templateUsage.get(t.id)
        return {
          key: `migration:${t.id}`,
          title: t.title,
          description: t.description,
          meta: `Wann: ${t.useCase}`,
          usage,
          favorite: !!usage?.favorite,
          onOpen: () => pickBuiltin(t.id),
          onToggleFavorite: () => toggleFavorite(t.id),
        }
      }),
      ...FAMILIE_TEMPLATES.map(t => {
        const usage = templateUsage.get(t.id)
        return {
          key: `familie:${t.id}`,
          title: t.title,
          description: t.description,
          meta: `Wann: ${t.useCase}`,
          usage,
          favorite: !!usage?.favorite,
          onOpen: () => pickBuiltin(t.id),
          onToggleFavorite: () => toggleFavorite(t.id),
        }
      }),
      ...SOZIAL_TEMPLATES.map(t => {
        const usage = templateUsage.get(t.id)
        return {
          key: `sozial:${t.id}`,
          title: t.title,
          description: t.description,
          meta: `Wann: ${t.useCase}`,
          usage,
          favorite: !!usage?.favorite,
          onOpen: () => pickBuiltin(t.id),
          onToggleFavorite: () => toggleFavorite(t.id),
        }
      }),
      ...STEUER_TEMPLATES.map(t => {
        const usage = templateUsage.get(t.id)
        return {
          key: `steuer:${t.id}`,
          title: t.title,
          description: t.description,
          meta: `Wann: ${t.useCase}`,
          usage,
          favorite: !!usage?.favorite,
          onOpen: () => pickBuiltin(t.id),
          onToggleFavorite: () => toggleFavorite(t.id),
        }
      }),
    ].sort(compareQuickAccess).slice(0, 6)
    return (
      <div className="space-y-6">
        <header>
          <h1 className="h-page">Schreiben</h1>
          <p className="text-sm text-[var(--color-ink-soft)]">
            Eingebaute Vorlagen + deine eigenen. Füllen → Preview → PDF auf deinem Briefkopf.
          </p>
        </header>

        {sortMode === 'smart' && (
          <section>
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)] mb-3">
              Schnellzugriff
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {smartQuickAccess.map(item => (
                <TemplateCard
                  key={item.key}
                  title={item.title}
                  description={item.description}
                  meta={item.meta}
                  usage={item.usage}
                  favorite={item.favorite}
                  onOpen={item.onOpen}
                  onToggleFavorite={item.onToggleFavorite}
                />
              ))}
            </div>
          </section>
        )}

        <div id="writing-template-browser" className="flex flex-wrap items-center gap-2 text-xs bg-white border border-[var(--color-border)] rounded-2xl p-2">
          <span className="text-[var(--color-ink-muted)] px-2">Sortierung:</span>
          {([
            ['smart', 'Smart'],
            ['favorites', `Favoriten${favoriteCount ? ` (${favoriteCount})` : ''}`],
            ['usage', 'Meist genutzt'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={`px-3 py-1.5 rounded-lg border ${
                sortMode === mode
                  ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                  : 'bg-white border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-ink)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {customTemplatesSorted.length > 0 && (
          <section>
            <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)] mb-3">
              Eigene Vorlagen ({customTemplatesSorted.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customTemplatesSorted.map(t => {
                const usage = templateUsage.get(t.id)
                return (
                <div key={t.id} className="space-y-3">
                  <TemplateCard
                    title={t.title}
                    description={t.description}
                    meta={`${t.placeholders.length} Platzhalter · zuletzt ${new Date(t.updatedAt).toLocaleDateString('de-DE')}`}
                    usage={usage}
                    favorite={!!usage?.favorite}
                    onOpen={() => pickCustom(t.id)}
                    onToggleFavorite={() => toggleFavorite(t.id)}
                  />
                  <div className="flex items-center justify-end gap-2 pt-0">
                    <button
                      onClick={() => setEditingCustom(t)}
                      className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> bearbeiten
                    </button>
                    {confirmingDelete === t.id ? (
                      <span className="inline-flex items-center gap-2 text-xs animate-fade-slide-up">
                        <span className="text-amber-900">Wirklich?</span>
                        <button
                          onClick={() => {
                            deleteCustomTemplate(t.id)
                            setConfirmingDelete(null)
                            setTick(x => x + 1)
                          }}
                          className="text-[var(--color-danger)] font-medium hover:underline"
                        >
                          Ja
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(null)}
                          className="text-[var(--color-ink-muted)]"
                        >
                          Abbrechen
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmingDelete(t.id)
                          setTimeout(() => setConfirmingDelete(prev => prev === t.id ? null : prev), 5000)
                        }}
                        className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> löschen
                      </button>
                    )}
                  </div>
                </div>
                )
              })}
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
            {lawyerTemplates.map(t => (
              <TemplateCard
                key={t.id}
                title={t.title}
                description={t.description}
                meta={`Wann: ${t.useCase}`}
                usage={templateUsage.get(t.id)}
                favorite={!!templateUsage.get(t.id)?.favorite}
                onOpen={() => pickBuiltin(t.id)}
                onToggleFavorite={() => toggleFavorite(t.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)] mb-3">
            Eingebaute Vorlagen — Notariat &amp; Erbrecht
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notarTemplates.map(t => (
              <TemplateCard
                key={t.id}
                title={t.title}
                description={t.description}
                meta={`Wann: ${t.useCase}`}
                usage={templateUsage.get(t.id)}
                favorite={!!templateUsage.get(t.id)?.favorite}
                onOpen={() => pickBuiltin(t.id)}
                onToggleFavorite={() => toggleFavorite(t.id)}
              />
            ))}
          </div>
        </section>

        <TemplateSection title="Migrationsrecht" templates={migrationTemplates} pickBuiltin={pickBuiltin} usage={templateUsage} sortMode={sortMode} onToggleFavorite={toggleFavorite} />
        <TemplateSection title="Familienrecht" templates={familTemplates} pickBuiltin={pickBuiltin} usage={templateUsage} sortMode={sortMode} onToggleFavorite={toggleFavorite} />
        <TemplateSection title="Sozialrecht" templates={sozialTemplates} pickBuiltin={pickBuiltin} usage={templateUsage} sortMode={sortMode} onToggleFavorite={toggleFavorite} />
        <TemplateSection title="Steuerrecht" templates={steuerTemplates} pickBuiltin={pickBuiltin} usage={templateUsage} sortMode={sortMode} onToggleFavorite={toggleFavorite} />
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
        <h1 className="h-page">{template.title}</h1>
        {activeTemplate.kind === 'builtin' && (
          <p className="text-sm text-[var(--color-ink-soft)]">{template.description}</p>
        )}
        {activeTemplate.kind === 'custom' && activeTemplate.t.description && (
          <p className="text-sm text-[var(--color-ink-soft)]">{activeTemplate.t.description}</p>
        )}
      </header>

      {linkedLetter && (
        <section className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide text-green-800 font-semibold">Verknüpftes Schreiben</p>
              <p className="font-medium mt-1">{linkedLetter.templateTitle}</p>
              <p className="text-xs text-green-900/80 mt-1">
                {new Date(linkedLetter.createdAt).toLocaleDateString('de-DE')}
                {linkedLetter.caseId ? ` · ${getCase(linkedLetter.caseId)?.aktenzeichen || ''}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const builtin = getAnyBuiltinTemplate(linkedLetter.templateId)
                const custom = getCustomTemplate(linkedLetter.templateId)
                if (builtin) setActiveTemplate({ kind: 'builtin', t: builtin })
                else if (custom) setActiveTemplate({ kind: 'custom', t: custom })
                setFields(linkedLetter.fields)
                setSavedLetter(linkedLetter)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="text-xs bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
            >
              In Vorlage öffnen
            </button>
          </div>
        </section>
      )}

      {linkedResearch && !linkedLetter && (
        <section className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide text-sky-800 font-semibold">Verknüpfte Recherche</p>
              <p className="font-medium mt-1">{linkedResearch.question}</p>
              <p className="text-xs text-sky-900/80 mt-1">
                {new Date(linkedResearch.createdAt).toLocaleDateString('de-DE')}
                {linkedResearch.reviewed ? ' · ✓ geprüft' : ' · ungeprüft'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('writing-template-browser')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="text-xs bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
            >
              Vorlage auswählen
            </button>
          </div>
        </section>
      )}

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
                f.id === 'rechtsgrundlage' ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {['§ 147 StPO', '§ 406e StPO', '§ 29 VwVfG', '§ 25 SGB X'].map(opt => {
                        const current = splitMultiValue(fields[f.id] || '')
                        const selected = current.includes(opt)
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const next = selected
                                ? current.filter(x => x !== opt)
                                : [...current, opt]
                              setFields({ ...fields, rechtsgrundlage: joinMultiValue(next) })
                            }}
                            className={`text-[11px] px-2 py-1 rounded-full border ${
                              selected
                                ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                                : 'border-[var(--color-border)] bg-[var(--color-bg-alt)] hover:border-[var(--color-gold)] hover:bg-white'
                            }`}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                    <textarea
                      value={fields[f.id] || ''}
                      onChange={e => setFields({ ...fields, [f.id]: e.target.value })}
                      placeholder={'placeholder' in f ? f.placeholder : 'Mehrere Rechtsgrundlagen mit Trennzeichen ergänzen'}
                      rows={2}
                      className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
                    />
                  </div>
                ) : (
                <textarea
                  value={fields[f.id] || ''}
                  onChange={e => setFields({ ...fields, [f.id]: e.target.value })}
                  placeholder={'placeholder' in f ? f.placeholder : ''}
                  rows={3}
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
                />
                )
              ) : (
                <input
                  type={f.type === 'date' ? 'date' : 'text'}
                  value={fields[f.id] || ''}
                  onChange={e => setFields({ ...fields, [f.id]: e.target.value })}
                  placeholder={'placeholder' in f ? f.placeholder : ''}
                  className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
                />
              )}
              {f.id === 'rechtsgrundlage' && (
                <p className="text-xs text-[var(--color-ink-muted)] mt-1 italic">Mehrfachauswahl ist erlaubt. Klick die Vorschläge an oder ergänze frei.</p>
              )}
              {'hint' in f && f.hint && (
                <p className="text-xs text-[var(--color-ink-muted)] mt-1 italic">{f.hint}</p>
              )}
            </div>
          ))}

          <div className="pt-2 border-t border-[var(--color-border)]">
            <label className="block text-xs font-medium mb-1">Schlussformel</label>
            <select
              value={closingStyle}
              onChange={e => setClosingStyle(e.target.value as typeof closingStyle)}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
            >
              <option value="kollegial">Mit freundlichen kollegialen Grüßen</option>
              <option value="freundlich">Mit freundlichen Grüßen</option>
              <option value="neutral">Beste Grüße</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Name unter der Schlussformel</label>
            <input
              type="text"
              value={signoffName}
              onChange={e => setSignoffName(e.target.value)}
              placeholder="z. B. Mikel Ninh oder Kanzlei Thai Bao Nguyen"
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold)]"
            />
            <p className="text-xs text-[var(--color-ink-muted)] mt-1 italic">
              Wird direkt unter die Grußformel gesetzt, damit E-Mail und PDF sofort fertig sind.
            </p>
          </div>
        </form>

        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)]">Vorschau</h2>
          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-lg p-3 max-h-[500px] overflow-y-auto">
            {finalBody}
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
              <button onClick={onExportPDF} className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90">
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

function applyClosing(body: string, style: 'kollegial' | 'freundlich' | 'neutral'): string {
  const replacement =
    style === 'freundlich'
      ? 'Mit freundlichen Grüßen'
      : style === 'neutral'
        ? 'Beste Grüße'
        : 'Mit freundlichen kollegialen Grüßen'
  return body.replace(/Mit freundlichen(?: kollegialen)? Grüßen/g, replacement)
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
        <h1 className="h-page">
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

function TemplateSection({
  title, templates, pickBuiltin, usage, sortMode, onToggleFavorite,
}: {
  title: string
  templates: LawyerTemplate[]
  pickBuiltin: (id: string) => void
  usage: Map<string, TemplateUsageEntry>
  sortMode: TemplateSortMode
  onToggleFavorite: (id: string) => void
}) {
  const visible = sortTemplates(templates, usage, sortMode)
  if (sortMode === 'favorites' && visible.length === 0) return null
  return (
    <section>
      <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--color-ink-muted)] mb-3">
        Eingebaute Vorlagen — {title} <span className="text-[var(--color-ink-muted)] normal-case font-normal">({visible.length})</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map(t => {
          const meta = usage.get(t.id)
          return (
          <TemplateCard
            key={t.id}
            title={t.title}
            description={t.description}
            meta={`Wann: ${t.useCase}`}
            usage={meta}
            favorite={!!meta?.favorite}
            onOpen={() => pickBuiltin(t.id)}
            onToggleFavorite={() => onToggleFavorite(t.id)}
          />
          )
        })}
      </div>
    </section>
  )
}
