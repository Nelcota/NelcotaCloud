import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readDailyUsage } from '@/modules/overview/api/read-daily-usage'
import type { components } from '@/shared/api/api-schema'

export function useDailyUsageQuery(
  projectId: string,
  days: number,
): UseQueryResult<components['schemas']['DailyUsage']> {
  return useQuery({
    queryKey: ['projects', projectId, 'usage', 'daily', days],
    queryFn: () => readDailyUsage(projectId, days),
  })
}
