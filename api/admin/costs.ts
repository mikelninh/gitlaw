/**
 * GET /api/admin/costs — Tier-A Cost-&-Usage-Dashboard.
 *
 * Auth: ADMIN_TOKEN (env) — entweder Header `x-admin-token` oder Query `?token=`.
 * Constant-time-Vergleich gegen Timing-Attacks.
 *
 * Liest aggregierte Sichten v_audit_cost_daily + v_audit_cost_tenant
 * (Migration 004) statt audit_log direkt — entlastet Postgres bei Wachstum.
 *
 * Server-rendered HTML, inline CSS, inline SVG-Sparklines.
 * Tier B würde dieses Skript durch Langfuse o.ä. ersetzen.
 */

import crypto from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSql } from '../_db'
import { applySecurityHeaders } from '../_http'

interface DailyRow {
  day: string
  model: string | null
  route: string | null
  calls: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  total_cost_usd: number
  avg_cost_per_call_usd: number
}

interface TenantRow {
  tenant_id: string
  day: string
  calls: number
  total_tokens: number
  total_cost_usd: number
  last_seen: string
}

interface PerCallCost {
  cost: number
}

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(new Uint8Array(ab), new Uint8Array(bb))
}

function checkAdmin(req: VercelRequest): boolean {
  const expected = process.env.ADMIN_TOKEN
  if (!expected || expected.length < 16) return false
  const headerToken = req.headers['x-admin-token']
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null
  const provided = (Array.isArray(headerToken) ? headerToken[0] : headerToken) ?? queryToken
  if (!provided) return false
  return constantTimeEquals(provided, expected)
}

