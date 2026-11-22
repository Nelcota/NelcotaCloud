import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { cancelInvitation } from '@/modules/team/api/cancel-invitation'
import { changeMemberRole } from '@/modules/team/api/change-member-role'
import { inviteMember } from '@/modules/team/api/invite-member'
import { leaveProject } from '@/modules/team/api/leave-project'
import { readTeam } from '@/modules/team/api/read-team'
import { resendInvitation } from '@/modules/team/api/resend-invitation'
import { transferOwnership } from '@/modules/team/api/transfer-ownership'
import { removeMember } from '@/modules/team/api/remove-member'
import { PROJECTS_QUERY_KEY } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

function teamKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'team']
}

export function useTeamQuery(projectId: string): UseQueryResult<Schemas['TeamView']> {
  return useQuery({
    queryKey: teamKey(projectId),
    queryFn: () => readTeam(projectId),
    refetchInterval: (query) =>
      query.state.data?.invitations.some((invitation) => invitation.delivery_status === 'sending')
        ? 10_000
        : false,
  })
}

/** Every team change reloads the team, so lists never show a stale member or invitation. */
function useTeamMutation<TVariables, TResult>(
  projectId: string,
  action: (variables: TVariables) => Promise<TResult>,
): UseMutationResult<TResult, Error, TVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: action,
    onSettled: () => queryClient.invalidateQueries({ queryKey: teamKey(projectId) }),
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

export function useResendInvitationMutation(
  projectId: string,
): UseMutationResult<Schemas['PendingInvitation'], Error, string> {
  return useTeamMutation(projectId, (invitationId: string) =>
    resendInvitation(projectId, invitationId),
  )
}

export function useRemoveMemberMutation(projectId: string): UseMutationResult<void, Error, string> {
  return useTeamMutation(projectId, (accountId: string) => removeMember(projectId, accountId))
}

export type RoleChange = { accountId: string; role: Schemas['ProjectRole'] }

/** Membership changes show in the projects list too, so it reloads along with the team. */
function useMembershipMutation<TVariables>(
  projectId: string,
  action: (variables: TVariables) => Promise<void>,
): UseMutationResult<void, Error, TVariables> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY, exact: true })
      await queryClient.invalidateQueries({ queryKey: teamKey(projectId) })
    },
  })
}

export function useChangeRoleMutation(
  projectId: string,
): UseMutationResult<void, Error, RoleChange> {
  return useMembershipMutation(projectId, (change: RoleChange) =>
    changeMemberRole(projectId, change.accountId, change.role),
  )
}

/** After leaving, the project is gone from the list; the caller moves away from its pages. */
export function useLeaveProjectMutation(projectId: string): UseMutationResult<void, Error, void> {
  return useMembershipMutation(projectId, () => leaveProject(projectId))
}

/** The caller becomes a member, so the roles in the projects list change too. */
export function useTransferOwnershipMutation(
  projectId: string,
): UseMutationResult<void, Error, string> {
  return useMembershipMutation(projectId, (accountId: string) =>
    transferOwnership(projectId, accountId),
  )
}
