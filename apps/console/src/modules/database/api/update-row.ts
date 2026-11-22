import { type RowFilter, restQueryString } from '@/modules/database/components/row-filter'
import { ensureOneRow, keySelect } from '@/modules/database/components/row-key'
import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'

export type RowUpdate = {
  table: string
  /** The row's primary key, one equality per key column. */
  key: readonly RowFilter[]
  values: Record<string, unknown>
}

/** Sets the changed columns on the one row the key names; fails when the row is gone. */
export async function updateRow(projectId: string, update: RowUpdate): Promise<void> {
  const headers = { ...projectHeaders(projectId), Prefer: 'return=representation' }
  const params = { path: { table: update.table }, query: { select: keySelect(update.key) } }
  const querySerializer = (values: Record<string, unknown>): string =>
    restQueryString(values, update.key)
  const result = await apiClient.PATCH('/rest/v1/{table}', {
    headers,
    params,
    body: update.values,
    querySerializer,
  })

  ensureOneRow(dataOf(result))
}
