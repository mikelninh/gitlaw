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
  </StrictMode>,
)

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
