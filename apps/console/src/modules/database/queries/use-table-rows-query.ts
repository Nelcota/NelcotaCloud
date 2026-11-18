import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { type RowsPage, type RowsPageQuery, readRows } from '@/modules/database/api/read-rows'
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
  return useQuery({
    queryKey: [
      ...tableRowsKey(projectId, query.table),
      String(query.offset),
      String(query.limit),
      query.orderColumn ?? '',
    ],
    queryFn: () => readRows(projectId, query),
    placeholderData: (previous, previousQuery) =>
      previousOfSameTable({ previous, previousQuery, table: query.table }),
  })
}

/** Where the table name sits in `tableRowsKey`. */
const TABLE_KEY_INDEX = 4

type PreviousPage = {
  previous: RowsPage | undefined
  previousQuery: { queryKey: readonly unknown[] } | undefined
  table: string
}

/**
 * Keeps the current page on screen while the next one loads, instead of flashing empty; another
 * table's rows would not fit this table's columns, so those are dropped.
 */
function previousOfSameTable({
  previous,
  previousQuery,
  table,
}: PreviousPage): RowsPage | undefined {
  if (previousQuery?.queryKey.at(TABLE_KEY_INDEX) !== table) {
    return undefined
  }

  return previous
}
