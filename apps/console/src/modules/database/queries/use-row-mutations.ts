import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'

import { type RowDeletion, deleteRow } from '@/modules/database/api/delete-row'
import { type RowInsertion, insertRow } from '@/modules/database/api/insert-row'
import { type RowUpdate, updateRow } from '@/modules/database/api/update-row'
import { tableRowsKey } from '@/modules/database/queries/use-table-rows-query'

type Change = { table: string }

/** Every page and count of the changed table reads again; other tables keep their cache. */
function useRowMutation<T extends Change>(
  projectId: string,
  change: (projectId: string, input: T) => Promise<void>,
): UseMutationResult<void, Error, T> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: T) => change(projectId, input),
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({ queryKey: tableRowsKey(projectId, input.table) }),
  })
}

export function useInsertRowMutation(
  projectId: string,
): UseMutationResult<void, Error, RowInsertion> {
  return useRowMutation(projectId, insertRow)
}

export function useUpdateRowMutation(projectId: string): UseMutationResult<void, Error, RowUpdate> {
  return useRowMutation(projectId, updateRow)
}

export function useDeleteRowMutation(
  projectId: string,
): UseMutationResult<void, Error, RowDeletion> {
  return useRowMutation(projectId, deleteRow)
}
