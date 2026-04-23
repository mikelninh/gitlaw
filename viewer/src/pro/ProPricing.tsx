/**
 * Pricing-Page — sichtbar auch ohne Beta-Token (über Footer-Link von der
 * Auth-Page), damit interessierte Anwält:innen die Tiers + die Money-back-
 * Garantie sehen können bevor sie Zugang anfragen.
 *
 * Kern-Botschaft: 60 Tage Geld-zurück. Die Hürde sind nicht €79 — die
 * Hürde ist Risiko + Beta-Skepsis. Garantie nimmt das weg.
 */

import { Check, X, ShieldCheck } from 'lucide-react'

interface Tier {
  id: 'lite' | 'solo' | 'kanzlei' | 'notar'
  name: string
  price: string
  priceNote?: string
  badge?: string
  recommended?: boolean
  for: string
  features: Array<{ text: string; included: boolean | 'limited' }>
  cta: string
  bgClass: string
}

const TIERS: Tier[] = [
  {
    id: 'lite',
    name: 'Solo Lite',
    price: '€19',
    priceNote: '/Monat',
    for: 'Zum Reinschauen — 1-3 Akten/Monat',
    features: [
      { text: 'Bis zu 5 aktive Akten', included: 'limited' },
      { text: '10 Recherchen/Monat', included: 'limited' },
      { text: 'Branded PDF-Export', included: true },
      { text: 'Frist-Calculator', included: true },
      { text: 'Mandant:innen-Intake (3/Monat)', included: 'limited' },
      { text: 'Eigene Custom-Templates', included: false },
      { text: 'ZIP-Akten-Export', included: false },
      { text: 'Notariats-Templates', included: false },
      { text: 'Cloud-Sync für Kanzlei', included: false },
    ],
    cta: 'Lite testen',
    bgClass: 'bg-white',
  },
  {
    id: 'solo',
    name: 'Solo',
    price: '€79',
    priceNote: '/Monat',
    badge: 'meistgewählt',
    recommended: true,
    for: 'Solo-Anwält:in mit täglichem Schreib-Aufkommen',
    features: [
      { text: 'Unbegrenzte Akten', included: true },
      { text: 'Unbegrenzte Recherchen', included: true },
      { text: 'Branded PDF-Export', included: true },
      { text: 'Frist-Calculator + Erinnerungen', included: true },
      { text: 'Mandant:innen-Intake-Form (QR)', included: true },
      { text: 'Eigene Custom-Templates', included: true },
      { text: 'ZIP-Akten-Export', included: true },
      { text: 'Persönliche §-Notizen', included: true },
      { text: 'Audit-Log BHV-tauglich', included: true },
    ],
    cta: 'Solo wählen',
    bgClass: 'bg-gradient-to-b from-[var(--color-gold-light)] to-white',
  },
  {
    id: 'kanzlei',
    name: 'Kanzlei',
    price: '€149',
    priceNote: '/Anwält:in/Monat (ab 2)',
    for: 'Kanzlei mit 2+ Anwält:innen, geteilte Akten',
    features: [
      { text: 'Alles aus Solo', included: true },
      { text: 'Cloud-Sync zwischen Anwält:innen', included: true },
      { text: 'Geteilte Mandant:innen-Akten', included: true },
      { text: 'Rollen (Partner:in / Associate)', included: true },
      { text: 'Team-Freigabe-Workflow', included: true },
      { text: 'Kanzlei-weite Statistiken', included: true },
      { text: 'AVV-Vertrag (signiert)', included: true },
      { text: 'Priority-Support', included: true },
    ],
    cta: 'Kanzlei wählen',
    bgClass: 'bg-white',
  },
  {
    id: 'notar',
    name: 'Notariat-Add-on',
    price: '+€50',
    priceNote: '/Monat',
    for: 'Zusätzlich zu Solo/Kanzlei — für Notar:innen + Erbrecht',
    features: [
      { text: '12 Notariats-Templates', included: true },
      { text: 'Vorsorgevollmacht / Generalvollmacht', included: true },
      { text: 'Erbschein, Pflichtteil, Erbausschlagung', included: true },
      { text: 'Schenkungs- + Ehevertrag-Entwürfe', included: true },
      { text: 'Patientenverfügung', included: true },
      { text: 'Beurkundungs-Vorbereitung', included: true },
    ],
    cta: 'Add-on dazubuchen',
    bgClass: 'bg-white',
  },
]

