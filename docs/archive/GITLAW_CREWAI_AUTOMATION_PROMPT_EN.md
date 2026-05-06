# GitLaw Pro CrewAI Automation Prompt

Use this prompt inside CrewAI Automations Live:

```text
Build a supervised multi-agent legal workflow automation for GitLaw Pro, a product for small German law firms with high document, intake, and multilingual workload.

This is NOT a generic legal chatbot. It is an agentic legal operations system with human review at key checkpoints.

Primary workflow to automate:
1. Client intake arrives in German, Vietnamese, Turkish, Arabic, or English
2. Intake is structured and triaged for urgency, deadlines, and case type
3. Uploaded files are renamed, classified, and attached to the right case
4. OCR and optional German working translations are generated
5. The system recommends the next best step for the legal team
6. A legal research agent produces a structured German answer with cited statutes
7. A citation verification step checks that the referenced statutes exist and are correctly structured
8. A drafting agent creates a first legal draft based on the case, documents, research, and template
9. A lawyer reviews, edits, and approves outputs
10. Only approved outputs are stored in firm memory for future reuse

Important constraints:
- Human-in-the-loop is mandatory for legal trust and liability reasons
- Never send final legal advice or final legal letters automatically
- All workflows must be tenant-scoped by law firm
- Role-based access control is required:
  - owner
  - lawyer
  - assistant
  - read-only
- Audit trail and provenance are required
- The system should prefer structured outputs over free text wherever possible

Define these agents:
- Intake Agent
- Document Agent
- OCR / Translation Agent
- Workflow Recommendation Agent
- Research Agent
- Citation Verification Agent
- Drafting Agent
- Memory Agent

For each agent, specify:
- inputs
- outputs
- tools
- handoff conditions
- human review checkpoint
- failure handling

The first target customer is a small German law firm, especially in migration, criminal, family, tenancy, or social law.

The business goal is not novelty. The goal is to reduce time and chaos across this core loop:
intake -> documents -> research -> draft -> approval

Optimize for:
- speed to first useful output
- document-heavy legal workflows
- multilingual support
- verified citations
- reusable approved firm memory
- trust and reviewability
```
