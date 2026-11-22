import type { JSX } from 'react'

import { useDailyUsageQuery } from '@/modules/overview/queries/use-daily-usage-query'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type DailyActivity = components['schemas']['DailyActivity']

/** A day or two has no shape worth drawing; the figures beside it say it all. */
const MIN_CHART_DAYS = 7
const SLOT_WIDTH = 10
const BAR_WIDTH = 6
const CHART_HEIGHT = 48
/** Empty days keep a sliver so the baseline reads as "zero", not as missing data. */
const EMPTY_BAR_HEIGHT = 1.5

type DailyLoginsChartProps = { projectId: string; days: number }

/** Logins per day across the period, as quiet bars; each bar names its day on hover. */
export function DailyLoginsChart({ projectId, days }: DailyLoginsChartProps): JSX.Element | null {
  const usage = useDailyUsageQuery(projectId, days)
  const dailyActivity = usage.data?.days

  if (days < MIN_CHART_DAYS || usage.isError) {
    return null
  }

  if (dailyActivity === undefined) {
    return <Skeleton className="h-18 w-full @min-[56rem]:w-72" />
  }

  // A row of empty slivers says nothing the "0" beside it does not.
  if (dailyActivity.every((day) => day.logins === 0)) {
    return null
  }

  return (
    <figure className="grid w-full gap-1.5 @min-[56rem]:w-72">
      <figcaption className="text-xs text-muted-foreground">Logins por dia</figcaption>
      <DayBars dailyActivity={dailyActivity} />
      <div className="flex justify-between text-2xs text-muted-foreground tabular-nums">
        <span>{shortDate(dailyActivity.at(0)?.date ?? '')}</span>
        <span>hoje</span>
      </div>
    </figure>
  )
}

function DayBars({ dailyActivity }: { dailyActivity: DailyActivity[] }): JSX.Element {
  const peak = Math.max(1, ...dailyActivity.map((day) => day.logins))

  return (
    <svg
      viewBox={`0 0 ${dailyActivity.length * SLOT_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-12 w-full text-chart-1"
    >
      {dailyActivity.map((day, index) => {
        const height = Math.max(EMPTY_BAR_HEIGHT, (day.logins / peak) * CHART_HEIGHT)

        return (
          <rect
            key={day.date}
            x={index * SLOT_WIDTH}
            y={CHART_HEIGHT - height}
            width={BAR_WIDTH}
            height={height}
            fill="currentColor"
            fillOpacity={barOpacity(day.logins)}
          >
            <title>{`${shortDate(day.date)} · ${loginsText(day.logins)}`}</title>
          </rect>
        )
      })}
    </svg>
  )
}

function barOpacity(logins: number): number {
  if (logins === 0) {
    return 0.35
  }

  return 1
}

/** "2026-11-22" (a UTC day from the API) as "22/11". */
function shortDate(isoDay: string): string {
  const [, month, day] = isoDay.split('-')

  if (month === undefined || day === undefined) {
    return ''
  }

  return `${day}/${month}`
}

function loginsText(count: number): string {
  if (count === 1) {
    return '1 login'
  }

  return `${formatCount(count)} logins`
}
