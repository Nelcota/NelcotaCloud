import type { RowFilter } from '@/modules/database/components/row-filter'
import type { components } from '@/shared/api/api-schema'
import { ApiError } from '@/shared/api/api-error'

type TableOverview = components['schemas']['TableOverview']

/** Rows can be changed one at a time only on tables, through their complete primary key. */
export function canEditRows(table: TableOverview): boolean {
  return table.kind === 'table' && table.columns.some((column) => column.is_primary_key)
}

/** Equalities on every primary key column; `null` when a key value is missing. */
export function rowKey(table: TableOverview, row: Record<string, unknown>): RowFilter[] | null {
  const keyColumns = table.columns.filter((column) => column.is_primary_key)
  const key: RowFilter[] = []

  for (const column of keyColumns) {
    const value = row[column.name]

    if (value === null || value === undefined || typeof value === 'object') {
      return null
    }

    key.push({ column: column.name, operator: 'eq', value: String(value) })
  }

  return key
}

/** Only the key comes back: enough to know a row matched, without echoing every value. */
export function keySelect(key: readonly RowFilter[]): string {
  return key.map((filter) => filter.column).join(',')
}

/** The row was deleted (or its key changed) since the grid read it. */
export function ensureOneRow(rows: unknown[]): void {
  if (rows.length > 0) {
    return
  }

  throw new ApiError({
    status: 404,
    code: 'row_not_found',
    message: 'A linha não existe mais. Atualize a tabela.',
  })
}
