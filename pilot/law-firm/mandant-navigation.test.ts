import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appPath = fileURLToPath(new URL('../../viewer/src/mandant/MandantApp.tsx', import.meta.url))
const app = readFileSync(appPath, 'utf8')

describe('Mandanten-Akte progressive disclosure', () => {
  it('keeps the simple checklist as the primary /mandant/akte route', () => {
    const simpleStart = app.indexOf('path="akte"')
    const detailsStart = app.indexOf('path="akte/details"')

    expect(simpleStart).toBeGreaterThan(-1)
    expect(detailsStart).toBeGreaterThan(simpleStart)

    const simpleRoute = app.slice(simpleStart, detailsStart)
    expect(simpleRoute).toContain('<MandantCheckliste')
    expect(simpleRoute).not.toContain('<MandantAkte ')
  })

  it('mounts the full legacy MandantAkte only on /mandant/akte/details', () => {
    const detailsStart = app.indexOf('path="akte/details"')
    const nextRouteStart = app.indexOf('path="status"', detailsStart)

    expect(detailsStart).toBeGreaterThan(-1)
    expect(nextRouteStart).toBeGreaterThan(detailsStart)

    const detailsRoute = app.slice(detailsStart, nextRouteStart)
    expect(detailsRoute).toContain('<MandantAkte ')
    expect(detailsRoute).not.toContain('<MandantCheckliste')
  })

  it('keeps the transition between simple and detailed views bilingual', () => {
    for (const text of [
      'Dokumente & Aktenübersicht →',
      'Tài liệu & tổng quan hồ sơ →',
      '← Zurück zum nächsten Schritt',
      '← Quay lại bước tiếp theo',
    ]) {
      expect(app).toContain(text)
    }
  })
})
