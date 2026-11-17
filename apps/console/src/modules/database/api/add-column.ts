import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

export type ColumnAddition = { table: string; column: components['schemas']['ColumnDefinition'] }

export async function addColumn(projectId: string, addition: ColumnAddition): Promise<void> {
  const headers = projectHeaders(projectId)
  const params = { path: { table: addition.table } }
  const body = addition.column

  ensureSuccess(
    await apiClient.POST('/database/v1/tables/{table}/columns', { body, headers, params }),
  )
}
