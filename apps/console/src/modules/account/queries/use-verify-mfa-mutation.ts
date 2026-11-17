import type { Session } from '@nelcota/sdk'
import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { type MfaChallenge, verifyMfa } from '@/modules/account/api/verify-mfa'

export function useVerifyMfaMutation(): UseMutationResult<Session, Error, MfaChallenge> {
  return useMutation({ mutationFn: verifyMfa })
}