const COMPARISON = [
  { feature: 'KI-Recherche mit verifizierten §', us: true, ramicro: false, datev: false, beck: 'partial' },
  { feature: 'Persönliche §-Notizen', us: true, ramicro: false, datev: false, beck: false },
  { feature: 'Branded PDF-Templates', us: true, ramicro: true, datev: true, beck: false },
  { feature: 'Frist-Calc aus Bescheid-Datum', us: true, ramicro: 'partial', datev: 'partial', beck: false },
  { feature: 'Mandant:innen-Intake QR', us: true, ramicro: false, datev: false, beck: false },
  { feature: 'DSGVO-Anonymisierer', us: true, ramicro: false, datev: false, beck: false },
  { feature: 'Open Source einsehbar', us: true, ramicro: false, datev: false, beck: false },
  { feature: 'Setup-Zeit', us: '3 Min', ramicro: '4 Wochen', datev: '6 Wochen', beck: '1 Woche' },
  { feature: 'Preis/Monat', us: '€79', ramicro: '€200', datev: '€300', beck: '€500' },
]

export default function ProPricing() {
  return (
    <div className="space-y-12 max-w-6xl">
      {/* Hero */}
      <header className="text-center space-y-3 pt-4">
        <h1 className="h-page mx-auto" style={{ fontSize: '2.5rem' }}>Preise für GitLaw Pro</h1>
        <p className="text-lg text-[var(--color-ink-soft)] max-w-2xl mx-auto">
          Vier Tiers, monatlich kündbar, 60 Tage Geld-zurück.
        </p>
      </header>

      {/* Money-back banner */}
      <div className="bg-gradient-to-r from-green-50 via-white to-green-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4">
        <ShieldCheck className="w-10 h-10 text-green-700 shrink-0 mt-1" />
        <div>
          <h2 className="font-semibold text-lg mb-1">60 Tage Geld-zurück-Garantie</h2>
          <p className="text-[var(--color-ink-soft)]">
            Wenn GitLaw Pro nach 60 Tagen <strong>nicht mindestens €1.000 deiner Zeit</strong>{' '}
            (≈ 4,5 h bei €220/h) gespart hat — schreib uns eine Mail. Volle Rückerstattung.
            Keine Fragen, kein Bürokratie-Marathon. Wir tracken die Ersparnis im Tool selbst,
            du musst nichts beweisen.
          </p>
        </div>
      </div>

      {/* Tiers */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map(t => (
            <div
              key={t.id}
              className={`relative ${t.bgClass} border-2 rounded-2xl p-6 ${
                t.recommended ? 'border-[var(--color-gold)] shadow-md' : 'border-[var(--color-border)]'
              }`}
            >
              {t.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-gold)] text-white text-xs uppercase tracking-wide px-2 py-1 rounded-full font-semibold">
                  {t.badge}
                </div>
              )}
              <h3 className="font-semibold text-lg">{t.name}</h3>
              <p className="text-xs text-[var(--color-ink-soft)] mt-1 min-h-[2.5rem]">{t.for}</p>
              <div className="my-4">
                <span className="text-3xl font-bold">{t.price}</span>
                {t.priceNote && (
                  <span className="text-sm text-[var(--color-ink-muted)] ml-1">{t.priceNote}</span>
                )}
              </div>
              <ul className="space-y-2 text-sm mb-6 min-h-[280px]">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {f.included === true ? (
                      <Check className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                    ) : f.included === 'limited' ? (
                      <span className="text-amber-700 text-xs font-semibold shrink-0 mt-0.5">○</span>
                    ) : (
                      <X className="w-4 h-4 text-[var(--color-ink-muted)] shrink-0 mt-0.5" />
                    )}
                    <span className={f.included === false ? 'text-[var(--color-ink-muted)] line-through' : ''}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <a
                href="mailto:mikel_ninh@yahoo.de?subject=GitLaw Pro Beta — Anfrage"
                className={`block text-center text-sm rounded-lg px-4 py-2.5 transition-colors ${
                  t.recommended
                    ? 'bg-[var(--color-ink)] text-white hover:opacity-90'
                    : 'border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-gold)]'
                }`}
              >
                {t.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--color-ink-muted)] text-center mt-4">
          Preise zzgl. 19 % USt. · monatlich kündbar · Jahres-Abo: 10 Monate zahlen, 12 Monate laufen.
        </p>
      </section>

      {/* Vergleichstabelle */}
      <section>
        <h2 className="text-2xl font-semibold mb-1 text-center">
          Wir ergänzen — wir ersetzen nicht
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)] text-center mb-6 max-w-2xl mx-auto">
          GitLaw Pro tritt nicht gegen RA-Micro / DATEV / Beck-Online an. Wir nehmen dir die 5 h
          Recherche + Schreiben pro Woche ab, die diese Tools nicht abdecken.
        </p>
        <div className="overflow-x-auto bg-white border border-[var(--color-border)] rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-alt)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Funktion</th>
                <th className="text-center px-4 py-3 bg-[var(--color-gold-light)] font-semibold">GitLaw Pro</th>
                <th className="text-center px-4 py-3 font-semibold">RA-Micro<br /><span className="text-xs font-normal text-[var(--color-ink-muted)]">€200/Mo</span></th>
                <th className="text-center px-4 py-3 font-semibold">DATEV<br /><span className="text-xs font-normal text-[var(--color-ink-muted)]">€300/Mo</span></th>
                <th className="text-center px-4 py-3 font-semibold">Beck-Online<br /><span className="text-xs font-normal text-[var(--color-ink-muted)]">€500/Mo</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {COMPARISON.map((row, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5">{row.feature}</td>
                  <td className="text-center px-4 py-2.5 bg-[var(--color-gold-light)]/50">
                    <Cell value={row.us} />
                  </td>
                  <td className="text-center px-4 py-2.5"><Cell value={row.ramicro} /></td>
                  <td className="text-center px-4 py-2.5"><Cell value={row.datev} /></td>
                  <td className="text-center px-4 py-2.5"><Cell value={row.beck} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-semibold mb-6 text-center">Häufige Fragen</h2>
        <div className="space-y-4 max-w-3xl mx-auto">
          {[
            {
              q: 'Wie funktioniert die 60-Tage-Garantie?',
              a: 'Du buchst, du nutzt 60 Tage. Wenn du nicht zufrieden bist — eine Mail an mikel_ninh@yahoo.de, volle Rückerstattung in 5 Werktagen. Wir tracken die Zeit-Ersparnis automatisch im Tool — du brauchst nichts zu beweisen, wir sehen das genauso.',
            },
            {
              q: 'Muss ich meine bisherige Software (RA-Micro, DATEV, Beck) kündigen?',
              a: 'Nein — explizit nicht. GitLaw Pro ist Ergänzung. Behalte alles. Wir nehmen dir die 5 h Recherche + Schreiben pro Woche ab, die deine Kanzleisoftware nicht abdeckt. Wenn du nach 6 Monaten merkst „Beck nutze ich nicht mehr" — schön. Aber das ist deine Entscheidung, nicht unser Verkaufsversprechen.',
            },
            {
              q: 'Was ist mit Mandant:innen-Daten? DSGVO?',
              a: 'KI-Recherche-Anfragen gehen aktuell an OpenAI (USA). Wir bieten in der App einen Anonymisierer-Button, der Namen/Adressen ersetzt bevor die Anfrage abgeht. Für Kanzlei-Tier liefern wir einen AVV-Vertragsentwurf. Vor produktivem Einsatz mit echten Mandant:innen-Daten empfehlen wir: Anonymisierer nutzen + AVV mit deiner Kanzlei abschließen.',
            },
            {
              q: 'Was wenn ich nach 30 Tagen kündige?',
              a: 'Monatlich kündbar bedeutet monatlich kündbar. Du zahlst den laufenden Monat, dann ist Schluss. Deine Daten kannst du als ZIP exportieren und behältst sie.',
            },
            {
              q: 'Kanzlei-Tier: bezahle ich für jede:n Anwält:in?',
              a: 'Ja — €149/Anwält:in/Monat ab 2 Anwält:innen. Beispiel: 3 Anwält:innen = €447/Monat. Ab 5 Anwält:innen sprich uns an für individuellen Pilot-Preis.',
            },
            {
              q: 'Kann ich mein Gesetzes-Archiv selbst hosten?',
              a: 'Ja. GitLaw ist Open Source (MIT-Lizenz). Du kannst das gesamte Bürger:innen-Tool selbst betreiben. Das Pro-Tier ist im Quellcode einsehbar (Business Source License — wird nach 4 Jahren MIT). Volle Transparenz, keine Vendor-Lock-in.',
            },
          ].map((item, i) => (
            <details key={i} className="bg-white border border-[var(--color-border)] rounded-xl group">
              <summary className="px-5 py-4 font-medium cursor-pointer flex items-center justify-between hover:bg-[var(--color-bg-alt)] rounded-xl">
                <span>{item.q}</span>
                <span className="text-[var(--color-ink-muted)] text-xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-5 pb-4 text-sm text-[var(--color-ink-soft)] leading-relaxed">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="text-center bg-[var(--color-bg-alt)] rounded-2xl p-8">
        <h2 className="text-xl font-semibold mb-2">Bereit?</h2>
        <p className="text-sm text-[var(--color-ink-soft)] mb-4">
          Beta-Zugänge geben wir gerade Stück für Stück raus. Eine kurze Mail reicht.
        </p>
        <a
          href="mailto:mikel_ninh@yahoo.de?subject=Beta-Zugang%20zu%20GitLaw%20Pro"
          className="inline-block bg-[var(--color-ink)] text-white rounded-lg px-6 py-3 font-medium hover:opacity-90"
        >
          Beta-Zugang anfragen
        </a>
      </section>
    </div>
  )
}

function Cell({ value }: { value: boolean | 'partial' | string }) {
  if (value === true) return <Check className="w-4 h-4 text-green-700 mx-auto" />
  if (value === false) return <X className="w-4 h-4 text-[var(--color-ink-muted)] mx-auto" />
  if (value === 'partial') return <span className="text-amber-700 font-semibold">teilweise</span>
  return <span className="text-sm">{value}</span>
}
