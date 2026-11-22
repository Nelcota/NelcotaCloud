import type { JSX } from 'react'

import type { ApiUsagePeriod } from '@/modules/database/api/read-api-usage'
import { useApiUsageQuery } from '@/modules/database/queries/use-api-usage-query'
import { countRange } from '@/modules/overview/components/chart-range'
import { MetricValue } from '@/modules/overview/components/metric-card'
import { Sparkline } from '@/modules/overview/components/sparkline'
import { formatShare } from '@/shared/lib/format-number'
import { StatCard } from '@/shared/ui/stat-card'

type ApiRequestsCardProps = { projectId: string; days: number }

/** Data API requests in the period (the API keeps 30 days), with the share of server errors. */
export function ApiRequestsCard({ projectId, days }: ApiRequestsCardProps): JSX.Element {
  const period = usagePeriodOf(days)
  const usage = useApiUsageQuery(projectId, period)
  const report = usage.data
  const trend = report?.series.map((point) => point.requests) ?? []

  return (
    <StatCard
      label="Requisições à API"
      value={<RequestsValue requests={report?.requests} isUnavailable={usage.isError} />}
      aside={<Sparkline values={trend} range={countRange(trend)} />}
      hint={<RequestsHint report={report} isUnavailable={usage.isError} days={days} />}
    />
  )
}

type RequestsValueProps = { requests: number | undefined; isUnavailable: boolean }

function RequestsValue({ requests, isUnavailable }: RequestsValueProps): JSX.Element {
  if (isUnavailable) {
    return <>—</>
  }

  return <MetricValue value={requests} />
}

/** 90 days asks for the longest window the API keeps. */
function usagePeriodOf(days: number): ApiUsagePeriod {
  if (days <= 7) {
    return '7d'
  }

  return '30d'
}

type RequestsHintProps = {
  report: { requests: number; server_errors: number } | undefined
  isUnavailable: boolean
  days: number
}

function RequestsHint({ report, isUnavailable, days }: RequestsHintProps): JSX.Element {
  if (isUnavailable) {
    return <>Indisponível</>
  }

  if (report === undefined || report.requests === 0) {
    return <>em {Math.min(days, 30)} dias</>
  }

  const share = formatShare(report.server_errors / report.requests)

  return <>{share} com erro do servidor</>
}
