import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { auditEventsKey } from '@/modules/activity/queries/use-audit-events-query'
import { readRecentEvents } from '@/modules/overview/api/read-recent-events'
import type { components } from '@/shared/api/api-schema'

/** How many events the overview lists; the full log stays on the activity page. */
export const RECENT_EVENTS = 8

export function useRecentEventsQuery(
  projectId: string,
): UseQueryResult<components['schemas']['AuditPage']> {
  return useQuery({
    // Under the activity log's key: every change that records an event refreshes this list.
    queryKey: [...auditEventsKey(projectId), 'overview-recent'],
    queryFn: () => readRecentEvents(projectId, RECENT_EVENTS),
  })
}
