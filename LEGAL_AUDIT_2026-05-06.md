# Legal & Security Audit — 2026-05-06

Audit des public Repos auf DSGVO-Risiken, Secrets und Bao-bezogene PII.
Erstellt im Zuge des Repo-Root-Aufräumens für Bewerbungspräsentation.

---

## 1. Hardcoded Beta-Invite-Tokens (api/_auth.ts:15–25)

**Datei:** `api/_auth.ts`  
**Zeilen:** 15–25  
**Befund:**

```ts
const INVITE_MAP: Record<string, ...> = {
  'BETA-NGUYEN': { tenantId: 'kanzlei-nguyen', userId: 'nguyen-owner', role: 'owner' },
  'BETA-RUBIN':  { tenantId: 'kanzlei-rubin',  userId: 'rubin-owner',  role: 'owner' },
  'BETA-WERNER': { tenantId: 'kanzlei-gniosdorz', ... },
  'BETA-JASMIN': { tenantId: 'kanzlei-gniosdorz', ... },
  ...
}
```

Beta-Tokens sind im public Repo sichtbar. Wer den Code liest, kennt alle gültigen
Invite-Codes und kann sich bei der Live-Deploy damit einloggen.

**Risiko:** Mittel — Beta-Konten haben keinen echten Mandantendaten-Zugriff in Produktion,
aber die Tokens sollten nicht öffentlich sein.

**Empfehlung:** Tokens aus Code in Umgebungsvariablen auslagern (`GITLAW_BETA_TOKENS=...`
als JSON-Map in Vercel env). Vor Launch auf BETA-NGUYEN-Token von Bao informieren/rotieren.

---

## 2. JWT-Signing-Secret Fallback (api/_auth.ts:39)

**Datei:** `api/_auth.ts`  
**Zeile:** 39  
**Befund:**

```ts
function secret(): string {
  return process.env.GITLAW_SESSION_SECRET || process.env.OPENAI_API_KEY || 'gitlaw-beta-secret'
}
```

Wenn `GITLAW_SESSION_SECRET` nicht gesetzt ist, fällt das JWT-Signing auf `OPENAI_API_KEY`
zurück — und wenn das auch fehlt, auf den Hardcode-String `'gitlaw-beta-secret'`.

**Risiko:** Hoch — Sessions könnten gefälscht werden wenn `GITLAW_SESSION_SECRET` in Produktion
nicht gesetzt ist.

**Empfehlung:** `GITLAW_SESSION_SECRET` als Required-Env-Var setzen (throw statt fallback).
Prüfen ob es in allen Vercel-Environments gesetzt ist.

---

## 3. "Bao Nguyen" Vollname in public Code (viewer/src/pro/welcome-personas.ts:48)

**Datei:** `viewer/src/pro/welcome-personas.ts`  
**Zeile:** 48, 53  
**Befund:**

```ts
fullName: 'Bao Nguyen',
personalNote: 'Bao, dein Lastenheft hat den Plan für die nächsten Wochen geprägt...',
```

Vollname und persönliche Note sind im public Repo sichtbar.

**Risiko:** DSGVO-Grauzone — ob Bao dem öffentlichen Vorkommen seines Namens als Beta-Tester
zugestimmt hat, ist unklar.

**Empfehlung:** Bao fragen ob das ok ist. Falls nicht: `fullName` → `'Bao N.'` oder
den Personas-Eintrag in eine gitignored Datei auslagern.

---

## 4. Keine API-Keys im Code gefunden

Grep über alle `.ts`, `.js`, `.py`, `.json`, `.yaml`-Dateien ergab:
- Keine hardcodierten `OPENAI_API_KEY=sk-...`-Werte
- Keine `RESEND_*`, `UPSTASH_*`, `JWT_SECRET=`-Werte im Code
- Alle Secrets werden korrekt als `process.env.*` referenziert

Status: **OK**

---

## 5. Echte Mandantendaten in Test-Fixtures

Keine echten Namen, Adressen, Geburtsdaten oder Aktenzeichen in Test-Fixtures gefunden.
Demo-Daten verwenden `Mustermann`/`Nguyen`-Preset-Daten ohne PII.

Status: **OK**

---

## 6. LEGAL.md fehlt

Das Repo hat keinen öffentlichen Disclaimer der Art:
> "KI-gestützte Antworten ersetzen keine anwaltliche Prüfung."

**Empfehlung:** `LEGAL.md` mit diesem Disclaimer anlegen, von Mikel freigeben und mergen.
Alternativ in README.md einfügen.

---

## 7. PDF und ZIP nicht versioniert

- `Ki Datenverarbeitung Kanzlei Arbeitsgrundlage.pdf` — liegt im Working Tree, aber ist nicht
  in Git tracked (`.gitignore`-Eintrag oder einfach nie `git add`-ed). Prüfen ob das so bleibt.
- `gitlaw_pro_legal_workflow_automation_v1_crewai-project.zip` — ebenfalls untracked.

**Empfehlung:** Explizit zu `.gitignore` hinzufügen um versehentliches `git add .` zu verhindern.

---

## 8. Git-History enthält BAO_* Dateien

Die heute aus dem Repo-Root entfernten Bao-Dateien (9 Dateien) sind weiterhin in der
Git-History vorhanden. Das public GitHub-Repo zeigt sie bei alten Commits.

**Empfehlung:** BFG-Repo-Cleaner oder `git filter-repo` laufen lassen um sie aus der History
zu tilgen. Das erfordert einen `git push --force` auf alle Branches — **Mikel entscheidet.**
Anleitung: https://rtyley.github.io/bfg-repo-cleaner/
