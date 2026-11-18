import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readProjectUsage } from '@/modules/overview/api/read-project-usage'
import type { components } from '@/shared/api/api-schema'

export function useProjectUsageQuery(
  projectId: string,
): UseQueryResult<components['schemas']['ProjectUsage']> {
  return useQuery({
    queryKey: ['projects', projectId, 'usage'],
    queryFn: () => readProjectUsage(projectId),
  })
}
