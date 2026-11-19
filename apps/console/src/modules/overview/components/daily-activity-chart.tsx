import type { UseQueryResult } from '@tanstack/react-query'
import type { JSX } from 'react'

import { DailyChartLegend } from '@/modules/overview/components/daily-chart-legend'
import { DailyChartPlot } from '@/modules/overview/components/daily-chart-plot'
import { DailyChartTable } from '@/modules/overview/components/daily-chart-table'
import { useDailyUsageQuery } from '@/modules/overview/queries/use-daily-usage-query'
import type { components } from '@/shared/api/api-schema'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

type DailyUsage = components['schemas']['DailyUsage']

const CHART_DAYS = 30

/** Logins and sign-ups per day over the last month, with the month's totals as the legend. */
export function DailyActivityChart({ projectId }: { projectId: string }): JSX.Element {
  const usage = useDailyUsageQuery(projectId, CHART_DAYS)

  return (
    <section aria-labelledby="daily-activity-title" className="surface grid gap-4 p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="daily-activity-title" className="text-base">
          Últimos {CHART_DAYS} dias
        </h2>
        <DailyChartLegend days={usage.data?.days} />
      </header>
      <ChartBody usage={usage} />
    </section>
  )
}

function ChartBody({ usage }: { usage: UseQueryResult<DailyUsage> }): JSX.Element {
  const days = usage.data?.days

  if (usage.error !== null) {
    return <LoadError error={usage.error} onRetry={() => usage.refetch()} />
  }

  if (days === undefined) {
    return <Skeleton aria-label="Carregando gráfico" className="h-52 rounded-xl" />
  }

  return (
    <>
      <DailyChartPlot days={days} />
      <DailyChartTable days={days} />
    </>
  )
}
