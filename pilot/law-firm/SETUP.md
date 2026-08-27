# GitLaw Pro · Law-Firm Pilot Mode — einmaliges Admin-Setup

Danach arbeitet Operations nur über die Browser-Console.

## 1. Server-/Vercel-Secrets

Für den Pilot-Endpoint müssen als Secrets gesetzt sein:

- `GITLAW_PILOT_SERVICE_TOKEN` — zufällig, mindestens 32 Zeichen; eigener Token nur für den Pilot
- `GITLAW_PILOT_TENANT_ID` — feste interne Tenant-ID des Pilot-Setups
- vorhandener LLM-Provider-Key gemäß GitLaw-Konfiguration

Der Service-Token gehört **nicht** in Git, Kundendokumente oder Screenshots. Vor einem externen Pilot rotieren, wenn er zuvor in Testumgebungen verwendet wurde.

## 2. Operations-Rechner

- aktuelles GitLaw-Repo
- Node 22+
- Python 3
- lokaler Gesetzeskorpus (`laws/`)
- Umgebungsvariable `GITLAW_PILOT_ENDPOINT=https://<deployment>/api/pro/pilot-replay`
- Umgebungsvariable `GITLAW_PILOT_SERVICE_TOKEN=<secret>`

Danach:

```text
pilot/law-firm/start-gitlaw-pilot-ops.cmd
```

Der Launcher führt zuerst `admin-readiness.mjs` aus. Nur bei `READY` öffnet die Operations Console.

## 3. Transferkanal

Vor Kunde #1 genau **einen von der Kanzlei freigegebenen Transferkanal** festlegen. Der Pilotcode legt keinen Cloud-Anbieter rechtlich als zulässig fest. Operations dokumentiert beim Closeout zusätzlich, dass die dortige Upload-/Transferkopie gelöscht wurde.

## 4. Kundenpaket

Operations sendet:

- `CUSTOMER_START.md`
- `templates/cases.template.csv`
- `templates/PILOT_APPROVAL_TEMPLATE.md`

## 5. Kein produktiver Zugang

Für den Standardpilot werden **keine** DMS-, Advoware-, RA-Micro-, E-Mail-, beA-, Kalender-, Bank- oder Mandantenportal-Zugänge eingerichtet.

## 6. Erst nach echtem Proof erweitern

Produktive Integrationen oder personenbezogene/pseudonymisierte Mandatsdaten sind ein neuer Scope mit separater Berufsrechts-/Datenschutz-/Security-Prüfung. Sie werden nicht durch einen erfolgreichen historischen Pilot automatisch freigeschaltet.
