/**
 * /api/pro/auth/users
 *
 * Owner-only User-Management. Anwält:innen und Refa-Mitarbeiter:innen anlegen,
 * auflisten und entfernen. Nur der Owner des jeweiligen Tenants hat Zugriff.
 *
 * POST  { email, role, name }  → User anlegen (= Magic-Link-Login freischalten)
 * GET                          → Alle User des Tenants auflisten
 * DELETE ?email=               → User entfernen
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { applySecurityHeaders, applyCors } from '../../_http'
import { requireProSession, hashEmail } from '../../_auth'
import type { ProRole } from '../../_auth'

const redis = Redis.fromEnv()

interface UserRecord {
  email: string
  emailHash: string
  tenantId: string
  userId: string
  role: ProRole
  name: string
  createdAt: string
}

function tenantUsersKey(tenantId: string): string {
  return `tenantUsers:${tenantId}`
}

function userByEmailKey(emailHash: string): string {
  return `userByEmail:${emailHash}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res)
  const corsAllowed = applyCors(req, res, 'GET, POST, DELETE, OPTIONS')
  if (!corsAllowed) return res.status(403).json({ error: 'Origin not allowed' })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const session = requireProSession(req, res, 'owner')
  if (!session) return

  // GET — alle User des Tenants
  if (req.method === 'GET') {
    const usersRaw = await redis.smembers(tenantUsersKey(session.tenantId))
    const users: Omit<UserRecord, 'email'>[] = []
    for (const emailHash of usersRaw) {
      const u = await redis.get<UserRecord>(userByEmailKey(emailHash))
      if (u) {
        // Email nicht zurückgeben — nur Hash + Metadaten
        const { email: _email, ...safe } = u
        users.push(safe)
      }
    }
    return res.status(200).json({ users })
  }

  // POST — User anlegen
  if (req.method === 'POST') {
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : ''
    const role: ProRole = (req.body?.role as ProRole) || 'anwalt'
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''

    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' })
    }
    const validRoles: ProRole[] = ['anwalt', 'assistenz', 'read_only']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Ungültige Rolle. Erlaubt: ${validRoles.join(', ')}` })
    }

    const emailHash = hashEmail(emailRaw)
    const userId = `${session.tenantId}-${emailHash.slice(0, 12)}`

    const record: UserRecord = {
      email: emailRaw,
      emailHash,
      tenantId: session.tenantId,
      userId,
      role,
      name: name || emailRaw,
      createdAt: new Date().toISOString(),
    }

    await redis.set(userByEmailKey(emailHash), JSON.stringify(record))
    await redis.sadd(tenantUsersKey(session.tenantId), emailHash)

    console.info('[users] created', { emailHash: emailHash.slice(0, 12), role, tenantId: session.tenantId })

    return res.status(201).json({ ok: true, userId, role })
  }

  // DELETE — User entfernen
  if (req.method === 'DELETE') {
    const emailRaw = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : ''
    if (!emailRaw) {
      return res.status(400).json({ error: 'email Parameter fehlt.' })
    }

    const emailHash = hashEmail(emailRaw)
    const existing = await redis.get<UserRecord>(userByEmailKey(emailHash))

    if (!existing || existing.tenantId !== session.tenantId) {
      return res.status(404).json({ error: 'User nicht gefunden.' })
    }
    if (existing.userId === session.userId) {
      return res.status(400).json({ error: 'Eigenen Account kann man nicht entfernen.' })
    }

    await redis.del(userByEmailKey(emailHash))
    await redis.srem(tenantUsersKey(session.tenantId), emailHash)

    console.info('[users] deleted', { emailHash: emailHash.slice(0, 12), tenantId: session.tenantId })

    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
