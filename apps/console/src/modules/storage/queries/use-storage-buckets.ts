import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'

import { createBucket, deleteBucket, listBuckets } from '@/modules/storage/api/storage-files'
import type { StorageBucket } from '@/modules/storage/api/storage-files'

function bucketKey(projectId: string): readonly [string, string] {
  return ['storage-buckets', projectId]
}

export function useStorageBuckets(projectId: string): UseQueryResult<StorageBucket[]> {
  return useQuery({
    queryKey: bucketKey(projectId),
    queryFn: () => listBuckets(projectId),
  })
}

export function useCreateBucket(
  projectId: string,
): UseMutationResult<StorageBucket, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name) => createBucket(projectId, name),
    onSuccess: async (bucket) => {
      queryClient.setQueryData<StorageBucket[]>(bucketKey(projectId), (buckets = []) =>
        [...buckets, bucket].toSorted((first, second) => first.name.localeCompare(second.name)),
      )
      await queryClient.invalidateQueries({ queryKey: bucketKey(projectId) })
    },
  })
}

export function useDeleteBucket(projectId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bucketId) => deleteBucket(projectId, bucketId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bucketKey(projectId) })
    },
  })
}
