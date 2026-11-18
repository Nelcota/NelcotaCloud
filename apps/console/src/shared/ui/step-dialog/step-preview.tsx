import type { JSX, ReactNode } from 'react'

import type { ReviewItem } from '@/shared/ui/review-list'

type StepPreviewProps = {
  illustration: ReactNode
  /** What has been filled in so far; empty values are left out. */
  summary: ReviewItem[]
}

/**
 * The right-hand panel of a guided dialog: the picture of what will happen, with its one-sentence
 * caption, and what has been filled in so far, kept in view while the steps are worked through.
 */
export function StepPreview({ illustration, summary }: StepPreviewProps): JSX.Element {
  return (
    <aside
      data-slot="step-preview"
      className="bg-muted/20 hidden min-h-0 flex-col gap-6 overflow-y-auto border-l p-6 lg:flex"
    >
      <h3 className="text-muted-foreground text-sm font-medium">O que vai acontecer</h3>
      {illustration}
      <FilledSoFar items={summary.filter(isFilled)} />
    </aside>
  )
}

function FilledSoFar({ items }: { items: ReviewItem[] }): JSX.Element | null {
  if (items.length === 0) {
    return null
  }

  return (
    <dl className="grid gap-3 border-t pt-5 text-sm">
      {items.map((item) => (
        <div key={item.label} className="grid gap-0.5">
          <dt className="text-muted-foreground text-xs">{item.label}</dt>
          <dd className="min-w-0 font-medium break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function isFilled(item: ReviewItem): boolean {
  if (typeof item.value === 'string') {
    return item.value.trim() !== ''
  }

  return item.value !== null && item.value !== undefined && item.value !== false
}
