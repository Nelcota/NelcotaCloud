import type { JSX } from 'react'

import { periodText } from '@/modules/activity/components/activity-filters'
import { ActivitySummary } from '@/modules/activity/components/activity-summary'
import { useAuditSummaryQuery } from '@/modules/overview/queries/use-audit-summary-query'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'
import { LoadError } from '@/shared/ui/load-error'
import { StatCard } from '@/shared/ui/stat-card'

type AuditSummary = components['schemas']['AuditSummary']

type ActivityStatsProps = {
  projectId: string
  days: number
  onShowEvents: (address: string) => void
}

/** The period in one sentence (or the address to block), then its four figures. */
export function ActivityStats({ projectId, days, onShowEvents }: ActivityStatsProps): JSX.Element {
  const summary = useAuditSummaryQuery(projectId, days)

  return (
    <div className="flex flex-col gap-4">
      <LoadError error={summary.error} onRetry={() => summary.refetch()} />
      <ActivitySummary
        projectId={projectId}
        period={{ summary: summary.data, days }}
        onShowEvents={onShowEvents}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCards summary={summary.data} days={days} />
      </div>
    </div>
  )
}

type SummaryCardsProps = { summary: AuditSummary | undefined; days: number }

function SummaryCards({ summary, days }: SummaryCardsProps): JSX.Element {
  return (
    <>
      <StatCard
        label="Logins"
        value={figure(summary?.logins)}
        hint={`Sucessos ${periodText(days)}`}
      />
      <StatCard
        label="Usuários ativos"
        value={figure(summary?.active_users)}
        hint="Contas distintas que entraram"
      />
      <StatCard label="Recusados" value={figure(summary?.failures)} hint="Email ou senha errados" />
      <StatCard
        label="Alterações"
        value={figure(summary?.changes)}
        hint="Senha, dados, bloqueio, sessões"
      />
    </>
  )
}

function figure(value: number | undefined): string {
  if (value === undefined) {
    return '—'
  }

  return formatCount(value)
}
