<!-- paos:reviewed=2026-09-01 -->
# Architecture

## System shape

```text
                     authenticated matter / task
                              ↓
              ┌──────────── GitLaw Pro ────────────┐
              │                                     │
              │ matter context      case documents │
              │       ↓                    ↓        │
              │  research tools      doc review     │
              │       └──────────┬─────────┘        │
              │                  ↓                  │
              │      source-grounded workspace     │
              │                  ↓                  │
              │               draft                │
              │                  ↓                  │
              │       LAWYER REVIEW / RELEASE       │
              │                  ↓                  │
              │             audit trail             │
              └─────────────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
  German federal-law corpus                 pilot-private state
 exact / BM25 / semantic                     auth / matter data
 paragraph graph / sources                    review / audit
 deterministic citation check                protected boundary
```

## Existing proof architecture

GitLaw already separates several concerns that should remain separate:

- legal corpus ingestion and normalisation;
- exact, BM25 and semantic retrieval;
- paragraph graph lookup;
- deterministic citation verification;
- generated/structured assistance;
- React/TypeScript user surfaces;
- authenticated Pro pilot boundaries;
- API/MCP capabilities;
- audit and review gates;
- CI/evals for citation integrity, law-firm edge cases and public Pro E2E.

The Product Architecture Pack does not replace these. It explains why the pieces exist, which user workflow they serve and which decisions agents are not allowed to make.

## Data ownership / separation

### Public legal corpus

The federal-law corpus and source metadata are public research inputs. Retrieval evidence should remain independently inspectable from model-generated interpretation.

### Pilot-private matter state

Real matter data, uploads, identifiers, feedback, review decisions and audit state belong to the authenticated pilot boundary. They are not public portfolio material by default.

A public synthetic playground may mirror the workflow without sharing that private state.

## Capability boundaries

### GREEN — reversible implementation choices

- internal retrieval/ranking experiments that preserve source visibility and evaluation;
- UI refinements inside the approved workflow;
- regression tests and synthetic fixtures;
- non-consequential draft assistance inside the authenticated workspace.

### AMBER — human/product approval

- adding a new document type or external provider;
- changing retention defaults;
- expanding a pilot user's accessible matter scope;
- material changes to retrieval/ranking behaviour used by existing workflows;
- new integrations that move matter data across a system boundary.

### RED — lawyer / explicit human authority

- final legal judgement;
- releasing or sending consequential legal output;
- filing, submitting or otherwise acting externally on a matter;
- weakening authentication or matter isolation;
- exposing confidential pilot evidence publicly;
- changing the final-review authority rule;
- silently extending model authority because a test suite passes.

## Trust principle

**Generation is not authority, and retrieval evidence is not hidden inside generation.**

The system may help reconstruct, search, compare, prepare and draft. The lawyer remains able to inspect the source trail and remains the final authority at the consequential boundary.

## Feedback architecture

Bao's pilot feedback follows a separate product-learning path:

```text
real use
  ↓
feedback synthesiser
  ↓
P0 / P1 / P2 + file/workflow pointer
  ↓
change to spec / implementation / eval
  ↓
regression or golden-case update
  ↓
retest
```

Feedback processing should preserve verbatim signal internally while keeping confidential or identifying context out of public proof unless explicitly suitable for publication.
