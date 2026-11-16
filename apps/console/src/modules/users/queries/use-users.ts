import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { banUser } from '@/modules/users/api/ban-user'
import { deleteUser } from '@/modules/users/api/delete-user'
import { endUserSessions } from '@/modules/users/api/end-user-sessions'
import { listUsers } from '@/modules/users/api/list-users'
import { resetUserMfa } from '@/modules/users/api/reset-user-mfa'
import { unbanUser } from '@/modules/users/api/unban-user'
import type { components } from '@/shared/api/api-schema'

export type UserAction = 'ban' | 'unban' | 'end-sessions' | 'reset-mfa' | 'delete'

const ACTIONS: Record<UserAction, (projectId: string, userId: string) => Promise<unknown>> = {
  ban: banUser,
  unban: unbanUser,
  'end-sessions': endUserSessions,
  'reset-mfa': resetUserMfa,
  delete: deleteUser,
}

function usersQueryKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'users']
}

export function useUsersQuery(
  projectId: string,
  email: string,
): UseQueryResult<components['schemas']['UserPage']> {
  return useQuery({
    queryKey: [...usersQueryKey(projectId), email],
    queryFn: () => listUsers(projectId, email),
  })
}

/** Runs one admin action on a user, then reloads the list. */
export function useUserActionMutation(
  projectId: string,
): UseMutationResult<unknown, Error, { action: UserAction; userId: string }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ action, userId }) => ACTIONS[action](projectId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey(projectId) }),
  })
}
