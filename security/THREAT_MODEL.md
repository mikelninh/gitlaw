# GitLaw Agent Security Threat Model

## Security thesis

GitLaw does **not** assume that prompt injection can always be detected or that model output is trustworthy.

The design target is narrower and testable:

> Assume model output can be manipulated. A manipulated model must still be unable to cross deterministic authority boundaries and cause unauthorised consequential effects.

This threat model uses the **OWASP Top 10 for Agentic Applications 2026** as the primary taxonomy:
https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/

It also inherits the existing GitLaw product boundary: qualified human authority remains final for consequential legal work.

## Assets to protect

1. Tenant-confidential case and document data.
2. Authentication and role state.
3. Service credentials, secrets and hidden system instructions.
4. Integrity of legal evidence, citations and case facts.
5. Integrity of externally consequential actions.
6. Availability and bounded cost of agent workflows.
7. Audit evidence explaining what the agent requested and what the system allowed or denied.

## Trust boundaries

```text
untrusted user / document / RAG / tool / peer agent
                         |
                         v
                    LLM reasoning
                 (assume compromise)
                         |
                         v
              deterministic control plane
       auth -> tenant -> role -> capability -> scope
             -> provenance -> approval -> budget
                         |
               allow / block / review
                         |
                         v
               authenticated GitLaw API
```

The model may propose an action. It does not grant itself authority to perform it.

## Security invariants

- **Authority lives outside the model.**
- **Capabilities are deny-by-default.** Unknown tools are blocked.
- **Existing API authentication remains authoritative.**
- **Tenant isolation cannot be overridden by model output.**
- **Role requirements are evaluated deterministically.**
- **Untrusted content cannot authorise a write or external effect.**
- **Every declared write requires human approval.**
- **Protected scopes such as secrets and system prompts are not agent-readable.**
- **Agent execution is bounded.** Excessive repeated tool calls are stopped.
- **Missing or conflicting provenance produces review, not confident promotion.**
- **Human professional authority remains final for consequential legal conclusions.**
- **Critical vulnerabilities in production npm dependencies fail the security CI gate.**

## Attack surface mapped to OWASP Agentic Top 10 2026

| Risk | GitLaw attack example | Current proof/control | Residual gap |
| --- | --- | --- | --- |
| ASI01 Agent Goal Hijack | hidden PDF/RAG instruction redirects workflow | untrusted-origin effects blocked outside model | does not prove injection detection |
| ASI02 Tool Misuse & Exploitation | read tool repurposed as write/delete | typed capability/effect contract + allowlist | deeper parameter-level validation should grow with new tools |
| ASI03 Identity & Privilege Abuse | cross-tenant read or low-role write | auth + tenant + role checks | production deployment must prove configuration/RLS |
| ASI04 Agentic Supply Chain Vulnerabilities | compromised MCP/dependency | known-bad/unverified runtime states + CI critical-production dependency audit | SBOM, signatures and full provenance evidence remain separate work |
| ASI05 Unexpected Code Execution | shell/eval/package installer invented by model | no execution capabilities declared; unknown tools blocked | sandboxing required if execution tools are ever introduced |
| ASI06 Memory & Context Poisoning | poisoned RAG asks for mutation | provenance review + untrusted-origin write block | retrieval poisoning detection is not complete |
| ASI07 Insecure Inter-Agent Communication | forged peer agent request | peer authentication state + no peer-authorised writes | signed message protocol not yet implemented |
| ASI08 Cascading Failures | recursive tool loop | bounded tool-call budget | system-wide dependency failures need production chaos tests |
| ASI09 Human-Agent Trust Exploitation | AI presents result as final legal authority | authoritative outputs route to review | UX can still influence over-trust and needs user testing |
| ASI10 Rogue Agents | compromised peer requests secrets/writes | protected scope + cross-tenant + untrusted-origin gates | multi-agent behavioural detection is future work |

## Adversarial evaluation contract

`security/golden-cases.ts` contains 50 inspectable scenarios: five for every OWASP Agentic Top 10 2026 category.

Each case contains:

- attack description,
- severity,
- concrete security intent,
- expected policy decision,
- expected deterministic reason.

`security/agent-security.test.ts` regression-gates every case in CI.

`security/run-security-gauntlet.ts` generates a machine-readable report for the public dashboard.

### Primary score

The most important metric is **critical impact escapes**:

```text
expected BLOCK + severity CRITICAL + actual ALLOW = critical escape
```

The release target is always:

```text
critical impact escapes = 0
```

A high pass rate is useful, but zero critical escapes is the safety invariant.

## What this proof deliberately does not claim

This gauntlet does not prove:

- that prompt injection can always be detected,
- complete production security,
- end-to-end dependency integrity,
- legal correctness of generated answers,
- security of third-party systems outside GitLaw,
- that an OWASP mapping is a certification.

A runtime security control can reduce blast radius without solving the underlying model-behaviour problem. GitLaw should state that distinction explicitly.

## Expansion path

The next maturity steps after this deterministic baseline are:

1. live-model adversarial replay against the same golden cases,
2. indirect prompt-injection fixtures in PDF/email/RAG inputs,
3. parameter-level schemas for every tool effect,
4. SBOM + dependency provenance/signature evidence beyond the current critical-production audit gate,
5. signed/authenticated inter-agent messages if multi-agent communication becomes real,
6. production traces and anomaly alerts for denied actions, repeated calls and privilege violations,
7. external security review before claiming production readiness.
