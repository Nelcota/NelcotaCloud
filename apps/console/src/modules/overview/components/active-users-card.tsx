import UserCheck from '~icons/solar/user-check-linear'
import type { JSX } from 'react'

import { OverviewCard } from '@/modules/overview/components/overview-card'
import { countOrNull } from '@/modules/overview/components/overview-metrics'
import { useProjectUsageQuery } from '@/modules/overview/queries/use-project-usage-query'

/** Users who logged in or kept a session alive this month, by any login method. */
export function ActiveUsersCard({ projectId }: { projectId: string }): JSX.Element {
  const usage = useProjectUsageQuery(projectId)
  const lastMonth = countOrNull(usage.data?.active_users_last_month)

  return (
    <OverviewCard
      icon={UserCheck}
      title="Uso"
      metricLabel="Usuários ativos este mês"
      value={countOrNull(usage.data?.active_users_this_month)}
      error={usage.error}
      onRetry={() => usage.refetch()}
      detail={lastMonthDetail(lastMonth)}
      links={[{ label: 'Atividade', to: `/projects/${projectId}/activity` }]}
    />
  )
}

function lastMonthDetail(lastMonth: string | null): string | null {
  if (lastMonth === null) {
    return null
  }

  return `Mês passado: ${lastMonth}`
}
