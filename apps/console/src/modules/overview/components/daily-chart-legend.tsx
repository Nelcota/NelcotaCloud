import type { JSX } from 'react'

import { SERIES, formatCount } from '@/modules/overview/model/daily-chart-labels'
import { seriesTotal } from '@/modules/overview/model/daily-chart-scale'
import type { components } from '@/shared/api/api-schema'
import { Skeleton } from '@/shared/ui/skeleton'

type DailyActivity = components['schemas']['DailyActivity']

/** Names each line by its color and gives the period's total next to it. */
export function DailyChartLegend({
  days,
}: {
  days: readonly DailyActivity[] | undefined
}): JSX.Element {
  if (days === undefined) {
    return <Skeleton className="h-4 w-48" />
  }

  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {SERIES.map((series) => (
        <div key={series.key} className="flex items-center gap-2">
          <span aria-hidden="true" className={`h-0.5 w-3 rounded-full ${series.colorClass}`} />
          <dt className="text-muted-foreground">{series.label}</dt>
          <dd className="font-semibold tabular-nums">
            {formatCount(seriesTotal(days, series.key))}
          </dd>
        </div>
      ))}
    </dl>
  )
}
