import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { cancelInvitation } from '@/modules/team/api/cancel-invitation'
import { inviteMember } from '@/modules/team/api/invite-member'
import { readTeam } from '@/modules/team/api/read-team'
import { removeMember } from '@/modules/team/api/remove-member'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

function teamKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'team']
}

export function useTeamQuery(projectId: string): UseQueryResult<Schemas['TeamView']> {
  return useQuery({ queryKey: teamKey(projectId), queryFn: () => readTeam(projectId) })
}

/** Every team change reloads the team, so lists never show a stale member or invitation. */
function useTeamMutation<TVariables, TResult>(
  projectId: string,
  action: (variables: TVariables) => Promise<TResult>,
): UseMutationResult<TResult, Error, TVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: action,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKey(projectId) }),
  })
}

export function useInviteMemberMutation(
  projectId: string,
): UseMutationResult<Schemas['PendingInvitation'], Error, string> {
  return useTeamMutation(projectId, (email: string) => inviteMember(projectId, email))
}

export function useCancelInvitationMutation(
  projectId: string,
): UseMutationResult<void, Error, string> {
  return useTeamMutation(projectId, (invitationId: string) =>
    cancelInvitation(projectId, invitationId),
  )
}

export function useRemoveMemberMutation(projectId: string): UseMutationResult<void, Error, string> {
  return useTeamMutation(projectId, (accountId: string) => removeMember(projectId, accountId))
}
