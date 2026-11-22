import type { JSX } from 'react'

const WIDTH = 48
const HEIGHT = 16

type MiniatureStatProps = {
  label: string
  value: string
  trend: number[]
}

/** One small metric card of the login miniature, with its trend as a sparkline. */
export function MiniatureStat({ label, value, trend }: MiniatureStatProps): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border bg-card p-2">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <div className="flex items-end justify-between gap-1">
        <span className="truncate text-sm font-semibold text-heading tabular-nums">{value}</span>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-4 w-12 shrink-0">
          <polyline
            points={sparklinePoints(trend)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
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
