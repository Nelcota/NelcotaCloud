import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'

import { deleteFile } from '@/modules/storage/api/delete-file'
import { downloadFile } from '@/modules/storage/api/download-file'
import type { StorageObject } from '@/modules/storage/api/storage-types'
import { uploadFile, type UploadFileAttempt } from '@/modules/storage/api/upload-file'
import { storageObjectKey } from './storage-query-keys'

export function useUploadFile(
  projectId: string,
  bucketId: string,
): UseMutationResult<StorageObject, Error, UploadFileAttempt> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file) => uploadFile(projectId, bucketId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: storageObjectKey(projectId, bucketId) })
    },
  })
}

export function useDownloadFile(projectId: string): UseMutationResult<Blob, Error, string> {
  return useMutation({
    mutationFn: (objectId) => downloadFile(projectId, objectId),
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
      await queryClient.invalidateQueries({ queryKey: storageObjectKey(projectId, bucketId) })
    },
  })
}
