import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { acceptInvitation } from '@/modules/team/api/accept-invitation'
import { declineInvitation } from '@/modules/team/api/decline-invitation'
import { listReceivedInvitations } from '@/modules/team/api/list-received-invitations'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

const INVITATIONS_KEY = ['invitations'] as const
/** The projects list's key; accepting adds a project to it. Kept literal to avoid a cycle. */
const PROJECTS_KEY = ['projects'] as const

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
      await queryClient.invalidateQueries({ queryKey: PROJECTS_KEY })
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
