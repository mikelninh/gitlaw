# Architecture

```mermaid
flowchart LR
  A[Existing inbox / DMS / upload] --> B[n8n intake]
  B --> C[PDF text extraction]
  C -->|scan / low text| D[EU OCR fallback]
  C --> E[Data minimisation]
  D --> E
  E --> F[GitLaw Behörden agent]
  F --> G[Typed review packet]
  G --> H{Human approval}
  H -->|revise / reject| I[Revision queue]
  H -->|approve| J[Existing system adapters]
  J --> K[Task]
  J --> L[Calendar deadline]
  J --> M[Email draft]
  J --> N[DMS case update]
  K --> O[Outcome tracking]
  L --> O
  M --> O
  N --> O
```

## Data boundaries

- **System of record:** customer's existing inbox/DMS/case system.
- **Orchestration:** n8n stores only the execution data required for the agreed
  retention period.
- **Reasoning:** GitLaw receives the minimum text needed for classification and
  drafting.
- **Approval:** the human sees the original and extracted fields together.
- **Write-back:** only approved, typed actions cross into production systems.

## Scaling path

For the first pilot, one n8n instance is enough. At higher volume, run n8n with
Postgres and queue workers, use Redis for execution dispatch, and move OCR to
background workers. Scaling should follow measured volume, not precede it.
