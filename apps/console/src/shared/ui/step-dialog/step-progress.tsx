import Check from '~icons/solar/check-read-linear'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'

type StepProgressProps = {
  labels: string[]
  current: number
}

/** Where the user is: every step by name, done ones checked, the current one marked. */
export function StepProgress({ labels, current }: StepProgressProps): JSX.Element {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {labels.map((label, index) => (
        <li
          key={label}
          aria-current={currentMarker(stepState(index, current))}
          className={cn(
            'flex items-center gap-2',
            stepState(index, current) === 'upcoming' && 'text-muted-foreground',
            stepState(index, current) === 'current' && 'font-medium',
          )}
        >
          <StepMarker index={index} current={current} />
          {label}
        </li>
      ))}
    </ol>
  )
}

type StepState = 'done' | 'current' | 'upcoming'

function currentMarker(state: StepState): 'step' | undefined {
  if (state === 'current') {
    return 'step'
  }

  return undefined
}

function stepState(index: number, current: number): StepState {
  if (index < current) {
    return 'done'
  }

  if (index === current) {
    return 'current'
  }

  return 'upcoming'
}

const MARKER_STYLES: Record<StepState, string> = {
  done: 'border border-primary/60 text-primary-ink',
  current: 'bg-primary text-primary-foreground',
  upcoming: 'border text-muted-foreground',
}

function StepMarker({ index, current }: { index: number; current: number }): JSX.Element {
  const state = stepState(index, current)

  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
        MARKER_STYLES[state],
      )}
    >
      <MarkerContent state={state} number={index + 1} />
    </span>
  )
}

function MarkerContent({ state, number }: { state: StepState; number: number }): JSX.Element {
  if (state === 'done') {
    return (
      <>
        <Check aria-hidden="true" className="size-4" />
        <span className="sr-only">(concluído)</span>
      </>
    )
  }

  return <span aria-hidden="true">{number}</span>
}
