import { putStorageObject, storageFileInput } from '@nelcota/sdk'

import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { StorageObject } from './storage-types'

export type UploadFileAttempt = { file: File; requestId: string }

export async function uploadFile(
  projectId: string,
  bucketId: string,
  { file, requestId }: UploadFileAttempt,
): Promise<StorageObject> {
  const headers = projectHeaders(projectId)
  const signed = dataOf(
    await apiClient.POST('/storage/v1/buckets/{bucket_id}/uploads', {
      headers,
      params: { path: { bucket_id: bucketId } },
      body: storageFileInput({ name: file.name, file, requestId }),
    }),
  )
  await putStorageObject(signed, file)

  return dataOf(
    await apiClient.POST('/storage/v1/objects/{object_id}/complete', {
      headers,
      params: { path: { object_id: signed.object_id } },
    }),
  )
}
