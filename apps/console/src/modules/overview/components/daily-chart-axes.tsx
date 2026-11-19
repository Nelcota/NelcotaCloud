import type { JSX } from 'react'

import { formatCount, shortDay } from '@/modules/overview/model/daily-chart-labels'
import type { components } from '@/shared/api/api-schema'

type DailyActivity = components['schemas']['DailyActivity']

const AXIS_TEXT = 'text-muted-foreground text-xs tabular-nums'

/** Top, middle (when whole) and zero, aligned with the gridlines. */
export function DailyChartYAxis({ maximum }: { maximum: number }): JSX.Element {
  const ticks = [maximum, maximum / 2, 0].filter((tick) => Number.isInteger(tick))

  return (
    <div aria-hidden="true" className="relative h-44 min-w-6">
      {ticks.map((tick) => (
        <span
          key={tick}
          className={`${AXIS_TEXT} absolute right-0 -translate-y-1/2`}
          style={{ top: `${100 - (tick / maximum) * 100}%` }}
        >
          {formatCount(tick)}
        </span>
      ))}
    </div>
  )
}

/** The first, middle and last day: enough to place any point without crowding the axis. */
export function DailyChartXAxis({ days }: { days: readonly DailyActivity[] }): JSX.Element {
  const first = days[0]
  const middle = days[Math.floor((days.length - 1) / 2)]
  const last = days[days.length - 1]

  return (
    <div aria-hidden="true" className={`${AXIS_TEXT} flex justify-between gap-2`}>
      <span>{dayLabel(first)}</span>
      <span>{dayLabel(middle)}</span>
      <span>{dayLabel(last)}</span>
    </div>
  )
}

function dayLabel(day: DailyActivity | undefined): string {
  if (day === undefined) {
    return ''
  }

  return shortDay(day.date)
}
