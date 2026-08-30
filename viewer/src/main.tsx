import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import GitLawHome from './GitLawHome.tsx'
import ProApp from './pro/ProApp.tsx'
import ProPortfolioDemo from './pro/ProPortfolioDemo.tsx'
import MandantApp from './mandant/MandantApp.tsx'
import IntakeForm from './pro/IntakeForm.tsx'
import WelcomePersonal from './pro/WelcomePersonal.tsx'
import BaoAutopilotWelcome from './pro/BaoAutopilotWelcome.tsx'
import ProPricing from './pro/ProPricing.tsx'
import MietrechtResearchDesk from './MietrechtResearchDesk.tsx'

/**
 * Top-level router (HashRouter — works on GitHub Pages without SPA fallback).
 *   /#/                        → focused cross-domain GitLaw decision support
 *   /#/research               → full citizen research interface
 *   /#/mietrecht              → public real-input Mietrecht research pilot
 *   /#/pro-demo               → tokenless synthetic Pro portfolio demo
 *   /#/bao                    → Bao's Autopilot-first invitation
 *   /#/pro/*                  → Anwält:innen Pro tier (invite-gated; includes Kanzlei Autopilot)
 *   /#/intake/:slug           → Mandant:innen-Fragebogen (öffentlich)
 *   /#/preise                 → Pricing-Page (öffentlich)
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
          <Route path="/mietrecht" element={<MietrechtResearchDesk />} />
          <Route path="/pro-demo" element={<ProPortfolioDemo />} />
          {/* Personalized welcome routes — public, no case data */}
          <Route path="/bao" element={<BaoAutopilotWelcome />} />
          <Route path="/willkommen/bao" element={<BaoAutopilotWelcome />} />
          <Route path="/rubin" element={<WelcomePersonal personaSlug="rubin" />} />
          <Route path="/werner" element={<WelcomePersonal personaSlug="werner" />} />
          <Route path="/jasmin" element={<WelcomePersonal personaSlug="jasmin" />} />
          <Route path="/willkommen/:slug" element={<WelcomePersonal />} />
          {/* Pro app (auth-gated) */}
          <Route path="/pro/*" element={<ProApp />} />
          {/* Mandanten-Portal (auth-gated, getrennt von /pro) */}
          <Route path="/mandant/*" element={<MandantApp />} />
          {/* Full research workspace remains available behind the focused entry experience. */}
          <Route path="/research" element={<App />} />
          <Route path="/*" element={<GitLawHome />} />
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
        <div className="inline-flex items-center rounded-full border border-gold/20 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-gold)]">
          GitLaw Pro
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-ink-muted)] mb-4 mt-5">
          Kanzlei-Workspace
        </p>
        <h1 className="text-4xl md:text-5xl font-semibold mb-4" style={{ fontFamily: "'Georgia', serif" }}>
          Erst ausprobieren. Dann einloggen.
        </h1>
        <p className="text-lg text-[var(--color-ink-soft)] max-w-xl mx-auto leading-relaxed">
          Die Portfolio-Demo nutzt nur synthetische Daten und braucht keinen Beta-Token. Der echte Pilotbereich bleibt getrennt und geschützt.
        </p>

        <div className="mt-10 grid gap-4 max-w-md mx-auto">
          <a
            href={`${baseUrl}#/pro-demo`}
            className="rounded-2xl bg-[var(--color-ink)] text-white px-6 py-4 font-semibold shadow-lg hover:opacity-90"
          >
            Interaktive Portfolio-Demo öffnen
          </a>
          <a
            href={`${baseUrl}#/pro`}
            className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-4 font-semibold hover:border-[var(--color-gold)]"
          >
            Zum echten Pilot-Login
          </a>
          <a
            href={`${baseUrl}#/preise`}
            className="text-sm text-[var(--color-ink-soft)] underline"
          >
            Pilot-Angebot ansehen
          </a>
        </div>
      </div>
    </div>
  )
}

function PricingShell() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="#/pro-demo" className="flex items-center gap-2 font-semibold">
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
