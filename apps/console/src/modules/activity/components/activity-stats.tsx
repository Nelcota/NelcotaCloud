import type { JSX } from 'react'

import { periodText } from '@/modules/activity/components/activity-filters'
import { addressesNeedingAction } from '@/modules/activity/components/addresses-needing-action'
import { FailingAddressNotice } from '@/modules/activity/components/failing-address-notice'
import { useBlockedAddressesQuery } from '@/modules/activity/queries/use-blocked-addresses'
import { useAuditSummaryQuery } from '@/modules/overview/queries/use-audit-summary-query'
import type { components } from '@/shared/api/api-schema'
import { LoadError } from '@/shared/ui/load-error'
import { StatCard } from '@/shared/ui/stat-card'

type AuditSummary = components['schemas']['AuditSummary']

type ActivityStatsProps = {
  projectId: string
  days: number
  onShowEvents: (address: string) => void
}

/** The period's four figures, and the address to block when one keeps failing. */
export function ActivityStats({ projectId, days, onShowEvents }: ActivityStatsProps): JSX.Element {
  const summary = useAuditSummaryQuery(projectId, days)
  const blocks = useBlockedAddressesQuery(projectId)
  const failing = addressesNeedingAction(summary.data?.failing_addresses ?? [], blocks.data ?? [])
  const [first, ...others] = failing

  return (
    <div className="flex flex-col gap-4">
      <LoadError error={summary.error} onRetry={() => summary.refetch()} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCards summary={summary.data} days={days} />
      </div>
      {first !== undefined && (
        <FailingAddressNotice
          projectId={projectId}
          alert={{ address: first, otherCount: others.length, days }}
          onShowEvents={onShowEvents}
        />
      )}
    </div>
  )
}

type SummaryCardsProps = { summary: AuditSummary | undefined; days: number }

function SummaryCards({ summary, days }: SummaryCardsProps): JSX.Element {
  const period = periodText(days)

  return (
    <>
      <StatCard
        className="p-4"
        label="Logins"
        value={figure(summary?.logins)}
        hint={`Sucessos ${period}`}
      />
      <StatCard
        className="p-4"
        label="Usuários ativos"
        value={figure(summary?.active_users)}
        hint="Contas distintas que entraram"
      />
      <StatCard
        className="p-4"
        label="Recusados"
        value={figure(summary?.failures)}
        hint="Email ou senha errados"
      />
      <StatCard
        className="p-4"
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

  return value.toLocaleString('pt-BR')
}
