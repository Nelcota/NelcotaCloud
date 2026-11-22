import type { JSX } from 'react'

import { usersHealth } from '@/modules/users/components/users-health'
import { RECENT_SIGN_UP_DAYS, useRecentSignUps } from '@/modules/users/queries/use-recent-sign-ups'
import { type StatusTotals, useStatusTotals } from '@/modules/users/queries/use-status-totals'
import { formatCount, formatShare } from '@/shared/lib/format-number'
import { AnimatedNumber } from '@/shared/ui/animated-number'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { StatCard } from '@/shared/ui/stat-card'
import { SummarySentence } from '@/shared/ui/summary-sentence'

/** The project's accounts in one sentence and four figures: all, new, unconfirmed and blocked. */
export function UsersSummary({ projectId }: { projectId: string }): JSX.Element {
  const totals = useStatusTotals(projectId)
  const recent = useRecentSignUps(projectId)

  return (
    <div className="flex flex-col gap-4">
      <UsersVerdict totals={totals} />
      <div className="grid grid-cols-2 gap-3 @min-[48rem]:grid-cols-4 @min-[48rem]:gap-4">
        <StatCard label="Usuários" value={<Figure value={totals.all} />} hint="No projeto" />
        <StatCard
          label="Novas"
          value={<Figure value={recent} />}
          hint={`Últimos ${RECENT_SIGN_UP_DAYS} dias`}
        />
        <StatCard
          label="Sem email confirmado"
          value={<Figure value={totals.unverified} />}
          hint={shareHint(totals.unverified, totals.all)}
        />
        <StatCard
          label="Bloqueados"
          value={<Figure value={totals.banned} />}
          hint="Sem login nem renovação"
        />
      </div>
    </div>
  )
}

function UsersVerdict({ totals }: { totals: StatusTotals }): JSX.Element | null {
  const health = usersHealth(totals)

  if (health === null) {
    return null
  }

  return (
    <SummarySentence tone={health.tone} verdict={health.verdict}>
      {health.sentence}
    </SummarySentence>
  )
}

function Figure({ value }: { value: number | undefined }): JSX.Element {
  if (value === undefined) {
    return <Skeleton className="my-1 h-7 w-14" />
  }

  return <AnimatedNumber value={value} format={formatCount} />
}

/** "50% dos usuários"; nothing to compare against while the totals load or with no accounts. */
function shareHint(part: number | undefined, all: number | undefined): string {
  if (part === undefined || all === undefined || all === 0) {
    return 'Dos usuários do projeto'
  }

  return `${formatShare(part / all)} dos usuários`
}
