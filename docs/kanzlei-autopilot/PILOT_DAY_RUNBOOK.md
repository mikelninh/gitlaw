# Bao Pilot Day — Start Testing Immediately, Safely

Goal for the meeting:

> Produce the first measured work wins **without requiring real mandate data to leave the safe boundary**.

Recommended duration: 45–60 minutes.

## Before Bao arrives

Product must show:

- PR/deployment commit identified
- authenticated `/pro/autopilot`
- `/pro/privacy` loads
- Privacy Proof Center readiness visible
- Safety Gauntlet passes all zero-egress probes
- synthetic demo workflow works end to end
- encrypted vault round-trip/tamper test green
- real-mandate external AI **LOCKED** unless full provider/Kanzlei gate truly reviewed
- Advoware live credentials not committed anywhere

## 0–10 min — Break the safety layer first

Open **Privacy Proof Center**.

Run the live gauntlet in front of Bao:

1. unclassified payload → HTTP 423 / provider=0
2. fake mandate canary → 423 / 0
3. real-mandate no consent → 423 / 0
4. raw e-mail/name → 423 / 0
5. previous-matter memory → 423 / 0

Then show:

- provider is pinned
- real-mandate readiness remains locked unless every evidence gate is green
- privacy receipts contain hashes, not the raw question
- plaintext real-mandate cloud sync is forbidden

**Success:** Bao understands what the system refuses to do before seeing what it automates.

## 10–20 min — Synthetic golden case

Use the explicit synthetic Bao demo matter.

Run:

1. intake/checklist
2. document state
3. safe Autopilot run
4. work packet
5. legal research
6. citation verification
7. first draft/review
8. privacy receipt

Measure clicks/time from raw state → review-ready packet.

**Success:** entire product works without real confidentiality risk.

## 20–40 min — First real matter in Shadow Mode

Bao chooses **one ordinary, representative, non-emergency matter**. Avoid the most sensitive/high-stakes case for the first shadow run.

Rules:

- classify it `real_mandate`
- no external AI
- no automatic external communication
- no binding deadline confirmation
- no beA submission
- no Advoware write without exact approval

Run only safe local/approved-system preparation:

- exact matter match
- Advoware delta/read where live connection is available
- checklist delta
- document inventory
- missing-document detection
- timeline/change packet
- deadline **candidate** surfacing
- Bao Today queue

For each step record:

| Workflow | Before (normal Bao process) | Pilot active minutes | Rework? | Safe? | Keep? |
|---|---:|---:|---|---|---|
| Find what changed | | | | | |
| Missing docs | | | | | |
| Reconstruct timeline | | | | | |
| Deadline triage | | | | | |
| Prepare next action | | | | | |

## 40–50 min — First wins

We want at least **three observable wins** such as:

### Win 1 — What changed?

Instead of Bao reopening/re-reading a case, Autopilot shows a delta packet.

Metric: minutes to understand current state.

### Win 2 — Missing documents

Instead of manually comparing documents against the mandate checklist, Autopilot prepares the missing set and bilingual factual draft.

Metric: minutes to a review-ready request.

### Win 3 — Deadline attention

Instead of dates hiding in documents, Autopilot surfaces a **candidate with source**, but Bao confirms the legal deadline.

Metric: detection time + false-positive/correction rate.

### Win 4 — Research/draft (synthetic first)

Source-backed research + draft appears from structured context.

Metric: minutes from question → lawyer-reviewed answer.

### Win 5 — Inbox compression

Raw incoming item becomes one exact matter delta / review item instead of another inbox task.

Metric: touches per incoming item.

## 50–60 min — Decide the next autonomy promotion

Do **not** ask “what feature next?”

Ask:

> Which repeated task stole the most minutes today that the system could safely prepare or execute next time?

Score each candidate:

`weekly minutes × frequency × safe automation potential × confidence`

Then promote only one bounded action.

Examples:

- approved factual missing-document message
- read-only Advoware delta every morning
- local OCR/classification processor
- automatic research trigger for synthetic/approved pseudonymised cases

## Privileged external AI decision

If the provider/Kanzlei gate is incomplete, finish the meeting with **P1 Shadow Mode**. That is a successful pilot, not a blocker.

Only if every relevant review/evidence item is genuinely complete should Bao consider one narrow P2 workflow. Then:

1. select one matter
2. record purpose
3. record evidence reference for required consent/approval
4. attest necessity
5. assign pseudonymous case reference
6. show outgoing pseudonymised facts
7. run Privacy Proof Center
8. make one provider call
9. inspect signed receipt
10. Bao reviews output

## End-of-meeting scoreboard

Record:

- matters tested
- documents/items processed
- minutes before
- minutes with Autopilot
- confirmed minutes returned
- rework minutes
- Bao attention items
- unsafe actions: target **0**
- privacy egress violations: target **0**
- cross-matter mistakes: target **0**
- missing receipts: target **0**

The best meeting outcome is not “everything autonomous.” It is:

> **We returned measurable time, Bao stayed in authority, and every confidentiality boundary held under attack.**
