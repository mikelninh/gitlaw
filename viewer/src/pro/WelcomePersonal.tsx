/**
 * Generische personalisierte Welcome-Page für jeden Beta-Tester.
 *
 * Konfiguriert über `welcome-personas.ts`. Jede Persona hat eigenen
 * Slug (/#/bao, /#/rubin, /#/werner, /#/jasmin), eigene Highlights,
 * eigenen Token + Preset, eigene Personal-Note.
 *
 * Inspiration: Apple Welcome-Card-Stil. Eine klare CTA, viel Whitespace,
 * persönlicher Ton in den richtigen Momenten.
 */

import { Link, useParams } from 'react-router-dom'
import { Scale, Sparkles, ArrowRight } from 'lucide-react'
import QrCard from './QrCard'
import { PERSONAS, type WelcomeHighlight } from './welcome-personas'

export default function WelcomePersonal({ personaSlug }: { personaSlug?: string }) {
  const baseUrl = import.meta.env.BASE_URL
  const params = useParams<{ slug: string }>()
  // Slug kommt entweder aus dem Route-Param (/willkommen/:slug) oder als
  // Prop (für hardcoded Routes wie /bao, /rubin, /werner, /jasmin).
  const slug = personaSlug || params.slug
  const persona = slug ? PERSONAS[slug] : undefined

  if (!persona) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-[var(--color-ink-muted)]">Persönliche Begrüßung nicht gefunden.</p>
          <Link to="/pro" className="text-sm underline mt-2 inline-block">
            Zur regulären Anmeldung →
          </Link>
        </div>
      </div>
    )
  }

  const proLink = `${baseUrl}#/pro?invite=${persona.betaToken}&preset=${persona.presetKey}`
  const intakeViLink = `${baseUrl}#/intake/demo-nguyen?lang=vi`
  const publicLink = `${baseUrl}#/`
  const proCasesLink = `${baseUrl}#/pro/akten`
  const proResearchLink = `${baseUrl}#/pro/recherche`
  const isBao = slug === 'bao'
  const feedbackMailto = `mailto:mikel_ninh@yahoo.de?subject=${encodeURIComponent(`GitLaw Pro Beta Feedback — ${persona.fullName}`)}&body=${encodeURIComponent(
    `Hi Mikel,\n\nhier mein kurzes Beta-Feedback zu GitLaw Pro:\n\n1. Was war sofort nützlich?\n- \n\n2. Was war unklar oder zu langsam?\n- \n\n3. Was fehlt für echte tägliche Nutzung?\n- \n\n4. Würde ich das Assistenz/Mitarbeiter:innen geben?\n- \n\n5. Mein wichtigster Wunsch fürs nächste Release:\n- \n`
  )}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-gold-light)] via-[var(--color-bg)] to-[var(--color-bg)]">
      {/* Top bar */}
      <header className="border-b border-[var(--color-border)] bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Scale className="w-5 h-5 text-[var(--color-gold)]" />
            GitLaw <span className="text-[var(--color-gold)]">Pro</span>
            <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
              für dich, persönlich
            </span>
          </div>
          <Link to="/preise" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            Preise
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="inline-block mb-6">
          <span className="text-5xl">{persona.heroEmoji}</span>
        </div>
        <h1
          className="text-4xl md:text-5xl font-semibold mb-4 leading-tight"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Hallo {persona.firstName},
          <br />
          bitte teste heute nur den Kernflow.
        </h1>
        <p className="text-lg text-[var(--color-ink-soft)] max-w-xl mx-auto leading-relaxed">
          GitLaw Pro ist eine App für den anwaltlichen Alltag: Intake, Akte, Recherche und Schreiben in einem ruhigen Arbeitsfluss. 15 bis 20 Minuten reichen. Wenn du den Ablauf einmal komplett durchgehst, ist das wertvoller als jedes weitere Feature.
        </p>
        <p className="text-sm text-[var(--color-ink-muted)] mt-4 italic">— Mikel</p>
      </section>

      {/* Primary CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <a
          href={proLink}
          className="block bg-[var(--color-ink)] text-white rounded-2xl p-6 hover:opacity-90 transition-all hover:shadow-lg group"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 text-sm text-[var(--color-gold)] mb-1">
                <Sparkles className="w-4 h-4" /> 1 Klick — eingerichtet
              </div>
              <h2 className="text-2xl font-semibold">App starten</h2>
              <p className="text-sm text-white/70 mt-1">
                Login auto, dein Branding-Setup geladen, 3 Demo-Akten passend zu deiner Praxis
              </p>
            </div>
            <ArrowRight className="w-8 h-8 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </a>
      </section>

      {isBao && (
        <section className="max-w-4xl mx-auto px-4 pb-16 space-y-6">
          <div className="bg-[var(--color-ink)] text-white rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-2">Wenn du 15–20 Min hast, teste bitte nur den Kernflow</h2>
            <ol className="text-sm text-white/85 space-y-1.5 list-decimal list-inside mb-4">
              <li>Pro starten</li>
              <li>VN-Intake testen</li>
              <li>Eingang / Akte prüfen</li>
              <li>Recherche mit 1–2 Folgefragen testen</li>
              <li>Kurz Feedback schicken</li>
            </ol>
            <p className="text-sm text-white/70 mb-4">
              Auf der Seite ist alles direkt vorbereitet, inkl. Feedback-Button.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a href={proLink} className="rounded-xl bg-white text-[var(--color-ink)] px-4 py-3 text-sm font-semibold text-center hover:opacity-90">
                1. Pro starten
              </a>
              <a href={intakeViLink} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-center hover:bg-white/10">
                2. VN-Intake testen
              </a>
              <a href={feedbackMailto} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-center hover:bg-white/10">
                3. Feedback senden
              </a>
            </div>
          </div>

          <div className="bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-2">Mir hilft vor allem</h2>
            <ul className="text-sm text-[var(--color-ink-soft)] space-y-1.5">
              <li>• was dir sofort Zeit spart</li>
              <li>• was noch für echte tägliche Nutzung fehlt</li>
              <li>• was unklar oder zu langsam war</li>
            </ul>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-2">Kurz zur Idee</h2>
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              Ich baue GitLaw Pro als kompaktes Kanzlei-Tool für genau die ersten Schritte im Fall:
              Eingang strukturieren, Unterlagen sauber benennen, schnell recherchieren und daraus direkt weiterarbeiten.
              Für dich habe ich den Flow auf vietnamesischsprachige Mandate und Migrations-/Strafrechtsnähe zugeschnitten.
            </p>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-4">So testest du die Agenten am einfachsten</h2>
            <div className="space-y-3">
              <AgentStep
                title="1. Intake Agent"
                input="VN-Formular ausfüllen"
                output="strukturierter Eingang in Inbox/Akte"
                note="Kein LLM. Hier geht es um saubere Aufnahme, Sprache, Dringlichkeit und Frist-Hinweis."
              />
              <AgentStep
                title="2. Document Agent"
                input="Datei hochladen"
                output="interner Dateiname, Server-Vault, Checksumme"
                note="Kein LLM. Prüfe, ob das Dokument sauber in der Akte landet."
              />
              <AgentStep
                title="3. OCR / Translation Agent"
                input="Dokument öffnen und OCR / DE-Fassung starten"
                output="OCR-Text oder DE-Arbeitsfassung"
                note="LLM beteiligt bei Bild-OCR und Übersetzung. Bei Text/PDF-Textlayer oft ohne LLM."
              />
              <AgentStep
                title="4. Research Agent"
                input="eine echte Rechtsfrage stellen"
                output="Antwort mit Zitaten und Verlauf"
                note="LLM beteiligt. Hier ist wichtig, ob die Antwort brauchbar und vertrauenswürdig wirkt."
              />
              <AgentStep
                title="5. Drafting Agent"
                input="Vorlage wählen und Dokumenttext übernehmen"
                output="erster Entwurf / E-Mail / PDF"
                note="Wichtig ist, ob sich der Weg von Dokument -> Recherche -> Schreiben natürlich anfühlt."
              />
            </div>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-2">Für deine Praxis vorbereitet</h2>
            <ul className="text-sm text-[var(--color-ink-soft)] space-y-1.5">
              <li>• Mehrsprachiger Intake (DE/VI/TR/AR/EN) mit konsistenter Übersetzung.</li>
              <li>• Intake-Triage: Dringlichkeit + Frist-Hinweis für schnellere Priorisierung.</li>
              <li>• Anhänge mit internem Dateinamen (inkl. Kategorie + Sprache), z. B. für VI-Fotos/PDFs.</li>
              <li>• Recherche mit Folgefragen und Verlauf: vertiefen, einzeln speichern, prüfen, exportieren.</li>
              <li>• Compliance-Cockpit + Datenschutz-Preflight vor KI-Versand.</li>
              <li>• Neue Pro-Session mit Tenant-/Rollen-Schutz statt nur Browser-Beta-Token.</li>
              <li>• Serverseitiger Dokument-Vault als erster Schritt zu echtem Production-Upload.</li>
            </ul>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-2">Was heute schon belastbar ist</h2>
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">
              GitLaw Pro ist jetzt klarer als beaufsichtigter Agenten-Workflow gedacht:
              <span className="font-medium"> Intake → Dokumente → Recherche → Entwurf → Freigabe.</span>
              Für deinen Test heißt das: bitte nicht nur auf die Antwortqualität schauen, sondern ob der
              gesamte Arbeitsfluss sinnvoll, schnell und vertrauenswürdig wirkt.
            </p>
            <p className="text-xs text-[var(--color-ink-muted)] mt-3">
              Interner Live-Check zuletzt: <span className="font-medium">13 PASS / 0 BETA / 0 FAIL</span>.
              Sessions, Sync, Cases-Persistenz, Vault, Research, OCR, Translation und PDF-Textlayer laufen im Kernpfad.
            </p>
          </div>

          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-2">Direktlinks für den Test</h2>
            <ol className="text-sm text-[var(--color-ink-soft)] space-y-2 list-decimal list-inside">
              <li>
                Direkt in Pro starten:
                {' '}<a href={proLink} className="underline">GitLaw Pro öffnen</a>
              </li>
              <li>
                Public zu Pro Einstieg testen:
                {' '}<a href={publicLink} className="underline">GitLaw Public</a>
              </li>
              <li>
                Intake auf Vietnamesisch ausfüllen:
                {' '}<a href={intakeViLink} className="underline">VN Intake</a>
              </li>
              <li>
                In Pro Eingänge prüfen und als Akte anlegen:
                {' '}<a href={proCasesLink} className="underline">Akte/Inbox</a>
              </li>
              <li>
                In Recherche Erstfrage + 2 Folgefragen stellen, jede Antwort speichern:
                {' '}<a href={proResearchLink} className="underline">Recherche</a>
              </li>
              <li>Mindestens eine Antwort als „geprüft“ markieren und danach ein Schreiben daraus öffnen.</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-2">Heute noch nicht entscheidend</h2>
            <ul className="text-sm text-amber-900 space-y-1.5">
              <li>• Noch kein finaler produktiver Multi-User-/Mitarbeiterbetrieb.</li>
              <li>• Upload ist jetzt serverseitig angebunden, aber noch nicht der finale EU-Storage-/Worker-Stand.</li>
              <li>• Heute bitte vor allem UX, Intake, Recherche und Arbeitsfluss bewerten.</li>
            </ul>
          </div>

          <div className="bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-2">Feedback, das uns am meisten hilft</h2>
            <p className="text-sm text-[var(--color-ink-soft)] mb-2">
              Bitte kurz als Stichpunkte schicken:
            </p>
            <ul className="text-sm text-[var(--color-ink-soft)] space-y-1.5">
              <li>• Was spart dir sofort Zeit (und wie viel pro Fall)?</li>
              <li>• Was fehlt für echte tägliche Nutzung?</li>
              <li>• Wo war etwas unklar oder zu langsam?</li>
              <li>• Würdest du das deiner Assistenz geben? Wenn nein: warum?</li>
              <li>• Welche 1-2 Features müssen als Nächstes kommen?</li>
            </ul>
            <a
              href={feedbackMailto}
              className="inline-flex mt-4 text-sm font-medium underline underline-offset-2 hover:text-[var(--color-ink)]"
            >
              Feedback-Mail vorbereiten
            </a>
          </div>
        </section>
      )}

      {/* Highlights — was speziell für sie gebaut wurde */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-center text-sm uppercase tracking-wider text-[var(--color-ink-muted)] mb-8">
          Speziell für deine Praxis
        </h2>
        <div className={`grid gap-6 ${persona.highlights.length === 1 ? 'grid-cols-1 max-w-xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
          {persona.highlights.map((h, i) => (
            <HighlightCard key={i} highlight={h} />
          ))}
        </div>
      </section>

      {/* Personal note */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
        <div className="bg-white/60 backdrop-blur-sm border border-[var(--color-border)] rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-[var(--color-ink-soft)] italic leading-relaxed">
            „{persona.personalNote}"
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">— Mikel</p>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-ink-muted)]">
        <p>
          Ein persönlicher Beta-Zugang.{' '}
          <a href={proLink} className="underline hover:text-[var(--color-ink)]">App starten</a>
          {' · '}
          <Link to="/preise" className="underline hover:text-[var(--color-ink)]">Preise</Link>
        </p>
      </footer>
    </div>
  )
}

