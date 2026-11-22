import type { JSX, ReactNode } from 'react'

import { formatCount } from '@/shared/lib/format-number'

export type RankedItem = { key: string; label: ReactNode; value: number }

type RankedListProps = {
  title: string
  /** The column headings: what the rows are, and what the number counts. */
  columns: { label: string; value: string }
  items: readonly RankedItem[]
  empty: string
}

/** The busiest entries first, each over a bar as long as its share of the first one. */
export function RankedList({ title, columns, items, empty }: RankedListProps): JSX.Element {
  const top = Math.max(1, ...items.map((item) => item.value))

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/60 bg-card p-4">
      <h3 className="text-sm font-medium text-heading">{title}</h3>
      <div className="flex justify-between text-2xs text-muted-foreground">
        <span>{columns.label}</span>
        <span>{columns.value}</span>
      </div>
      <RankedRows items={items} top={top} empty={empty} />
    </div>
  )
}

type RankedRowsProps = { items: readonly RankedItem[]; top: number; empty: string }

function RankedRows({ items, top, empty }: RankedRowsProps): JSX.Element {
  if (items.length === 0) {
    return <p className="py-3 text-xs text-muted-foreground">{empty}</p>
  }

  return (
    <ol className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.key} className="relative flex h-7 items-center justify-between gap-3 px-2">
          <span
            aria-hidden
            className="absolute inset-y-0 start-0 rounded-md bg-surface-hover"
            style={{ width: `${(item.value / top) * 100}%` }}
          />
          <span className="relative min-w-0 truncate font-mono text-xs">{item.label}</span>
          <span className="relative font-mono text-xs text-heading tabular-nums">
            {formatCount(item.value)}
          </span>
        </li>
      ))}
    </ol>
  )
}
