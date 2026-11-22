import type { JSX } from 'react'

import { MetricCard } from '@/modules/overview/components/metric-card'
import { comparisonDays, splitPeriods } from '@/modules/overview/components/period-series'
import { RefusedLoginsCard } from '@/modules/overview/components/refused-logins-card'
import { statFiguresOf } from '@/modules/overview/components/stat-figures'
import { useAuditSummaryQuery } from '@/modules/overview/queries/use-audit-summary-query'
import { useDailyUsageQuery } from '@/modules/overview/queries/use-daily-usage-query'
import { useProjectUsageQuery } from '@/modules/overview/queries/use-project-usage-query'
import { useUsersQuery } from '@/modules/users/queries/use-users'
import { LoadError } from '@/shared/ui/load-error'

/** One user is enough to read the total; the list itself stays on the users page. */
const TOTAL_ONLY = { email: '', status: 'all', offset: 0, limit: 1 } as const

type StatRowProps = { projectId: string; days: number }

/** The four numbers a developer checks first, each with its trend. */
export function StatRow({ projectId, days }: StatRowProps): JSX.Element {
  const users = useUsersQuery(projectId, TOTAL_ONLY)
  const daily = useDailyUsageQuery(projectId, comparisonDays(days))
  const usage = useProjectUsageQuery(projectId)
  const summary = useAuditSummaryQuery(projectId, days)
  const failed = [users, daily, usage, summary].filter((query) => query.isError)
  const period = splitPeriods(daily.data?.days, days)
  const figures = statFiguresOf({ total: users.data?.total, period, usage: usage.data })

  function retry(): void {
    failed.forEach((query) => {
      void query.refetch()
    })
  }

  return (
    <section aria-label="Métricas" className="grid gap-3">
      <LoadError error={failed[0]?.error ?? null} onRetry={retry} />
      <div className="grid gap-4 @min-[36rem]:grid-cols-2 @min-[56rem]:grid-cols-4">
        <MetricCard
          label="Usuários"
          figure={figures.users}
          comparison={`em ${days} dias`}
          isRunningTotal
        />
        <MetricCard label="Ativos no mês" figure={figures.active} comparison="vs. mês passado" />
        <MetricCard
          label="Logins"
          figure={figures.logins}
          comparison={loginsComparison(period.previous, days)}
        />
        <RefusedLoginsCard summary={summary.data} days={days} />
      </div>
    </section>
  )
}

function loginsComparison(previous: unknown[] | null, days: number): string {
  if (previous === null) {
    return `em ${days} dias`
  }

  return `vs. ${days} dias antes`
}
