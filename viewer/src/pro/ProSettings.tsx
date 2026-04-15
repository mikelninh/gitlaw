/**
 * Kanzlei branding settings — drives the letterhead on every PDF export.
 *
 * Logo upload is restricted to ~200 KB to keep localStorage healthy. We
 * store a base64 data URL so PDFs render without any network request.
 */

import { useEffect, useRef, useState } from 'react'
import { Save, Upload, Trash2, AlertTriangle, Sparkles, Download, FileSignature, Cloud, RefreshCw, Shield } from 'lucide-react'
import { eraseAllProData, getSettings, saveSettings } from './store'
import { KANZLEI_PRESETS, loadDemoData, isDemoLoaded } from './demo-data'
import { isDsgvoModusActive, setDsgvoModusActive } from './anonymize'
import {
  downloadSnapshotFile,
  getKanzleiKey,
  importSnapshotFile,
  isCloudSyncEnabled,
  pullFromCloud,
  pushToCloud,
  setCloudSyncEnabled,
  setKanzleiKey,
} from './sync'
import { generateAvvPdf } from './avv-pdf'
import type { KanzleiSettings } from './types'

const MAX_LOGO_BYTES = 200 * 1024  // 200 KB

export default function ProSettings() {
  const [settings, setSettings] = useState<KanzleiSettings>(getSettings())
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  function update<K extends keyof KanzleiSettings>(key: K, value: KanzleiSettings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
    setSavedAt(null)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveSettings(settings)
    setSavedAt(new Date().toLocaleTimeString('de-DE'))
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoError(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(`Logo zu groß (${Math.round(file.size / 1024)} KB). Max. 200 KB.`)
      return
    }
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setLogoError('Nur PNG oder JPEG.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      update('logoDataUrl', reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function clearLogo() {
    update('logoDataUrl', undefined)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleEraseAll() {
    if (
      !confirm(
        'Alle GitLaw-Pro-Daten in diesem Browser unwiderruflich löschen?\n\n' +
          'Dazu gehören: Kanzlei-Profil, Mandant:innen-Akten, Recherchen, Schreiben, Audit-Log, Beta-Token.',
      )
    )
      return
    eraseAllProData()
    window.location.hash = '#/pro'
    window.location.reload()
  }

  function handleLoadPreset(key: string) {
    const preset = KANZLEI_PRESETS.find(p => p.key === key)
    if (!preset) return
    if (isDemoLoaded()) {
      if (
        !confirm(
          `Demo-Daten wurden bereits geladen.\n\nZum Wechseln auf „${preset.label}" zuerst alle Pro-Daten löschen (Notausgang unten) und dann neu laden.`,
        )
      )
        return
      return
    }
    const { caseCount } = loadDemoData(key)
    alert(
      `✓ Preset „${preset.label}" geladen.\n\n` +
        `• Kanzlei-Profil gesetzt\n` +
        `• ${caseCount} Mandant:innen-Akten mit Recherche + Schreiben angelegt\n\n` +
        `Öffne Übersicht oder Akten, um die Demo zu testen.`,
    )
    window.location.hash = '#/pro'
    window.location.reload()
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="h-page">Kanzlei-Profil</h1>
        <p className="text-sm text-[var(--color-ink-soft)]">
          Diese Angaben erscheinen als Briefkopf auf jedem PDF, das du aus GitLaw Pro
          exportierst (Recherche-Notizen, Schreiben, Audit-Logs).
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6 bg-white border border-[var(--color-border)] rounded-2xl p-6">
        {/* Kanzlei */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name der Kanzlei" required>
            <input
              type="text"
              value={settings.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Kanzlei Müller & Partner mbB"
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
            />
          </Field>
          <Field label="Anwält:in (für Audit-Log + Signatur)" required>
            <input
              type="text"
              value={settings.anwaltName}
              onChange={e => update('anwaltName', e.target.value)}
              placeholder="Rechtsanwältin Maria Müller"
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
            />
          </Field>
        </div>

        <Field label="Anschrift">
          <textarea
            value={settings.address}
            onChange={e => update('address', e.target.value)}
            placeholder="Beispielstraße 1&#10;10115 Berlin"
            rows={3}
            className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Kontakt-Zeile">
            <input
              type="text"
              value={settings.contact}
              onChange={e => update('contact', e.target.value)}
              placeholder="Tel. 030 / 12345-0  ·  kanzlei@example.de"
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
            />
          </Field>
          <Field label="Kammer-ID (optional)">
            <input
              type="text"
              value={settings.kammerId || ''}
              onChange={e => update('kammerId', e.target.value)}
              placeholder="RAK Berlin Nr. 12345"
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--color-gold)]"
            />
          </Field>
        </div>

        {/* Logo */}
        <Field
          label="Logo"
          hint="PNG oder JPEG, max. 200 KB. Wird oben rechts auf jedem PDF-Briefkopf platziert."
        >
          {settings.logoDataUrl ? (
            <div className="flex items-center gap-4">
              <img
                src={settings.logoDataUrl}
                alt="Kanzlei-Logo"
                className="h-16 max-w-[140px] object-contain border border-[var(--color-border)] rounded"
              />
              <button
                type="button"
                onClick={clearLogo}
                className="text-sm text-red-700 flex items-center gap-1 hover:underline"
              >
                <Trash2 className="w-4 h-4" /> Entfernen
              </button>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-[var(--color-border)] rounded-lg cursor-pointer hover:bg-[var(--color-bg-alt)]">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Logo hochladen</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={onLogoChange}
                className="hidden"
              />
            </label>
          )}
          {logoError && <p className="mt-2 text-sm text-red-700">{logoError}</p>}
        </Field>

        {/* Submit */}
        <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-[var(--color-ink)] text-white rounded-lg px-4 py-2 hover:opacity-90"
          >
            <Save className="w-4 h-4" /> Speichern
          </button>
          {savedAt && (
            <span className="text-sm text-[var(--color-green)]">Gespeichert um {savedAt}</span>
          )}
        </div>
      </form>

      {/* Demo-Presets */}
      <section className="bg-white border border-[var(--color-border)] rounded-2xl p-6">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-gold)]" /> Demo-Daten laden
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)] mb-4">
          Für Pitch-Demos oder schnelles Probieren: ein Preset füllt Kanzlei-Profil, drei Mandant:innen-Akten,
          eine KI-Recherche je Akte und ein vorgeneriertes Schreiben. PDFs erscheinen direkt auf dem Briefkopf des Presets.
        </p>
        {isDemoLoaded() && (
          <div className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
            Demo ist bereits geladen. Zum Wechseln erst unten „Alle Pro-Daten löschen" nutzen.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {KANZLEI_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => handleLoadPreset(p.key)}
              disabled={isDemoLoaded()}
              className="text-left border border-[var(--color-border)] rounded-lg p-3 hover:border-[var(--color-gold)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-semibold text-sm">{p.label}</div>
              <div className="text-xs text-[var(--color-ink-muted)] mt-0.5">{p.tagline}</div>
              <div className="text-xs text-[var(--color-ink-soft)] mt-2">{p.cases.length} Akten · Kanzlei-Branding</div>
            </button>
          ))}
        </div>
      </section>

      {/* DSGVO-Modus: Auto-Anonymisierung */}
      <DsgvoModusSection />

      {/* DSGVO / AVV */}
      <section className="bg-white border border-[var(--color-border)] rounded-2xl p-6">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-[var(--color-gold)]" /> DSGVO-Vorlagen
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)] mb-4">
          Auftragsverarbeitungsvertrag (AVV) als Entwurf-PDF auf deinem Briefkopf — Basis für die
          Verträge mit deinen technischen Dienstleistern.
        </p>
        <button
          onClick={() => generateAvvPdf(settings)}
          disabled={!settings.name}
          className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)] disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> AVV-Entwurf als PDF
        </button>
        {!settings.name && (
          <p className="text-xs text-amber-700 mt-2">
            Bitte zuerst Kanzlei-Profil oben ausfüllen und speichern.
          </p>
        )}
        <p className="text-xs text-[var(--color-ink-muted)] mt-3 italic">
          Hinweis: Mustertext-Entwurf, nicht anwaltlich geprüft. Vor produktivem Einsatz mit deiner
          Datenschutz-Beratung finalisieren.
        </p>
      </section>

      {/* Sync */}
      <SyncSection />

      {/* Datenschutz / Notausgang */}
      <section className="bg-white border border-red-200 rounded-2xl p-6">
        <h2 className="font-semibold mb-2 flex items-center gap-2 text-red-800">
          <AlertTriangle className="w-4 h-4" /> Alle lokalen Pro-Daten löschen
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)] mb-4">
          Löscht Profil, Akten, Recherchen, Schreiben, Audit-Log und Beta-Token aus diesem Browser.
          Da Pro-Daten aktuell nur lokal gespeichert sind, ist die Löschung sofort und unwiderruflich.
        </p>
        <button
          onClick={handleEraseAll}
          className="text-sm text-red-700 underline hover:no-underline"
        >
          Jetzt alle Pro-Daten dieses Browsers löschen
        </button>
      </section>
    </div>
  )
}

