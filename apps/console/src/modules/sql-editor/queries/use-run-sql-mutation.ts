import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'

import { databaseKey } from '@/modules/database/queries/use-schema-query'
import { runSql } from '@/modules/sql-editor/api/run-sql'
import type { components } from '@/shared/api/api-schema'

/** Any statement may change tables or rows, so the database pages reload after each run. */
export function useRunSqlMutation(
  projectId: string,
): UseMutationResult<components['schemas']['SqlResult'], Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (query: string) => runSql(projectId, query),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: databaseKey(projectId) }),
  })
}
