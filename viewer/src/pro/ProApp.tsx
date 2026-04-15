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

export default function ProApp() {
  return (
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
  )
}
