import { Check } from 'lucide-react'
import type { JSX } from 'react'

import { Spinner } from '@/shared/ui/primitives/spinner'

/** A checklist row's state: finished, the one in view, running now, or still ahead. */
export type StepMarkState = 'done' | 'current' | 'working' | 'next'

/** The checklist marker of the deploy-progress pattern: check, orange dot, spinner or muted dot. */
export function StepMark({ state }: { state: StepMarkState }): JSX.Element {
  if (state === 'done') {
    return (
      <span
        aria-hidden
        className="grid size-4 shrink-0 place-items-center rounded-full bg-success/16 text-success"
      >
        <Check className="size-3.5 stroke-3" />
      </span>
    )
  }

  if (state === 'working') {
    return <Spinner aria-hidden role="presentation" className="size-4 shrink-0 text-brand" />
  }

  if (state === 'current') {
    return (
      <span
        aria-hidden
        className="grid size-4 shrink-0 place-items-center rounded-full bg-brand-subtle"
      >
        <span className="size-1.5 rounded-full bg-brand" />
      </span>
    )
  }

  return (
    <span aria-hidden className="grid size-4 shrink-0 place-items-center">
      <span className="size-1.5 rounded-full bg-faint" />
    </span>
  )
}
