import { type JSX, type PointerEvent, useState } from 'react'

import {
  ACTIVITY_SERIES,
  type DailyActivity,
  valuesOf,
} from '@/modules/overview/components/activity-series'
import { ActivityTooltip } from '@/modules/overview/components/activity-tooltip'
import { shortDay } from '@/modules/overview/components/chart-day'
import { linePath, nearestIndex, xAt } from '@/modules/overview/components/growth-geometry'
import { countRange } from '@/modules/overview/components/chart-range'

/**
 * Logins and sign-ups per day on one scale from zero. Decorative for screen readers: the
 * legend's totals and the per-day table say the same in words.
 */
export function ActivityPlot({ days }: { days: DailyActivity[] }): JSX.Element | null {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const first = days[0]
  const last = days.at(-1)

  if (first === undefined || last === undefined) {
    return null
  }

  const range = countRange(ACTIVITY_SERIES.flatMap((series) => valuesOf(days, series)))

  function trackPointer(event: PointerEvent<HTMLDivElement>): void {
    const bounds = event.currentTarget.getBoundingClientRect()
    setActiveIndex(nearestIndex((event.clientX - bounds.left) / bounds.width, days.length))
  }

  // A raw element: the chart follows the pointer over it, which no layout component exposes.
  return (
    <div className="grid gap-2">
      <div
        className="relative h-56 touch-pan-y border-b border-dashed"
        onPointerMove={trackPointer}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <span
          aria-hidden
          className="absolute -top-1 left-0 text-xs text-muted-foreground tabular-nums"
        >
          {range.max.toLocaleString('pt-BR')}
        </span>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="size-full overflow-visible"
        >
          {ACTIVITY_SERIES.map((series) => (
            <path
              key={series.id}
              d={linePath(valuesOf(days, series), range)}
              className={series.color}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <Hover days={days} activeIndex={activeIndex} />
      </div>
      <div aria-hidden="true" className="flex justify-between text-xs text-muted-foreground">
        <span>{shortDay(first.date)}</span>
        <span>{shortDay(last.date)}</span>
      </div>
    </div>
  )
}

type HoverProps = { days: DailyActivity[]; activeIndex: number | null }

function Hover({ days, activeIndex }: HoverProps): JSX.Element | null {
  if (activeIndex === null) {
    return null
  }

  const day = days[activeIndex]

  if (day === undefined) {
    return null
  }

  const x = xAt(activeIndex, days.length)

  // Placed by the hovered day, so its offset can only be an inline style.
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-px bg-muted-foreground/40"
        style={{ left: `${x}%` }}
      />
      <ActivityTooltip day={day} x={x} />
    </>
  )
}
