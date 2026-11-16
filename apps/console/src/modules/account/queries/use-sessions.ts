import type { SessionSummary } from '@nelcota/sdk'
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { listSessions } from '@/modules/account/api/list-sessions'
import { revokeOtherSessions } from '@/modules/account/api/revoke-other-sessions'
import { revokeSession } from '@/modules/account/api/revoke-session'

const SESSIONS_QUERY_KEY = ['account', 'sessions'] as const

export function useSessionsQuery(): UseQueryResult<SessionSummary[]> {
  return useQuery({ queryKey: SESSIONS_QUERY_KEY, queryFn: listSessions })
}

export function useRevokeSessionMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }),
  })
}

export function useRevokeOtherSessionsMutation(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => revokeOtherSessions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY }),
  })
}
