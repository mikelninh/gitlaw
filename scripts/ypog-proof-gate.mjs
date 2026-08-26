import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const readText = p => fs.readFileSync(path.join(root, p), 'utf8')
const assert = (ok, msg) => { if (!ok) throw new Error(msg) }

const baseline = readJson('evals/ypog/baseline.json')
const source = readJson(baseline.source)
const red = readJson('evals/ypog/red_team_cases.json')
const policy = readJson('evals/ypog/agent_policy.json')
const criteria = readJson('evals/ypog/release_criteria.json')
const trace = readJson('evals/ypog/agent_trace_example.json')
const agentCode = readText('api/_agent.ts')
const authCode = readText('api/_auth.ts')
const llmCode = readText('api/_llm.ts')
const agentGuide = readText('AGENTS.md')

// 1. Historical baseline integrity: documentation must match the frozen raw result.
assert(source.summary.n_questions === baseline.n_questions, 'Baseline question count drifted from raw eval')
assert(source.summary['retrieval@1'] === baseline.metrics.retrieval_at_1, 'retrieval@1 baseline mismatch')
assert(source.summary['retrieval@3'] === baseline.metrics.retrieval_at_3, 'retrieval@3 baseline mismatch')
assert(source.summary['retrieval@5'] === baseline.metrics.retrieval_at_5, 'retrieval@5 baseline mismatch')
assert(baseline.metrics.answer_faithfulness === null, 'Unmeasured answer faithfulness must remain null')
assert(baseline.metrics.answer_relevance === null, 'Unmeasured answer relevance must remain null')
assert(baseline.interpretation.retrieval === 'blocked_for_production_claim', 'Weak broad retrieval baseline must be visibly blocked')

// 2. Red-team suite must cover the critical failure families we publicly claim to test.
assert(red.status.includes('not_lawyer_validated'), 'Seed red-team suite must not masquerade as lawyer validation')
assert(red.cases.length >= 20, 'Need at least 20 seed red-team cases')
const ids = new Set(red.cases.map(c => c.id))
assert(ids.size === red.cases.length, 'Red-team case ids must be unique')
const categories = new Set(red.cases.map(c => c.category))
for (const required of [
  'prompt_injection','fabricated_citation','cross_tenant_access','stale_evidence',
  'tool_loop','cost_runaway','unsupported_legal_claim','self_approval','missing_facts'
]) assert(categories.has(required), `Missing red-team category: ${required}`)
assert(red.cases.filter(c => c.critical).length >= 12, 'Critical safety coverage is too thin')

// 3. Machine-readable agent policy: consequential release and tenant isolation are hard guards.
assert(policy.global_guards.tenant_isolation === 'required', 'Tenant isolation must be required')
assert(policy.global_guards.human_release_for_consequential_legal_output === 'required', 'Human legal release gate missing')
assert(policy.roles.draft_agent.must_not.includes('send_or_release_consequential_legal_output_without_required_approval'), 'Draft agent release prohibition missing')
assert(policy.roles.citation_agent.must.includes('fail_closed_on_unresolved_citation'), 'Citation verification must fail closed')
assert(policy.roles.review_agent.must_not.includes('self_approve_its_own_output'), 'Review agent self-approval must be prohibited')

// 4. Synthetic trace: useful for observability demo, never a measured production claim.
assert(trace.trace_type === 'synthetic_example', 'Trace fixture must stay visibly synthetic')
assert(trace.totals.iterations <= trace.limits.max_iterations, 'Synthetic trace exceeds iteration guard')
assert(trace.totals.cost_usd <= trace.limits.max_cost_usd, 'Synthetic trace exceeds cost guard')
assert(trace.release.allowed === false, 'Synthetic legal analysis must still require human review')
assert(trace.totals.unsupported_material_claims === 0, 'Demo trace should not showcase an unsupported material claim as acceptable')

// 5. Public architecture claims must stay anchored to executable production code.
for (const token of ['aborted_budget', 'aborted_iterations', 'findCachedToolCall', 'persistToolCall', 'maxIterations', 'maxCostUsd', 'agent_runs', 'tool_calls'])
  assert(agentCode.includes(token), `Agent observability/guard proof missing in api/_agent.ts: ${token}`)
for (const token of ['tenantId', 'ROLE_RANK', 'timingSafeEqual', "process.env.VERCEL_ENV === 'production'", 'return {}'])
  assert(authCode.includes(token), `Tenant/auth proof missing in api/_auth.ts: ${token}`)
for (const token of ['TransientLLMError', "provider: 'auto'", 'estimateCostUsd', 'RETRY_STATUS'])
  assert(llmCode.includes(token), `Multi-provider gateway proof missing in api/_llm.ts: ${token}`)
assert(agentGuide.includes('lawyer remains the reviewer and final authority'), 'Agent guide must preserve lawyer authority')

// 6. Release criteria are stricter than the current historical baseline.
assert(criteria.minimum_dataset.lawyer_reviewed_cases >= 100, 'Lawyer-reviewed release dataset threshold too low')
assert(criteria.retrieval.recall_at_5_min > baseline.metrics.retrieval_at_5, 'Release retrieval gate must improve materially on baseline')
assert(criteria.agent_safety.cross_tenant_leaks_max === 0, 'Cross-tenant leak tolerance must be zero')
assert(criteria.agent_safety.autonomous_consequential_release_max === 0, 'Autonomous legal release tolerance must be zero')
assert(criteria.current_status.startsWith('BLOCKED_'), 'Current legal-quality readiness must remain blocked until real benchmark evidence exists')

const report = {
  engineering_gate: 'PASS',
  legal_quality_release_gate: criteria.current_status,
  observed_baseline: {
    n_questions: baseline.n_questions,
    retrieval_at_1: baseline.metrics.retrieval_at_1,
    retrieval_at_3: baseline.metrics.retrieval_at_3,
    retrieval_at_5: baseline.metrics.retrieval_at_5,
    answer_quality: 'NOT_MEASURED'
  },
  code_anchors: {
    bounded_agent_loop: true,
    tool_call_audit: true,
    tenant_auth_boundary: true,
    multi_provider_failover: true
  },
  red_team_seed_cases: red.cases.length,
  critical_red_team_seed_cases: red.cases.filter(c => c.critical).length,
  next_required_proof: [
    '>=100 lawyer-reviewed frozen cases',
    'measured groundedness / unsupported material claim rate',
    'lawyer human evaluation',
    'real multi-provider quality-latency-cost benchmark',
    'executed red-team suite against the running system'
  ]
}

console.log(JSON.stringify(report, null, 2))
