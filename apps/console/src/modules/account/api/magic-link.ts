import type { SignInResult } from '@nelcota/sdk'

import { nelcota } from '@/shared/auth/nelcota'

/** Emails a one-time login link; an address with no account gets one, without a password. */
export function sendMagicLink(email: string): Promise<void> {
  return nelcota.auth.sendMagicLink({ email })
}

/** Trades the emailed link's token for a session, or an MFA step. */
export function verifyMagicLink(token: string): Promise<SignInResult> {
  return nelcota.auth.verifyMagicLink({ token })
}
