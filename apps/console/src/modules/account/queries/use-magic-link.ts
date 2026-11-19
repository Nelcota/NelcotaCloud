import type { SignInResult } from '@nelcota/sdk'
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
} from '@tanstack/react-query'

import { sendMagicLink, verifyMagicLink } from '@/modules/account/api/magic-link'

export function useSendMagicLinkMutation(): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: sendMagicLink })
}

/**
 * The link's token works once, so the exchange never retries or refetches: a second try would
 * fail even after the first one signed in.
 */
export function useMagicLinkQuery(token: string): UseQueryResult<SignInResult> {
  return useQuery({
    queryKey: ['account', 'magic-link', token],
    queryFn: () => verifyMagicLink(token),
    enabled: token !== '',
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