function DsgvoModusSection() {
  const [active, setActiveLocal] = useState(isDsgvoModusActive())
  function toggle() {
    const next = !active
    setDsgvoModusActive(next)
    setActiveLocal(next)
  }
  return (
    <section className="bg-white border-2 border-green-200 rounded-2xl p-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-700" /> DSGVO-Schutz-Modus
            {active && (
              <span className="text-xs uppercase font-semibold text-green-800 bg-green-100 border border-green-300 rounded px-1.5 py-0.5">
                aktiv
              </span>
            )}
          </h2>
          <p className="text-sm text-[var(--color-ink-soft)] max-w-2xl">
            Wenn aktiv: vor jeder KI-Anfrage werden personenbezogene Daten (Namen, Adressen, IBAN, Telefon,
            Steuer-IDs, Aktenzeichen, Geburtsdaten, Firmen) durch Platzhalter ersetzt. Empfehlung für
            Mandant:innen-bezogene Recherchen ohne abgeschlossenen AVV mit OpenAI.
          </p>
        </div>
        <button
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
            active ? 'bg-green-700' : 'bg-[var(--color-border)]'
          }`}
          aria-label={active ? 'DSGVO-Modus deaktivieren' : 'DSGVO-Modus aktivieren'}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              active ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-[var(--color-ink-muted)] mt-3 italic">
        14 Pattern-Kategorien: E-Mail, IBAN, BIC, Telefon, Steuer-ID, SV-Nr., Adresse, PLZ, Aktenzeichen,
        Geburtsdatum, Firmen (GmbH/AG/UG/SE/KG), Personennamen mit Titel. Whitelist verhindert
        Falsch-Anonymisierung von Rechtsbegriffen (BGB, StGB, Berlin etc.).
      </p>
    </section>
  )
}

function SyncSection() {
  const [kanzleiKey, setKanzleiKeyLocal] = useState(getKanzleiKey())
  const [cloudSync, setCloudSyncLocal] = useState(isCloudSyncEnabled())
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    downloadSnapshotFile()
    setMsg('Snapshot heruntergeladen.')
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setMsg(null)
    try {
      const counts = await importSnapshotFile(file, importMode)
      setMsg(
        `Import erfolgreich (${importMode}): ` +
          [
            counts.cases > 0 && `${counts.cases} Akten`,
            counts.research > 0 && `${counts.research} Recherchen`,
            counts.letters > 0 && `${counts.letters} Schreiben`,
            counts.intakes > 0 && `${counts.intakes} Eingänge`,
            counts.templates > 0 && `${counts.templates} Vorlagen`,
            counts.notes > 0 && `${counts.notes} Notizen`,
          ].filter(Boolean).join(' · ') ||
          'Keine neuen Einträge — Daten waren bereits aktuell.',
      )
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setMsg('Import fehlgeschlagen: ' + (err instanceof Error ? err.message : 'unbekannt'))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handlePush() {
    setBusy(true)
    setMsg(null)
    try {
      await pushToCloud()
      setMsg('In die Cloud hochgeladen.')
    } catch (err) {
      setMsg('Cloud-Upload fehlgeschlagen: ' + (err instanceof Error ? err.message : 'unbekannt'))
    } finally {
      setBusy(false)
    }
  }

  async function handlePull() {
    setBusy(true)
    setMsg(null)
    const result = await pullFromCloud()
    setBusy(false)
    if (result.ok && result.counts) {
      setMsg(`Aus der Cloud aktualisiert.`)
      setTimeout(() => window.location.reload(), 1500)
    } else if (result.ok) {
      setMsg('Cloud ist leer — nichts zum Synchronisieren.')
    } else {
      setMsg('Pull fehlgeschlagen: ' + (result.error || 'unbekannt'))
    }
  }

  function handleToggleCloud() {
    const next = !cloudSync
    setCloudSyncEnabled(next)
    setCloudSyncLocal(next)
    setMsg(next ? 'Cloud-Sync aktiviert.' : 'Cloud-Sync deaktiviert.')
  }

  function handleSetKey() {
    setKanzleiKey(kanzleiKey)
    setMsg('Kanzlei-Schlüssel gespeichert.')
  }

  return (
    <section className="bg-white border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-1">
          <Cloud className="w-4 h-4 text-[var(--color-gold)]" /> Sync &amp; Backup
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)]">
          Akten zwischen Browsern oder mit Kolleg:innen teilen. Zwei Wege: Datei-Export/-Import
          (manuell, sofort einsatzbereit) oder Cloud-Sync (automatisch, sobald Vercel-KV
          serverseitig provisioniert ist).
        </p>
      </div>

      {/* Manuell */}
      <div className="border border-[var(--color-border)] rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-sm">📁 Datei-Sync (sofort verfügbar)</h3>
        <p className="text-xs text-[var(--color-ink-soft)]">
          Exportiere alle Pro-Daten als JSON-Datei. Schicke sie z. B. per E-Mail an deine
          Kollegin. Sie importiert die Datei → eure Akten sind synchron. Wiederhole bei Bedarf.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 text-sm bg-[var(--color-ink)] text-white rounded-lg px-3 py-1.5 hover:opacity-90"
          >
            <Download className="w-4 h-4" /> Snapshot exportieren
          </button>
          <label className="inline-flex items-center gap-1.5 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)] cursor-pointer">
            <Upload className="w-4 h-4" /> JSON importieren
            <input ref={fileRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
          </label>
          <select
            value={importMode}
            onChange={e => setImportMode(e.target.value as 'merge' | 'replace')}
            className="text-xs border border-[var(--color-border)] rounded px-2 py-1"
          >
            <option value="merge">Zusammenführen (last-write-wins)</option>
            <option value="replace">Vollständig ersetzen</option>
          </select>
        </div>
      </div>

      {/* Cloud */}
      <div className="border border-[var(--color-border)] rounded-lg p-4 space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h3 className="font-medium text-sm">☁ Cloud-Sync (Beta — vorbereitet)</h3>
          <label className="inline-flex items-center gap-2 text-xs">
            <input type="checkbox" checked={cloudSync} onChange={handleToggleCloud} />
            aktivieren
          </label>
        </div>
        <p className="text-xs text-[var(--color-ink-soft)]">
          Werner und Jasmin geben den gleichen Kanzlei-Schlüssel ein → ihre Browser synchronisieren
          sich automatisch via verschlüsselter Cloud (Vercel KV). Der Schlüssel ist die einzige
          „Auth" — nur teilen mit Personen, denen du voll vertraust.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={kanzleiKey}
            onChange={e => setKanzleiKeyLocal(e.target.value)}
            className="flex-1 font-mono text-xs border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none focus:border-[var(--color-gold)]"
          />
          <button
            onClick={handleSetKey}
            className="text-xs bg-[var(--color-ink)] text-white rounded px-2 py-1 hover:opacity-90"
          >
            Schlüssel setzen
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePush}
            disabled={!cloudSync || busy}
            className="inline-flex items-center gap-1.5 text-xs bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)] disabled:opacity-50"
          >
            <Cloud className="w-3.5 h-3.5" /> Hochladen
          </button>
          <button
            onClick={handlePull}
            disabled={!cloudSync || busy}
            className="inline-flex items-center gap-1.5 text-xs bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-gold)] disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Aus Cloud aktualisieren
          </button>
        </div>
        <p className="text-xs text-amber-700 italic">
          Hinweis: Cloud-Sync benötigt serverseitige Provisionierung (Vercel KV). Falls bei
          „Hochladen" 503 erscheint, ist der Backend-Storage noch nicht aktiviert — dann bitte
          weiter Datei-Sync nutzen.
        </p>
      </div>

      {msg && (
        <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded p-2">
          {msg}
        </div>
      )}
    </section>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </span>
        {hint && <span className="text-xs text-[var(--color-ink-muted)]">{hint}</span>}
      </div>
      {children}
    </label>
  )
}
