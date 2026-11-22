import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { StepMark, type StepMarkState } from '@/shared/ui/step-mark'

export type EnrollmentStepState = 'done' | 'current' | 'pending'

type EnrollmentStepItemProps = {
  label: string
  state: EnrollmentStepState
  /** The step's controls, shown only while it is the current one. */
  children: ReactNode
}

/** One row of the MFA checklist: a check when done, an orange dot now, a muted dot ahead. */
export function EnrollmentStepItem({
  label,
  state,
  children,
}: EnrollmentStepItemProps): JSX.Element {
  return (
    <li aria-current={currentMarker(state)} className="grid gap-3">
      <span
        className={cn(
          'flex items-center gap-2.5 text-xs text-muted-foreground',
          state === 'current' && 'font-medium text-heading',
          state === 'done' && 'text-foreground',
        )}
      >
        <StepMark state={markOf(state)} />
        {label}
        {state === 'done' && <span className="sr-only"> (concluído)</span>}
      </span>
      <StepBody state={state}>{children}</StepBody>
    </li>
  )
}

function StepBody({
  state,
  children,
}: {
  state: EnrollmentStepState
  children: ReactNode
}): JSX.Element | null {
  if (state !== 'current') {
    return null
  }

  return <div className="flex flex-col gap-4 ps-6.5">{children}</div>
}

const MARKS: Record<EnrollmentStepState, StepMarkState> = {
  done: 'done',
  current: 'current',
  pending: 'next',
}

function markOf(state: EnrollmentStepState): StepMarkState {
  return MARKS[state]
}

function currentMarker(state: EnrollmentStepState): 'step' | undefined {
  if (state === 'current') {
    return 'step'
  }

  return undefined
}
