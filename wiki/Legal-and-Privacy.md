# Legal & Privacy

What's covered, what's open, what's decided.

## License

**AGPL-3.0** for the entire repository (citizen app, Pro tier, law corpus, RAG stack).

Why AGPL not MIT or Apache: AGPL closes the SaaS loophole. Anyone offering this software as a network service must publish their changes under the same license. For a legal-tech tool, that protects the openness long-term — somebody can't take this codebase and ship it as a closed commercial fork.

License text: [LICENSE](https://github.com/mikelninh/gitlaw/blob/main/LICENSE).

Note for forks: keep the repository public if you offer it as a service. Reach out for a commercial license if you need otherwise.

## DSGVO compliance — citizen tier

The citizen tier (`gitlaw.app`, `gitlaw-xi.vercel.app/`) collects:

- **Nothing persistent.** Searches, AI questions, and selected templates are not logged to a user account because there is no user account.
- **Browser-local only.** Bookmarks and reading history live in `localStorage`, never leave the device.
- **OpenAI calls (anonymized).** When a user asks an AI question, the question is sent to OpenAI EU endpoint after passing through the anonymizer (14 PII patterns: names, addresses, IBAN, BIC, Steuer-ID, SV-Nr., Aktenzeichen, dates, companies). User questions don't include personal data by design — but the anonymizer is a safety net.
- **No tracking.** No Google Analytics, no Meta Pixel, no Hotjar. Server logs are aggregated and rotated.
- **No cookies** beyond the strictly-necessary ones (HashRouter state).

## DSGVO compliance — Pro tier

The Pro tier is invite-token-gated, currently in closed beta with one pilot law firm.

| Concern | How it's handled |
|---|---|
| Hosting | Vercel Frankfurt + Upstash Redis Frankfurt + Resend EU. No US data transfer in normal operation. |
| AVV | Template available; signed before any productive use. See `BAO_PILOT_DATENSCHUTZ.md` (private) for full pilot agreement structure. |
| Verschlüsselung | TLS 1.3 in transit · AES-256 at rest in Upstash |
| RBAC | Tenant-bound signed sessions with `tenantId + role`. Cross-tenant API access returns 403. |
| Audit-Log | Lückenlos für alle Workflow-Events (case create, status change, letter generate, login, etc.). BHV-tauglich als PDF exportierbar. |
| DSGVO-Anonymizer | Läuft client-seitig vor jeder OpenAI-Anfrage. 14 PII-Patterns + Whitelist gegen Falsch-Anonymisierung von Rechtsbegriffen. |
| Notausgang | 1-Klick "Erase All Pro Data" löscht den kompletten Tenant in localStorage. |
| OpenAI training | Org-Setting "no training" + `X-No-Train` Header pro Anfrage. |
| Berufsgeheimnis | Architektonisch eingebaut: kein KI-Output wird automatisch versendet, jeder PDF-Export hat Disclaimer-Footer. |

## Limitations honestly stated

What we **do not** guarantee:

- **100% DSGVO compliance** without external audit. We strongly recommend a DSGVO audit (~€2-5k external) before productive use with real client data.
- **100% correct AI answers.** LLM hallucinations cannot be statistically excluded. Citation verifier catches paragraph-level errors (53/53 eval cases pass) but cannot catch semantic errors.
- **100% correct Vietnamese translation** without native-speaker voice polish per pilot.
- **Zero-day exploit immunity.** No software vendor can promise this.

## Drittanbieter (data processors)

| Provider | Purpose | Region | AVV |
|---|---|---|---|
| Vercel | Hosting + Serverless Functions | Frankfurt | Standard EU AVV |
| Upstash | Redis cache + Pro Cloud-Sync | Frankfurt | Standard EU AVV |
| OpenAI | LLM (gpt-4o-mini, embeddings) | EU endpoint | Standard contract clauses; "no training" header |
| Resend (planned Sprint 2) | Transactional e-mail (Pro) | EU | Standard EU AVV |
| GitHub | Source hosting + Pages | US | Public open-source repo, no PII |

For Pro-tier productive use with real client data, sign an AVV (Auftragsverarbeitungs-Vertrag) between Mikel Ninh as Auftragsverarbeiter and the law firm as Auftraggeber. Template available on request.

## Disclaimer

GitLaw is a research and template tool. AI-generated answers and letters do **not** replace legal advice and do **not** constitute legal counsel. Every output must be reviewed by a qualified Anwält:in before use.

The software is in closed beta. Functionality, data model, and error states can change without notice during the pilot phase.

## German-specific obligations

- **§ 5 TMG (Impressum):** required for hosted app. Operator: Mikel Ninh, Berlin. Live in citizen and Pro footers.
- **§ 13 TMG / DSGVO Art. 13 (Datenschutzerklärung):** linked from citizen footer. Pro Datenschutzerklärung requires AVV signature first.
- **§ 43a BRAO (Anwaltliche Verschwiegenheit):** Pro tier architectural sicherung — kein Auto-Versand, jede KI-Antwort durch Anwalt freigegeben.
- **§ 50 BRAO (Aufbewahrungsfristen):** 6 Jahre nach Mandatsabschluss. Cold-Storage-Konzept geplant Sprint 4 + automatisches Lösch-Script Sprint 5.

## Legal contact

- **Operator + technischer Verantwortlicher:** Mikel Ninh, Berlin · mikel_ninh@yahoo.de
- **Berliner Datenschutzaufsicht:** mailbox@datenschutz-berlin.de · 030/13889-0
- **DSGVO-Auskunftsanfragen:** an mikel_ninh@yahoo.de mit Betreff "DSGVO Auskunft"

## Open items for Mikel before public launch

- [ ] External DSGVO audit before productive Pro pilot (planned KW 19-22)
- [ ] Add explicit Datenschutzerklärung to Pro footer (currently in citizen only)
- [ ] AVV signature with Bao before first real client data
- [ ] Mandanten-Einwilligungs-Block in Intake-Formular (Sprint 2)
- [ ] AVV-Liste der Drittanbieter aktuell halten in `LEGAL.md` (TBD)
