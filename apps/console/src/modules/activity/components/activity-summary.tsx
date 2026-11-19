import type { JSX } from 'react'

import { ActivityMetrics } from '@/modules/activity/components/activity-metrics'
import { SuspiciousAddresses } from '@/modules/activity/components/suspicious-addresses'
import type { ActivityPeriod } from '@/modules/activity/model/activity-period'
import { suspiciousAddresses } from '@/modules/activity/model/suspicious-addresses'
import { useAuditSummaryQuery } from '@/modules/activity/queries/use-audit-summary-query'

type ActivitySummaryProps = {
  projectId: string
  period: ActivityPeriod
  /** Narrows the log to refused logins, optionally from one IP. */
  onShowFailures: (address?: string) => void
}

/** The period's figures, and a warning with the addresses only when one looks suspicious. */
export function ActivitySummary(props: ActivitySummaryProps): JSX.Element {
  const summary = useAuditSummaryQuery(props.projectId, props.period)
  const data = summary.data
  const suspicious = suspiciousAddresses(data?.failing_addresses ?? [])

  return (
    <>
      <ActivityMetrics
        summary={data}
        error={loadError(data === undefined, summary.error)}
        onRetry={() => summary.refetch()}
        suspiciousCount={suspicious.length}
        onShowFailures={() => props.onShowFailures()}
      />
      <SuspiciousAddresses
        projectId={props.projectId}
        addresses={suspicious}
        onInspect={props.onShowFailures}
      />
    </>
  )
}

/** A failed background refresh keeps the figures already shown instead of replacing them. */
function loadError(isMissing: boolean, error: Error | null): Error | null {
  if (isMissing) {
    return error
  }

  return null
}
