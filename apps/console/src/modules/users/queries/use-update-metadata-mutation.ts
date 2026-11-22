import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'

import { auditEventsKey } from '@/modules/activity/queries/use-audit-events-query'
import { type MetadataUpdate, updateUserMetadata } from '@/modules/users/api/update-user-metadata'
import { usersQueryKey } from '@/modules/users/queries/use-users'
import { ApiError } from '@/shared/api/api-error'
import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']

export function useUpdateMetadataMutation(
  projectId: string,
): UseMutationResult<User, Error, MetadataUpdate> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (update) => updateUserMetadata(projectId, update),
    onSuccess: async (user) => {
      queryClient.setQueryData([...usersQueryKey(projectId), 'detail', user.id], user)
      await queryClient.invalidateQueries({ queryKey: auditEventsKey(projectId) })
      await queryClient.invalidateQueries({ queryKey: usersQueryKey(projectId) })
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        await queryClient.invalidateQueries({ queryKey: usersQueryKey(projectId) })
      }
    },
  })
}
