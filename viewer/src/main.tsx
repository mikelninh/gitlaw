import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ProApp from './pro/ProApp.tsx'

/**
 * Top-level router.
 *
 * HashRouter works on GitHub Pages without any SPA fallback config.
 *   /#/         → citizen App (default)
 *   /#/pro/*    → Anwält:innen Pro tier (invite-gated)
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/pro/*" element={<ProApp />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
