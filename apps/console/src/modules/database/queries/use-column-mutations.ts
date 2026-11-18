import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'

import { type ColumnAddition, addColumn } from '@/modules/database/api/add-column'
import { type ColumnRef, dropColumn } from '@/modules/database/api/drop-column'
import { databaseKey } from '@/modules/database/queries/use-schema-query'

export function useAddColumnMutation(
  projectId: string,
): UseMutationResult<void, Error, ColumnAddition> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (addition: ColumnAddition) => addColumn(projectId, addition),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: databaseKey(projectId) }),
  })
}

export function useDropColumnMutation(
  projectId: string,
): UseMutationResult<void, Error, ColumnRef> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ref: ColumnRef) => dropColumn(projectId, ref),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: databaseKey(projectId) }),
  })
}
