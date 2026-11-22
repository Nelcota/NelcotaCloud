import type { JSX } from 'react'

import { DailyLoginsChart } from '@/modules/activity/components/daily-logins-chart'
import { useAuditSummaryQuery } from '@/modules/overview/queries/use-audit-summary-query'
import { formatCount } from '@/shared/lib/format-number'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { LoadError } from '@/shared/ui/load-error'

type ActivityStatsProps = { projectId: string; days: number }

/** The period in four figures, with the logins of each day beside them. */
export function ActivityStats({ projectId, days }: ActivityStatsProps): JSX.Element {
  const summary = useAuditSummaryQuery(projectId, days)
  const figures = summary.data

  return (
    <section aria-label="Resumo do período" className="flex min-w-0 flex-col gap-3">
      <LoadError error={summary.error} onRetry={() => summary.refetch()} />
      <div className="flex min-w-0 flex-col gap-5 rounded-xl bg-card p-4 @min-[56rem]:flex-row @min-[56rem]:items-center">
        <dl className="grid flex-1 grid-cols-2 gap-4 @min-[40rem]:grid-cols-4">
          <Figure label="Logins" value={figures?.logins} />
          <Figure label="Usuários ativos" value={figures?.active_users} />
          <Figure label="Logins recusados" value={figures?.failures} />
          <Figure
            label="Contas alteradas"
            value={figures?.changes}
            hint="Senha, dados, bloqueio, MFA"
          />
        </dl>
        <DailyLoginsChart projectId={projectId} days={days} />
      </div>
    </section>
  )
}

type FigureProps = { label: string; value: number | undefined; hint?: string }

function Figure({ label, value, hint }: FigureProps): JSX.Element {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold text-heading tabular-nums">
        <FigureValue value={value} />
      </dd>
      <FigureHint hint={hint} />
    </div>
  )
}

/** What a figure leaves out, when its name alone could mislead (sign-ups are not changes). */
function FigureHint({ hint }: { hint?: string }): JSX.Element | null {
  if (hint === undefined) {
    return null
  }

  return <dd className="text-2xs text-muted-foreground">{hint}</dd>
}

function FigureValue({ value }: { value: number | undefined }): JSX.Element {
  if (value === undefined) {
    return <Skeleton className="my-1 h-7 w-12" />
  }

  return <>{formatCount(value)}</>
}
