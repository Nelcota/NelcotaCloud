import {
  type Query,
  keepPreviousData,
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { auditEventsKey } from '@/modules/activity/queries/use-audit-events-query'
import { banUser } from '@/modules/users/api/ban-user'
import { deleteUser } from '@/modules/users/api/delete-user'
import { endUserSessions } from '@/modules/users/api/end-user-sessions'
import { listUsers, type UserListQuery } from '@/modules/users/api/list-users'
import { resendVerification } from '@/modules/users/api/resend-verification'
import { resetUserMfa } from '@/modules/users/api/reset-user-mfa'
import { unbanUser } from '@/modules/users/api/unban-user'
import type { components } from '@/shared/api/api-schema'

export type UserAction =
  | 'ban'
  | 'unban'
  | 'end-sessions'
  | 'reset-mfa'
  | 'resend-verification'
  | 'delete'

const ACTIONS: Record<UserAction, (projectId: string, userId: string) => Promise<unknown>> = {
  ban: banUser,
  unban: unbanUser,
  'end-sessions': endUserSessions,
  'reset-mfa': resetUserMfa,
  'resend-verification': resendVerification,
  delete: deleteUser,
}

/** Every users query of a project, list pages and user details alike, starts with this. */
export function usersQueryKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'users']
}

export const USERS_PAGE_SIZE = 50

export function useUsersQuery(
  projectId: string,
  query: UserListQuery,
): UseQueryResult<components['schemas']['UserPage']> {
  return useQuery({
    queryKey: [
      ...usersQueryKey(projectId),
      'list',
      query.email,
      query.status,
      String(query.offset),
      String(query.limit),
    ],
    queryFn: () => listUsers(projectId, query),
    // Keeps the current rows on screen while a new search loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  })
}

/** Runs one admin action on a user, then reloads the list and the user's details. */
export function useUserActionMutation(
  projectId: string,
): UseMutationResult<unknown, Error, { action: UserAction; userId: string; email: string }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ action, userId }) => ACTIONS[action](projectId, userId),
    onSuccess: async (_result, { action, userId }) => {
      await queryClient.invalidateQueries({ queryKey: auditEventsKey(projectId) })
      await queryClient.invalidateQueries({
        queryKey: usersQueryKey(projectId),
        predicate: (query) => isStillThere(query, { action, userId }),
      })
    },
  })
}

/** A deleted user's details would only reload into a 404 while its page navigates away. */
function isStillThere(query: Query, change: { action: UserAction; userId: string }): boolean {
  if (change.action !== 'delete') {
    return true
  }

  return query.queryKey.includes(change.userId) === false
}
