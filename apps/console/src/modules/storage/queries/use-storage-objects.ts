import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'

import { deleteFile, listFiles } from '@/modules/storage/api/storage-files'
import type { components } from '@/shared/api/api-schema'

type ObjectPage = components['schemas']['ObjectPage']

export function objectKey(projectId: string, bucketId: string): readonly [string, string, string] {
  return ['storage-objects', projectId, bucketId]
}

export function useStorageObjects(
  projectId: string,
  bucketId: string,
  before: string | null,
): UseQueryResult<ObjectPage> {
  return useQuery({
    queryKey: [...objectKey(projectId, bucketId), before],
    gcTime: 60_000,
    queryFn: ({ signal }) => listFiles(projectId, bucketId, { before, signal }),
  })
}

export function useDeleteFile(
  projectId: string,
  bucketId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (objectId) => deleteFile(projectId, objectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: objectKey(projectId, bucketId) })
    },
  })
}
