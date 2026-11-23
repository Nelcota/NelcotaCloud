import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type DirectConnectionView = components['schemas']['DirectConnectionView']

/** Host, port, database and user of the project's direct Postgres connection. */
export async function readDirectConnection(projectId: string): Promise<DirectConnectionView> {
  const headers = projectHeaders(projectId)

  return dataOf(await apiClient.GET('/database/v1/connection', { headers }))
}
