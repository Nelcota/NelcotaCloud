import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import type { ApiHealth } from '@/modules/system-status/api/api-health'
import { checkApiHealth } from '@/modules/system-status/api/check-api-health'

const API_HEALTH_QUERY_KEY = ['system-status', 'api-health'] as const

/** No retries: the card must show an outage right away, and the user can check again. */
export function useApiHealthQuery(): UseQueryResult<ApiHealth> {
  return useQuery({ queryKey: API_HEALTH_QUERY_KEY, queryFn: checkApiHealth, retry: false })
}
