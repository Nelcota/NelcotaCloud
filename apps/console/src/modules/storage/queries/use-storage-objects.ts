import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'

import { listFiles } from '@/modules/storage/api/list-files'
import type { StorageObjectPage } from '@/modules/storage/api/storage-types'
import { storageObjectKey } from './storage-query-keys'

export function useStorageObjects(
  projectId: string,
  bucketId: string,
): UseInfiniteQueryResult<InfiniteData<StorageObjectPage>> {
  return useInfiniteQuery({
    queryKey: storageObjectKey(projectId, bucketId),
    queryFn: ({ pageParam, signal }) =>
      listFiles(projectId, { bucketId, before: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
  })
}
