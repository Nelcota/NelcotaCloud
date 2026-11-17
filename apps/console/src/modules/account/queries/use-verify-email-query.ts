import type { User } from '@nelcota/sdk'
import { type UseQueryResult, useQuery } from '@tanstack/react-query'

import { verifyEmail } from '@/modules/account/api/verify-email'

export function useVerifyEmailQuery(token: string): UseQueryResult<User> {
  return useQuery({
    queryKey: ['account', 'verify-email', token],
    queryFn: () => verifyEmail(token),
    retry: false,
    // A link without a token cannot be valid; no need to ask the API.
    enabled: token !== '',
  })
}
