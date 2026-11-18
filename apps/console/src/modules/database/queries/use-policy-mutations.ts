import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'

import { type PolicyCreation, createPolicy } from '@/modules/database/api/create-policy'
import { type PolicyRef, dropPolicy } from '@/modules/database/api/drop-policy'
import { databaseKey } from '@/modules/database/queries/use-schema-query'

export function useCreatePolicyMutation(
  projectId: string,
): UseMutationResult<void, Error, PolicyCreation> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (creation: PolicyCreation) => createPolicy(projectId, creation),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: databaseKey(projectId) }),
  })
}

export function useDropPolicyMutation(
  projectId: string,
): UseMutationResult<void, Error, PolicyRef> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ref: PolicyRef) => dropPolicy(projectId, ref),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: databaseKey(projectId) }),
  })
}
