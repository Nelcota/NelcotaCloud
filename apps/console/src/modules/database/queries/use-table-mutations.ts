import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  type RowLevelSecurityChange,
  changeRowLevelSecurity,
} from '@/modules/database/api/change-row-level-security'
import { createTable } from '@/modules/database/api/create-table'
import { dropTable } from '@/modules/database/api/drop-table'
import { databaseKey } from '@/modules/database/queries/use-schema-query'
import { tableRowsKey } from '@/modules/database/queries/use-table-rows-query'
import type { components } from '@/shared/api/api-schema'

type CreateTableRequest = components['schemas']['CreateTableRequest']

export function useCreateTableMutation(
  projectId: string,
): UseMutationResult<void, Error, CreateTableRequest> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateTableRequest) => createTable(projectId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: databaseKey(projectId) }),
  })
}

export function useChangeRowLevelSecurityMutation(
  projectId: string,
): UseMutationResult<void, Error, RowLevelSecurityChange> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (change: RowLevelSecurityChange) => changeRowLevelSecurity(projectId, change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: databaseKey(projectId) }),
  })
}

/**
 * The dropped table's page is still open until it navigates away: reloading the schema now
 * would show it as "not found" first, so the schema is only marked stale and the tables list
 * reloads it when it opens.
 */
export function useDropTableMutation(projectId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (table: string) => dropTable(projectId, table),
    onSuccess: (_result, table) => {
      queryClient.removeQueries({ queryKey: tableRowsKey(projectId, table) })

      return queryClient.invalidateQueries({
        queryKey: databaseKey(projectId),
        refetchType: 'none',
      })
    },
  })
}
