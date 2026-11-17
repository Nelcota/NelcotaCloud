import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
} from '@tanstack/react-query'

import { listAuditEvents } from '@/modules/activity/api/list-audit-events'
import type { components } from '@/shared/api/api-schema'

type AuditPage = components['schemas']['AuditPage']

type AuditScope = { projectId: string; userId?: string }

/** Every activity page of a project; invalidate it after an action that records an event. */
export function auditEventsKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'audit-events']
}

/** Pages of activity; `fetchNextPage` reads older events. */
export function useAuditEventsQuery(
  scope: AuditScope,
): UseInfiniteQueryResult<InfiniteData<AuditPage, number | undefined>> {
  return useInfiniteQuery({
    queryKey: [...auditEventsKey(scope.projectId), scope.userId ?? 'all'],
    queryFn: ({ pageParam }) =>
      listAuditEvents(scope.projectId, { userId: scope.userId, before: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.next_before ?? undefined,
  })
}