function escape(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtUsd(n: number): string {
  if (!isFinite(n)) return '$0.0000'
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n >= 0.01) return `$${n.toFixed(4)}`
  return `$${n.toFixed(6)}`
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

function p50(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function sparkline(values: number[], width = 140, height = 30): string {
  if (values.length === 0) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"></svg>`
  }
  const max = Math.max(...values, 0.000001)
  const min = 0
  const stepX = values.length > 1 ? width / (values.length - 1) : 0
  const points = values
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / (max - min || 1)) * (height - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const last = values[values.length - 1]
  const lastX = (values.length - 1) * stepX
  const lastY = height - ((last - min) / (max - min || 1)) * (height - 2) - 1
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
    <polyline fill="none" stroke="#0a66c2" stroke-width="1.5" points="${points}" />
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2" fill="#0a66c2" />
  </svg>`
}

function renderUnauthorized(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>403</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:6rem auto;padding:0 1rem;color:#222;}</style>
</head><body><h1>403</h1><p>Admin token required. Pass via <code>x-admin-token</code> header or <code>?token=</code> query parameter.</p></body></html>`
}

function renderEmpty(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>GitLaw Costs</title>
<style>${baseCss()}</style></head><body>
<header><h1>GitLaw — Cost &amp; Usage</h1><p class="muted">No LLM activity recorded yet.</p></header>
<main><p>Once <code>recordAudit()</code> writes rows with <code>llm_*</code> fields, this dashboard will populate. Migrations 003 + 004 must be applied.</p></main>
</body></html>`
}

function baseCss(): string {
  return `
    *{box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;color:#1a1a1a;background:#fafafa;line-height:1.5;}
    header{padding:2rem 2.5rem 1rem;border-bottom:1px solid #e5e5e5;background:#fff;}
    header h1{margin:0 0 .25rem;font-size:1.5rem;font-weight:600;}
    header .muted{color:#666;font-size:.9rem;margin:0;}
    main{padding:2rem 2.5rem;max-width:1200px;}
    section{margin-bottom:2.5rem;}
    section h2{font-size:1rem;text-transform:uppercase;letter-spacing:.05em;color:#666;font-weight:600;margin:0 0 1rem;}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;}
    .stat{background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:1.25rem;}
    .stat-label{font-size:.8rem;color:#666;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.5rem;}
    .stat-value{font-size:1.75rem;font-weight:600;color:#0a66c2;font-variant-numeric:tabular-nums;}
    .stat-sub{font-size:.85rem;color:#666;margin-top:.25rem;}
    table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e5e5;border-radius:6px;overflow:hidden;font-size:.9rem;}
    th,td{padding:.6rem .85rem;text-align:left;border-bottom:1px solid #f0f0f0;}
    th{background:#f7f7f7;font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:.03em;color:#444;}
    td.num,th.num{text-align:right;font-variant-numeric:tabular-nums;}
    tr:last-child td{border-bottom:none;}
    tbody tr:hover{background:#f9f9f9;}
    .spark-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;}
    .spark-card{background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:1rem;}
    .spark-card .model{font-family:'SF Mono',Menlo,monospace;font-size:.85rem;color:#333;margin-bottom:.5rem;}
    .spark-card .total{font-size:.8rem;color:#666;margin-top:.25rem;}
    code{font-family:'SF Mono',Menlo,monospace;font-size:.85em;background:#f0f0f0;padding:.1em .35em;border-radius:3px;}
    footer{padding:1.5rem 2.5rem;color:#999;font-size:.8rem;border-top:1px solid #e5e5e5;background:#fff;}
  `
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!checkAdmin(req)) {
    res.status(403).setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(renderUnauthorized())
    return
  }

  if (!process.env.DATABASE_URL) {
    res.status(503).setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(`<!doctype html><html><body><h1>503</h1><p>DATABASE_URL not configured.</p></body></html>`)
    return
  }

  const sql = getSql()
  const today = todayUtcIso()

  let dailyRows: DailyRow[] = []
  let tenantRows: TenantRow[] = []
  let todayPerCall: PerCallCost[] = []

  try {
    dailyRows = (await sql`
      SELECT day::text AS day, model, route,
             calls::int AS calls,
             prompt_tokens::bigint AS prompt_tokens,
             completion_tokens::bigint AS completion_tokens,
             total_tokens::bigint AS total_tokens,
             total_cost_usd::float AS total_cost_usd,
             avg_cost_per_call_usd::float AS avg_cost_per_call_usd
      FROM v_audit_cost_daily
      WHERE day >= (CURRENT_DATE - INTERVAL '30 days')
      ORDER BY day DESC, total_cost_usd DESC
    `) as unknown as DailyRow[]

    tenantRows = (await sql`
      SELECT tenant_id, day::text AS day,
             calls::int AS calls,
             total_tokens::bigint AS total_tokens,
             total_cost_usd::float AS total_cost_usd,
             last_seen::text AS last_seen
      FROM v_audit_cost_tenant
      WHERE day >= (CURRENT_DATE - INTERVAL '30 days')
    `) as unknown as TenantRow[]

    todayPerCall = (await sql`
      SELECT COALESCE(llm_estimated_cost_usd, 0)::float AS cost
      FROM audit_log
      WHERE llm_model IS NOT NULL
        AND date_trunc('day', COALESCE(ts, created_at))::date = CURRENT_DATE
    `) as unknown as PerCallCost[]
  } catch (err) {
    const msg = (err as Error).message
    if (/relation .* does not exist/i.test(msg)) {
      res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send(renderEmpty())
      return
    }
    res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(`<!doctype html><html><body><h1>500</h1><pre>${escape(msg)}</pre></body></html>`)
    return
  }

  if (dailyRows.length === 0 && tenantRows.length === 0) {
    res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(renderEmpty())
    return
  }

  const todayRows = dailyRows.filter((r) => r.day === today)
  const todaySpend = todayRows.reduce((s, r) => s + (Number(r.total_cost_usd) || 0), 0)
  const todayCallCosts = todayPerCall.map((r) => Number(r.cost) || 0)
  const p50Cost = p50(todayCallCosts)

  const tenantTotalsToday = new Map<string, number>()
  for (const r of tenantRows) {
    if (r.day === today) {
      tenantTotalsToday.set(r.tenant_id, (tenantTotalsToday.get(r.tenant_id) ?? 0) + Number(r.total_cost_usd))
    }
  }
  let topTenant: { id: string; cost: number } | null = null
  for (const [id, cost] of tenantTotalsToday.entries()) {
    if (!topTenant || cost > topTenant.cost) topTenant = { id, cost }
  }

  const tenantAgg = new Map<string, { calls: number; cost: number; lastSeen: string }>()
  for (const r of tenantRows) {
    const cur = tenantAgg.get(r.tenant_id) ?? { calls: 0, cost: 0, lastSeen: '' }
    cur.calls += Number(r.calls) || 0
    cur.cost += Number(r.total_cost_usd) || 0
    if (!cur.lastSeen || r.last_seen > cur.lastSeen) cur.lastSeen = r.last_seen
    tenantAgg.set(r.tenant_id, cur)
  }
  const tenantList = Array.from(tenantAgg.entries())
    .map(([tenant_id, v]) => ({ tenant_id, ...v }))
    .sort((a, b) => b.cost - a.cost)

  const modelDays = new Map<string, Map<string, number>>()
  for (const r of dailyRows) {
    if (!r.model) continue
    const m = modelDays.get(r.model) ?? new Map<string, number>()
    m.set(r.day, (m.get(r.day) ?? 0) + Number(r.total_cost_usd))
    modelDays.set(r.model, m)
  }

  const days14: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    days14.push(d.toISOString().slice(0, 10))
  }

  const sparkCards = Array.from(modelDays.entries())
    .map(([model, dayMap]) => {
      const series = days14.map((d) => dayMap.get(d) ?? 0)
      const total = series.reduce((s, v) => s + v, 0)
      return { model, series, total }
    })
    .sort((a, b) => b.total - a.total)

  const breakdownRows = [...dailyRows].sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? 1 : -1
    return Number(b.total_cost_usd) - Number(a.total_cost_usd)
  })

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GitLaw — Cost &amp; Usage</title>
<style>${baseCss()}</style>
</head>
<body>
<header>
  <h1>GitLaw — Cost &amp; Usage</h1>
  <p class="muted">LLM telemetry from audit_log. Today: ${escape(today)} (UTC). Window: 30 days breakdown, 14 days sparklines.</p>
</header>
<main>

<section>
  <h2>Today</h2>
  <div class="stats">
    <div class="stat">
      <div class="stat-label">Total spend today</div>
      <div class="stat-value">${escape(fmtUsd(todaySpend))}</div>
      <div class="stat-sub">${escape(fmtInt(todayCallCosts.length))} calls</div>
    </div>
    <div class="stat">
      <div class="stat-label">Cost per request (P50)</div>
      <div class="stat-value">${escape(fmtUsd(p50Cost))}</div>
      <div class="stat-sub">median over today's calls</div>
    </div>
    <div class="stat">
      <div class="stat-label">Top tenant today</div>
      <div class="stat-value" style="font-size:1.15rem;">${escape(topTenant?.id ?? '—')}</div>
      <div class="stat-sub">${topTenant ? escape(fmtUsd(topTenant.cost)) : 'no activity'}</div>
    </div>
  </div>
</section>

<section>
  <h2>Spend by model — last 14 days</h2>
  <div class="spark-grid">
    ${sparkCards.length === 0
      ? '<p class="muted">No model activity in window.</p>'
      : sparkCards.map((c) => `
        <div class="spark-card">
          <div class="model">${escape(c.model)}</div>
          ${sparkline(c.series)}
          <div class="total">${escape(fmtUsd(c.total))} over 14 days</div>
        </div>`).join('')}
  </div>
</section>

<section>
  <h2>Breakdown — last 30 days by day · model · route</h2>
  <table>
    <thead>
      <tr>
        <th>Day</th>
        <th>Model</th>
        <th>Route</th>
        <th class="num">Calls</th>
        <th class="num">Total tokens</th>
        <th class="num">Total cost</th>
        <th class="num">Avg / call</th>
      </tr>
    </thead>
    <tbody>
      ${breakdownRows.length === 0
        ? '<tr><td colspan="7" class="muted">No rows in window.</td></tr>'
        : breakdownRows.map((r) => `
          <tr>
            <td>${escape(r.day)}</td>
            <td><code>${escape(r.model ?? '—')}</code></td>
            <td><code>${escape(r.route ?? '—')}</code></td>
            <td class="num">${escape(fmtInt(Number(r.calls)))}</td>
            <td class="num">${escape(fmtInt(Number(r.total_tokens)))}</td>
            <td class="num">${escape(fmtUsd(Number(r.total_cost_usd)))}</td>
            <td class="num">${escape(fmtUsd(Number(r.avg_cost_per_call_usd)))}</td>
          </tr>`).join('')}
    </tbody>
  </table>
</section>

<section>
  <h2>Per-tenant — last 30 days, sorted by spend</h2>
  <table>
    <thead>
      <tr>
        <th>Tenant ID</th>
        <th class="num">Calls</th>
        <th class="num">Total cost</th>
        <th>Last seen (UTC)</th>
      </tr>
    </thead>
    <tbody>
      ${tenantList.length === 0
        ? '<tr><td colspan="4" class="muted">No tenants in window.</td></tr>'
        : tenantList.map((t) => `
          <tr>
            <td><code>${escape(t.tenant_id)}</code></td>
            <td class="num">${escape(fmtInt(t.calls))}</td>
            <td class="num">${escape(fmtUsd(t.cost))}</td>
            <td>${escape((t.lastSeen || '').replace('T', ' ').slice(0, 19))}</td>
          </tr>`).join('')}
    </tbody>
  </table>
</section>

</main>
<footer>Tier A dashboard — server-rendered, no client JS. Swap for Langfuse / OpenLLMetry when usage justifies it.</footer>
</body>
</html>`

  res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store')
  res.send(html)
}
