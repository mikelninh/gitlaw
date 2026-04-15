/**
 * Pro app — route tree mounted under /pro by the top-level router in main.tsx.
 *
 * Intake lives at /#/intake/:slug without the Pro auth gate — Mandant:innen
 * haben keinen Beta-Token, das Formular muss öffentlich erreichbar sein.
 */

import { Route, Routes, Navigate } from 'react-router-dom'
import ProAuth from './ProAuth'
import ProLayout from './ProLayout'
import ProDashboard from './ProDashboard'
import ProSettings from './ProSettings'
import { ProCasesList, ProCaseDetail } from './ProCases'
import ProResearch from './ProResearch'
import ProTemplates from './ProTemplates'
import ProAudit from './ProAudit'
import ProEingaenge from './ProEingaenge'
import ProPricing from './ProPricing'

export default function ProApp() {
  return (
    <Routes>
      {/* Pricing public — no auth gate, so interested lawyers can see tiers */}
      <Route path="/preise" element={<PublicPricingShell />} />

      {/* Everything else is auth-gated */}
      <Route
        path="*"
        element={
          <ProAuth>
            <Routes>
              <Route path="/" element={<ProLayout />}>
                <Route index element={<ProDashboard />} />
                <Route path="akten" element={<ProCasesList />} />
                <Route path="akten/:id" element={<ProCaseDetail />} />
                <Route path="recherche" element={<ProResearch />} />
                <Route path="schreiben" element={<ProTemplates />} />
                <Route path="eingaenge" element={<ProEingaenge />} />
                <Route path="audit" element={<ProAudit />} />
                <Route path="einstellungen" element={<ProSettings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ProAuth>
        }
      />
    </Routes>
  )
}

function PublicPricingShell() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/#/pro" className="flex items-center gap-2 font-semibold">
            <span className="text-[var(--color-gold)]">⚖</span>
            GitLaw <span className="text-[var(--color-gold)]">Pro</span>
          </a>
          <a href="/" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
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
