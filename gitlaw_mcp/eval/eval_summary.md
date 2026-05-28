# GitLaw MCP — outcome eval

_Run at 2026-05-28T16:55:23+00:00 · model `gpt-4o-mini` · 24 questions · 869.5s_

## Headline

- **Hallucination rate**: `5.9%` → `0.0%` (+5.9%)
- **Expected-citation hit rate**: `62.5%` → `62.5%` (+0.0%)
- Mean tool calls per question (treatment): **1.25**

## Per-condition stats

| Metric | Baseline | Treatment (+GitLaw MCP) |
|---|---:|---:|
| Hallucination rate | 5.9% | 0.0% |
| Expected hit rate | 62.5% | 62.5% |
| Citations per question | 2.12 | 1.46 |
| Total citations | 51 | 35 |
| Hallucinated citations | 3 | 0 |

## Per-question results

| # | Category | Question | Baseline hit | Treatment hit | Halluc B→T |
|---|---|---|:-:|:-:|:-:|
| miete-01 | Miete | Mein Vermieter kündigt mir wegen Eigenbedarf. Kann ich … | ✗ | ✓ | 0 → 0 |
| miete-02 | Miete | Wie hoch darf mein Vermieter die Miete erhöhen? | ✓ | ✓ | 0 → 0 |
| miete-03 | Miete | Ich habe Schimmel in der Wohnung. Darf ich die Miete kü… | ✓ | ✓ | 0 → 0 |
| miete-04 | Miete | Wie lange ist die Kündigungsfrist wenn ich als Mieter k… | ✗ | ✓ | 0 → 0 |
| miete-05 | Miete | Mein Vermieter zahlt mir die Kaution nicht zurück. Welc… | ✗ | ✓ | 0 → 0 |
| arbeit-01 | Arbeit | Mein Chef will mir kündigen. Welche Rechte habe ich bei… | ✓ | ✗ | 0 → 0 |
| arbeit-02 | Arbeit | Wieviele Urlaubstage stehen mir pro Jahr mindestens zu? | ✓ | ✓ | 0 → 0 |
| arbeit-03 | Arbeit | Was darf mein Arbeitgeber zur maximalen täglichen Arbei… | ✓ | ✓ | 0 → 0 |
| arbeit-04 | Arbeit | Was sind die Aufgaben und Rechte des Betriebsrats? | ✗ | ✗ | 0 → 0 |
| straf-01 | Strafrecht | Mein Ex bedroht mich auf WhatsApp damit, mein Wohnort z… | ✓ | ✓ | 0 → 0 |
| straf-02 | Strafrecht | Was ist Stalking strafrechtlich in Deutschland? | ✓ | ✓ | 0 → 0 |
| straf-03 | Strafrecht | Jemand hat mich öffentlich auf Instagram beleidigt. Wel… | ✓ | ✓ | 0 → 0 |
| straf-04 | Strafrecht | Was ist die rechtliche Definition von Betrug? | ✓ | ✗ | 0 → 0 |
| straf-05 | Strafrecht | Jemand greift mich körperlich an. Wann ist Notwehr erla… | ✓ | ✓ | 0 → 0 |
| straf-06 | Strafrecht | Was ist Nötigung im deutschen Strafrecht? | ✓ | ✗ | 0 → 0 |
| erbe-01 | Erbrecht | Mein Vater ist gestorben ohne Testament. Wer erbt? | ✗ | ✗ | 0 → 0 |
| erbe-02 | Erbrecht | Wie schreibe ich rechtsgültig ein handschriftliches Tes… | ✓ | ✓ | 0 → 0 |
| fam-01 | Familie | Ab wann habe ich Anspruch auf Elternzeit? | ✓ | ✓ | 0 → 0 |
| gg-01 | Grundgesetz | Habe ich das Recht meine politische Meinung öffentlich … | ✗ | ✗ | 0 → 0 |
| gg-02 | Grundgesetz | Ist die Menschenwürde in Deutschland antastbar? | ✗ | ✓ | 0 → 0 |
| gg-03 | Grundgesetz | Brauche ich für eine politische Demonstration eine Gene… | ✗ | ✗ | 3 → 0 |
| haft-01 | Zivilrecht | Mein Nachbar hat mein Auto beschädigt. Auf welcher Grun… | ✓ | ✗ | 0 → 0 |
| haft-02 | Zivilrecht | Mein Kaufvertrag wurde nicht erfüllt. Welcher Paragraph… | ✓ | ✓ | 0 → 0 |
| data-01 | Datenschutz | Was sind die Grundbegriffe des deutschen Datenschutzes … | ✗ | ✗ | 0 → 0 |
