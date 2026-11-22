import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readRecentEvents } from '@/modules/overview/api/read-recent-events'
import type { components } from '@/shared/api/api-schema'

/** How many events the overview lists; the full log stays on the activity page. */
export const RECENT_EVENTS = 8

export function useRecentEventsQuery(
  projectId: string,
): UseQueryResult<components['schemas']['AuditPage']> {
  return useQuery({
    queryKey: ['projects', projectId, 'overview', 'recent-events'],
    queryFn: () => readRecentEvents(projectId, RECENT_EVENTS),
  })
}
