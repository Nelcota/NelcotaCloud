import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { readDirectConnection } from '@/modules/database/api/read-direct-connection'
import { resetConnectionPassword } from '@/modules/database/api/reset-connection-password'
import type { components } from '@/shared/api/api-schema'

type DirectConnectionView = components['schemas']['DirectConnectionView']
type NewConnectionPassword = components['schemas']['NewConnectionPassword']

function directConnectionKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'direct-connection']
}

export function useDirectConnectionQuery(projectId: string): UseQueryResult<DirectConnectionView> {
  return useQuery({
    queryKey: directConnectionKey(projectId),
    queryFn: () => readDirectConnection(projectId),
  })
}

export function useResetConnectionPasswordMutation(
  projectId: string,
): UseMutationResult<NewConnectionPassword, Error, void> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => resetConnectionPassword(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: directConnectionKey(projectId) }),
  })
}
