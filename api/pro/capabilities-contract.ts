export type GitLawCapabilityRisk = 'read' | 'write' | 'external'

export interface GitLawCapability {
  id: string
  title: string
  description: string
  provider: 'gitlaw'
  risk: GitLawCapabilityRisk
  minRole: 'read_only' | 'assistenz' | 'anwalt' | 'owner'
  requiresHumanApproval: boolean
  consequential: boolean
  external: boolean
  transport: {
    method: 'GET' | 'PUT'
    path: string
  }
}

/**
 * Native, machine-readable contract for the GitLaw capabilities that agents may
 * request. This is intentionally descriptive: authentication, tenant isolation,
 * persistence and authorization remain enforced by the existing GitLaw APIs.
 */
export const GITLAW_CAPABILITIES: readonly GitLawCapability[] = [
  {
    id: 'gitlaw.case.get',
    title: 'Read case',
    description: 'Read one case, including its mirrored case documents, inside the authenticated tenant.',
    provider: 'gitlaw',
    risk: 'read',
    minRole: 'assistenz',
    requiresHumanApproval: false,
    consequential: false,
    external: false,
    transport: {
      method: 'GET',
      path: '/api/pro/entities?collection=cases&id={caseId}',
    },
  },
  {
    id: 'gitlaw.case.update',
    title: 'Propose case update',
    description: 'Persist an approved update to an existing case through the authenticated GitLaw entity boundary.',
    provider: 'gitlaw',
    risk: 'write',
    minRole: 'assistenz',
    requiresHumanApproval: true,
    consequential: true,
    external: false,
    transport: {
      method: 'PUT',
      path: '/api/pro/entities?collection=cases&id={caseId}',
    },
  },
  {
    id: 'gitlaw.research.list',
    title: 'Read case research',
    description: 'Read persisted research records inside the authenticated tenant.',
    provider: 'gitlaw',
    risk: 'read',
    minRole: 'assistenz',
    requiresHumanApproval: false,
    consequential: false,
    external: false,
    transport: {
      method: 'GET',
      path: '/api/pro/entities?collection=research',
    },
  },
  {
    id: 'gitlaw.letters.list',
    title: 'Read case letters',
    description: 'Read persisted letter records inside the authenticated tenant.',
    provider: 'gitlaw',
    risk: 'read',
    minRole: 'assistenz',
    requiresHumanApproval: false,
    consequential: false,
    external: false,
    transport: {
      method: 'GET',
      path: '/api/pro/entities?collection=letters',
    },
  },
] as const

export const GITLAW_AGENT_CONTRACT = {
  schemaVersion: '1.0',
  product: 'gitlaw-pro',
  provider: 'gitlaw',
  authority: 'outside_model',
  defaultExecutionMode: 'approval_gated',
  principles: [
    'tenant_scoped',
    'fail_closed',
    'human_approval_for_writes',
    'existing_api_auth_is_authoritative',
    'audit_every_attempt',
  ],
  capabilities: GITLAW_CAPABILITIES,
} as const
