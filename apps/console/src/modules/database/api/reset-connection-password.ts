import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type NewConnectionPassword = components['schemas']['NewConnectionPassword']

/** A new password for direct connections; the response is the only time it is shown. */
export async function resetConnectionPassword(projectId: string): Promise<NewConnectionPassword> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.POST('/database/v1/connection/password', { headers }))
}
