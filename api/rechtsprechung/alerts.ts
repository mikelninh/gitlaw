/**
 * Rechtsprechungs-Alerts API — weekly scan for new BGH / BVerfG Leitsätze
 * matching active-case paragraph lists.
 *
 * POST /api/rechtsprechung/alerts
 * Body: { activeParagraphs: Array<{ lawId: string, section: string, display: string }> }
 *
 * Returns: { alerts: RechtsprechungsAlert[], generatedAt: string }
 *
 * This is a stub that simulates matching alerts. In production it would
 * query juris.bundesgerichtshof.de / BVerfG RSS or a scraped index.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

interface AlertInput {
  activeParagraphs: Array<{ lawId: string; section: string; display: string }>
}

interface RechtsprechungsAlert {
  id: string
  caseId?: string
  paragraph: { lawId: string; section: string; display: string }
  court: string
  rulingDate: string
  title: string
  summary: string
  url?: string
  createdAt: string
}

// Stub corpus: simulated recent rulings with paragraph tags.
const STUB_CORpus: RechtsprechungsAlert[] = [
  {
    id: 'bgh-2026-001',
    paragraph: { lawId: 'bgb', section: '573', display: '§ 573 BGB' },
    court: 'BGH',
    rulingDate: '2026-04-28',
    title: 'BGH, Urteil v. 28.04.2026 — XII ZR 15/25: Eigenbedarfskündigung — "Ernsthaftigkeit" des Bedarfs',
    summary: 'Der BGH hat die Anforderungen an die Darlegung des Eigenbedarfs in der Berufungsinstanz verschärft: Der Vermieter muss den konkreten Nutzungsplan glaubhaft machen; bloße Formularklauseln genügen nicht mehr.',
    url: 'https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/list.py?Gericht=bgh&Art=en&Datum=2026-04-28',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bgh-2026-002',
    paragraph: { lawId: 'bgb', section: '138', display: '§ 138 BGB' },
    court: 'BGH',
    rulingDate: '2026-04-15',
    title: 'BGH, Urteil v. 15.04.2026 — X ZR 112/24: Sittenwidrigkeit bei Ehevertragsklauseln — Kappungsgrenze Zugewinn',
    summary: 'Ehevertragliche Kappungsgrenzen unter 50 % des gesetzlichen Zugewinns sind nur dann wirksam, wenn der wirtschaftlich schwächere Ehegatte nicht in eine existenzielle Notlage gestürzt wird. Prüfschema erweitert.',
    url: 'https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/list.py?Gericht=bgh&Art=en&Datum=2026-04-15',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bverfg-2026-003',
    paragraph: { lawId: 'gg', section: '2', display: 'Art. 2 GG' },
    court: 'BVerfG',
    rulingDate: '2026-04-10',
    title: 'BVerfG, Beschluss v. 10.04.2026 — 1 BvR 342/25: Abschiebungsandrohung und körperliche Unversehrtheit',
    summary: 'Die Androhung einer Abschiebung trotz vorliegenden medizinischen Attests über Reiseunfähigkeit kann einen schwerwiegenden Eingriff in das Grundrecht auf körperliche Unversehrtheit (Art. 2 Abs. 2 GG) darstellen.',
    url: 'https://www.bundesverfassungsgericht.de/SharedDocs/Entscheidungen/DE/2026/04/bv220625.html',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bgh-2026-004',
    paragraph: { lawId: 'stgb', section: '238', display: '§ 238 StGB' },
    court: 'BGH',
    rulingDate: '2026-03-22',
    title: 'BGH, Urteil v. 22.03.2026 — 1 StR 88/25: Nachstellung via Social-Media — "Fortgesetzte Verfolgung"',
    summary: 'Das bloße "Stalking" über mehrere Social-Media-Plattformen kann die Tatmerkmale der Nachstellung (§ 238 StGB) erfüllen, auch wenn einzelne Nachrichten für sich betrachtet harmlos erscheinen. Gesamtschau maßgeblich.',
    url: 'https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/list.py?Gericht=bgh&Art=en&Datum=2026-03-22',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bgh-2026-005',
    paragraph: { lawId: 'vwgo', section: '80', display: '§ 80 VwGO' },
    court: 'BGH',
    rulingDate: '2026-04-02',
    title: 'BGH, Urteil v. 02.04.2026 — 6 C 12/25: Aufschiebende Wirkung — Prüfschema bei Abschiebungsanordnung',
    summary: 'Bei Abschiebungsanordnungen ist die Prüfung der aufschiebenden Wirkung des Widerspruchs strenger: Das Verwaltungsgericht muss nicht nur das Kriterium der "schweren Nachteile" prüfen, sondern auch die Glaubhaftmachung der medizinischen Atteste eigenständig würdigen.',
    url: 'https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/list.py?Gericht=bgh&Art=en&Datum=2026-04-02',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bgh-2026-006',
    paragraph: { lawId: 'bgb', section: '823', display: '§ 823 BGB' },
    court: 'BGH',
    rulingDate: '2026-04-20',
    title: 'BGH, Urteil v. 20.04.2026 — VI ZR 45/24: Haftung für KI-generierte Rechtsberatung — Drittshaftung des Anbieters',
    summary: 'Anbieter einer KI-gestützten Rechtsberatungsplattform können nicht generell aus der Dritthaftung nach § 823 BGB herausgenommen werden; die Haftung hängt von der konkreten Einflussnahme und der Prüfbarkeit der Ausgabe ab.',
    url: 'https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/list.py?Gericht=bgh&Art=en&Datum=2026-04-20',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bverfg-2026-007',
    paragraph: { lawId: 'gg', section: '6', display: 'Art. 6 GG' },
    court: 'BVerfG',
    rulingDate: '2026-04-05',
    title: 'BVerfG, Urteil v. 05.04.2026 — 1 BvL 12/24: Familienkasse und Elterngeld — Gleichbehandlungsgrundsatz',
    summary: 'Die unterschiedliche Behandlung von selbstständigen und unselbstständigen Eltern bei der Elterngeldberechnung verstößt gegen den allgemeinen Gleichbehandlungsgrundsatz (Art. 3 GG i.V.m. Art. 6 GG).',
    url: 'https://www.bundesverfassungsgericht.de/SharedDocs/Entscheidungen/DE/2026/04/bv120624.html',
    createdAt: new Date().toISOString(),
  },
]

function normalizeLawId(id: string): string {
  return id.toLowerCase().replace(/\s/g, '').replace(/§/g, '').replace(/art\./g, '').replace(/\./g, '')
}

function matchesParagraph(
  alert: RechtsprechungsAlert,
  active: { lawId: string; section: string },
): boolean {
  const alertLaw = normalizeLawId(alert.paragraph.lawId)
  const activeLaw = normalizeLawId(active.lawId)
  const alertSec = alert.paragraph.section.trim()
  const activeSec = active.section.trim()
  return alertLaw === activeLaw && alertSec === activeSec
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  let body: AlertInput
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const activeParagraphs = body.activeParagraphs || []
  if (!Array.isArray(activeParagraphs)) {
    return res.status(400).json({ error: 'activeParagraphs must be an array' })
  }

  const matched: RechtsprechungsAlert[] = []
  for (const alert of STUB_CORpus) {
    for (const para of activeParagraphs) {
      if (matchesParagraph(alert, para)) {
        matched.push(alert)
        break
      }
    }
  }

  // Deduplicate by ID
  const seen = new Set<string>()
  const deduped = matched.filter(a => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })

  return res.status(200).json({
    ok: true,
    alerts: deduped,
    totalScanned: STUB_CORpus.length,
    matchedCount: deduped.length,
    generatedAt: new Date().toISOString(),
  })
}
