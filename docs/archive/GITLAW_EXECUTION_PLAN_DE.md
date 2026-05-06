# GitLaw Pro Execution Plan

## Company goal

Build the default supervised agentic workflow for small law firms in Europe.

## Success definition

GitLaw Pro wins if a small law firm says:

- "Unsere Erstbearbeitung ist jetzt schneller."
- "Unsere Assistenz kann mehr vorbereiten."
- "Unsere Dokumente laufen endlich in einem klaren Pfad."
- "Die KI ist nuetzlich, ohne unkontrollierbar zu werden."

## North star

`Time from intake to first lawyer-approved draft`

Secondary metrics:

- percentage of intakes converted into structured cases
- percentage of document jobs completed without manual re-upload
- research-to-draft conversion rate
- approval rate of AI-generated work product
- weekly active firm seats
- retained firms after 90 days

## Revenue model

### Phase 1: paid pilots

Sell:

- setup fee
- monthly pilot
- founder-led onboarding

Example:

- `Setup`: EUR 1.5k - 5k
- `Pilot`: EUR 299 - 1,200 / month depending on seats and workflow depth

Why:

- gets real revenue early
- funds implementation
- creates testimonials and product truth

### Phase 2: seat + workflow pricing

Charge for:

- base firm plan
- per active seat
- document/OCR volume
- premium modules

Example shape:

- `Base firm`: EUR 249 - 499 / month
- `Per lawyer / staff seat`: EUR 39 - 129 / month
- `OCR / translation / export usage tiers`

### Phase 3: vertical modules

Upsells:

- migration workflow pack
- criminal defense workflow pack
- family law pack
- advanced audit/compliance
- document automation bundle

## Product roadmap

### Phase 0: wedge MVP

Goal:

Prove that one firm gets real value from intake -> research -> draft.

Must-have:

- multilingual intake
- internal file renaming
- intake triage
- inbox -> case handoff
- legal research with citation verification
- draft letters
- save / review / approved answer memory
- visible beta onboarding

Status:

- largely already present in beta form

### Phase 1: production foundation

Goal:

Make the product safe enough to run a real small-firm pilot.

Must-have:

- real auth
- server-side RBAC
- tenant isolation
- EU storage
- audit hardening
- session security
- deletion and retention basics

Why first:

- without this, trust and real usage cap out early

### Phase 2: document intelligence

Goal:

Turn documents into the main workflow advantage.

Must-have:

- secure upload
- OCR pipeline
- VI->DE and other translation support with machine-warning
- document classification
- extract deadlines, authorities, case signals
- original / OCR / translated / approved views

This is likely the single biggest product unlock.

### Phase 3: agentic orchestration

Goal:

Move from "tools around AI" to "supervised multi-agent workflow".

Must-have:

- intake agent
- document agent
- research agent
- verification agent
- drafting agent
- workflow recommendation agent

Output:

- suggested next steps
- suggested documents to request
- suggested research threads
- suggested draft type

### Phase 4: firm memory and specialization

Goal:

Make the product get better inside each firm over time.

Must-have:

- approved answer memory
- preferred wording memory
- practice-area checklists
- common authority/argument patterns
- retrieval from past approved work

This is where the moat starts compounding.

## Go-to-market

### Wedge market

Start with:

- Germany
- small firms
- migration-heavy and document-heavy work

Why:

- strongest pain
- multilingual need
- high intake chaos
- high value from OCR + translation + drafting

### Sales motion

Initial:

- founder-led direct sales
- 10-30 warm/cold firm conversations
- 3-5 paid pilots
- deep onboarding and support

Message:

- less chaos
- faster first drafts
- safer AI usage
- multilingual intake advantage

### Landing-page promise

`From intake chaos to lawyer-approved first draft in one workflow.`

### Demo story

Best demo:

1. Vietnamese intake arrives
2. Files are renamed and triaged
3. OCR / translation is triggered
4. Research answer is generated and verified
5. Draft letter is produced
6. Lawyer approves and sends

This is dramatically better than showing isolated features.

## 12-month execution plan

### Months 0-2

- sharpen company thesis and landing page
- identify 10 target firms
- close 2-3 design partners
- finish production foundation gap analysis
- instrument funnel and product events

Deliverable:

- first paid pilot revenue

### Months 2-4

- ship auth / RBAC / tenant core
- real onboarding flow for firm setup
- usage analytics
- pilot support loop

Deliverable:

- first firms using real cases in limited scope

### Months 4-6

- secure upload + OCR + translation
- better case/document timeline
- review and approval screens
- pilot case studies

Deliverable:

- "document-to-draft" becomes real product claim

### Months 6-9

- agent orchestration v1
- next-step suggestions
- deeper memory / retrieval
- practice-specific workflows

Deliverable:

- stronger retention and expansion inside firms

### Months 9-12

- pricing polish
- referral/case-study engine
- packaged verticals
- stronger admin/compliance exports

Deliverable:

- repeatable pilot-to-subscription conversion

## Moat-building priorities

In order:

1. workflow depth
2. document intelligence
3. approved-answer memory
4. tenant-safe trust layer
5. practice-specific specialization

Do not confuse moat with model quality.

## What to implement next

### Immediate company-building priorities

1. production foundation gap sheet
2. real pilot pricing page / offer
3. secure document upload path
4. OCR + translation pipeline
5. one airtight vertical demo flow

### Product priorities in plain English

- stop adding broad features
- finish the one killer workflow
- make it safe
- make it obviously faster than the old way

## Risks

### Risk 1: too broad too early

Mitigation:

- focus on one practice-heavy wedge

### Risk 2: cool AI, weak workflow

Mitigation:

- north star is case throughput, not model cleverness

### Risk 3: trust gap

Mitigation:

- human approval, verification, audit, EU storage

### Risk 4: long sales cycle

Mitigation:

- start with small firms and paid pilots

## One-sentence operating principle

`Build the safest and fastest path from intake chaos to approved legal draft.`
