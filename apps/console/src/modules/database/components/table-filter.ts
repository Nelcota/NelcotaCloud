import { isRlsOff } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']

export type TableFilter = 'all' | 'rls-off'

export function isTableFilter(value: string): value is TableFilter {
  return value === 'all' || value === 'rls-off'
}

/** Tables whose name contains the search term, limited to RLS off when that filter is on. */
export function filterTables(
  tables: TableOverview[],
  filter: TableFilter,
  search: string,
): TableOverview[] {
  const term = search.trim().toLowerCase()

  return tables.filter(
    (table) => (filter === 'all' || isRlsOff(table)) && table.name.toLowerCase().includes(term),
  )
}
