import type { JSX, ReactNode } from 'react'

import { ActivityLegend } from '@/modules/overview/components/activity-legend'
import { ActivityPlot } from '@/modules/overview/components/activity-plot'
import { DailyTable } from '@/modules/overview/components/daily-table'
import { comparisonDays, splitPeriods } from '@/modules/overview/components/period-series'
import { useDailyUsageQuery } from '@/modules/overview/queries/use-daily-usage-query'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type ActivityChartCardProps = { projectId: string; days: number }

/** Logins against sign-ups per day in the period: the main chart of the page. */
export function ActivityChartCard({ projectId, days }: ActivityChartCardProps): JSX.Element {
  const daily = useDailyUsageQuery(projectId, comparisonDays(days))
  const period = splitPeriods(daily.data?.days, days).current

  if (period === undefined) {
    return (
      <ChartFrame days={days}>
        <LoadError error={daily.error} onRetry={() => void daily.refetch()} />
        {daily.isError === false && <Skeleton className="h-72" />}
      </ChartFrame>
    )
  }

  return (
    <ChartFrame days={days}>
      <ActivityLegend days={period} />
      <ActivityPlot days={period} />
      <DailyTable days={period} />
    </ChartFrame>
  )
}

function ChartFrame({ days, children }: { days: number; children: ReactNode }): JSX.Element {
  return (
    <section
      aria-labelledby="activity-chart-title"
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-border/60 bg-card p-4"
    >
      <div className="grid gap-0.5">
        <h2 id="activity-chart-title" className="text-base font-medium text-heading">
          Logins e cadastros
        </h2>
        <p className="text-xs text-muted-foreground">Por dia, nos últimos {days} dias (UTC).</p>
      </div>
      {children}
    </section>
  )
}
