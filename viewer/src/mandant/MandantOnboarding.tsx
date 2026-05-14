/**
 * MandantOnboarding — 3-Schritt Welcome für Erst-Login im Mandanten-Portal.
 *
 * Zielgruppe: vietnamesische Berlin-Mandanten, älter, Smartphone-first.
 * Design-Prinzipien:
 *  - Mobile-first, sehr große Tap-Targets (min 48px)
 *  - Eine Aktion pro Schritt
 *  - Kein Tech-Jargon
 *  - WhatsApp-bewusste Sprache
 */

import { useState } from 'react'
import { Heart, FileSearch, CheckCircle2, MessageCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import type { MandantLang } from './mandant-i18n'
import { getMandantStrings } from './mandant-i18n'

const ONBOARDING_KEY = 'gitlaw.mandant.onboarding.dismissed.v1'

interface Props {
  lang: MandantLang
  onDismiss: () => void
  mandantName: string
  kanzleiName: string
}

export default function MandantOnboarding({ lang, onDismiss, mandantName, kanzleiName }: Props) {
  const [step, setStep] = useState(0)
  const t = getMandantStrings(lang)

  const totalSteps = 3

  function handleDismiss() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    onDismiss()
  }

  function next() {
    if (step < totalSteps - 1) setStep(s => s + 1)
  }

  function back() {
    if (step > 0) setStep(s => s - 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Schritt-Anzeige */}
        <div className="flex gap-1.5 px-6 pt-5 pb-0">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-[var(--color-gold)]' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="px-6 pt-4 pb-2 text-xs text-[var(--color-ink-muted)]">
          {t.onboardingStepLabel(step + 1)}
        </div>

        {/* Schritt-Inhalt */}
        <div className="px-6 pb-8 min-h-[280px] flex flex-col">
          {step === 0 && <StepWelcome t={t} mandantName={mandantName} kanzleiName={kanzleiName} />}
          {step === 1 && <StepFeatures t={t} />}
          {step === 2 && <StepHelp t={t} />}
        </div>

        {/* Navigations-Buttons */}
        <div className="px-6 pb-8 flex gap-3">
          {step > 0 && (
            <button
              onClick={back}
              className="flex items-center gap-1.5 px-5 py-4 rounded-xl border border-[var(--color-border)] text-base font-medium text-[var(--color-ink-soft)] active:bg-slate-50"
            >
              <ChevronLeft className="w-5 h-5" />
              {t.onboardingBack}
            </button>
          )}

          {step < totalSteps - 1 ? (
            <button
              onClick={next}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-[var(--color-gold)] text-white text-base font-semibold active:opacity-80"
            >
              {t.onboardingNext}
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              className="flex-1 px-5 py-4 rounded-xl bg-[var(--color-gold)] text-white text-base font-semibold active:opacity-80"
            >
              {t.onboardingDismissFinal}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Schritt 1 — Willkommen
// ---------------------------------------------------------------------------

function StepWelcome({
  t,
  mandantName,
  kanzleiName,
}: {
  t: ReturnType<typeof getMandantStrings>
  mandantName: string
  kanzleiName: string
}) {
  return (
    <div className="flex flex-col items-center text-center gap-5 pt-4">
      <div className="w-20 h-20 rounded-full bg-[var(--color-bg-alt,_#fff8e6)] flex items-center justify-center">
        <Heart className="w-10 h-10 text-[var(--color-gold)]" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[var(--color-ink)] leading-snug">
          {mandantName ? t.onboardingWelcomeTitle(mandantName) : t.onboardingWelcomeTitlePlain}
        </h2>
        <p className="text-base text-[var(--color-ink-soft)] leading-relaxed">
          {t.onboardingWelcomeBody(kanzleiName)}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Schritt 2 — Was Sie hier tun können
// ---------------------------------------------------------------------------

function StepFeatures({ t }: { t: ReturnType<typeof getMandantStrings> }) {
  const features = [
    { icon: FileSearch, text: t.onboardingFeature1 },
    { icon: CheckCircle2, text: t.onboardingFeature2 },
    { icon: MessageCircle, text: t.onboardingFeature3 },
  ]

  return (
    <div className="pt-2 space-y-4">
      <h2 className="text-xl font-bold text-[var(--color-ink)]">{t.onboardingFeaturesTitle}</h2>
      <ul className="space-y-4">
        {features.map(({ icon: Icon, text }, idx) => (
          <li key={idx} className="flex items-start gap-4">
            <span className="shrink-0 w-11 h-11 rounded-full bg-[var(--color-bg-alt,_#fff8e6)] flex items-center justify-center">
              <Icon className="w-5 h-5 text-[var(--color-gold)]" />
            </span>
            <p className="text-base text-[var(--color-ink-soft)] leading-relaxed pt-2">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Schritt 3 — Bei Fragen
// ---------------------------------------------------------------------------

function StepHelp({ t }: { t: ReturnType<typeof getMandantStrings> }) {
  return (
    <div className="pt-2 space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-[var(--color-bg-alt,_#fff8e6)] flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-[var(--color-gold)]" />
        </span>
        <h2 className="text-xl font-bold text-[var(--color-ink)]">{t.onboardingHelpTitle}</h2>
      </div>
      <p className="text-base text-[var(--color-ink-soft)] leading-relaxed">{t.onboardingHelpBody}</p>
    </div>
  )
}
