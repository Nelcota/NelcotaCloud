import type { JSX } from 'react'

import { SERIES, formatCount, shortDay } from '@/modules/overview/model/daily-chart-labels'
import { horizontalPercent } from '@/modules/overview/model/daily-chart-scale'
import type { components } from '@/shared/api/api-schema'

type DailyActivity = components['schemas']['DailyActivity']

type DailyChartActiveDayProps = {
  days: readonly DailyActivity[]
  activeIndex: number | null
  maximum: number
}

/** The crosshair on the picked day, a dot on each line and one tooltip with every series. */
export function DailyChartActiveDay(props: DailyChartActiveDayProps): JSX.Element | null {
  const { days, activeIndex, maximum } = props

  if (activeIndex === null) {
    return null
  }

  const day = days[activeIndex]

  if (day === undefined) {
    return null
  }

  const left = horizontalPercent(activeIndex, days.length)

  return (
    <>
      <div className="bg-foreground/25 absolute inset-y-0 w-px" style={{ left: `${left}%` }} />
      {SERIES.map((series) => (
        <span
          key={series.key}
          className={`ring-card absolute size-2.5 -translate-1/2 rounded-full ring-2 ${series.colorClass}`}
          style={{ left: `${left}%`, top: `${100 - (day[series.key] / maximum) * 100}%` }}
        />
      ))}
      <DayTooltip day={day} left={left} />
    </>
  )
}

function tooltipPlacement(left: number): string {
  if (left > 50) {
    return '-translate-x-[calc(100%+0.75rem)]'
  }

  return 'translate-x-3'
}

/** Opens away from the nearer edge, so it never leaves the chart. */
function DayTooltip({ day, left }: { day: DailyActivity; left: number }): JSX.Element {
  const placement = tooltipPlacement(left)

  return (
    <div
      role="status"
      className={`bg-popover text-popover-foreground ring-foreground/10 pointer-events-none absolute top-0 grid min-w-32 gap-1 rounded-lg px-3 py-2 text-xs shadow-lg ring-1 ${placement}`}
      style={{ left: `${left}%` }}
    >
      <span className="text-muted-foreground">{shortDay(day.date)}</span>
      {SERIES.map((series) => (
        <span key={series.key} className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-0.5 w-3 rounded-full ${series.colorClass}`} />
          <span className="font-semibold tabular-nums">{formatCount(day[series.key])}</span>
          <span className="text-muted-foreground">{series.label}</span>
        </span>
      ))}
    </div>
  )
}