function HighlightCard({ highlight: h }: { highlight: WelcomeHighlight }) {
  const baseUrl = import.meta.env.BASE_URL
  const intakeUrl = h.showQrFor
    ? `${window.location.origin}${baseUrl}#/intake/demo${h.showQrFor.lang ? `?lang=${h.showQrFor.lang}` : ''}`
    : ''

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6">
      <div className="text-3xl mb-3">{h.emoji}</div>
      <h3 className="font-semibold mb-2">{h.title}</h3>
      <p className="text-sm text-[var(--color-ink-soft)] mb-3 leading-relaxed">{h.description}</p>
      {h.bullets && (
        <ul className="text-sm space-y-1.5 text-[var(--color-ink-soft)] mb-3">
          {h.bullets.map((b, i) => <li key={i}>• {b}</li>)}
        </ul>
      )}
      {h.showQrFor && (
        <div className="flex justify-center pt-2">
          <QrCard url={intakeUrl} size={140} caption={h.showQrFor.caption} />
        </div>
      )}
      {h.footnote && (
        <p className="text-xs text-[var(--color-ink-muted)] mt-3 italic">{h.footnote}</p>
      )}
    </div>
  )
}

function AgentStep({
  title,
  input,
  output,
  note,
}: {
  title: string
  input: string
  output: string
  note: string
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)] p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="grid gap-1 text-sm">
        <p><span className="font-medium">Input:</span> {input}</p>
        <p><span className="font-medium">Output:</span> {output}</p>
        <p className="text-[var(--color-ink-soft)]">{note}</p>
      </div>
    </div>
  )
}
