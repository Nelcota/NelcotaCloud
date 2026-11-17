import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { ensureSuccess } from '@/shared/api/api-result'

export type ColumnRef = { table: string; column: string }

/** Drops the column and every value in it. */
export async function dropColumn(projectId: string, ref: ColumnRef): Promise<void> {
  const headers = projectHeaders(projectId)
  const params = { path: { table: ref.table, column: ref.column } }
  const path = '/database/v1/tables/{table}/columns/{column}'

  ensureSuccess(await apiClient.DELETE(path, { headers, params }))
}
