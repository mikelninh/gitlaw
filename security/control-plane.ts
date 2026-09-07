import { GITLAW_CAPABILITIES } from '../api/pro/capabilities-contract'

export type SecurityDecision = 'allow' | 'block' | 'review'
export type ActorRole = 'read_only' | 'assistenz' | 'anwalt' | 'owner'
export type SourceTrust =
  | 'trusted_user'
  | 'untrusted_user'
  | 'untrusted_document'
  | 'untrusted_rag'
  | 'untrusted_tool'
  | 'untrusted_agent'

export type RequestedEffect = 'read' | 'write' | 'external' | 'execute'
export type DataScope = 'tenant' | 'cross_tenant' | 'secret' | 'system_prompt'
export type DependencyState = 'trusted' | 'unverified' | 'known_bad'
export type ProvenanceState = 'verified' | 'missing' | 'conflicting'
export type UserFacingAuthority = 'bounded' | 'authoritative'

export interface SecurityIntent {
  capabilityId: string
  actorRole: ActorRole
  authenticated: boolean
  tenantMatch: boolean
  humanApproved: boolean
  sourceTrust: SourceTrust
  requestedEffect: RequestedEffect
  dataScope: DataScope
  repeatedCalls?: number
  dependencyState?: DependencyState
  provenance?: ProvenanceState
  peerAuthenticated?: boolean
  userFacingAuthority?: UserFacingAuthority
}

export interface SecurityVerdict {
  decision: SecurityDecision
  reason:
    | 'known_bad_dependency'
    | 'unverified_dependency'
    | 'unauthenticated_peer'
    | 'execution_budget_exceeded'
    | 'protected_scope'
    | 'unauthenticated'
    | 'cross_tenant'
    | 'undeclared_capability'
    | 'insufficient_role'
    | 'capability_effect_mismatch'
    | 'untrusted_action_origin'
    | 'human_approval_required'
    | 'external_actions_disabled'
    | 'unverified_provenance'
    | 'human_authority_required'
    | 'policy_allow'
  capabilityId: string
  evidence: string[]
}

const ROLE_RANK: Record<ActorRole, number> = {
  read_only: 0,
  assistenz: 1,
  anwalt: 2,
  owner: 3,
}

const MAX_TOOL_CALLS_PER_RUN = 10

function verdict(
  intent: SecurityIntent,
  decision: SecurityDecision,
  reason: SecurityVerdict['reason'],
  ...evidence: string[]
): SecurityVerdict {
  return { decision, reason, capabilityId: intent.capabilityId, evidence }
}

/**
 * Security boundary for agent-requested effects.
 *
 * Important: this function does not try to determine whether the model has been
 * prompt-injected. It assumes model output may be manipulated and decides
 * whether the requested effect is still permissible using deterministic state
 * outside the model.
 */
export function evaluateAgentIntent(intent: SecurityIntent): SecurityVerdict {
  if (intent.dependencyState === 'known_bad') {
    return verdict(intent, 'block', 'known_bad_dependency', 'dependency_state=known_bad')
  }

  if (intent.dependencyState === 'unverified') {
    return verdict(intent, 'review', 'unverified_dependency', 'dependency_state=unverified')
  }

  if (intent.peerAuthenticated === false) {
    return verdict(intent, 'block', 'unauthenticated_peer', 'peer_authentication=false')
  }

  if ((intent.repeatedCalls ?? 0) > MAX_TOOL_CALLS_PER_RUN) {
    return verdict(
      intent,
      'block',
      'execution_budget_exceeded',
      `tool_calls=${intent.repeatedCalls}`,
      `max_tool_calls=${MAX_TOOL_CALLS_PER_RUN}`,
    )
  }

  if (intent.dataScope === 'secret' || intent.dataScope === 'system_prompt') {
    return verdict(intent, 'block', 'protected_scope', `data_scope=${intent.dataScope}`)
  }

  if (!intent.authenticated) {
    return verdict(intent, 'block', 'unauthenticated', 'authenticated=false')
  }

  if (!intent.tenantMatch || intent.dataScope === 'cross_tenant') {
    return verdict(intent, 'block', 'cross_tenant', 'tenant_match=false')
  }

  const capability = GITLAW_CAPABILITIES.find((item) => item.id === intent.capabilityId)
  if (!capability) {
    return verdict(intent, 'block', 'undeclared_capability', 'capability_not_in_allowlist')
  }

  if (ROLE_RANK[intent.actorRole] < ROLE_RANK[capability.minRole]) {
    return verdict(
      intent,
      'block',
      'insufficient_role',
      `actor_role=${intent.actorRole}`,
      `minimum_role=${capability.minRole}`,
    )
  }

  const declaredEffect = capability.risk === 'read' ? 'read' : capability.risk === 'write' ? 'write' : 'external'
  if (intent.requestedEffect !== declaredEffect) {
    return verdict(
      intent,
      'block',
      'capability_effect_mismatch',
      `declared_effect=${declaredEffect}`,
      `requested_effect=${intent.requestedEffect}`,
    )
  }

  if (capability.external || intent.requestedEffect === 'external') {
    return verdict(intent, 'block', 'external_actions_disabled', 'external_execution=false')
  }

  const untrustedOrigin = intent.sourceTrust !== 'trusted_user'
  if (untrustedOrigin && intent.requestedEffect !== 'read') {
    return verdict(
      intent,
      'block',
      'untrusted_action_origin',
      `source_trust=${intent.sourceTrust}`,
      'untrusted_content_cannot_authorize_effects',
    )
  }

  if (capability.requiresHumanApproval && !intent.humanApproved) {
    return verdict(intent, 'block', 'human_approval_required', 'human_approval=false')
  }

  if (
    intent.requestedEffect === 'read' &&
    intent.sourceTrust !== 'trusted_user' &&
    intent.provenance !== undefined &&
    intent.provenance !== 'verified'
  ) {
    return verdict(
      intent,
      'review',
      'unverified_provenance',
      `provenance=${intent.provenance}`,
      `source_trust=${intent.sourceTrust}`,
    )
  }

  if (intent.userFacingAuthority === 'authoritative') {
    return verdict(
      intent,
      'review',
      'human_authority_required',
      'qualified_human_authority_remains_final',
    )
  }

  return verdict(
    intent,
    'allow',
    'policy_allow',
    `capability=${capability.id}`,
    `actor_role=${intent.actorRole}`,
    `source_trust=${intent.sourceTrust}`,
  )
}
