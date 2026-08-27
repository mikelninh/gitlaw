/**
 * Pro app — route tree mounted under /pro by the top-level router in main.tsx.
 *
 * Intake lives at /#/intake/:slug without the Pro auth gate — Mandant:innen
 * haben keinen Beta-Token, das Formular muss öffentlich erreichbar sein.
 */

import { Route, Routes, Navigate } from 'react-router-dom'
import ProAuth from './ProAuth'
import ProLayout from './ProLayout'
import ProMatterHome from './ProMatterHome'
import ProSettings from './ProSettings'
import { ProCasesList, ProCaseDetail } from './ProCases'
import ProResearch from './ProResearch'
import ProTemplates from './ProTemplates'
import ProAudit from './ProAudit'
import ProEingaenge from './ProEingaenge'
import ProImport from './ProImport'
import Intake from './Intake'
import { canAccessRoute } from './access'
import './pro-theme.css'
// Welcome pages + Pricing live on top-level (main.tsx) for short URLs.
// Don't import them here.

export default function ProApp() {
  return (
    <div className="pro-shell">
      <ProAuth>
        <Routes>
          <Route path="/" element={<ProLayout />}>
            <Route index element={<ProMatterHome />} />
            <Route path="akten" element={<Guarded path="/pro/akten"><ProCasesList /></Guarded>} />
            <Route path="akten/:id" element={<Guarded path="/pro/akten"><ProCaseDetail /></Guarded>} />
            <Route path="recherche" element={<Guarded path="/pro/recherche"><ProResearch /></Guarded>} />
            <Route path="schreiben" element={<Guarded path="/pro/schreiben"><ProTemplates /></Guarded>} />
            <Route path="eingaenge" element={<Guarded path="/pro/eingaenge"><ProEingaenge /></Guarded>} />
            <Route path="audit" element={<Guarded path="/pro/audit"><ProAudit /></Guarded>} />
            <Route path="import" element={<Guarded path="/pro/import"><ProImport /></Guarded>} />
            <Route path="triage" element={<Guarded path="/pro/triage"><Intake /></Guarded>} />
            <Route path="einstellungen" element={<Guarded path="/pro/einstellungen"><ProSettings /></Guarded>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProAuth>
    </div>
  )
}

function Guarded({ path, children }: { path: string; children: React.ReactNode }) {
  if (!canAccessRoute(path)) return <Navigate to="/pro" replace />
  return <>{children}</>
}
