import type { JSX } from 'react'

import { formatShare } from '@/shared/lib/format-number'

export type LegendEntry = {
  label: string
  /** A CSS color, usually a chart token such as `var(--chart-1)`. */
  color: string
  value: number
}

/** A chart's series with their share of the total ("2xx Sucesso 86,6%"). */
export function ChartLegend({ entries }: { entries: readonly LegendEntry[] }): JSX.Element {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0)

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {entries.map((entry) => (
        <li key={entry.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2 rounded-[2px]"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.label}</span>
          <span className="font-medium text-foreground tabular-nums">
            {shareOf(entry.value, total)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function shareOf(value: number, total: number): string {
  if (total <= 0) {
    return formatShare(0)
  }

  return formatShare(value / total)
}
