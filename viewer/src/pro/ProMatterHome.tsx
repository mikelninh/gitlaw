import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenCheck,
  CircleHelp,
  FileCheck2,
  FolderOpen,
  ListChecks,
  Search,
  ShieldCheck,
} from 'lucide-react'
import ProDashboard from './ProDashboard'
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
    label: 'Review',
    detail: 'Anwaltlich prüfen und freigeben',
    icon: FileCheck2,
    to: '/pro/audit',
  },
] as const

export default function ProMatterHome() {
  const activeMatter = listCases().find(caseItem => caseItem.status === 'aktiv')
  const matterUrl = activeMatter ? `/pro/akten/${activeMatter.id}` : '/pro/akten'

  return (
    <div className="pro-matter-home space-y-8">
      <section className="pro-matter-command" aria-labelledby="matter-workspace-title">
        <div className="px-5 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="pro-matter-kicker">
                <ShieldCheck className="h-3.5 w-3.5" />
                Matter workspace · GitLaw Pro
              </p>
              <h1 id="matter-workspace-title" className="pro-matter-title">
                Vom Sachverhalt zur anwaltlichen Freigabe.
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
            const to = activeMatter && (index === 1 || index === 4) ? matterUrl : stage.to
            return (
              <Link key={stage.number} to={to} className="pro-matter-stage">
                <div className="pro-matter-stage-number">
                  <span>{stage.number}</span>
                  <Icon className="pro-matter-stage-icon" aria-hidden="true" />
                </div>
                <h3>{stage.label}</h3>
                <p>{stage.detail}</p>
              </Link>
            )
          })}
        </div>

        <div className="pro-matter-trustline">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-gold)]" aria-hidden="true" />
          <span>
            <strong>Human review by design.</strong> Quellen, Unsicherheit und offene Punkte bleiben bis zur Freigabe sichtbar.
          </span>
        </div>
      </section>

      <ProDashboard />
    </div>
  )
}
