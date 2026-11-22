import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { type CountQuery, countRows } from '@/modules/database/api/read-rows'
import { filtersKey } from '@/modules/database/components/row-filter'
import { tableRowsKey } from '@/modules/database/queries/use-table-rows-query'

/** The rows the filters match, once per filter list (not per page); refreshed with its rows. */
export function useTableCountQuery(
  projectId: string,
  query: CountQuery,
): UseQueryResult<number | null> {
  return useQuery({
    queryKey: [...tableRowsKey(projectId, query.table), 'count', filtersKey(query.filters)],
    queryFn: ({ signal }) => countRows(projectId, query, signal),
  })
}
