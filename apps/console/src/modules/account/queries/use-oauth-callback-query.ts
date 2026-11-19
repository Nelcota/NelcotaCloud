import type { SignInResult } from '@nelcota/sdk'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { finishOAuthLogin } from '@/modules/account/api/oauth-login'

/**
 * The code and its PKCE verifier work once, so the exchange never retries or refetches: a
 * second try would fail even after the first one signed in.
 */
export function useOAuthCallbackQuery(callbackUrl: string): UseQueryResult<SignInResult> {
  return useQuery({
    queryKey: ['account', 'oauth-callback', callbackUrl],
    queryFn: () => finishOAuthLogin(callbackUrl),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
