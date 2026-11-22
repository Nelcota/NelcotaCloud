import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readBuckets } from '@/modules/overview/api/read-buckets'
import type { components } from '@/shared/api/api-schema'

export function useBucketsQuery(
  projectId: string,
): UseQueryResult<components['schemas']['Bucket'][]> {
  return useQuery({
    queryKey: ['projects', projectId, 'overview', 'buckets'],
    queryFn: () => readBuckets(projectId),
  })
}
