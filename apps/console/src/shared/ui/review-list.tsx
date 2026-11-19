import type { JSX, ReactNode } from 'react'

export type ReviewItem = { label: string; value: ReactNode }

/** The last step of a guided dialog: everything chosen, in one place, before it is done. */
export function ReviewList({ items }: { items: ReviewItem[] }): JSX.Element {
  return (
    <dl className="@container divide-y rounded-xl border">
      {items.map((item) => (
        <div key={item.label} className="grid gap-1 px-4 py-3 @md:grid-cols-[10rem_1fr] @md:gap-4">
          <dt className="text-muted-foreground text-sm">{item.label}</dt>
          <dd className="min-w-0 text-sm font-medium break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
