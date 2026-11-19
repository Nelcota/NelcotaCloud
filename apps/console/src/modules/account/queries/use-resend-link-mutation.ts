import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { sendMagicLink } from '@/modules/account/api/magic-link'
import { recoverPassword } from '@/modules/account/api/recover-password'
import { resendVerification } from '@/modules/account/api/resend-verification'

/** Which email link a notice is waiting on. */
export type SentLinkPurpose = 'verification' | 'recovery' | 'magic-link'

const SENDERS: Record<SentLinkPurpose, (email: string) => Promise<void>> = {
  verification: resendVerification,
  recovery: recoverPassword,
  'magic-link': sendMagicLink,
}

/** Sends the same kind of link again; both answers say nothing about whether the account exists. */
export function useResendLinkMutation(
  purpose: SentLinkPurpose,
): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: SENDERS[purpose] })
}
