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

  const proLink = `/#/pro?invite=${persona.betaToken}&preset=${persona.presetKey}`

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
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-block mb-6">
          <span className="text-5xl">{persona.heroEmoji}</span>
        </div>
        <h1
          className="text-4xl md:text-5xl font-semibold mb-4 leading-tight"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Hallo {persona.firstName},
          <br />
          das hier ist für dich.
        </h1>
        <p className="text-lg text-[var(--color-ink-soft)] max-w-xl mx-auto leading-relaxed">
          {persona.tagline}
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
  const intakeUrl = h.showQrFor
    ? `${window.location.origin}${window.location.pathname}#/intake/demo${h.showQrFor.lang ? `?lang=${h.showQrFor.lang}` : ''}`
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
