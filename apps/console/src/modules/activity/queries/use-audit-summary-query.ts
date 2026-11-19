import { type UseQueryResult, keepPreviousData, useQuery } from '@tanstack/react-query'

import { readAuditSummary } from '@/modules/activity/api/read-audit-summary'
import {
  type ActivityPeriod,
  periodKey,
  periodQuery,
} from '@/modules/activity/model/activity-period'
import { ACTIVITY_REFRESH_MILLISECONDS } from '@/modules/activity/queries/use-audit-events-query'
import type { components } from '@/shared/api/api-schema'
import { auditEventsKey } from '@/shared/lib/audit-events-key'

type AuditSummary = components['schemas']['AuditSummary']

/** The period's summary; under the activity key, so actions that record an event refresh it. */
export function useAuditSummaryQuery(
  projectId: string,
  period: ActivityPeriod,
): UseQueryResult<AuditSummary> {
  return useQuery({
    queryKey: [...auditEventsKey(projectId), 'summary', periodKey(period)],
    queryFn: () => readAuditSummary(projectId, periodQuery(period)),
    placeholderData: keepPreviousData,
    refetchInterval: ACTIVITY_REFRESH_MILLISECONDS,
  })
}
