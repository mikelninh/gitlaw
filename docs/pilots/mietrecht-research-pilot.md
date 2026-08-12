# GitLaw Mietrecht Research Pilot — August 2026

## Why this pilot exists

GitLaw already has a large legal corpus and several technical evaluation suites. This pilot measures a different thing: **does the product help a real person complete a real legal-research task?**

The pilot is intentionally narrow. It focuses on German residential tenancy questions and the BGB tenancy provisions. It does **not** claim complete legal advice and it does not treat synthetic or deterministic tests as user evidence.

## Demo

`https://gitlaw-xi.vercel.app/#/mietrecht`

The pilot experience should let a reviewer:

1. type their own Mietrecht question;
2. inspect the BGB provisions GitLaw retrieved;
3. read an explanation grounded only in those retrieved passages;
4. see explicit limits when case law, local rules, contract facts or documents may be required;
5. mark the result as **helpful / partial / missing** and add a correction.

## Who to test with first

Aim for 3–5 people, prioritising people who can judge the legal research rather than merely the interface:

- practising lawyer / legal professional;
- law student or legal operations person;
- tenant-counselling / housing-domain experience;
- one ordinary tenant for comprehension and usability.

Do not present friends or the project author as independent legal validation.

## Test protocol

Ask the reviewer to bring real or realistic **anonymised** questions. Do not tell them which paragraphs GitLaw is expected to find before they run the test.

For each task record:

| Field | Value |
| --- | --- |
| Question | |
| Relevant source found? | yes / partial / no |
| Important source missing? | |
| Irrelevant or misleading source? | |
| Explanation useful? | yes / partial / no |
| Important factual question GitLaw should have asked? | |
| Time to useful research starting point | |
| Human correction | |
| Would reviewer use this again for first-pass research? | yes / maybe / no |

### Suggested starter questions

These are prompts, **not gold-standard answers**. The reviewer should judge the legal result.

1. Mein Vermieter will meine Miete um 20 % erhöhen. Was muss ich prüfen?
2. Mein Vermieter kündigt wegen Eigenbedarf. Welche Punkte sind wichtig?
3. Wie lange darf mein Vermieter meine Kaution nach dem Auszug behalten?
4. Seit einer Woche funktioniert die Heizung nicht. Welche Regeln sind relevant?
5. In meiner Wohnung ist Schimmel. Darf ich die Miete mindern?
6. Meine Nebenkostenabrechnung kommt mir viel zu hoch vor. Was sollte ich prüfen?
7. Darf mein Vermieter unangekündigt meine Wohnung betreten?
8. Darf ich ein Zimmer untervermieten?
9. Mein Vermieter modernisiert das Haus und erhöht danach die Miete. Welche Regeln gelten?
10. Die Miete in meinem neuen Vertrag liegt deutlich über dem Mietspiegel. Wo fange ich an?
11. Mein Vermieter möchte mich wegen zwei verspäteten Mietzahlungen kündigen. Was ist relevant?
12. Wer muss eine kaputte Therme reparieren?
13. Muss ich beim Auszug renovieren?
14. Darf ich einen Hund in meiner Mietwohnung halten?
15. Welche Kündigungsfrist habe ich als Mieter nach mehreren Jahren Mietdauer?

Questions 7, 13 and 14 are useful stress tests because statutory BGB text alone may not be enough; case law or contract facts can be decisive. A good system should expose that limitation rather than manufacture certainty.

## What counts as success

Do **not** choose a target percentage before seeing the first data just to create a flattering metric.

For the first 20–30 reviewed tasks, report at least:

- number of real/anonymised tasks;
- number and role of reviewers;
- useful without correction;
- useful after small correction;
- not useful / important source missed;
- most common failure modes;
- changes made because of reviewer feedback.

A credible result might look like this **only after it actually happens**:

> 4 reviewers · 28 anonymised research questions · 18 useful without correction · 6 useful after correction · 4 misses. The most common failure was missing case-law context; those misses became regression cases.

Never publish this example as a real result.

## Failure → regression loop

Every meaningful correction should become one of:

- a retrieval test case;
- a query/topic hint improvement;
- a source-coverage gap;
- a clarification question;
- a UI/comprehension issue;
- a deliberate `cannot answer from this corpus` case.

The goal is not to make the demo look infallible. The goal is to show that **real failures improve the system**.

## Application claim before user evidence

Safe wording:

> I built GitLaw, a live German-law research system, and narrowed one workflow into a real-user Mietrecht pilot: bring your own question, inspect the retrieved BGB sources, see uncertainty, and correct what the system missed.

## Application claim after user evidence

Update only with measured numbers reviewed by real testers. Keep the raw pilot notes privately available for interview discussion.
