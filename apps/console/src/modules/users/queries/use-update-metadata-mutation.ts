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
    // Not awaited: the saved user is in the cache already, and waiting for the refetches would
    // leave the panel comparing its old draft with the new value, a conflict for a moment.
    onSuccess: (user) => {
      queryClient.setQueryData([...usersQueryKey(projectId), 'detail', user.id], user)
      void queryClient.invalidateQueries({ queryKey: auditEventsKey(projectId) })
      void queryClient.invalidateQueries({ queryKey: usersQueryKey(projectId) })
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409) {
        await queryClient.invalidateQueries({ queryKey: usersQueryKey(projectId) })
      }
    },
  })
}
