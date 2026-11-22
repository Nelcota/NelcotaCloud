import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { readBuckets } from '@/modules/overview/api/read-buckets'
import { storageBucketKey } from '@/modules/storage/queries/storage-query-keys'
import type { components } from '@/shared/api/api-schema'

export function useBucketsQuery(
  projectId: string,
): UseQueryResult<components['schemas']['Bucket'][]> {
  return useQuery({
    // Under the storage module's key, so a new or deleted bucket refreshes this copy too.
    queryKey: [...storageBucketKey(projectId), 'overview'],
    queryFn: () => readBuckets(projectId),
  })
}
