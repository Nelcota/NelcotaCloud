import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { acceptInvitation } from '@/modules/projects/api/accept-invitation'
import { declineInvitation } from '@/modules/projects/api/decline-invitation'
import { listReceivedInvitations } from '@/modules/projects/api/list-received-invitations'
import { PROJECT_CATALOG_KEY, projectDataKey } from '@/modules/projects/queries/project-catalog-key'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

const INVITATIONS_KEY = ['invitations'] as const

export function useReceivedInvitationsQuery(): UseQueryResult<Schemas['ReceivedInvitation'][]> {
  return useQuery({ queryKey: INVITATIONS_KEY, queryFn: listReceivedInvitations })
}

export function useAcceptInvitationMutation(): UseMutationResult<
  Schemas['AcceptedInvitation'],
  Error,
  string
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: async (accepted) => {
      await queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY })
      await queryClient.invalidateQueries({ queryKey: PROJECT_CATALOG_KEY, exact: true })
      await queryClient.invalidateQueries({ queryKey: projectDataKey(accepted.project_id) })
    },
  })
}

export function useDeclineInvitationMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: declineInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY }),
  })
}
