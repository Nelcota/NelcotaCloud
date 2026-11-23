import type { JSX } from 'react'

import { type StepMarkState, StepMark } from '@/shared/ui/step-mark'
import { cn } from '@/shared/lib/utils'

export type CreationStep = {
  id: string
  label: string
  state: StepMarkState
  /** Mono lines under the label: what this step touches. */
  details: readonly string[]
}

/** One line of the creation checklist, like an instance line of a deploy in progress. */
export function CreationProgressStep({ step }: { step: CreationStep }): JSX.Element {
  return (
    <li className="grid gap-1">
      <span
        className={cn(
          'flex items-center gap-2.5 text-xs text-muted-foreground',
          step.state === 'working' && 'font-medium text-heading',
          step.state === 'done' && 'text-foreground',
        )}
      >
        <StepMark state={step.state} />
        {step.label}
        <StateText state={step.state} />
      </span>
      {step.details.map((detail) => (
        <code key={detail} className="truncate ps-6.5 font-mono text-xs text-muted-foreground">
          {detail}
        </code>
      ))}
    </li>
  )
}

const STATE_TEXTS: Record<StepMarkState, string> = {
  done: 'concluída',
  current: 'em andamento',
  working: 'em andamento',
  next: 'a seguir',
}

function StateText({ state }: { state: StepMarkState }): JSX.Element {
  return <span className="sr-only"> ({STATE_TEXTS[state]})</span>
}
