import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'

import { createBucket } from '@/modules/storage/api/create-bucket'
import { deleteBucket } from '@/modules/storage/api/delete-bucket'
import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { storageBucketKey } from './storage-query-keys'

export function useCreateBucket(
  projectId: string,
): UseMutationResult<StorageBucket, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name) => createBucket(projectId, name),
    onSuccess: async (bucket) => {
      const queryKey = storageBucketKey(projectId)
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData<StorageBucket[]>(queryKey, (buckets = []) => {
        const others = buckets.filter((existing) => existing.id !== bucket.id)

        return [...others, bucket].toSorted((first, second) =>
          first.name.localeCompare(second.name),
        )
      })
      await queryClient.invalidateQueries({ queryKey })
    },
  })
}

export function useDeleteBucket(projectId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bucketId) => deleteBucket(projectId, bucketId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storageBucketKey(projectId) })
    },
  })
}
