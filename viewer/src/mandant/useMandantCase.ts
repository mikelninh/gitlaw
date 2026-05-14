/**
 * Einheitlicher Hook für Mandanten-Akte — Backend-Modus oder Demo-Modus.
 *
 * Backend-Modus:  backendToken gesetzt → Daten aus /api/mandant/case
 * Demo-Modus:     backendToken null    → Daten aus localStorage (mandant-store)
 *
 * Interface ist in beiden Modi identisch, damit die Components
 * keine eigenen Branch-Weichen brauchen.
 */

import { useCallback, useEffect, useState } from 'react'
import type { MandantCase } from '../pro/types'
import { getMandantCase } from './mandant-store'
import { fetchMandantCase } from './mandant-api'
import type { MandantLang } from './mandant-i18n'

export interface MandantCaseState {
  data: MandantCase | null
  loading: boolean
  error: string | null
  lang: MandantLang
  reload: () => void
}

export function useMandantCase(
  mandantId: string,
  backendToken: string | null,
): MandantCaseState {
  const [data, setData] = useState<MandantCase | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<MandantLang>('de')
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!backendToken) {
      // Demo-Modus: synchron aus localStorage
      setData(getMandantCase(mandantId))
      setLoading(false)
      setError(null)
      return
    }

    // Backend-Modus
    setLoading(true)
    setError(null)

    fetchMandantCase(backendToken)
      .then(resp => {
        setData(resp.case as MandantCase)
        setLang(resp.lang)
        setLoading(false)
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Verbindungsfehler'
        setError(msg)
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandantId, backendToken, tick])

  // Live-Refresh: alle 60s wenn Tab sichtbar (nur Backend-Modus).
  // Pause während User mit Formularen interagiert (z.B. Signature-Pad).
  useEffect(() => {
    if (!backendToken) return
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'CANVAS')) return
      reload()
    }, 60000)
    return () => window.clearInterval(id)
  }, [backendToken, reload])

  return { data, loading, error, lang, reload }
}
