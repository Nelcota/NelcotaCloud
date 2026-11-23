import type { JSX } from 'react'
import { useState } from 'react'

import type { ApiUsagePeriod, ApiUsageReport } from '@/modules/database/api/read-api-usage'
import { TrafficBars } from '@/modules/database/components/traffic-bars'
import { TrafficRankings } from '@/modules/database/components/traffic-rankings'
import { averageMilliseconds, trafficSummary } from '@/modules/database/components/traffic-summary'
import { useApiUsageQuery } from '@/modules/database/queries/use-api-usage-query'
import { formatCount } from '@/shared/lib/format-number'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { Section } from '@/shared/ui/section'
import { SegmentedControl } from '@/shared/ui/segmented-control'
import { StatCard } from '@/shared/ui/stat-card'
import { SummarySentence } from '@/shared/ui/summary-sentence'

const PERIOD_OPTIONS: { value: ApiUsagePeriod; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
]

/** The Data API's traffic: a verdict, the totals, a bar per hour or day and the busiest tables. */
export function ApiTrafficSection({ projectId }: { projectId: string }): JSX.Element {
  const [period, setPeriod] = useState<ApiUsagePeriod>('24h')
  const usage = useApiUsageQuery(projectId, period)

  return (
    <Section
      title="Tráfego da API"
      action={
        <SegmentedControl
          label="Período do tráfego"
          options={PERIOD_OPTIONS}
          value={period}
          isMono
          onValueChange={(value) => setPeriod(periodOf(value))}
        />
      }
    >
      <TrafficBody
        report={usage.data}
        period={period}
        error={usage.error}
        onRetry={() => usage.refetch()}
      />
    </Section>
  )
}

function periodOf(value: string): ApiUsagePeriod {
  return PERIOD_OPTIONS.find((option) => option.value === value)?.value ?? '24h'
}

type TrafficBodyProps = {
  report: ApiUsageReport | undefined
  period: ApiUsagePeriod
  error: Error | null
  onRetry: () => void
}

function TrafficBody({ report, period, error, onRetry }: TrafficBodyProps): JSX.Element {
  if (report === undefined && error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  if (report === undefined) {
    return (
      <div role="status" aria-label="Carregando o tráfego" className="grid gap-3">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    )
  }

  const summary = trafficSummary(report, period)

  return (
    <div className="flex flex-col gap-3">
      <SummarySentence tone={summary.tone} verdict={summary.verdict}>
        {summary.sentence}
      </SummarySentence>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Requisições" value={formatCount(report.requests)} />
        <StatCard
          label="Erros"
          value={formatCount(report.client_errors + report.server_errors)}
          hint={`${formatCount(report.client_errors)} do cliente · ${formatCount(report.server_errors)} do servidor`}
        />
        <StatCard label="Tempo médio" value={averageMilliseconds(report)} />
      </div>
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <TrafficBars series={report.series} period={period} />
      </div>
      <TrafficRankings report={report} />
    </div>
  )
}
