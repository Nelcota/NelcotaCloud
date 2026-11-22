import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  keepPreviousData,
  useInfiniteQuery,
} from '@tanstack/react-query'

import { type AuditFilter, listAuditEvents } from '@/modules/activity/api/list-audit-events'
import type { components } from '@/shared/api/api-schema'

type AuditPage = components['schemas']['AuditPage']

type AuditScope = { projectId: string; filter?: AuditFilter }

/** Every activity page of a project; invalidate it after an action that records an event. */
export function auditEventsKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'audit-events']
}

/** Pages of activity, one infinite query per set of filters; `fetchNextPage` reads older events. */
export function useAuditEventsQuery(
  scope: AuditScope,
): UseInfiniteQueryResult<InfiniteData<AuditPage, number | undefined>> {
  const filter = scope.filter ?? {}

  return useInfiniteQuery({
    queryKey: [
      ...auditEventsKey(scope.projectId),
      filter.userId ?? 'all',
      { days: filter.days, kind: filter.kind, search: filter.search },
    ],
    queryFn: ({ pageParam, signal }) =>
      listAuditEvents(scope.projectId, filter, { before: pageParam, signal }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.next_before ?? undefined,
    // A new filter keeps the previous rows on screen (dimmed) instead of a blank panel.
    placeholderData: keepPreviousData,
  })
}
