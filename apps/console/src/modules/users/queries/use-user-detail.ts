import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { getUser } from '@/modules/users/api/get-user'
import { listUserIdentities } from '@/modules/users/api/list-user-identities'
import { listUserSessions } from '@/modules/users/api/list-user-sessions'
import { usersQueryKey } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'

type UserRef = { projectId: string; userId: string }

function userQueryKey({ projectId, userId }: UserRef): readonly string[] {
  return [...usersQueryKey(projectId), 'detail', userId]
}

export function useUserQuery(ref: UserRef): UseQueryResult<components['schemas']['User']> {
  return useQuery({
    queryKey: userQueryKey(ref),
    queryFn: () => getUser(ref.projectId, ref.userId),
  })
}

export function useUserSessionsQuery(
  ref: UserRef,
): UseQueryResult<components['schemas']['UserSessions']> {
  return useQuery({
    queryKey: [...userQueryKey(ref), 'sessions'],
    queryFn: () => listUserSessions(ref.projectId, ref.userId),
  })
}

export function useUserIdentitiesQuery(
  ref: UserRef,
): UseQueryResult<components['schemas']['UserIdentities']> {
  return useQuery({
    queryKey: [...userQueryKey(ref), 'identities'],
    queryFn: () => listUserIdentities(ref.projectId, ref.userId),
  })
}
