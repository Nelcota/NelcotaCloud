import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'

import { listBuckets } from '@/modules/storage/api/list-buckets'
import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { storageBucketKey } from './storage-query-keys'

export function useStorageBuckets(projectId: string): UseQueryResult<StorageBucket[]> {
  return useQuery({
    queryKey: storageBucketKey(projectId),
    queryFn: ({ signal }) => listBuckets(projectId, signal),
  })
}
