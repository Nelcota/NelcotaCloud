import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { countRows } from '@/modules/database/api/read-rows'
import { type CountMode, tableCountMode } from '@/modules/database/model/table-count'
import { tableRowsKey } from '@/modules/database/queries/use-table-rows-query'

type CountQuery = { table: string; estimatedRows: number | null }
type TableCount = { count: number | null; mode: CountMode }

/** The table's row count, once per table (not per page); refreshed with its rows. */
export function useTableCountQuery(
  projectId: string,
  query: CountQuery,
): UseQueryResult<TableCount> {
  const mode = tableCountMode(query.estimatedRows)

  return useQuery({
    queryKey: [...tableRowsKey(projectId, query.table), 'count', mode],
    queryFn: async () => ({ count: await countRows(projectId, query.table, mode), mode }),
  })
}
