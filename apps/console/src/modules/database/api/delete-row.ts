import { type RowFilter, restQueryString } from '@/modules/database/components/row-filter'
import { ensureOneRow, keySelect } from '@/modules/database/components/row-key'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'

export type RowDeletion = { table: string; key: readonly RowFilter[] }

/** Deletes the one row the primary key names. */
export async function deleteRow(projectId: string, deletion: RowDeletion): Promise<void> {
  const headers = { ...projectHeaders(projectId), Prefer: 'return=representation' }
  const params = { path: { table: deletion.table }, query: { select: keySelect(deletion.key) } }
  const querySerializer = (values: Record<string, unknown>): string =>
    restQueryString(values, deletion.key)
  const result = await apiClient.DELETE('/rest/v1/{table}', { headers, params, querySerializer })

  ensureOneRow(dataOf(result))
}
