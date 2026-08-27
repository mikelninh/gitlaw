/**
 * Mandanten-Portal — Route-Tree unter /mandant/*.
 *
 * Getrennt von /pro: eigenes Auth-Gate, eigenes Layout, eigene Sprache.
 *
 * Zwei Modi:
 *  - Backend-Modus:  URL enthält ?token=... → Token ist die Auth, kein Login-Screen.
 *  - Demo-Modus:     kein Token oder Token=MANDANT-DEMO → localStorage-Pfad.
 */

import { useState } from 'react'
import { Route, Routes, Navigate, useSearchParams, Link } from 'react-router-dom'
import MandantLogin from './MandantLogin'
import MandantLayout from './MandantLayout'
import MandantCheckliste from './MandantCheckliste'
import MandantAkte from './MandantAkte'
import MandantSachstand from './MandantSachstand'
import MandantVollmacht from './MandantVollmacht'
import type { MandantLang } from './mandant-i18n'
import { loadDemoData } from '../pro/demo-data'
import { getAccessContext, setAccessContext } from '../pro/store'

const TOKEN_SESSION_KEY = 'gitlaw.mandant.token'

export default function MandantApp() {
  const [searchParams] = useSearchParams()

  const [backendToken] = useState<string | null>(() => {
    const fromUrl = searchParams.get('token') ?? null
    if (fromUrl && fromUrl !== 'MANDANT-DEMO') {
      try { sessionStorage.setItem(TOKEN_SESSION_KEY, fromUrl) } catch {}
      return fromUrl
    }
    try {
      const stored = sessionStorage.getItem(TOKEN_SESSION_KEY)
      return stored && stored !== 'MANDANT-DEMO' ? stored : null
    } catch {
      return null
    }
  })

  const [mandantId, setMandantId] = useState<string | null>(
    backendToken ? `backend:${backendToken}` : null,
  )
  const [lang, setLang] = useState<MandantLang>(() => {
    const fromUrl = searchParams.get('lang')
    return fromUrl === 'vi' || fromUrl === 'de' ? fromUrl : 'de'
  })

  function handleUnlock(id: string) {
    if (id === 'mandant-demo') {
      const prev = getAccessContext()
      try {
        setAccessContext({ tenantId: 'mandant-demo', userId: 'mandant-demo', role: 'anwalt' })
        loadDemoData('nguyen')
      } catch (err) {
        console.warn('Mandant demo seed failed', err)
      } finally {
        if (prev) setAccessContext(prev)
      }
    }
    setMandantId(id)
  }

  if (!mandantId) {
    return (
      <MandantLogin
        lang={lang}
        urlToken={backendToken}
        onUnlock={handleUnlock}
      />
    )
  }

  return (
    <Routes>
      <Route
        element={
          <MandantLayout
            lang={lang}
            onLangChange={setLang}
            onLogout={() => setMandantId(null)}
          />
        }
      >
        <Route index element={<Navigate to="akte" replace />} />
        <Route
          path="akte"
          element={
            <>
              <div className="mb-3 flex justify-end">
                <Link
                  to="/mandant/akte/details"
                  className="text-xs font-semibold text-[var(--color-ink-soft)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
                >
                  {lang === 'vi' ? 'Tài liệu & tổng quan hồ sơ →' : 'Dokumente & Aktenübersicht →'}
                </Link>
              </div>
              <MandantCheckliste mandantId={mandantId} backendToken={backendToken} lang={lang} />
            </>
          }
        />
        <Route
          path="akte/details"
          element={
            <>
              <div className="mb-4">
                <Link
                  to="/mandant/akte"
                  className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--color-ink-soft)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
                >
                  {lang === 'vi' ? '← Quay lại bước tiếp theo' : '← Zurück zum nächsten Schritt'}
                </Link>
              </div>
              <MandantAkte mandantId={mandantId} backendToken={backendToken} lang={lang} />
            </>
          }
        />
        <Route path="status" element={<Navigate to="/mandant/sachstand" replace />} />
        <Route path="sachstand" element={<MandantSachstand mandantId={mandantId} backendToken={backendToken} lang={lang} />} />
        <Route path="vollmacht" element={<MandantVollmacht mandantId={mandantId} backendToken={backendToken} lang={lang} />} />
        <Route path="*" element={<Navigate to="akte" replace />} />
      </Route>
    </Routes>
  )
}
