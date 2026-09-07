import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const posture = JSON.parse(readFileSync(new URL('./security-posture.json', import.meta.url), 'utf8'))
const requiredControls = [
  'authority_outside_model', 'least_privilege', 'tenant_isolation', 'human_approval', 'provenance', 'protected_data',
  'bounded_execution', 'auditability', 'supply_chain', 'adversarial_evals', 'production_monitoring',
]

describe('security-posture/v1', () => {
  it('publishes the portable contract with every control exactly once', () => {
    expect(posture.version).toBe('security-posture/v1')
    expect(posture.project.repository).toBe('mikelninh/gitlaw')
    expect(posture.controls.map((control: any) => control.id).sort()).toEqual([...requiredControls].sort())
    expect(new Set(posture.controls.map((control: any) => control.id)).size).toBe(requiredControls.length)
  })

  it('does not claim certification, solved injection, or complete production security', () => {
    expect(posture.claims).toEqual({ productionSecure: false, promptInjectionSolved: false, certified: false })
  })

  it('ties adversarial posture to the executable gauntlet result', () => {
    expect(posture.adversarial.cases).toBe(50)
    expect(posture.adversarial.passed).toBe(50)
    expect(posture.adversarial.criticalEscapes).toBe(0)
    expect(posture.adversarial.liveModel).toBe(false)
  })

  it('requires evidence for every implemented control', () => {
    for (const control of posture.controls) {
      if (control.status === 'implemented') expect(control.evidence.length).toBeGreaterThan(0)
    }
  })
})
