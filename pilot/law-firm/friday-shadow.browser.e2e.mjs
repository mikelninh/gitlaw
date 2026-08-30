import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const origin = process.env.GITLAW_VIEWER_ORIGIN || 'http://127.0.0.1:4173/gitlaw/'
const browser = await chromium.launch({ headless: true })

const apiCalls = []
const syncCalls = []
const askCalls = []

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

  await page.route('https://gitlaw-xi.vercel.app/**', async route => {
    const request = route.request()
    const url = request.url()
    apiCalls.push({ url, method: request.method() })

    if (url.includes('/api/pro/sync')) syncCalls.push({ url, method: request.method() })
    if (url.includes('/api/ask-pro')) askCalls.push({ url, method: request.method() })

    if (url.endsWith('/api/pro/session')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'friday-test-session',
          access: {
            tenantId: 'kanzlei-nguyen',
            userId: 'bao-friday-e2e',
            role: 'owner',
            sessionExpiresAt: '2026-09-05T12:00:00.000Z',
          },
        }),
      })
      return
    }

    // Anything beyond session auth is unexpected in the protected Friday
    // smoke path. Fulfil defensively so the assertion below can report it.
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'unexpected Friday network call' }) })
  })

  // Direct Friday entry must activate P1 before ProAuth attempts its ordinary
  // cloud bootstrap.
  await page.goto(`${origin}#/pro/friday?invite=BETA-NGUYEN`, { waitUntil: 'networkidle' })
  await page.getByText('SHADOW LOCK ACTIVE').waitFor()
  await page.getByText('Friday Pilot Console · P1 Shadow').waitFor()

  const initialState = await page.evaluate(() => ({
    shadow: sessionStorage.getItem('gitlaw.pro.shadowLock.v1'),
    cloud: localStorage.getItem('gitlaw.pro.cloudSync.v1'),
  }))
  assert.ok(initialState.shadow)
  assert.equal(JSON.parse(initialState.shadow).enabled, true)
  assert.equal(initialState.cloud, '0')
  assert.equal(syncCalls.length, 0, 'Friday auth bootstrap must make zero cloud-sync calls')

  // Try to reopen the old cloud preference. The active P1 session must still
  // suppress it after navigation/reload.
  await page.evaluate(() => localStorage.setItem('gitlaw.pro.cloudSync.v1', '1'))
  await page.goto(`${origin}#/pro/autopilot`, { waitUntil: 'networkidle' })
  await page.getByText('Bao, heute brauchst du nur hierhin.').waitFor()
  assert.equal(syncCalls.length, 0, 'Shadow Lock must survive navigation and suppress cloud sync')

  const afterNavigation = await page.evaluate(() => ({
    shadow: sessionStorage.getItem('gitlaw.pro.shadowLock.v1'),
    cloud: localStorage.getItem('gitlaw.pro.cloudSync.v1'),
  }))
  assert.equal(JSON.parse(afterNavigation.shadow).enabled, true)
  assert.equal(afterNavigation.cloud, '0')

  // Normal research UI must fail in-browser before /api/ask-pro while P1 is
  // active. The server Privacy Proof Center has a separate synthetic probe path.
  await page.goto(`${origin}#/pro/recherche`, { waitUntil: 'networkidle' })
  await page.getByText('Recherche · geschützt').waitFor()
  const question = page.getByPlaceholder('Rechtsfrage formulieren. Bei verknüpften Akten läuft die Pseudonymisierung immer vor dem Versand.')
  await question.fill('Welche Voraussetzungen gelten für eine Verlängerung?')
  await page.getByRole('button', { name: 'Sicher recherchieren' }).click()
  await page.getByText(/P1 Shadow Lock aktiv/).waitFor()
  assert.equal(askCalls.length, 0, 'Shadow Lock must block normal external AI before /api/ask-pro')
  assert.equal(syncCalls.length, 0, 'No cloud-sync request may appear anywhere in P1 browser flow')

  console.log('Friday P1 Shadow browser E2E: OK', { sessionCalls: apiCalls.length, syncCalls: syncCalls.length, askCalls: askCalls.length })
} finally {
  await browser.close()
}
