import { ArrowRight } from 'lucide-react'
import type { JSX } from 'react'

import type { NextStep, NextStepKind } from '@/modules/overview/components/next-step'
import { RouterLink } from '@/shared/routing/router-link'
import { Button } from '@/shared/ui/primitives/button'
import type { StatusTone } from '@/shared/ui/status-badge'
import { StatusDot } from '@/shared/ui/status-dot'

const HEADINGS: Record<NextStepKind, { label: string; tone: StatusTone }> = {
  warning: { label: 'Atenção', tone: 'warning' },
  setup: { label: 'Próximo passo', tone: 'neutral' },
  done: { label: 'Situação', tone: 'success' },
}

/** What to do now: a heading, one sentence and the button that goes there. */
export function NextStepBody({ step }: { step: NextStep }): JSX.Element {
  const heading = HEADINGS[step.kind]

  return (
    <div className="grid gap-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span aria-hidden className="flex">
          <StatusDot tone={heading.tone} label={heading.label} />
        </span>
        {heading.label}
      </span>
      <h2 className="text-lg font-semibold text-heading">{step.title}</h2>
      <p className="text-sm text-muted-foreground">{step.text}</p>
      <StepAction action={step.action} />
    </div>
  )
}

function StepAction({ action }: { action: NextStep['action'] }): JSX.Element | null {
  if (action === null) {
    return null
  }

  return (
    <Button asChild className="mt-2 justify-self-start">
      <RouterLink href={action.to}>
        {action.label}
        <ArrowRight aria-hidden data-icon="inline-end" />
      </RouterLink>
    </Button>
  )
}
