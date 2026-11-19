import type { JSX, ReactNode } from 'react'

import { formatDayLabel } from '@/shared/lib/format-date'

type DayGroupsProps<Item> = {
  items: readonly Item[]
  /** The ISO moment that places an item on a day; items arrive newest first. */
  dateOf: (item: Item) => string
  renderItem: (item: Item) => ReactNode
}

/** A timeline split by day, each day under a quiet centered label ("Hoje", "Ontem", "3 de março"). */
export function DayGroups<Item>({ items, dateOf, renderItem }: DayGroupsProps<Item>): JSX.Element {
  const days = groupByDay(items, dateOf)

  return (
    <div className="grid gap-4">
      {days.map((day) => (
        <section key={day.label} aria-label={day.label} className="grid gap-1">
          <p
            aria-hidden="true"
            className="text-muted-foreground py-1 text-center text-xs font-medium"
          >
            {day.label}
          </p>
          <ul className="grid gap-0.5">{day.items.map(renderItem)}</ul>
        </section>
      ))}
    </div>
  )
}

function groupByDay<Item>(
  items: readonly Item[],
  dateOf: (item: Item) => string,
): { label: string; items: Item[] }[] {
  const days = new Map<string, Item[]>()

  for (const item of items) {
    const label = formatDayLabel(dateOf(item))
    const day = days.get(label) ?? []
    day.push(item)
    days.set(label, day)
  }

  return Array.from(days, ([label, dayItems]) => ({ label, items: dayItems }))
}
