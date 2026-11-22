import type { JSX } from 'react'

import { ACTIVITY_SERIES, type DailyActivity } from '@/modules/overview/components/activity-series'
import { totalOf } from '@/modules/overview/components/period-series'
import { formatCount } from '@/shared/lib/format-number'
import { cn } from '@/shared/lib/utils'

/** Each line's name with its total in the period. */
export function ActivityLegend({ days }: { days: DailyActivity[] }): JSX.Element {
  return (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {ACTIVITY_SERIES.map((series) => (
        <div key={series.id} className="inline-flex items-center gap-1.5">
          <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span aria-hidden className={cn('size-2 rounded-[2px]', series.dot)} />
            {series.label}
          </dt>
          <dd className="font-medium text-foreground tabular-nums">
            {formatCount(totalOf(days, (day) => day[series.id]))}
          </dd>
        </div>
      ))}
    </dl>
  )
}
