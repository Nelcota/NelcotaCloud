import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  keepPreviousData,
  useInfiniteQuery,
} from '@tanstack/react-query'

import { listAuditEvents } from '@/modules/activity/api/list-audit-events'
import { type PeriodQuery, periodKey, periodQuery } from '@/modules/activity/model/activity-period'
import type { ActivityFilter, AuditKind } from '@/modules/activity/model/activity-search'
import type { components } from '@/shared/api/api-schema'
import { auditEventsKey } from '@/shared/lib/audit-events-key'

type AuditPage = components['schemas']['AuditPage']

type AuditScope = { projectId: string; userId?: string; filter?: ActivityFilter }

/** New logins and attempts show up while the page is open, without a reload. */
export const ACTIVITY_REFRESH_MILLISECONDS = 30_000

/** Pages of activity; `fetchNextPage` reads older events. */
export function useAuditEventsQuery(
  scope: AuditScope,
): UseInfiniteQueryResult<InfiniteData<AuditPage, number | undefined>> {
  const filter = scope.filter
  const kind = apiKind(filter)
  const search = apiSearch(filter)
  const period = apiPeriod(filter)

  return useInfiniteQuery({
    queryKey: [
      ...auditEventsKey(scope.projectId),
      scope.userId ?? 'all',
      periodKeyOf(filter),
      kind,
      search,
    ],
    queryFn: ({ pageParam }) =>
      listAuditEvents(scope.projectId, {
        userId: scope.userId,
        period,
        kind,
        search,
        before: pageParam,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.next_before ?? undefined,
    // A new filter keeps the current list on screen until its results arrive.
    placeholderData: keepPreviousData,
    refetchInterval: ACTIVITY_REFRESH_MILLISECONDS,
  })
}

/** Without the page's filter (a user's own log), the whole 90 days. */
function apiPeriod(filter: ActivityFilter | undefined): PeriodQuery | undefined {
  if (filter === undefined) {
    return undefined
  }

  return periodQuery(filter.period)
}

function periodKeyOf(filter: ActivityFilter | undefined): string {
  if (filter === undefined) {
    return 'whole'
  }

  return periodKey(filter.period)
}

/** `all` sends no filter. */
function apiKind(filter: ActivityFilter | undefined): AuditKind | undefined {
  if (filter === undefined || filter.kind === 'all') {
    return undefined
  }

  return filter.kind
}

/** Spaces alone would be refused by the API, so they search nothing. */
function apiSearch(filter: ActivityFilter | undefined): string | undefined {
  const text = filter?.search.trim() ?? ''

  if (text === '') {
    return undefined
  }

  return text
}
