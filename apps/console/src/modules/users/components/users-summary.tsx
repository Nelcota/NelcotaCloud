import type { JSX } from 'react'

import { RECENT_SIGN_UP_DAYS, useRecentSignUps } from '@/modules/users/queries/use-recent-sign-ups'
import { useStatusTotals } from '@/modules/users/queries/use-status-totals'
import { StatCard } from '@/shared/ui/stat-card'

/** The project's accounts in four figures: all, new, unconfirmed and blocked. */
export function UsersSummary({ projectId }: { projectId: string }): JSX.Element {
  const totals = useStatusTotals(projectId)
  const recent = useRecentSignUps(projectId)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard className="p-4" label="Total" value={figure(totals.all)} hint="Contas no projeto" />
      <StatCard
        className="p-4"
        label="Novos no período"
        value={figure(recent)}
        hint={`Últimos ${RECENT_SIGN_UP_DAYS} dias`}
      />
      <StatCard
        className="p-4"
        label="Não confirmados"
        value={figure(totals.unverified)}
        hint="Email ainda não confirmado"
      />
      <StatCard
        className="p-4"
        label="Bloqueados"
        value={figure(totals.banned)}
        hint="Sem login nem renovação"
      />
    </div>
  )
}

function figure(total: number | undefined): string {
  if (total === undefined) {
    return '—'
  }

  return total.toLocaleString('pt-BR')
}
