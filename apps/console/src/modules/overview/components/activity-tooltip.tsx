import type { CSSProperties, JSX } from 'react'

import { ACTIVITY_SERIES, type DailyActivity } from '@/modules/overview/components/activity-series'
import { longDay } from '@/modules/overview/components/chart-day'
import { cn } from '@/shared/lib/utils'

const FULL = 100
const HALF = FULL / 2

type ActivityTooltipProps = {
  day: DailyActivity
  /** The day's x, in percent of the chart's width. */
  x: number
}

/** The hovered day's logins and sign-ups, on the side of the point with more room. */
export function ActivityTooltip({ day, x }: ActivityTooltipProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 z-10 grid w-44 gap-1 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-popover"
      style={placementOf(x)}
    >
      <span className="font-medium text-heading">{longDay(day.date)}</span>
      {ACTIVITY_SERIES.map((series) => (
        <span key={series.id} className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className={cn('size-2 rounded-full', series.dot)} />
            {series.label}
          </span>
          <span className="tabular-nums">{day[series.id].toLocaleString('pt-BR')}</span>
        </span>
      ))}
    </div>
  )
}

// Positioned by the pointer, so its offset can only be an inline style.
function placementOf(x: number): CSSProperties {
  if (x <= HALF) {
    return { left: `calc(${x}% + 12px)` }
  }

  return { right: `calc(${FULL - x}% + 12px)` }
}
