import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.GITLAW_DEMO_URL || 'http://127.0.0.1:4173/gitlaw/#/pro-demo'
const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(baseURL, { waitUntil: 'networkidle' })

  await page.getByText('Spielwiese mit 8 synthetischen Akten.').waitFor()
  assert.equal(await page.getByPlaceholder('Akte suchen …').count(), 1)

  // Search/filter narrows the matter list while intentionally keeping the
  // currently opened matter visible in the workspace on the right.
  const matterList = page.locator('aside').filter({ has: page.getByPlaceholder('Akte suchen …') })
  const search = page.getByPlaceholder('Akte suchen …')
  await search.fill('Nguyen')
  await matterList.getByText('Nguyen Familie', { exact: true }).waitFor()
  assert.equal(await matterList.getByText('Jusuf Öztürk', { exact: true }).count(), 0)
  await search.fill('')
  await matterList.getByText('Jusuf Öztürk', { exact: true }).waitFor()

  // Public demo must keep the review chain local and human-controlled.
  await page.getByRole('button', { name: 'Dokumente', exact: true }).click()
  await page.getByText('Eingegangen ≠ geprüft').waitFor()
  const docReviewButtons = page.getByRole('button', { name: 'Nach Sichtprüfung bestätigen', exact: true })
  while (await docReviewButtons.count()) await docReviewButtons.first().click()

  await page.getByRole('button', { name: 'Quellen', exact: true }).click()
  await page.getByText('Quelle für Quelle reviewen').waitFor()
  const sourceReviewButtons = page.getByRole('button', { name: 'Als geprüft markieren (Demo)', exact: true })
  while (await sourceReviewButtons.count()) await sourceReviewButtons.first().click()

  await page.getByRole('button', { name: 'Research', exact: true }).click()
  await page.getByText('Mit Aktenkontext recherchieren').waitFor()
  const researchBox = page.locator('textarea').first()
  await researchBox.fill('Welche Punkte bleiben nach Akten- und Quellenprüfung offen?')
  await page.getByRole('button', { name: 'Research starten', exact: true }).click()
  await page.getByText('Synthetischer Research-Lauf').waitFor()
  await page.getByText('kein Live-LLM und keine Rechtsberatung').waitFor()

  await page.getByRole('button', { name: 'Entwurf', exact: true }).click()
  await page.getByText('DRAFT — NICHT FREIGABE').waitFor()
  await page.getByRole('button', { name: 'Zum Review →', exact: true }).click()
  await page.getByText('Freigabe blockiert').waitFor()
  const release = page.getByRole('button', { name: 'Menschlich freigeben (Demo)', exact: true })
  assert.equal(await release.isDisabled(), true)

  // Resolve the three explicit factual questions of the default synthetic matter.
  await page.getByRole('button', { name: 'Exakte Zusammensetzung des behaupteten Rückstands', exact: true }).click()
  await page.getByRole('button', { name: 'Kontoauszüge vollständig?', exact: true }).click()
  await page.getByRole('button', { name: 'Nebenkostenforderung fällig und prüffähig?', exact: true }).click()
  await page.getByText('Alle Demo-Fragen menschlich geklärt.').waitFor()
  await page.getByText('Review-Gate bereit').waitFor()
  assert.equal(await release.isDisabled(), false)
  await release.click()
  await page.getByText('In der Demo menschlich freigegeben').waitFor()
  await page.getByText('Keine externe Aktion wurde ausgeführt').waitFor()

  await page.getByRole('button', { name: 'Audit', exact: true }).click()
  await page.getByText('Arbeitsstand menschlich freigegeben — keine externe Wirkung').waitFor()

  // Permanently lock the mobile-overflow regression found during visual QA.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  assert.equal(dimensions.innerWidth, 390)
  assert.ok(dimensions.scrollWidth <= 390, `horizontal overflow: ${dimensions.scrollWidth}px on 390px viewport`)
  await page.getByText('Spielwiese mit 8 synthetischen Akten.').waitFor()

  console.log('GitLaw Pro public demo browser E2E: OK')
} finally {
  await browser.close()
}
