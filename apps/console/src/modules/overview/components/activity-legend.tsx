import type { JSX } from 'react'

import { ACTIVITY_SERIES, type DailyActivity } from '@/modules/overview/components/activity-series'
import { totalOf } from '@/modules/overview/components/period-series'
import { cn } from '@/shared/lib/utils'

/** Each line's name with its total in the period. */
export function ActivityLegend({ days }: { days: DailyActivity[] }): JSX.Element {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {ACTIVITY_SERIES.map((series) => (
        <div key={series.id} className="grid gap-0.5">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <span aria-hidden className={cn('size-2 rounded-full', series.dot)} />
            {series.label}
          </dt>
          <dd className="text-2xl font-semibold tracking-tight text-heading tabular-nums">
            {totalOf(days, (day) => day[series.id]).toLocaleString('pt-BR')}
          </dd>
        </div>
      ))}
    </dl>
  )
}
