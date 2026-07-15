# Live proof — n8n → Outcome Engine → GitLaw

Last verified: **2026-07-15**

A real n8n 2.30.5 CLI execution imported `n8n/outcome-engine-live-proof.json`, called the public Outcome Engine gateway, and completed all workflow nodes successfully.

## Verified assertions

| Check | Result |
|---|---|
| Live server gateway returned a structured result | PASS |
| Automatic sending remained disabled | PASS |
| Unique run ID was returned | PASS |
| Explicit deadline `2026-07-30` was extracted | PASS |
| Three requested documents were extracted | PASS |
| Human review gate was present in the tool trace | PASS |

## Latest observed execution

```json
{
  "result": "PASS",
  "runtime": "n8n 2.30.5",
  "backend_mode": "gitlaw_grounded_rules",
  "agent_run_id": "oe_0128b80f-e6b0-4661-a1d8-841d04935c1f",
  "deadline": "2026-07-30",
  "documents": [
    "vollständige Gehaltsnachweise der letzten drei Monate",
    "aktuelle Meldebescheinigung",
    "Nachweis über bestehenden Krankenversicherungsschutz"
  ],
  "elapsed_ms": 11555,
  "auto_send": false
}
```

## Important limitation

The workflow attempted the existing GitLaw AI agent first. That provider call is currently blocked because the OpenAI project configured on the older public GitLaw deployment has been archived. The server therefore switched **visibly and explicitly** to deterministic extraction rules plus the GitLaw source registry and retained mandatory human approval. It did not present a simulated AI result as a successful agent call.

Replacing the archived provider credential restores the `gitlaw_agent` path without changing the public interface or n8n workflow.
