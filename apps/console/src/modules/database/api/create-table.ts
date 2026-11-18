import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

type CreateTableRequest = components['schemas']['CreateTableRequest']

/** The table starts with row level security on: no app reaches its rows until a policy allows. */
export async function createTable(projectId: string, body: CreateTableRequest): Promise<void> {
  const headers = projectHeaders(projectId)

  ensureSuccess(await apiClient.POST('/database/v1/tables', { body, headers }))
}
