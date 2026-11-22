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
import { PROJECTS_QUERY_KEY } from '@/modules/projects/queries/use-projects'
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY })
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY, exact: true })
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
