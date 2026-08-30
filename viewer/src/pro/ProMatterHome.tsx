import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  CircleHelp,
  FileCheck2,
  FolderOpen,
  ListChecks,
  Search,
  ShieldCheck,
} from 'lucide-react'
import ProDashboard from './ProDashboard'
import { canAccessRoute } from './access'
import { listCases } from './store'

const FLOW = [
  {
    number: '01',
    label: 'Matter',
    detail: 'Akte, Auftrag und Kontext',
    icon: FolderOpen,
    to: '/pro/akten',
  },
  {
    number: '02',
    label: 'Relevante Fakten',
    detail: 'Belegt, unklar oder noch offen',
    icon: ListChecks,
    to: '/pro/akten',
  },
  {
    number: '03',
    label: 'Research',
    detail: 'Normen und Rechtsprechung',
    icon: Search,
    to: '/pro/recherche',
  },
  {
    number: '04',
    label: 'Quellen',
    detail: 'Fundstellen nachvollziehbar prüfen',
    icon: BookOpenCheck,
    to: '/pro/recherche',
  },
  {
    number: '05',
    label: 'Offene Fragen',
    detail: 'Lücken sichtbar statt wegformulieren',
    icon: CircleHelp,
    to: '/pro/akten',
  },
  {
    number: '06',
    label: 'Anwaltlicher Review',
    detail: 'Akte prüfen und offene Punkte klären',
    icon: FileCheck2,
    to: '/pro/akten',
  },
] as const

export default function ProMatterHome() {
  const activeMatter = listCases().find(caseItem => caseItem.status === 'aktiv')
  const matterUrl = activeMatter ? `/pro/akten/${activeMatter.id}` : '/pro/akten'
  const researchUrl = activeMatter
    ? `/pro/recherche?case=${encodeURIComponent(activeMatter.id)}`
    : '/pro/recherche'

  return (
    <div className="pro-matter-home space-y-8">
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-800">Kanzlei Autopilot V1</p>
            <h2 className="text-xl font-semibold mt-1">Nicht jede Akte öffnen. Nur Ausnahmen prüfen.</h2>
            <p className="text-sm text-[var(--color-ink-soft)] mt-1 max-w-2xl">
              Der Autopilot sortiert Fristen, ungeprüfte Recherche und andere anwaltliche Entscheidungen nach vorne. OCR, Dokument-Triage, fehlende Unterlagen, Timeline- und Draft-Vorbereitung bleiben darunter als Routinearbeit sichtbar.
            </p>
          </div>
          <Link to="/pro/autopilot" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-ink)] text-white px-5 py-3 font-semibold shrink-0 hover:opacity-90">
            <Bot className="w-4 h-4" /> Bao Today öffnen
          </Link>
        </div>
      </section>

      <section className="pro-matter-command" aria-labelledby="matter-workspace-title">
        <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="pro-matter-kicker">
                <ShieldCheck className="h-3.5 w-3.5" />
                Matter workspace · GitLaw Pro
              </p>
              <h1 id="matter-workspace-title" className="pro-matter-title">
                Vom Sachverhalt zum anwaltlichen Review.
              </h1>
              <p className="pro-matter-copy">
                GitLaw hält Fallkontext, Recherche, Quellen und offene Fragen in einem prüfbaren Arbeitsfluss zusammen.
                KI bereitet vor — die fachliche Entscheidung bleibt bei der Anwältin oder dem Anwalt.
              </p>
            </div>

            <Link to={matterUrl} className="pro-matter-current shrink-0">
              <FolderOpen className="h-4 w-4 text-[var(--color-gold)]" />
              {activeMatter ? (
                <>
                  <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">{activeMatter.aktenzeichen}</span>
                  <span className="max-w-[220px] truncate font-medium">{activeMatter.mandantName}</span>
                </>
              ) : (
                <span className="font-medium">Akte auswählen</span>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-[var(--color-ink-muted)]" />
            </Link>
          </div>
        </div>

        <div className="pro-matter-flow" aria-label="GitLaw Pro Arbeitsfluss">
          {FLOW.map((stage, index) => {
            const Icon = stage.icon
            let to: string = stage.to
            if (activeMatter && (index === 1 || index === 4 || index === 5)) to = matterUrl
            if (activeMatter && (index === 2 || index === 3)) to = researchUrl
            const routeForAccess = to.split('?')[0]
            const allowed = canAccessRoute(routeForAccess)

            const content = (
              <>
                <div className="pro-matter-stage-number">
                  <span>{stage.number}</span>
                  <Icon className="pro-matter-stage-icon" aria-hidden="true" />
                </div>
                <h3>{stage.label}</h3>
                <p>{stage.detail}</p>
              </>
            )

            if (!allowed) {
              return (
                <div
                  key={stage.number}
                  className="pro-matter-stage pro-matter-stage-disabled"
                  aria-disabled="true"
                  title="Für deine Rolle nicht freigeschaltet"
                >
                  {content}
                </div>
              )
            }

            return (
              <Link key={stage.number} to={to} className="pro-matter-stage">
                {content}
              </Link>
            )
          })}
        </div>

        <div className="pro-matter-trustline">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-gold)]" aria-hidden="true" />
          <span>
            <strong>Human review by design.</strong> Quellen, Unsicherheit und offene Punkte bleiben bis zur Prüfung sichtbar.
          </span>
        </div>
      </section>

      <ProDashboard />
    </div>
  )
}
