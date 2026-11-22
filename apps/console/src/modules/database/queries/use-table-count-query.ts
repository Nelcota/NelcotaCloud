import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { type CountQuery, countRows } from '@/modules/database/api/read-rows'
import { tableRowsKey } from '@/modules/database/queries/use-table-rows-query'

/** The table's row count, once per table (not per page); refreshed with its rows. */
export function useTableCountQuery(
  projectId: string,
  query: CountQuery,
): UseQueryResult<number | null> {
  return useQuery({
    queryKey: [...tableRowsKey(projectId, query.table), 'count'],
    queryFn: ({ signal }) => countRows(projectId, query, signal),
  })
}
