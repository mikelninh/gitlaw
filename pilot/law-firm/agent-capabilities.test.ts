import { describe, expect, it } from 'vitest'
import { GITLAW_AGENT_CONTRACT, GITLAW_CAPABILITIES } from '../../api/pro/capabilities-contract'

describe('GitLaw native agent capability contract', () => {
  it('has unique capability ids and is fail-closed by declaration', () => {
    const ids = GITLAW_CAPABILITIES.map((capability) => capability.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(GITLAW_AGENT_CONTRACT.authority).toBe('outside_model')
    expect(GITLAW_AGENT_CONTRACT.principles).toContain('fail_closed')
    expect(GITLAW_AGENT_CONTRACT.principles).toContain('existing_api_auth_is_authoritative')
  })

  it('requires human approval for every write capability', () => {
    const writes = GITLAW_CAPABILITIES.filter((capability) => capability.risk === 'write')
    expect(writes.length).toBeGreaterThan(0)
    for (const capability of writes) {
      expect(capability.requiresHumanApproval).toBe(true)
      expect(capability.consequential).toBe(true)
    }
  })

  it('maps only to the existing authenticated pro entity boundary', () => {
    for (const capability of GITLAW_CAPABILITIES) {
      expect(capability.provider).toBe('gitlaw')
      expect(capability.minRole).not.toBe('read_only')
      expect(capability.transport.path.startsWith('/api/pro/entities?')).toBe(true)
    }
  })

  it('keeps reads non-executing and non-external', () => {
    const reads = GITLAW_CAPABILITIES.filter((capability) => capability.risk === 'read')
    for (const capability of reads) {
      expect(capability.requiresHumanApproval).toBe(false)
      expect(capability.consequential).toBe(false)
      expect(capability.external).toBe(false)
      expect(capability.transport.method).toBe('GET')
    }
  })

  it('exposes the approved case-write boundary only as approval-gated PUT', () => {
    const update = GITLAW_CAPABILITIES.find((capability) => capability.id === 'gitlaw.case.update')
    expect(update).toBeDefined()
    expect(update?.transport.method).toBe('PUT')
    expect(update?.transport.path).toBe('/api/pro/entities?collection=cases&id={caseId}')
    expect(update?.requiresHumanApproval).toBe(true)
  })
})
