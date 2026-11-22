import { NelcotaError } from '@nelcota/sdk'

import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'

export async function downloadFile(projectId: string, objectId: string): Promise<Blob> {
  const signed = dataOf(
    await apiClient.POST('/storage/v1/objects/{object_id}/download-url', {
      headers: projectHeaders(projectId),
      params: { path: { object_id: objectId } },
    }),
  )

  const response = await fetch(signed.url, {
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
  }).catch(() => {
    throw downloadError(0)
  })

  if (response.ok === false) {
    throw downloadError(response.status)
  }

  return response.blob().catch(() => {
    throw downloadError(0)
  })
}

function downloadError(status: number): NelcotaError {
  return new NelcotaError({
    status,
    code: 'storage_download_failed',
    message: 'The file could not be downloaded from object storage.',
    requestId: null,
  })
}
