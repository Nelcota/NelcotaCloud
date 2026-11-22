import type { JSX } from 'react'

const WIDTH = 48
const HEIGHT = 16

type MiniatureStatProps = {
  label: string
  value: string
  context: string
  trend: number[]
}

/** One stat card of the login miniature: label, figure, its trend and one line of context. */
export function MiniatureStat({ label, value, context, trend }: MiniatureStatProps): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-surface p-2">
      <span className="truncate text-2xs text-muted-foreground">{label}</span>
      <div className="flex items-end justify-between gap-1">
        <span className="truncate text-sm font-semibold text-heading tabular-nums">{value}</span>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-4 w-12 shrink-0">
          <polyline
            points={sparklinePoints(trend)}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span className="truncate text-2xs text-muted-foreground tabular-nums">{context}</span>
    </div>
  )
}

function sparklinePoints(trend: number[]): string {
  const highest = Math.max(...trend, 1)
  const step = WIDTH / Math.max(trend.length - 1, 1)

  return trend
    .map((value, index) => `${index * step},${HEIGHT - 1 - (value / highest) * (HEIGHT - 2)}`)
    .join(' ')
}
