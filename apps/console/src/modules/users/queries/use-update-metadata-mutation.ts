import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'

import { type MetadataUpdate, updateUserMetadata } from '@/modules/users/api/update-user-metadata'
import { usersQueryKey } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { auditEventsKey } from '@/shared/lib/audit-events-key'

type User = components['schemas']['User']

export function useUpdateMetadataMutation(
  projectId: string,
): UseMutationResult<User, Error, MetadataUpdate> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (update) => updateUserMetadata(projectId, update),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: auditEventsKey(projectId) })
      await queryClient.invalidateQueries({ queryKey: usersQueryKey(projectId) })
    },
  })
}
