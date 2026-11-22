import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export type RowInsertion = { table: string; values: Record<string, unknown> }

/** Inserts one row; the columns left out take their defaults. */
export async function insertRow(projectId: string, insertion: RowInsertion): Promise<void> {
  const headers = { ...projectHeaders(projectId), Prefer: 'return=minimal' }
  const params = { path: { table: insertion.table } }
  const body = insertion.values

  ensureSuccess(await apiClient.POST('/rest/v1/{table}', { headers, params, body }))
}
