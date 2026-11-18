import Check from '~icons/solar/check-read-linear'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'

type StepListProps = {
  labels: string[]
  current: number
  /** Jumps back to a step already done; steps ahead open only through Continuar. */
  onSelect: (index: number) => void
}

/** The steps as a column, beside the step: done ones can be revisited, the current one stands out. */
export function StepList({ labels, current, onSelect }: StepListProps): JSX.Element {
  return (
    <ol className="grid gap-1">
      {labels.map((label, index) => (
        <li key={label}>
          <StepRow label={label} index={index} current={current} onSelect={onSelect} />
        </li>
      ))}
    </ol>
  )
}

type StepRowProps = {
  label: string
  index: number
  current: number
  onSelect: (index: number) => void
}

function StepRow({ label, index, current, onSelect }: StepRowProps): JSX.Element {
  if (index < current) {
    return (
      <button
        type="button"
        onClick={() => onSelect(index)}
        className="hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
      >
        <span className="border-primary/60 text-primary-ink flex size-7 shrink-0 items-center justify-center rounded-full border">
          <Check aria-hidden="true" className="size-4" />
        </span>
        <span>{label}</span>
        <span className="sr-only">(concluído, voltar a este passo)</span>
      </button>
    )
  }

  return (
    <div
      aria-current={currentMarker(index, current)}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5',
        index === current && 'bg-primary/10 text-primary-ink font-medium',
        index > current && 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
          index === current && 'bg-primary text-primary-foreground',
          index > current && 'border',
        )}
      >
        {index + 1}
      </span>
      <span>{label}</span>
    </div>
  )
}

function currentMarker(index: number, current: number): 'step' | undefined {
  if (index === current) {
    return 'step'
  }

  return undefined
}
