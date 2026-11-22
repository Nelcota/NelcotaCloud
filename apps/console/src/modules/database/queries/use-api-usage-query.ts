import { type UseQueryResult, keepPreviousData, useQuery } from '@tanstack/react-query'

import {
  type ApiUsagePeriod,
  type ApiUsageReport,
  readApiUsage,
} from '@/modules/database/api/read-api-usage'

/** Traffic refreshes every minute while the page is open, like a live panel. */
const REFRESH_EVERY_MS = 60_000

export function useApiUsageQuery(
  projectId: string,
  period: ApiUsagePeriod,
): UseQueryResult<ApiUsageReport> {
  return useQuery({
    queryKey: ['projects', projectId, 'database', 'api-usage', period],
    queryFn: ({ signal }) => readApiUsage(projectId, period, signal),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_EVERY_MS,
  })
}
