import { ChevronRight, Code, Mail as Letter, Link, Database as Table, UserPlus } from 'lucide-react'
import type { JSX } from 'react'

import type { ProjectPurpose } from '@/modules/projects/components/project-draft'
import { RouterLink } from '@/shared/routing/router-link'
import type { IconComponent } from '@/shared/ui/icon-component'

type NextStep = { id: string; icon: IconComponent; label: string; hint: string; path: string }

const STEPS: readonly NextStep[] = [
  { id: 'connect', icon: Code, label: 'Conectar app', hint: 'Chaves de API', path: '/keys' },
  { id: 'email', icon: Letter, label: 'Configurar email', hint: 'SMTP e textos', path: '/email' },
  { id: 'social', icon: Link, label: 'Login social', hint: 'Google e GitHub', path: '/providers' },
  { id: 'team', icon: UserPlus, label: 'Convidar equipe', hint: 'Por email', path: '/team' },
  { id: 'table', icon: Table, label: 'Criar tabela', hint: 'API em /rest/v1', path: '/database' },
]

type NextStepsProps = { projectId: string; purpose: ProjectPurpose }

/** What usually comes next, as rows; a team project leads with the invitations. */
export function NextSteps({ projectId, purpose }: NextStepsProps): JSX.Element {
  return (
    <nav aria-label="E agora?">
      <ul className="divide-y divide-border/60">
        {orderedSteps(purpose).map((step) => (
          <li key={step.id}>
            <NextStepRow step={step} href={`/projects/${projectId}${step.path}`} />
          </li>
        ))}
      </ul>
    </nav>
  )
}

function NextStepRow({ step, href }: { step: NextStep; href: string }): JSX.Element {
  const Glyph = step.icon

  return (
    <RouterLink
      href={href}
      className="group flex h-10 items-center gap-2.5 px-3 text-xs outline-none hover:bg-surface focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
    >
      <Glyph aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="font-medium text-heading">{step.label}</span>
      <span className="ms-auto truncate text-2xs text-muted-foreground">{step.hint}</span>
      <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
    </RouterLink>
  )
}

function orderedSteps(purpose: ProjectPurpose): readonly NextStep[] {
  if (purpose === 'personal') {
    return STEPS
  }

  return [
    ...STEPS.filter((step) => step.id === 'team'),
    ...STEPS.filter((step) => step.id !== 'team'),
  ]
}
