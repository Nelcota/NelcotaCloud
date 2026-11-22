import { Check } from 'lucide-react'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'

type StepTrackProps = {
  labels: readonly string[]
  activeIndex: number
  /** Done steps are buttons that go back to them; later steps are not reachable yet. */
  onStepClick?: (index: number) => void
}

/** The steps of a task as numbered segments: done, current and still ahead. */
export function StepTrack({ labels, activeIndex, onStepClick }: StepTrackProps): JSX.Element {
  return (
    <ol aria-label="Passos" className="flex min-w-0 items-center gap-2">
      {labels.map((label, index) => (
        <li key={label} className="flex min-w-0 flex-1 flex-col gap-2">
          <span
            aria-hidden
            className={cn(
              'h-0.5 rounded-full bg-surface-hover',
              index <= activeIndex && 'bg-brand',
            )}
          />
          <StepLabel
            label={label}
            index={index}
            activeIndex={activeIndex}
            onStepClick={onStepClick}
          />
        </li>
      ))}
    </ol>
  )
}

function StepLabel({
  label,
  index,
  activeIndex,
  onStepClick,
}: {
  label: string
  index: number
  activeIndex: number
  onStepClick?: (index: number) => void
}): JSX.Element {
  const content = (
    <>
      <StepMark index={index} activeIndex={activeIndex} />
      <span className="truncate">{label}</span>
    </>
  )
  const className = cn(
    'flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground',
    index === activeIndex && 'font-medium text-foreground',
  )

  if (index < activeIndex && onStepClick !== undefined) {
    return (
      <button
        type="button"
        className={cn(className, 'rounded-sm hover:text-foreground')}
        onClick={() => onStepClick(index)}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={className} aria-current={index === activeIndex ? 'step' : undefined}>
      {content}
    </span>
  )
}

function StepMark({ index, activeIndex }: { index: number; activeIndex: number }): JSX.Element {
  if (index < activeIndex) {
    return <Check aria-hidden className="size-4 shrink-0 text-primary" />
  }

  return <span className="shrink-0 tabular-nums">{index + 1}.</span>
}
