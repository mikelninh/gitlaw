# GitLaw Outcome Engine

**Behördenbrief → Frist → Aufgabe → Draft → menschliche Freigabe → bestehendes System**

This is an importable n8n workflow blueprint built around GitLaw Pro's existing
`/api/agent/behoerden` endpoint. It is deliberately **not another chatbot**.
It turns one incoming authority letter into a reviewable operational package
and only writes to downstream systems after a human approves it.

## Why this is an Outcome Engine

The workflow does six things in one traceable execution:

1. receives a PDF or a synthetic demo letter;
2. extracts and minimises the text;
3. calls GitLaw's tenant-scoped Behörden agent;
4. turns the result into typed deadlines, document requests, tasks, and drafts;
5. pauses for a unique human-approval webhook;
6. commits approved actions to the customer's existing system with an
   idempotency key.

No message is sent automatically. The existing DMS/case-management system
remains the system of record.

## Import

Import `n8n/gitlaw-outcome-engine.json` into n8n.

Configure these secrets as environment variables or, preferably, as encrypted
n8n credentials:

| Variable | Purpose |
|---|---|
| `GITLAW_BASE_URL` | GitLaw API base URL |
| `GITLAW_PRO_INVITE` | Temporary beta session credential |
| `KANZLEI_NAME` | Display name used in drafted correspondence |
| `REVIEW_WEBHOOK_URL` | Internal review UI, Teams/Slack adapter, or small approval service |
| `REVIEW_WEBHOOK_SECRET` | Shared secret for the review adapter |
| `OUTCOME_SINK_URL` | Adapter that creates tasks/deadlines/drafts in the incumbent system |
| `OUTCOME_SINK_SECRET` | Shared secret for the outcome adapter |

For a production product, replace the beta invite flow with a dedicated
per-tenant service credential.

## Demo

1. Set the GitLaw and review/sink variables.
2. Run **Manual Demo Trigger**.
3. The workflow uses a synthetic LEA letter.
4. The reviewer receives the structured packet and the unique n8n resume URL.
5. POST one of these payloads to that URL:

```json
{"decision":"approve","reviewer_id":"demo-lawyer","comment":"Checked against the original."}
```

```json
{"decision":"revise","reviewer_id":"demo-lawyer","comment":"Deadline needs manual correction."}
```

## Production intake

Send a PDF as the raw request body to the **Receive PDF** production webhook.
The binary field is expected to be named `data`. Text PDFs are extracted in
n8n. Scanned PDFs need an OCR fallback before the GitLaw call.

## Existing workflow integration

Do not force a law firm to replace its case-management stack. Replace the
generic **Commit to Existing System** node with one or more adapters:

- create a task in RA-MICRO, advoware, Asana, Jira, or Microsoft To Do;
- create a deadline in Outlook or Google Calendar;
- create an email **draft**, never an automatic send during the pilot;
- attach the structured result to the existing DMS/case;
- write only a status and hash to the Outcome Engine database.

## Guardrails

- human approval is mandatory;
- automatic sending is disabled;
- ambiguous case matches are blocked;
- relative or unresolved deadlines are blocked;
- possible missing deadlines are blocked for high-risk letter types;
- urgent items are visibly flagged;
- downstream writes include an idempotency key;
- every agent run keeps a structured tool trace and cost;
- original documents should remain in the customer's existing system.

## Proving it before selling it

Run the synthetic benchmark:

```bash
export GITLAW_BASE_URL="https://your-current-gitlaw-api.example"
export GITLAW_PRO_INVITE="..."
python evals/outcome_engine/run_eval.py
```

The runner records pass/fail per case, exact deadline accuracy, required-document
recall, latency, and cost. It does **not** certify legal correctness.

### Release gates for a paid pilot

These are targets, not current claims:

- 100% of outbound actions require human approval;
- 0 silent misses on explicit deadlines in the agreed benchmark;
- ≥95% document ingestion success on the customer's sample;
- ≥90% required-document recall;
- median review time below two minutes;
- every failure visible in the review packet;
- deletion/retention test passes;
- customer signs off the gold labels and pilot scope.

## Commercial wedge

**Document-to-Outcome Sprint**

- one inbox/folder;
- one document class;
- one task/calendar system;
- one approval channel;
- baseline measurement;
- 20–50 anonymised customer documents;
- workflow, benchmark report, handover, and two weeks of monitoring.

The first pilot should stay migration-law specific because GitLaw already has
the domain tools. Generalise only after the evidence is real.
