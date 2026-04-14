/**
 * Pro app — route tree mounted under /pro by the top-level router in main.tsx.
 *
 * Uses HashRouter (via parent) so the app works on GitHub Pages without
 * server-side SPA fallback. Anwält:innen hit URLs like:
 *   https://mikelninh.github.io/gitlaw/#/pro
 *   https://mikelninh.github.io/gitlaw/#/pro/akten
 *   https://mikelninh.github.io/gitlaw/#/pro?invite=BETA-MUSTER-1
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
          <Route path="audit" element={<ProAudit />} />
          <Route path="einstellungen" element={<ProSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProAuth>
  )
}
