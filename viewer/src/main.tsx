import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ProApp from './pro/ProApp.tsx'
import IntakeForm from './pro/IntakeForm.tsx'
import WelcomePersonal from './pro/WelcomePersonal.tsx'
import ProPricing from './pro/ProPricing.tsx'

/**
 * Top-level router (HashRouter — works on GitHub Pages without SPA fallback).
 *   /#/                        → citizen App (default)
 *   /#/pro/*                   → Anwält:innen Pro tier (invite-gated)
 *   /#/intake/:slug            → Mandant:innen-Fragebogen (öffentlich)
 *   /#/preise                  → Pricing-Page (öffentlich)
 *   /#/{persona-slug}          → Personalized welcome (bao/rubin/werner/jasmin)
 *
 * Welcome-Pages stehen auf top-level damit die Shorter-URLs funktionieren:
 *   gitlaw-xi.vercel.app/#/bao   ← statt /pro/bao
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.pathname.startsWith('/pro-beta') ? (
      <ProBridgePage />
    ) : (
      <HashRouter>
        <Routes>
          <Route path="/intake/:slug" element={<IntakeForm />} />
          <Route path="/preise" element={<PricingShell />} />
          {/* Personalized welcome routes — public, no auth */}
          <Route path="/bao" element={<WelcomePersonal personaSlug="bao" />} />
          <Route path="/rubin" element={<WelcomePersonal personaSlug="rubin" />} />
          <Route path="/werner" element={<WelcomePersonal personaSlug="werner" />} />
          <Route path="/jasmin" element={<WelcomePersonal personaSlug="jasmin" />} />
          <Route path="/willkommen/:slug" element={<WelcomePersonal />} />
          {/* Pro app (auth-gated) */}
          <Route path="/pro/*" element={<ProApp />} />
          {/* Citizen app (default) */}
          <Route path="/*" element={<App />} />
        </Routes>
      </HashRouter>
    )}
  </StrictMode>,
)

function ProBridgePage() {
  const baseUrl = import.meta.env.BASE_URL
  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-gold-light)] via-white to-[var(--color-bg)]">
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-ink-muted)] mb-4">
          GitLaw Pro
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold mb-4" style={{ fontFamily: "'Georgia', serif" }}>
          Für Anwält:innen und Kanzleien
        </h1>
        <p className="text-lg text-[var(--color-ink-soft)] max-w-xl mx-auto leading-relaxed">
          Wenn du die normale GitLaw-Seite nur als Bürger-Version siehst, bist du hier richtig.
          Diese Seite führt direkt in die Pro-Variante.
        </p>

        <div className="mt-10 grid gap-4 max-w-md mx-auto">
          <a
            href={`${baseUrl}#/preise`}
            className="rounded-2xl bg-[var(--color-ink)] text-white px-6 py-4 font-semibold shadow-lg hover:opacity-90"
          >
            GitLaw Pro ansehen
          </a>
          <a
            href={`${baseUrl}#/pro?invite=BETA-NGUYEN&preset=nguyen`}
            className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-4 font-semibold hover:border-[var(--color-gold)]"
          >
            Pro direkt öffnen
          </a>
        </div>

        <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
          Direktlink für Bao: <span className="font-mono">/#/pro?invite=BETA-NGUYEN&amp;preset=nguyen</span>
        </p>
      </div>
    </div>
  )
}

function PricingShell() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="#/pro" className="flex items-center gap-2 font-semibold">
            <span className="text-[var(--color-gold)]">⚖</span>
            GitLaw <span className="text-[var(--color-gold)]">Pro</span>
          </a>
          <a href="#/" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            Bürger:innen-Version →
          </a>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <ProPricing />
      </div>
    </div>
  )
}
