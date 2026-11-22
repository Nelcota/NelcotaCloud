import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { type RowsPage, type RowsPageQuery, readRows } from '@/modules/database/api/read-rows'
import { filtersKey } from '@/modules/database/components/row-filter'
import { databaseKey } from '@/modules/database/queries/use-schema-query'

export const ROWS_PAGE_SIZE = 50

/** Every page of one table's rows. */
export function tableRowsKey(projectId: string, table: string): readonly string[] {
  return [...databaseKey(projectId), 'rows', table]
}

export function useTableRowsQuery(
  projectId: string,
  query: RowsPageQuery,
): UseQueryResult<RowsPage> {
  const tableKey = tableRowsKey(projectId, query.table)

  return useQuery({
    queryKey: [...tableKey, filtersKey(query.filters), String(query.offset), String(query.limit)],
    queryFn: ({ signal }) => readRows(projectId, query, signal),
    placeholderData: (previous, previousQuery) => {
      const previousKey = previousQuery?.queryKey
      if (tableKey.every((segment, index) => previousKey?.[index] === segment)) {
        return previous
      }

      return undefined
    },
  })
}
