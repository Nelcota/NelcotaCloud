import { storageFileInput } from '@nelcota/sdk'
import type { StorageUpload } from '@nelcota/sdk'

import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf, ensureSuccess } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

export type StorageBucket = components['schemas']['Bucket']
export type StorageObject = components['schemas']['StorageObject']
type ObjectPage = components['schemas']['ObjectPage']

export async function listBuckets(projectId: string): Promise<StorageBucket[]> {
  return dataOf(await apiClient.GET('/storage/v1/buckets', { headers: projectHeaders(projectId) }))
}

export async function createBucket(projectId: string, name: string): Promise<StorageBucket> {
  return dataOf(
    await apiClient.POST('/storage/v1/buckets', {
      headers: projectHeaders(projectId),
      body: { name },
    }),
  )
}

export async function deleteBucket(projectId: string, bucketId: string): Promise<void> {
  ensureSuccess(
    await apiClient.DELETE('/storage/v1/buckets/{bucket_id}', {
      headers: projectHeaders(projectId),
      params: { path: { bucket_id: bucketId } },
    }),
  )
}

export async function listFiles(
  projectId: string,
  bucketId: string,
  page: { before: string | null; signal: AbortSignal },
): Promise<ObjectPage> {
  return dataOf(
    await apiClient.GET('/storage/v1/buckets/{bucket_id}/objects', {
      headers: projectHeaders(projectId),
      params: { path: { bucket_id: bucketId }, query: { before: page.before ?? undefined } },
      signal: page.signal,
    }),
  )
}

export async function createUpload(
  projectId: string,
  bucketId: string,
  file: File,
): Promise<StorageUpload> {
  return dataOf(
    await apiClient.POST('/storage/v1/buckets/{bucket_id}/uploads', {
      headers: projectHeaders(projectId),
      params: { path: { bucket_id: bucketId } },
      body: storageFileInput({ name: file.name, file }),
    }),
  )
}

export async function completeUpload(projectId: string, objectId: string): Promise<StorageObject> {
  return dataOf(
    await apiClient.POST('/storage/v1/objects/{object_id}/complete', {
      headers: projectHeaders(projectId),
      params: { path: { object_id: objectId } },
    }),
  )
}

export async function downloadFile(
  projectId: string,
  objectId: string,
  signal: AbortSignal,
): Promise<string> {
  const signed = dataOf(
    await apiClient.POST('/storage/v1/objects/{object_id}/download-url', {
      signal,
      headers: projectHeaders(projectId),
      params: { path: { object_id: objectId } },
    }),
  )

  return signed.url
}

export async function deleteFile(projectId: string, objectId: string): Promise<void> {
  const result = await apiClient.DELETE('/storage/v1/objects/{object_id}', {
    headers: projectHeaders(projectId),
    params: { path: { object_id: objectId } },
  })

  if (result.response.status === 404) {
    return
  }

  ensureSuccess(result)
}
